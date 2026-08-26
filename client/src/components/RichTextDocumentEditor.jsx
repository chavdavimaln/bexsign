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
  CheckCircle2,
  FileText
} from 'lucide-react';

export default function RichTextDocumentEditor({ onBack }) {
  const navigate = useNavigate();
  const [fileName, setFileName] = useState('Document 1');
  const [fontFamily, setFontFamily] = useState('Verdana');
  const [fontSize, setFontSize] = useState('14');
  const [textColor, setTextColor] = useState('#0f172a');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const editorRef = useRef(null);

  // Formatting helpers
  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value);
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
        navigate(`/documents/${data.documentId}/edit`);
      } else {
        navigate('/documents/1/edit');
      }
    } catch (e) {
      console.warn('Save fallback:', e);
      navigate('/documents/1/edit');
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
          onClick={() => applyFormat('bold')}
          className="p-1.5 hover:bg-slate-200 rounded text-slate-800 font-bold"
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => applyFormat('italic')}
          className="p-1.5 hover:bg-slate-200 rounded text-slate-800 italic"
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </button>
        <button
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

        {/* Font Size Dropdown */}
        <select
          value={fontSize}
          onChange={(e) => {
            setFontSize(e.target.value);
            applyFormat('fontSize', '3');
          }}
          className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-medium focus:outline-none"
        >
          <option value="10">10</option>
          <option value="12">12</option>
          <option value="14">14</option>
          <option value="16">16</option>
          <option value="18">18</option>
          <option value="20">20</option>
          <option value="24">24</option>
          <option value="32">32</option>
        </select>

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

      {/* Main Rich Text Content Editable Sheet Container */}
      <main className="flex-1 p-8 overflow-y-auto flex justify-center items-start bg-slate-100">
        <div className="w-[800px] min-h-[950px] bg-white border border-slate-300 rounded-sm shadow-xl p-12 relative">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="w-full min-h-[850px] outline-none font-sans text-slate-800 text-sm leading-relaxed"
            style={{ fontFamily }}
          >
            <p className="text-slate-400 italic">
              Type or paste your document content here... Or click <strong>AI Writer</strong> above to generate a standard agreement draft.
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Footer Bar (Matching Image 2 buttons) */}
      <footer className="h-16 bg-white border-t border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveAndCreate}
            className="bg-[#2d9d78] hover:bg-[#237d60] text-white px-6 py-2.5 rounded text-sm font-bold transition shadow-xs flex items-center gap-2"
          >
            <CheckCircle2 size={16} /> Save & Create
          </button>
          <button
            onClick={() => {
              alert('Generating PDF preview...');
              handleSaveAndCreate();
            }}
            className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded text-sm font-semibold transition"
          >
            Preview as PDF
          </button>
        </div>
        <span className="text-xs text-slate-400 font-medium">Bexsign Rich Text Content Editor</span>
      </footer>
    </div>
  );
}
