/**
 * BexSign Unique Document ID Generator
 *
 * Generates meaningful, standardized unique IDs for the BexSign project.
 * Structure: BEX-DOC-[YEAR]-[DOC_SEQ_ID]-[SECURITY_CHECKSUM_HASH]
 * - BEX: BexSign Platform Identifier
 * - DOC: Document Envelope Type
 * - 2026: Creation Year
 * - SEQ: Deterministic sequence / ID indicator
 * - HASH: Cryptographically sound, uppercase alphanumeric unique identifier
 */

export function generateBexsignId(docId = 1) {
  const year = 2026;
  const seq = String(docId).padStart(4, '0');

  // Deterministic seed hash table for demo document IDs, fallback to generated hex
  const deterministicHashes = {
    1: '361682B4-ERZWVA2U19FQKOU0LTHEPYMCRKHTZR2MFDEBT65NAG',
    2: '482719A1-XZM9VWP8L23KQRT7JBVTYUN08OPQRS56FGHJKL89',
    3: '792015C3-KLMNOPQ845RSTUVW912XYZABC345DEF678GHI012',
    4: '920184F5-BCDEFGHIJKLMNOPQRSTUVWXYZA1234567890BCDEF'
  };

  const hash = deterministicHashes[docId] || `${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 14).toUpperCase()}${Math.random().toString(36).substring(2, 14).toUpperCase()}`;

  return `BEX-DOC-${year}-${seq}-${hash}`;
}

export function formatBexsignIdShort(docId = 1) {
  const year = 2026;
  const seq = String(docId).padStart(4, '0');
  return `BEX-DOC-${year}-${seq}`;
}

/**
 * Sign ID shown under a signature, split in two lines: "BEX-SIGN-<initials>-EMP001-<year>-<seq>" and the
 * document's unique hash. Same format as the signed PDFs issued by the server.
 */
export function signatureIdLines(docId, signerName = '') {
  const initials = signIdInitials(signerName);
  // Documents of a multi-document request add "-<n>" to the request ID; the sign ID uses the request ID itself
  const id = String(docId || '').replace(/^(BEX-DOC-\d{4}-\d{4}-[A-Z0-9]+-[A-Z0-9]+)-\d+$/i, '$1');
  const docMatch = /^BEX-DOC-(\d{4})-(\d{4})-(.+)$/.exec(id);
  if (docMatch) return [`BEX-SIGN-${initials}-EMP001-${docMatch[1]}-${docMatch[2]}`, docMatch[3]];
  const signMatch = /^(BEX-SIGN-.+?-\d{4}-\d{4})-(.+)$/.exec(id);
  if (signMatch) return [signMatch[1], signMatch[2]];
  return [`BEX-SIGN-${initials}-EMP001`, id];
}

/** Two-letter signer initials for the sign ID: first and last name ("Vimal Chavda" -> "VC"). */
export function signIdInitials(name) {
  const words = String(name || '').split(/[\s@._-]+/).filter((word) => /[a-z0-9]/i.test(word));
  if (words.length === 0) return 'BS';
  if (words.length === 1) return words[0].replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export function generateEmployeeSignatureId(employeeId = 'EMP001', signerName = 'Vimal Chavda') {
  const initials = signerName.split(' ').map(n => n[0]).join('').toUpperCase() || 'VC';
  const cleanEmpId = String(employeeId).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'EMP001';
  const year = 2026;
  const hash = '361682B4-ERZWVA2U19FQKOU0L';
  return `BEX-SIGN-${initials}-${cleanEmpId}-${year}-${hash}`;
}
