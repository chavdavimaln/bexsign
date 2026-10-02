import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import DocumentPage, { PAGE_WIDTH } from '../components/documents/DocumentPage';

/**
 * Layout snapshot of a document: where every line of text, every border and every image sits on its pages.
 *
 * Placed fields are stored as positions on the page. The server builds the signed PDF without a browser, so it
 * cannot lay the text out the way the page does. The snapshot gives it the finished layout: it draws each piece
 * of text at the recorded spot and the fields at their own positions, so a field stays beside the words the
 * sender put it next to. The snapshot is taken from the same page markup the editor and the signing page show.
 *
 * Shape: { v, width, bodyKey, pages: [{ height, texts, rects, images }] }, all measures in page pixels from the
 * top-left corner of the page. `bodyKey` identifies the text the snapshot was taken from, so the server ignores a
 * snapshot that no longer matches the document text.
 */

const SNAPSHOT_VERSION = 1;
const MAX_IMAGE_CHARS = 1_500_000;

/** Letters and digits of a text, lower case: the same on the server whatever the markup around the text is. */
export function textKey(text) {
  const plain = String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  // FNV-1a, 32 bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < plain.length; i += 1) {
    hash ^= plain.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${plain.length}:${hash.toString(16)}`;
}

const round = (value) => Math.round(value * 100) / 100;

function toHex(color) {
  const match = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+%?))?\s*\)/.exec(color || '');
  if (!match) return null;
  const alpha = match[4] === undefined ? 1 : (match[4].endsWith('%') ? parseFloat(match[4]) / 100 : parseFloat(match[4]));
  if (alpha < 0.05) return null;
  return `#${[match[1], match[2], match[3]].map((part) => Math.round(Number(part)).toString(16).padStart(2, '0')).join('')}`;
}

let metricsCanvas = null;
const metricsCache = new Map();
/** Distance from the top of a line of text to its baseline, as a share of the line box height. */
function baselineShare(style) {
  const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  if (!metricsCache.has(font)) {
    if (!metricsCanvas) metricsCanvas = document.createElement('canvas');
    const ctx = metricsCanvas.getContext('2d');
    ctx.font = font;
    const metrics = ctx.measureText('Hg');
    const ascent = metrics.fontBoundingBoxAscent || metrics.actualBoundingBoxAscent || parseFloat(style.fontSize) * 0.8;
    const descent = metrics.fontBoundingBoxDescent || metrics.actualBoundingBoxDescent || parseFloat(style.fontSize) * 0.2;
    metricsCache.set(font, ascent / (ascent + descent));
  }
  return metricsCache.get(font);
}

function applyTextTransform(text, transform) {
  if (transform === 'uppercase') return text.toUpperCase();
  if (transform === 'lowercase') return text.toLowerCase();
  if (transform === 'capitalize') return text.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
  return text;
}

const isSkipped = (element) => Boolean(element.closest('[data-layout-skip], [data-doc-field], [data-doc-footer]'));

function decorationOf(element, page) {
  let underline = false;
  let strike = false;
  for (let node = element; node && node !== page; node = node.parentElement) {
    const line = getComputedStyle(node).textDecorationLine || '';
    if (line.includes('underline')) underline = true;
    if (line.includes('line-through')) strike = true;
  }
  return { underline, strike };
}

/** Snapshot of one rendered page element (a DocumentPage). */
export function capturePageLayout(page) {
  const pageRect = page.getBoundingClientRect();
  // The page may be shown zoomed: positions are stored at the page's own size
  const scale = pageRect.width / page.offsetWidth || 1;
  const originX = pageRect.left + page.clientLeft * scale;
  const originY = pageRect.top + page.clientTop * scale;
  const px = (value) => round(value / scale);
  const relX = (value) => round((value - originX) / scale);
  const relY = (value) => round((value - originY) / scale);

  const texts = [];
  const rects = [];
  const images = [];

  // Backgrounds, borders and images
  page.querySelectorAll('*').forEach((element) => {
    if (isSkipped(element)) return;
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return;

    const background = toHex(style.backgroundColor);
    if (background && background !== '#ffffff') {
      Array.from(element.getClientRects()).forEach((box) => {
        if (box.width > 0 && box.height > 0) rects.push({ x: relX(box.left), y: relY(box.top), w: px(box.width), h: px(box.height), c: background, f: 1 });
      });
    }

    const box = element.getBoundingClientRect();
    if (box.width > 0 || box.height > 0) {
      ['Top', 'Bottom', 'Left', 'Right'].forEach((side) => {
        const width = parseFloat(style[`border${side}Width`]) || 0;
        const color = toHex(style[`border${side}Color`]);
        if (width <= 0 || !color || style[`border${side}Style`] === 'none' || style[`border${side}Style`] === 'hidden') return;
        const thickness = width * scale;
        if (side === 'Top') rects.push({ x: relX(box.left), y: relY(box.top), w: px(box.width), h: px(thickness), c: color, f: 1 });
        if (side === 'Bottom') rects.push({ x: relX(box.left), y: relY(box.bottom - thickness), w: px(box.width), h: px(thickness), c: color, f: 1 });
        if (side === 'Left') rects.push({ x: relX(box.left), y: relY(box.top), w: px(thickness), h: px(box.height), c: color, f: 1 });
        if (side === 'Right') rects.push({ x: relX(box.right - thickness), y: relY(box.top), w: px(thickness), h: px(box.height), c: color, f: 1 });
      });
    }

    if (element.tagName === 'IMG' && box.width > 0 && box.height > 0) {
      const src = element.currentSrc || element.src || '';
      if (/^data:image\/(png|jpe?g);base64,/i.test(src) && src.length <= MAX_IMAGE_CHARS) {
        images.push({ x: relX(box.left), y: relY(box.top), w: px(box.width), h: px(box.height), src });
      }
    }
  });

  // Text: one entry per run of words that sits on one line
  const firstTextOf = new Map(); // list item -> its first piece of text (the marker lines up with it)
  const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent || !node.nodeValue.trim() || isSkipped(parent)) continue;
    const style = getComputedStyle(parent);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const color = toHex(style.color);
    if (!color) continue;

    const fontSize = parseFloat(style.fontSize) || 12;
    const base = {
      s: round(fontSize),
      c: color,
      ...(Number(style.fontWeight) >= 600 || style.fontWeight === 'bold' ? { b: 1 } : {}),
      ...(style.fontStyle === 'italic' || style.fontStyle === 'oblique' ? { i: 1 } : {}),
      ...(/mono|courier|consolas/i.test(style.fontFamily) ? { m: 1 } : {})
    };
    const decoration = decorationOf(parent, page);
    if (decoration.underline) base.u = 1;
    if (decoration.strike) base.k = 1;
    const share = baselineShare(style);
    const value = node.nodeValue;
    const listItem = parent.closest('li');

    let current = null;
    const flush = () => {
      if (!current) return;
      const text = applyTextTransform(value.slice(current.start, current.end).replace(/\s+/g, ' '), style.textTransform);
      const entry = {
        t: text,
        x: relX(current.left),
        y: relY(current.top),
        w: px(current.right - current.left),
        h: px(current.bottom - current.top),
        bl: relY(current.top + (current.bottom - current.top) * share),
        ...base
      };
      texts.push(entry);
      if (listItem && !firstTextOf.has(listItem)) firstTextOf.set(listItem, entry);
      current = null;
    };

    const addPiece = (start, end) => {
      range.setStart(node, start);
      range.setEnd(node, end);
      const pieces = Array.from(range.getClientRects()).filter((box) => box.width > 0 && box.height > 0);
      if (pieces.length === 0) return;
      if (pieces.length > 1 && end - start > 1) {
        // A long word broken over lines: take it letter by letter
        for (let i = start; i < end; i += 1) addPiece(i, i + 1);
        return;
      }
      const box = pieces[0];
      if (current && Math.abs(box.top - current.top) < 1.5 && box.left >= current.right - 1) {
        current.end = end;
        current.right = box.right;
        current.bottom = Math.max(current.bottom, box.bottom);
      } else {
        flush();
        current = { start, end, left: box.left, right: box.right, top: box.top, bottom: box.bottom };
      }
    };

    const words = /\S+/g;
    for (let match = words.exec(value); match; match = words.exec(value)) {
      addPiece(match.index, match.index + match[0].length);
    }
    flush();
  }

  // List markers (bullets and numbers are not part of the text nodes)
  page.querySelectorAll('li').forEach((item) => {
    if (isSkipped(item)) return;
    const style = getComputedStyle(item);
    const type = style.listStyleType;
    const first = firstTextOf.get(item);
    if (!first || type === 'none' || style.display !== 'list-item') return;
    let marker = '•';
    if (type === 'circle') marker = 'o';
    else if (type === 'square') marker = '▪';
    else if (type !== 'disc') {
      const list = item.parentElement;
      const index = Array.from(list.children).filter((child) => child.tagName === 'LI').indexOf(item) + (parseInt(list.getAttribute('start'), 10) || 1);
      marker = type === 'lower-alpha' ? `${String.fromCharCode(96 + ((index - 1) % 26) + 1)}.` : (type === 'upper-alpha' ? `${String.fromCharCode(64 + ((index - 1) % 26) + 1)}.` : `${index}.`);
    }
    const fontSize = parseFloat(style.fontSize) || 12;
    const itemLeft = relX(item.getBoundingClientRect().left);
    // The marker ends a little before the item's text starts
    texts.push({ t: marker, x: round(itemLeft - fontSize * 0.45), y: first.y, w: 0, h: first.h, bl: first.bl, s: round(fontSize), c: toHex(style.color) || '#334155', a: 'r' });
  });

  return { height: round(page.offsetHeight - page.clientTop * 2), texts, rects, images };
}

/**
 * Snapshots of every document of a request, taken from an off-screen render of the shared page markup.
 * documents: [{ title, docIdText, documentText, customMessage, totalPages }] -> one snapshot per document.
 */
export async function captureDocumentLayouts(documents) {
  if (typeof document === 'undefined' || !Array.isArray(documents) || documents.length === 0) return [];
  try {
    if (document.fonts?.ready) await document.fonts.ready;
  } catch (e) {}

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  // Off screen but laid out like a visible page (a hidden element would not report its text positions)
  host.style.cssText = `position:fixed;left:-20000px;top:0;width:${PAGE_WIDTH}px;pointer-events:none;`;
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    return documents.map((doc) => {
      const totalPages = Math.max(1, Number(doc.totalPages) || 1);
      try {
        flushSync(() => {
          root.render(
            React.createElement(
              React.Fragment,
              null,
              Array.from({ length: totalPages }, (_, index) => React.createElement(DocumentPage, {
                key: index,
                pageNum: index + 1,
                totalPages,
                title: doc.title,
                docIdText: doc.docIdText,
                documentText: doc.documentText,
                customMessage: doc.customMessage
              }))
            )
          );
        });
        const pages = Array.from(host.querySelectorAll('[data-doc-page]'));
        const body = host.querySelector('[data-doc-body]');
        return {
          v: SNAPSHOT_VERSION,
          width: PAGE_WIDTH - 2,
          bodyKey: textKey(body ? body.textContent : ''),
          pages: pages.map(capturePageLayout)
        };
      } catch (err) {
        console.warn('Layout snapshot skipped for a document:', err);
        return null;
      }
    });
  } finally {
    root.unmount();
    host.remove();
  }
}
