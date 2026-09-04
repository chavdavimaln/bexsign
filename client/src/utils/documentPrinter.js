import { generateBexsignId } from './documentId';
import { getDefaultDocContent } from './documentDefaults';

/**
 * Utility to print the canonical BexSign document sheet
 * matching the on-screen view and zoho_signed_doc_example.pdf.
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
  placedFields = []
}) {
  const fullDocId = bexsignDocId || (typeof docId === 'string' && docId.startsWith('BEX-') ? docId : generateBexsignId(docId));
  const docTitle = documentName || 'Document 1.pdf';
  const cleanBody = (documentText && documentText.trim() && documentText !== 'check the document for signature')
    ? documentText
    : getDefaultDocContent(docTitle, documentText);

  let sigIdLine1 = 'BEX-SIGN-VC-EMP001-2026';
  let sigIdLine2 = typeof fullDocId === 'string' ? fullDocId.replace('BEX-DOC-', '').substring(0, 24) : '361682B4-ERZWA2U19FQKOU0L';

  const sigHtml = signatureImage && signatureImage.startsWith('data:')
    ? `<img src="${signatureImage}" style="max-height: 48px; max-width: 200px; object-fit: contain; margin: 4px 0; display: block;" />`
    : `<div style="font-family: 'Brush Script MT', 'Caveat', 'Segoe Script', cursive; font-size: 26px; color: #0f172a; margin: 4px 0; font-weight: 700;">${signerName || 'Vimal Chavda'}</div>`;

  const allFields = (fields && fields.length > 0 ? fields : placedFields) || [];
  const otherFields = allFields.filter(f => f.type !== 'Signature' && f.type !== 'Initial' && f.type !== 'Stamp');

  let otherFieldsHtml = '';
  if (otherFields.length > 0) {
    otherFieldsHtml = `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin: 18px 0;">
        ${otherFields.map(f => {
          let fVal = '';
          if (f.type === 'Company') fVal = f.value || 'Bexcode Services';
          else if (f.type === 'Email') fVal = f.value || signerEmail;
          else if (f.type === 'Full name' || f.type === 'Name') fVal = f.value || signerName;
          else if (f.type === 'Sign date' || f.type === 'Date') fVal = f.value || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          else if (f.type === 'Job title') fVal = f.value || 'Designated Signer';
          else if (f.type === 'Checkbox') fVal = (f.value === true || f.value === 'true') ? '☑ Confirmed' : '☐ Not checked';
          else fVal = f.value || f.label || '-';

          return `
            <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; background: #f8fafc;">
              <div class="field-label" style="margin-bottom: 3px;">${f.label || f.type}</div>
              <div style="font-size: 12px; font-weight: 700; color: #0f172a;">${fVal}</div>
            </div>
          `;
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
        <title>${docTitle}</title>
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
          .field-label {
            font-size: 10px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 8px;
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
          .stamp-box {
            border: 2px dashed #cbd5e1;
            border-radius: 6px;
            padding: 8px 12px;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            width: 250px;
            justify-content: space-between;
            font-size: 12px;
            font-weight: 700;
            color: #334155;
            margin-bottom: 18px;
            background: #f8fafc;
          }
          .bex-badge {
            background: #E71414;
            color: white;
            font-weight: 900;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
          }
          .verified-badge {
            font-size: 9px;
            color: #047857;
            background: #ecfdf5;
            padding: 2px 6px;
            border-radius: 3px;
            border: 1px solid #a7f3d0;
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

        <div class="doc-title">${docTitle}</div>
        <div class="doc-content">${cleanBody}</div>

        <div class="fields-section">
          <div class="field-label">SIGNATURE</div>
          <div class="sig-bracket-box">
            <div class="sig-signed-by">- Signed by: ${signerName}</div>
            ${sigHtml}
            <div class="sig-line"></div>
            <div class="sig-ids">
              ${sigIdLine1}<br />
              ${sigIdLine2}
            </div>
          </div>

          ${otherFieldsHtml}

          <div class="field-label">STAMP</div>
          <div class="stamp-box">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="bex-badge">Bex</span>
              <span>Corporate Official Stamp</span>
            </div>
            <span class="verified-badge">Verified</span>
          </div>

          <div class="email-text">${signerEmail}</div>
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
