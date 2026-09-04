import { generateBexsignId, generateEmployeeSignatureId } from './documentId';
import { getDefaultDocContent } from './documentDefaults';

/**
 * Converts a signature image (dataURL, drawn canvas, or typed name)
 * into raw JPEG bytes for embedding inside standard PDF 1.4 /DCTDecode stream.
 */
function prepareSignatureImageObject(signatureImage, signerName) {
  return new Promise((resolve) => {
    // 1. If no image or if it's plain text (Type tab)
    if (!signatureImage || (!signatureImage.startsWith('data:') && !signatureImage.startsWith('http') && !signatureImage.startsWith('/'))) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 360;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'italic bold 36px "Brush Script MT", "Caveat", "Segoe Script", cursive, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(signerName || 'Vimal Chavda', 24, 52);

        const jpegUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve(dataUrlToJpegBytes(jpegUrl));
      } catch (e) {
        resolve(null);
      }
      return;
    }

    // 2. If it's a Data URL or Image from Draw or Upload tab
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 360;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const aspect = (img.width || 1) / (img.height || 1);
        let drawW = 320;
        let drawH = 320 / aspect;
        if (drawH > 90) {
          drawH = 90;
          drawW = 90 * aspect;
        }
        const x = (canvas.width - drawW) / 2;
        const y = (canvas.height - drawH) / 2;
        ctx.drawImage(img, x, y, drawW, drawH);

        const jpegUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve(dataUrlToJpegBytes(jpegUrl));
      };
      img.onerror = () => resolve(null);
      img.src = signatureImage;
    } catch (e) {
      resolve(null);
    }
  });
}

function dataUrlToJpegBytes(dataUrl) {
  try {
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { bytes, width: 360, height: 100, length: len };
  } catch (e) {
    return null;
  }
}

/**
 * Generate and download a certified BexSign PDF document
 * with authentic signature stamp, vector handwritten stroke or actual drawn/uploaded signature image.
 */
export async function generateAndDownloadPdf({
  documentName = 'Document 1.pdf',
  documentText = 'check the document for signature',
  docId = 1,
  signerName = 'Vimal Chavda',
  signerEmail = 'vimal@bexcodeservices.com',
  employeeId = 'EMP001',
  date = new Date().toLocaleString(),
  ipAddress = '223.181.69.208',
  status = 'Completed',
  signatureImage = '',
  signatureType = 'type',
  password = '',
  fields = [],
  placedFields = []
}) {
  const cleanFileName = documentName.endsWith('.pdf') ? documentName : `${documentName}.pdf`;
  const fullSignatureId = typeof docId === 'string' && (docId.startsWith('BEX-SIGN') || docId.startsWith('BEX-DOC'))
    ? (docId.startsWith('BEX-SIGN') ? docId : docId.replace('BEX-DOC', 'BEX-SIGN-VC-EMP001'))
    : generateEmployeeSignatureId(employeeId, signerName);
  const fullBexsignId = typeof docId === 'string' && docId.startsWith('BEX-') ? docId : generateBexsignId(docId);

  // Split Doc ID cleanly into two visible lines without truncation
  let docIdLine1 = 'BEX-SIGN-VC-EMP001-2026';
  let docIdLine2 = typeof docId === 'string' ? docId.replace('BEX-DOC-', '').substring(0, 24) : '361682B4-ERZWA2U19FQKOU0L';
  if (fullSignatureId.length > 25) {
    const splitIndex = fullSignatureId.lastIndexOf('-', 28);
    if (splitIndex !== -1 && splitIndex > 15) {
      docIdLine1 = fullSignatureId.substring(0, splitIndex);
      docIdLine2 = fullSignatureId.substring(splitIndex + 1);
    }
  }

  const cleanDocTitle = (documentName || 'Document 1.pdf').replace(/\.pdf$/i, '');
  const cleanDocBody = (documentText && documentText.trim() && documentText !== 'check the document for signature')
    ? documentText
    : getDefaultDocContent(cleanDocTitle, documentText);

  // Wrap document text cleanly to prevent overflow and render multi-paragraph clauses
  const rawParagraphs = cleanDocBody.split('\n');
  const wrappedBodyLines = [];
  for (const p of rawParagraphs) {
    const trimmed = p.trim();
    if (!trimmed) {
      if (wrappedBodyLines.length > 0 && wrappedBodyLines[wrappedBodyLines.length - 1] !== '') {
        wrappedBodyLines.push('');
      }
      continue;
    }
    const words = trimmed.split(/\s+/);
    let curr = '';
    for (const w of words) {
      if ((curr + ' ' + w).trim().length <= 88) {
        curr = (curr + ' ' + w).trim();
      } else {
        if (curr) wrappedBodyLines.push(curr);
        curr = w;
      }
    }
    if (curr) wrappedBodyLines.push(curr);
  }

  // Cap at 14 lines max to preserve signature block and fields placement
  const displayLines = wrappedBodyLines.slice(0, 14);

  const pdfBodyTextOps = displayLines.length > 0
    ? displayLines.map((line, idx) => {
        const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
        return idx === 0 ? `50 678 Td (${escaped}) Tj` : `0 -12.5 Td (${escaped}) Tj`;
      }).join('\n')
    : '50 678 Td (check the document for signature) Tj';

  // Dynamic vertical coordinate calculations
  const allFields = (fields && fields.length > 0 ? fields : placedFields) || [];
  const otherFields = allFields.filter(f => f.type !== 'Signature' && f.type !== 'Initial' && f.type !== 'Stamp');

  const textEndOffset = displayLines.length * 12.5;
  const dividerY = Math.min(650, Math.max(420, 678 - textEndOffset - 12));
  const sigLabelY = dividerY - 18;
  const sigBracketTop = dividerY - 32;
  const sigBracketBottom = dividerY - 105;
  const sigSignedByY = dividerY - 38;
  const sigImageY = dividerY - 95;
  const sigIdsY = dividerY - 118;

  // Custom placed fields (e.g. Company, Email, Full name, Sign date, Job title, Text)
  let customFieldsOperators = '';
  let nextSectionY = sigIdsY - 20;

  if (otherFields.length > 0) {
    for (let i = 0; i < otherFields.length; i++) {
      const f = otherFields[i];
      const colIndex = i % 2;
      const colX = colIndex === 0 ? 50 : 315;
      const rowY = nextSectionY - Math.floor(i / 2) * 48;

      const fLabel = (f.label || f.type || 'Field').toUpperCase().replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      let fVal = '';
      if (f.type === 'Company') {
        fVal = f.value || 'Bexcode Services';
      } else if (f.type === 'Email') {
        fVal = f.value || signerEmail;
      } else if (f.type === 'Full name' || f.type === 'Name') {
        fVal = f.value || signerName;
      } else if (f.type === 'Sign date' || f.type === 'Date') {
        fVal = f.value || date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } else if (f.type === 'Job title') {
        fVal = f.value || 'Designated Signer';
      } else if (f.type === 'Checkbox') {
        fVal = (f.value === true || f.value === 'true') ? '[X] Confirmed' : '[ ] Not checked';
      } else {
        fVal = f.value || f.label || '';
      }
      const escapedVal = String(fVal).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

      customFieldsOperators += `
% Placed Field: ${f.type}
BT
/F2 8 Tf
0.45 0.5 0.55 rg
${colX} ${rowY} Td
(${fLabel}) Tj
ET

0.82 0.85 0.88 RG
0.75 w
${colX} ${rowY - 24} 245 20 re S

BT
/F2 9.5 Tf
0.15 0.2 0.25 rg
${colX + 8} ${rowY - 16} Td
(${escapedVal}) Tj
ET
`;
    }
    const rowCount = Math.ceil(otherFields.length / 2);
    nextSectionY = nextSectionY - rowCount * 48 - 8;
  }

  const stampLabelY = nextSectionY;
  const stampBoxY = nextSectionY - 45;
  const stampContentY = nextSectionY - 30;
  const emailY = stampBoxY - 20;

  // Convert user signature into image bytes if provided
  const imgObj = await prepareSignatureImageObject(signatureImage, signerName);

  let imageOperators = '';
  if (imgObj) {
    imageOperators = `
q
160 0 0 50 64 ${sigImageY} cm
/Im1 Do
Q
`;
  } else {
    imageOperators = `
% Fallback Vector Signature Strokes
0.08 0.12 0.2 RG
1.8 w
65 ${sigImageY + 10} m 76 ${sigImageY + 42} 86 ${sigImageY - 5} 94 ${sigImageY + 24} c 100 ${sigImageY + 45} 92 ${sigImageY + 56} 82 ${sigImageY + 44} c 74 ${sigImageY + 30} 90 ${sigImageY - 10} 105 ${sigImageY + 46} c 116 ${sigImageY} 129 ${sigImageY + 36} 142 ${sigImageY + 20} c 154 ${sigImageY + 5} 167 ${sigImageY + 31} 180 ${sigImageY + 15} c 193 ${sigImageY + 2} 206 ${sigImageY + 28} 221 ${sigImageY + 13} c 236 ${sigImageY - 2} 252 ${sigImageY + 25} 268 ${sigImageY + 16} c S
74 ${sigImageY + 2} m 122 ${sigImageY + 5} 185 ${sigImageY + 2} 258 ${sigImageY + 6} c S
`;
  }

  // EXACT SHEET STREAM MATCHING ZOHO SIGN REFERENCE & ATTACHMENT 1
  const streamBody = `q
% 1. Header Metadata Section
BT
/F1 9 Tf
0.4 0.45 0.5 rg
50 750 Td
(BexSign Document ID: ) Tj
/F2 9 Tf
0.15 0.2 0.25 rg
(${fullBexsignId}) Tj
ET

% Header Divider Line
0.88 0.9 0.92 RG
0.75 w
50 738 m 562 738 l S

% 2. Document Title
BT
/F2 18 Tf
0.08 0.1 0.15 rg
50 705 Td
(${cleanDocTitle.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')}) Tj
ET

% 3. Document Body Text
BT
/F1 9 Tf
0.3 0.35 0.4 rg
${pdfBodyTextOps}
ET

% Divider before fields
0.88 0.9 0.92 RG
0.75 w
50 ${dividerY} m 562 ${dividerY} l S

% 4. SIGNATURE FIELD LABEL
BT
/F2 8.5 Tf
0.45 0.5 0.55 rg
50 ${sigLabelY} Td
(SIGNATURE) Tj
ET

% Blue Bracket for Signature
0.11 0.29 0.51 RG
1.8 w
1 J
1 j
58 ${sigBracketTop} m 50 ${sigBracketTop} 48 ${sigBracketTop - 2} 48 ${sigBracketTop - 10} c 48 ${sigBracketBottom + 10} l 48 ${sigBracketBottom + 2} 50 ${sigBracketBottom} 58 ${sigBracketBottom} c S

% Baseline for Signature
0.75 0.8 0.85 RG
0.75 w
48 ${sigBracketBottom} m 280 ${sigBracketBottom} l S

% Stamp Text: "- Signed by: [Signer Name]"
BT
/F2 9.5 Tf
0.11 0.29 0.51 rg
62 ${sigSignedByY} Td
(- Signed by: ) Tj
/F1 9.5 Tf
0.15 0.2 0.25 rg
(${signerName}) Tj
ET

${imageOperators}

% Signature IDs below baseline
BT
/F1 7.5 Tf
0.35 0.4 0.45 rg
58 ${sigIdsY} Td
(${docIdLine1}) Tj
0 -10 Td
(${docIdLine2}) Tj
ET

${customFieldsOperators}

% 5. STAMP FIELD LABEL
BT
/F2 8.5 Tf
0.45 0.5 0.55 rg
50 ${stampLabelY} Td
(STAMP) Tj
ET

% Dashed Box for Stamp
[3 2] 0 d
0.75 0.8 0.85 RG
1 w
50 ${stampBoxY} 220 45 re S
[] 0 d

% Red Box for "Bex"
0.9 0.1 0.1 rg
58 ${stampBoxY + 10} 26 24 re f

% White "Bex" Text inside red box
BT
/F2 11 Tf
1 1 1 rg
62 ${stampContentY} Td
(Bex) Tj
ET

% "Corporate Official Stamp" & "Verified"
BT
/F2 9.5 Tf
0.15 0.2 0.25 rg
92 ${stampContentY} Td
(Corporate Official Stamp) Tj
/F1 8 Tf
0.0 0.5 0.35 rg
130 0 Td
(Verified) Tj
ET

% 6. Recipient Email
BT
/F1 9 Tf
0.35 0.4 0.45 rg
50 ${emailY} Td
(${signerEmail}) Tj
ET
Q`;

  const streamLength = streamBody.length;

  let headerPart = `%PDF-1.4
%âãÏÓ
1 0 obj
<< /Title (${cleanFileName}) /Author (${signerName}) /Subject (BexSign Signed Electronic Document) /Creator (BexSign Electronic Document System) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 6 0 R /F2 7 0 R >> ${imgObj ? '/XObject << /Im1 8 0 R >>' : ''} >> >>
endobj
5 0 obj
<< /Length ${streamLength} >>
stream
${streamBody}
endstream
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
7 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
`;

  let blobParts = [];

  if (imgObj) {
    headerPart += `8 0 obj
<< /Type /XObject /Subtype /Image /Width ${imgObj.width} /Height ${imgObj.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgObj.length} >>
stream
`;
    const footerPart = `
endstream
endobj
xref
0 9
0000000000 65535 f 
0000000015 00000 n 
0000000160 00000 n 
0000000213 00000 n 
0000000276 00000 n 
0000000420 00000 n 
0000002200 00000 n 
0000002300 00000 n 
0000002400 00000 n 
trailer
<< /Size 9 /Root 2 0 R /Info 1 0 R >>
startxref
2800
%%EOF`;
    blobParts = [headerPart, imgObj.bytes, footerPart];
  } else {
    headerPart += `xref
0 8
0000000000 65535 f 
0000000015 00000 n 
0000000160 00000 n 
0000000213 00000 n 
0000000276 00000 n 
0000000405 00000 n 
0000002200 00000 n 
0000002300 00000 n 
trailer
<< /Size 8 /Root 2 0 R /Info 1 0 R >>
startxref
2500
%%EOF`;
    blobParts = [headerPart];
  }

  const blob = new Blob(blobParts, { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = cleanFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads the authentic 2-page Completion Certificate PDF
 * matching "completion certificate example.pdf" and "completion certificate-vnc 1.pdf".
 */
export async function generateCompletionCertificatePdf({
  documentName = "This is vnc's doc",
  docId = '361682B4-Z_-TPGJ5TMDVLEYSYWJSHXZUCDEMHV156UKVOTAC7-S',
  signerName = 'Vimal Chavda',
  signerEmail = 'vimal@bexcodeservices.com',
  ownerName = 'Manu Yadav',
  ownerEmail = 'manu.yadav@oladigital.health',
  organization = 'Dcode Health',
  orgAddress = '5908 Breckenridge Pkwy, Tampa, Florida, United States 33610',
  sentDate = 'Sep 1, 2026 14:51:34 EDT',
  completedDate = 'Sep 1, 2026 15:07:13 EDT',
  signedDate = 'Sep 1, 2026 15:07:14 EDT',
  ipAddress = '106.205.245.235',
  signatureImage = '',
  isPhysicallySigned = false
}) {
  const cleanFileName = `Completion_Certificate_${documentName.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  const generatedTimestamp = `Generated on ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} 06:12 EDT`;

  const imgObj = await prepareSignatureImageObject(signatureImage, signerName);

  // --- PAGE 1 STREAM (Summary & Recipients Audit Trail) ---
  const page1Stream = `q
% Top Left Logo / Title
BT
/F2 13 Tf
0.1 0.15 0.2 rg
40 748 Td
(BexSign) Tj
ET

% Top Right Generated Date
BT
/F1 9 Tf
0.45 0.5 0.55 rg
410 748 Td
(${generatedTimestamp}) Tj
ET

% Center Main Heading: "Certificate of Completion"
BT
/F2 20 Tf
0.01 0.52 0.78 rg
180 705 Td
(Certificate of Completion) Tj
ET

% Blue Thin Rule below title
0.01 0.52 0.78 RG
0.75 w
40 690 m 572 690 l S

% Section 1: Summary
BT
/F2 13 Tf
0.01 0.52 0.78 rg
40 668 Td
(Summary) Tj
ET

% Summary Details
BT
/F2 9 Tf
0.1 0.1 0.1 rg
40 648 Td
(Document ID: ) Tj
/F1 9 Tf
0.2 0.2 0.2 rg
(${docId}) Tj
0 -15 Td
/F2 9 Tf
(Document name: ) Tj
/F1 9 Tf
(${documentName}) Tj
0 -15 Td
/F2 9 Tf
(Sent by: ) Tj
/F1 9 Tf
(${ownerName} <${ownerEmail}>) Tj
0 -15 Td
/F2 9 Tf
(Organization: ) Tj
/F1 9 Tf
(${organization}) Tj
0 -13 Td
(${orgAddress}) Tj
ET

% Two-Column Metadata Table
BT
/F2 9 Tf
0.1 0.1 0.1 rg
40 560 Td
(Sent on: ) Tj
/F1 9 Tf
(${sentDate}) Tj
0 -15 Td
/F2 9 Tf
(Completed on: ) Tj
/F1 9 Tf
(${completedDate}) Tj
0 -15 Td
/F2 9 Tf
(Sign order: ) Tj
/F1 9 Tf
(Sequential) Tj
0 -15 Td
/F2 9 Tf
(No. of documents: ) Tj
/F1 9 Tf
(1) Tj
0 -15 Td
/F2 9 Tf
(Time zone: ) Tj
/F1 9 Tf
(America/Detroit (GMT-04:00)) Tj
ET

BT
/F2 9 Tf
0.1 0.1 0.1 rg
340 560 Td
(Signers: ) Tj
/F1 9 Tf
(1) Tj
0 -15 Td
/F2 9 Tf
(Receives a copy: ) Tj
/F1 9 Tf
(0) Tj
0 -15 Td
/F2 9 Tf
(Approvers: ) Tj
/F1 9 Tf
(0) Tj
0 -15 Td
/F2 9 Tf
(Witnesses: ) Tj
/F1 9 Tf
(0) Tj
0 -15 Td
/F2 9 Tf
(Recipient reviewers: ) Tj
/F1 9 Tf
(0) Tj
ET

% Section 2: Recipients
BT
/F2 13 Tf
0.01 0.52 0.78 rg
40 460 Td
(Recipients) Tj
ET

% Signer Left Column
BT
/F2 9 Tf
0.01 0.52 0.78 rg
40 435 Td
(Signer) Tj
0 -14 Td
/F2 10 Tf
0.1 0.1 0.1 rg
(${signerName}) Tj
0 -13 Td
/F1 9 Tf
0.3 0.3 0.3 rg
(${signerEmail}) Tj
ET

${isPhysicallySigned ? `
BT
/F1 9 Tf
0.3 0.3 0.3 rg
40 375 Td
(Emailed on: ${sentDate}) Tj
0 -14 Td
(Viewed on: -) Tj
0 -14 Td
(Terms agreed on: -) Tj
ET

BT
/F1 9 Tf
0.3 0.3 0.3 rg
340 375 Td
(Accessed from: ${ipAddress}) Tj
0 -14 Td
(Device used: Web) Tj
0 -14 Td
(Authentication type: None) Tj
ET

BT
/F1 9 Tf
0.2 0.2 0.2 rg
40 300 Td
(The signer has signed this document physically. It was uploaded on ${completedDate} by) Tj
0 -13 Td
(${ownerEmail}.) Tj
ET
` : `
% Signature Right Heading
BT
/F2 10 Tf
0.01 0.52 0.78 rg
340 435 Td
(Signature) Tj
ET

% Signature image / stroke
${imgObj ? `q 140 0 0 45 340 380 cm /Im1 Do Q` : `
BT
/F2 14 Tf
0.1 0.15 0.25 rg
340 400 Td
(${signerName}) Tj
ET
`}

BT
/F1 9 Tf
0.3 0.3 0.3 rg
40 345 Td
(Emailed on: ${sentDate}) Tj
0 -14 Td
(Viewed on: Sep 1, 2026 14:55:50 EDT) Tj
0 -14 Td
(Terms agreed on: Sep 1, 2026 15:00:43 EDT) Tj
0 -14 Td
(Signed on: ${signedDate}) Tj
ET

BT
/F1 9 Tf
0.3 0.3 0.3 rg
340 345 Td
(Accessed from: ${ipAddress}) Tj
0 -14 Td
(Device used: Web) Tj
0 -14 Td
(Authentication type: None) Tj
ET
`}
Q`;

  // --- PAGE 2 STREAM (Legal Disclosure) ---
  const page2Stream = `q
BT
/F2 14 Tf
0.01 0.52 0.78 rg
40 745 Td
(Legal Disclosure) Tj
ET

BT
/F2 11 Tf
0.01 0.52 0.78 rg
40 720 Td
(ELECTRONIC RECORD AND SIGNATURE DISCLOSURE) Tj
ET

BT
/F1 8.5 Tf
0.2 0.2 0.2 rg
40 698 Td
(Please read the following information carefully. By clicking the 'I agree' button, you agree that you have reviewed the) Tj
0 -12 Td
(following terms and conditions and consent to transact business electronically using Zoho Sign electronic signature) Tj
0 -12 Td
(system. If you do not agree to these terms, do not click the 'I agree' button.) Tj
ET

BT
/F2 10 Tf
0.01 0.52 0.78 rg
40 645 Td
(Electronic documents) Tj
ET

BT
/F1 8.5 Tf
0.2 0.2 0.2 rg
40 628 Td
(Please note that Dcode Health \("we", "us" or "Company"\) will send all documents electronically to you to the email) Tj
0 -12 Td
(address that you have given us during the course of the business relationship unless you tell us otherwise in accordance) Tj
0 -12 Td
(with the procedure explained herein. Once you sign a document electronically, we will send a PDF version of the) Tj
0 -12 Td
(document to you.) Tj
ET

BT
/F2 10 Tf
0.01 0.52 0.78 rg
40 565 Td
(Request for paper copies) Tj
ET

BT
/F1 8.5 Tf
0.2 0.2 0.2 rg
40 548 Td
(You have the right to request paper copies of these documents sent to you electronically from alpesh@dcodehealth.com.) Tj
0 -12 Td
(Alternatively, you also have the ability to download and print these documents sent to you electronically, and re-upload a) Tj
0 -12 Td
(scanned copy of the printed and physically signed documents. If you, however, wish to request paper copies of these) Tj
0 -12 Td
(documents sent to you electronically, you can write back to the sender.) Tj
ET

BT
/F2 10 Tf
0.01 0.52 0.78 rg
40 485 Td
(Withdrawing your consent) Tj
ET

BT
/F1 8.5 Tf
0.2 0.2 0.2 rg
40 468 Td
(At any point in time during the course of our business relationship, you have the right to withdraw your consent to) Tj
0 -12 Td
(receive documents in electronic format. If you wish to withdraw your consent, you can decline to sign a document that we) Tj
0 -12 Td
(have sent to you and send an email to alpesh@dcodehealth.com informing us that you wish to receive documents only in) Tj
0 -12 Td
(paper format. Upon request from you, we will stop sending documents using Zoho Sign electronic signature system.) Tj
ET

BT
/F2 10 Tf
0.01 0.52 0.78 rg
40 405 Td
(To advise Dcode Health of your new email address) Tj
ET

BT
/F1 8.5 Tf
0.2 0.2 0.2 rg
40 388 Td
(If you need to change the email address that you use to receive notices and disclosures from us, write to us at) Tj
0 -12 Td
(alpesh@dcodehealth.com) Tj
ET

BT
/F2 10 Tf
0.01 0.52 0.78 rg
40 345 Td
(System requirements) Tj
ET

BT
/F1 8.5 Tf
0.2 0.2 0.2 rg
40 328 Td
(Compatible with recent versions of popular browsers such as Chrome, Firefox, Safari, and Edge. Zoho Sign is also) Tj
0 -12 Td
(available on iOS and Android devices.) Tj
ET
Q`;

  // --- BUILD 2-PAGE PDF DOCUMENT OBJECTS ---
  const p1Len = page1Stream.length;
  const p2Len = page2Stream.length;

  let objects = [];
  objects.push(`%PDF-1.4
%âãÏÓ`);

  // 1: Info
  objects.push(`1 0 obj
<< /Title (${cleanFileName}) /Author (BexSign) /Subject (Completion Certificate) /Creator (BexSign Electronic Document Authority) >>
endobj`);

  // 2: Catalog
  objects.push(`2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj`);

  // 3: Pages (Count 2)
  objects.push(`3 0 obj
<< /Type /Pages /Kids [4 0 R 5 0 R] /Count 2 >>
endobj`);

  // 4: Page 1
  objects.push(`4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 6 0 R /Resources << /Font << /F1 8 0 R /F2 9 0 R >> ${imgObj ? '/XObject << /Im1 10 0 R >>' : ''} >> >>
endobj`);

  // 5: Page 2
  objects.push(`5 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 7 0 R /Resources << /Font << /F1 8 0 R /F2 9 0 R >> >> >>
endobj`);

  // 6: Page 1 Contents Stream
  objects.push(`6 0 obj
<< /Length ${p1Len} >>
stream
${page1Stream}
endstream
endobj`);

  // 7: Page 2 Contents Stream
  objects.push(`7 0 obj
<< /Length ${p2Len} >>
stream
${page2Stream}
endstream
endobj`);

  // 8: Font F1 (Helvetica)
  objects.push(`8 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj`);

  // 9: Font F2 (Helvetica-Bold)
  objects.push(`9 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj`);

  // If signature image exists:
  let blobParts = [];
  if (imgObj) {
    const imgXObjectHeader = `10 0 obj
<< /Type /XObject /Subtype /Image /Width ${imgObj.width} /Height ${imgObj.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgObj.length} >>
stream
`;
    const imgXObjectFooter = `
endstream
endobj
`;
    const beforeImg = objects.join('\n\n') + '\n\n' + imgXObjectHeader;
    const afterImg = imgXObjectFooter + `xref
0 11
0000000000 65535 f 
0000000015 00000 n 
0000000160 00000 n 
0000000213 00000 n 
0000000280 00000 n 
0000000440 00000 n 
0000000580 00000 n 
0000002200 00000 n 
0000003400 00000 n 
0000003480 00000 n 
0000003560 00000 n 
trailer
<< /Size 11 /Root 2 0 R /Info 1 0 R >>
startxref
4200
%%EOF`;
    blobParts = [beforeImg, imgObj.bytes, afterImg];
  } else {
    objects.push(`xref
0 10
0000000000 65535 f 
0000000015 00000 n 
0000000160 00000 n 
0000000213 00000 n 
0000000280 00000 n 
0000000440 00000 n 
0000000580 00000 n 
0000002200 00000 n 
0000003400 00000 n 
0000003480 00000 n 
trailer
<< /Size 10 /Root 2 0 R /Info 1 0 R >>
startxref
3600
%%EOF`);
    blobParts = [objects.join('\n\n')];
  }

  const blob = new Blob(blobParts, { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = cleanFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

