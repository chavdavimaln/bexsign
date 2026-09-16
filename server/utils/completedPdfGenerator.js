/**
 * Completed Request PDF Generator (server/utils/completedPdfGenerator.js)
 * Builds, with pdfkit, the signed copy of every document in a request (each recipient's own
 * field values and signature image) and the Certificate of Completion with the audit trail.
 */
const crypto = require('crypto');
const PDFDocument = require('pdfkit');

/**
 * Signed documents and certificates are locked (AES-256): they open without a password and can be printed, but
 * editing, annotating, filling forms, assembling pages and copying content are not permitted. The random owner
 * password is never stored, so nobody (BexSign included) can unlock the permissions of an issued copy.
 */
function lockedPdfOptions() {
  return {
    pdfVersion: '1.7ext3',
    ownerPassword: crypto.randomBytes(32).toString('hex'),
    permissions: {
      printing: 'highResolution',
      modifying: false,
      copying: false,
      annotating: false,
      fillingForms: false,
      contentAccessibility: true,
      documentAssembly: false
    }
  };
}

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

function renderPdf({ info, footer }, draw) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      ...lockedPdfOptions(),
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
function buildFieldBlock(doc, field, recipient, columnWidth) {
  const signerName = field.signerName || recipient.name || recipient.email;

  if (field.type === 'Signature' || field.type === 'Initial') {
    const isInitial = field.type === 'Initial';
    const boxWidth = isInitial ? 120 : 210;
    const boxHeight = 58;
    const image = imageBufferFromDataUrl(field.signatureImage) || imageBufferFromDataUrl(field.value) || imageBufferFromDataUrl(recipient.signature_image);
    const caption = `Signed electronically by ${signerName} (${recipient.email}) on ${formatDateTime(field.signedAt || recipient.signed_at)}`;
    doc.font('Helvetica').fontSize(7.5);
    const captionHeight = doc.heightOfString(caption, { width: contentWidth(doc) });
    return {
      full: true,
      height: boxHeight + 4 + captionHeight,
      draw: (x, y, width) => {
        doc.rect(x, y, boxWidth, boxHeight).strokeColor(COLORS.border).lineWidth(0.75).stroke();
        let drawn = false;
        if (image) {
          try {
            doc.image(image, x + 6, y + 4, { fit: [boxWidth - 12, boxHeight - 8], align: 'center', valign: 'center' });
            drawn = true;
          } catch (e) {
            drawn = false;
          }
        }
        if (!drawn) {
          doc.font('Times-Italic').fontSize(20).fillColor('#0f172a').text(isInitial ? initialsOf(signerName) : signerName, x + 8, y + boxHeight / 2 - 11, {
            width: boxWidth - 16,
            align: 'center',
            lineBreak: false
          });
        }
        doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.muted).text(caption, x, y + boxHeight + 4, { width });
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

  const value = fieldDisplayValue(field, recipient);
  const textWidth = columnWidth - 16;
  doc.font('Helvetica').fontSize(10);
  const textHeight = doc.heightOfString(value, { width: textWidth });
  const boxHeight = Math.max(24, textHeight + 12);
  return {
    full: false,
    height: boxHeight,
    draw: (x, y, width) => {
      doc.rect(x, y, width, boxHeight).strokeColor(COLORS.border).lineWidth(0.75).stroke();
      doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text(value, x + 8, y + (boxHeight - textHeight) / 2, { width: width - 16 });
    }
  };
}

/** Lays out field blocks: signatures take a full row, other fields flow in two columns. */
function drawFieldsGrid(doc, entries) {
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
    const block = buildFieldBlock(doc, field, recipient, columnWidth);
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
      doc.text(`Completed on ${formatDateTime(completedAt)}`, { width, align: 'left' });
      doc.moveDown(0.3);
      doc.moveTo(left, doc.y).lineTo(left + width, doc.y).strokeColor(COLORS.border).lineWidth(0.75).stroke();
      doc.moveDown(0.8);
      doc.font('Helvetica-Bold').fontSize(18).fillColor(COLORS.text).text(title, left, doc.y, { width });
      doc.moveDown(0.6);

      toPlainText(documentText).split('\n').forEach((line) => {
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

      if (sections.length > 0) {
        // Fields only (no field labels or headings), like the signed document in Zoho Sign
        ensureSpace(doc, 60);
        doc.moveDown(0.8);
        doc.moveTo(left, doc.y).lineTo(left + width, doc.y).strokeColor(COLORS.border).lineWidth(0.75).stroke();
        doc.moveDown(1);
        drawFieldsGrid(doc, sections.flatMap(({ recipient, fields }) => fields.map((field) => ({ field, recipient }))));
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
            doc.font('Times-Italic').fontSize(18).fillColor('#0f172a').text(r.name || '', boxX + 6, boxY + 20, { width: 168, align: 'center', lineBreak: false });
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
  generateSignedDocumentPdf,
  generateCompletionCertificatePdf,
  toPlainText
};
