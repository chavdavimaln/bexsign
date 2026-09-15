import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Image as ImageIcon,
  Link as LinkIcon,
  Code,
  Quote,
  Table,
  RotateCcw,
  RotateCw,
  Plus,
  Minus,
  CheckCircle2,
  FileText,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers
} from 'lucide-react';

export default function RichTextDocumentEditor({ onBack }) {
  const navigate = useNavigate();
  const [fileName, setFileName] = useState('Document 1');
  const [fontFamily, setFontFamily] = useState('Verdana');
  const [fontSize, setFontSize] = useState('14');
  const [fontSizeInput, setFontSizeInput] = useState('14');
  const [textColor, setTextColor] = useState('#0f172a');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const editorRef = useRef(null);
  const savedSelectionRef = useRef(null);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current && editorRef.current.contains(sel.anchorNode)) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (savedSelectionRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRef.current);
      }
    }
  };

  // Formatting helpers
  const applyFormat = (command, value = null) => {
    if (editorRef.current) editorRef.current.focus();
    restoreSelection();
    document.execCommand(command, false, value);
    saveSelection();
  };

  const applyFontSize = (sizeInput) => {
    const rawNum = parseInt(String(sizeInput).replace(/[^0-9]/g, ''), 10);
    if (!rawNum || isNaN(rawNum)) return;
    const numericSize = Math.max(8, Math.min(96, rawNum));
    const pxSize = `${numericSize}px`;

    setFontSize(String(numericSize));
    setFontSizeInput(String(numericSize));

    if (editorRef.current) editorRef.current.focus();
    restoreSelection();

    let sel = window.getSelection();
    let range = null;
    if (sel && sel.rangeCount > 0) {
      range = sel.getRangeAt(0);
    }

    const isInsideEditor = range && editorRef.current && editorRef.current.contains(range.commonAncestorContainer);

    if (isInsideEditor && !range.collapsed) {
      document.execCommand('styleWithCSS', false, false);
      document.execCommand('fontSize', false, '7');

      const createdSpans = [];
      if (editorRef.current) {
        const query = 'font[size="7"], font[size="+7"], span[style*="-webkit-xxx-large"], span[style*="xxx-large"]';
        const matched = Array.from(editorRef.current.querySelectorAll(query));
        if (matched.length > 0) {
          matched.forEach((el) => {
            const span = document.createElement('span');
            span.style.fontSize = pxSize;
            span.querySelectorAll('*').forEach((child) => {
              if (child.style && child.style.fontSize) child.style.fontSize = '';
              if (child.tagName === 'FONT') child.removeAttribute('size');
            });
            while (el.firstChild) {
              span.appendChild(el.firstChild);
            }
            el.parentNode.replaceChild(span, el);
            createdSpans.push(span);
          });
        }
      }

      if (createdSpans.length > 0) {
        try {
          const newRange = document.createRange();
          newRange.setStartBefore(createdSpans[0]);
          newRange.setEndAfter(createdSpans[createdSpans.length - 1]);
          sel.removeAllRanges();
          sel.addRange(newRange);
          savedSelectionRef.current = newRange.cloneRange();
        } catch (e) {
          saveSelection();
        }
      }
    } else if (isInsideEditor && range.collapsed) {
      let container = range.startContainer;
      if (container && container.nodeType === 3) {
        container = container.parentNode;
      }
      const block = container ? container.closest('p, h1, h2, h3, h4, h5, h6, li, td, th') : null;
      if (block && block !== editorRef.current) {
        block.style.fontSize = pxSize;
        block.querySelectorAll('span, font').forEach((child) => {
          if (child.style && child.style.fontSize) child.style.fontSize = '';
          if (child.tagName === 'FONT') child.removeAttribute('size');
        });
      } else if (container && container !== editorRef.current) {
        container.style.fontSize = pxSize;
      } else if (editorRef.current) {
        editorRef.current.style.fontSize = pxSize;
      }
      saveSelection();
    } else if (editorRef.current) {
      editorRef.current.style.fontSize = pxSize;
    }
  };

  const updateCounts = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const words = text.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
    setCharCount(text.length);
  };

  // AI Auto-Draft Generator
  const handleAiDraft = () => {
    setIsAiLoading(true);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = `
          <h1 style="font-size: 22px; font-weight: bold; text-align: center; color: #0f172a; margin-bottom: 16px;">
            STANDARD SERVICE & CONSULTING AGREEMENT
          </h1>
          <p style="font-size: 14px; line-height: 1.6; margin-bottom: 12px;">
            This Service Agreement ("Agreement") is made effective as of <strong>${new Date().toLocaleDateString()}</strong>, by and between <strong>Bexsign Inc.</strong> ("Client") and the undersigned Service Provider.
          </p>
          <h3 style="font-size: 16px; font-weight: bold; margin-top: 16px; margin-bottom: 8px;">1. Scope of Services</h3>
          <p style="font-size: 14px; line-height: 1.6; margin-bottom: 12px;">
            Service Provider agrees to perform technical design, software development, and documentation workflow management services as described in Exhibit A.
          </p>
          <h3 style="font-size: 16px; font-weight: bold; margin-top: 16px; margin-bottom: 8px;">2. Compensation & Terms</h3>
          <p style="font-size: 14px; line-height: 1.6; margin-bottom: 12px;">
            Client agrees to remit payment within 30 days of receiving a valid invoice. All work produced under this Agreement remains the exclusive property of Client.
          </p>
          <h3 style="font-size: 16px; font-weight: bold; margin-top: 16px; margin-bottom: 8px;">3. Confidentiality</h3>
          <p style="font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Both parties agree to maintain strict confidentiality regarding proprietary codebase, business models, and customer information.
          </p>
          <br/>
        `;
        updateCounts();
      }
      setIsAiLoading(false);
      setStatusMsg('AI Draft generated successfully!');
      setTimeout(() => setStatusMsg(''), 3000);
    }, 600);
  };

  const handleSaveAndCreate = async () => {
    const htmlContent = editorRef.current ? editorRef.current.innerHTML : '';
    if (!fileName) {
      alert('Please enter a document file name.');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentName: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
          htmlContent,
          status: 'Draft',
          userId: 1
        })
      });
      const data = await res.json();
      if (data.documentId) {
        navigate(`/documents/${data.documentId}/send`, {
          state: {
            fromCreate: true,
            docName: fileName,
            docContent: htmlContent,
            docId: data.documentId
          }
        });
      } else {
        navigate('/send-for-signatures');
      }
    } catch (e) {
      console.warn('Save fallback:', e);
      navigate('/send-for-signatures');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 -m-6">
      {/* Top Header Bar (Matching Image 2) */}
      <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center gap-4 shrink-0 shadow-2xs">
        <button
          onClick={onBack || (() => navigate('/documents/create'))}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
          title="Back to Create Document"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">Create document</h1>
      </header>

      {/* File Name Row */}
      <div className="bg-white px-8 py-3 border-b border-slate-200 flex items-center gap-6 shrink-0">
        <label className="text-xs font-bold text-slate-700 w-20">File name</label>
        <input
          type="text"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          placeholder="Enter name"
          className="w-72 px-3 py-1.5 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
        />
        {statusMsg && (
          <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1 rounded border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 size={14} /> {statusMsg}
          </span>
        )}
      </div>

      {/* Rich Text Editor Toolbar (Matching Image 2 icons & controls) */}
      <div className="bg-slate-50 px-6 py-2 border-b border-slate-200 flex flex-wrap items-center gap-1 text-slate-700 shrink-0 shadow-2xs">
        {/* AI Generator Button */}
        <button
          onClick={handleAiDraft}
          disabled={isAiLoading}
          className="p-1.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition font-bold text-xs flex items-center gap-1 mr-2"
          title="AI Document Writer"
        >
          <Sparkles size={16} className="text-purple-600 animate-pulse" />
          <span>{isAiLoading ? 'Drafting...' : 'AI Writer'}</span>
        </button>

        <div className="h-5 w-px bg-slate-300 mx-1" />

        {/* Basic Styles */}
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormat('bold')}
          className="p-1.5 hover:bg-slate-200 rounded text-slate-800 font-bold"
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormat('italic')}
          className="p-1.5 hover:bg-slate-200 rounded text-slate-800 italic"
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormat('underline')}
          className="p-1.5 hover:bg-slate-200 rounded text-slate-800 underline"
          title="Underline (Ctrl+U)"
        >
          <Underline size={16} />
        </button>

        <div className="h-5 w-px bg-slate-300 mx-1" />

        {/* Font Family Dropdown */}
        <select
          value={fontFamily}
          onChange={(e) => {
            setFontFamily(e.target.value);
            applyFormat('fontName', e.target.value);
          }}
          className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-medium focus:outline-none"
        >
          <option value="Verdana">Verdana</option>
          <option value="Inter">Inter</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Courier New">Courier New</option>
          <option value="Times New Roman">Times New Roman</option>
        </select>

        {/* Font Size Controls */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
            }}
            onClick={() => {
              const curr = parseInt(fontSizeInput || fontSize || '14', 10);
              const next = Math.max(8, curr - 1);
              applyFontSize(next);
            }}
            className="p-1 hover:bg-slate-200 rounded text-slate-700 w-6 h-6 flex items-center justify-center border border-slate-300"
            title="Decrease Font Size"
          >
            <Minus size={12} />
          </button>

          <input
            type="text"
            value={fontSizeInput}
            onChange={(e) => setFontSizeInput(e.target.value)}
            onMouseDown={() => saveSelection()}
            onFocus={() => saveSelection()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyFontSize(fontSizeInput);
                e.target.blur();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const curr = parseInt(fontSizeInput || fontSize || '14', 10);
                applyFontSize(Math.min(96, curr + 1));
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const curr = parseInt(fontSizeInput || fontSize || '14', 10);
                applyFontSize(Math.max(8, curr - 1));
              }
            }}
            onBlur={() => {
              const rawNum = parseInt(String(fontSizeInput).replace(/[^0-9]/g, ''), 10);
              if (rawNum && !isNaN(rawNum)) {
                applyFontSize(rawNum);
              } else {
                setFontSizeInput(fontSize);
              }
            }}
            className="w-8 text-center text-xs font-semibold py-1 border border-slate-300 rounded focus:outline-none"
            title="Type font size in px and press Enter"
          />

          <select
            value={fontSize}
            onChange={(e) => {
              applyFontSize(e.target.value);
            }}
            className="px-1 py-1 bg-white border border-slate-300 rounded text-xs font-medium focus:outline-none cursor-pointer"
          >
            <option value="8">8 px</option>
            <option value="10">10 px</option>
            <option value="12">12 px</option>
            <option value="14">14 px</option>
            <option value="16">16 px</option>
            <option value="18">18 px</option>
            <option value="20">20 px</option>
            <option value="24">24 px</option>
            <option value="28">28 px</option>
            <option value="32">32 px</option>
            <option value="36">36 px</option>
            <option value="48">48 px</option>
          </select>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
            }}
            onClick={() => {
              const curr = parseInt(fontSizeInput || fontSize || '14', 10);
              const next = Math.min(96, curr + 1);
              applyFontSize(next);
            }}
            className="p-1 hover:bg-slate-200 rounded text-slate-700 w-6 h-6 flex items-center justify-center border border-slate-300"
            title="Increase Font Size"
          >
            <Plus size={12} />
          </button>
        </div>

        <div className="h-5 w-px bg-slate-300 mx-1" />

        {/* Text Color & Highlight */}
        <label className="p-1.5 hover:bg-slate-200 rounded cursor-pointer text-xs font-black" title="Text Color">
          <span className="underline decoration-[#E71414] decoration-2">A</span>
          <input
            type="color"
            value={textColor}
            onChange={(e) => {
              setTextColor(e.target.value);
              applyFormat('foreColor', e.target.value);
            }}
            className="hidden"
          />
        </label>
        <label className="p-1.5 hover:bg-slate-200 rounded cursor-pointer text-xs font-black bg-amber-100" title="Background Fill">
          <span>A</span>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => {
              setBgColor(e.target.value);
              applyFormat('hiliteColor', e.target.value);
            }}
            className="hidden"
          />
        </label>

        <div className="h-5 w-px bg-slate-300 mx-1" />

        {/* Alignment */}
        <button onClick={() => applyFormat('justifyLeft')} className="p-1.5 hover:bg-slate-200 rounded" title="Align Left">
          <AlignLeft size={16} />
        </button>
        <button onClick={() => applyFormat('justifyCenter')} className="p-1.5 hover:bg-slate-200 rounded" title="Align Center">
          <AlignCenter size={16} />
        </button>
        <button onClick={() => applyFormat('justifyRight')} className="p-1.5 hover:bg-slate-200 rounded" title="Align Right">
          <AlignRight size={16} />
        </button>
        <button onClick={() => applyFormat('justifyFull')} className="p-1.5 hover:bg-slate-200 rounded" title="Justify">
          <AlignJustify size={16} />
        </button>

        <div className="h-5 w-px bg-slate-300 mx-1" />

        {/* Lists & Indents */}
        <button onClick={() => applyFormat('insertUnorderedList')} className="p-1.5 hover:bg-slate-200 rounded" title="Bullet List">
          <List size={16} />
        </button>
        <button onClick={() => applyFormat('insertOrderedList')} className="p-1.5 hover:bg-slate-200 rounded" title="Numbered List">
          <ListOrdered size={16} />
        </button>
        <button onClick={() => applyFormat('indent')} className="p-1.5 hover:bg-slate-200 rounded" title="Indent">
          <Indent size={16} />
        </button>
        <button onClick={() => applyFormat('outdent')} className="p-1.5 hover:bg-slate-200 rounded" title="Outdent">
          <Outdent size={16} />
        </button>

        <div className="h-5 w-px bg-slate-300 mx-1" />

        {/* Media, Links & Extras */}
        <button
          onClick={() => {
            const url = prompt('Enter Image URL:');
            if (url) applyFormat('insertImage', url);
          }}
          className="p-1.5 hover:bg-slate-200 rounded"
          title="Insert Image"
        >
          <ImageIcon size={16} />
        </button>
        <button
          onClick={() => {
            const url = prompt('Enter Link URL:');
            if (url) applyFormat('createLink', url);
          }}
          className="p-1.5 hover:bg-slate-200 rounded"
          title="Insert Link"
        >
          <LinkIcon size={16} />
        </button>
        <button onClick={() => applyFormat('formatBlock', 'pre')} className="p-1.5 hover:bg-slate-200 rounded" title="Insert Code Block">
          <Code size={16} />
        </button>
        <button onClick={() => applyFormat('formatBlock', 'blockquote')} className="p-1.5 hover:bg-slate-200 rounded" title="Insert Quote">
          <Quote size={16} />
        </button>
        <button onClick={() => applyFormat('undo')} className="p-1.5 hover:bg-slate-200 rounded" title="Undo">
          <RotateCcw size={16} />
        </button>
        <button onClick={() => applyFormat('redo')} className="p-1.5 hover:bg-slate-200 rounded" title="Redo">
          <RotateCw size={16} />
        </button>
      </div>

      {/* Main Rich Text Content Editable Sheet Container (Standard A4: 210mm x 297mm = 794px x 1123px) */}
      <main className="flex-1 p-6 sm:p-10 overflow-y-auto flex flex-col items-center bg-slate-200/80 print:p-0 print:bg-white">
        {/* MS Word Horizontal Ruler (Standard A4: 210mm / 794px) */}
        <div
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease'
          }}
          className="w-[794px] mb-2 bg-slate-100 border border-slate-300 rounded-t-xs shadow-2xs select-none text-[9px] text-slate-500 font-mono flex items-center justify-between px-1 h-5 relative overflow-hidden print:hidden"
        >
          {/* Left Margin Shading (1 inch / 25.4mm) */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-slate-200/90 border-r border-slate-300 flex items-center justify-center text-[8px] text-slate-400 font-bold">
            ◀ L
          </div>
          {/* Centered Numbers / Ticks across 210mm */}
          <div className="flex-1 flex justify-between px-14 text-slate-400 font-medium">
            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span><span>11</span><span>12</span><span>13</span><span>14</span><span>15</span><span>16</span><span>17</span><span>18</span>
          </div>
          {/* Right Margin Shading */}
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-slate-200/90 border-l border-slate-300 flex items-center justify-center text-[8px] text-slate-400 font-bold">
            R ▶
          </div>
        </div>

        {/* Authentic A4 Page Sheet Canvas (210mm x 297mm = 794px x 1123px) */}
        <div
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease'
          }}
          className="w-[794px] min-h-[1123px] max-w-[794px] bg-white border border-slate-300 rounded-xs shadow-[0_4px_30px_rgba(0,0,0,0.18)] p-12 sm:p-14 relative flex flex-col justify-between select-text"
        >
          {/* Word Document Header Line */}
          <div className="border-b border-slate-200 pb-3 mb-6 flex justify-between items-center text-[10px] text-slate-400 font-mono select-none">
            <span className="font-bold text-slate-600 uppercase tracking-wider">{fileName.replace(/\.pdf$/i, '')}</span>
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-semibold">
              A4 Standard • 210 × 297 mm
            </span>
          </div>

          {/* Document Content Area */}
          <div className="flex-1 flex flex-col">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={updateCounts}
              onKeyUp={updateCounts}
              className="w-full min-h-[920px] outline-none font-sans text-slate-800 text-sm leading-relaxed cursor-text"
              style={{ fontFamily, fontSize: `${fontSize}px` }}
            >
              <p className="text-slate-400 italic">
                Type or paste your document content here... Or click <strong>AI Writer</strong> above to generate a standard agreement draft.
              </p>
            </div>
          </div>

          {/* Word Document Footer Line */}
          <div className="border-t border-slate-200 pt-3 mt-6 flex justify-between items-center text-[10px] text-slate-400 font-mono select-none">
            <span>Page 1 of 1 • BexSign Word Document Editor</span>
            <span>210 × 297 mm • MS Word Standard</span>
          </div>
        </div>
      </main>

      {/* Bottom Status Bar with Word/Char Stats and Zoom (Matching MS Word Status Bar) */}
      <footer className="h-12 bg-white border-t border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-md text-xs text-slate-600 select-none">
        <div className="flex items-center gap-4">
          <button
            onClick={handleSaveAndCreate}
            className="bg-[#2d9d78] hover:bg-[#237d60] text-white px-4 py-1.5 rounded text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 size={15} /> Save & Create
          </button>
          <button
            onClick={() => {
              alert('Generating PDF preview...');
              handleSaveAndCreate();
            }}
            className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3.5 py-1.5 rounded text-xs font-semibold transition cursor-pointer"
          >
            Preview as PDF
          </button>
          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />
          <span className="hidden sm:inline text-slate-500 font-medium">Page 1 of 1</span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span className="hidden sm:inline text-slate-700 font-semibold">{wordCount} words</span>
          <span className="hidden md:inline text-slate-300">•</span>
          <span className="hidden md:inline text-slate-500">{charCount} characters</span>
        </div>

        {/* Right: A4 Badge and Zoom Controls */}
        <div className="flex items-center gap-2.5">
          <span className="text-[#007355] font-mono text-[10px] font-bold px-2 py-0.5 bg-emerald-50 rounded border border-emerald-200">
            A4 (210 × 297 mm)
          </span>
          <div className="h-4 w-px bg-slate-200 mx-1" />
          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
            className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="font-mono text-[11px] text-slate-600 w-9 text-center">{zoomLevel}%</span>
          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.min(150, prev + 10))}
            className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(100)}
            className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
            title="Reset Zoom (100%)"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </footer>
    </div>
  );
}
