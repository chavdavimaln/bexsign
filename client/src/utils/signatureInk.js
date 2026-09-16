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
