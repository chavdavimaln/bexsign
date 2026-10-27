/**
 * The contents of a file a user added to a request, as BexSign can show and sign it.
 *
 * A document that comes from the user's computer, from cloud storage or from the API has to appear in the editor
 * as *the file they picked* - not as a stand-in. This module is the one place that reads a file and answers with
 * what belongs on the page:
 *
 *   PDF with a text layer   -> its text, paragraph by paragraph
 *   .docx / .doc            -> the text of the document
 *   .txt / .md / .rtf       -> the text itself
 *   a picture, or a scanned -> the page images, saved in the doc bucket and referenced from the HTML, so the
 *   PDF with no text layer     user sees the actual page instead of nothing
 *
 * It holds no database or network state, so a route, a script or the cloud importer can require it freely.
 * `cloudStorage.extractText` delegates here, which keeps the cloud import and the local upload reading a file
 * exactly the same way.
 */

const path = require('path');
const zlib = require('zlib');

/** Files BexSign can take apart. Anything else is stored and sent, but has no text of its own. */
const READABLE_EXTENSIONS = ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
/** A PDF this long is read for its text; pages past this are not rendered as pictures. */
const MAX_TEXT_PAGES = 150;
const MAX_IMAGE_PAGES = 30;
const MAX_TEXT_CHARS = 400000;
/** Below this, what pdf.js found is page furniture (a stamp, a page number), not a text layer. */
const MIN_TEXT_CHARS = 20;

const extensionOf = (name) => String(name || '').split('.').pop().toLowerCase();

/* ---------------------------------------------------------------------------------------- PDF */

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

function openPdf(buffer) {
  return loadPdfjs().then((pdfjs) => pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false,
    standardFontDataUrl: standardFontDataUrl(),
    verbosity: 0
  }));
}

/**
 * The text of a PDF, paragraph by paragraph. Lines that were wrapped at the right margin are joined again, so the
 * text flows in the BexSign page instead of keeping the line breaks of the original page width.
 */
async function pdfText(buffer) {
  const loadingTask = await openPdf(buffer);
  const pdf = await loadingTask.promise;
  const pages = [];
  try {
    for (let n = 1; n <= Math.min(pdf.numPages, MAX_TEXT_PAGES); n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      const lines = [];
      let line = null;
      const close = () => {
        if (line && line.text.trim()) lines.push(line);
        line = null;
      };
      for (const item of content.items) {
        if (typeof item.str !== 'string') continue;
        const x = item.transform[4];
        const y = item.transform[5];
        const height = item.height || 0;
        if (line && Math.abs(y - line.y) > Math.max(2, (line.height || height || 10) * 0.6)) close();
        if (!line) line = { text: '', y, left: x, right: x, height };
        // A visible gap between two pieces on the same line is a space the PDF did not store
        if (line.text && !/\s$/.test(line.text) && !/^\s/.test(item.str) && x - line.right > (height || 10) * 0.2) line.text += ' ';
        line.text += item.str;
        line.right = Math.max(line.right, x + (item.width || 0));
        line.height = Math.max(line.height, height);
        if (item.hasEOL) close();
      }
      close();
      if (lines.length === 0) continue;
      const left = Math.min(...lines.map((l) => l.left));
      const width = Math.max(...lines.map((l) => l.right)) - left;
      let text = '';
      lines.forEach((current, i) => {
        const value = current.text.replace(/\s+/g, ' ').trim();
        if (i === 0) {
          text = value;
          return;
        }
        const previous = lines[i - 1];
        const gap = previous.y - current.y;
        const lineHeight = Math.max(previous.height, current.height, 8);
        const wrapped = width > 0 && (previous.right - left) / width > 0.86;
        // A larger gap (or a new column) starts a paragraph; a line that reached the right margin was wrapped
        if (gap > lineHeight * 1.9 || gap < 0) text += `\n\n${value}`;
        else if (wrapped) text += ` ${value}`;
        else text += `\n${value}`;
      });
      pages.push(text);
    }
  } finally {
    await loadingTask.destroy().catch(() => {});
  }
  return pages.join('\n\n').trim();
}

/**
 * Every page of a PDF drawn into a PNG: [{ width, height, image }], sizes in PDF points. Used for a scan, which
 * has pages but no text to read. Needs @napi-rs/canvas; without it there is nothing to show and the caller says so.
 */
async function pdfPageImages(buffer, { maxPages = MAX_IMAGE_PAGES, scale = 2 } = {}) {
  const { createCanvas } = require('@napi-rs/canvas');
  const loadingTask = await openPdf(buffer);
  const pdf = await loadingTask.promise;
  try {
    const pages = [];
    for (let n = 1; n <= Math.min(pdf.numPages, maxPages); n++) {
      const page = await pdf.getPage(n);
      const size = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale });
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
    await loadingTask.destroy().catch(() => {});
  }
}

/** How many pages a PDF has, without reading any of them. */
async function pdfPageCount(buffer) {
  const loadingTask = await openPdf(buffer);
  try {
    const pdf = await loadingTask.promise;
    return pdf.numPages;
  } finally {
    await loadingTask.destroy().catch(() => {});
  }
}

/* --------------------------------------------------------------------------------------- .docx */

/** word/document.xml of a .docx (a ZIP archive) as plain text, one line per paragraph. */
function docxText(buffer) {
  // End of central directory record
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 66000); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const count = buffer.readUInt16LE(eocd + 10);
  let pointer = buffer.readUInt32LE(eocd + 16);
  for (let n = 0; n < count && pointer + 46 <= buffer.length; n++) {
    if (buffer.readUInt32LE(pointer) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(pointer + 10);
    const compressedSize = buffer.readUInt32LE(pointer + 20);
    const nameLength = buffer.readUInt16LE(pointer + 28);
    const extraLength = buffer.readUInt16LE(pointer + 30);
    const commentLength = buffer.readUInt16LE(pointer + 32);
    const localOffset = buffer.readUInt32LE(pointer + 42);
    const name = buffer.toString('utf8', pointer + 46, pointer + 46 + nameLength).replace(/\\/g, '/');
    if (name === 'word/document.xml') {
      const dataStart = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28);
      const data = buffer.subarray(dataStart, dataStart + compressedSize);
      const xml = (method === 0 ? data : zlib.inflateRawSync(data)).toString('utf8');
      const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
      const paragraphs = xml.split(/<\/w:p>/).map((p) => decode(p
        .replace(/<w:tab\b[^>]*\/>/g, '\t')
        .replace(/<w:br\b[^>]*\/>/g, '\n')
        .replace(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<[^>]+>/g, (m, t) => (t === undefined ? '' : t))));
      return paragraphs.map((p) => p.replace(/[ \t]+$/g, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }
    pointer += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

/* ---------------------------------------------------------------------------------------- .doc */

/**
 * A Word 97-2003 file is an OLE compound document: a little file system of "streams" inside one file. This reads
 * its directory and hands back the named stream, which is how the text of a .doc is reached.
 */
function oleStreams(buffer) {
  if (buffer.length < 512 || buffer.readUInt32LE(0) !== 0xe011cfd0 || buffer.readUInt32LE(4) !== 0xe11ab1a1) return null;
  const sectorSize = 1 << buffer.readUInt16LE(0x1e);
  const miniSectorSize = 1 << buffer.readUInt16LE(0x20);
  const firstDirSector = buffer.readUInt32LE(0x30);
  const miniCutoff = buffer.readUInt32LE(0x38);
  const firstMiniFat = buffer.readUInt32LE(0x3c);
  const firstDifat = buffer.readUInt32LE(0x44);
  const difatCount = buffer.readUInt32LE(0x48);
  const sectorAt = (sector) => 512 + sector * sectorSize;
  const inFile = (sector) => sector >= 0 && sectorAt(sector) + sectorSize <= buffer.length;

  // The DIFAT lists the FAT sectors: 109 entries in the header, the rest in a chain of their own
  const fatSectors = [];
  for (let i = 0; i < 109; i++) {
    const sector = buffer.readUInt32LE(0x4c + i * 4);
    if (sector === 0xffffffff) break;
    fatSectors.push(sector);
  }
  let difat = firstDifat;
  for (let n = 0; n < difatCount && inFile(difat); n++) {
    const base = sectorAt(difat);
    const perSector = sectorSize / 4 - 1;
    for (let i = 0; i < perSector; i++) {
      const sector = buffer.readUInt32LE(base + i * 4);
      if (sector === 0xffffffff) break;
      fatSectors.push(sector);
    }
    difat = buffer.readUInt32LE(base + perSector * 4);
  }

  const readChainTable = (sectors) => {
    const table = [];
    for (const sector of sectors) {
      if (!inFile(sector)) continue;
      const base = sectorAt(sector);
      for (let i = 0; i < sectorSize / 4; i++) table.push(buffer.readUInt32LE(base + i * 4));
    }
    return table;
  };
  const fat = readChainTable(fatSectors);

  const chain = (start, table) => {
    const sectors = [];
    let sector = start;
    const seen = new Set();
    while (sector !== undefined && sector < 0xfffffffa && !seen.has(sector)) {
      seen.add(sector);
      sectors.push(sector);
      sector = table[sector];
      if (sectors.length > 1_000_000) break;
    }
    return sectors;
  };

  const readSectors = (sectors) => Buffer.concat(sectors.filter(inFile).map((s) => buffer.subarray(sectorAt(s), sectorAt(s) + sectorSize)));

  // The directory: one 128-byte entry per stream
  const directory = readSectors(chain(firstDirSector, fat));
  const entries = [];
  for (let offset = 0; offset + 128 <= directory.length; offset += 128) {
    const nameLength = directory.readUInt16LE(offset + 0x40);
    if (nameLength < 2 || nameLength > 64) continue;
    const name = directory.toString('utf16le', offset, offset + nameLength - 2);
    entries.push({
      name,
      type: directory.readUInt8(offset + 0x42),
      start: directory.readUInt32LE(offset + 0x74),
      size: Number(directory.readBigUInt64LE(offset + 0x78))
    });
  }

  const root = entries.find((e) => e.type === 5);
  if (!root) return null;
  // Short streams live packed inside the root entry's own stream, addressed by the mini FAT
  let miniFat = null;
  let miniStream = null;
  const loadMini = () => {
    if (miniFat === null) {
      miniFat = readChainTable(chain(firstMiniFat, fat));
      miniStream = readSectors(chain(root.start, fat));
    }
  };

  return {
    names: entries.map((e) => e.name),
    read(name) {
      const entry = entries.find((e) => e.type === 2 && e.name === name);
      if (!entry || !entry.size) return null;
      if (entry.size >= miniCutoff) return readSectors(chain(entry.start, fat)).subarray(0, entry.size);
      loadMini();
      const parts = chain(entry.start, miniFat).map((s) => miniStream.subarray(s * miniSectorSize, (s + 1) * miniSectorSize));
      return Buffer.concat(parts).subarray(0, entry.size);
    }
  };
}

const WORD_CONTROLS = /[\x00-\x08\x0b\x0c\x0e-\x1f]/g;

/**
 * The text of a Word 97-2003 file. Word keeps the characters of a document in pieces scattered through the
 * WordDocument stream and a "piece table" that says where each piece is and whether it is 8-bit or 16-bit - so
 * the table is what has to be followed; reading the stream straight through gives fragments in the wrong order.
 */
function docText(buffer) {
  const ole = oleStreams(buffer);
  if (!ole) return null;
  const main = ole.read('WordDocument');
  if (!main || main.length < 0x200) return null;

  const clean = (value) => value
    .replace(/\r/g, '\n')
    .replace(/\x07/g, '\n')      // end of a table cell or row
    .replace(/[\x13\x14\x15]/g, '')  // field codes (a page number, a hyperlink target)
    .replace(/\x0b/g, '\n')
    .replace(WORD_CONTROLS, '')
    .replace(/\u0000/g, '');

  try {
    // Bit 9 of the FIB flags says which of the two table streams this document uses
    const tableName = (main.readUInt16LE(0x0a) & 0x0200) ? '1Table' : '0Table';
    const table = ole.read(tableName);
    if (table) {
      // fibRgFcLcb97 starts after FibBase + csw/rgW97 + cslw/rgLw97 + cbRgFcLcb; fcClx is its 34th pair
      const fcClx = table && main.readUInt32LE(0x01a2);
      const lcbClx = main.readUInt32LE(0x01a6);
      if (lcbClx > 0 && fcClx + lcbClx <= table.length) {
        const clx = table.subarray(fcClx, fcClx + lcbClx);
        // The Clx is a run of property blocks (0x01) followed by the piece table (0x02)
        let at = 0;
        while (at < clx.length && clx[at] === 0x01) at += 1 + 2 + clx.readUInt16LE(at + 1);
        if (clx[at] === 0x02) {
          const lcbPlcPcd = clx.readUInt32LE(at + 1);
          const plc = clx.subarray(at + 5, at + 5 + lcbPlcPcd);
          const pieces = Math.floor((plc.length - 4) / 12);
          const cpAt = (i) => plc.readUInt32LE(i * 4);
          let text = '';
          for (let i = 0; i < pieces; i++) {
            const pcd = (pieces + 1) * 4 + i * 8;
            const fc = plc.readUInt32LE(pcd + 2);
            const characters = cpAt(i + 1) - cpAt(i);
            // Bit 30 set means the piece is 8-bit Windows-1252 at half the stated offset
            const compressed = Boolean(fc & 0x40000000);
            const start = compressed ? (fc & 0x3fffffff) >>> 1 : fc;
            const bytes = compressed ? characters : characters * 2;
            if (start < 0 || start + bytes > main.length) continue;
            const slice = main.subarray(start, start + bytes);
            text += compressed ? slice.toString('latin1') : slice.toString('utf16le');
          }
          const result = clean(text).replace(/\n{3,}/g, '\n\n').trim();
          if (result.length >= MIN_TEXT_CHARS) return result;
        }
      }
    }
  } catch (err) {
    // A damaged or unusual .doc falls through to the plain read below
  }

  // No usable piece table: take the readable runs of the stream, which still shows the user their document
  const guessed = clean(main.toString('latin1'))
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 3 && /[a-zA-Z]{3}/.test(line) && !/^[A-Z][a-z]+\d/.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return guessed.length >= MIN_TEXT_CHARS ? guessed : null;
}

/* ---------------------------------------------------------------------------------------- .rtf */

/** The text of an RTF file: its control words dropped and its escapes resolved. */
function rtfText(buffer) {
  const rtf = buffer.toString('latin1');
  if (!rtf.startsWith('{\\rt')) return null;
  let text = rtf
    // Whole groups that hold no body text (fonts, colours, style and info tables)
    .replace(/\{\\\*?\\(fonttbl|colortbl|stylesheet|info|generator|pict|themedata|datastore)[\s\S]*?\}\s*/g, ' ')
    .replace(/\\par[d]?\b/g, '\n')
    .replace(/\\(line|page)\b/g, '\n')
    .replace(/\\tab\b/g, '\t')
    .replace(/\\'([0-9a-fA-F]{2})/g, (m, hex) => Buffer.from(hex, 'hex').toString('latin1'))
    .replace(/\\u(-?\d+)\s?\??/g, (m, code) => String.fromCharCode(Number(code) < 0 ? Number(code) + 65536 : Number(code)))
    .replace(/\\[a-zA-Z]+-?\d*\s?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\\\\/g, '\\');
  text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return text.length >= MIN_TEXT_CHARS ? text : null;
}

/* ------------------------------------------------------------------------------- what to show */

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** One page picture on a BexSign page: full width of the text column, never past the bottom of the sheet. */
const imageHtml = (src, alt) =>
  `<p style="margin:0 0 14px;"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" `
  + `style="display:block;width:100%;max-width:100%;height:auto;border:1px solid #e2e8f0;border-radius:4px;" /></p>`;

/**
 * The text of a file, or null when it has none. Kept for the cloud importer, which wants text or nothing.
 */
async function extractText(buffer, name) {
  const ext = extensionOf(name);
  let text = null;
  if (ext === 'pdf') text = await pdfText(buffer);
  else if (ext === 'docx') text = docxText(buffer);
  else if (ext === 'doc') text = docText(buffer);
  else if (ext === 'rtf') text = rtfText(buffer);
  else if (ext === 'txt' || ext === 'md') text = buffer.toString('utf8').replace(/^﻿/, '');
  text = text ? String(text).replace(/\r\n?/g, '\n').trim() : '';
  // A scanned PDF has pages but no text
  return text.length >= MIN_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : null;
}

/**
 * What BexSign should put on the page for this file.
 *
 *   { kind: 'text',  text }   the words of the document
 *   { kind: 'image', html }   a picture, or the pages of a scan, as <img> tags pointing at the doc bucket
 *   { kind: 'none' }          nothing could be read (an unsupported file, or a scan on a server that
 *                             cannot draw PDF pages)
 *
 * `storePage(buffer, suffix, contentType)` saves one picture and answers with its address. It is passed in rather
 * than required here so this module stays free of storage and so a caller that only wants text can leave it out.
 */
async function readDocumentContent(buffer, name, { storePage = null } = {}) {
  const ext = extensionOf(name);
  const label = String(name || 'document');

  if (IMAGE_EXTENSIONS.includes(ext)) {
    if (!storePage) return { kind: 'none', pages: 1, reason: 'no-storage' };
    const src = await storePage(buffer, ext, `image/${ext === 'jpg' ? 'jpeg' : ext}`);
    return { kind: 'image', html: imageHtml(src, label), pages: 1 };
  }

  const text = await extractText(buffer, name).catch(() => null);
  if (text) {
    const pages = ext === 'pdf' ? await pdfPageCount(buffer).catch(() => 1) : 1;
    return { kind: 'text', text, pages };
  }

  // A PDF with no text layer is a scan: show its pages as they look
  if (ext === 'pdf') {
    if (!storePage) return { kind: 'none', pages: 1, reason: 'no-storage' };
    try {
      const images = await pdfPageImages(buffer);
      if (images.length === 0) return { kind: 'none', pages: 1, reason: 'empty' };
      const parts = [];
      for (let i = 0; i < images.length; i++) {
        const src = await storePage(images[i].image, 'png', 'image/png');
        parts.push(imageHtml(src, `${label} - page ${i + 1}`));
      }
      return { kind: 'image', html: parts.join('\n'), pages: images.length };
    } catch (err) {
      // @napi-rs/canvas missing or unusable on this server: the file is still stored and sent
      return { kind: 'none', pages: 1, reason: 'render-unavailable', error: err.message };
    }
  }

  return { kind: 'none', pages: 1, reason: 'unreadable' };
}

module.exports = {
  READABLE_EXTENSIONS,
  IMAGE_EXTENSIONS,
  MAX_TEXT_CHARS,
  extensionOf,
  pdfText,
  pdfPageCount,
  pdfPageImages,
  docxText,
  docText,
  rtfText,
  extractText,
  readDocumentContent
};
