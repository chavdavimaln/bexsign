import React, { useEffect, useState } from 'react';
import { X, Download, Printer, Upload, PenTool, FileText, AlertTriangle, Clock, CheckCircle2, UserPlus, Loader2 } from 'lucide-react';
import { API_BASE, API_ORIGIN } from '../utils/api';

/**
 * The actions a recipient can take while signing (Zoho Sign "More actions"): read the disclosure, fill and sign
 * in one step, assign the signing to someone else, sign on paper, decline, skip, or look at the document history.
 */


const formatDateTime = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** Shared dialog frame: title bar, scrollable body and a footer with the buttons. */
export function ActionModal({ title, icon = null, onClose, children, footer, width = 'max-w-lg' }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[90vh] w-full ${width} flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            {icon}
            {title}
          </h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <X size={17} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 text-xs text-slate-700">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/70 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

const cancelButton = 'rounded border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50';
const primaryButton = 'rounded bg-[#007355] px-4 py-1.5 text-xs font-bold text-white transition hover:bg-[#005c44] disabled:cursor-not-allowed disabled:opacity-60';
const dangerButton = 'rounded bg-[#dc2626] px-4 py-1.5 text-xs font-bold text-white transition hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-60';
const inputClass = 'w-full rounded border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-[#007355] focus:ring-2 focus:ring-emerald-100';

function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <p className="mt-3 flex items-start gap-1.5 rounded border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] font-semibold text-red-700">
      <AlertTriangle size={13} className="mt-px shrink-0" /> {message}
    </p>
  );
}

const Spinner = () => <Loader2 size={13} className="animate-spin" />;

/** Electronic Record and Signature Disclosure, opened from the consent bar. */
export function TermsModal({ senderName, senderEmail, orgName, onAgree, onClose }) {
  return (
    <ActionModal
      title="Terms and conditions"
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <>
          <button type="button" onClick={onClose} className={cancelButton}>Close</button>
          <button type="button" onClick={onAgree} className={primaryButton}>Agree</button>
        </>
      }
    >
      <div className="space-y-4 rounded-lg bg-slate-50 p-4 leading-relaxed">
        <div>
          <h4 className="text-[15px] font-bold text-slate-900">ELECTRONIC RECORD AND SIGNATURE DISCLOSURE</h4>
          <p className="mt-1.5">
            Please read the following information carefully. By clicking the "Agree" button, you agree that you have reviewed the
            terms and conditions below and consent to transact business electronically using the BexSign electronic signature
            system. If you do not agree to these terms, do not click the "Agree" button.
          </p>
        </div>
        <div>
          <h5 className="text-[13px] font-bold text-slate-900">Electronic documents</h5>
          <p className="mt-1">
            {orgName || 'The sender'} ("we", "us" or "Company") will send all documents electronically to the email address you
            have given during the course of the business relationship, unless you tell us otherwise in accordance with the
            procedure explained here. Once you sign a document electronically, we will send a PDF version of the document to you.
          </p>
        </div>
        <div>
          <h5 className="text-[13px] font-bold text-slate-900">Request for paper copies</h5>
          <p className="mt-1">
            You have the right to request paper copies of the documents sent to you electronically from {senderEmail || 'the sender'}.
            You can also download and print these documents, physically sign them and upload a scanned copy using "Print and
            physically sign". If you wish to request paper copies, you can write back to the sender.
          </p>
        </div>
        <div>
          <h5 className="text-[13px] font-bold text-slate-900">Withdrawing your consent</h5>
          <p className="mt-1">
            At any time during the business relationship you have the right to withdraw your consent to receive documents in
            electronic format. To withdraw your consent, decline to sign this document and send an email to
            {' '}{senderEmail || 'the sender'} telling us that you wish to receive documents only on paper. Once you ask us to, we
            will stop sending you documents through the BexSign electronic signature system.
          </p>
        </div>
        <div>
          <h5 className="text-[13px] font-bold text-slate-900">To tell {senderName || 'the sender'} about a new email address</h5>
          <p className="mt-1">
            If you need to change the email address at which you receive notices and disclosures from us, write to us at
            {' '}{senderEmail || 'the sender'}.
          </p>
        </div>
      </div>
    </ActionModal>
  );
}

/**
 * Quickly fill and sign: the signature saved in the signer's BexSign profile fills every signature, initial and
 * stamp field, and the remaining profile fields (name, email, company, date) are filled in one step.
 */
export function QuickFillModal({ email, signature, signatureStyle, signerName, onRemoveSignature, onAddSignature, onConfirm, onClose, busy }) {
  const [finishWhenFilled, setFinishWhenFilled] = useState(true);
  const isImage = typeof signature === 'string' && /^(data:|https?:|\/)/.test(signature);

  return (
    <ActionModal
      title="Quickly fill and sign"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={cancelButton}>Cancel</button>
          <button type="button" onClick={() => onConfirm({ finishWhenFilled })} disabled={busy || !signature} className={primaryButton}>
            {busy ? <span className="flex items-center gap-1.5"><Spinner /> Filling...</span> : 'Finish'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-700">Email <span className="text-red-500">*</span></label>
          <input type="email" value={email} readOnly className={`${inputClass} bg-slate-50 text-slate-600`} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-700">Signature <span className="text-red-500">*</span></label>
          {signature ? (
            <div className="relative inline-block">
              <div className="flex h-20 w-56 items-center justify-center rounded border border-slate-300 bg-white px-3">
                {isImage ? (
                  <img src={signature} alt="Your signature" className="max-h-16 max-w-full object-contain" />
                ) : (
                  <span className={`text-2xl leading-none text-slate-900 ${signatureStyle || 'font-signature-1'}`}>{signature}</span>
                )}
              </div>
              <button
                type="button"
                onClick={onRemoveSignature}
                title="Remove this signature"
                className="absolute -right-2.5 -top-2.5 grid h-6 w-6 place-items-center rounded-full bg-red-600 text-white shadow-md transition hover:bg-red-700"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAddSignature}
              className="flex h-20 w-56 flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-emerald-500 bg-emerald-50/60 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
            >
              <PenTool size={16} />
              Add your signature
            </button>
          )}
        </div>
        <p className="rounded bg-slate-100 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
          <strong className="text-slate-800">Note:</strong> All profile fields (Signature, Initial, Stamp) will be filled
          automatically using the signature saved in your BexSign profile{signerName ? ` for ${signerName}` : ''}.
        </p>
        <label className="flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={finishWhenFilled}
            onChange={(e) => setFinishWhenFilled(e.target.checked)}
            className="h-4 w-4 accent-[#007355]"
          />
          Finish signing the document if all the fields are filled.
        </label>
      </div>
    </ActionModal>
  );
}

/** Assign to someone else: another person signs in this recipient's place. */
export function AssignModal({ onAssign, onClose, busy, error }) {
  const [form, setForm] = useState({ email: '', name: '', reason: '' });
  const update = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <ActionModal
      title="Assign to someone else"
      icon={<UserPlus size={16} className="text-sky-600" />}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={cancelButton}>Cancel</button>
          <button type="button" onClick={() => onAssign(form)} disabled={busy} className={primaryButton}>
            {busy ? <span className="flex items-center gap-1.5"><Spinner /> Assigning...</span> : 'Assign'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-[80px_1fr] items-center gap-3">
          <label className="text-[12px] font-semibold text-slate-600">Email:</label>
          <input type="email" value={form.email} onChange={update('email')} placeholder="Email" className={inputClass} autoFocus />
        </div>
        <div className="grid grid-cols-[80px_1fr] items-center gap-3">
          <label className="text-[12px] font-semibold text-slate-600">Name:</label>
          <input type="text" value={form.name} onChange={update('name')} placeholder="Name" className={inputClass} />
        </div>
        <div className="grid grid-cols-[80px_1fr] items-start gap-3">
          <label className="pt-2 text-[12px] font-semibold text-slate-600">Reason:</label>
          <textarea value={form.reason} onChange={update('reason')} placeholder="Enter the reason" rows={3} className={`${inputClass} resize-none`} />
        </div>
        <p className="rounded bg-slate-100 px-3 py-2 text-[11px] text-slate-600">
          <strong className="text-slate-800">Note:</strong> The signature request will be emailed to this person and they will
          fill the fields assigned to you. The sender is told about the change.
        </p>
        <ErrorNote message={error} />
      </div>
    </ActionModal>
  );
}

/** Print and physically sign: download or print the document, sign it on paper and upload the scanned copy. */
export function PhysicalSignModal({ onDownload, onPrint, onUpload, onClose, busy, error }) {
  const [file, setFile] = useState(null);
  const [working, setWorking] = useState('');

  const run = async (action, key) => {
    setWorking(key);
    try {
      await action();
    } finally {
      setWorking('');
    }
  };

  return (
    <ActionModal
      title="Print and physically sign"
      icon={<Printer size={16} className="text-slate-500" />}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={cancelButton}>Cancel</button>
          <button type="button" onClick={() => onUpload(file)} disabled={busy || !file} className={primaryButton}>
            {busy ? <span className="flex items-center gap-1.5"><Spinner /> Uploading...</span> : 'Finish'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-[13px] font-bold text-slate-900">Step-1</p>
          <p className="mt-1 text-slate-600">Download and print the document.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => run(onDownload, 'download')} disabled={Boolean(working)} className={`${cancelButton} flex items-center gap-1.5`}>
              {working === 'download' ? <Spinner /> : <Download size={14} />} Download
            </button>
            <button type="button" onClick={() => run(onPrint, 'print')} disabled={Boolean(working)} className={`${cancelButton} flex items-center gap-1.5`}>
              {working === 'print' ? <Spinner /> : <Printer size={14} />} Print
            </button>
          </div>
        </div>
        <div>
          <p className="text-[13px] font-bold text-slate-900">Step-2</p>
          <p className="mt-1 text-slate-600">Physically sign the document and upload a scanned copy.</p>
          <label className={`${cancelButton} mt-2 inline-flex cursor-pointer items-center gap-1.5`}>
            <Upload size={14} /> {file ? 'Choose another file' : 'Upload signed copy'}
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          {file && (
            <p className="mt-2 flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800">
              <FileText size={13} /> {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
            </p>
          )}
        </div>
        <p className="rounded bg-slate-100 px-3 py-2 text-[11px] text-slate-600">
          <strong className="text-slate-800">Note:</strong> Uploading your signed copy completes your part of this request. The
          scanned copy is stored with the document and the sender is notified.
        </p>
        <ErrorNote message={error} />
      </div>
    </ActionModal>
  );
}

/** Decline: the recipient refuses to sign and the request is closed. */
export function DeclineModal({ onDecline, onClose, busy, error }) {
  const [reason, setReason] = useState('');
  return (
    <ActionModal
      title="Decline"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={cancelButton}>Cancel</button>
          <button type="button" onClick={() => onDecline(reason)} disabled={busy || reason.trim().length < 3} className={dangerButton}>
            {busy ? <span className="flex items-center gap-1.5"><Spinner /> Declining...</span> : 'Decline'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-slate-700">Please enter the reason to decline this document.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={5}
          autoFocus
          placeholder="Enter the reason"
          className="w-full resize-none rounded border border-red-200 bg-red-50/60 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
        />
        <p className="rounded bg-slate-100 px-3 py-2 text-[11px] text-slate-600">
          <strong className="text-slate-800">Note:</strong> We shall let the sender of this document know your reason. Please
          contact them for further queries.
        </p>
        <ErrorNote message={error} />
      </div>
    </ActionModal>
  );
}

/** Skip signing: leave the document without saving anything. */
export function SkipModal({ onSkip, onClose }) {
  return (
    <ActionModal
      title="Skip signing"
      icon={<Clock size={16} className="text-slate-500" />}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={cancelButton}>No</button>
          <button type="button" onClick={onSkip} className={dangerButton}>Yes</button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-slate-700">Are you sure you want to skip the signing process?</p>
        <p className="rounded bg-slate-100 px-3 py-2 text-[11px] text-slate-600">
          <strong className="text-slate-800">Note:</strong> The data will not be saved. You can open the link from your email
          again whenever you are ready to sign.
        </p>
      </div>
    </ActionModal>
  );
}

const ACTION_COLORS = {
  DRAFTED: 'text-slate-600 border-slate-300',
  UPDATED: 'text-sky-700 border-sky-300',
  'LINK EMAILED': 'text-slate-600 border-slate-300',
  VIEWED: 'text-indigo-700 border-indigo-300',
  SIGNED: 'text-emerald-700 border-emerald-300',
  COMPLETED: 'text-emerald-700 border-emerald-300',
  DECLINED: 'text-red-700 border-red-300',
  ASSIGNED: 'text-sky-700 border-sky-300',
  REMINDED: 'text-amber-700 border-amber-300',
  RECALLED: 'text-orange-700 border-orange-300'
};

/** Document history: details, recipients and the activity trail of the request. */
export function HistoryModal({ documentId, signerEmail, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/signatures/history/${documentId}?email=${encodeURIComponent(signerEmail || '')}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) setData(json);
        else setError(json.error || 'The document history could not be loaded.');
      })
      .catch(() => {
        if (!cancelled) setError(`Could not reach the BexSign server at ${API_ORIGIN}.`);
      });
    return () => {
      cancelled = true;
    };
  }, [documentId, signerEmail]);

  const detail = (label, value) => (
    <div className="flex gap-2">
      <span className="w-32 shrink-0 text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800 break-all">: {value || '-'}</span>
    </div>
  );

  return (
    <ActionModal
      title="Document history"
      icon={<FileText size={16} className="text-slate-500" />}
      onClose={onClose}
      width="max-w-4xl"
      footer={<button type="button" onClick={onClose} className={primaryButton}>Close</button>}
    >
      {error && <ErrorNote message={error} />}
      {!data && !error && (
        <p className="flex items-center gap-2 py-6 text-slate-500"><Spinner /> Loading the document history...</p>
      )}
      {data && (
        <div className="space-y-6">
          <section>
            <h4 className="mb-2 text-[13px] font-bold text-slate-900">Document details</h4>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {detail('Document ID', data.document.bexsignDocId)}
              {detail('Created on', formatDateTime(data.document.createdAt))}
              {detail('Document name', data.document.name)}
              {detail('Sent on', data.document.sentAt ? `${formatDateTime(data.document.sentAt)} (expires ${data.document.expiresOn})` : '-')}
              {detail('Sender', data.document.sender.email ? `${data.document.sender.name} <${data.document.sender.email}>` : data.document.sender.name)}
              {detail('Time zone', data.document.timeZone)}
              {detail('Organization name', data.document.sender.company)}
              {detail('Signing order', data.document.signingOrder)}
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-[13px] font-bold text-slate-900">Recipients</h4>
            <div className="space-y-2">
              {data.recipients.map((r, idx) => (
                <div key={r.id || r.email} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400">{idx + 1}</span>
                    <div>
                      <p className="font-bold text-slate-900">{r.name} <span className="font-normal text-slate-500">&lt;{r.email}&gt;</span></p>
                      {r.delegatedFrom && <p className="text-[11px] text-sky-700">Assigned by {r.delegatedFrom}</p>}
                      {r.declineReason && <p className="text-[11px] text-red-700">Declined: {r.declineReason}</p>}
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-600">
                    <p className="font-semibold text-slate-800">{r.role}</p>
                    <p>
                      {r.signedAt
                        ? `Signed on ${formatDateTime(r.signedAt)}`
                        : r.declinedAt
                          ? `Declined on ${formatDateTime(r.declinedAt)}`
                          : r.viewedAt
                            ? `Viewed on ${formatDateTime(r.viewedAt)}`
                            : r.sentAt
                              ? `Received on ${formatDateTime(r.sentAt)}`
                              : 'Not emailed yet'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-[13px] font-bold text-slate-900">Activities</h4>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[640px] text-left text-[11.5px]">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Time of activity</th>
                    <th className="px-3 py-2">Performed by</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.activities.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400">No activity recorded yet.</td></tr>
                  )}
                  {data.activities.map((a, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatDateTime(a.at)}</td>
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-800">{a.performedBy}</p>
                        {a.ip && <p className="text-[10px] text-slate-400">[{String(a.ip).replace(/^::ffff:/, '')}]</p>}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ACTION_COLORS[a.action] || 'text-slate-600 border-slate-300'}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" /> {a.action}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{a.activity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </ActionModal>
  );
}

/** Final screen after declining, assigning or skipping. */
export function SigningOutcomeScreen({ outcome, documentName, onBack }) {
  const styles = {
    declined: { icon: <AlertTriangle size={30} />, color: 'text-red-600', ring: 'bg-red-50 border-red-200', title: 'Document declined' },
    assigned: { icon: <UserPlus size={30} />, color: 'text-sky-600', ring: 'bg-sky-50 border-sky-200', title: 'Assigned to someone else' },
    skipped: { icon: <Clock size={30} />, color: 'text-slate-500', ring: 'bg-slate-100 border-slate-200', title: 'Signing skipped' }
  }[outcome.type] || { icon: <CheckCircle2 size={30} />, color: 'text-emerald-600', ring: 'bg-emerald-50 border-emerald-200', title: 'Done' };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 font-sans">
      <div className="w-full max-w-lg space-y-5 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full border ${styles.ring} ${styles.color}`}>{styles.icon}</div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-slate-900">{styles.title}</h1>
          <p className="text-sm text-slate-600">{outcome.message}</p>
          {documentName && <p className="text-xs font-semibold text-slate-500">{documentName}</p>}
        </div>
        {outcome.type === 'skipped' && (
          <p className="rounded bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Nothing was saved. Open the link in your email again whenever you are ready to sign.
          </p>
        )}
        <button type="button" onClick={onBack} className={`${primaryButton} w-full py-2.5 text-sm`}>Back to documents</button>
      </div>
    </div>
  );
}
