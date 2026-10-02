/**
 * Completed Request PDF Generator (server/utils/completedPdfGenerator.js)
 * Builds, with pdfkit, the signed copy of every document in a request (each recipient's own
 * field values and signature image) and the Certificate of Completion with the audit trail.
 */
const PDFDocument = require('pdfkit');
// Issued PDFs are flattened to page images, encrypted (printing only) and certified: see pdfLock.js
const { lockPdf, lockedPdfOptions, certify } = require('./pdfLock');

const COLORS = {
  brand: '#007355',
  text: '#1e293b',
  muted: '#64748b',
  border: '#cbd5e1',
  soft: '#f1f5f9'
};

function toPlainText(value) {
  if (!value) return '';
  return String(value)
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

const ENTITIES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'" };
const decodeEntities = (text) => String(text).replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, code) => {
  if (ENTITIES[code.toLowerCase()] !== undefined) return ENTITIES[code.toLowerCase()];
  if (code[0] === '#') return String.fromCharCode(code[1] === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10));
  return match;
});

const BLOCK_TAGS = { p: 'p', div: 'p', h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h3', h5: 'h3', h6: 'h3', li: 'li', blockquote: 'quote' };

/**
 * The document body written in BexSign's editor, as blocks of styled runs:
 * { type, align, runs: [{ text, bold, italic, underline, color }] }.
 * Only the formatting the editor can produce is understood; anything else keeps its text.
 */
function htmlToBlocks(html) {
  const blocks = [];
  let current = null;
  const styleStack = [];
  const openBlocks = [];

  const style = () => styleStack.reduce((acc, s) => ({ ...acc, ...s }), {});
  const startBlock = (type, attrs = '') => {
    const alignMatch = /text-align\s*:\s*(center|right|justify)/i.exec(attrs);
    current = { type, align: alignMatch ? alignMatch[1].toLowerCase() : 'left', runs: [] };
    blocks.push(current);
  };
  const addText = (raw) => {
    const text = decodeEntities(raw).replace(/\s+/g, ' ');
    if (!text.trim() && !current) return;
    if (!current) startBlock('p');
    current.runs.push({ text, ...style() });
  };

  for (const token of String(html).match(/<[^>]+>|[^<]+/g) || []) {
    if (token[0] !== '<') {
      addText(token);
      continue;
    }
    const closing = token[1] === '/';
    const name = (/^<\/?\s*([a-z0-9]+)/i.exec(token) || [])[1]?.toLowerCase();
    if (!name) continue;
    const attrs = token.slice(name.length + (closing ? 2 : 1), -1);

    if (name === 'br') {
      if (!current) startBlock('p');
      current.runs.push({ text: '\n', ...style() });
      continue;
    }
    if (BLOCK_TAGS[name]) {
      if (closing) {
        openBlocks.pop();
        current = null;
      } else {
        openBlocks.push(name);
        startBlock(BLOCK_TAGS[name], attrs);
      }
      continue;
    }
    if (['b', 'strong', 'i', 'em', 'u', 'span', 'font', 'a', 'mark'].includes(name)) {
      if (closing) {
        styleStack.pop();
        continue;
      }
      const next = {};
      if (name === 'b' || name === 'strong') next.bold = true;
      if (name === 'i' || name === 'em') next.italic = true;
      if (name === 'u') next.underline = true;
      if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(attrs)) next.bold = true;
      if (/font-style\s*:\s*italic/i.test(attrs)) next.italic = true;
      if (/text-decoration[^;"]*underline/i.test(attrs)) next.underline = true;
      const color = /(?:^|[;\s"])color\s*:\s*([^;"']+)/i.exec(attrs);
      if (color) next.color = color[1].trim();
      styleStack.push(next);
      continue;
    }
    // ul/ol/table and anything else: the text inside still comes through
    if (closing && (name === 'ul' || name === 'ol')) current = null;
  }

  return blocks.filter((block) => block.runs.some((run) => run.text.trim()) || block.type === 'p');
}

/** Draws the document body with its formatting (headings, bold, italic, underline, colour, alignment, lists). */
function drawDocumentBody(doc, documentText, { left, width }) {
  const isHtml = /<[a-z][\s\S]*>/i.test(documentText || '');

  if (!isHtml) {
    // Plain text: headings are recognised from how the line is written
    toPlainText(documentText).split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        doc.moveDown(0.45);
        return;
      }
      const isHeading = /^[0-9]+\.\s+[A-Z]/.test(trimmed) || (/^[A-Z0-9\s&,.'()-]{5,}$/.test(trimmed) && trimmed.length < 70);
      doc.font(isHeading ? 'Helvetica-Bold' : 'Helvetica').fontSize(isHeading ? 10.5 : 10).fillColor(COLORS.text)
        .text(trimmed, left, doc.y, { width, lineGap: 2 });
    });
    return;
  }

  const SIZES = { h1: 15, h2: 12.5, h3: 11, p: 10, li: 10, quote: 10 };
  const fontFor = (run, blockType) => {
    const bold = run.bold || blockType === 'h1' || blockType === 'h2' || blockType === 'h3';
    const italic = run.italic || blockType === 'quote';
    if (bold && italic) return 'Helvetica-BoldOblique';
    if (bold) return 'Helvetica-Bold';
    if (italic) return 'Helvetica-Oblique';
    return 'Helvetica';
  };

  htmlToBlocks(documentText).forEach((block) => {
    const runs = block.runs.filter((run) => run.text !== '');
    if (runs.length === 0 || !runs.some((run) => run.text.trim())) {
      doc.moveDown(0.4);
      return;
    }
    const size = SIZES[block.type] || 10;
    const indent = block.type === 'li' || block.type === 'quote' ? 16 : 0;
    const blockWidth = width - indent;
    if (block.type === 'h1' || block.type === 'h2' || block.type === 'h3') doc.moveDown(0.35);

    if (block.type === 'li') {
      doc.font('Helvetica').fontSize(size).fillColor(COLORS.text).text('•', left + 4, doc.y, { width: 10, continued: false });
      doc.moveUp(1);
    }

    runs.forEach((run, index) => {
      const options = {
        width: blockWidth,
        align: block.align === 'left' ? 'left' : block.align,
        lineGap: 2,
        underline: Boolean(run.underline),
        continued: index < runs.length - 1
      };
      doc.font(fontFor(run, block.type)).fontSize(size).fillColor(run.color || COLORS.text);
      if (index === 0) doc.text(run.text, left + indent, doc.y, options);
      else doc.text(run.text, options);
    });
    doc.fillColor(COLORS.text);
  });
}

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function imageBufferFromDataUrl(value) {
  const match = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(String(value || ''));
  if (!match) return null;
  try {
    return Buffer.from(match[2], 'base64');
  } catch (e) {
    return null;
  }
}

const fs = require('fs');
const path = require('path');

// Handwriting font for typed signatures: a bundled server/assets/fonts/signature.ttf, else a script font installed on
// the machine; PDF standard fonts are the last resort
const SIGNATURE_FONT_CANDIDATES = [
  path.join(__dirname, '..', 'assets', 'fonts', 'signature.ttf'),
  'C:/Windows/Fonts/segoesc.ttf',
  '/usr/share/fonts/truetype/dancing-script/DancingScript-Regular.ttf',
  '/Library/Fonts/SnellRoundhand.ttc'
];
const SIGNATURE_FONT_FILE = SIGNATURE_FONT_CANDIDATES.find((file) => {
  try {
    return fs.existsSync(file) && !file.endsWith('.ttc');
  } catch (e) {
    return false;
  }
}) || null;

function useSignatureFont(doc) {
  if (SIGNATURE_FONT_FILE) {
    try {
      doc.font(SIGNATURE_FONT_FILE);
      return;
    } catch (e) {}
  }
  doc.font('Times-BoldItalic');
}

const STAMP_BLUE = '#1c4b82';

/**
 * Sign ID shown under a signature: "BEX-SIGN-<initials>-EMP001-<year>-<seq>" on the first line and the document's
 * unique hash on the second, built from the BexSign Document ID (same format as the on-screen stamp).
 */
function signatureIdLines(bexsignDocId, signerName) {
  const initials = signIdInitials(signerName);
  // Documents of a multi-document request add "-<n>" to the request ID; the sign ID uses the request ID itself
  const requestId = String(bexsignDocId || '').replace(/^(BEX-DOC-\d{4}-\d{4}-[A-Z0-9]+-[A-Z0-9]+)-\d+$/i, '$1');
  const match = /^BEX-DOC-(\d{4})-(\d{4})-(.+)$/.exec(requestId);
  if (match) return [`BEX-SIGN-${initials}-EMP001-${match[1]}-${match[2]}`, match[3]];
  return [`BEX-SIGN-${initials}-EMP001`, requestId];
}

/** Two-letter signer initials for the sign ID: first and last name ("Vimal Chavda" -> "VC"). */
function signIdInitials(name) {
  const words = String(name || '').split(/[\s@._-]+/).filter((word) => /[a-z0-9]/i.test(word));
  if (words.length === 0) return 'BS';
  if (words.length === 1) return words[0].replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

/**
 * Draws the BexSign signature stamp: blue bracket, "Signed by: <name>", the signature (image or typed text in a
 * handwriting font), a baseline, the two-line sign ID and "Digitally Certified & Verified". Returns its height.
 */
const SIGNATURE_STAMP_HEIGHT = 104;
function drawSignatureStamp(doc, x, y, { signerName, image, typedText, bexsignDocId, isInitial = false }) {
  const areaTop = y + 12;
  const areaHeight = 50;
  const baseY = areaTop + areaHeight;
  const [idLine1, idLine2] = signatureIdLines(bexsignDocId, signerName);

  doc.save();
  doc.lineWidth(2).strokeColor(STAMP_BLUE).lineCap('round').lineJoin('round');
  // Top bracket corner, left bar and bottom bracket corner
  doc.moveTo(x + 13, y + 5).lineTo(x + 5, y + 5).quadraticCurveTo(x, y + 5, x, y + 10).lineTo(x, baseY + 6)
    .quadraticCurveTo(x, baseY + 11, x + 5, baseY + 11).lineTo(x + 13, baseY + 11).stroke();
  doc.restore();

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(STAMP_BLUE).text('Signed by:', x + 17, y + 1, { lineBreak: false, continued: true })
    .fillColor('#1e293b').text(` ${signerName || ''}`, { lineBreak: false });

  let drawn = false;
  if (image) {
    try {
      doc.image(image, x + 12, areaTop + 3, { fit: [isInitial ? 90 : 190, areaHeight - 6], valign: 'center' });
      drawn = true;
    } catch (e) {
      drawn = false;
    }
  }
  if (!drawn) {
    const text = String(typedText || (isInitial ? initialsOf(signerName) : signerName) || '').slice(0, 60);
    useSignatureFont(doc);
    doc.fontSize(22).fillColor('#0f172a').text(text, x + 12, areaTop + 11, { width: 200, lineBreak: false, ellipsis: true });
  }

  // Baseline under the signature
  doc.save();
  doc.moveTo(x - 8, baseY).lineTo(x + 218, baseY).lineWidth(0.6).strokeColor('#475569').stroke();
  doc.restore();

  doc.font('Courier-Bold').fontSize(7.5).fillColor('#0f172a')
    .text(idLine1, x + 17, baseY + 3, { width: 260, lineBreak: false })
    .text(idLine2, x + 17, baseY + 11.5, { width: 260, lineBreak: false });

  // "Digitally Certified & Verified" with a check-circle mark
  const checkY = baseY + 28;
  doc.save();
  doc.circle(x + 4, checkY, 4).lineWidth(0.9).strokeColor('#047857').stroke();
  doc.moveTo(x + 2.2, checkY + 0.1).lineTo(x + 3.6, checkY + 1.5).lineTo(x + 6, checkY - 1.4).lineWidth(0.9).strokeColor('#047857').stroke();
  doc.restore();
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#047857').text('Digitally Certified & Verified', x + 12, checkY - 3.5, { lineBreak: false });

  return SIGNATURE_STAMP_HEIGHT;
}

function initialsOf(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 3)
    .join('');
}

function describeDevice(userAgent) {
  const ua = String(userAgent || '');
  if (!ua) return '-';
  const device = /Mobile|Android|iPhone|iPad/i.test(ua) ? 'Mobile' : 'Web';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  return `${device} (${browser})`;
}

function contentWidth(doc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function ensureSpace(doc, height) {
  if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

/**
 * Builds a PDF with pdfkit and issues it locked. `locked` renders the encrypted, certified vector version, used only
 * when this server cannot flatten pages into images.
 */
function renderPdf(meta, draw) {
  return renderPdfBuffer(meta, draw).then((plain) => lockPdf(plain, {
    info: meta.info,
    renderVector: ({ locked }) => renderPdfBuffer(meta, draw, { locked })
  }));
}

function renderPdfBuffer({ info, footer, footerNote = '' }, draw, { locked = false } = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      ...(locked ? lockedPdfOptions() : {}),
      size: 'A4',
      margins: { top: 56, bottom: 64, left: 56, right: 56 },
      bufferPages: true,
      info
    });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      draw(doc);
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        const bottomMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(COLORS.muted)
          .text(`${footer}   |   Page ${i + 1} of ${range.count}`, doc.page.margins.left, doc.page.height - 40, {
            width: contentWidth(doc),
            align: 'center',
            lineBreak: false
          });
        if (footerNote) {
          doc.text(footerNote, doc.page.margins.left, doc.page.height - 30, { width: contentWidth(doc), align: 'center', lineBreak: false });
        }
        doc.page.margins.bottom = bottomMargin;
      }
      if (locked) {
        doc.switchToPage(range.start);
        certify(doc);
      }
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function sectionTitle(doc, title) {
  ensureSpace(doc, 40);
  const left = doc.page.margins.left;
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.brand).text(title, left, doc.y);
  doc.moveDown(0.25);
  doc.moveTo(left, doc.y).lineTo(left + contentWidth(doc), doc.y).strokeColor(COLORS.border).lineWidth(0.75).stroke();
  doc.moveDown(0.5);
}

function keyValueRow(doc, label, value, labelWidth = 150) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  ensureSpace(doc, 18);
  const rowY = doc.y;
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.muted).text(label, left, rowY, { width: labelWidth });
  const labelBottom = doc.y;
  doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.text).text(String(value ?? '-'), left + labelWidth + 10, rowY, {
    width: width - labelWidth - 10
  });
  doc.x = left;
  doc.y = Math.max(doc.y, labelBottom) + 4;
}

/** A checkbox is ticked when its value says so; a box nobody touched keeps the state the sender gave it. */
function isChecked(field) {
  const raw = field.value;
  if (raw === true || raw === 'true') return true;
  if (raw === false || raw === 'false') return false;
  return field.checked === true;
}

/** The values of a radio group or dropdown: [{ id, value }], without empty ones. */
function fieldOptions(field) {
  return (Array.isArray(field.options) ? field.options : [])
    .map((option, index) => (typeof option === 'string' ? { id: String(index), value: option } : { id: option?.id ?? String(index), value: String(option?.value ?? '') }))
    .filter((option) => option.value.trim());
}

function fieldDisplayValue(field, recipient) {
  const raw = field.value;
  const isEmpty = raw === undefined || raw === null || String(raw).trim() === '' || raw === field.type;
  switch (field.type) {
    case 'Checkbox': {
      const meaning = String(field.optionValue || '').trim();
      return isChecked(field) ? `[X] ${meaning || 'Checked'}` : `[ ] ${meaning || 'Not checked'}`;
    }
    case 'Split text':
      return Array.isArray(field.gridValue) && field.gridValue.some(Boolean) ? field.gridValue.join('') : (isEmpty ? '-' : String(raw));
    case 'Email':
      return isEmpty ? recipient.email : String(raw);
    case 'Full name':
    case 'Name':
      return isEmpty ? recipient.name : String(raw);
    case 'Sign date':
    case 'Date':
      return isEmpty ? formatDate(recipient.signed_at) : String(raw);
    default:
      return isEmpty ? '-' : String(raw);
  }
}

/**
 * Field block without any label (Zoho Sign style): only the signature, stamp, checkbox or value itself.
 * Returns { full, height, draw(x, y, width) } or null when the field has nothing to render
 * (e.g. a stamp field without an uploaded stamp image).
 */
// A typed signature is stored as its text (older signings); anything else that is not an image is not a signature
const typedSignatureText = (value, field) => (
  typeof value === 'string' && value.trim() && !value.startsWith('data:') && value !== field.type && value !== field.label
    ? value.trim()
    : ''
);

function buildFieldBlock(doc, field, recipient, columnWidth, context = {}) {
  const signerName = field.signerName || recipient.name || recipient.email;

  if (field.type === 'Signature' || field.type === 'Initial') {
    const isInitial = field.type === 'Initial';
    const image = imageBufferFromDataUrl(field.signatureImage) || imageBufferFromDataUrl(field.value) || imageBufferFromDataUrl(recipient.signature_image);
    const typedText = typedSignatureText(field.signatureImage, field) || typedSignatureText(recipient.signature_image, field);
    return {
      full: true,
      height: SIGNATURE_STAMP_HEIGHT,
      draw: (x, y) => {
        drawSignatureStamp(doc, x + 4, y, { signerName, image, typedText, bexsignDocId: context.bexsignDocId, isInitial });
      }
    };
  }

  if (field.type === 'Stamp') {
    // A stamp is rendered only when one was actually placed with an image; there is no default stamp
    const stampImage = imageBufferFromDataUrl(field.stampImage) || imageBufferFromDataUrl(field.value);
    if (!stampImage) return null;
    return {
      full: false,
      height: 80,
      draw: (x, y) => {
        try {
          doc.image(stampImage, x, y, { fit: [130, 80], valign: 'center' });
        } catch (e) {}
      }
    };
  }

  if (field.type === 'Checkbox') {
    const checked = isChecked(field);
    return {
      full: false,
      height: 12,
      draw: (x, y) => {
        doc.rect(x, y, 11, 11).strokeColor(COLORS.muted).lineWidth(0.9).stroke();
        if (checked) {
          doc.moveTo(x + 2.5, y + 5.8).lineTo(x + 4.8, y + 8.4).lineTo(x + 9, y + 2.6).strokeColor(COLORS.brand).lineWidth(1.4).stroke();
        }
      }
    };
  }

  // Text values are printed as they are, without a box around them
  const value = fieldDisplayValue(field, recipient);
  const textWidth = columnWidth - 8;
  doc.font('Helvetica').fontSize(10);
  const textHeight = doc.heightOfString(value, { width: textWidth });
  const boxHeight = Math.max(24, textHeight + 12);
  return {
    full: false,
    height: boxHeight,
    draw: (x, y, width) => {
      doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text(value, x + 4, y + (boxHeight - textHeight) / 2, { width: width - 8 });
    }
  };
}

/** Lays out field blocks: signatures take a full row, other fields flow in two columns. */
function drawFieldsGrid(doc, entries, context = {}) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const gap = 18;
  const columnWidth = (width - gap) / 2;
  const pageBottom = () => doc.page.height - doc.page.margins.bottom;
  let column = 0;
  let rowTop = doc.y;
  let rowHeight = 0;

  const closeRow = () => {
    if (column === 0) return;
    doc.y = rowTop + rowHeight + 12;
    column = 0;
    rowHeight = 0;
  };

  entries.forEach(({ field, recipient }) => {
    const block = buildFieldBlock(doc, field, recipient, columnWidth, context);
    if (!block) return;
    if (block.full) {
      closeRow();
      if (doc.y + block.height > pageBottom()) doc.addPage();
      const top = doc.y;
      block.draw(left, top, width);
      doc.y = top + block.height + 14;
      return;
    }
    if (column === 0) {
      if (doc.y + block.height > pageBottom()) doc.addPage();
      rowTop = doc.y;
    }
    block.draw(left + column * (columnWidth + gap), rowTop, columnWidth);
    rowHeight = Math.max(rowHeight, block.height);
    column += 1;
    if (column === 2) closeRow();
  });
  closeRow();
  doc.x = left;
}

// ---------------------------------------------------------------------------------------------------------------
// Positioned layout: the document as the sender saw it in the editor
//
// The editor stores, with each document, a layout snapshot: where every line of text, border and image sits on the
// page (client/src/utils/layoutSnapshot.js). With it the PDF is drawn piece by piece at those positions and every
// field at the position and size the sender gave it, so a field stays beside the words it was put next to.
// A document without a snapshot (or whose text changed after the snapshot was taken) is drawn the older way:
// the text, then the fields listed under it.
// ---------------------------------------------------------------------------------------------------------------

// Page pixels (96 per inch) to PDF points (72 per inch): the editor's 794 x 1123 px page is exactly A4
const PX = 0.75;
const PAGE_HEIGHT_PX = 1123;
const SLICE_TOP_PX = 56; // top margin of the 2nd, 3rd... PDF page of a page that is longer than A4
const SLICE_BOTTOM_PX = 70; // kept free at the bottom of every PDF page (footer line)
const MIN_STAMP_SCALE = 0.45;

/** Key of a text's letters and digits. Must match textKey() in client/src/utils/layoutSnapshot.js. */
function textKey(text) {
  const plain = String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  let hash = 0x811c9dc5;
  for (let i = 0; i < plain.length; i += 1) {
    hash ^= plain.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${plain.length}:${hash.toString(16)}`;
}

/** The words of a document text without its markup (rich text keeps only what is written between the tags). */
function documentWords(documentText) {
  const text = String(documentText || '');
  if (!/<[a-z][\s\S]*>/i.test(text)) return text;
  return text.replace(/<[^>]+>/g, ' ').replace(/&(#\d+|#x[0-9a-f]+|[a-z0-9]+);/gi, ' ');
}

const documentTextKey = (documentText) => textKey(documentWords(documentText));
const lettersAndDigits = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

/** The stored layout snapshot when it can be used for this document text, else null. */
function usableLayout(layout, documentText) {
  let parsed = layout;
  if (typeof layout === 'string') {
    try {
      parsed = JSON.parse(layout);
    } catch (e) {
      return null;
    }
  }
  if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.pages) || parsed.pages.length === 0) return null;
  if (!parsed.pages.every((page) => page && Array.isArray(page.texts) && Number(page.height) > 0)) return null;
  // The snapshot belongs to the text it was taken from: a later change of the text makes it unusable
  if (parsed.bodyKey !== documentTextKey(documentText)) return null;
  // What the snapshot would write must be the document's own text, word for word and in the same order
  const written = lettersAndDigits(parsed.pages[0].texts.map((piece) => String(piece?.t ?? '')).join(' '));
  if (!written.includes(lettersAndDigits(documentWords(documentText)))) return null;
  return parsed;
}

/** The box of a placed field in page pixels. Same rules as getFieldBox() in client/src/utils/fieldSizing.js. */
function fieldBox(field) {
  const type = field.type;
  const width = Number(field.width);
  const height = Number(field.height);
  if (type === 'Split text') {
    const count = Math.max(1, Number(field.charCount) || 10);
    const cellWidth = width > 0 ? width : 16;
    const cellHeight = height > 0 ? height : 20;
    const gap = Math.max(0, Number(field.charSpace) || 0);
    return { width: count * cellWidth + (count - 1) * gap + 2, height: cellHeight + 2, cellWidth, gap, count };
  }
  let fallback = { width: 160, height: 30 };
  if (type === 'Signature') fallback = { width: 200, height: 70 };
  else if (type === 'Initial') fallback = { width: 110, height: 60 };
  else if (type === 'Stamp') fallback = field.stampShape === 'oval' ? { width: 80, height: 80 } : { width: 112, height: 80 };
  else if (type === 'Checkbox') fallback = { width: 22, height: 22 };
  else if (type === 'Radio') fallback = { width: 130, height: 46 };
  if (field.sized) {
    const isCheckbox = type === 'Checkbox';
    return { width: Math.max(isCheckbox ? 12 : 24, width || fallback.width), height: Math.max(isCheckbox ? 12 : 14, height || fallback.height) };
  }
  if (type === 'Signature' || type === 'Initial') return { width: width > 0 ? width : fallback.width, height: height > 0 ? height : fallback.height };
  if (type === 'Stamp' || type === 'Checkbox') return fallback;
  return { width: width > 0 ? width : fallback.width, height: 36 };
}

const hasPosition = (field) => !field.unplaced && field.x !== null && field.x !== undefined && field.y !== null && field.y !== undefined
  && Number.isFinite(Number(field.x)) && Number.isFinite(Number(field.y));

// Characters the PDF's standard fonts cannot write, replaced by the nearest one they can
const PDF_CHARS = { ' ': ' ', '▪': '•', '■': '•', '●': '•', '○': 'o', '→': '->', '✓': 'v', '✔': 'v', '‑': '-' };
const pdfSafe = (text) => String(text ?? '').replace(/[ ▪■●○→✓✔‑]/g, (ch) => PDF_CHARS[ch] || ch);

function layoutFont(piece) {
  if (piece.m) return piece.b ? 'Courier-Bold' : 'Courier';
  if (piece.b && piece.i) return 'Helvetica-BoldOblique';
  if (piece.b) return 'Helvetica-Bold';
  if (piece.i) return 'Helvetica-Oblique';
  return 'Helvetica';
}

/** Writes one line of text with its baseline at `baseline` (points), fitted to `width` when one is given. */
function drawTextAt(doc, text, x, baseline, { font, size, color, width = 0, alignRight = false, underline = false, strike = false }) {
  const value = pdfSafe(text);
  if (!value) return;
  doc.font(font).fontSize(size).fillColor(color);
  const natural = doc.widthOfString(value);
  // The browser's font is a little wider or narrower than the PDF's: the line is stretched or condensed sideways
  // to the width it has on the page, so every line starts and ends where it does in the editor
  const stretch = width > 0 && natural > 0 && value.length > 1 ? Math.max(0.78, Math.min(1.25, width / natural)) : 1;
  const drawnWidth = natural * stretch;
  const left = alignRight ? x - drawnWidth : x;
  const ascent = (doc._font && doc._font.ascender ? doc._font.ascender : 718) / 1000 * size;
  doc.save();
  doc.translate(left, baseline - ascent);
  doc.scale(stretch, 1);
  doc.text(value, 0, 0, { lineBreak: false });
  doc.restore();
  if (underline || strike) {
    const lineY = underline ? baseline + size * 0.12 : baseline - size * 0.28;
    doc.save();
    doc.moveTo(left, lineY).lineTo(left + drawnWidth, lineY).lineWidth(Math.max(0.4, size / 16)).strokeColor(color).stroke();
    doc.restore();
  }
}

/**
 * Where a page that is longer than A4 is cut into PDF pages: the source positions (page pixels) each PDF page
 * starts at. A cut never goes through a line of text, a field or an image.
 */
function sliceStarts(contentBottom, blocks) {
  const starts = [0];
  for (let guard = 0; guard < 200; guard += 1) {
    const start = starts[starts.length - 1];
    const capacity = PAGE_HEIGHT_PX - SLICE_BOTTOM_PX - (starts.length === 1 ? 0 : SLICE_TOP_PX);
    if (contentBottom - start <= capacity) break;
    let cut = start + capacity;
    for (let moved = true; moved;) {
      moved = false;
      for (const block of blocks) {
        if (block.top > start + 1 && block.top < cut && block.bottom > cut) {
          cut = block.top;
          moved = true;
        }
      }
    }
    // Something taller than a page starts here: it is cut where the page ends
    if (cut < start + 120) cut = start + capacity;
    starts.push(cut);
  }
  return starts;
}

// Labels written beside a field. Same rules as fieldLabelPosition(), checkboxValuePosition(), radioValuesPosition()
// and labelFontSize() in client/src/utils/fieldSizing.js, and the same gaps as FieldLabel.jsx.
const LABEL_SIDES = ['none', 'left', 'right', 'top', 'bottom'];
const sidePosition = (value) => (LABEL_SIDES.includes(value) ? value : null);
const fieldLabelPosition = (field) => sidePosition(field.labelPosition) || 'none';
const checkboxValuePosition = (field) => sidePosition(field.valuePosition) || (field.showLabel ? 'right' : 'none');
const radioValuesPosition = (field) => sidePosition(field.valuesPosition) || (field.showLabels === false ? 'none' : 'right');
const labelFontPx = (field) => Math.max(8, Math.min(16, Number(field.fontSize) || 11));
const LABEL_GAP_SIDE = 6;
const LABEL_GAP_STACK = 3;

/** Writes a label beside a field's box (x, y, width, height in points) on the given side. */
function drawSideLabel(doc, text, position, x, y, width, height, fontPx) {
  const label = String(text ?? '').trim();
  if (!label || position === 'none') return;
  const size = fontPx * PX;
  const style = { font: 'Helvetica-Bold', size, color: '#1e293b' };
  if (position === 'left') drawTextAt(doc, label, x - LABEL_GAP_SIDE * PX, y + height / 2 + size * 0.34, { ...style, alignRight: true });
  else if (position === 'right') drawTextAt(doc, label, x + width + LABEL_GAP_SIDE * PX, y + height / 2 + size * 0.34, style);
  else if (position === 'top') drawTextAt(doc, label, x, y - LABEL_GAP_STACK * PX - size * 0.33, style);
  else if (position === 'bottom') drawTextAt(doc, label, x, y + height + LABEL_GAP_STACK * PX + size * 0.92, style);
}

/** Draws one placed field into its box (points) and, when the sender asked for it, its name beside the box. */
function drawPositionedField(doc, entry, box, x, y, context) {
  const drawn = drawFieldBody(doc, entry, box, x, y, context);
  const { field } = entry;
  // A checkbox shows its value instead of its name (drawn with the box)
  if (drawn !== false && field.type !== 'Checkbox') {
    drawSideLabel(doc, field.label, fieldLabelPosition(field), x, y, box.width * PX, box.height * PX, labelFontPx(field));
  }
}

/** The field itself. Returns false when nothing was drawn (a stamp without a picture). `entry` is { field, recipient }. */
function drawFieldBody(doc, entry, box, x, y, context) {
  const { field, recipient } = entry;
  const width = box.width * PX;
  const height = box.height * PX;
  const signerName = field.signerName || recipient.name || recipient.email;

  if (field.type === 'Signature' || field.type === 'Initial') {
    const isInitial = field.type === 'Initial';
    const image = imageBufferFromDataUrl(field.signatureImage) || imageBufferFromDataUrl(field.value) || imageBufferFromDataUrl(recipient.signature_image);
    const typedText = typedSignatureText(field.signatureImage, field) || typedSignatureText(recipient.signature_image, field);
    // The stamp (about 230 x 104 points at full size) is scaled to fit the field's box
    const scale = Math.max(MIN_STAMP_SCALE, Math.min(width / 230, height / SIGNATURE_STAMP_HEIGHT, 1.3));
    doc.save();
    doc.translate(x, y);
    doc.scale(scale);
    drawSignatureStamp(doc, 9, 0, { signerName, image, typedText, bexsignDocId: context.bexsignDocId, isInitial });
    doc.restore();
    return;
  }

  if (field.type === 'Stamp') {
    const stampImage = imageBufferFromDataUrl(field.stampImage) || imageBufferFromDataUrl(field.value);
    if (!stampImage) return false;
    // The picture fills the stamp's shape (rectangle or oval) and is cut off at its edge; zoom and quarter turns
    // work as in client/src/components/documents/StampImage.jsx
    const turn = ((Number(field.stampRotation) || 0) % 360 + 360) % 360;
    const sideways = turn === 90 || turn === 270;
    const zoom = Math.max(0.1, (Number(field.stampZoom) || 100) / 100);
    const drawWidth = sideways ? height : width;
    const drawHeight = sideways ? width : height;
    doc.save();
    try {
      if (field.stampShape === 'oval') doc.ellipse(x + width / 2, y + height / 2, width / 2, height / 2).clip();
      else doc.roundedRect(x, y, width, height, 2).clip();
      doc.translate(x + width / 2, y + height / 2);
      if (turn) doc.rotate(turn);
      if (zoom !== 1) doc.scale(zoom);
      doc.image(stampImage, -drawWidth / 2, -drawHeight / 2, { cover: [drawWidth, drawHeight], align: 'center', valign: 'center' });
    } catch (e) {}
    doc.restore();
    return;
  }

  // A value field covers what is printed under it (a placeholder or a dotted line in the text), as on the page
  const coverBox = () => {
    doc.save();
    doc.rect(x, y, width, height).fill('#ffffff');
    doc.restore();
  };

  if (field.type === 'Checkbox') {
    const checked = isChecked(field);
    const side = Math.min(width, height);
    const left = x + (width - side) / 2;
    const top = y + (height - side) / 2;
    doc.save();
    doc.roundedRect(left, top, side, side, Math.min(2, side / 6)).fillAndStroke('#ffffff', '#334155');
    doc.roundedRect(left, top, side, side, Math.min(2, side / 6)).lineWidth(0.8).strokeColor('#334155').stroke();
    if (checked) {
      doc.moveTo(left + side * 0.22, top + side * 0.53).lineTo(left + side * 0.43, top + side * 0.74).lineTo(left + side * 0.8, top + side * 0.27)
        .lineWidth(Math.max(1, side / 9)).lineCap('round').lineJoin('round').strokeColor('#0f172a').stroke();
    }
    doc.restore();
    // The value the checkbox stands for, on the side the sender chose
    drawSideLabel(doc, field.optionValue, checkboxValuePosition(field), x, y, width, height, labelFontPx(field));
    return;
  }

  if (field.type === 'Radio') {
    // The buttons share the box evenly and each value sits beside its button: the same arithmetic as
    // radioLayout() in client/src/utils/fieldSizing.js
    const options = fieldOptions(field);
    const count = Math.max(1, options.length);
    const horizontal = field.direction === 'horizontal';
    const position = radioValuesPosition(field);
    const cellWidth = horizontal ? box.width / count : box.width;
    const cellHeight = horizontal ? box.height : box.height / count;
    const fontPx = labelFontPx(field);
    const lineHeight = fontPx * 1.25;
    const stacked = position === 'top' || position === 'bottom';
    const size = Math.max(8, Math.min(16, (stacked ? cellHeight - lineHeight - 2 : cellHeight) - 4, cellWidth - 2));
    const chosen = String(field.value ?? '');
    if (position !== 'none') coverBox();
    options.forEach((option, index) => {
      const cellLeft = horizontal ? index * cellWidth : 0;
      const cellTop = horizontal ? 0 : index * cellHeight;
      const middle = cellTop + cellHeight / 2;
      let buttonLeft = cellLeft + 1;
      let buttonTop = middle - size / 2;
      let label = null; // { x, centerY, alignRight } in page pixels from the box
      if (position === 'left') {
        buttonLeft = cellLeft + cellWidth - size - 1;
        label = { x: cellLeft + Math.max(0, cellWidth - size - 7), centerY: middle, alignRight: true };
      } else if (stacked) {
        const blockTop = cellTop + Math.max(0, (cellHeight - size - lineHeight - 2) / 2);
        buttonTop = position === 'top' ? blockTop + lineHeight + 2 : blockTop;
        const labelTop = position === 'top' ? blockTop : blockTop + size + 2;
        label = { x: cellLeft + 1, centerY: labelTop + lineHeight / 2, alignRight: false };
      } else if (position === 'right') {
        label = { x: cellLeft + size + 6, centerY: middle, alignRight: false };
      }
      const centerX = x + (buttonLeft + size / 2) * PX;
      const centerY = y + (buttonTop + size / 2) * PX;
      const selected = chosen !== '' && option.value === chosen;
      doc.save();
      doc.circle(centerX, centerY, (size / 2) * PX).fill('#ffffff');
      doc.circle(centerX, centerY, (size / 2) * PX).lineWidth(0.8).strokeColor(selected ? '#0f172a' : '#64748b').stroke();
      if (selected) doc.circle(centerX, centerY, (size / 2) * PX * 0.52).fill('#0f172a');
      doc.restore();
      if (label) {
        const labelSize = fontPx * PX;
        drawTextAt(doc, option.value, x + label.x * PX, y + label.centerY * PX + labelSize * 0.34, {
          font: selected ? 'Helvetica-Bold' : 'Helvetica', size: labelSize, color: '#1e293b', alignRight: label.alignRight
        });
      }
    });
    return;
  }

  const configured = Number(field.fontSize) || 11;
  const fontPx = Math.max(7, Math.min(configured, Math.floor(box.height - 4)));
  const font = field.isItalic ? 'Helvetica-BoldOblique' : 'Helvetica-Bold';

  if (field.type === 'Split text') {
    const chars = Array.isArray(field.gridValue) && field.gridValue.some(Boolean)
      ? field.gridValue
      : (field.value && field.value !== field.type ? String(field.value).split('') : []);
    const cell = box.cellWidth * PX;
    const gap = box.gap * PX;
    const size = Math.min(12, fontPx) * PX;
    coverBox();
    doc.save();
    doc.lineWidth(0.5).strokeColor('#94a3b8');
    for (let i = 0; i < box.count; i += 1) {
      const cellX = x + 0.75 + i * (cell + gap);
      doc.rect(cellX, y + 0.75, cell, height - 1.5).stroke();
    }
    doc.restore();
    doc.font('Courier-Bold').fontSize(size).fillColor('#0f172a');
    for (let i = 0; i < box.count; i += 1) {
      const ch = pdfSafe(chars[i] || '');
      if (!ch) continue;
      const cellX = x + 0.75 + i * (cell + gap);
      drawTextAt(doc, ch, cellX + (cell - doc.widthOfString(ch)) / 2, y + height / 2 + size * 0.34, { font: 'Courier-Bold', size, color: '#0f172a' });
    }
    return;
  }

  // Text, name, email, company, date: the value written into the box, without a frame
  let value = fieldDisplayValue(field, recipient);
  if (value === '-') value = '';
  coverBox();
  if (!value) return;
  let size = fontPx * PX;
  const padding = 6 * PX;
  doc.font(font).fontSize(size);
  const room = Math.max(10, width - padding * 2);
  // A value longer than its box is written a little smaller before it is allowed to run past the box
  const natural = doc.widthOfString(pdfSafe(value));
  if (natural > room) size = Math.max(size * 0.72, size * (room / natural));
  drawTextAt(doc, value, x + padding, y + height / 2 + size * 0.34, { font, size, color: '#0f172a' });
}

/** Draws the document from its layout snapshot, with the fields at their positions. */
function drawPositionedDocument(doc, layout, entries, context) {
  const pageCount = Math.max(layout.pages.length, ...entries.map(({ field }) => (hasPosition(field) ? (parseInt(field.page, 10) || 1) : 1)));
  let firstPdfPage = true;

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const page = layout.pages[pageIndex] || { height: PAGE_HEIGHT_PX, texts: [], rects: [], images: [] };
    const texts = page.texts || [];
    const rects = page.rects || [];
    const images = page.images || [];

    // Fields of this page; fields without a position follow the content of the first page
    const placed = entries
      .filter(({ field }) => hasPosition(field) && (parseInt(field.page, 10) || 1) === pageIndex + 1)
      .map((entry) => ({ entry, box: fieldBox(entry.field), x: Number(entry.field.x), y: Number(entry.field.y) }));
    let contentBottom = Math.max(
      0,
      ...texts.map((t) => Number(t.y) + Number(t.h)),
      ...images.map((img) => Number(img.y) + Number(img.h)),
      ...placed.map((p) => p.y + p.box.height)
    );
    if (pageIndex === 0) {
      entries.filter(({ field }) => !hasPosition(field)).forEach((entry) => {
        const box = fieldBox(entry.field);
        placed.push({ entry, box, x: 56, y: contentBottom + 28 });
        contentBottom += 28 + box.height;
      });
    }

    const blocks = [
      ...texts.map((t) => ({ top: Number(t.y), bottom: Number(t.y) + Number(t.h) })),
      ...images.map((img) => ({ top: Number(img.y), bottom: Number(img.y) + Number(img.h) })),
      ...placed.map((p) => ({ top: p.y, bottom: p.y + p.box.height }))
    ];
    // A page as long as the editor's A4 page is drawn as it is; a longer one is cut into A4 pages
    const starts = Number(page.height) <= PAGE_HEIGHT_PX + 2 && contentBottom <= PAGE_HEIGHT_PX - 40
      ? [0]
      : sliceStarts(contentBottom, blocks);

    starts.forEach((start, sliceIndex) => {
      const end = sliceIndex + 1 < starts.length ? starts[sliceIndex + 1] : Infinity;
      if (!firstPdfPage) doc.addPage();
      firstPdfPage = false;
      doc.page.margins.bottom = 0;
      const shift = (sliceIndex === 0 ? 0 : SLICE_TOP_PX) - start;
      const toY = (value) => (Number(value) + shift) * PX;
      const inSlice = (top) => Number(top) >= start - 0.5 && Number(top) < end - 0.5;

      // Backgrounds and borders may run over a cut: each PDF page shows its own part
      doc.save();
      const clipTop = sliceIndex === 0 ? 0 : SLICE_TOP_PX * PX;
      // On a page that was cut into several, nothing is drawn into the footer area of a PDF page
      const pageLimit = starts.length > 1 ? (PAGE_HEIGHT_PX - SLICE_BOTTOM_PX + 6) * PX : doc.page.height;
      const clipBottom = Math.min(pageLimit, end === Infinity ? doc.page.height : toY(end));
      doc.rect(0, clipTop, doc.page.width, Math.max(0, clipBottom - clipTop)).clip();
      rects.forEach((r) => {
        if (Number(r.y) + Number(r.h) <= start || Number(r.y) >= end) return;
        if (!(Number(r.w) > 0 && Number(r.h) > 0)) return;
        doc.rect(Number(r.x) * PX, toY(r.y), Math.max(0.4, Number(r.w) * PX), Math.max(0.4, Number(r.h) * PX)).fill(r.c || COLORS.border);
      });
      images.forEach((img) => {
        if (!inSlice(img.y)) return;
        const buffer = imageBufferFromDataUrl(img.src);
        if (!buffer) return;
        try {
          doc.image(buffer, Number(img.x) * PX, toY(img.y), { width: Number(img.w) * PX, height: Number(img.h) * PX });
        } catch (e) {}
      });
      doc.restore();

      texts.forEach((t) => {
        if (!inSlice(t.y)) return;
        drawTextAt(doc, t.t, Number(t.x) * PX, toY(t.bl ?? (Number(t.y) + Number(t.h) * 0.8)), {
          font: layoutFont(t),
          size: Math.max(4, Number(t.s) * PX),
          color: t.c || COLORS.text,
          width: Number(t.w) * PX,
          alignRight: t.a === 'r',
          underline: Boolean(t.u),
          strike: Boolean(t.k)
        });
      });

      placed.forEach((p) => {
        if (!inSlice(p.y)) return;
        drawPositionedField(doc, p.entry, p.box, p.x * PX, toY(p.y), context);
      });
    });
  }
}

/**
 * Signed copy of one document.
 * sections: [{ recipient, fields }] – already filtered to the fields each recipient owns in this document.
 * layout: the document's layout snapshot (optional): with it the fields are drawn at their own positions.
 */
function generateSignedDocumentPdf({
  documentName = 'Document',
  documentText = '',
  bexsignDocId = '',
  sections = [],
  signerSummary = [],
  completedAt = new Date(),
  statusLine = '',
  sender = {},
  layout = null
}) {
  const title = String(documentName || 'Document').replace(/\.pdf$/i, '');
  const positioned = usableLayout(layout, documentText);
  if (positioned) {
    const status = statusLine || `Completed on ${formatDateTime(completedAt)}`;
    return renderPdf(
      {
        info: { Title: title, Author: sender.name || 'BexSign', Subject: 'Signed document', Creator: 'BexSign' },
        footer: `BexSign Document ID: ${bexsignDocId}`,
        footerNote: status
      },
      (doc) => {
        const entries = sections.flatMap(({ recipient, fields }) => fields.map((field) => ({ field, recipient })));
        drawPositionedDocument(doc, positioned, entries, { bexsignDocId });
      }
    );
  }
  return renderPdf(
    {
      info: { Title: title, Author: sender.name || 'BexSign', Subject: 'Signed document', Creator: 'BexSign' },
      footer: `BexSign Document ID: ${bexsignDocId}`
    },
    (doc) => {
      const left = doc.page.margins.left;
      const width = contentWidth(doc);

      doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(`BexSign Document ID: ${bexsignDocId}`, left, doc.y);
      doc.text(statusLine || `Completed on ${formatDateTime(completedAt)}`, { width, align: 'left' });
      doc.moveDown(0.3);
      doc.moveTo(left, doc.y).lineTo(left + width, doc.y).strokeColor(COLORS.border).lineWidth(0.75).stroke();
      doc.moveDown(0.8);
      doc.font('Helvetica-Bold').fontSize(18).fillColor(COLORS.text).text(title, left, doc.y, { width });
      doc.moveDown(0.6);

      drawDocumentBody(doc, documentText, { left, width });

      if (sections.length > 0) {
        // Fields only (no field labels or headings), like the signed document in Zoho Sign
        ensureSpace(doc, 60);
        doc.moveDown(0.8);
        doc.moveTo(left, doc.y).lineTo(left + width, doc.y).strokeColor(COLORS.border).lineWidth(0.75).stroke();
        doc.moveDown(1);
        drawFieldsGrid(doc, sections.flatMap(({ recipient, fields }) => fields.map((field) => ({ field, recipient }))), { bexsignDocId });
      } else if (signerSummary.length > 0) {
        sectionTitle(doc, 'Signatures');
        doc
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor(COLORS.text)
          .text(`This document is part of a completed BexSign request signed by ${signerSummary.join(', ')}.`, left, doc.y, { width });
      }
    }
  );
}

/** Certificate of Completion for the whole request. */
function generateCompletionCertificatePdf({
  requestName = 'Document',
  bexsignDocId = '',
  sender = {},
  sentAt,
  completedAt,
  signingOrder = 'parallel',
  documents = [],
  recipients = [],
  events = [],
  history = []
}) {
  return renderPdf(
    {
      info: { Title: `Certificate of Completion - ${requestName}`, Author: 'BexSign', Subject: 'Certificate of Completion', Creator: 'BexSign' },
      footer: `Certificate of Completion   |   ${bexsignDocId}`
    },
    (doc) => {
      const left = doc.page.margins.left;
      const width = contentWidth(doc);

      doc.rect(0, 0, doc.page.width, 92).fill(COLORS.brand);
      doc.font('Helvetica-Bold').fontSize(20).fillColor('#ffffff').text('Certificate of Completion', left, 30, { width });
      doc.font('Helvetica').fontSize(9).fillColor('#d1fae5').text('BexSign electronic signature audit record', left, 58, { width });
      doc.x = left;
      doc.y = 112;

      const signers = recipients.filter((r) => r.role === 'signer').length;
      const approvers = recipients.filter((r) => r.role === 'approver').length;
      const copies = recipients.length - signers - approvers;

      sectionTitle(doc, 'Summary');
      keyValueRow(doc, 'Request name', requestName);
      keyValueRow(doc, 'BexSign Document ID', bexsignDocId);
      keyValueRow(doc, 'Status', 'Completed');
      keyValueRow(doc, 'Sender', sender.email ? `${sender.name} <${sender.email}>` : (sender.name || '-'));
      keyValueRow(doc, 'Organization', sender.company || '-');
      keyValueRow(doc, 'Sent on', formatDateTime(sentAt));
      keyValueRow(doc, 'Completed on', formatDateTime(completedAt));
      keyValueRow(doc, 'Signing order', signingOrder === 'sequential' ? 'Sequential' : 'Parallel');
      keyValueRow(doc, 'Recipients', `${signers} signer(s), ${approvers} approver(s), ${copies} receive(s) a copy`);
      keyValueRow(doc, 'Documents', documents.length ? documents.map((d, i) => `${i + 1}. ${d.name}`).join('\n') : '-');

      if (documents.some((d) => d.sha256)) {
        sectionTitle(doc, 'Document fingerprints (SHA-256)');
        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(COLORS.muted)
          .text('Each signed PDF issued with this certificate is locked against editing and has the fingerprint below. Use "Verify document" in BexSign to check a copy: a file changed in any way no longer matches.', left, doc.y, { width });
        doc.moveDown(0.5);
        documents.filter((d) => d.sha256).forEach((d, i) => {
          ensureSpace(doc, 30);
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.text).text(`${i + 1}. ${d.name}`, left, doc.y, { width });
          doc.font('Courier').fontSize(8).fillColor(COLORS.text).text(d.sha256, left + 12, doc.y, { width: width - 12 });
          doc.moveDown(0.35);
        });
        doc.x = left;
      }

      sectionTitle(doc, 'Recipients');
      recipients.forEach((r, idx) => {
        ensureSpace(doc, 150);
        const blockTop = doc.y;
        const recEvents = events.filter((e) => String(e.recipient_id) === String(r.id));
        const signedEvent = [...recEvents].reverse().find((e) => e.event_type === 'signed');
        doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text).text(`${idx + 1}. ${r.name || r.email}`, left, blockTop, { width: width - 190 });
        doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted).text(`${r.email}   |   ${r.role_label || 'Needs to sign'}`, { width: width - 190 });
        doc.moveDown(0.3);
        // "Receives a copy" recipients never sign, so the signing timeline rows and the signature box don't apply
        const isCopy = r.role === 'viewer' || r.role === 'reviewer';
        // The copy is the completion email this certificate goes out with, so before delivery it reads "sent on completion"
        const detailRows = isCopy ? [
          ['Status', r.sent_at ? 'COPY SENT' : 'SENT ON COMPLETION']
        ] : [
          ['Status', String(r.status || 'pending').toUpperCase()],
          ['Emailed on', formatDateTime(r.sent_at)],
          ['Viewed on', formatDateTime(r.viewed_at)],
          // Consent to the Electronic Record and Signature Disclosure, given before signing
          ['Terms agreed', formatDateTime(r.consent_at)],
          ['Completed on', formatDateTime(r.signed_at)],
          ['IP address', r.signed_ip || signedEvent?.ip_address || '-'],
          ['Device', describeDevice(r.signed_user_agent || signedEvent?.user_agent)]
        ];
        detailRows.forEach(([label, value]) => {
          const rowY = doc.y;
          doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted).text(label, left, rowY, { width: 90 });
          doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.text).text(value, left + 95, rowY, { width: width - 290 });
          doc.y = Math.max(doc.y, rowY + 11);
        });
        const textBottom = doc.y;

        const sigImage = imageBufferFromDataUrl(r.signature_image);
        const boxX = left + width - 180;
        const boxY = blockTop + 4;
        if (!isCopy) {
          doc.rect(boxX, boxY, 180, 60).strokeColor(COLORS.border).lineWidth(0.75).stroke();
          let drawn = false;
          if (sigImage) {
            try {
              doc.image(sigImage, boxX + 6, boxY + 4, { fit: [168, 52], align: 'center', valign: 'center' });
              drawn = true;
            } catch (e) {
              drawn = false;
            }
          }
          if (!drawn && r.status === 'signed') {
            const typed = typeof r.signature_image === 'string' && r.signature_image && !r.signature_image.startsWith('data:') ? r.signature_image : (r.name || '');
            useSignatureFont(doc);
            doc.fontSize(18).fillColor('#0f172a').text(typed, boxX + 6, boxY + 20, { width: 168, align: 'center', lineBreak: false });
          }
        }
        doc.x = left;
        doc.y = (isCopy ? textBottom : Math.max(textBottom, boxY + 64)) + 8;
        doc.moveTo(left, doc.y).lineTo(left + width, doc.y).strokeColor(COLORS.soft).lineWidth(0.75).stroke();
        doc.moveDown(0.5);
      });

      if (history.length > 0) {
        sectionTitle(doc, 'Audit trail');
        history.forEach((h) => {
          ensureSpace(doc, 26);
          const rowY = doc.y;
          doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(formatDateTime(h.created_at), left, rowY, { width: 120 });
          doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.text).text(h.activity_description || '-', left + 125, rowY, { width: width - 225 });
          const descBottom = doc.y;
          doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(h.ip_address || '-', left + width - 95, rowY, { width: 95, align: 'right' });
          doc.x = left;
          doc.y = Math.max(descBottom, rowY + 11) + 4;
        });
      }

      ensureSpace(doc, 60);
      doc.moveDown(1);
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text(
          'All parties agreed to conduct this transaction electronically. Each recipient accessed the request through a link sent to their email address, reviewed the documents and completed the fields assigned to them. The audit trail above records the events captured by BexSign.',
          left,
          doc.y,
          { width }
        );
    }
  );
}

module.exports = {
  formatDateTime,
  usableLayout,
  generateSignedDocumentPdf,
  generateCompletionCertificatePdf,
  toPlainText,
  htmlToBlocks,
  drawDocumentBody
};
