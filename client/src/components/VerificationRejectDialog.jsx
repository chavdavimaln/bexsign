import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, FileText, Mail, MessageSquare,
  PenTool, Send, ShieldX, UserCheck
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { Badge, Button, Modal, formatDateTime, inputClass } from './ui/kit';

/**
 * "Reject" of Verify & confirm, in two steps.
 *
 * 1. Review signed data: every signer with what they entered, field by field. The confirmer ticks the fields
 *    that are not correct (and may say what is wrong), or a whole recipient.
 * 2. Reason and delivery: the reason for the rejection, and what happens next:
 *      - "Send back for correction": the request is reopened for the ticked recipients only. They are told by
 *        email, and by SMS when text messages are set up on the server, and sign again. Everyone else keeps
 *        their signature.
 *      - "Reject only": the request stays completed and is recorded as not confirmed. Nobody is told.
 *
 * Props: documentId, open, onClose, onRejected(data) after the server accepted the rejection.
 */

const initialOf = (name) => String(name || '?').trim().charAt(0).toUpperCase() || '?';

function StepDot({ index, label, active, done }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className={`h-6 w-6 shrink-0 rounded-full grid place-items-center text-[11px] font-black transition ${
          done ? 'bg-[#007355] text-white' : active ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-500'
        }`}
      >
        {done ? <Check size={13} strokeWidth={3} /> : index}
      </span>
      <span className={`text-xs font-bold truncate ${active || done ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}

/** What the signer entered, as shown in the review. */
function FieldValue({ value }) {
  if (value.kind === 'signature') {
    const image = value.image || '';
    if (/^data:image\//.test(image)) {
      return <img src={image} alt="Signature" className="h-9 max-w-[160px] object-contain mix-blend-multiply" />;
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-slate-700">
        <PenTool size={12} className="text-slate-400" />
        <span className="font-signature-1 text-base leading-none">{image || value.text || 'Signed'}</span>
      </span>
    );
  }
  if (value.kind === 'checkbox') {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className={`h-4 w-4 rounded-[3px] border grid place-items-center ${value.checked ? 'border-slate-700 text-slate-900' : 'border-slate-300'}`}>
          {value.checked && <Check size={11} strokeWidth={3} />}
        </span>
        <span className="text-slate-700">{value.text}</span>
      </span>
    );
  }
  return value.text
    ? <span className="font-semibold text-slate-900 break-words">{value.text}</span>
    : <span className="italic text-slate-400">Left empty</span>;
}

/**
 * `alreadyRejected`: the request was rejected earlier without telling anybody. The dialog then only serves to
 * send it back for correction, starting from the reason that was given (`initialReason`).
 */
export default function VerificationRejectDialog({ documentId, open, onClose, onRejected, alreadyRejected = false, initialReason = '' }) {
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [step, setStep] = useState(1);
  // { [recipientId]: { selected: boolean, fields: { [fieldId]: note } } }
  const [marks, setMarks] = useState({});
  const [expanded, setExpanded] = useState({});
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState('correct'); // 'correct' | 'reject'
  const [channels, setChannels] = useState({ email: true, sms: false });
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!open || !documentId) return undefined;
    let cancelled = false;
    setState({ loading: true, error: '', data: null });
    setStep(1);
    setMarks({});
    setReason(alreadyRejected ? String(initialReason || '') : '');
    setMode('correct');
    setChannels({ email: true, sms: false });
    setSubmitError('');
    apiFetch(`/verification/${documentId}/review`)
      .then((data) => {
        if (cancelled) return;
        setState({ loading: false, error: '', data });
        // Few recipients: everything open; many: the first one
        const recipients = data.recipients || [];
        setExpanded(Object.fromEntries(recipients.map((r, index) => [r.id, recipients.length <= 2 || index === 0])));
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, error: err.message || 'The signed data could not be loaded.', data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [open, documentId]);

  const recipients = state.data?.recipients || [];
  const smsReady = Boolean(state.data?.smsReady);
  const multipleDocuments = (state.data?.documents || []).length > 1;

  const selected = useMemo(
    () => recipients.filter((r) => marks[r.id]?.selected).map((r) => ({
      ...r,
      marked: r.fields.filter((f) => marks[r.id].fields[f.id] !== undefined)
    })),
    [recipients, marks]
  );
  const willCorrect = mode === 'correct' && selected.length > 0;
  const smsReach = selected.filter((r) => r.phone).length;

  const toggleRecipient = (recipient) => setMarks((prev) => {
    const current = prev[recipient.id];
    if (current?.selected) {
      const { [recipient.id]: _removed, ...rest } = prev;
      return rest;
    }
    return { ...prev, [recipient.id]: { selected: true, fields: current?.fields || {} } };
  });

  const toggleField = (recipient, field) => setMarks((prev) => {
    const current = prev[recipient.id] || { selected: false, fields: {} };
    const fields = { ...current.fields };
    if (fields[field.id] !== undefined) delete fields[field.id];
    else fields[field.id] = '';
    // A field that is not correct means its recipient is asked to correct it
    return { ...prev, [recipient.id]: { selected: Object.keys(fields).length > 0 || current.selected, fields } };
  });

  const setNote = (recipient, field, note) => setMarks((prev) => ({
    ...prev,
    [recipient.id]: { ...prev[recipient.id], fields: { ...prev[recipient.id].fields, [field.id]: note } }
  }));

  const submit = async () => {
    setSubmitError('');
    if (!reason.trim()) {
      setSubmitError('Give the reason for rejecting this document.');
      return;
    }
    setBusy(true);
    try {
      const body = { reason: reason.trim() };
      if (willCorrect) {
        body.corrections = selected.map((r) => ({
          recipientId: r.id,
          fieldIds: r.marked.map((f) => f.id),
          notes: Object.fromEntries(r.marked.map((f) => [f.id, String(marks[r.id].fields[f.id] || '').trim()]))
        }));
        body.channels = { email: channels.email, sms: smsReady && channels.sms };
      }
      const data = await apiFetch(`/verification/${documentId}/reject`, { method: 'POST', body });
      onRejected?.(data);
    } catch (err) {
      setSubmitError(err.message || 'The document could not be rejected.');
    } finally {
      setBusy(false);
    }
  };

  const footer = step === 1 ? (
    <>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button
        icon={ArrowRight}
        onClick={() => { setMode(selected.length > 0 ? 'correct' : 'reject'); setStep(2); }}
        disabled={state.loading || Boolean(state.error) || (alreadyRejected && selected.length === 0)}
      >
        {selected.length > 0
          ? `Continue with ${selected.length} recipient${selected.length === 1 ? '' : 's'}`
          : (alreadyRejected ? 'Tick who has to correct' : 'Continue without corrections')}
      </Button>
    </>
  ) : (
    <>
      <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep(1)} disabled={busy}>Back</Button>
      <Button
        variant="danger"
        icon={willCorrect ? Send : ShieldX}
        busy={busy}
        disabled={!reason.trim() || (willCorrect && !channels.email && !(smsReady && channels.sms))}
        onClick={submit}
      >
        {willCorrect ? `${alreadyRejected ? 'Send' : 'Reject and send'} to ${selected.length} recipient${selected.length === 1 ? '' : 's'}` : 'Reject'}
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={alreadyRejected ? 'Send back for correction' : 'Reject this document'}
      description={alreadyRejected
        ? 'This document was rejected. Mark what is not correct and choose who is asked to correct it and sign again.'
        : 'Review what was signed, mark what is not correct, and decide who is asked to correct it.'}
      icon={AlertTriangle}
      size="lg"
      footer={footer}
    >
      {/* Steps */}
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
        <StepDot index={1} label="Review signed data" active={step === 1} done={step > 1} />
        <span className="h-px flex-1 bg-slate-200" />
        <StepDot index={2} label="Reason and delivery" active={step === 2} done={false} />
      </div>

      {state.loading && <p className="py-10 text-center text-xs font-semibold text-slate-400">Loading the signed data...</p>}
      {state.error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700">{state.error}</div>
      )}

      {/* ---------------------------------------------------------------- Step 1 */}
      {!state.loading && !state.error && step === 1 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            Tick every field that is <strong className="text-slate-900">not correct</strong>. Only the recipients with something ticked are asked to
            correct their part and sign again; everyone else keeps their signature.
          </p>

          {recipients.length === 0 && <p className="py-6 text-center text-xs text-slate-400">This request has no signers.</p>}

          {recipients.map((recipient) => {
            const mark = marks[recipient.id];
            const isSelected = Boolean(mark?.selected);
            const markedCount = mark ? Object.keys(mark.fields).length : 0;
            const isOpen = Boolean(expanded[recipient.id]);
            return (
              <section
                key={recipient.id}
                className={`rounded-2xl border overflow-hidden transition ${isSelected ? 'border-rose-300 shadow-[0_0_0_3px_rgba(244,63,94,0.08)]' : 'border-slate-200'}`}
              >
                <header className={`flex items-center gap-3 px-3.5 py-3 ${isSelected ? 'bg-rose-50/70' : 'bg-slate-50/70'}`}>
                  <span className={`h-9 w-9 shrink-0 rounded-full grid place-items-center text-sm font-black ${isSelected ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {initialOf(recipient.name)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpanded((prev) => ({ ...prev, [recipient.id]: !isOpen }))}
                    aria-expanded={isOpen}
                    className="min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-slate-900 truncate">{recipient.name}</span>
                      <Badge tone="emerald">Signed</Badge>
                      {markedCount > 0 && <Badge tone="rose">{markedCount} not correct</Badge>}
                    </span>
                    <span className="block text-[11px] text-slate-500 truncate">
                      {recipient.email} · {recipient.fields.length} field{recipient.fields.length === 1 ? '' : 's'}
                      {recipient.signedAt ? ` · signed ${formatDateTime(recipient.signedAt)}` : ''}
                    </span>
                  </button>
                  <label className={`shrink-0 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold cursor-pointer transition ${
                    isSelected ? 'border-rose-300 bg-white text-rose-700' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                  }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRecipient(recipient)}
                      className="h-3.5 w-3.5 accent-rose-600 cursor-pointer"
                      aria-label={`Ask ${recipient.name} to correct and sign again`}
                    />
                    <span className="hidden sm:inline">Ask to correct</span>
                    <span className="sm:hidden">Correct</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setExpanded((prev) => ({ ...prev, [recipient.id]: !isOpen }))}
                    aria-label={isOpen ? `Hide the fields of ${recipient.name}` : `Show the fields of ${recipient.name}`}
                    className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white cursor-pointer"
                  >
                    <ChevronDown size={16} className={`transition ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                </header>

                {isOpen && (
                  <div className="divide-y divide-slate-100">
                    {recipient.fields.length === 0 && (
                      <p className="px-4 py-3 text-[11px] text-slate-500">
                        {recipient.name} had no fields to fill in. Tick "Ask to correct" to have them review and {String(recipient.role || '').toLowerCase().includes('approv') ? 'approve' : 'sign'} again.
                      </p>
                    )}
                    {recipient.fields.map((field) => {
                      const note = mark?.fields[field.id];
                      const isMarked = note !== undefined;
                      return (
                        <div key={field.id} className={`px-3.5 py-2.5 ${isMarked ? 'bg-rose-50/50' : ''}`}>
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isMarked}
                              disabled={field.readOnly}
                              onChange={() => toggleField(recipient, field)}
                              className="mt-1 h-4 w-4 shrink-0 accent-rose-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label={`${field.name} of ${recipient.name} is not correct`}
                              title={field.readOnly ? 'This value was set by the sender: the recipient cannot change it' : 'Tick when this is not correct'}
                            />
                            <div className="min-w-0 flex-1 grid sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] gap-x-4 gap-y-1">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{field.name}</p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {field.type}
                                  {multipleDocuments && field.documentName ? ` · ${field.documentName}` : ''}
                                  {field.page > 1 ? ` · page ${field.page}` : ''}
                                  {field.readOnly ? ' · set by the sender' : ''}
                                </p>
                              </div>
                              <div className="min-w-0 text-xs"><FieldValue value={field.value} /></div>
                            </div>
                          </div>
                          {isMarked && (
                            <input
                              type="text"
                              value={note}
                              onChange={(e) => setNote(recipient, field, e.target.value)}
                              maxLength={300}
                              placeholder="What is wrong? (optional, the recipient sees it)"
                              aria-label={`What is wrong with ${field.name}`}
                              className="mt-2 ml-7 w-[calc(100%-1.75rem)] px-2.5 py-1.5 text-xs border border-rose-200 rounded-lg bg-white text-slate-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 placeholder:text-slate-400"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------------------------------- Step 2 */}
      {!state.loading && !state.error && step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="reject-reason">
              Reason <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="reject-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={1000}
              placeholder="Why can this document not be confirmed?"
              className={`${inputClass} resize-none`}
            />
            <p className="text-[11px] text-slate-400 mt-1">Everyone who can open this request sees the reason{willCorrect ? ', and it is sent to the recipients below' : ''}.</p>
          </div>

          {/* Already rejected: the only thing left to decide is who corrects it */}
          <div role="radiogroup" aria-label="What happens after the rejection" className={`grid sm:grid-cols-2 gap-2.5 ${alreadyRejected ? 'hidden' : ''}`}>
            {[
              {
                key: 'correct',
                icon: UserCheck,
                title: 'Send back for correction',
                text: selected.length > 0
                  ? `${selected.length} recipient${selected.length === 1 ? ' is' : 's are'} asked to correct and sign again.`
                  : 'Go back and tick a recipient or a field first.',
                disabled: selected.length === 0
              },
              {
                key: 'reject',
                icon: ShieldX,
                title: 'Reject only',
                text: 'The request stays completed and is recorded as not confirmed. Nobody is told.',
                disabled: false
              }
            ].map((option) => {
              const active = mode === option.key && !option.disabled;
              const Icon = option.icon;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={option.disabled}
                  onClick={() => setMode(option.key)}
                  className={`text-left rounded-2xl border p-3.5 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                    active ? 'border-rose-400 bg-rose-50/60 shadow-[0_0_0_3px_rgba(244,63,94,0.10)]' : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`h-8 w-8 rounded-xl grid place-items-center ${active ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Icon size={16} />
                    </span>
                    <span className="text-sm font-extrabold text-slate-900">{option.title}</span>
                  </span>
                  <span className="block text-[11px] text-slate-500 leading-relaxed mt-1.5">{option.text}</span>
                </button>
              );
            })}
          </div>

          {willCorrect && (
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-800">Who is asked to correct</span>
                <div className="flex items-center gap-2">
                  <label className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold cursor-pointer transition ${channels.email ? 'border-emerald-300 bg-emerald-50 text-[#007355]' : 'border-slate-300 bg-white text-slate-500'}`}>
                    <input
                      type="checkbox"
                      checked={channels.email}
                      onChange={(e) => setChannels((prev) => ({ ...prev, email: e.target.checked }))}
                      className="h-3.5 w-3.5 accent-[#007355] cursor-pointer"
                    />
                    <Mail size={13} /> Email
                  </label>
                  {/* Offered only when text messages can really be sent from this server */}
                  {smsReady && (
                    <label className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold cursor-pointer transition ${channels.sms ? 'border-emerald-300 bg-emerald-50 text-[#007355]' : 'border-slate-300 bg-white text-slate-500'}`}>
                      <input
                        type="checkbox"
                        checked={channels.sms}
                        onChange={(e) => setChannels((prev) => ({ ...prev, sms: e.target.checked }))}
                        className="h-3.5 w-3.5 accent-[#007355] cursor-pointer"
                      />
                      <MessageSquare size={13} /> SMS
                    </label>
                  )}
                </div>
              </div>
              <ul className="divide-y divide-slate-100">
                {selected.map((recipient) => (
                  <li key={recipient.id} className="px-3.5 py-2.5 flex items-start gap-3">
                    <span className="h-7 w-7 shrink-0 rounded-full bg-rose-600 text-white grid place-items-center text-xs font-black">{initialOf(recipient.name)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{recipient.name} <span className="font-medium text-slate-500">· {recipient.email}</span></p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {recipient.marked.length === 0 && <span className="text-[11px] text-slate-500">Asked to review everything and sign again</span>}
                        {recipient.marked.map((field) => (
                          <span key={field.id} className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700 max-w-full">
                            <FileText size={10} className="shrink-0" />
                            <span className="truncate">{field.name}{marks[recipient.id].fields[field.id] ? `: ${marks[recipient.id].fields[field.id]}` : ''}</span>
                          </span>
                        ))}
                      </div>
                      {smsReady && channels.sms && !recipient.phone && (
                        <p className="mt-1 text-[10px] font-semibold text-amber-700">No phone number on this request: {channels.email ? 'email only' : 'this recipient cannot be reached by SMS'}.</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                {!channels.email && !(smsReady && channels.sms)
                  ? <span className="font-semibold text-rose-600">Choose at least one way to tell the recipients.</span>
                  : (
                    <>
                      <CheckCircle2 size={11} className="inline -mt-0.5 mr-1 text-[#007355]" />
                      Only {selected.length === 1 ? 'this recipient is' : 'these recipients are'} told
                      {channels.email ? ' by email' : ''}{channels.email && smsReady && channels.sms ? ' and' : ''}{smsReady && channels.sms ? ` by SMS (${smsReach} of ${selected.length} with a phone number)` : ''}.
                      The marked fields are emptied for them, everything else stays filled in, and they sign again. The other recipients keep their signature.
                    </>
                  )}
              </p>
            </div>
          )}

          {submitError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700" role="alert">{submitError}</div>
          )}
        </div>
      )}
    </Modal>
  );
}
