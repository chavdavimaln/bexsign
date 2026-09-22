/**
 * The dialogs behind the document page's action bar (client/src/components/documents/documentActionModals.jsx):
 * download options, emailing a copy, the activity history and the signing disclosure.
 *
 * Each one talks to the real API through apiFetch/apiDownload, so nothing here is a placeholder.
 */
import React, { useEffect, useState } from 'react';
import { X, Download, Mail, History, ShieldCheck, Loader2, FileText, Eye, EyeOff } from 'lucide-react';
import { API_BASE, apiFetch, authHeaders } from '../../utils/api';
import { Button, Badge, EmptyState, ErrorBanner, formatDateTime } from '../ui/kit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_RECIPIENTS = 3;

function Shell({ title, icon: Icon, onClose, children, footer, wide = false }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-4 overflow-y-auto" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`bg-white w-full ${wide ? 'max-w-3xl' : 'max-w-md'} sm:rounded-2xl shadow-2xl flex flex-col max-h-full sm:max-h-[90vh] overflow-hidden my-auto`}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-[#007355] grid place-items-center shrink-0"><Icon size={18} /></span>
            <h2 className="text-base font-extrabold text-slate-900 truncate">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/** Download: which files, as separate PDFs or merged into one, and whether to lock them with a password. */
export function DownloadOptionsModal({ document: doc, onClose, onToast }) {
  const [choice, setChoice] = useState('documents');
  const [merge, setMerge] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isCompleted = String(doc.status || '').toLowerCase() === 'completed';

  const options = [
    { id: 'documents', label: 'Document(s)', hint: 'The signed documents of this request.' },
    { id: 'certificate', label: 'Certificate of completion', hint: 'The audit certificate with every signer, time, IP address and device.', disabled: !isCompleted },
    { id: 'both', label: 'Document(s) and certificate of completion', hint: 'Both, so the whole record travels together.', disabled: !isCompleted }
  ];

  const run = async () => {
    if (usePassword && password.trim().length < 4) {
      setError('Enter a password of at least 4 characters, or turn the password off.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { downloadSignedDocument, downloadAllSignedDocuments, downloadCompletionCertificate } = await import('../../utils/signedPdf');
      if (merge || usePassword) {
        // One file: merged on the server, and locked there when a password is asked for
        const res = await fetch(`${API_BASE}/documents/${doc.id}/bundle-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ include: choice, password: usePassword ? password.trim() : '' })
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `The download failed (HTTP ${res.status}).`);
        }
        const blob = await res.blob();
        const href = URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = href;
        link.download = `${doc.name || doc.document_name || 'Document'}.pdf`;
        window.document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(href), 1500);
      } else if (choice === 'certificate') {
        await downloadCompletionCertificate(doc.id);
      } else {
        await downloadAllSignedDocuments(doc.id);
        if (choice === 'both') await downloadCompletionCertificate(doc.id);
      }
      onToast?.('Download started.');
      onClose();
    } catch (e) {
      setError(e.message || 'The download could not be prepared.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell
      title="Select download option"
      icon={Download}
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={run} disabled={busy}>{busy ? 'Preparing...' : 'Download'}</Button>
        </>
      )}
    >
      <p className="text-xs text-slate-500 mb-3">Choose an option below to download the corresponding files.</p>
      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.id}
            className={`flex items-start gap-2.5 p-3 rounded-xl border transition ${
              choice === option.id ? 'border-[#007355] bg-emerald-50' : 'border-slate-200'
            } ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-slate-300'}`}
          >
            <input
              type="radio"
              name="bex-download-option"
              className="mt-0.5 accent-[#007355]"
              checked={choice === option.id}
              disabled={option.disabled}
              onChange={() => setChoice(option.id)}
            />
            <span className="min-w-0">
              <span className="block text-sm font-bold text-slate-800">{option.label}</span>
              <span className="block text-xs text-slate-500">
                {option.hint}{option.disabled ? ' Available once every recipient has signed.' : ''}
              </span>
            </span>
          </label>
        ))}
      </div>

      <label className="flex items-center gap-2 mt-4 text-xs font-semibold text-slate-700 cursor-pointer select-none">
        <input type="checkbox" className="accent-[#007355] h-3.5 w-3.5" checked={merge} onChange={(e) => setMerge(e.target.checked)} />
        <span>Merge everything into a single PDF file</span>
      </label>

      <label className="flex items-center gap-2 mt-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
        <input type="checkbox" className="accent-[#007355] h-3.5 w-3.5" checked={usePassword} onChange={(e) => setUsePassword(e.target.checked)} />
        <span>Protect with password</span>
      </label>
      {usePassword && (
        <div className="mt-2 relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            aria-label="Password for the downloaded file"
            className="w-full px-3 py-2 pr-10 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#007355] focus:ring-2 focus:ring-emerald-100"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
          <p className="text-[11px] text-slate-400 mt-1">The file is locked with this password, and merged into one PDF so the password covers everything.</p>
        </div>
      )}
    </Shell>
  );
}

/** Email document: sends the signed copy to people who were not part of the request. */
export function EmailDocumentModal({ document: doc, onClose, onToast }) {
  const [emails, setEmails] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const list = emails.split(/[,;\n]/).map((e) => e.trim()).filter(Boolean);

  const send = async () => {
    if (list.length === 0) return setError('Enter at least one email address.');
    if (list.length > MAX_EMAIL_RECIPIENTS) return setError(`You can only send to ${MAX_EMAIL_RECIPIENTS} recipients at a time.`);
    const bad = list.filter((e) => !EMAIL_RE.test(e));
    if (bad.length) return setError(`This is not a valid email address: ${bad[0]}`);
    setBusy(true);
    setError('');
    try {
      const data = await apiFetch(`/documents/${doc.id}/email-copy`, {
        method: 'POST',
        body: { emails: list, recipients: list, message }
      });
      setResult(data);
      onToast?.(`Copy emailed to ${list.join(', ')}`);
      onClose();
    } catch (e) {
      setError(e.message || 'The document could not be emailed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell
      title="Email document"
      icon={Mail}
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Close</Button>
          <Button onClick={send} disabled={busy}>{busy ? 'Sending...' : 'Send'}</Button>
        </>
      )}
    >
      <p className="text-xs text-slate-600">Recipients added here will get a copy of the signed document.</p>
      {error && <div className="my-3"><ErrorBanner message={error} /></div>}
      <textarea
        rows={3}
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
        placeholder="Enter email address"
        aria-label="Email addresses"
        className="mt-3 w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#007355] focus:ring-2 focus:ring-emerald-100"
      />
      <textarea
        rows={2}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Add a short message (optional)"
        aria-label="Message"
        className="mt-2 w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#007355] focus:ring-2 focus:ring-emerald-100"
      />
      <p className="mt-3 text-[11px] bg-slate-100 text-slate-600 rounded-lg px-3 py-2">
        <strong className="text-slate-700">Note:</strong> You can only send to {MAX_EMAIL_RECIPIENTS} recipients at a time.
      </p>
      {result?.failed?.length > 0 && (
        <p className="mt-2 text-[11px] text-rose-600">Could not deliver to: {result.failed.map((f) => f.email || f).join(', ')}</p>
      )}
    </Shell>
  );
}

const ACTION_TONE = {
  DRAFTED: 'bg-blue-100 text-blue-800',
  UPDATED: 'bg-blue-100 text-blue-800',
  'LINK EMAILED': 'bg-slate-100 text-slate-700',
  'REMINDER SENT': 'bg-amber-100 text-amber-800',
  VIEWED: 'bg-sky-100 text-sky-800',
  'TERMS AGREED': 'bg-violet-100 text-violet-800',
  'SIGNING SUCCESS': 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  DECLINED: 'bg-rose-100 text-rose-800',
  RECALLED: 'bg-orange-100 text-orange-800',
  DOWNLOADED: 'bg-slate-100 text-slate-700',
  'EMAIL FAILED': 'bg-rose-100 text-rose-800'
};

/** Activity history: everything that happened to this request, from the audit trail. */
export function ActivityHistoryModal({ document: doc, onClose, onToast }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/documents/${doc.id}/activity`)
      .then((data) => { if (!cancelled) setRows(data.activity || []); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [doc.id]);

  const total = rows?.length || 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const shown = (rows || []).slice((page - 1) * pageSize, page * pageSize);

  const exportCsv = async () => {
    try {
      const res = await fetch(`${API_BASE}/documents/${doc.id}/activity?format=csv`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`Export failed (HTTP ${res.status}).`);
      const href = URL.createObjectURL(await res.blob());
      const link = window.document.createElement('a');
      link.href = href;
      link.download = `activity-${doc.id}.csv`;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(href), 1500);
      onToast?.('Activity history exported.');
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <Shell
      title="Activity history"
      icon={History}
      onClose={onClose}
      wide
      footer={(
        <>
          <span className="mr-auto text-[11px] text-slate-500">{total > 0 ? `View 1 - ${shown.length} of ${total}` : ''}</span>
          {pages > 1 && (
            <div className="flex items-center gap-1 mr-2">
              <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <span className="text-xs font-semibold text-slate-600 px-2">{page} / {pages}</span>
              <Button variant="secondary" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>Next</Button>
            </div>
          )}
          <Button variant="secondary" onClick={exportCsv} disabled={!total}>Export as CSV</Button>
          <Button onClick={onClose}>Close</Button>
        </>
      )}
    >
      {error && <ErrorBanner message={error} />}
      {rows === null && !error && (
        <div className="py-10 grid place-items-center text-slate-400"><Loader2 size={20} className="animate-spin" /></div>
      )}
      {rows && total === 0 && <EmptyState icon={History} title="Nothing recorded yet" message="Activity appears here as soon as the request is sent." />}
      {total > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[560px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200">
                <th className="p-2.5 whitespace-nowrap">TIME OF ACTIVITY</th>
                <th className="p-2.5">PERFORMED BY</th>
                <th className="p-2.5 whitespace-nowrap">ACTION</th>
                <th className="p-2.5">ACTIVITY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {shown.map((row, i) => (
                <tr key={`${row.at}-${i}`} className="hover:bg-slate-50 align-top">
                  <td className="p-2.5 whitespace-nowrap font-mono text-slate-600">{formatDateTime(row.at)}</td>
                  <td className="p-2.5 font-semibold text-slate-700 break-words">{row.by}</td>
                  <td className="p-2.5 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded font-bold ${ACTION_TONE[row.action] || 'bg-slate-100 text-slate-700'}`}>{row.action}</span>
                  </td>
                  <td className="p-2.5 text-slate-600 break-words">
                    {row.activity}
                    {row.ip && <span className="block text-[10px] text-slate-400">IP {row.ip}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}

/** The disclosure recipients agree to before signing, and who has agreed so far. */
export function LegalDisclosureModal({ document: doc, recipients = [], onClose }) {
  return (
    <Shell
      title="Electronic Record and Signature Disclosure"
      icon={ShieldCheck}
      onClose={onClose}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <p className="text-xs text-slate-600 leading-relaxed">
        Please read this Electronic Record and Signature Disclosure carefully. By executing this document, you agree
        to receive disclosures, notices and communications electronically, and you agree that your electronic
        signature has the same legal effect as a handwritten signature.
      </p>
      <p className="text-xs text-slate-600 leading-relaxed mt-2">
        A record of this agreement - the time and the IP address it was given from - is kept with the request and
        printed on the certificate of completion.
      </p>

      <h3 className="mt-4 text-xs font-extrabold text-slate-700 uppercase tracking-wide">Agreed by</h3>
      <div className="mt-2 space-y-1.5">
        {recipients.length === 0 && <p className="text-xs text-slate-400">No recipients on this request.</p>}
        {recipients.map((r) => {
          const at = r.consent_at || r.consentAt;
          return (
            <div key={r.id || r.email} className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{r.name || r.email}</p>
                <p className="text-[11px] text-slate-500 truncate">{r.email}</p>
              </div>
              {at
                ? <Badge tone="emerald">Agreed {formatDateTime(at)}</Badge>
                : <Badge tone="slate">Not yet agreed</Badge>}
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

export { FileText };
