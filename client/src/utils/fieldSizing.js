/**
 * Field auto-resize: grows a field's box to fit its content, but never below the width configured for it in the
 * document editor. Shared by DocumentEditor.jsx (the editor's own preview) and BexDocumentSheet.jsx (recipient
 * signing, Document View, Print and the downloaded PDF reference) so both measure text the same way and agree on
 * the same width.
 */

// Fields whose size is part of what they are (a signature/initial pad, a stamp image, a checkbox, a per-character
// split-text grid) always keep the exact size configured for them.
export const FIXED_SIZE_FIELD_TYPES = ['Signature', 'Initial', 'Stamp', 'Checkbox', 'Split text', 'Radio', 'Dropdown'];

// Smallest box a field can be resized to: small enough to sit inside one line of the document text
export const FIELD_MIN_WIDTH = 24;
export const FIELD_MIN_HEIGHT = 14;

const SIGNATURE_TYPES = ['Signature', 'Initial'];

/** Size a new field starts with (the sender can resize it afterwards). */
export function defaultFieldSize(type, { stampShape } = {}) {
  if (type === 'Signature') return { width: 200, height: 70 };
  if (type === 'Initial') return { width: 110, height: 60 };
  if (type === 'Stamp') return stampShape === 'oval' ? { width: 80, height: 80 } : { width: 112, height: 80 };
  if (type === 'Checkbox') return { width: 22, height: 22 };
  if (type === 'Radio') return { width: 130, height: 46 };
  return { width: 160, height: 30 };
}

// Fields that can show a placeholder: the grey hint inside the empty field while signing
export const PLACEHOLDER_FIELD_TYPES = ['Text', 'Company', 'Full name', 'Email', 'Job title', 'Sign date', 'Dropdown', 'Signature', 'Initial'];

export const supportsPlaceholder = (field) => PLACEHOLDER_FIELD_TYPES.includes(field?.type);

/** The placeholder a field has when the sender did not write one. */
export function defaultPlaceholder(field) {
  if (field?.type === 'Sign date') return field.dateFormat || 'MMM dd yyyy';
  if (field?.type === 'Dropdown') return '--select--';
  return String(field?.label || field?.type || '').trim();
}

/**
 * The text shown inside the empty field at signing: the sender's own text, or the default one.
 * '' when the sender turned the placeholder off (`showPlaceholder: false`) or the field type has none.
 * A placeholder is only a hint for the signer: it is never printed on the document.
 */
export function fieldPlaceholder(field) {
  if (!supportsPlaceholder(field) || field.showPlaceholder === false) return '';
  return String(field.placeholder ?? '').trim() || defaultPlaceholder(field);
}

/** True while a field carries no value of its own (the editor stores the field type as the "empty" value). */
export function isBlankFieldValue(field) {
  const value = field?.value;
  return value === undefined || value === null || String(value).trim() === '' || value === field.type;
}

// Where a label can be shown beside a field (or not at all)
export const LABEL_POSITIONS = ['none', 'left', 'right', 'top', 'bottom'];
const sidePosition = (value) => (LABEL_POSITIONS.includes(value) ? value : null);

/** Where the field's name is written on the document: 'none' (the default), 'left', 'right', 'top' or 'bottom'. */
export function fieldLabelPosition(field) {
  return sidePosition(field?.labelPosition) || 'none';
}

/** Where a checkbox's value is written beside its box (older checkboxes only knew "show it on the right"). */
export function checkboxValuePosition(field) {
  return sidePosition(field?.valuePosition) || (field?.showLabel ? 'right' : 'none');
}

/** Where the values of a radio group are written beside their buttons (the default is on the right). */
export function radioValuesPosition(field) {
  return sidePosition(field?.valuesPosition) || (field?.showLabels === false ? 'none' : 'right');
}

/** Font size of a label written beside a field. */
export function labelFontSize(field) {
  return Math.max(8, Math.min(16, Number(field?.fontSize) || 11));
}

/**
 * Where the buttons of a radio group and their values sit inside its box (same arithmetic as radioLayout() in
 * server/utils/completedPdfGenerator.js, so the signed PDF matches the page).
 *
 * The options share the box evenly, top to bottom ("vertical") or left to right ("horizontal"): stretching the
 * box moves the buttons apart, which lines them up with the lines of text they belong to. Each option's value is
 * written to the right or left of its button, above it or below it (radioValuesPosition).
 *
 * Returns, in pixels from the box's top-left corner:
 * [{ option, cell: { left, top, width, height }, x, y, size,
 *    label: null | { x, width, centerY, align: 'left' | 'right', fontSize } }]
 */
export function radioLayout(field, box) {
  const options = Array.isArray(field?.options) ? field.options : [];
  const count = Math.max(1, options.length);
  const horizontal = field?.direction === 'horizontal';
  const position = radioValuesPosition(field);
  const cellWidth = horizontal ? box.width / count : box.width;
  const cellHeight = horizontal ? box.height : box.height / count;
  const fontSize = labelFontSize(field);
  const lineHeight = fontSize * 1.25;
  const stacked = position === 'top' || position === 'bottom';
  // A value above or below its button shares the cell's height with it
  const size = Math.max(8, Math.min(16, (stacked ? cellHeight - lineHeight - 2 : cellHeight) - 4, cellWidth - 2));

  return options.map((option, index) => {
    const left = horizontal ? index * cellWidth : 0;
    const top = horizontal ? 0 : index * cellHeight;
    const cell = { left, top, width: cellWidth, height: cellHeight };
    const middle = top + cellHeight / 2;
    if (position === 'none') return { option, cell, x: left + 1, y: middle - size / 2, size, label: null };
    if (position === 'left') {
      return {
        option, cell, x: left + cellWidth - size - 1, y: middle - size / 2, size,
        label: { x: left, width: Math.max(0, cellWidth - size - 7), centerY: middle, align: 'right', fontSize }
      };
    }
    if (stacked) {
      const blockTop = top + Math.max(0, (cellHeight - size - lineHeight - 2) / 2);
      const buttonTop = position === 'top' ? blockTop + lineHeight + 2 : blockTop;
      const labelTop = position === 'top' ? blockTop : blockTop + size + 2;
      return {
        option, cell, x: left + 1, y: buttonTop, size,
        label: { x: left + 1, width: Math.max(0, cellWidth - 2), centerY: labelTop + lineHeight / 2, align: 'left', fontSize }
      };
    }
    return {
      option, cell, x: left + 1, y: middle - size / 2, size,
      label: { x: left + size + 6, width: Math.max(0, cellWidth - size - 8), centerY: middle, align: 'left', fontSize }
    };
  });
}

let optionCounter = 0;
/** A new option of a radio group or dropdown: { id, value }. */
export function makeOption(value) {
  optionCounter += 1;
  return { id: `opt-${Date.now().toString(36)}-${optionCounter}`, value: String(value ?? '') };
}

/** The option values of a radio group or dropdown, without empty ones. */
export function optionValues(field) {
  return (Array.isArray(field?.options) ? field.options : [])
    .map((option) => String(typeof option === 'string' ? option : option?.value ?? '').trim())
    .filter(Boolean);
}

/**
 * The box a placed field occupies on the page, in page pixels: { width, height }.
 *
 * A field sized in the editor (`sized`) uses exactly its saved width and height. Fields placed before fields could
 * be resized keep the footprint they had in the editor then. A split text field saves the size of one character
 * cell, so its box is the row of cells.
 */
export function getFieldBox(field) {
  const type = field?.type;
  const width = Number(field?.width);
  const height = Number(field?.height);

  if (type === 'Split text') {
    const count = Math.max(1, Number(field.charCount) || 10);
    const cellWidth = width > 0 ? width : 16;
    const cellHeight = height > 0 ? height : 20;
    const gap = Math.max(0, Number(field.charSpace) || 0);
    return { width: count * cellWidth + (count - 1) * gap + 2, height: cellHeight + 2 };
  }

  const fallback = defaultFieldSize(type, field || {});
  if (field?.sized) {
    const isCheckbox = type === 'Checkbox';
    return {
      width: Math.max(isCheckbox ? 12 : FIELD_MIN_WIDTH, width || fallback.width),
      height: Math.max(isCheckbox ? 12 : FIELD_MIN_HEIGHT, height || fallback.height)
    };
  }
  if (SIGNATURE_TYPES.includes(type)) {
    return { width: width > 0 ? width : fallback.width, height: height > 0 ? height : fallback.height };
  }
  if (type === 'Stamp' || type === 'Checkbox') return fallback;
  // Text-like fields were one row of text, as wide as the saved width
  return { width: width > 0 ? width : fallback.width, height: 36 };
}

/** Font size for the text inside a field box: the configured size, reduced when the box is lower than a line. */
export function fieldFontSize(field, boxHeight) {
  const configured = Number(field?.fontSize) || 11;
  return Math.max(7, Math.min(configured, Math.floor(boxHeight - 4)));
}

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
export function autoResizeWidth(field, { paddingPx = 16 } = {}) {
  const configured = getFieldBox(field).width;
  if (!isAutoResizeField(field)) return configured;
  const textPx = measureTextPx(field.value ?? field.label ?? '', {
    font: field.font,
    fontSize: field.fontSize,
    bold: true,
    italic: field.isItalic
  });
  return Math.max(configured, Math.ceil(textPx) + paddingPx);
}
