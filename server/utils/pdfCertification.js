/**
 * PDF certification signature (server/utils/pdfCertification.js)
 * Issued PDFs carry an invisible certification signature (PKCS#7 detached, SHA-256) with DocMDP "no changes
 * allowed". Adobe Acrobat/Reader then refuses edits and shows "Certified by BexSign"; any change made by another
 * application breaks the signature, so the edited copy shows as modified/invalid.
 *
 * Certificate: PDF_SIGNING_P12 (path to a .p12/.pfx, e.g. from an Adobe AATL certificate authority so Acrobat shows
 * the certificate as trusted) with PDF_SIGNING_P12_PASSWORD. Without one, a BexSign self-signed certificate is
 * created once in server/certs/ and reused.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let forge = null;
try {
  forge = require('node-forge');
} catch (e) {
  forge = null;
}

// Bytes reserved for the PKCS#7 signature (hex encoded in the file, so twice as many characters)
const SIGNATURE_BYTES = 12000;
const BYTE_RANGE_PLACEHOLDER = '/ByteRange [0 /********** /********** /**********]';
const CERT_DIR = path.join(__dirname, '..', 'certs');
const KEY_FILE = path.join(CERT_DIR, 'bexsign-certification.key.pem');
const CERT_FILE = path.join(CERT_DIR, 'bexsign-certification.crt.pem');

/** Written verbatim by pdfkit (not a PDF name or string), so it is never encrypted. */
class RawPdfValue {
  constructor(text) {
    this.text = text;
  }

  // pdfkit writes objects tagged "[object Object]" as dictionaries; this tag makes it use toString() instead
  get [Symbol.toStringTag]() {
    return 'RawPdfValue';
  }

  toString() {
    return this.text;
  }
}

function createSelfSignedCredentials() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  const key = forge.pki.privateKeyFromPem(privateKey);
  const cert = forge.pki.createCertificate();
  cert.publicKey = forge.pki.publicKeyFromPem(publicKey);
  cert.serialNumber = `01${crypto.randomBytes(15).toString('hex')}`;
  cert.validity.notBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 20);
  const subject = [
    { name: 'commonName', value: 'BexSign Document Certification' },
    { name: 'organizationName', value: 'BexSign' },
    { shortName: 'OU', value: 'Electronic Signatures' }
  ];
  cert.setSubject(subject);
  cert.setIssuer(subject);
  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, nonRepudiation: true },
    { name: 'subjectKeyIdentifier' }
  ]);
  cert.sign(key, forge.md.sha256.create());

  fs.mkdirSync(CERT_DIR, { recursive: true });
  fs.writeFileSync(KEY_FILE, privateKey, { mode: 0o600 });
  fs.writeFileSync(CERT_FILE, forge.pki.certificateToPem(cert));
  return { key, certificates: [cert] };
}

function loadP12(file, password) {
  const der = fs.readFileSync(file).toString('binary');
  const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(der), password || '');
  const keyBag = (p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || [])[0]
    || (p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] || [])[0];
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  if (!keyBag || certBags.length === 0) throw new Error('the .p12 file has no private key or certificate');
  // The signing certificate (matching the key) first, then its chain
  const publicKeyPem = forge.pki.publicKeyToPem(forge.pki.setRsaPublicKey(keyBag.key.n, keyBag.key.e));
  const certificates = certBags.map((bag) => bag.cert);
  certificates.sort((a, b) => Number(forge.pki.publicKeyToPem(b.publicKey) === publicKeyPem) - Number(forge.pki.publicKeyToPem(a.publicKey) === publicKeyPem));
  return { key: keyBag.key, certificates };
}

let credentials;
/** Signing key and certificate chain, or null when PDFs cannot be certified (node-forge missing, unreadable .p12). */
function getSigningCredentials() {
  if (credentials !== undefined) return credentials;
  credentials = null;
  if (!forge || process.env.PDF_CERTIFY === 'false') return credentials;
  try {
    if (process.env.PDF_SIGNING_P12) {
      credentials = loadP12(process.env.PDF_SIGNING_P12, process.env.PDF_SIGNING_P12_PASSWORD);
    } else if (fs.existsSync(KEY_FILE) && fs.existsSync(CERT_FILE)) {
      credentials = {
        key: forge.pki.privateKeyFromPem(fs.readFileSync(KEY_FILE, 'utf8')),
        certificates: [forge.pki.certificateFromPem(fs.readFileSync(CERT_FILE, 'utf8'))]
      };
    } else {
      credentials = createSelfSignedCredentials();
      console.log(`[PDF certification] Created the BexSign self-signed certification certificate in ${CERT_DIR}`);
    }
  } catch (err) {
    console.warn('[PDF certification] Signing certificate unavailable, PDFs are issued without certification:', err.message);
    credentials = null;
  }
  return credentials;
}

/**
 * Adds the certification signature placeholder to a pdfkit document (call before doc.end(), after the first page
 * exists). Returns false when no signing certificate is available.
 */
function addCertificationPlaceholder(doc, { reason = 'Certified by BexSign: no changes allowed', location = 'BexSign', contactInfo = '' } = {}) {
  const creds = getSigningCredentials();
  if (!creds) return false;
  const signerName = creds.certificates[0].subject.getField('CN')?.value || 'BexSign';
  const signature = doc.ref({
    Type: 'Sig',
    Filter: 'Adobe.PPKLite',
    SubFilter: 'adbe.pkcs7.detached',
    ByteRange: new RawPdfValue(BYTE_RANGE_PLACEHOLDER.slice('/ByteRange '.length)),
    Contents: new RawPdfValue(`<${'0'.repeat(SIGNATURE_BYTES * 2)}>`),
    Reference: [{
      Type: 'SigRef',
      TransformMethod: 'DocMDP',
      TransformParams: { Type: 'TransformParams', P: 1, V: '1.2' }
    }],
    Name: new String(signerName),
    Reason: new String(reason),
    Location: new String(location),
    ContactInfo: new String(contactInfo),
    M: new Date()
  });
  const widget = doc.ref({
    Type: 'Annot',
    Subtype: 'Widget',
    FT: 'Sig',
    Rect: [0, 0, 0, 0],
    F: 132, // print + locked; the empty Rect keeps it invisible
    T: new String('BexSign Certification'),
    V: signature,
    P: doc.page.dictionary
  });
  doc.page.annotations.push(widget);
  // pdfkit writes the AcroForm itself when the document ends (it expects its form state to exist)
  doc._root.data.AcroForm = doc.ref({ Fields: [widget], SigFlags: 3, DR: { Font: {} } });
  if (!doc._acroform) doc._acroform = { fonts: {}, defaultFont: 'Helvetica' };
  doc._root.data.Perms = { DocMDP: signature };
  signature.end();
  widget.end();
  return true;
}

/** Fills the placeholder of a finished PDF with the PKCS#7 signature over every other byte of the file. */
function signPdfBuffer(input) {
  const creds = getSigningCredentials();
  const pdf = Buffer.from(input);
  const byteRangePos = pdf.indexOf(BYTE_RANGE_PLACEHOLDER);
  if (!creds || byteRangePos === -1) return pdf;
  const contentsTag = `/Contents <${'0'.repeat(32)}`;
  const contentsPos = pdf.indexOf(contentsTag, byteRangePos);
  if (contentsPos === -1) throw new Error('certification placeholder not found');

  const start = contentsPos + '/Contents '.length;
  const end = start + SIGNATURE_BYTES * 2 + 2;
  const byteRange = [0, start, end, pdf.length - end];
  const byteRangeText = `/ByteRange [${byteRange.join(' ')}]`.padEnd(BYTE_RANGE_PLACEHOLDER.length, ' ');
  if (byteRangeText.length > BYTE_RANGE_PLACEHOLDER.length) throw new Error('PDF too large for the byte range placeholder');
  pdf.write(byteRangeText, byteRangePos, 'latin1');

  const signedData = Buffer.concat([pdf.subarray(0, start), pdf.subarray(end)]);
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(signedData.toString('binary'));
  creds.certificates.forEach((cert) => p7.addCertificate(cert));
  p7.addSigner({
    key: creds.key,
    certificate: creds.certificates[0],
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() }
    ]
  });
  p7.sign({ detached: true });
  const signatureHex = Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), 'binary').toString('hex');
  if (signatureHex.length > SIGNATURE_BYTES * 2) throw new Error('signature larger than the reserved space');
  pdf.write(signatureHex.padEnd(SIGNATURE_BYTES * 2, '0'), start + 1, 'latin1');
  return pdf;
}

module.exports = { addCertificationPlaceholder, signPdfBuffer, getSigningCredentials };
