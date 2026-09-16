/**
 * Signature validation (server/utils/signatureValidation.js)
 * A saved signature must show something: a typed name, or an image with visible ink.
 * Blank canvases, 1x1 placeholder images and empty strings are rejected so the signature directory,
 * signing prefill and signed PDFs never contain empty signatures.
 */
const zlib = require('zlib');

const MIN_INK_PIXELS = 25;
const MAX_ANALYSED_PIXELS = 16 * 1024 * 1024;

/** Decodes an 8-bit, non-interlaced PNG and counts visible dark pixels. inkPixels is null when not analysable. */
function analysePng(buffer) {
  if (buffer.length < 33 || buffer.readUInt32BE(0) !== 0x89504e47) return null;
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlace = 0;
  let palette = null;
  let transparency = null;
  const idat = [];

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'PLTE') {
      palette = data;
    } else if (type === 'tRNS') {
      transparency = data;
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }
  if (!width || !height) return null;

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (bitDepth !== 8 || interlace !== 0 || !channels || width * height > MAX_ANALYSED_PIXELS) {
    return { width, height, inkPixels: null };
  }

  let raw;
  try {
    raw = zlib.inflateSync(Buffer.concat(idat));
  } catch (err) {
    return { width, height, inkPixels: null };
  }
  const stride = width * channels;
  if (raw.length < (stride + 1) * height) return { width, height, inkPixels: null };

  let previous = Buffer.alloc(stride);
  let line = Buffer.alloc(stride);
  let inkPixels = 0;

  for (let y = 0; y < height; y++) {
    const start = y * (stride + 1);
    const filter = raw[start];
    for (let x = 0; x < stride; x++) {
      const value = raw[start + 1 + x];
      const left = x >= channels ? line[x - channels] : 0;
      const up = previous[x];
      const upLeft = x >= channels ? previous[x - channels] : 0;
      let decoded;
      switch (filter) {
        case 0: decoded = value; break;
        case 1: decoded = value + left; break;
        case 2: decoded = value + up; break;
        case 3: decoded = value + ((left + up) >> 1); break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          decoded = value + (pa <= pb && pa <= pc ? left : (pb <= pc ? up : upLeft));
          break;
        }
        default:
          return { width, height, inkPixels: null };
      }
      line[x] = decoded & 0xff;
    }

    for (let x = 0; x < width; x++) {
      const i = x * channels;
      let r;
      let g;
      let b;
      let alpha = 255;
      if (colorType === 6) {
        r = line[i]; g = line[i + 1]; b = line[i + 2]; alpha = line[i + 3];
      } else if (colorType === 2) {
        r = line[i]; g = line[i + 1]; b = line[i + 2];
      } else if (colorType === 4) {
        r = g = b = line[i]; alpha = line[i + 1];
      } else if (colorType === 0) {
        r = g = b = line[i];
      } else {
        const entry = line[i] * 3;
        r = palette ? palette[entry] : 255;
        g = palette ? palette[entry + 1] : 255;
        b = palette ? palette[entry + 2] : 255;
        alpha = transparency && line[i] < transparency.length ? transparency[line[i]] : 255;
      }
      if (alpha > 40 && (r < 200 || g < 200 || b < 200)) inkPixels += 1;
    }
    [previous, line] = [line, previous];
  }
  return { width, height, inkPixels };
}

/**
 * True when the value is a signature someone can see: a typed name (text), an image URL/path,
 * a PNG with visible ink, or another image format with real content.
 */
function isUsableSignature(value) {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  if (!text) return false;

  const dataUrl = /^data:image\/([a-z0-9.+-]+);base64,(.+)$/i.exec(text);
  if (dataUrl) {
    let bytes;
    try {
      bytes = Buffer.from(dataUrl[2], 'base64');
    } catch (err) {
      return false;
    }
    if (dataUrl[1].toLowerCase() === 'png') {
      const png = analysePng(bytes);
      if (!png || png.width < 20 || png.height < 10) return false;
      return png.inkPixels === null ? bytes.length >= 1000 : png.inkPixels >= MIN_INK_PIXELS;
    }
    return bytes.length >= 1000;
  }
  if (text.startsWith('data:')) return false;
  if (/^(https?:\/\/|\/)/i.test(text)) return true;

  // Typed signature: needs at least one letter or digit
  return text.length <= 120 && /[\p{L}\p{N}]/u.test(text);
}

module.exports = { isUsableSignature, analysePng };
