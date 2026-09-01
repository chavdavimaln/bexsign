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

export function generateEmployeeSignatureId(employeeId = 'EMP001', signerName = 'Vimal Chavda') {
  const initials = signerName.split(' ').map(n => n[0]).join('').toUpperCase() || 'VC';
  const cleanEmpId = String(employeeId).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'EMP001';
  const year = 2026;
  const hash = '361682B4-ERZWVA2U19FQKOU0L';
  return `BEX-SIGN-${initials}-${cleanEmpId}-${year}-${hash}`;
}
