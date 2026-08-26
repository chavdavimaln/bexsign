import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HardDrive, Cloud, FileBox, Layers, Upload, ArrowRight, CheckCircle2, FileEdit } from 'lucide-react';
import RichTextDocumentEditor from '../components/RichTextDocumentEditor';

export default function CreateDocument() {
  const [activeTab, setActiveTab] = useState('desktop'); // desktop, cloud, template, mailmerge, editor
  const [selectedCloud, setSelectedCloud] = useState('');
  const [file, setFile] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      if (!documentName) {
        setDocumentName(uploadedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleCreateDocument = async (e) => {
    e.preventDefault();
    if (!file && activeTab === 'desktop') {
      alert('Please select a PDF document file to upload.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('documentName', documentName || 'New Contract Document');
      if (file) formData.append('documentFile', file);

      const res = await fetch('http://localhost:5000/api/documents/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.documentId) {
        navigate(`/documents/${data.documentId}/edit`);
      } else {
        navigate('/documents/1/edit');
      }
    } catch (err) {
      console.warn('Backend offline fallback:', err);
      navigate('/documents/1/edit');
    }
  };

  // Render Rich Text Editor View (Image 2)
  if (activeTab === 'editor') {
    return <RichTextDocumentEditor onBack={() => setActiveTab('desktop')} />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Create Document</h1>
        <p className="text-slate-500 text-sm mt-1">
          Select a document source to upload your PDF, write rich text content, assign fields, and send for signature.
        </p>
      </div>

      {/* Source Selection Tabs (Including Image 2 Rich Text Content Editor Tab) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveTab('desktop')}
          className={`p-4 rounded-xl border flex flex-col items-center gap-2 font-semibold text-sm transition ${
            activeTab === 'desktop'
              ? 'border-[#E71414] bg-red-50 text-[#E71414] shadow-sm'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <HardDrive size={22} />
          <span>Desktop Upload</span>
        </button>

        <button
          onClick={() => setActiveTab('cloud')}
          className={`p-4 rounded-xl border flex flex-col items-center gap-2 font-semibold text-sm transition ${
            activeTab === 'cloud'
              ? 'border-[#E71414] bg-red-50 text-[#E71414] shadow-sm'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Cloud size={22} />
          <span>Cloud Storage</span>
        </button>

        <button
          onClick={() => setActiveTab('template')}
          className={`p-4 rounded-xl border flex flex-col items-center gap-2 font-semibold text-sm transition ${
            activeTab === 'template'
              ? 'border-[#E71414] bg-red-50 text-[#E71414] shadow-sm'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <FileBox size={22} />
          <span>My Templates</span>
        </button>

        <button
          onClick={() => setActiveTab('mailmerge')}
          className={`p-4 rounded-xl border flex flex-col items-center gap-2 font-semibold text-sm transition ${
            activeTab === 'mailmerge'
              ? 'border-[#E71414] bg-red-50 text-[#E71414] shadow-sm'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Layers size={22} />
          <span>Mail Merge CSV</span>
        </button>

        {/* 5th Tab: Rich Text Content Editor (Matching Image 2) */}
        <button
          onClick={() => setActiveTab('editor')}
          className={`p-4 rounded-xl border flex flex-col items-center gap-2 font-semibold text-sm transition ${
            activeTab === 'editor'
              ? 'border-[#2d9d78] bg-emerald-50 text-[#2d9d78] shadow-sm'
              : 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          <FileEdit size={22} className="text-[#2d9d78]" />
          <span>Write Document</span>
        </button>
      </div>

      {/* Upload & Setup Container */}
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        {/* Desktop Upload Tab */}
        {activeTab === 'desktop' && (
          <form onSubmit={handleCreateDocument} className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Document Title
                </label>
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className="text-xs font-bold text-[#2d9d78] hover:underline flex items-center gap-1"
                >
                  <FileEdit size={14} /> Or Write Content in Editor →
                </button>
              </div>
              <input
                type="text"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Document 1"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#E71414] focus:outline-none"
                required
              />
            </div>

            <div className="border-2 border-dashed border-slate-300 hover:border-[#E71414] rounded-xl p-10 text-center bg-slate-50/50 transition">
              <Upload size={40} className="mx-auto text-[#E71414] mb-3" />
              <p className="font-bold text-slate-800 text-base">Drag & Drop your document here</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">Supported formats: PDF, DOC, DOCX (Max size: 25MB)</p>
              <label className="btn-primary px-5 py-2.5 rounded-lg cursor-pointer inline-flex items-center gap-2 text-sm font-semibold">
                Browse Files
                <input type="file" onChange={handleFileChange} accept=".pdf,.doc,.docx" className="hidden" />
              </label>
              {file && (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold inline-flex items-center gap-2">
                  <CheckCircle2 size={16} /> Selected: {file.name}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2"
              >
                Continue to Editor <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        {/* Cloud Upload Tab */}
        {activeTab === 'cloud' && (
          <div className="space-y-6 text-center">
            <h3 className="font-bold text-slate-900 text-lg">Select Cloud Storage Source</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {['Google Drive', 'OneDrive', 'Dropbox', 'Other Storage'].map((cloud) => (
                <button
                  key={cloud}
                  onClick={() => setSelectedCloud(cloud)}
                  className={`p-5 rounded-xl border font-bold text-sm transition ${
                    selectedCloud === cloud
                      ? 'border-[#E71414] bg-red-50 text-[#E71414]'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {cloud}
                </button>
              ))}
            </div>
            <button
              onClick={() => navigate('/documents/1/edit')}
              className="btn-primary px-6 py-2.5 rounded-lg text-sm font-bold mt-4"
            >
              Connect {selectedCloud || 'Cloud'} & Import File
            </button>
          </div>
        )}

        {/* Template Tab */}
        {activeTab === 'template' && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-slate-700">Choose a pre-saved template:</p>
            <div className="space-y-2">
              <div
                onClick={() => navigate('/documents/1/edit')}
                className="p-4 border border-slate-200 rounded-xl hover:border-[#E71414] cursor-pointer flex justify-between items-center bg-slate-50"
              >
                <div>
                  <h4 className="font-bold text-slate-900">Standard Sales Contract Template</h4>
                  <p className="text-xs text-slate-500">2 Signer Roles (Customer, Manager)</p>
                </div>
                <span className="btn-primary text-xs px-3 py-1.5 rounded-md font-semibold">Use Template</span>
              </div>
            </div>
          </div>
        )}

        {/* Mail Merge Tab */}
        {activeTab === 'mailmerge' && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900">Upload CSV for Bulk Mail Merge</h3>
            <input type="file" accept=".csv" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#E71414] hover:file:bg-red-100" />
            <button onClick={() => navigate('/documents/sent/bulk')} className="btn-primary px-6 py-2.5 rounded-lg text-sm font-bold">
              Map CSV Columns & Preview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
