import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck, RefreshCw, CheckCircle2, XCircle, History, AlertTriangle, Mail, MessageSquare, Clock, UserCheck } from 'lucide-react';
import VerificationRejectDialog from './VerificationRejectDialog';
import { apiFetch } from '../utils/api';
import { usePermissions } from '../utils/permissions';
import { Badge, Button, Modal, Field, inputClass, formatDateTime } from './ui/kit';

/**
 * "Verify & confirm the completed document" on the Document details page.
 *
 * A request whose sender kept "Verify and confirm the document when everyone has signed" ticked is not finished
 * when the last recipient signs: it waits here. The owner (or a user with Document validity rights) runs the
 * check, which compares every signed PDF and the certificate of completion with the fingerprint BexSign recorded
 * when it issued them, and then confirms or rejects the request. Every check is kept in the event history.
 *
 * "Reject" opens a review of what every recipient signed (VerificationRejectDialog). The confirmer can reject
 * only, or send the request back to the recipients whose data is not correct; while they sign again the panel
 * shows who was asked and what for.
 *
 * Nothing is rendered for a request whose sender turned the step off, or before the request is completed.
 */

const ACTION_LABELS = {
  awaiting: 'Waiting for confirmation',
  checked: 'Integrity checked',
  confirmed: 'Verified & confirmed',
  rejected: 'Rejected',
  correction: 'Sent back for correction',
  required: 'Confirmation step turned on',
  not_required: 'Confirmation step turned off'
};

const RESULT_TONES = { valid: 'emerald', modified: 'rose', invalid: 'rose', unknown: 'amber' };
const RESULT_LABELS = { valid: 'Authentic', modified: 'Modified', invalid: 'Not a PDF', unknown: 'Not recognized' };

export default function DocumentVerificationPanel({ documentId, documentStatus, onToast, onChanged, refreshKey = 0 }) {
  const { can } = usePermissions();
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [busy, setBusy] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const toast = useCallback((message) => {
    if (typeof onToast === 'function') onToast(message);
  }, [onToast]);

  const load = useCallback(async () => {
    if (!documentId) return;
    try {
      const data = await apiFetch(`/verification/${documentId}`);
      setState({ loading: false, data, error: '' });
    } catch (err) {
      setState({ loading: false, data: null, error: err.message });
    }
  }, [documentId]);

  // Read again when the request changes, and whenever the page around the panel is refreshed
  useEffect(() => {
    load();
  }, [load, documentStatus, refreshKey]);

  const record = state.data?.verification || null;
  const events = state.data?.events || [];
  // The owner may always confirm; anyone else needs the Document validity permission
  const canConfirm = Boolean(state.data?.canConfirm ?? can('security.document_validity'));

  const run = async (kind, path, body, successMessage) => {
    setBusy(kind);
    try {
      const data = await apiFetch(path, { method: 'POST', body });
      setState((prev) => ({ loading: false, data: { ...(prev.data || {}), ...data }, error: '' }));
      toast(data.message || successMessage);
      setConfirmOpen(false);
      setNote('');
      await load();
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy('');
    }
  };

  // Opened from "Verify & confirm" in a documents list (#verify-confirm): bring the panel into view and mark it briefly
  const sectionRef = useRef(null);
  const [highlighted, setHighlighted] = useState(false);
  // Shown once everyone has signed, and while recipients are correcting their part after a rejection
  const isShown = Boolean(!state.loading && record && record.required && (record.isCompleted || record.status === 'correction'));
  useEffect(() => {
    if (!isShown || window.location.hash !== '#verify-confirm' || !sectionRef.current) return undefined;
    sectionRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setHighlighted(true);
    const timer = setTimeout(() => setHighlighted(false), 2500);
    return () => clearTimeout(timer);
  }, [isShown, documentId]);

  // Nothing to show when the sender turned the step off, or while recipients are still signing
  if (!isShown) return null;

  const isPending = record.status === 'pending';
  const isConfirmed = record.status === 'confirmed';
  const isRejected = record.status === 'rejected';
  const isCorrecting = record.status === 'correction';
  const correction = record.correction;
  const integrityTone = RESULT_TONES[record.integrityResult] || 'slate';

  return (
    <section
      ref={sectionRef}
      id="verify-confirm"
      className={`bg-white border rounded-2xl shadow-2xs overflow-hidden transition-shadow duration-500 ${highlighted ? 'border-amber-300 ring-4 ring-amber-100' : 'border-slate-200'}`}
    >
      <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isConfirmed ? 'bg-emerald-50 text-[#007355]' : isRejected ? 'bg-rose-50 text-rose-600' : isCorrecting ? 'bg-sky-50 text-sky-600' : 'bg-amber-50 text-amber-600'}`}>
            <ShieldCheck size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-slate-900">Verification &amp; confirmation</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              The signed documents are checked against the fingerprint BexSign recorded when it issued them.
            </p>
          </div>
        </div>
        <Badge tone={record.tone} dot className="self-start sm:self-auto">{record.statusLabel}</Badge>
      </div>

      <div className="p-4 sm:p-5 space-y-3">
        {isPending && (
          <p className="text-xs text-slate-600 leading-relaxed">
            Every recipient has signed. {canConfirm
              ? 'Verify the completed documents and confirm them to close this request.'
              : 'The owner of this request still has to verify and confirm the completed documents.'}
          </p>
        )}

        {/* Rejected and sent back: who is correcting what, and how they were told */}
        {isCorrecting && (
          <div className="rounded-xl border border-sky-200 bg-sky-50/60 overflow-hidden">
            <div className="px-3 py-2.5">
              <p className="text-xs font-bold text-sky-800 flex items-center gap-1.5">
                <UserCheck size={13} className="shrink-0" />
                Sent back for correction by {correction?.requestedBy || record.confirmedBy?.name || 'a user'} on {formatDateTime(correction?.requestedAt || record.confirmedAt)}
              </p>
              <p className="text-xs text-sky-900/90 mt-1 break-words"><span className="font-bold">Reason:</span> {record.rejectedReason}</p>
            </div>
            {(correction?.recipients || []).length > 0 && (
              <ul className="divide-y divide-sky-100 border-t border-sky-200 bg-white">
                {correction.recipients.map((r) => (
                  <li key={r.id} className="px-3 py-2 flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{r.name} <span className="font-medium text-slate-500">· {r.email}</span></p>
                      <p className="text-[11px] text-slate-500 break-words">
                        {(r.fields || []).length > 0
                          ? <>To correct: {r.fields.map((f) => (f.note ? `${f.label} (${f.note})` : f.label)).join(', ')}</>
                          : 'Asked to review everything and sign again'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 shrink-0">
                      {r.waitingTurn && <Badge tone="slate"><Clock size={10} className="inline -mt-0.5 mr-0.5" />Waits for their turn</Badge>}
                      {r.emailed && <Badge tone="emerald"><Mail size={10} className="inline -mt-0.5 mr-0.5" />Emailed</Badge>}
                      {r.emailError && <Badge tone="rose">Email failed</Badge>}
                      {r.sms?.sent && <Badge tone="emerald"><MessageSquare size={10} className="inline -mt-0.5 mr-0.5" />SMS sent</Badge>}
                      {r.sms && !r.sms.sent && <Badge tone="amber">SMS not sent</Badge>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="px-3 py-2 border-t border-sky-200 text-[11px] text-sky-900/80 leading-relaxed">
              When they have signed again, the request is completed and comes back here to be verified and confirmed.
            </p>
          </div>
        )}

        {isConfirmed && (
          <p className="text-xs text-slate-600 leading-relaxed">
            Verified and confirmed by <strong className="text-slate-800">{record.confirmedBy?.name || 'a user'}</strong> on{' '}
            {formatDateTime(record.confirmedAt)}.
          </p>
        )}

        {isRejected && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
            <p className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
              <AlertTriangle size={13} className="shrink-0" /> Rejected by {record.confirmedBy?.name || 'a user'} on {formatDateTime(record.confirmedAt)}
            </p>
            <p className="text-xs text-rose-700/90 mt-1 break-words">{record.rejectedReason}</p>
          </div>
        )}

        {record.integrityResult && !isCorrecting && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Integrity check</span>
              <Badge tone={integrityTone}>{RESULT_LABELS[record.integrityResult] || record.integrityResult}</Badge>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed break-words">{record.integrityMessage}</p>
          </div>
        )}

        {record.note && (
          <p className="text-xs text-slate-500 leading-relaxed break-words">
            <span className="font-bold text-slate-600">Note:</span> {record.note}
          </p>
        )}

        {canConfirm && !isCorrecting && (
          <div className="flex flex-wrap gap-2 pt-1">
            {!isConfirmed && (
              <Button icon={CheckCircle2} busy={busy === 'confirm'} onClick={() => setConfirmOpen(true)}>
                Verify &amp; confirm
              </Button>
            )}
            {!isRejected && !isConfirmed && (
              <Button variant="subtleDanger" icon={XCircle} busy={busy === 'reject'} onClick={() => setRejectOpen(true)}>
                Reject
              </Button>
            )}
            {/* Rejected without telling anybody: the recipients can still be asked to correct their part */}
            {isRejected && record.isCompleted && (
              <Button variant="secondary" icon={UserCheck} onClick={() => setRejectOpen(true)}>
                Send back for correction
              </Button>
            )}
            <Button
              variant="secondary"
              icon={RefreshCw}
              busy={busy === 'check'}
              onClick={() => run('check', `/verification/${documentId}/check`, {}, 'Integrity check finished.')}
            >
              Check again
            </Button>
          </div>
        )}

        {events.length > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="text-[11px] font-bold text-[#007355] hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <History size={12} /> {showHistory ? 'Hide' : 'Show'} verification history ({events.length})
            </button>
            {showHistory && (
              <ul className="mt-2 space-y-2 border-t border-slate-100 pt-3">
                {events.map((event) => (
                  <li key={event.id} className="flex items-start gap-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${event.action === 'rejected' ? 'bg-rose-500' : event.action === 'confirmed' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700">
                        {ACTION_LABELS[event.action] || event.action}
                        {event.actorName && <span className="font-medium text-slate-500"> · {event.actorName}</span>}
                      </p>
                      {event.message && <p className="text-[11px] text-slate-500 leading-snug break-words">{event.message}</p>}
                      <p className="text-[11px] text-slate-400 mt-0.5">{formatDateTime(event.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Verify & confirm"
        description="The signed PDFs and the certificate of completion are checked again before the request is confirmed."
        icon={ShieldCheck}
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button
              busy={busy === 'confirm'}
              onClick={() => run('confirm', `/verification/${documentId}/confirm`, { note }, 'The document was verified and confirmed.')}
            >
              Verify &amp; confirm
            </Button>
          </>
        )}
      >
        <Field label="Note (optional)" hint="Kept with the confirmation in the verification history.">
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Checked against the signed originals..."
            className={`${inputClass} resize-none`}
          />
        </Field>
      </Modal>

      {/* Review what was signed, then reject only or send it back to the recipients whose data is not correct */}
      <VerificationRejectDialog
        documentId={documentId}
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        alreadyRejected={isRejected}
        initialReason={record.rejectedReason || ''}
        onRejected={async (data) => {
          setRejectOpen(false);
          toast(data.message || 'The document was rejected.');
          await load();
          // The request may be in progress again: the page around this panel shows that
          if (typeof onChanged === 'function') onChanged(data);
        }}
      />
    </section>
  );
}
