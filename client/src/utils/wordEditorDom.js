/**
 * DOM helpers for the document text editor ("Edit document" in DocumentEditor):
 *  - A4 pages: the text is one contentEditable; page breaks are added with a generated stylesheet only (a block that
 *    does not fit moves to the next page, a long paragraph continues on the next page), so the edited HTML never
 *    contains layout helpers.
 *  - Fonts: a font or size applies to exactly the selected text (or to the text typed next at the cursor).
 *  - Paste cleanup, clean HTML output and caret offsets for undo/redo.
 */

// A4 page in CSS px (96 dpi): 210 x 297 mm
export const PAGE = {
  width: 794,
  height: 1123,
  gap: 28, // space between two pages
  marginX: 56, // left and right margin of the text
  contentTop: 100, // header (document title and ID) above the text
  contentBottom: 1123 - 92 // footer (page number) below the text
};
PAGE.contentWidth = PAGE.width - PAGE.marginX * 2;
PAGE.contentHeight = PAGE.contentBottom - PAGE.contentTop;
PAGE.stride = PAGE.height + PAGE.gap;

// Base text style of a document; fonts and sizes chosen in the toolbar are set on the text itself
export const EDITOR_BASE_FONT = 'Arial, sans-serif';
export const EDITOR_BASE_SIZE = 14;
export const EDITOR_BASE_LINE_HEIGHT = '1.6';
export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 96;

export const FONT_GROUPS = [
  {
    label: 'Standard Business & UI',
    fonts: [
      ['Arial', 'Arial, sans-serif'],
      ['Calibri', 'Calibri, sans-serif'],
      ['Segoe UI', "'Segoe UI', sans-serif"],
      ['Inter', 'Inter, sans-serif'],
      ['Roboto', 'Roboto, sans-serif'],
      ['Helvetica', 'Helvetica, sans-serif'],
      ['Verdana', 'Verdana, sans-serif'],
      ['Tahoma', 'Tahoma, sans-serif'],
      ['Trebuchet MS', "'Trebuchet MS', sans-serif"],
      ['Open Sans', "'Open Sans', sans-serif"],
      ['Lato', 'Lato, sans-serif'],
      ['Montserrat', 'Montserrat, sans-serif'],
      ['Poppins', 'Poppins, sans-serif']
    ]
  },
  {
    label: 'Formal & Legal Serif',
    fonts: [
      ['Times New Roman', "'Times New Roman', Times, serif"],
      ['Georgia', 'Georgia, serif'],
      ['Garamond', 'Garamond, serif'],
      ['Cambria', 'Cambria, serif'],
      ['Palatino', 'Palatino, serif'],
      ['Merriweather', 'Merriweather, serif'],
      ['Playfair Display', "'Playfair Display', serif"],
      ['Baskerville', 'Baskerville, serif']
    ]
  },
  {
    label: 'Monospace & Code',
    fonts: [
      ['Courier New', "'Courier New', Courier, monospace"],
      ['Consolas', 'Consolas, monospace'],
      ['Monaco', 'Monaco, monospace'],
      ['Fira Code', "'Fira Code', monospace"],
      ['Source Code Pro', "'Source Code Pro', monospace"]
    ]
  },
  {
    label: 'Handwriting & Script',
    fonts: [
      ['Caveat', "'Caveat', cursive"],
      ['Brush Script MT', "'Brush Script MT', cursive"],
      ['Dancing Script', "'Dancing Script', cursive"],
      ['Pacifico', "'Pacifico', cursive"],
      ['Impact', 'Impact, fantasy']
    ]
  }
];

/** First family of a CSS font-family list, without quotes ("'Segoe UI', sans-serif" -> "Segoe UI"). */
export const primaryFontName = (family) => String(family || '').split(',')[0].replace(/["']/g, '').trim();

/** The toolbar option for a computed font-family, or '' when the font is not in the list. */
export function fontOptionValue(family) {
  const name = primaryFontName(family).toLowerCase();
  for (const group of FONT_GROUPS) {
    const match = group.fonts.find(([label]) => label.toLowerCase() === name);
    if (match) return match[1];
  }
  return '';
}

const ZWSP = '​';
const NON_TEXT_PARENTS = /^(UL|OL|TABLE|THEAD|TBODY|TFOOT|TR|COLGROUP)$/;

/** Selected part [start, end) of a text node, for a range that intersects it. */
function selectedSlice(node, range) {
  const start = node === range.startContainer ? range.startOffset : 0;
  const end = node === range.endContainer ? range.endOffset : node.length;
  return [start, end];
}

function textNodesInRange(range) {
  const container = range.commonAncestorContainer;
  if (container.nodeType === Node.TEXT_NODE) return [container];
  const nodes = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (range.intersectsNode(node)) nodes.push(node);
    node = walker.nextNode();
  }
  return nodes;
}

/**
 * Sets one CSS property (fontFamily, fontSize...) on the selected text only. Each selected piece of text is styled
 * directly (its own span), so the value wins over sizes or fonts set around it, and applying it again updates the
 * same span. Returns a range over the styled text, or null when nothing was selected.
 */
export function styleSelectedText(range, prop, value, root) {
  const pieces = [];
  textNodesInRange(range).forEach((node) => {
    const [start, end] = selectedSlice(node, range);
    if (start >= end) return;
    const parent = node.parentNode;
    const text = node.nodeValue.slice(start, end);
    // Formatting whitespace between blocks, list items or table rows is not text
    if (!parent || (!text.trim() && (parent === root || NON_TEXT_PARENTS.test(parent.nodeName)))) return;
    if (end < node.length) node.splitText(end);
    pieces.push(start > 0 ? node.splitText(start) : node);
  });

  pieces.forEach((piece) => {
    const parent = piece.parentNode;
    if (parent.nodeName === 'SPAN' && parent !== root && parent.childNodes.length === 1) {
      parent.style[prop] = value;
    } else {
      const span = document.createElement('span');
      span.style[prop] = value;
      parent.insertBefore(span, piece);
      span.appendChild(piece);
    }
  });
  if (pieces.length === 0) return null;

  const styled = document.createRange();
  styled.setStart(pieces[0], 0);
  const last = pieces[pieces.length - 1];
  styled.setEnd(last, last.length);
  return styled;
}

/**
 * With only a cursor, the value applies to the text typed next: an empty "pending" span holds the style until then
 * (a zero-width space keeps the cursor inside it). Returns the new cursor range.
 */
export function styleAtCaret(range, prop, value, root) {
  const start = range.startContainer;
  const element = start.nodeType === Node.TEXT_NODE ? start.parentNode : start;
  const pending = element && element.closest ? element.closest('span[data-bex-pending]') : null;
  let textNode;
  if (pending && root.contains(pending) && pending.textContent.replace(/​/g, '') === '') {
    pending.style[prop] = value;
    textNode = pending.lastChild && pending.lastChild.nodeType === Node.TEXT_NODE ? pending.lastChild : null;
    if (!textNode) {
      textNode = document.createTextNode(ZWSP);
      pending.appendChild(textNode);
    }
  } else {
    const span = document.createElement('span');
    span.setAttribute('data-bex-pending', '1');
    span.style[prop] = value;
    textNode = document.createTextNode(ZWSP);
    span.appendChild(textNode);
    range.insertNode(span);
  }
  const caret = document.createRange();
  caret.setStart(textNode, textNode.length);
  caret.collapse(true);
  return caret;
}

/**
 * Pending spans the cursor has left: removed when nothing was typed in them, otherwise they become normal styled
 * text (the zero-width space is dropped).
 */
export function settlePendingSpans(root, keepNode = null) {
  root.querySelectorAll('span[data-bex-pending]').forEach((span) => {
    if (keepNode && span.contains(keepNode)) return;
    const typed = span.textContent.replace(/​/g, '');
    if (!typed) {
      span.remove();
      return;
    }
    span.removeAttribute('data-bex-pending');
    const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (node.nodeValue.includes(ZWSP)) node.nodeValue = node.nodeValue.replace(/​/g, '');
      node = walker.nextNode();
    }
  });
}

/** Element whose computed style describes the selection: the first selected character, or the cursor position. */
export function selectionStyleElement(range, root) {
  let node = range.startContainer;
  if (!range.collapsed) {
    const first = textNodesInRange(range).find((n) => {
      const [start, end] = selectedSlice(n, range);
      return end > start && n.nodeValue.slice(start, end).replace(/​/g, '').trim();
    });
    if (first) node = first;
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    // Cursor between elements: use the text just before it, otherwise the element after it
    const before = node.childNodes[range.startOffset - 1];
    const after = node.childNodes[range.startOffset];
    node = (before && before.nodeName !== 'BR' ? before : after) || node;
    while (node && node.nodeType === Node.ELEMENT_NODE && node.lastChild && node.nodeName !== 'BR') node = node.lastChild;
  }
  const element = node && node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
  return element && root.contains(element) ? element : root;
}

/** Block elements (paragraphs, headings, list items, cells) touched by the selection. */
export function selectedBlocks(range, root) {
  const BLOCK = 'p, div, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, pre';
  const blocks = new Set();
  const add = (node) => {
    const el = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
    const block = el && el.closest ? el.closest(BLOCK) : null;
    if (block && block !== root && root.contains(block)) blocks.add(block);
  };
  add(range.startContainer);
  textNodesInRange(range).forEach(add);
  add(range.endContainer);
  return [...blocks];
}

/** The editor's HTML without editing helpers (pending spans, zero-width spaces, empty spans). */
export function cleanEditorHtml(root) {
  const clone = root.cloneNode(true);
  clone.querySelectorAll('span[data-bex-pending]').forEach((span) => span.removeAttribute('data-bex-pending'));
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  const empty = [];
  let node = walker.nextNode();
  while (node) {
    if (node.nodeValue.includes(ZWSP)) {
      node.nodeValue = node.nodeValue.replace(/​/g, '');
      if (!node.nodeValue) empty.push(node);
    }
    node = walker.nextNode();
  }
  empty.forEach((n) => n.remove());
  clone.querySelectorAll('span').forEach((span) => {
    if (!span.textContent && !span.querySelector('br, img, table, hr')) span.remove();
  });
  return clone.innerHTML;
}

const BLOCK_HTML = /^\s*<(p|div|h[1-6]|table|ul|ol|hr|blockquote|pre)[\s>/]/i;

/**
 * Inserts block content (clauses, tables, signature blocks) at the cursor as whole paragraphs: the paragraph at
 * the cursor is split in two and the blocks go in between, instead of being merged into it. Returns the new cursor
 * range, or null when the content is inline or the cursor is in a list or table (the browser's insertion is used).
 */
export function insertBlocksAtRange(range, html, root) {
  if (!BLOCK_HTML.test(html)) return null;
  const startEl = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentNode : range.startContainer;
  const cell = startEl.closest('li, td, th');
  if (cell && root.contains(cell)) return null;
  const block = startEl.closest('p, div, h1, h2, h3, h4, h5, h6, blockquote, pre');
  if (!block || block === root || !root.contains(block)) return null;

  const hasContent = (el) => Boolean(el.textContent.replace(/​/g, '').trim() || el.querySelector('img, table, hr'));
  range.deleteContents();
  const tail = document.createRange();
  tail.setStart(range.startContainer, range.startOffset);
  tail.setEnd(block, block.childNodes.length);
  const after = block.cloneNode(false);
  after.appendChild(tail.extractContents());

  const template = document.createElement('template');
  template.innerHTML = html;
  const nodes = [...template.content.childNodes].filter((n) => n.nodeType === Node.ELEMENT_NODE || n.nodeValue.trim());
  const parent = block.parentNode;
  const ref = block.nextSibling;
  nodes.forEach((n) => parent.insertBefore(n, ref));
  const keepAfter = hasContent(after);
  if (keepAfter) parent.insertBefore(after, ref);
  if (!hasContent(block)) block.remove();

  // The cursor continues after the inserted blocks, in a paragraph
  let target = keepAfter ? after : null;
  if (!target) {
    const last = nodes[nodes.length - 1];
    if (last && last.nodeType === Node.ELEMENT_NODE && /^(P|H[1-6]|DIV|BLOCKQUOTE|PRE)$/.test(last.tagName) && !last.querySelector('table, hr')) {
      target = last;
    } else {
      target = document.createElement('p');
      target.innerHTML = '<br>';
      parent.insertBefore(target, ref);
    }
  }
  const caret = document.createRange();
  caret.selectNodeContents(target);
  caret.collapse(keepAfter);
  return caret;
}

// ---- Paste ----
const ALLOWED_TAGS = new Set([
  'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'SUB', 'SUP', 'UL', 'OL', 'LI', 'TABLE', 'THEAD',
  'TBODY', 'TFOOT', 'TR', 'TD', 'TH', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'SPAN', 'A', 'HR', 'DIV', 'PRE',
  'CODE'
]);
const DROP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'HEAD', 'IFRAME', 'OBJECT', 'EMBED', 'NOSCRIPT', 'TEMPLATE', 'SVG',
  'CANVAS', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'FORM', 'IMG', 'PICTURE', 'VIDEO', 'AUDIO', 'XML'
]);
const KEPT_STYLES = [
  'font-weight', 'font-style', 'text-decoration-line', 'text-align', 'color', 'background-color', 'font-size',
  'font-family', 'vertical-align', 'margin-top', 'margin-bottom'
];
// Paragraph spacing is kept up to this size (larger page-layout margins are dropped)
const MAX_KEPT_MARGIN = 32;

function keptStyle(styleText) {
  const probe = document.createElement('span');
  probe.setAttribute('style', styleText);
  return KEPT_STYLES
    .map((prop) => {
      const value = probe.style.getPropertyValue(prop);
      if (!value) return '';
      if (prop === 'background-color' && /^(transparent|white|#fff(fff)?|rgba?\(255,\s*255,\s*255(,\s*1)?\)|rgba\(0,\s*0,\s*0,\s*0\))$/i.test(value)) return '';
      if (prop === 'font-weight' && /^(normal|400)$/.test(value)) return '';
      if (prop === 'font-style' && value === 'normal') return '';
      if (prop === 'text-decoration-line' && value === 'none') return '';
      if (prop === 'vertical-align' && value === 'baseline') return '';
      if (prop.startsWith('margin') && !(/^\d+(\.\d+)?px$/.test(value) && parseFloat(value) <= MAX_KEPT_MARGIN)) return '';
      return `${prop}: ${value}`;
    })
    .filter(Boolean)
    .join('; ');
}

/** Pasted HTML reduced to text formatting (no scripts, classes, layout or tracking attributes). */
export function sanitizePastedHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const clean = (parent) => {
    [...parent.childNodes].forEach((child) => {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const tag = child.tagName.toUpperCase();
      if (DROP_TAGS.has(tag)) {
        child.remove();
        return;
      }
      clean(child);
      if (!ALLOWED_TAGS.has(tag)) {
        child.replaceWith(...child.childNodes);
        return;
      }
      const style = child.getAttribute('style');
      [...child.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (tag === 'A' && name === 'href' && /^(https?:|mailto:)/i.test(attr.value.trim())) return;
        if ((tag === 'TD' || tag === 'TH') && (name === 'colspan' || name === 'rowspan')) return;
        child.removeAttribute(attr.name);
      });
      const kept = style ? keptStyle(style) : '';
      if (kept) child.setAttribute('style', kept);
      if (tag === 'SPAN' && !kept) child.replaceWith(...child.childNodes);
    });
  };
  clean(doc.body);
  return doc.body.innerHTML;
}

const escapeHtml = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Plain text as paragraphs (blank lines) and line breaks. */
export function plainTextToParagraphs(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((block) => (block.trim() ? `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>` : ''))
    .join('');
}

// ---- Cursor position as text offsets (undo/redo keeps the cursor where it was) ----
export function getCaretOffsets(root) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;
  const before = document.createRange();
  before.selectNodeContents(root);
  before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length;
  before.setEnd(range.endContainer, range.endOffset);
  return { start, end: before.toString().length };
}

export function setCaretOffsets(root, offsets) {
  const sel = window.getSelection();
  if (!sel) return;
  const target = offsets || { start: Number.MAX_SAFE_INTEGER, end: Number.MAX_SAFE_INTEGER };
  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let seen = 0;
  let startSet = false;
  let node = walker.nextNode();
  while (node) {
    const next = seen + node.length;
    if (!startSet && target.start <= next) {
      range.setStart(node, target.start - seen);
      range.collapse(true);
      startSet = true;
    }
    if (startSet && target.end <= next) {
      range.setEnd(node, target.end - seen);
      break;
    }
    seen = next;
    node = walker.nextNode();
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

// ---- A4 pagination ----
const BLOCK_TAGS = /^(P|DIV|H[1-6]|UL|OL|LI|TABLE|BLOCKQUOTE|HR|PRE|SECTION|ARTICLE|FIGURE)$/;
const FLOW_CONTAINERS = /^(UL|OL|DIV|BLOCKQUOTE|SECTION|ARTICLE)$/;
// Blocks whose lines can continue on the next page (headings, tables and dividers move as a whole)
const SPLITTABLE = /^(P|DIV|LI|BLOCKQUOTE|PRE)$/;

function collectUnits(parent, path, units) {
  Array.from(parent.children).forEach((child, index) => {
    const selector = `${path} > :nth-child(${index + 1})`;
    const display = getComputedStyle(child).display;
    if (display === 'none' || display.startsWith('inline') || display === 'contents') return;
    const holdsBlocks = Array.from(child.children).some((c) => BLOCK_TAGS.test(c.tagName));
    if (FLOW_CONTAINERS.test(child.tagName) && holdsBlocks && (display === 'block' || display === 'list-item')) {
      collectUnits(child, selector, units);
    } else {
      units.push({ el: child, selector });
    }
  });
}

/**
 * Lays the editor's content out on A4 pages. The editor sits on the first page's text area and runs down through
 * every page; nothing may be drawn in a header, footer or the gap between pages:
 *  - a block starting there moves down to the next page's text area (margin-top),
 *  - a paragraph crossing the bottom of a page continues on the next page: a float with shape-outside creates an
 *    empty band over the footer and gap that its lines flow around,
 *  - a heading, table or divider that does not fit moves to the next page as a whole.
 * Everything is written into `styleEl` (scoped to the editor's id); the editor's HTML is not changed.
 * Returns the number of pages.
 */
export function paginateEditor(editor, styleEl, { scale = 1 } = {}) {
  if (!editor || !styleEl || !editor.id) return 1;
  const scope = `#${editor.id}`;
  const rules = new Map(); // selector -> { margin, bands, padTop }
  const write = () => {
    const css = [];
    rules.forEach((rule, selector) => {
      if (rule.margin !== undefined) css.push(`${selector}{margin-top:${rule.margin.toFixed(2)}px !important}`);
      if (rule.bands && rule.bands.length) {
        const height = rule.bands[rule.bands.length - 1][1];
        const points = rule.bands
          .map(([s, e]) => `0 ${s.toFixed(2)}px,100% ${s.toFixed(2)}px,100% ${e.toFixed(2)}px,0 ${e.toFixed(2)}px`)
          .join(',');
        css.push(`${selector}::before{content:'';float:left;width:100%;height:${height.toFixed(2)}px;shape-outside:polygon(${points});pointer-events:none}`);
      }
    });
    styleEl.textContent = css.join('\n');
  };

  styleEl.textContent = '';
  const units = [];
  collectUnits(editor, scope, units);
  const factor = scale || 1;

  // Position in page coordinates (0 = top of page 1)
  const measure = (el) => {
    const base = editor.getBoundingClientRect().top;
    const rect = el.getBoundingClientRect();
    return { top: PAGE.contentTop + (rect.top - base) / factor, height: rect.height / factor };
  };
  const pageOf = (y) => Math.max(0, Math.floor(y / PAGE.stride));
  const textTop = (page) => page * PAGE.stride + PAGE.contentTop;
  const textBottom = (page) => page * PAGE.stride + PAGE.contentBottom;

  const moveDown = (unit, rule, delta) => {
    const before = measure(unit.el).top;
    const current = rule.margin !== undefined ? rule.margin : parseFloat(getComputedStyle(unit.el).marginTop) || 0;
    rule.margin = current + delta;
    rules.set(unit.selector, rule);
    write();
    // Adjacent margins collapse: add what is still missing
    const moved = measure(unit.el).top - before;
    if (moved < delta - 0.5) {
      rule.margin += delta - moved;
      write();
    }
  };

  units.forEach((unit) => {
    const rule = rules.get(unit.selector) || {};
    let { top, height } = measure(unit.el);
    if (height < 0.5) return;

    // Starts in a header, a footer or the gap between pages
    let page = pageOf(top);
    if (top < textTop(page) - 0.5 || top > textBottom(page) - 1) {
      const target = top < textTop(page) - 0.5 ? textTop(page) : textTop(page + 1);
      moveDown(unit, rule, target - top);
      ({ top, height } = measure(unit.el));
      page = pageOf(top);
    }
    if (top + height <= textBottom(page) + 0.5) return;

    const style = getComputedStyle(unit.el);
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.6 || 22;
    const canSplit = SPLITTABLE.test(unit.el.tagName) && height > lineHeight * 1.8
      && !unit.el.querySelector('table, hr, h1, h2, h3, h4, h5, h6');
    if (!canSplit) {
      // Moves as a whole when it fits on one page
      if (height <= PAGE.contentHeight && top > textTop(page) + 0.5) moveDown(unit, rule, textTop(page + 1) - top);
      return;
    }

    // A single line left at the bottom of the page (e.g. a heading line) moves on with the rest of its paragraph
    if (textBottom(page) - top < lineHeight * 2 && height <= PAGE.contentHeight) {
      moveDown(unit, rule, textTop(page + 1) - top);
      return;
    }

    // Lines below a page's text area continue on the next page
    const inset = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.borderTopWidth) || 0);
    rule.bands = [];
    for (let guard = 0; guard < 60; guard += 1) {
      ({ top, height } = measure(unit.el));
      const crossed = [];
      for (let p = pageOf(top); textBottom(p) < top + height - 0.5; p += 1) crossed.push(p);
      const nextPage = crossed.find((p) => !rule.bands.some(([s]) => Math.abs(s - (textBottom(p) - top - inset)) < 1));
      if (nextPage === undefined) break;
      rule.bands.push([textBottom(nextPage) - top - inset, textTop(nextPage + 1) - top - inset]);
      rules.set(unit.selector, rule);
      write();
    }
  });

  write();
  const end = PAGE.contentTop + editor.getBoundingClientRect().height / factor;
  return Math.max(1, pageOf(end - 1) + 1);
}
