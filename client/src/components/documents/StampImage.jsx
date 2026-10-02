import React from 'react';

/**
 * A stamp drawn in its shape, the same way in the document editor, the stamp dialog, the signing page and the
 * document view (the signed PDF does the same in drawStamp() of server/utils/completedPdfGenerator.js).
 *
 * The picture fills the whole shape (a rectangle with slightly rounded corners, or an oval) and is cut off at
 * its edge. Zoom enlarges or shrinks the picture inside the shape; rotation turns it in quarter turns, and a
 * turned picture still fills the shape.
 */
export default function StampImage({ src, width, height, shape = 'square', zoom = 100, rotation = 0, alt = 'Stamp' }) {
  const turn = ((Number(rotation) || 0) % 360 + 360) % 360;
  const sideways = turn === 90 || turn === 270;
  const scale = Math.max(0.1, (Number(zoom) || 100) / 100);
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: `${width}px`, height: `${height}px`, borderRadius: shape === 'oval' ? '50%' : '3px' }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="absolute left-1/2 top-1/2 max-w-none object-cover pointer-events-none select-none"
        style={{
          // A picture lying on its side is laid out for the turned box, so it still covers the shape
          width: `${sideways ? height : width}px`,
          height: `${sideways ? width : height}px`,
          transform: `translate(-50%, -50%) rotate(${turn}deg) scale(${scale})`
        }}
      />
    </div>
  );
}

/**
 * Prepares an uploaded stamp picture: at most 800 px on its longer side, as JPEG (photos) or PNG (anything that
 * may be transparent). The signed PDF can only embed these two formats, and a smaller picture keeps requests light.
 */
export function prepareStampImage(file, maxSide = 800) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const longest = Math.max(image.naturalWidth, image.naturalHeight);
      if (!longest) return reject(new Error('This file is not a picture.'));
      const ratio = Math.min(1, maxSide / longest);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const ctx = canvas.getContext('2d');
      const asJpeg = /jpe?g/i.test(file.type);
      if (asJpeg) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(asJpeg ? canvas.toDataURL('image/jpeg', 0.9) : canvas.toDataURL('image/png'));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This file is not a picture. Choose a PNG or JPG file.'));
    };
    image.src = url;
  });
}
