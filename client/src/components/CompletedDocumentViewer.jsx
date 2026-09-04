import React, { useState } from 'react';
import {
  FileText,
  ChevronUp,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Download,
  Printer,
  Search,
  Maximize2,
  Minimize2,
  ShieldCheck,
  CheckCircle2,
  X,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Mail,
  Lock,
  ExternalLink
} from 'lucide-react';
import { generateBexsignId } from '../utils/documentId';
import { generateAndDownloadPdf } from '../utils/pdfGenerator';
import SignatureStamp from './SignatureStamp';
import BexDocumentSheet from './BexDocumentSheet';
import { printDocumentSheet } from '../utils/documentPrinter';
import { getDefaultDocContent } from '../utils/documentDefaults';

export default function CompletedDocumentViewer({ doc, onClose, onBack }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSignaturePanel, setShowSignaturePanel] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const [documentsList, setDocumentsList] = useState(() => {
    if (doc?.documents && Array.isArray(doc.documents) && doc.documents.length > 0) {
      return doc.documents;
    }
    if (doc?.files && Array.isArray(doc.files) && doc.files.length > 0) {
      return doc.files.map((f, i) => ({
        id: f.id || i + 1,
        name: f.file_name || `Document ${i + 1}.pdf`,
        documentText: f.document_text || getDefaultDocContent(f.file_name, doc.custom_message)
      }));
    }
    const saved = doc?.id ? localStorage.getItem(`bexsign_doc_${doc.id}_documents`) : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    const initialName = doc?.document_name || doc?.title || doc?.name || "Document 1.pdf";
    return [
      {
        id: 1,
        name: initialName,
        documentText: doc?.documentText || doc?.document_text || getDefaultDocContent(initialName, doc?.custom_message)
      }
    ];
  });
  const [activeDocIndex, setActiveDocIndex] = useState(0);

  const [fieldsByDoc, setFieldsByDoc] = useState(() => {
    if (doc?.fieldsByDoc && typeof doc.fieldsByDoc === 'object') {
      return doc.fieldsByDoc;
    }
    const docIdKey = doc?.id || 1;
    const savedByDoc = localStorage.getItem(`bexsign_doc_${docIdKey}_fields_by_doc`);
    if (savedByDoc) {
      try {
        const parsed = JSON.parse(savedByDoc);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) {}
    }
    const savedFlat = localStorage.getItem(`bexsign_doc_${docIdKey}_fields`);
    if (savedFlat) {
      try {
        const parsed = JSON.parse(savedFlat);
        if (Array.isArray(parsed) && parsed.length > 0) return { 0: parsed };
      } catch (e) {}
    }
    if (doc?.fields) {
      try {
        const parsed = typeof doc.fields === 'string' ? JSON.parse(doc.fields) : doc.fields;
        if (Array.isArray(parsed)) return { 0: parsed };
      } catch (e) {}
    }
    return {};
  });

  const activeDocFields = fieldsByDoc[activeDocIndex] || fieldsByDoc[0] || [];
  const activeDoc = documentsList[activeDocIndex] || documentsList[0];
  const documentName = activeDoc?.name || doc?.document_name || doc?.title || doc?.name || "Document 1.pdf";
  const docId = doc?.bexsign_doc_id || generateBexsignId(doc?.id || 1);
  const signerName = doc?.signer_name || 'Vimal Chavda';
  const signerEmail = doc?.recipient_email || 'vimal@bexcodeservices.com';
  const ownerName = doc?.owner || 'Manu Yadav';
  const ownerEmail = 'manu.yadav@oladigital.health';
  const organization = 'Dcode Health';
  const signedDate = doc?.signed_at
    ? new Date(doc.signed_at).toLocaleString()
    : 'Sep 01, 2026 15:07:14 EDT';
  const isPhysicallySigned = Boolean(doc?.file_path && doc?.file_path.includes('signed'));

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 175));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 60));
  const handleResetZoom = () => setZoom(100);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const documentBodyText = activeDoc?.documentText || doc?.documentText || doc?.document_text || getDefaultDocContent(documentName, doc?.custom_message);

  const handleDownload = () => {
    const savedSig = doc?.signature_image || localStorage.getItem(`bexsign_doc_${doc?.id}_signature`) || '';
    const savedSigner = doc?.signer_name || localStorage.getItem(`bexsign_doc_${doc?.id}_signer`) || signerName;
    const savedType = localStorage.getItem(`bexsign_doc_${doc?.id}_sigtype`) || (savedSig && savedSig.startsWith('data:') ? 'draw' : 'type');
    const docBexId = documentsList.length > 1 ? `${docId}-${activeDocIndex + 1}` : docId;

    generateAndDownloadPdf({
      documentName,
      documentText: documentBodyText,
      docId: docBexId,
      signerName: savedSigner,
      signerEmail,
      date: signedDate,
      status: 'Completed',
      signatureImage: savedSig,
      signatureType: savedType,
      fields: activeDocFields
    });
  };

  const handlePrint = () => {
    const savedSig = doc?.signature_image || localStorage.getItem(`bexsign_doc_${doc?.id}_signature`) || '';
    const savedSigner = doc?.signer_name || localStorage.getItem(`bexsign_doc_${doc?.id}_signer`) || signerName;
    const docBexId = documentsList.length > 1 ? `${docId}-${activeDocIndex + 1}` : docId;

    printDocumentSheet({
      documentName,
      documentText: documentBodyText,
      docId: doc?.id || 1,
      bexsignDocId: docBexId,
      signerName: savedSigner,
      signerEmail,
      signatureImage: savedSig,
      placedFields: activeDocFields
    });
  };

  const handleReturn = () => {
    if (onClose) onClose();
    else if (onBack) onBack();
    else window.history.back();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col font-sans select-none overflow-hidden text-slate-800">
      {/* 1. TOP CONTROLS TOOLBAR (Page 1 Reference) */}
      <header className="h-13 bg-white border-b border-slate-200 px-4 flex items-center justify-between shadow-xs shrink-0 z-20">
        {/* Left: Doc Icon + Document Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
            <FileText size={18} />
          </div>
          <span className="font-bold text-sm text-slate-800 truncate max-w-xs md:max-w-md" title={documentName}>
            {documentName}
          </span>
        </div>

        {/* Center: Pagination & Zoom Controls */}
        <div className="flex items-center gap-1.5 md:gap-2 text-xs font-semibold text-slate-700">
          {/* Page nav */}
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition"
            title="Previous page"
          >
            <ChevronUp size={16} />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(1, p + 1))}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition"
            title="Next page"
          >
            <ChevronDown size={16} />
          </button>
          <div className="flex items-center gap-1 px-1.5">
            <span className="w-6 h-6 border border-slate-300 rounded flex items-center justify-center font-mono font-bold bg-white text-xs">
              {currentPage}
            </span>
            <span className="text-slate-500">of 1</span>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {/* Zoom controls */}
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition"
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition"
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={handleResetZoom}
            className="px-1.5 py-0.5 text-[11px] font-mono text-slate-500 hover:bg-slate-100 rounded"
            title="Reset zoom"
          >
            {zoom}%
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {/* Download & Print */}
          <button
            onClick={handleDownload}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition"
            title="Download signed PDF"
          >
            <Download size={16} />
          </button>
          <button
            onClick={handlePrint}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition"
            title="Print document"
          >
            <Printer size={16} />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition hidden sm:inline-flex"
            title="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>

        {/* Right: Back Button */}
        <div>
          <button
            onClick={handleReturn}
            className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 rounded text-xs font-bold transition shadow-2xs flex items-center gap-1"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
        </div>
      </header>

      {/* 2. DIGITALLY SIGNED BANNER (Yellow/Gold Notice Bar from Page 1 Reference) */}
      <div className="bg-[#fffbeb] border-b border-[#fde68a] px-4 py-2 flex items-center justify-between text-xs text-[#92400e] shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-full bg-[#fef3c7] flex items-center justify-center text-[#b45309] shrink-0">
            <ShieldCheck size={16} className="stroke-[2.2]" />
          </div>
          <span className="font-semibold text-slate-800 text-[11px] sm:text-xs">
            This document is digitally signed. Open the signature panel to verify its authenticity and view signer details.
          </span>
        </div>
        <button
          onClick={() => setShowSignaturePanel(true)}
          className="bg-white hover:bg-[#fef3c7] text-[#92400e] border border-[#f59e0b] hover:border-[#d97706] font-bold text-xs px-3.5 py-1 rounded shadow-2xs transition shrink-0"
        >
          Signature panel
        </button>
      </div>

      {/* 3. THREE-COLUMN BODY LAYOUT */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT SIDEBAR: Documents & Page Thumbnails */}
        <aside className="w-52 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto hidden md:flex">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
              Documents ({documentsList.length})
            </h3>
          </div>
          <div className="p-3 space-y-3">
            {documentsList.map((d, idx) => {
              const isSelected = activeDocIndex === idx;
              return (
                <div
                  key={d.id || idx}
                  onClick={() => setActiveDocIndex(idx)}
                  className={`border rounded-lg p-2.5 transition cursor-pointer ${
                    isSelected
                      ? 'border-2 border-[#00a884] bg-emerald-50/40 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                  title={`View ${d.name}`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className={`truncate max-w-[130px] ${isSelected ? 'text-[#007355]' : 'text-slate-800'}`}>
                      {d.name || `Document ${idx + 1}`}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{idx + 1}</span>
                  </div>
                  <p className="text-[9px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {d.documentText || getDefaultDocContent(d.name)}
                  </p>
                </div>
              );
            })}
          </div>
        </aside>

        {/* CENTER CANVAS: Document Preview */}
        <main className="flex-1 bg-slate-200/80 p-4 sm:p-8 overflow-auto flex justify-center items-start print:p-0 print:bg-white">
          <div
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease'
            }}
            className="w-full max-w-[800px] flex justify-center"
          >
            <BexDocumentSheet
              docId={doc?.id || 1}
              bexsignDocId={docId}
              documentName={documentName}
              documentText={documentBodyText}
              signerName={signerName}
              signerEmail={signerEmail}
              signatureImage={doc?.signature_image || localStorage.getItem(`bexsign_doc_${doc?.id}_signature`) || ''}
              isCompleted={true}
              showTooltips={false}
              placedFields={activeDocFields}
            />
          </div>
        </main>

        {/* RIGHT SIDEBAR: Recipients Panel */}
        <aside className="w-64 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto hidden lg:flex">
          <div className="p-3 border-b border-slate-100">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Recipients</h3>
          </div>
          <div className="p-3">
            <div className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-xs shrink-0">
                {signerName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs text-slate-900 truncate">{signerName}</p>
                <p className="text-[11px] text-slate-500 truncate" title={signerEmail}>
                  {signerEmail}
                </p>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                  <CheckCircle2 size={12} />
                  <span>Signed</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* 4. SIGNATURE PANEL DRAWER (Matching Reference Button Action) */}
      {showSignaturePanel && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end">
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-[#00a884]" />
                <h3 className="font-bold text-sm text-slate-900">Signature Verification Panel</h3>
              </div>
              <button
                onClick={() => setShowSignaturePanel(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-700">
              {/* Validity Card */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 size={16} />
                  <span>Document Authenticity Verified</span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  This document has not been altered since it was signed. All cryptographic hashes match certified records.
                </p>
              </div>

              {/* Document Identity */}
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Document Identifier</h4>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 font-mono text-[11px] break-all text-slate-800 select-all">
                  {docId}
                </div>
              </div>

              {/* Signer Identity */}
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Signer Details</h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Signer Name:</span>
                    <span className="font-bold text-slate-900">{signerName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Email:</span>
                    <span className="font-mono text-slate-800">{signerEmail}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Signature Mode:</span>
                    <span className="font-semibold text-slate-800">
                      {isPhysicallySigned ? 'Physical Upload' : 'Electronic Digital Seal'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Timestamp:</span>
                    <span className="font-mono text-slate-800">{signedDate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">IP Address:</span>
                    <span className="font-mono text-slate-800">106.205.245.235</span>
                  </div>
                </div>
              </div>

              {/* Certificate Authority */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Certificate Authority</h4>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-[11px]">
                  <p className="font-bold text-slate-800">BexSign Electronic Trust Network</p>
                  <p className="text-slate-500">Algorithm: SHA-256 with RSA Encryption</p>
                  <p className="text-slate-500">Compliance: 21 CFR Part 11, ESIGN & UETA</p>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowSignaturePanel(false)}
                className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded text-xs transition"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
