import React from 'react';

/**
 * A label written beside a placed field: the field's name, or the value a checkbox stands for.
 *
 * It sits outside the field's box, on the side the sender chose: left or right of the box (centred on its
 * height), or above or below it (starting at its left edge). The signed PDF writes it at the same spot
 * (drawSideLabel() in server/utils/completedPdfGenerator.js). The parent must be the field's positioned box.
 */

// Gap between the box and a label beside it / above or below it, in page pixels (the PDF uses the same)
export const LABEL_GAP_SIDE = 6;
export const LABEL_GAP_STACK = 3;

const PLACEMENT = {
  left: { right: '100%', top: '50%', marginRight: `${LABEL_GAP_SIDE}px`, transform: 'translateY(-50%)' },
  right: { left: '100%', top: '50%', marginLeft: `${LABEL_GAP_SIDE}px`, transform: 'translateY(-50%)' },
  top: { left: 0, bottom: '100%', marginBottom: `${LABEL_GAP_STACK}px` },
  bottom: { left: 0, top: '100%', marginTop: `${LABEL_GAP_STACK}px` }
};

export default function FieldLabel({ text, position, fontSize = 11, color = '#1e293b' }) {
  const label = String(text ?? '').trim();
  if (!label || !PLACEMENT[position]) return null;
  return (
    <span
      data-field-label={position}
      className="absolute whitespace-nowrap font-semibold pointer-events-none select-none"
      style={{ ...PLACEMENT[position], fontSize: `${fontSize}px`, lineHeight: 1.25, color }}
    >
      {label}
    </span>
  );
}
