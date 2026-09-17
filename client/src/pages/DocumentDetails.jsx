import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Eye, Edit, FileCheck, Clock, MoreVertical, 
  CheckCircle2, AlertCircle, Bell, Sliders, Download, 
  Printer, Cloud, FileText, Info, Trash2, Copy, Send,
  ShieldCheck, Share2, UserCheck
} from 'lucide-react';
import { generateBexsignId } from '../utils/documentId';
import { getDocumentOwner } from '../utils/currentUser';
import EditCopyModal from '../components/EditCopyModal';

const formatDateTime = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
};

const describeDevice = (userAgent) => {
  if (!userAgent) return 'Web';
  return /Mobile|Android|iPhone|iPad/i.test(userAgent) ? 'Mobile' : 'Web';
};

const SIGNING_ROLES = ['signer', 'approver'];

// Details page statuses: 'signed', 'viewed' (viewed, not signed), 'emailed' (email sent, not viewed yet),
// 'waiting' (not emailed yet: waits for earlier recipients in signing order) or 'copy' (receives a copy)
const toRecipientStatus = (r) => {
  const s = String(r.status || '').toLowerCase();
  if (s === 'signed') return 'signed';
  if (!SIGNING_ROLES.includes(String(r.role || 'signer').toLowerCase())) return 'copy';
  if (s === 'viewed') return 'viewed';
  return r.sent_at ? 'emailed' : 'waiting';
};

export default function DocumentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const docId = parseInt(id) || 1;
  const [placeholderBexsignId] = useState(() => generateBexsignId(docId));
  const [serverBexsignId, setServerBexsignId] = useState('');
  const fullBexsignId = serverBexsignId || placeholderBexsignId;

  // Filled from the request saved on the server; the owner is the user who created the request
  const [document, setDocument] = useState(() => {
    const owner = getDocumentOwner(null);
    return {
      id: docId,
      name: `Document ${docId}`,
      owner: owner.name,
      ownerEmail: owner.email,
      description: 'No description given',
      submittedAt: '-',
      lastUpdatedAt: '-',
      status: '',
      recipients: []
    };
  });

  useEffect(() => {
    let cancelled = false;
    fetch(`http://localhost:5000/api/documents/${docId}`)
      .then((res) => res.json())
      .then((data) => {
        const doc = data?.document;
        if (cancelled || !data?.success || !doc) return;
        const owner = getDocumentOwner(doc);
        if (doc.bexsign_doc_id) setServerBexsignId(doc.bexsign_doc_id);
        setDocument({
          id: doc.id || docId,
          name: doc.document_name || `Document ${docId}`,
          owner: owner.name,
          ownerEmail: owner.email,
          description: doc.description || 'No description given',
          submittedAt: formatDateTime(doc.sent_at || doc.created_at),
          lastUpdatedAt: formatDateTime(doc.updated_at || doc.completed_at || doc.created_at),
          status: doc.status || '',
          signingOrder: doc.signing_order === 'sequential' ? 'sequential' : 'parallel',
          recipients: (doc.recipients || []).filter((r) => !r.isFallback).map((r) => ({
            id: r.id,
            name: r.name || r.email,
            email: r.email,
            step: r.signing_order_index || 1,
            status: toRecipientStatus(r),
            ipAddress: r.signed_ip ? String(r.signed_ip).replace(/^::ffff:/, '') : '-',
            actionDevice: describeDevice(r.signed_user_agent),
            signedAt: formatDateTime(r.signed_at),
            viewedAt: formatDateTime(r.viewed_at),
            mailedAt: formatDateTime(r.sent_at)
          }))
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [docId]);

  const [activeMenu, setActiveMenu] = useState(false);
  const [showEditCopy, setShowEditCopy] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [extendModal, setExtendModal] = useState(false);
  const [newExpiryDate, setNewExpiryDate] = useState('2026-09-27');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleCopyDocId = () => {
    navigator.clipboard.writeText(fullBexsignId);
    setCopiedId(true);
    showToast('BexSign Document ID copied to clipboard!');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleMoveToTrash = async () => {
    setActiveMenu(false);
    showToast('Document moved to trash.');
    try {
      await fetch(`http://localhost:5000/api/trash/move/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.error('Error moving doc to trash:', e);
    }
    navigate('/documents/all');
  };

  // Completion: share of signers/approvers who have signed
  const signingRecipients = document.recipients.filter((r) => r.status !== 'copy');
  const totalRecipients = signingRecipients.length;
  const signedRecipients = signingRecipients.filter((r) => r.status === 'signed').length;
  const completionPercentage = totalRecipients > 0 ? Math.round((signedRecipients / totalRecipients) * 100) : 0;
  // Recipients whose turn it is (the lowest signing step that has not signed); later steps wait for them
  const unsignedSteps = signingRecipients.filter((r) => r.status !== 'signed').map((r) => r.step);
  const currentStep = unsignedSteps.length > 0 ? Math.min(...unsignedSteps) : null;
  const currentSigners = signingRecipients.filter((r) => r.status !== 'signed' && r.step === currentStep).map((r) => r.name);
  const [remindingId, setRemindingId] = useState(null);

  const handleSendReminder = async (rec) => {
    setRemindingId(rec.id);
    try {
      const res = await fetch(`http://localhost:5000/api/documents/${docId}/remind`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.error || `HTTP ${res.status}`);
      showToast(`Reminder emailed to ${rec.name}.`);
    } catch (err) {
      showToast(`The reminder could not be sent: ${err instanceof TypeError ? 'server not reachable' : err.message}`);
    } finally {
      setRemindingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={16} className="text-[#00a884]" /> {toastMessage}
        </div>
      )}

      {/* Top Action Toolbar (Matching Image 2) */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          {/* Back Button */}
          <button
            onClick={() => navigate('/documents/all')}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition"
            title="Back to all documents"
          >
            <ArrowLeft size={18} />
          </button>

          <button
            onClick={() => navigate(`/documents/${document.id}/view`)}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 transition"
          >
            <Eye size={16} className="text-slate-500" /> View document
          </button>

          <button
            onClick={() => {
              // A sent or completed request is never edited in place: editing creates a draft copy
              if (String(document.status || '').toLowerCase() === 'draft') navigate(`/documents/${document.id}/edit`);
              else setShowEditCopy(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 transition"
          >
            <Edit size={16} className="text-slate-500" /> Edit
          </button>

          <button
            onClick={() => {
              showToast('Document in correction state.');
              navigate(`/documents/${document.id}/send`);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 transition"
          >
            <FileCheck size={16} className="text-slate-500" /> Correct document
          </button>

          <button
            onClick={() => setExtendModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 transition"
          >
            <Clock size={16} className="text-slate-500" /> Extend
          </button>

          {/* More actions dropdown */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(!activeMenu)}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition"
              title="More actions"
            >
              <MoreVertical size={16} />
            </button>

            {activeMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setActiveMenu(false)} />
                <div className="absolute left-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 text-xs font-semibold text-slate-700">
                  <button onClick={() => { showToast(`Reminder emailed to pending signers`); setActiveMenu(false); }} className="w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-2">
                    <Bell size={14} /> Send reminder
                  </button>
                  <button onClick={() => { showToast(`Auto-reminder schedule updated`); setActiveMenu(false); }} className="w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-2">
                    <Sliders size={14} /> Reminder settings
                  </button>
                  <button onClick={() => { showToast(`Downloading document PDF...`); setActiveMenu(false); }} className="w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-2">
                    <Download size={14} /> Download
                  </button>
                  <button onClick={() => { showToast(`Sending document to printer...`); setActiveMenu(false); }} className="w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-2">
                    <Printer size={14} /> Print
                  </button>
                  <button onClick={handleCopyDocId} className="w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-2">
                    <Copy size={14} /> Copy Document ID
                  </button>
                  <div className="border-t my-1" />
                  <button onClick={handleMoveToTrash} className="w-full px-3 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2">
                    <Trash2 size={14} /> Move to Trash
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Document Overview Section (Matching Image 2) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Document Details Info */}
          <div className="flex items-start gap-5">
            {/* Document Thumbnail Preview Card */}
            <div className="w-24 h-32 bg-slate-700 rounded-xl overflow-hidden shadow-md shrink-0 flex flex-col justify-between p-2 relative group">
              <div className="w-full h-2 bg-slate-600 rounded-xs" />
              <div className="space-y-1">
                <div className="w-3/4 h-1.5 bg-slate-600 rounded-xs" />
                <div className="w-1/2 h-1.5 bg-slate-600 rounded-xs" />
              </div>
              <button
                onClick={() => navigate(`/documents/${document.id}/view`)}
                className="w-full py-1 bg-[#00a884] hover:bg-[#008f70] text-white rounded text-[11px] font-bold flex items-center justify-center gap-1 transition shadow-xs"
              >
                <Eye size={12} /> View
              </button>
            </div>

            {/* Document Meta Information */}
            <div className="space-y-1.5">
              <h1 className="text-xl font-extrabold text-slate-900">{document.name}</h1>
              <p className="text-xs font-semibold text-slate-700">Owned by {document.owner}</p>
              <p className="text-xs text-slate-500">{document.description}</p>
              <p className="text-xs text-slate-500 font-mono">Submitted on {document.submittedAt}</p>
              <p className="text-xs text-slate-500 font-mono">Last updated on {document.lastUpdatedAt}</p>
              
              {/* Full BexSign Unique Document ID without 3 dots */}
              <div className="pt-2 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 select-all break-all">
                  Document ID: <strong className="text-slate-800">{fullBexsignId}</strong>
                </span>
                <button
                  onClick={handleCopyDocId}
                  className="text-[11px] font-bold text-[#00a884] hover:underline flex items-center gap-1"
                  title="Copy full Document ID"
                >
                  <Copy size={12} /> {copiedId ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          {/* Circular Progress Gauge (Matching Image 2: 66%) */}
          <div className="flex flex-col items-center justify-center shrink-0 self-center md:self-auto">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="text-slate-100"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="text-sky-400 transition-all duration-1000 ease-out"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - completionPercentage / 100)}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-sky-500">{completionPercentage}%</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Complete</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recipient Status Section (Matching Image 2 + Task 4 Requirements) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Recipient status</h2>
          <span className="text-xs font-semibold text-slate-500">
            {signedRecipients} of {totalRecipients} recipients completed
            {totalRecipients > 1 && (
              <span className="ml-2 font-bold text-slate-600">
                · {document.signingOrder === 'sequential' ? 'Emailed in order' : 'Emailed to everyone at once'}
              </span>
            )}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
          {document.recipients.map((rec, idx) => {
            const isSigned = rec.status === 'signed';
            const isViewed = rec.status === 'viewed';
            const isEmailed = rec.status === 'emailed'; // email sent, not viewed or signed yet
            const isWaiting = rec.status === 'waiting'; // not emailed yet: waits for earlier recipients in signing order
            const isCopy = rec.status === 'copy';
            const wasMailed = isSigned || isViewed || isEmailed;

            return (
              <div key={rec.id} className="p-5 hover:bg-slate-50/60 transition">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left: Recipient identity and audit description */}
                  <div className="flex items-start gap-4 min-w-0">
                    <span
                      className="font-extrabold text-slate-400 text-sm w-4 shrink-0 pt-0.5"
                      title={document.signingOrder === 'sequential' ? `Signing step ${rec.step}` : 'Emailed at the same time as everyone'}
                    >
                      {document.signingOrder === 'sequential' ? rec.step : idx + 1}
                    </span>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{rec.name}</span>
                        {isSigned && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                            Signed
                          </span>
                        )}
                        {isViewed && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
                            Viewed — Awaiting Signature
                          </span>
                        )}
                        {isEmailed && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                            Emailed — Not Viewed Yet
                          </span>
                        )}
                        {isWaiting && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                            Waiting for turn
                          </span>
                        )}
                        {isCopy && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                            Receives a copy
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 font-medium">{rec.email}</p>

                      {/* Display status details in full without three dots */}
                      {isSigned && (
                        <p className="text-xs text-slate-500 leading-snug break-words">
                          Accessed from IP address <strong className="text-slate-700">{rec.ipAddress}</strong> using <strong className="text-slate-700">{rec.actionDevice}</strong> at {rec.signedAt}
                        </p>
                      )}

                      {isViewed && (
                        <p className="text-xs text-blue-600 leading-snug">
                          Document viewed on {rec.viewedAt} • Waiting for recipient to sign
                        </p>
                      )}

                      {isEmailed && (
                        <div className="flex items-center gap-3 flex-wrap pt-0.5">
                          <p className="text-xs text-amber-700 leading-snug">
                            Email invitation sent on {rec.mailedAt} • <strong>Recipient has not viewed or signed yet</strong>
                          </p>
                          <button
                            onClick={() => handleSendReminder(rec)}
                            disabled={remindingId === rec.id}
                            className="text-xs font-bold text-[#00a884] hover:underline flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0 disabled:opacity-60"
                          >
                            <Send size={11} /> {remindingId === rec.id ? 'Sending...' : 'Send Reminder'}
                          </button>
                        </div>
                      )}

                      {isWaiting && (
                        <p className="text-xs text-slate-500 leading-snug">
                          Receives the email after {currentSigners.length > 0 ? currentSigners.join(', ') : 'the previous recipients'} {currentSigners.length > 1 ? 'have' : 'has'} signed
                        </p>
                      )}

                      {isCopy && (
                        <p className="text-xs text-slate-500 leading-snug">Receives the completed documents by email</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Visual Stepper Progression (Mailed -> Viewed -> Signed) */}
                  <div className="w-full lg:w-80 shrink-0">
                    <div className="flex items-center justify-between text-xs">
                      {/* Step 1: Mailed (only once the invitation email was really sent) */}
                      <div className="flex flex-col items-center gap-1.5 shrink-0">
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                          wasMailed ? 'bg-[#00a884] ring-4 ring-emerald-100' : 'bg-white border-2 border-slate-300 ring-2 ring-slate-100'
                        }`}>
                          {wasMailed && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className={`text-[11px] font-bold ${wasMailed ? 'text-slate-700' : 'text-slate-400'}`}>Mailed</span>
                      </div>

                      {/* Line 1 */}
                      <div className={`flex-1 h-0.5 mx-2 rounded-full ${
                        isSigned || isViewed ? 'bg-[#00a884]' : 'bg-slate-200'
                      }`} />

                      {/* Step 2: Viewed */}
                      <div className="flex flex-col items-center gap-1.5 shrink-0">
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                          isSigned || isViewed 
                            ? 'bg-[#00a884] ring-4 ring-emerald-100' 
                            : 'bg-white border-2 border-slate-300 ring-2 ring-slate-100'
                        }`}>
                          {(isSigned || isViewed) && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className={`text-[11px] font-bold ${
                          isSigned || isViewed ? 'text-slate-700' : 'text-slate-400'
                        }`}>
                          Viewed
                        </span>
                      </div>

                      {/* Line 2 */}
                      <div className={`flex-1 h-0.5 mx-2 rounded-full ${
                        isSigned ? 'bg-[#00a884]' : 'bg-slate-200'
                      }`} />

                      {/* Step 3: Signed */}
                      <div className="flex flex-col items-center gap-1.5 shrink-0">
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                          isSigned 
                            ? 'bg-[#00a884] ring-4 ring-emerald-100' 
                            : 'bg-white border-2 border-slate-300 ring-2 ring-slate-100'
                        }`}>
                          {isSigned && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className={`text-[11px] font-bold ${
                          isSigned ? 'text-slate-700' : 'text-slate-400'
                        }`}>
                          Signed
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showEditCopy && (
        <EditCopyModal
          doc={{ id: document.id, document_name: document.name, status: document.status }}
          onClose={() => setShowEditCopy(false)}
          onCopied={(newId) => {
            setShowEditCopy(false);
            navigate(`/documents/${newId}/send`);
          }}
        />
      )}

      {/* Extend Expiry Date Modal */}
      {extendModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base">Extend Expiration Date</h3>
            <p className="text-xs text-slate-500">
              Select a new deadline date for signers to review and sign this envelope:
            </p>
            <input
              type="date"
              value={newExpiryDate}
              onChange={(e) => setNewExpiryDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-semibold"
            />
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setExtendModal(false)}
                className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  showToast(`Expiration date extended to ${newExpiryDate}`);
                  setExtendModal(false);
                }}
                className="px-4 py-2 bg-[#00a884] text-white rounded-lg text-xs font-bold hover:bg-[#008f70]"
              >
                Confirm Extend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
