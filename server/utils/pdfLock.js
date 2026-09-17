/**
 * Locked PDFs (server/utils/pdfLock.js)
 * Every PDF BexSign issues for a sent request (signed documents, in-progress copies, certificates) goes through
 * lockPdf():
 *  1. Flatten: each page is rendered into a high-resolution image, so the file has no text, form fields or vector
 *     content left for a PDF editor or website to change, like a scanned page.
 *  2. Encrypt: AES-256 with a random owner password that is never stored; printing is the only permission.
 *  3. Certify: an invisible DocMDP certification signature ("no changes allowed", see pdfCertification.js).
 * The SHA-256 fingerprint of the result is recorded by the caller, so "Verify document" detects any other copy.
 */
const crypto = require('crypto');
const path = require('path');
const PDFDocument = require('pdfkit');
const { addCertificationPlaceholder, signPdfBuffer } = require('./pdfCertification');

// Bump when the look of issued PDFs changes: stored files issued with an older layout are rebuilt on download
const PDF_LAYOUT_VERSION = 2;
// Page images at 2.5x of 72 dpi (180 dpi): sharp on screen and in print
const RASTER_SCALE = 2.5;

/** pdfkit options for an issued PDF; a userPassword is then needed to open the file. */
function lockedPdfOptions({ userPassword = '' } = {}) {
  return {
    pdfVersion: '1.7ext3',
    ...(userPassword ? { userPassword } : {}),
    ownerPassword: crypto.randomBytes(32).toString('hex'),
    permissions: {
      printing: 'highResolution',
      modifying: false,
      copying: false,
      annotating: false,
      fillingForms: false,
      contentAccessibility: false,
      documentAssembly: false
    }
  };
}

let pdfjsPromise = null;
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs').catch((err) => {
      pdfjsPromise = null;
      throw err;
    });
  }
  return pdfjsPromise;
}

function standardFontDataUrl() {
  // pdf.js expects a URL-style folder path ending with a forward slash
  return `${path.join(path.dirname(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')), '..', '..', 'standard_fonts').replace(/\\/g, '/')}/`;
}

/** Renders every page of a PDF into a PNG image: [{ width, height, image }] with sizes in PDF points. */
async function rasterizePdf(buffer) {
  const pdfjs = await loadPdfjs();
  const { createCanvas } = require('@napi-rs/canvas');
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    standardFontDataUrl: standardFontDataUrl(),
    isEvalSupported: false,
    disableFontFace: true,
    verbosity: 0
  });
  const pdf = await loadingTask.promise;
  try {
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const size = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: RASTER_SCALE });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      pages.push({ width: size.width, height: size.height, image: canvas.toBuffer('image/png') });
      page.cleanup();
    }
    return pages;
  } finally {
    await loadingTask.destroy();
  }
}

function collect(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

/** Encrypted, certified PDF whose pages are the given images. */
async function buildImagePdf(pages, info, { userPassword = '' } = {}) {
  const doc = new PDFDocument({ ...lockedPdfOptions({ userPassword }), autoFirstPage: false, info });
  const done = collect(doc);
  pages.forEach(({ width, height, image }, index) => {
    doc.addPage({ size: [width, height], margin: 0 });
    doc.image(image, 0, 0, { width, height });
    if (index === 0) certify(doc);
  });
  doc.end();
  return signPdfBuffer(await done);
}

/** Certification signature on the current page (the signature field lives on the first page). */
function certify(doc) {
  try {
    addCertificationPlaceholder(doc);
  } catch (err) {
    console.warn('[PDF lock] certification skipped:', err.message);
  }
}

/**
 * Turns a PDF built by pdfkit (unencrypted) into the locked copy BexSign issues. When page flattening is not
 * available on this server (pdfjs-dist/@napi-rs/canvas missing or unsupported Node version), `renderVector` is
 * called to build the same document as an encrypted, certified vector PDF instead.
 */
async function lockPdf(plainBuffer, { info = {}, renderVector } = {}) {
  let pages = null;
  try {
    pages = await rasterizePdf(plainBuffer);
  } catch (err) {
    console.warn('[PDF lock] page flattening unavailable, issuing an encrypted vector PDF:', err.message);
  }
  if (pages && pages.length > 0) {
    return buildImagePdf(pages, { ...info, Producer: 'BexSign', Keywords: 'BexSign locked certified' });
  }
  if (typeof renderVector !== 'function') throw new Error('The PDF could not be locked.');
  return signPdfBuffer(await renderVector({ locked: true }));
}

/** Copy of an issued (locked) PDF that also needs `password` to open ("Download with password"). */
async function protectWithPassword(lockedBuffer, password, info = {}) {
  const pages = await rasterizePdf(lockedBuffer);
  return buildImagePdf(pages, { ...info, Producer: 'BexSign', Keywords: 'BexSign locked certified' }, { userPassword: password });
}

module.exports = { lockPdf, lockedPdfOptions, certify, rasterizePdf, protectWithPassword, PDF_LAYOUT_VERSION };
