import { generateBexsignId, signatureIdLines } from './documentId';
import { getDefaultDocContent } from './documentDefaults';
import {
  isSignatureField,
  getFieldSignatureImage,
  getStampImage,
  isFieldChecked,
  isFieldForSigner,
  getFieldDisplayValue,
  escapeHtml
} from './documentFields';

/**
 * Utility to print the canonical BexSign document sheet
 * matching the on-screen view and zoho_signed_doc_example.pdf.
 * Placed fields print without labels; a stamp prints only when a Stamp field was placed.
 */
export function printDocumentSheet({
  documentName = 'Document 1.pdf',
  documentText = 'check the document for signature',
  docId = 1,
  bexsignDocId = '',
  signerName = 'Vimal Chavda',
  signerEmail = 'vimal@bexcodeservices.com',
  signatureImage = '',
  signatureStyle = 'font-signature-1',
  fields = [],
  placedFields = [],
  // Print a signature block when the document has no placed fields at all
  defaultSignature = true
}) {
  const fullDocId = bexsignDocId || (typeof docId === 'string' && docId.startsWith('BEX-') ? docId : generateBexsignId(docId));
  const docTitle = documentName || 'Document 1.pdf';
  const cleanBody = (documentText && documentText.trim() && documentText !== 'check the document for signature')
    ? documentText
    : getDefaultDocContent(docTitle, documentText);

  const signatureHtml = (name, image) => {
    const imageHtml = image && image.startsWith('data:')
      ? `<img src="${escapeHtml(image)}" alt="Signature" style="max-height: 48px; max-width: 200px; object-fit: contain; margin: 4px 0; display: block;" />`
      : `<div style="font-family: 'Brush Script MT', 'Caveat', 'Segoe Script', cursive; font-size: 26px; color: #0f172a; margin: 4px 0; font-weight: 700;">${escapeHtml(name || 'Vimal Chavda')}</div>`;
    return `
      <div class="sig-bracket-box">
        <div class="sig-signed-by">- Signed by: ${escapeHtml(name)}</div>
        ${imageHtml}
        <div class="sig-line"></div>
        <div class="sig-ids">
          ${escapeHtml(signatureIdLines(fullDocId, name)[0])}<br />
          ${escapeHtml(signatureIdLines(fullDocId, name)[1])}
        </div>
        <div class="sig-certified">&#10003; Digitally Certified &amp; Verified</div>
      </div>
    `;
  };

  const allFields = (fields && fields.length > 0 ? fields : placedFields) || [];
  let fieldsHtml = '';
  if (allFields.length === 0) {
    // Requests created without placed fields keep a single signature block
    fieldsHtml = !defaultSignature ? '' : `${signatureHtml(signerName, signatureImage)}<div class="email-text">${escapeHtml(signerEmail)}</div>`;
  } else {
    fieldsHtml = `
      <div class="fields-grid">
        ${allFields.map((f) => {
          // Another recipient's masked field never appears in this copy
          if (f.isAssignedToOther) return '';
          if (isSignatureField(f)) {
            const ownSignature = getFieldSignatureImage(f);
            // One signature box per signer: another recipient's unsigned signature field is left out (no empty box)
            if (!ownSignature && !isFieldForSigner(f, signerEmail)) return '';
            return `<div class="field-full">${signatureHtml(f.signerName || signerName, ownSignature || signatureImage)}</div>`;
          }
          if (f.type === 'Stamp') {
            const stampSrc = getStampImage(f);
            return stampSrc ? `<div><img class="stamp-image" src="${escapeHtml(stampSrc)}" alt="Stamp" /></div>` : '';
          }
          if (f.type === 'Checkbox') {
            const checked = isFieldChecked(f);
            return `<div><span class="checkbox${checked ? ' checked' : ''}">${checked ? '&#10003;' : ''}</span></div>`;
          }
          const value = getFieldDisplayValue(f, { signerName, signerEmail });
          return `<div><div class="field-value">${value ? escapeHtml(value) : '&nbsp;'}</div></div>`;
        }).join('')}
      </div>
    `;
  }

  const printWindow = window.open('', '_blank', 'width=850,height=1000');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(docTitle)}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm 20mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 24px;
            background: #ffffff;
            line-height: 1.5;
          }
          .header-bar {
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 12px;
            margin-bottom: 24px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 11px;
            color: #64748b;
          }
          .doc-title {
            font-size: 22px;
            font-weight: 900;
            color: #0f172a;
            margin-bottom: 10px;
            letter-spacing: -0.02em;
          }
          .doc-content {
            font-size: 13px;
            color: #475569;
            line-height: 1.6;
            margin-bottom: 28px;
            white-space: pre-line;
          }
          .fields-section {
            border-top: 1px solid #e2e8f0;
            padding-top: 24px;
            margin-top: 24px;
          }
          .fields-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px 28px;
            align-items: start;
          }
          .field-full {
            grid-column: 1 / -1;
          }
          .field-value {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 12px;
            background: #f8fafc;
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
            min-height: 34px;
            word-break: break-word;
          }
          .stamp-image {
            display: block;
            max-width: 150px;
            max-height: 110px;
            object-fit: contain;
          }
          .checkbox {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 16px;
            height: 16px;
            border: 1.5px solid #64748b;
            border-radius: 3px;
            font-size: 12px;
            font-weight: 900;
            color: #047857;
          }
          .checkbox.checked {
            border-color: #047857;
          }
          .sig-bracket-box {
            border-left: 2.5px solid #1c4b82;
            padding-left: 12px;
            position: relative;
            margin-bottom: 24px;
          }
          .sig-signed-by {
            font-size: 11px;
            font-weight: 800;
            color: #1c4b82;
            margin-bottom: 4px;
          }
          .sig-line {
            border-bottom: 1px solid #cbd5e1;
            width: 240px;
            margin: 4px 0 6px 0;
          }
          .sig-ids {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 9px;
            color: #64748b;
            line-height: 1.4;
          }
          .sig-certified {
            font-size: 10px;
            font-weight: 800;
            color: #047857;
            margin-top: 6px;
          }
          .email-text {
            font-size: 12px;
            font-weight: 600;
            color: #475569;
            margin-top: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header-bar">
          BexSign Document ID: <strong style="color: #1e293b;">${fullDocId}</strong>
        </div>

        <div class="doc-title">${escapeHtml(docTitle)}</div>
        <div class="doc-content">${cleanBody}</div>

        <div class="fields-section">
          ${fieldsHtml}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
