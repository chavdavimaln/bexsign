/**
 * Empty-signature checks for signature pads and typed signatures (same rules as the server's signatureValidation).
 */

const MIN_INK_PIXELS = 25;

/** True when the canvas has visible strokes (a click without drawing leaves it empty). */
export function canvasHasInk(canvas, minInkPixels = MIN_INK_PIXELS) {
  if (!canvas) return false;
  try {
    const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    let ink = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 40 && (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200)) {
        ink += 1;
        if (ink >= minInkPixels) return true;
      }
    }
    return false;
  } catch (e) {
    return true; // pixels unreadable (tainted canvas): the server check still applies
  }
}

/** A typed signature needs at least one letter or digit. */
export function isTypedSignatureValid(text) {
  return /[\p{L}\p{N}]/u.test(String(text || '').trim());
}

/** Pointer position in canvas pixels, for canvases whose CSS size differs from their drawing size. */
export function canvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const touch = event.touches && event.touches[0];
  const clientX = touch ? touch.clientX : event.clientX;
  const clientY = touch ? touch.clientY : event.clientY;
  return {
    x: ((clientX - rect.left) * canvas.width) / (rect.width || canvas.width),
    y: ((clientY - rect.top) * canvas.height) / (rect.height || canvas.height)
  };
}

// Canvas fonts for the typed-signature styles offered while signing (see .font-signature-* in index.css)
const TYPED_SIGNATURE_FONTS = {
  'font-signature-1': { family: '"Dancing Script"', weight: '700', fallback: 'cursive' },
  'font-signature-2': { family: '"Great Vibes"', weight: '400', fallback: 'cursive' },
  'font-signature-3': { family: 'Georgia', weight: 'italic 400', fallback: 'serif' }
};

/**
 * Renders a typed signature in the chosen handwriting style as a transparent PNG data URL, so signed PDFs and the
 * signature directory show the same cursive signature the signer picked. Returns '' when it cannot be rendered.
 */
export async function typedSignatureImage(text, style = 'font-signature-1') {
  const value = String(text || '').trim();
  if (!isTypedSignatureValid(value)) return '';
  const font = TYPED_SIGNATURE_FONTS[style] || TYPED_SIGNATURE_FONTS['font-signature-1'];
  const fontSize = 64;
  const cssFont = `${font.weight} ${fontSize}px ${font.family}, ${font.fallback}`;
  try {
    if (document.fonts && document.fonts.load) {
      await Promise.race([document.fonts.load(cssFont, value), new Promise((resolve) => setTimeout(resolve, 2500))]);
    }
    const measure = document.createElement('canvas').getContext('2d');
    measure.font = cssFont;
    const metrics = measure.measureText(value);
    const padding = 18;
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(1600, Math.ceil(metrics.width + padding * 2));
    canvas.height = Math.round(fontSize * 1.6);
    const ctx = canvas.getContext('2d');
    ctx.font = cssFont;
    ctx.fillStyle = '#0f172a';
    ctx.textBaseline = 'middle';
    ctx.fillText(value, padding, canvas.height / 2, canvas.width - padding * 2);
    return canvasHasInk(canvas) ? canvas.toDataURL('image/png') : '';
  } catch (e) {
    return '';
  }
}
