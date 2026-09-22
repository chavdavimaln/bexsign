/**
 * A formatted-text field (client/src/components/editor/RichTextField.jsx).
 *
 * The same writing experience as the document editor - font, size, bold, colours, alignment, spacing, lists -
 * in a box that fits inside a dialog. It is built on the same helpers as the big editor
 * (client/src/utils/wordEditorDom.js), so a font or size applies to exactly what is selected, and the HTML it
 * produces is the same shape the rest of BexSign stores in `documentText`.
 *
 * Usage:  <RichTextField value={html} onChange={setHtml} placeholder="..." minHeight={320} />
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Undo, Redo, Bold, Italic, Underline, Strikethrough, Subscript, Superscript, RemoveFormatting,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, Indent, Outdent,
  Baseline, Highlighter, Minus, Plus, ChevronDown, Type
} from 'lucide-react';
import {
  FONT_GROUPS,
  EDITOR_BASE_FONT,
  EDITOR_BASE_SIZE,
  EDITOR_BASE_LINE_HEIGHT,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  fontOptionValue,
  primaryFontName,
  styleSelectedText,
  styleAtCaret,
  settlePendingSpans,
  selectionStyleElement,
  selectedBlocks,
  cleanEditorHtml,
  sanitizePastedHtml,
  plainTextToParagraphs,
  getCaretOffsets,
  setCaretOffsets
} from '../../utils/wordEditorDom';

const LINE_SPACING_OPTIONS = ['1.2', '1.4', '1.6', '1.8', '2.0'];

const TEXT_COLORS = [
  '#000000', '#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1',
  '#7f1d1d', '#b91c1c', '#dc2626', '#ef4444', '#f87171', '#ea580c', '#f97316',
  '#854d0e', '#ca8a04', '#eab308', '#166534', '#16a34a', '#22c55e', '#4ade80',
  '#065f46', '#007355', '#059669', '#10b981', '#0f766e', '#0d9488', '#14b8a6',
  '#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#4338ca', '#6366f1', '#818cf8',
  '#6b21a8', '#7c3aed', '#a855f7', '#c026d3', '#be185d', '#db2777', '#ec4899'
];

const HIGHLIGHT_COLORS = [
  '#fef08a', '#bbf7d0', '#a5f3fc', '#fbcfe8', '#fed7aa',
  '#ddd6fe', '#fecaca', '#dcfce7', '#e0f2fe', '#fae8ff'
];

const BLOCK_STYLES = [
  { label: 'Normal text', tag: 'P' },
  { label: 'Title', tag: 'H1' },
  { label: 'Heading', tag: 'H2' },
  { label: 'Subheading', tag: 'H3' }
];

/** Plain text (or empty) becomes the paragraph HTML the editor works with. */
function toEditorHtml(value) {
  const text = String(value || '');
  if (!text.trim()) return '<p><br></p>';
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return plainTextToParagraphs(text);
}

const ToolbarButton = ({ onClick, active = false, title, children, disabled = false }) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
    aria-pressed={active}
    className={`p-1.5 rounded transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
      active ? 'bg-emerald-50 text-[#007355] ring-1 ring-emerald-200' : 'text-slate-700 hover:bg-slate-100'
    }`}
  >
    {children}
  </button>
);

const Divider = () => <span className="w-px self-stretch bg-slate-200 mx-0.5" aria-hidden="true" />;

export default function RichTextField({
  value = '',
  onChange,
  placeholder = 'Start typing...',
  minHeight = 320,
  className = '',
  ariaLabel = 'Document text'
}) {
  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);
  const historyRef = useRef({ stack: [], index: -1 });
  const skipSyncRef = useRef(false);

  const [fontFamily, setFontFamily] = useState(EDITOR_BASE_FONT);
  const [fontSize, setFontSize] = useState(String(EDITOR_BASE_SIZE));
  const [fontSizeInput, setFontSizeInput] = useState(String(EDITOR_BASE_SIZE));
  const [lineHeight, setLineHeight] = useState(EDITOR_BASE_LINE_HEIGHT);
  const [align, setAlign] = useState('left');
  const [marks, setMarks] = useState({ bold: false, italic: false, underline: false, strike: false, sub: false, sup: false, ul: false, ol: false });
  const [textColor, setTextColor] = useState('#1e293b');
  const [highlight, setHighlight] = useState('#fef08a');
  const [openPicker, setOpenPicker] = useState(null); // 'text' | 'highlight' | 'styles' | null

  // The value only seeds the editor: typing must never be interrupted by a re-render
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || skipSyncRef.current) return;
    const html = toEditorHtml(value);
    if (editor.innerHTML !== html) editor.innerHTML = html;
    historyRef.current = { stack: [html], index: 0 };
  }, [value]);

  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest?.('[data-bex-picker]')) setOpenPicker(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  /**
   * Browsers sometimes leave a list inside the paragraph it was made from (`<p><ul>...</ul></p>`), which is
   * invalid and falls apart when the document is rendered again. Lift those lists out and drop what is left empty.
   */
  const normalizeBlocks = (editor) => {
    if (!editor) return;
    editor.querySelectorAll('p > ul, p > ol').forEach((list) => {
      const paragraph = list.parentElement;
      paragraph.parentNode.insertBefore(list, paragraph);
      if (!paragraph.textContent.trim() && !paragraph.querySelector('img, br + *')) paragraph.remove();
    });
  };

  const emit = () => {
    const editor = editorRef.current;
    if (!editor || !onChange) return;
    normalizeBlocks(editor);
    skipSyncRef.current = true;
    onChange(cleanEditorHtml(editor));
    // Let the next value land without rewriting the DOM under the cursor
    setTimeout(() => { skipSyncRef.current = false; }, 0);
  };

  const pushHistory = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const html = editor.innerHTML;
    const h = historyRef.current;
    if (h.stack[h.index] === html) return;
    h.stack = h.stack.slice(0, h.index + 1).concat(html).slice(-60);
    h.index = h.stack.length - 1;
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  /**
   * Puts the cursor back where the toolbar action should apply: whatever is selected in the text right now,
   * or - when the click moved the focus out of it - the selection as it was before.
   */
  const focusSelection = () => {
    const editor = editorRef.current;
    if (!editor) return null;
    const live = window.getSelection();
    const liveInside = live && live.rangeCount > 0 && editor.contains(live.getRangeAt(0).commonAncestorContainer);
    const liveRange = liveInside ? live.getRangeAt(0).cloneRange() : null;
    editor.focus();
    const sel = window.getSelection();
    const fallback = savedRangeRef.current && editor.contains(savedRangeRef.current.commonAncestorContainer)
      ? savedRangeRef.current
      : null;
    const range = liveRange || fallback;
    if (range) {
      sel.removeAllRanges();
      sel.addRange(range);
      savedRangeRef.current = range.cloneRange();
    } else {
      setCaretOffsets(editor, null);
    }
    return window.getSelection();
  };

  /** Reads the formatting of whatever is selected, so the toolbar shows the truth. */
  const readFormatting = () => {
    const editor = editorRef.current;
    if (!editor) return;
    try {
      setMarks({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
        sub: document.queryCommandState('subscript'),
        sup: document.queryCommandState('superscript'),
        ul: document.queryCommandState('insertUnorderedList'),
        ol: document.queryCommandState('insertOrderedList')
      });
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !editor.contains(sel.getRangeAt(0).startContainer)) return;
      const range = sel.getRangeAt(0);
      const textEl = selectionStyleElement(range, editor);
      const computed = window.getComputedStyle(textEl);
      if (computed.fontFamily) setFontFamily(computed.fontFamily);
      const px = Math.round(parseFloat(computed.fontSize));
      if (px) {
        setFontSize(String(px));
        if (document.activeElement?.dataset?.bexSizeInput !== 'true') setFontSizeInput(String(px));
      }
      const block = textEl.closest('p, div, h1, h2, h3, h4, h5, h6, li, blockquote') || editor;
      const blockStyle = window.getComputedStyle(block);
      const a = String(blockStyle.textAlign || 'left');
      setAlign(/center/.test(a) ? 'center' : (/right|end/.test(a) ? 'right' : (a === 'justify' ? 'justify' : 'left')));
      const ratio = parseFloat(blockStyle.lineHeight) / parseFloat(blockStyle.fontSize);
      if (ratio) {
        setLineHeight(LINE_SPACING_OPTIONS.reduce((best, opt) => (Math.abs(Number(opt) - ratio) < Math.abs(Number(best) - ratio) ? opt : best)));
      }
    } catch (e) {
      // Selection APIs throw in some states; the toolbar simply keeps its last values
    }
  };

  const afterChange = () => {
    pushHistory();
    readFormatting();
    emit();
  };

  const runCommand = (command, commandValue = null) => {
    if (!focusSelection()) return;
    document.execCommand(command, false, commandValue);
    saveSelection();
    afterChange();
  };

  /** Font family and size go through the shared helpers so a selection is styled exactly, never the whole block. */
  const applyInlineStyle = (prop, styleValue) => {
    const editor = editorRef.current;
    const sel = focusSelection();
    if (!editor || !sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const next = range.collapsed
      ? styleAtCaret(range, prop, styleValue, editor)
      : styleSelectedText(range, prop, styleValue, editor);
    if (next) {
      sel.removeAllRanges();
      sel.addRange(next);
    }
    saveSelection();
    afterChange();
  };

  const applyFontSize = (input) => {
    const raw = parseInt(String(input).replace(/[^0-9]/g, ''), 10);
    if (!raw) {
      setFontSizeInput(fontSize);
      return;
    }
    const size = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, raw));
    setFontSize(String(size));
    setFontSizeInput(String(size));
    applyInlineStyle('fontSize', `${size}px`);
  };

  /** One step from the size of the text right now, read from the document so quick clicks cannot race the state. */
  const stepFontSize = (delta) => {
    const editor = editorRef.current;
    let current = parseInt(fontSizeInput, 10) || parseInt(fontSize, 10) || EDITOR_BASE_SIZE;
    try {
      const range = savedRangeRef.current;
      if (editor && range && editor.contains(range.commonAncestorContainer)) {
        const px = Math.round(parseFloat(window.getComputedStyle(selectionStyleElement(range, editor)).fontSize));
        if (px) current = px;
      }
    } catch (e) {
      // Keep the value shown in the size box
    }
    applyFontSize(current + delta);
  };

  const applyColor = (command, color) => {
    if (!focusSelection()) return;
    document.execCommand('styleWithCSS', false, true);
    if (command === 'foreColor') {
      document.execCommand('foreColor', false, color);
      setTextColor(color);
    } else if (!document.execCommand('hiliteColor', false, color)) {
      document.execCommand('backColor', false, color);
      setHighlight(color);
    } else {
      setHighlight(color);
    }
    setOpenPicker(null);
    saveSelection();
    afterChange();
  };

  const applyLineHeight = (lh) => {
    const editor = editorRef.current;
    const sel = focusSelection();
    if (!editor || !sel || sel.rangeCount === 0) return;
    selectedBlocks(sel.getRangeAt(0), editor).forEach((block) => { block.style.lineHeight = lh; });
    setLineHeight(lh);
    saveSelection();
    afterChange();
  };

  const applyBlockStyle = (tag) => {
    setOpenPicker(null);
    runCommand('formatBlock', `<${tag}>`);
  };

  const restore = (direction) => {
    const editor = editorRef.current;
    const h = historyRef.current;
    const nextIndex = h.index + direction;
    if (!editor || nextIndex < 0 || nextIndex >= h.stack.length) return;
    const offsets = getCaretOffsets(editor);
    h.index = nextIndex;
    editor.innerHTML = h.stack[nextIndex];
    setCaretOffsets(editor, offsets);
    readFormatting();
    emit();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    focusSelection();
    if (html) document.execCommand('insertHTML', false, sanitizePastedHtml(html));
    else if (text.includes('\n')) document.execCommand('insertHTML', false, plainTextToParagraphs(text));
    else document.execCommand('insertText', false, text);
    saveSelection();
    afterChange();
  };

  const handleKeyDown = (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      restore(e.shiftKey ? 1 : -1);
    } else if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      restore(1);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      runCommand(e.shiftKey ? 'outdent' : 'indent');
    }
  };

  const currentFont = fontOptionValue(fontFamily) || fontFamily;
  const isEmpty = !String(value || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();

  return (
    <div className={`border border-slate-300 rounded-xl overflow-hidden bg-white ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50">
        <ToolbarButton onClick={() => restore(-1)} title="Undo (Ctrl+Z)"><Undo size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => restore(1)} title="Redo (Ctrl+Y)"><Redo size={14} /></ToolbarButton>
        <Divider />

        <select
          value={currentFont}
          onFocus={saveSelection}
          onChange={(e) => { setFontFamily(e.target.value); applyInlineStyle('fontFamily', e.target.value); }}
          title="Font of the selected text"
          aria-label="Font"
          className="p-1 text-xs border border-slate-200 rounded bg-white hover:border-slate-300 focus:border-[#007355] outline-none font-semibold text-slate-700 cursor-pointer max-w-[118px] truncate"
        >
          {!fontOptionValue(fontFamily) && <option value={fontFamily}>{primaryFontName(fontFamily) || 'Default'}</option>}
          {FONT_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.fonts.map(([label, val]) => <option key={val} value={val} style={{ fontFamily: val }}>{label}</option>)}
            </optgroup>
          ))}
        </select>

        <div className="flex items-center ml-1">
          <ToolbarButton onClick={() => stepFontSize(-1)} title="Smaller"><Minus size={13} /></ToolbarButton>
          <input
            data-bex-size-input="true"
            value={fontSizeInput}
            onFocus={saveSelection}
            onChange={(e) => setFontSizeInput(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={() => applyFontSize(fontSizeInput)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyFontSize(fontSizeInput); } }}
            title="Size of the selected text (px)"
            aria-label="Font size in pixels"
            className="w-10 text-center text-xs font-semibold border border-slate-200 rounded py-1 focus:border-[#007355] outline-none"
          />
          <ToolbarButton onClick={() => stepFontSize(1)} title="Bigger"><Plus size={13} /></ToolbarButton>
        </div>
        <Divider />

        <ToolbarButton onClick={() => runCommand('bold')} active={marks.bold} title="Bold (Ctrl+B)"><Bold size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => runCommand('italic')} active={marks.italic} title="Italic (Ctrl+I)"><Italic size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => runCommand('underline')} active={marks.underline} title="Underline (Ctrl+U)"><Underline size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => runCommand('strikeThrough')} active={marks.strike} title="Strikethrough"><Strikethrough size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => runCommand('subscript')} active={marks.sub} title="Subscript"><Subscript size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => runCommand('superscript')} active={marks.sup} title="Superscript"><Superscript size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => runCommand('removeFormat')} title="Clear formatting"><RemoveFormatting size={14} /></ToolbarButton>
        <Divider />

        {/* Text colour */}
        <div className="relative" data-bex-picker>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
            onClick={() => setOpenPicker(openPicker === 'text' ? null : 'text')}
            title="Text colour"
            aria-label="Text colour"
            className="flex items-center gap-0.5 p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
          >
            <Baseline size={14} />
            <span className="w-3 h-1.5 rounded-sm border border-slate-300" style={{ background: textColor }} />
            <ChevronDown size={11} />
          </button>
          {openPicker === 'text' && (
            <div className="absolute left-0 top-full mt-1 z-30 w-52 p-2 bg-white border border-slate-200 rounded-lg shadow-xl grid grid-cols-7 gap-1">
              {TEXT_COLORS.map((c) => (
                <button key={c} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyColor('foreColor', c)}
                  title={c} aria-label={`Text colour ${c}`} className="w-5 h-5 rounded border border-slate-200 hover:scale-110 transition cursor-pointer" style={{ background: c }} />
              ))}
            </div>
          )}
        </div>

        {/* Highlight */}
        <div className="relative" data-bex-picker>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
            onClick={() => setOpenPicker(openPicker === 'highlight' ? null : 'highlight')}
            title="Highlight colour"
            aria-label="Highlight colour"
            className="flex items-center gap-0.5 p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
          >
            <Highlighter size={14} />
            <span className="w-3 h-1.5 rounded-sm border border-slate-300" style={{ background: highlight }} />
            <ChevronDown size={11} />
          </button>
          {openPicker === 'highlight' && (
            <div className="absolute left-0 top-full mt-1 z-30 w-44 p-2 bg-white border border-slate-200 rounded-lg shadow-xl">
              <div className="grid grid-cols-5 gap-1">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button key={c} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyColor('hiliteColor', c)}
                    title={c} aria-label={`Highlight ${c}`} className="w-5 h-5 rounded border border-slate-200 hover:scale-110 transition cursor-pointer" style={{ background: c }} />
                ))}
              </div>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyColor('hiliteColor', 'transparent')}
                className="mt-2 w-full text-[11px] font-semibold text-slate-600 hover:text-slate-900 py-1 rounded hover:bg-slate-100 cursor-pointer">
                No highlight
              </button>
            </div>
          )}
        </div>
        <Divider />

        <ToolbarButton onClick={() => runCommand('justifyLeft')} active={align === 'left'} title="Align left"><AlignLeft size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => runCommand('justifyCenter')} active={align === 'center'} title="Centre"><AlignCenter size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => runCommand('justifyRight')} active={align === 'right'} title="Align right"><AlignRight size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => runCommand('justifyFull')} active={align === 'justify'} title="Justify"><AlignJustify size={14} /></ToolbarButton>

        <select
          value={lineHeight}
          onFocus={saveSelection}
          onChange={(e) => applyLineHeight(e.target.value)}
          title="Line spacing"
          aria-label="Line spacing"
          className="ml-1 p-1 text-xs border border-slate-200 rounded bg-white focus:border-[#007355] outline-none font-semibold text-slate-700 cursor-pointer"
        >
          {LINE_SPACING_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}{opt === '1.6' ? ' (Standard)' : ''}</option>)}
        </select>
        <Divider />

        <ToolbarButton onClick={() => runCommand('insertUnorderedList')} active={marks.ul} title="Bulleted list"><List size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => runCommand('insertOrderedList')} active={marks.ol} title="Numbered list"><ListOrdered size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => runCommand('outdent')} title="Decrease indent"><Outdent size={14} /></ToolbarButton>
        <ToolbarButton onClick={() => runCommand('indent')} title="Increase indent"><Indent size={14} /></ToolbarButton>
        <Divider />

        {/* Paragraph styles */}
        <div className="relative" data-bex-picker>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
            onClick={() => setOpenPicker(openPicker === 'styles' ? null : 'styles')}
            title="Paragraph style"
            className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
          >
            <Type size={13} />
            <span className="hidden sm:inline">Styles</span>
            <ChevronDown size={11} />
          </button>
          {openPicker === 'styles' && (
            <div className="absolute right-0 top-full mt-1 z-30 w-44 py-1 bg-white border border-slate-200 rounded-lg shadow-xl">
              {BLOCK_STYLES.map((style) => (
                <button key={style.tag} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyBlockStyle(style.tag)}
                  className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer">
                  {style.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Writing surface */}
      <div className="relative bg-white">
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 px-4 py-3 text-xs text-slate-400 whitespace-pre-line">{placeholder}</div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel}
          onInput={() => { settlePendingSpans(editorRef.current); pushHistory(); emit(); }}
          onKeyUp={() => { saveSelection(); readFormatting(); }}
          onMouseUp={() => { saveSelection(); readFormatting(); }}
          onBlur={() => { saveSelection(); emit(); }}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          className="px-4 py-3 text-sm text-slate-800 outline-none overflow-y-auto bex-rich-text"
          style={{
            minHeight,
            maxHeight: '48vh',
            fontFamily: EDITOR_BASE_FONT,
            fontSize: `${EDITOR_BASE_SIZE}px`,
            lineHeight: EDITOR_BASE_LINE_HEIGHT
          }}
        />
      </div>
    </div>
  );
}
