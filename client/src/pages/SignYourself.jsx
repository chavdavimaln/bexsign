import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, PenTool, CheckCircle2, Download, ArrowRight, Save, Calendar, User, FileText } from 'lucide-react';

export default function SignYourself() {
  const navigate = useNavigate();
  const [documentTitle, setDocumentTitle] = useState('My_Self_Signed_Document.pdf');
  const [file, setFile] = useState(null);
  const [placedSig, setPlacedSig] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleFileChange = (e) => {
    const uploaded = e.target.files[0];
    if (uploaded) {
      setFile(uploaded);
      setDocumentTitle(uploaded.name);
    }
  };

  const handleCompleteSelfSign = () => {
    if (!placedSig) {
      alert('Please place your signature onto the document first.');
      return;
    }
    setIsCompleted(true);
  };

  if (isCompleted) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white border border-slate-200 rounded-2xl p-8 shadow-xl text-center space-y-4">
        <CheckCircle2 size={60} className="text-emerald-500 mx-auto" />
        <h1 className="text-2xl font-black text-slate-900">Document Self-Signed Successfully!</h1>
        <p className="text-xs text-slate-500">
          Your personal signature and tamper-evident digital fingerprint have been applied to <strong>{documentTitle}</strong>.
        </p>
        <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
          <button
            onClick={() => alert('Downloading self-signed PDF document...')}
            className="btn-primary w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
          >
            <Download size={18} /> Download Signed PDF
          </button>
          <button
            onClick={() => navigate('/documents/all')}
            className="w-full py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Return to Documents Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Sign Yourself (Self-Signing Engine)</h1>
          <p className="text-xs text-slate-500 mt-1">Upload a document, place your personal signature, and download instantly.</p>
        </div>
        {placedSig && (
          <button
            onClick={handleCompleteSelfSign}
            className="btn-primary px-6 py-2.5 rounded-lg text-xs font-extrabold shadow-md flex items-center gap-2"
          >
            <CheckCircle2 size={16} /> Finish & Download Signed PDF
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-2xs space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-2">Document Title</label>
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold"
          />
        </div>

        {!file ? (
          <div className="border-2 border-dashed border-slate-300 hover:border-[#E71414] rounded-xl p-10 text-center bg-slate-50/50 transition">
            <Upload size={40} className="mx-auto text-[#E71414] mb-3" />
            <p className="font-bold text-slate-800 text-base">Select document to sign yourself</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">Supported formats: PDF, DOC, DOCX, PNG, JPG (Max 25MB)</p>
            <label className="btn-primary px-5 py-2.5 rounded-lg cursor-pointer inline-flex items-center gap-2 text-sm font-semibold">
              Browse Document
              <input type="file" onChange={handleFileChange} accept=".pdf,.doc,.docx,.png,.jpg" className="hidden" />
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <span className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <FileText size={18} className="text-[#E71414]" /> {file.name}
              </span>
              <button onClick={() => setFile(null)} className="text-xs text-red-600 font-semibold hover:underline">Change File</button>
            </div>

            {/* Document Canvas Preview */}
            <div className="relative w-full h-[500px] bg-slate-100 border border-slate-300 rounded-xl flex justify-center items-center overflow-hidden">
              <div className="w-[450px] h-[440px] bg-white p-8 border border-slate-300 shadow-lg relative rounded space-y-4">
                <h3 className="font-bold text-slate-900 border-b pb-2">{documentTitle}</h3>
                <p className="text-xs text-slate-600">
                  I hereby execute this document and affix my personal electronic signature below.
                </p>

                <div className="pt-24 border-t border-slate-200">
                  {placedSig ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-500 rounded text-emerald-800 text-xs font-bold inline-block">
                      <p className="text-xl font-signature-1 text-slate-900">Vimal Chavda</p>
                      <p className="text-[10px] text-emerald-700 mt-1">✓ Personal Signature Placed</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setPlacedSig(true)}
                      className="p-4 border-2 border-dashed border-[#E71414] bg-red-50 text-[#E71414] rounded font-bold text-xs flex items-center gap-2 hover:bg-red-100"
                    >
                      <PenTool size={16} /> Click to Place Saved Signature
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
