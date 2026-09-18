import { generateBexsignId, signatureIdLines } from './documentId';
import { getDefaultDocContent } from './documentDefaults';
import {
  isSignatureField,
  getFieldSignatureImage,
  getStampImage,
  isFieldChecked,
  isFieldForSigner,
  getFieldDisplayValue
} from './documentFields';

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

/** Converts an uploaded image (e.g. a company stamp) into JPEG bytes, keeping its aspect ratio. */
function prepareImageObject(src, maxSize = 320) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width || 1, img.height || 1));
        const width = Math.max(1, Math.round((img.width || 1) * scale));
        const height = Math.max(1, Math.round((img.height || 1) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const jpeg = dataUrlToJpegBytes(canvas.toDataURL('image/jpeg', 0.92));
        resolve(jpeg ? { ...jpeg, width, height } : null);
      };
      img.onerror = () => resolve(null);
      img.src = src;
    } catch (e) {
      resolve(null);
    }
  });
}

const PDF_CHAR_MAP = {
  '‘': "'", '’': "'", '“': '"', '”': '"',
  '–': '-', '—': '-', '•': '*', '…': '...'
};

/** Escapes text for a PDF string literal (WinAnsi fonts: Latin-1 characters become octal escapes). */
function pdfText(value) {
  let out = '';
  for (const ch of String(value ?? '')) {
    const mapped = PDF_CHAR_MAP[ch];
    if (mapped) {
      out += mapped;
      continue;
    }
    const code = ch.codePointAt(0);
    if (ch === '\\' || ch === '(' || ch === ')') out += `\\${ch}`;
    else if (code >= 0x20 && code <= 0x7e) out += ch;
    else if (code >= 0xa0 && code <= 0xff) out += `\\${code.toString(8).padStart(3, '0')}`;
    else out += '?';
  }
  return out;
}

function fitText(value, maxChars) {
  const text = String(value ?? '');
  return text.length > maxChars ? `${text.slice(0, maxChars - 3)}...` : text;
}

/** Serializes numbered PDF objects (index 0 = object 1) with a byte-exact cross-reference table. */
function buildPdfParts(objects) {
  const encoder = new TextEncoder();
  const parts = [];
  let offset = 0;
  const push = (part) => {
    const bytes = typeof part === 'string' ? encoder.encode(part) : part;
    parts.push(bytes);
    offset += bytes.length;
  };

  push('%PDF-1.4\n');
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  const offsets = [];
  objects.forEach((objectParts, idx) => {
    offsets.push(offset);
    push(`${idx + 1} 0 obj\n`);
    objectParts.forEach(push);
    push('\nendobj\n');
  });
  const xrefOffset = offset;
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`);
  push(`trailer\n<< /Size ${objects.length + 1} /Root 2 0 R /Info 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  return parts;
}

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const PAGE_BOTTOM = 56;
const COLUMN_X = [50, 315];
const COLUMN_WIDTH = 245;

/**
 * Build a BexSign document PDF: header, document text and the placed fields.
 * Fields are rendered without labels (Zoho Sign style); a stamp is drawn only for a placed Stamp field
 * with an image; every Signature/Initial field shows its own signer's signature.
 * `defaultSignature` draws one signature block for documents that have no placed fields at all.
 * Returns { blob, cleanFileName } (use generateAndDownloadPdf to download it).
 */
export async function generatePdfBlob({
  documentName = 'Document 1.pdf',
  documentText = 'check the document for signature',
  docId = 1,
  signerName = 'Vimal Chavda',
  signerEmail = 'vimal@bexcodeservices.com',
  employeeId = 'EMP001',
  date = new Date().toLocaleString(),
  signatureImage = '',
  fields = [],
  placedFields = [],
  defaultSignature = true
}) {
  const cleanFileName = documentName.endsWith('.pdf') ? documentName : `${documentName}.pdf`;
  const fullBexsignId = typeof docId === 'string' && docId.startsWith('BEX-') ? docId : generateBexsignId(docId);

  const cleanDocTitle = (documentName || 'Document 1.pdf').replace(/\.pdf$/i, '');
  const cleanDocBody = (documentText && documentText.trim() && documentText !== 'check the document for signature')
    ? documentText
    : getDefaultDocContent(cleanDocTitle, documentText);

  // Wrap document text cleanly to prevent overflow and render multi-paragraph clauses
  const rawText = cleanDocBody.includes('<')
    ? cleanDocBody
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
    : cleanDocBody;
  const wrappedBodyLines = [];
  for (const p of rawText.split('\n')) {
    const trimmed = p.trim();
    if (!trimmed) {
      if (wrappedBodyLines.length > 0 && wrappedBodyLines[wrappedBodyLines.length - 1] !== '') {
        wrappedBodyLines.push('');
      }
      continue;
    }
    let curr = '';
    for (const w of trimmed.split(/\s+/)) {
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
    ? displayLines.map((line, idx) => (idx === 0 ? `50 678 Td (${pdfText(line)}) Tj` : `0 -12.5 Td (${pdfText(line)}) Tj`)).join('\n')
    : '50 678 Td (check the document for signature) Tj';

  const allFields = (fields && fields.length > 0 ? fields : placedFields) || [];
  const dividerY = Math.min(650, Math.max(420, 678 - displayLines.length * 12.5 - 12));

  // Embedded JPEG images, referenced as /Im1, /Im2, ...
  const images = [];
  const addImage = (imgObj) => {
    if (!imgObj) return null;
    images.push(imgObj);
    return `Im${images.length}`;
  };

  const pages = [[`% 1. Header Metadata Section
BT
/F1 9 Tf
0.4 0.45 0.5 rg
50 750 Td
(BexSign Document ID: ) Tj
/F2 9 Tf
0.15 0.2 0.25 rg
(${pdfText(fullBexsignId)}) Tj
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
(${pdfText(cleanDocTitle)}) Tj
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
50 ${dividerY} m 562 ${dividerY} l S`]];
  let ops = pages[0];
  let cursorY = dividerY - 24;

  const ensureSpace = (height) => {
    if (cursorY - height >= PAGE_BOTTOM) return;
    ops = [`% Continuation page header
BT
/F1 8 Tf
0.4 0.45 0.5 rg
50 750 Td
(BexSign Document ID: ${pdfText(fullBexsignId)}) Tj
ET
0.88 0.9 0.92 RG
0.75 w
50 738 m 562 738 l S`];
    pages.push(ops);
    cursorY = 714;
  };

  // Signature stamp (bracket, "Signed by", signature, signature IDs)
  const signatureBlockOps = (top, { name, imageName }) => {
    const bracketTop = top - 6;
    const bracketBottom = top - 79;
    const imageY = top - 69;
    let out = `
% Signature Field
0.11 0.29 0.51 RG
1.8 w
1 J
1 j
58 ${bracketTop} m 50 ${bracketTop} 48 ${bracketTop - 2} 48 ${bracketTop - 10} c 48 ${bracketBottom + 10} l 48 ${bracketBottom + 2} 50 ${bracketBottom} 58 ${bracketBottom} c S
0.75 0.8 0.85 RG
0.75 w
48 ${bracketBottom} m 280 ${bracketBottom} l S`;

    out += `
BT
/F2 9.5 Tf
0.11 0.29 0.51 rg
62 ${top - 12} Td
(- Signed by: ) Tj
/F1 9.5 Tf
0.15 0.2 0.25 rg
(${pdfText(name)}) Tj
ET`;
    out += imageName
      ? `
q
160 0 0 50 64 ${imageY} cm
/${imageName} Do
Q`
      : `
% Fallback Vector Signature Strokes
0.08 0.12 0.2 RG
1.8 w
65 ${imageY + 10} m 76 ${imageY + 42} 86 ${imageY - 5} 94 ${imageY + 24} c 100 ${imageY + 45} 92 ${imageY + 56} 82 ${imageY + 44} c 74 ${imageY + 30} 90 ${imageY - 10} 105 ${imageY + 46} c 116 ${imageY} 129 ${imageY + 36} 142 ${imageY + 20} c 154 ${imageY + 5} 167 ${imageY + 31} 180 ${imageY + 15} c 193 ${imageY + 2} 206 ${imageY + 28} 221 ${imageY + 13} c 236 ${imageY - 2} 252 ${imageY + 25} 268 ${imageY + 16} c S
74 ${imageY + 2} m 122 ${imageY + 5} 185 ${imageY + 2} 258 ${imageY + 6} c S`;
    out += `
BT
/F1 7.5 Tf
0.35 0.4 0.45 rg
58 ${top - 92} Td
(${pdfText(signatureIdLines(fullBexsignId, name)[0])}) Tj
0 -10 Td
(${pdfText(signatureIdLines(fullBexsignId, name)[1])}) Tj
ET`;
    return out;
  };

  if (allFields.length === 0) {
    if (defaultSignature) {
      ensureSpace(140);
      const imageName = addImage(await prepareSignatureImageObject(signatureImage, signerName));
      ops.push(signatureBlockOps(cursorY, { name: signerName, imageName }));
      cursorY -= 120;
      ops.push(`
% Signer Email
BT
/F1 9 Tf
0.35 0.4 0.45 rg
50 ${cursorY} Td
(${pdfText(signerEmail)}) Tj
ET`);
      cursorY -= 20;
    }
  } else {
    // Signatures take a full row; stamps, checkboxes and text fields flow in two columns
    let column = 0;
    let rowTop = cursorY;
    let rowHeight = 0;
    const closeRow = () => {
      if (column === 0) return;
      cursorY = rowTop - rowHeight - 14;
      column = 0;
      rowHeight = 0;
    };

    for (const field of allFields) {
      // Another recipient's masked field never appears in this copy
      if (field.isAssignedToOther) continue;

      if (isSignatureField(field)) {
        const ownSignature = getFieldSignatureImage(field);
        // One signature box per signer: another recipient's unsigned signature field is left out (no empty box)
        if (!ownSignature && !isFieldForSigner(field, signerEmail)) continue;
        closeRow();
        ensureSpace(112);
        const fieldSigner = field.signerName || signerName;
        const imageName = addImage(await prepareSignatureImageObject(ownSignature || signatureImage, fieldSigner));
        ops.push(signatureBlockOps(cursorY, { name: fieldSigner, imageName }));
        cursorY -= 122;
        continue;
      }

      let block = null;
      if (field.type === 'Stamp') {
        const stampSrc = getStampImage(field);
        const imgObj = stampSrc ? await prepareImageObject(stampSrc) : null;
        if (!imgObj) continue; // no stamp was placed with an image: nothing is drawn
        const scale = Math.min(120 / imgObj.width, 90 / imgObj.height);
        const w = Number((imgObj.width * scale).toFixed(2));
        const h = Number((imgObj.height * scale).toFixed(2));
        const imageName = addImage(imgObj);
        block = {
          height: h,
          ops: (x, top) => `
% Stamp Field
q
${w} 0 0 ${h} ${x} ${Number((top - h).toFixed(2))} cm
/${imageName} Do
Q`
        };
      } else if (field.type === 'Checkbox') {
        const checked = isFieldChecked(field);
        block = {
          height: 12,
          ops: (x, top) => `
% Checkbox Field
0.45 0.5 0.55 RG
0.9 w
${x} ${top - 12} 12 12 re S${checked ? `
0 0.45 0.33 RG
1.6 w
1 J
1 j
${x + 2.5} ${top - 6} m ${x + 5} ${top - 9.5} l ${x + 9.5} ${top - 2.5} l S` : ''}`
        };
      } else {
        const text = fitText(getFieldDisplayValue(field, { signerName, signerEmail, date }), 44);
        block = {
          height: 20,
          ops: (x, top) => `
% Placed Field: ${pdfText(field.type)} (value only, no border)
BT
/F2 9.5 Tf
0.15 0.2 0.25 rg
${x + 4} ${top - 14} Td
(${pdfText(text)}) Tj
ET`
        };
      }

      if (column === 0) {
        ensureSpace(block.height);
        rowTop = cursorY;
      }
      ops.push(block.ops(COLUMN_X[column], rowTop));
      rowHeight = Math.max(rowHeight, block.height);
      column += 1;
      if (column === 2) closeRow();
    }
    closeRow();
  }

  const encoder = new TextEncoder();
  const pageObjectNumber = (i) => 6 + i * 2;
  const imageObjectNumber = (j) => 6 + pages.length * 2 + j;
  const xObjects = images.length > 0
    ? `/XObject << ${images.map((_, j) => `/Im${j + 1} ${imageObjectNumber(j)} 0 R`).join(' ')} >>`
    : '';

  const objects = [
    [`<< /Title (${pdfText(cleanFileName)}) /Author (${pdfText(signerName)}) /Subject (BexSign Signed Electronic Document) /Creator (BexSign Electronic Document System) >>`],
    ['<< /Type /Catalog /Pages 3 0 R >>'],
    [`<< /Type /Pages /Kids [${pages.map((_, i) => `${pageObjectNumber(i)} 0 R`).join(' ')}] /Count ${pages.length} >>`],
    ['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'],
    ['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>']
  ];
  pages.forEach((pageOps, i) => {
    objects.push([`<< /Type /Page /Parent 3 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${pageObjectNumber(i) + 1} 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R >> ${xObjects} >> >>`]);
    const content = encoder.encode(`q\n${pageOps.join('\n')}\nQ`);
    objects.push([`<< /Length ${content.length} >>\nstream\n`, content, '\nendstream']);
  });
  images.forEach((img) => {
    objects.push([
      `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`,
      img.bytes,
      '\nendstream'
    ]);
  });

  const blob = new Blob(buildPdfParts(objects), { type: 'application/pdf' });
  return { blob, cleanFileName };
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
  return { blob, cleanFileName };
}

/**
 * Generate PDF and return base64 string + clean filename for email attachment
 */
export async function generatePdfBase64(options) {
  const { blob, cleanFileName } = await generatePdfBlob(options);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const base64 = reader.result.split(',')[1];
        resolve({ base64, filename: cleanFileName });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Generate PDF and trigger browser file download
 */
export async function generateAndDownloadPdf(options) {
  const { blob, cleanFileName } = await generatePdfBlob(options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = cleanFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

