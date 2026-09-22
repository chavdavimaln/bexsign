import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw, CheckCircle2, XCircle, History, AlertTriangle } from 'lucide-react';
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
 * Nothing is rendered for a request whose sender turned the step off, or before the request is completed.
 */

const ACTION_LABELS = {
  awaiting: 'Waiting for confirmation',
  checked: 'Integrity checked',
  confirmed: 'Verified & confirmed',
  rejected: 'Rejected',
  required: 'Confirmation step turned on',
  not_required: 'Confirmation step turned off'
};

const RESULT_TONES = { valid: 'emerald', modified: 'rose', invalid: 'rose', unknown: 'amber' };
const RESULT_LABELS = { valid: 'Authentic', modified: 'Modified', invalid: 'Not a PDF', unknown: 'Not recognized' };

export default function DocumentVerificationPanel({ documentId, documentStatus, onToast }) {
  const { can } = usePermissions();
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [busy, setBusy] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
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

  useEffect(() => {
    load();
  }, [load, documentStatus]);

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
      setRejectOpen(false);
      setNote('');
      setReason('');
      await load();
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy('');
    }
  };

  if (state.loading || !record) return null;
  // Nothing to show when the sender turned the step off, or while recipients are still signing
  if (!record.required || !record.isCompleted) return null;

  const isPending = record.status === 'pending';
  const isConfirmed = record.status === 'confirmed';
  const isRejected = record.status === 'rejected';
  const integrityTone = RESULT_TONES[record.integrityResult] || 'slate';

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
      <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isConfirmed ? 'bg-emerald-50 text-[#007355]' : isRejected ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
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

        {record.integrityResult && (
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

        {canConfirm && (
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

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject this document"
        description="The request stays completed, but it is recorded as not confirmed."
        icon={AlertTriangle}
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              busy={busy === 'reject'}
              disabled={!reason.trim()}
              onClick={() => run('reject', `/verification/${documentId}/reject`, { reason }, 'The document was rejected.')}
            >
              Reject
            </Button>
          </>
        )}
      >
        <Field label="Reason" required hint="Everyone who can open this request sees the reason.">
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why can this document not be confirmed?"
            className={`${inputClass} resize-none`}
          />
        </Field>
      </Modal>
    </section>
  );
}
