/**
 * Field auto-resize: grows a field's box to fit its content, but never below the width configured for it in the
 * document editor. Shared by DocumentEditor.jsx (the editor's own preview) and BexDocumentSheet.jsx (recipient
 * signing, Document View, Print and the downloaded PDF reference) so both measure text the same way and agree on
 * the same width.
 */

// Fields whose size is part of what they are (a signature/initial pad, a stamp image, a checkbox, a per-character
// split-text grid) always keep the exact size configured for them.
export const FIXED_SIZE_FIELD_TYPES = ['Signature', 'Initial', 'Stamp', 'Checkbox', 'Split text'];

export function isAutoResizeField(field) {
  return Boolean(field?.autoResize) && !FIXED_SIZE_FIELD_TYPES.includes(field?.type);
}

let measureCanvas = null;
function measureTextPx(text, { font = 'Roboto', fontSize = 11, bold = true, italic = false } = {}) {
  if (typeof document === 'undefined') return 0;
  if (!measureCanvas) measureCanvas = document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d');
  ctx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${fontSize || 11}px ${font || 'Roboto'}, sans-serif`;
  return ctx.measureText(String(text ?? '')).width;
}

/**
 * The box width to render an auto-resize field at: never smaller than the field's configured `width`, grown just
 * enough to fit its current text plus `paddingPx` for the row's own icons/border/padding so the text never clips.
 * Non-auto-resize fields (or fixed-size types) get their configured width back unchanged.
 */
export function autoResizeWidth(field, { paddingPx = 60, minWidth = 150 } = {}) {
  const configured = Number(field?.width) || minWidth;
  if (!isAutoResizeField(field)) return configured;
  const textPx = measureTextPx(field.value ?? field.label ?? '', {
    font: field.font,
    fontSize: field.fontSize,
    bold: true,
    italic: field.isItalic
  });
  return Math.max(configured, Math.ceil(textPx) + paddingPx);
}
