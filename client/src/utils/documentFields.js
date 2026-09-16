/**
 * Shared rules for rendering placed fields in generated documents (PDF download, print and sheet views).
 * Zoho Sign style: fields carry no labels, a stamp appears only when a Stamp field was placed,
 * and every Signature/Initial field shows its own signer's signature.
 */

export const SIGNATURE_FIELD_TYPES = ['Signature', 'Initial'];

// Company suggested to a signer when the sender left the Company field empty
export const DEFAULT_COMPANY_NAME = 'Bexcode Services';

const isPlaceholderValue = (field) => {
  const raw = field?.value;
  return raw === undefined || raw === null || String(raw).trim() === '' || raw === field.type || raw === field.label;
};

/**
 * Starting values of a signer's own fields: what the signing page shows in an untouched field is stored in the
 * field, so it passes the required-field check and is submitted. A Sign date is always the signing date.
 */
export function applySignerDefaults(fields, { signerName = '', signerEmail = '', signDate = '' } = {}) {
  return (fields || []).map((field) => {
    if (!field) return field;
    switch (field.type) {
      case 'Full name':
      case 'Name':
        return isPlaceholderValue(field) && signerName ? { ...field, value: signerName } : field;
      case 'Email':
        return isPlaceholderValue(field) && signerEmail ? { ...field, value: signerEmail } : field;
      case 'Company':
        return isPlaceholderValue(field) ? { ...field, value: DEFAULT_COMPANY_NAME } : field;
      case 'Sign date':
        return signDate ? { ...field, value: signDate } : field;
      default:
        return field;
    }
  });
}

export function isSignatureField(field) {
  return SIGNATURE_FIELD_TYPES.includes(field?.type);
}

/** Signature captured on a field; the editor's placeholder value ("Signature"/"Initial") is not a signature. */
export function getFieldSignatureImage(field) {
  if (!field) return '';
  if (field.signatureImage) return field.signatureImage;
  const value = field.value;
  return typeof value === 'string' && value && value !== field.type && value !== field.label ? value : '';
}

/** Image of a placed Stamp field ('' when no stamp image was uploaded). */
export function getStampImage(field) {
  const src = field?.type === 'Stamp' ? field.stampImage : '';
  return typeof src === 'string' && src.startsWith('data:image') ? src : '';
}

export function isFieldChecked(field) {
  return field?.value === true || field?.value === 'true' || field?.checked === true;
}

/** True when the field is assigned to the given signer (unassigned fields belong to whoever signs). */
export function isFieldForSigner(field, signerEmail) {
  const owner = String(field?.assigneeEmail || field?.signerEmail || '').trim().toLowerCase();
  return !owner || !signerEmail || owner === String(signerEmail).trim().toLowerCase();
}

/** Text written into a text-like field; placeholders equal to the field type count as empty. */
export function getFieldDisplayValue(field, { signerName = '', signerEmail = '', date = '' } = {}) {
  if (!field) return '';
  if (field.type === 'Split text' && Array.isArray(field.gridValue) && field.gridValue.some(Boolean)) {
    return field.gridValue.join('');
  }
  const raw = field.value;
  const isEmpty = raw === undefined || raw === null || String(raw).trim() === '' || raw === field.type;
  if (!isEmpty) return String(raw);

  switch (field.type) {
    case 'Company':
      return DEFAULT_COMPANY_NAME;
    case 'Email':
      return field.signerEmail || signerEmail;
    case 'Full name':
    case 'Name':
      return field.signerName || signerName;
    case 'Sign date':
    case 'Date':
      return date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    default:
      return '';
  }
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
