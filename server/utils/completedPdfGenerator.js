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

function renderPdfBuffer({ info, footer }, draw, { locked = false } = {}) {
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

function fieldDisplayValue(field, recipient) {
  const raw = field.value;
  const isEmpty = raw === undefined || raw === null || String(raw).trim() === '' || raw === field.type;
  switch (field.type) {
    case 'Checkbox':
      return (raw === true || raw === 'true' || field.checked === true) ? '[X] Checked' : '[ ] Not checked';
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
    const checked = field.value === true || field.value === 'true' || field.checked === true;
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

/**
 * Signed copy of one document.
 * sections: [{ recipient, fields }] – already filtered to the fields each recipient owns in this document.
 */
function generateSignedDocumentPdf({
  documentName = 'Document',
  documentText = '',
  bexsignDocId = '',
  sections = [],
  signerSummary = [],
  completedAt = new Date(),
  statusLine = '',
  sender = {}
}) {
  const title = String(documentName || 'Document').replace(/\.pdf$/i, '');
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
        const detailRows = [
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
        if (r.role !== 'viewer' && r.role !== 'reviewer') {
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
        doc.y = Math.max(textBottom, boxY + 64) + 8;
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
  generateSignedDocumentPdf,
  generateCompletionCertificatePdf,
  toPlainText,
  htmlToBlocks,
  drawDocumentBody
};
