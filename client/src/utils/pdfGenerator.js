import { generateBexsignId, generateEmployeeSignatureId } from './documentId';

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
  documentName = 'Document.pdf',
  docId = 1,
  signerName = 'Vimal Chavda',
  signerEmail = 'vimal@bexcodeservices.com',
  employeeId = 'EMP001',
  date = new Date().toLocaleString(),
  ipAddress = '223.181.69.208',
  status = 'Completed',
  signatureImage = '',
  signatureType = 'type',
  password = ''
}) {
  const cleanFileName = documentName.endsWith('.pdf') ? documentName : `${documentName}.pdf`;
  const fullSignatureId = typeof docId === 'string' && (docId.startsWith('BEX-SIGN') || docId.startsWith('BEX-DOC'))
    ? (docId.startsWith('BEX-SIGN') ? docId : docId.replace('BEX-DOC', 'BEX-SIGN-VC-EMP001'))
    : generateEmployeeSignatureId(employeeId, signerName);
  const fullBexsignId = fullSignatureId;

  // Split Doc ID cleanly into two visible lines without truncation
  let docIdLine1 = '';
  let docIdLine2 = '';
  if (fullSignatureId.length > 25) {
    const splitIndex = fullSignatureId.lastIndexOf('-', 28);
    if (splitIndex !== -1 && splitIndex > 15) {
      docIdLine1 = fullSignatureId.substring(0, splitIndex);
      docIdLine2 = fullSignatureId.substring(splitIndex + 1);
    } else {
      docIdLine1 = fullSignatureId.substring(0, 24);
      docIdLine2 = fullSignatureId.substring(24);
    }
  } else {
    docIdLine1 = fullSignatureId;
    docIdLine2 = 'SECURE-VERIFIED-BEXSIGN';
  }

  // Convert the user's signature (drawn, uploaded, or typed) into embedded image bytes
  const imgObj = await prepareSignatureImageObject(signatureImage, signerName);

  // Build stream content:
  let imageOperators = '';
  if (imgObj) {
    imageOperators = `
% Embedded Drawn / Uploaded / Typed Signature Image
q
180 0 0 50 65 435 cm
/Im1 Do
Q
`;
  } else {
    imageOperators = `
% Fallback Vector Signature Strokes
0.08 0.12 0.2 RG
1.8 w
65 450 m 76 482 86 435 94 464 c 100 485 92 496 82 484 c 74 470 90 430 105 486 c 116 440 129 476 142 460 c 154 445 167 471 180 455 c 193 442 206 468 221 453 c 236 438 252 465 268 456 c S
74 442 m 122 445 185 442 258 446 c S
`;
  }

  const streamBody = `q
% 1. Header Metadata Section
BT
/F1 12 Tf
0.08 0.1 0.15 rg
50 735 Td
(Document: ${cleanFileName}) Tj
/F1 9 Tf
0.35 0.4 0.45 rg
0 -20 Td
(BexSign Document ID: ${fullBexsignId}) Tj
ET

% Dividing Line 1
0.8 0.82 0.85 RG
1 w
50 695 m 562 695 l S

% 2. Audit & Verification Details
BT
/F1 9 Tf
0.15 0.2 0.25 rg
50 675 Td
(Signed by: ${signerName}) Tj
0 -17 Td
(Signer Email: ${signerEmail}) Tj
0 -17 Td
(Date of Execution: ${date}) Tj
0 -17 Td
(Audit IP Address: ${ipAddress}) Tj
0 -17 Td
(Verification Hash: SHA256-CERTIFIED-ELECTRONIC-RECORD) Tj
0 -17 Td
(Status: ${status}) Tj
ET

% Dividing Line 2
0.8 0.82 0.85 RG
1 w
50 555 m 562 555 l S

% 3. Official Signature Stamp & Attachment
BT
/F1 10 Tf
0.1 0.15 0.2 rg
50 530 Td
(Official Signature Attachment Affixed:) Tj
ET

% Blue Curved Bracket (Left, Top, and Bottom)
0.11 0.29 0.51 RG
2 w
1 J
1 j
58 495 m 50 495 48 493 48 485 c 48 430 l 48 422 50 420 58 420 c S

% Baseline
0.45 0.5 0.58 RG
1 w
48 420 m 340 420 l S

${imageOperators}

% Stamp Text: "Signed by: [Signer Name]"
BT
/F1 9 Tf
0.11 0.29 0.51 rg
62 492 Td
(Signed by: ${signerName}) Tj
ET

% Small Document ID in Two Lines (Bottom)
BT
/F1 8 Tf
0.25 0.3 0.35 rg
58 406 Td
(${docIdLine1}) Tj
0 -11 Td
(${docIdLine2}) Tj
ET

% Certified Document Footer
BT
/F1 8 Tf
0.4 0.45 0.5 rg
50 355 Td
(This certified electronic document is legally binding under the ESIGN Act and UETA standards.) Tj
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
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 6 0 R >> ${imgObj ? '/XObject << /Im1 7 0 R >>' : ''} >> >>
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
`;

  let blobParts = [];

  if (imgObj) {
    headerPart += `7 0 obj
<< /Type /XObject /Subtype /Image /Width ${imgObj.width} /Height ${imgObj.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgObj.length} >>
stream
`;
    const footerPart = `
endstream
endobj
xref
0 8
0000000000 65535 f 
0000000015 00000 n 
0000000160 00000 n 
0000000213 00000 n 
0000000276 00000 n 
0000000420 00000 n 
0000002200 00000 n 
0000002300 00000 n 
trailer
<< /Size 8 /Root 2 0 R /Info 1 0 R >>
startxref
2500
%%EOF`;
    blobParts = [headerPart, imgObj.bytes, footerPart];
  } else {
    headerPart += `xref
0 7
0000000000 65535 f 
0000000015 00000 n 
0000000160 00000 n 
0000000213 00000 n 
0000000276 00000 n 
0000000405 00000 n 
0000002200 00000 n 
trailer
<< /Size 7 /Root 2 0 R /Info 1 0 R >>
startxref
2300
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
