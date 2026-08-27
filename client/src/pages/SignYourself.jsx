import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, PenTool, CheckCircle2, Download, ArrowRight, Save, Calendar, User, FileText, ChevronDown, MoreVertical, Edit, RotateCcw, Trash2, CheckSquare, Layers, X, GripVertical } from 'lucide-react';

export default function SignYourself() {
  const navigate = useNavigate();
  const [documentTitle, setDocumentTitle] = useState('test.pdf');
  const [docList, setDocList] = useState([
    { id: 1, name: 'test', selected: true },
    { id: 2, name: 'test 3', selected: true }
  ]);
  const [selectAll, setSelectAll] = useState(true);
  const [showAddDocDropdown, setShowAddDocDropdown] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergedDocName, setMergedDocName] = useState('sign doc 1');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleFileChange = (e) => {
    const uploaded = e.target.files[0];
    if (uploaded) {
      const newDoc = {
        id: Date.now(),
        name: uploaded.name.replace(/\.[^/.]+$/, ''),
        selected: true
      };
      setDocList([...docList, newDoc]);
      setDocumentTitle(uploaded.name);
    }
  };

  const toggleSelectAll = () => {
    const nextVal = !selectAll;
    setSelectAll(nextVal);
    setDocList(docList.map(d => ({ ...d, selected: nextVal })));
  };

  const toggleDocSelection = (id) => {
    setDocList(docList.map(d => d.id === id ? { ...d, selected: !d.selected } : d));
  };

  const handleExecuteMerge = () => {
    setShowMergeModal(false);
    setDocumentTitle(`${mergedDocName}.pdf`);
    alert(`Successfully merged ${docList.filter(d => d.selected).length} documents into "${mergedDocName}.pdf"!`);
  };

  if (isCompleted) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white border border-slate-200 rounded-2xl p-8 shadow-xl text-center space-y-4 font-sans">
        <CheckCircle2 size={60} className="text-[#00a884] mx-auto" />
        <h1 className="text-2xl font-black text-slate-900">You have signed this document.</h1>
        <p className="text-xs text-slate-500">
          Your signature and digital timestamp have been affixed to <strong>{documentTitle}</strong>.
        </p>
        <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-3">
          <button
            onClick={() => alert('Document emailed to you!')}
            className="px-4 py-2 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800"
          >
            Email to me
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800"
          >
            Print
          </button>
          <button
            onClick={() => alert('Downloading signed PDF...')}
            className="px-4 py-2 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800"
          >
            Download
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Sign yourself</h1>
        <p className="text-xs text-slate-500 mt-1">Upload multiple documents, merge files, place your signature, and execute.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-2xs space-y-6">
        {/* Top Merge Toolbar (Page 2 & 3 "sign_fileds" PDF) */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 text-xs font-bold text-slate-800 flex items-center gap-1.5"
          >
            <CheckSquare size={14} className={selectAll ? 'text-[#00a884]' : 'text-slate-400'} /> Select All
          </button>
          <button
            type="button"
            onClick={() => setShowMergeModal(true)}
            disabled={docList.filter(d => d.selected).length < 2}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded border border-slate-300 text-xs font-bold text-slate-800 flex items-center gap-1.5"
          >
            <Layers size={14} className="text-[#00a884]" /> Merge documents
          </button>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {docList.map((doc) => (
            <div key={doc.id} className="p-4 border border-slate-300 rounded-xl bg-slate-50 relative space-y-3 shadow-xs">
              <div className="flex justify-between items-start">
                <input
                  type="checkbox"
                  checked={doc.selected}
                  onChange={() => toggleDocSelection(doc.id)}
                  className="accent-[#00a884] h-4 w-4"
                />
                <button
                  onClick={() => setActiveMenuId(activeMenuId === doc.id ? null : doc.id)}
                  className="p-1 hover:bg-slate-200 rounded text-slate-500"
                >
                  <MoreVertical size={16} />
                </button>
              </div>

              <div className="h-32 w-full bg-white border border-slate-300 rounded flex flex-col justify-center items-center shadow-xs p-2 text-center">
                <FileText size={32} className="text-[#00a884] mb-1" />
                <span className="text-xs font-bold text-slate-800 truncate w-full">{doc.name}</span>
              </div>

              {/* Card Context Menu */}
              {activeMenuId === doc.id && (
                <div className="absolute right-4 top-10 w-36 bg-white border border-slate-200 rounded-lg shadow-xl z-20 text-xs font-semibold text-slate-700 py-1">
                  <button
                    onClick={() => navigate('/documents/create-editor')}
                    className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Edit size={14} /> Edit document
                  </button>
                  <button
                    onClick={() => setActiveMenuId(null)}
                    className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <RotateCcw size={14} /> Replace
                  </button>
                  <button
                    onClick={() => setDocList(docList.filter(d => d.id !== doc.id))}
                    className="w-full px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}

              <div className="text-xs font-semibold text-slate-600 truncate">{doc.name}</div>
            </div>
          ))}

          {/* Drag files / Add document v Dropdown */}
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 relative space-y-3 min-h-[220px] flex flex-col justify-center items-center">
            <Upload size={32} className="mx-auto text-slate-400" />
            <p className="font-bold text-slate-800 text-xs">Drag files here</p>
            <p className="text-[11px] text-slate-400">or</p>

            <div className="relative inline-block text-left">
              <button
                type="button"
                onClick={() => setShowAddDocDropdown(!showAddDocDropdown)}
                className="bg-[#00a884] hover:bg-[#008f70] text-white px-4 py-1.5 rounded text-xs font-bold flex items-center gap-1 shadow transition"
              >
                Add document <ChevronDown size={14} />
              </button>

              {showAddDocDropdown && (
                <div className="absolute left-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-xl z-20 text-xs font-semibold text-slate-700 py-1">
                  <label className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                    Desktop
                    <input type="file" onChange={handleFileChange} className="hidden" />
                  </label>
                  <button
                    onClick={() => alert('Cloud drive integration opened')}
                    className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-left"
                  >
                    Cloud
                  </button>
                  <button
                    onClick={() => navigate('/documents/create-editor')}
                    className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-left font-bold text-[#00a884]"
                  >
                    Create
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Document name input row */}
        <div className="flex items-center gap-3 pt-2">
          <label className="text-xs font-bold text-slate-700">Document name</label>
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            className="w-72 p-2 bg-slate-50 border border-slate-300 rounded text-xs font-semibold"
          />
        </div>

        {/* Bottom Bar Buttons (Page 2 PDF: Continue / Close) */}
        <div className="flex justify-start gap-2 pt-4 border-t border-slate-100">
          <button
            onClick={() => navigate('/documents/1/edit')}
            className="bg-[#E71414] hover:bg-red-700 text-white px-6 py-2 rounded text-xs font-bold shadow transition"
          >
            Continue
          </button>
          <button
            onClick={() => navigate('/documents/all')}
            className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>

      {/* Merge Documents Modal (Page 4 "sign_fileds" PDF) */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Merge documents</h3>
              <button onClick={() => setShowMergeModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <p className="text-slate-600">The selected documents will merge into a single file with the name provided below.</p>

            <div>
              <label className="block font-bold text-slate-700 mb-1">File name</label>
              <input
                type="text"
                value={mergedDocName}
                onChange={(e) => setMergedDocName(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 font-semibold"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-bold text-slate-700">Selected documents</label>
              <div className="space-y-2">
                {docList.filter(d => d.selected).map((doc) => (
                  <div key={doc.id} className="p-3 border border-slate-200 bg-slate-50 rounded-lg flex items-center gap-3 font-semibold text-slate-800">
                    <GripVertical size={16} className="text-slate-400 cursor-move" />
                    <input type="checkbox" checked readOnly className="accent-[#00a884]" />
                    <span>{doc.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowMergeModal(false)}
                className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteMerge}
                className="bg-[#00a884] hover:bg-[#008f70] text-white px-5 py-2 rounded text-xs font-extrabold shadow"
              >
                Merge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
