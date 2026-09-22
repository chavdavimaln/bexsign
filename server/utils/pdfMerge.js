/**
 * Merging documents into one PDF (server/utils/pdfMerge.js)
 *
 * BexSign has no PDF-assembly library. Merging therefore reuses what the signed-PDF pipeline already does
 * (see pdfLock.js): every page of every source is rendered into an image with pdfjs-dist + @napi-rs/canvas,
 * and pdfkit writes those images into one new PDF, one page each, at the original page size.
 *
 * Trade-off: the merged file is a picture of each page. Page count, page size and the look are preserved, but
 * the text inside it is no longer selectable or searchable, exactly like a scanned document. The source files
 * are never touched, so the originals keep their text and can still be used on their own.
 *
 * A document that has no uploaded file (a document written in BexSign or added from a template) is first
 * rendered into a PDF from its text, then merged the same way.
 */
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { rasterizePdf } = require('./pdfLock');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const COLORS = { text: '#1e293b', muted: '#64748b', border: '#cbd5e1' };

function toPlainText(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Absolute path of a stored file ("/uploads/x.pdf"), or null when it is not on this server. */
function resolveStoredFile(filePath) {
  const value = String(filePath || '').trim();
  if (!value) return null;
  const abs = path.isAbsolute(value) && fs.existsSync(value)
    ? value
    : path.join(__dirname, '..', value.replace(/^\/+/, ''));
  try {
    return fs.existsSync(abs) && fs.statSync(abs).isFile() ? abs : null;
  } catch (err) {
    return null;
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

/** A plain A4 PDF of a document that exists only as text in BexSign (written here or added from a template). */
function renderTextPdf({ name = 'Document', text = '' } = {}) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 56, bottom: 64, left: 56, right: 56 },
    info: { Title: String(name).replace(/\.pdf$/i, ''), Author: 'BexSign', Creator: 'BexSign' }
  });
  const done = collect(doc);
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.font('Helvetica-Bold').fontSize(18).fillColor(COLORS.text).text(String(name).replace(/\.pdf$/i, ''), left, doc.y, { width });
  doc.moveDown(0.4);
  doc.moveTo(left, doc.y).lineTo(left + width, doc.y).strokeColor(COLORS.border).lineWidth(0.75).stroke();
  doc.moveDown(0.8);

  const body = toPlainText(text);
  if (!body) {
    doc.font('Helvetica-Oblique').fontSize(10).fillColor(COLORS.muted).text('This document has no text yet.', left, doc.y, { width });
  } else {
    body.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        doc.moveDown(0.45);
        return;
      }
      const isHeading = /^[0-9]+\.\s+[A-Z]/.test(trimmed) || (/^[A-Z0-9\s&,.'()-]{5,}$/.test(trimmed) && trimmed.length < 70);
      doc
        .font(isHeading ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(isHeading ? 10.5 : 10)
        .fillColor(COLORS.text)
        .text(trimmed, left, doc.y, { width, lineGap: 2 });
    });
  }
  doc.end();
  return done;
}

/** Every page of one source document, as images at their original page size. */
async function pagesOf(source) {
  // A PDF already in memory (a signed copy or a certificate read from disk by the caller)
  if (Buffer.isBuffer(source)) return rasterizePdf(source);
  if (Buffer.isBuffer(source.buffer)) return rasterizePdf(source.buffer);

  const stored = resolveStoredFile(source.filePath || source.file_path);
  if (stored) {
    try {
      return await rasterizePdf(fs.readFileSync(stored));
    } catch (err) {
      // Not a readable PDF (e.g. a Word file): fall back to the text BexSign holds for this document
      if (!toPlainText(source.documentText || source.document_text)) {
        throw new Error(`"${source.name || path.basename(stored)}" could not be merged: it is not a readable PDF.`);
      }
    }
  }
  const text = toPlainText(source.documentText || source.document_text);
  if (!stored && !text) {
    throw new Error(`"${source.name || 'Document'}" has no file and no text, so there is nothing to merge.`);
  }
  return rasterizePdf(await renderTextPdf({ name: source.name, text }));
}

/**
 * Merges `sources` ([{ name, filePath, documentText }]) into one PDF.
 * Returns { buffer, pageCount, pagesPerSource }.
 */
async function mergeToBuffer(sources = []) {
  const list = Array.isArray(sources) ? sources.filter(Boolean) : [];
  if (list.length < 2) throw new Error('Choose at least two documents to merge.');

  const pagesPerSource = [];
  const allPages = [];
  for (const source of list) {
    const pages = await pagesOf(source);
    if (!pages || pages.length === 0) {
      throw new Error(`"${source.name || 'Document'}" has no pages to merge.`);
    }
    pagesPerSource.push({ name: source.name || 'Document', pages: pages.length });
    allPages.push(...pages);
  }

  const doc = new PDFDocument({
    autoFirstPage: false,
    info: { Title: 'Merged document', Author: 'BexSign', Creator: 'BexSign', Producer: 'BexSign' }
  });
  const done = collect(doc);
  allPages.forEach(({ width, height, image }) => {
    doc.addPage({ size: [width, height], margin: 0 });
    doc.image(image, 0, 0, { width, height });
  });
  doc.end();

  return { buffer: await done, pageCount: allPages.length, pagesPerSource };
}

/** Merges `sources` and stores the result in server/uploads. Returns { filePath, fileName, ... }. */
async function mergeToUploads(sources, { fileName = 'Merged document' } = {}) {
  const { buffer, pageCount, pagesPerSource } = await mergeToBuffer(sources);
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const base = String(fileName || 'Merged document')
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9._-]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'merged';
  const diskName = `${Date.now()}-merged-${base}.pdf`;
  fs.writeFileSync(path.join(UPLOADS_DIR, diskName), buffer);
  return {
    filePath: `/uploads/${diskName}`,
    diskName,
    fileSizeKb: Math.round(buffer.length / 1024),
    pageCount,
    pagesPerSource
  };
}

module.exports = { mergeToBuffer, mergeToUploads, renderTextPdf, resolveStoredFile, toPlainText };
