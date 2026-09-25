import React, { useState, useEffect } from 'react';
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
import SignatureStamp from './SignatureStamp';
import BexDocumentSheet from './BexDocumentSheet';
import { printDocumentSheet } from '../utils/documentPrinter';
import { getDefaultDocContent } from '../utils/documentDefaults';
import { getDocumentOwner } from '../utils/currentUser';
import { downloadSignedDocument, printLockedDocument } from '../utils/signedPdf';
import { showPopupAlert } from './GlobalAlertModal';
import { recipientColorAt, fieldBelongsTo } from '../utils/recipientColors';
import { API_BASE, API_ORIGIN } from '../utils/api';

const SIGNING_ROLES = ['signer', 'approver'];

// Where a recipient is in the signing process (shown in the recipients panel and the signature panel)
function recipientState(r) {
  const role = String(r.role || 'signer').toLowerCase();
  if (r.status === 'signed') return { label: role === 'approver' ? 'Approved' : 'Signed', className: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  if (r.status === 'declined') return { label: 'Declined', className: 'text-red-700 bg-red-50 border-red-200' };
  if (!SIGNING_ROLES.includes(role)) return { label: 'Receives a copy', className: 'text-slate-600 bg-slate-50 border-slate-200' };
  if (r.status === 'viewed') return { label: 'Viewed', className: 'text-blue-700 bg-blue-50 border-blue-200' };
  if (r.sent_at) return { label: 'Email sent', className: 'text-amber-700 bg-amber-50 border-amber-200' };
  return { label: 'Not emailed yet', className: 'text-slate-600 bg-slate-100 border-slate-200' };
}

const formatDateTime = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/**
 * Document viewer. mode="completed" (default): a completed request. mode="sender": the sender's view of a request
 * in any status, with every document, every recipient's fields and the signatures collected so far.
 */
export default function CompletedDocumentViewer({ doc, onClose, onBack, mode = 'completed' }) {
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

  const activeDocFields = fieldsByDoc[activeDocIndex] || [];
  // A document without placed fields shows the default signature only when the whole request has none
  const requestHasFields = Object.values(fieldsByDoc).some((list) => Array.isArray(list) && list.length > 0);
  const activeDoc = documentsList[activeDocIndex] || documentsList[0];
  const documentName = activeDoc?.name || doc?.document_name || doc?.title || doc?.name || "Document 1.pdf";
  const [placeholderBexsignId] = useState(() => generateBexsignId(doc?.id || 1));
  const [serverBexsignId, setServerBexsignId] = useState('');
  const docId = doc?.bexsign_doc_id || serverBexsignId || placeholderBexsignId;

  // Request data from the server: every document, every recipient and each recipient's fields with their own
  // signature (cached editor fields have no signatures and belong to one browser)
  const isSenderView = mode === 'sender';
  const [serverRecipients, setServerRecipients] = useState([]);
  const [serverStatus, setServerStatus] = useState(isSenderView ? '' : 'Completed');
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    if (!doc?.id) return undefined;
    let cancelled = false;
    fetch(`${API_BASE}/documents/${doc.id}?view=sender`)
      .then((res) => res.json())
      .then((data) => {
        const serverDoc = data?.document;
        if (cancelled || !serverDoc) return;
        const status = String(serverDoc.status || '');
        if (!isSenderView && status.toLowerCase() !== 'completed') return;
        setServerStatus(status);
        if (serverDoc.bexsign_doc_id) setServerBexsignId(serverDoc.bexsign_doc_id);
        if (Array.isArray(serverDoc.files) && serverDoc.files.length > 0) {
          setDocumentsList(serverDoc.files.map((f, i) => ({
            id: f.id || i + 1,
            name: f.file_name || `Document ${i + 1}.pdf`,
            documentText: f.document_text || getDefaultDocContent(f.file_name, serverDoc.custom_message)
          })));
        }
        if (serverDoc.fieldsByDoc && Object.keys(serverDoc.fieldsByDoc).length > 0) {
          setFieldsByDoc(serverDoc.fieldsByDoc);
        } else if (isSenderView) {
          setFieldsByDoc({});
        }
        setServerRecipients((serverDoc.recipients || []).filter((r) => !r.isFallback));
      })
      .catch(() => {
        if (!cancelled && isSenderView) setLoadError(`Could not reach the BexSign server at ${API_ORIGIN}.`);
      });
    return () => {
      cancelled = true;
    };
  }, [doc?.id, isSenderView]);
  const isRequestCompleted = String(serverStatus).toLowerCase() === 'completed';

  // Clicking a recipient highlights their fields in the document (click again, or Clear, to show everyone)
  const [highlightEmail, setHighlightEmail] = useState('');
  const coloredRecipients = serverRecipients.map((r, idx) => ({ ...r, color: recipientColorAt(idx) }));
  const highlightRecipient = coloredRecipients.find((r) => String(r.email || '').toLowerCase() === highlightEmail) || null;
  const fieldCountIn = (recipient, docIdx) => (fieldsByDoc[docIdx] || []).filter((f) => fieldBelongsTo(f, recipient)).length;
  const toggleHighlight = (recipient) => {
    const email = String(recipient.email || '').toLowerCase();
    if (highlightEmail === email) {
      setHighlightEmail('');
      return;
    }
    setHighlightEmail(email);
    // Open a document that has their fields when the current one has none
    if (fieldCountIn(recipient, activeDocIndex) === 0) {
      const withFields = documentsList.findIndex((_, idx) => fieldCountIn(recipient, idx) > 0);
      if (withFields !== -1) setActiveDocIndex(withFields);
    }
  };
  useEffect(() => {
    if (!highlightEmail) return undefined;
    const timer = setTimeout(() => {
      const first = document.querySelector('#printable-document-sheet [data-highlighted="true"]');
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    return () => clearTimeout(timer);
  }, [highlightEmail, activeDocIndex]);
  const signingRecipients = serverRecipients.filter((r) => SIGNING_ROLES.includes(String(r.role || 'signer').toLowerCase()));
  const signedCount = signingRecipients.filter((r) => r.status === 'signed').length;
  const signerName = signingRecipients[0]?.name || doc?.signer_name || 'Vimal Chavda';
  const signerEmail = signingRecipients[0]?.email || doc?.recipient_email || 'vimal@bexcodeservices.com';
  const owner = getDocumentOwner(doc);
  const ownerName = owner.name;
  const ownerEmail = owner.email;
  const organization = owner.company || 'BexSign';
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

  const isDraftRequest = String(serverStatus || '').toLowerCase() === 'draft';

  // Downloads the locked PDF issued by the server: the signed document once completed, before that a copy with the
  // signatures collected so far. Neither can be edited.
  const handleDownload = async () => {
    try {
      const { fileName } = await downloadSignedDocument(doc?.id, { index: activeDocIndex });
      if (!isRequestCompleted) {
        showPopupAlert(`Downloaded "${fileName}" with the signatures collected so far (${signedCount} of ${signingRecipients.length} signed). The file is locked and cannot be edited.`, { title: 'In-progress copy downloaded', type: 'success' });
      }
    } catch (err) {
      showPopupAlert(err instanceof TypeError ? `Could not reach the BexSign server at ${API_ORIGIN}.` : err.message, { title: 'Download failed', type: 'error' });
    }
  };

  const handlePrint = async () => {
    if (!isDraftRequest && doc?.id) {
      try {
        await printLockedDocument(doc.id, { index: activeDocIndex });
      } catch (err) {
        showPopupAlert(err instanceof TypeError ? `Could not reach the BexSign server at ${API_ORIGIN}.` : err.message, { title: 'Print failed', type: 'error' });
      }
      return;
    }
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
      placedFields: activeDocFields,
      defaultSignature: !requestHasFields
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
      {/* Phones: title and Back on the first line, the page / zoom / download controls on a second line */}
      <header className="min-h-13 bg-white border-b border-slate-200 px-3 sm:px-4 py-2 sm:py-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-3 gap-y-1.5 shadow-xs shrink-0 z-20">
        {/* Left: Doc Icon + Document Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-none">
          <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
            <FileText size={18} />
          </div>
          <span className="font-bold text-sm text-slate-800 truncate max-w-xs md:max-w-md" title={documentName}>
            {documentName}
          </span>
        </div>

        {/* Center: Pagination & Zoom Controls */}
        <div className="order-last sm:order-none w-full sm:w-auto flex items-center justify-center gap-1.5 md:gap-2 text-xs font-semibold text-slate-700">
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
            title={isRequestCompleted ? 'Download signed PDF (locked)' : 'Download a locked copy with the signatures collected so far'}
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
        <div className="shrink-0">
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
      <div className={`border-b px-3 sm:px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs shrink-0 z-10 ${isRequestCompleted || !isSenderView ? 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]' : 'bg-sky-50 border-sky-200 text-sky-900'}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isRequestCompleted || !isSenderView ? 'bg-[#fef3c7] text-[#b45309]' : 'bg-sky-100 text-sky-700'}`}>
            {isRequestCompleted || !isSenderView ? <ShieldCheck size={16} className="stroke-[2.2]" /> : <Clock size={14} className="stroke-[2.2]" />}
          </div>
          <span className="font-semibold text-slate-800 text-[11px] sm:text-xs">
            {loadError
              ? loadError
              : (isRequestCompleted || !isSenderView
                ? 'This document is digitally signed. Open the signature panel to verify its authenticity and view signer details.'
                : `${serverStatus || 'Loading'}: ${signedCount} of ${signingRecipients.length} recipients have signed. Each recipient's fields appear here as they complete them.`)}
          </span>
        </div>
        <button
          onClick={() => setShowSignaturePanel(true)}
          className="self-start sm:self-auto bg-white hover:bg-[#fef3c7] text-[#92400e] border border-[#f59e0b] hover:border-[#d97706] font-bold text-xs px-3.5 py-1 rounded shadow-2xs transition shrink-0"
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
              const highlightedCount = highlightRecipient ? fieldCountIn(highlightRecipient, idx) : 0;
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
                  {highlightRecipient && (
                    <span
                      className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-1.5 py-0.5 border"
                      style={highlightedCount > 0
                        ? { color: highlightRecipient.color, borderColor: `${highlightRecipient.color}66`, backgroundColor: `${highlightRecipient.color}14` }
                        : { color: '#94a3b8', borderColor: '#e2e8f0' }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: highlightedCount > 0 ? highlightRecipient.color : '#cbd5e1' }} />
                      {highlightedCount > 0 ? `${highlightedCount} field${highlightedCount === 1 ? '' : 's'}` : 'No fields'}
                    </span>
                  )}
                  <p className="text-[9px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {d.documentText || getDefaultDocContent(d.name)}
                  </p>
                </div>
              );
            })}
          </div>
        </aside>

        {/* CENTER CANVAS: Document Preview */}
        <main className="flex-1 bg-slate-200/80 p-4 sm:p-8 overflow-auto flex flex-col items-center justify-start print:p-0 print:bg-white">
          {highlightRecipient && (
            <div
              className="sticky top-0 z-10 mb-3 flex items-center gap-2 rounded-full border bg-white/95 backdrop-blur px-3 py-1.5 text-xs shadow-sm print:hidden"
              style={{ borderColor: `${highlightRecipient.color}66` }}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: highlightRecipient.color }} />
              <span className="font-semibold text-slate-700">
                {fieldCountIn(highlightRecipient, activeDocIndex) > 0
                  ? <>Showing <strong style={{ color: highlightRecipient.color }}>{highlightRecipient.name || highlightRecipient.email}</strong>'s fields ({fieldCountIn(highlightRecipient, activeDocIndex)} in this document)</>
                  : <><strong style={{ color: highlightRecipient.color }}>{highlightRecipient.name || highlightRecipient.email}</strong> has no fields in this document</>}
              </span>
              <button
                type="button"
                onClick={() => setHighlightEmail('')}
                className="ml-1 inline-flex items-center gap-1 rounded-full bg-slate-100 hover:bg-slate-200 px-2 py-0.5 font-bold text-slate-600"
              >
                <X size={11} /> Clear
              </button>
            </div>
          )}
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
              showPending={isSenderView && !isRequestCompleted}
              highlightRecipient={highlightRecipient}
              showTooltips={false}
              defaultSignature={!requestHasFields}
              placedFields={activeDocFields}
            />
          </div>
        </main>

        {/* RIGHT SIDEBAR: Recipients Panel */}
        <aside className="w-64 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto hidden lg:flex">
          <div className="p-3 border-b border-slate-100">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Recipients</h3>
            {coloredRecipients.length > 0 && <p className="text-[10px] text-slate-400 mt-0.5">Click a recipient to highlight their fields</p>}
          </div>
          <div className="p-3 space-y-2">
            {serverRecipients.length === 0 && (
              <p className="text-[11px] text-slate-400">Loading recipients...</p>
            )}
            {coloredRecipients.map((r, idx) => {
              const state = recipientState(r);
              const isActive = highlightRecipient && highlightRecipient.email === r.email;
              const inThisDoc = fieldCountIn(r, activeDocIndex);
              const inAllDocs = documentsList.reduce((sum, _, docIdx) => sum + fieldCountIn(r, docIdx), 0);
              return (
                <button
                  type="button"
                  key={r.id || r.email}
                  onClick={() => toggleHighlight(r)}
                  aria-pressed={Boolean(isActive)}
                  title={isActive ? 'Show every recipient\'s fields' : `Highlight ${r.name || r.email}'s fields in the document`}
                  className={`w-full text-left flex items-start gap-3 p-2.5 rounded-lg border transition-all duration-200 ${isActive ? 'bg-white shadow-md' : 'border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-sm'} ${highlightRecipient && !isActive ? 'opacity-60 hover:opacity-100' : ''}`}
                  style={isActive ? { borderColor: r.color, boxShadow: `0 0 0 2px ${r.color}33, 0 6px 16px -8px ${r.color}` } : { borderLeft: `3px solid ${r.color}` }}
                >
                  <div
                    className="w-8 h-8 rounded-full font-extrabold flex items-center justify-center text-xs shrink-0 text-white"
                    style={{ backgroundColor: r.color }}
                    title={`Signing order ${r.signing_order_index || idx + 1}`}
                  >
                    {(r.name || r.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-slate-900 truncate">{r.name || r.email}</p>
                    <p className="text-[11px] text-slate-500 truncate" title={r.email}>{r.email}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold border rounded px-1.5 py-0.5 ${state.className}`}>
                        {r.status === 'signed' && <CheckCircle2 size={11} />}
                        {state.label}
                      </span>
                      {r.signed_at && <span className="text-[10px] text-slate-400">{formatDateTime(r.signed_at)}</span>}
                    </div>
                    <p className="mt-1 text-[10px] font-semibold" style={{ color: inThisDoc > 0 ? r.color : '#94a3b8' }}>
                      {inThisDoc} field{inThisDoc === 1 ? '' : 's'} in this document{documentsList.length > 1 ? ` · ${inAllDocs} in all` : ''}
                    </p>
                  </div>
                </button>
              );
            })}
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
              {/* Status Card */}
              {isRequestCompleted ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle2 size={16} />
                    <span>Signed by every recipient</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    The signed PDFs are locked against editing. Use "Verify document" to check that a downloaded copy is unchanged.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-sky-900 font-bold text-sm">
                    <Clock size={16} />
                    <span>{signedCount} of {signingRecipients.length} recipients have signed</span>
                  </div>
                  <p className="text-[11px] text-sky-800">The request is {String(serverStatus || 'in progress').toLowerCase()}.</p>
                </div>
              )}

              {/* Document Identity */}
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Document Identifier</h4>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 font-mono text-[11px] break-all text-slate-800 select-all">
                  {docId}
                </div>
              </div>

              {/* Signer Details: every recipient */}
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Signer Details</h4>
                <div className="space-y-3">
                  {serverRecipients.map((r) => {
                    const state = recipientState(r);
                    return (
                      <div key={r.id || r.email} className="rounded-lg border border-slate-200 p-2.5 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 truncate">{r.name || r.email}</span>
                          <span className={`text-[10px] font-bold border rounded px-1.5 py-0.5 shrink-0 ${state.className}`}>{state.label}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 font-semibold">Email:</span>
                          <span className="font-mono text-slate-800 truncate">{r.email}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 font-semibold">Signed on:</span>
                          <span className="font-mono text-slate-800">{formatDateTime(r.signed_at)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 font-semibold">IP Address:</span>
                          <span className="font-mono text-slate-800">{r.signed_ip ? String(r.signed_ip).replace(/^::ffff:/, '') : '-'}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Signature Mode:</span>
                    <span className="font-semibold text-slate-800">
                      {isPhysicallySigned ? 'Physical Upload' : 'Electronic Signature'}
                    </span>
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
