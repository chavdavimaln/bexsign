import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE, API_ORIGIN } from '../utils/api';
import {
  ShieldCheck, ShieldX, UploadCloud, FileCheck2, Fingerprint, Loader2, RotateCcw, Lock, ArrowLeft
} from 'lucide-react';


const KIND_LABELS = {
  signed: 'Signed document',
  certificate: 'Certificate of completion',
  'signer-copy': "Signer's copy",
  'recipient-copy': "Recipient's copy for review",
  'progress-copy': 'In-progress copy',
  'protected-copy': 'Password-protected copy'
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/**
 * Verify document: checks whether a PDF is an unchanged copy of a PDF issued by BexSign.
 * The file's SHA-256 fingerprint is compared with the fingerprints recorded when signed PDFs were issued,
 * so a copy edited in any application is reported as not verified.
 */
export default function VerifyDocument() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const verify = async (selected) => {
    if (!selected) return;
    if (!/\.pdf$/i.test(selected.name) && selected.type !== 'application/pdf') {
      setError('Choose a PDF file.');
      return;
    }
    setFile(selected);
    setResult(null);
    setError('');
    setIsChecking(true);
    try {
      const form = new FormData();
      form.append('document', selected, selected.name);
      const res = await fetch(`${API_BASE}/documents/verify`, { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `Verification failed (HTTP ${res.status}).`);
      setResult(data);
    } catch (err) {
      setError(err instanceof TypeError
        ? `Could not reach the BexSign server at ${API_ORIGIN}. Make sure it is running, then try again.`
        : err.message);
    } finally {
      setIsChecking(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const record = result?.record;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 px-4 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link to="/documents" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
            <ArrowLeft size={14} /> Documents
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Lock size={12} /> Signed PDFs are locked against editing
          </span>
        </div>

        <div className="text-center space-y-2">
          <span className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-[#007355] flex items-center justify-center">
            <ShieldCheck size={28} />
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Verify a signed document</h1>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            Check that a PDF is an original signed with BexSign and has not been changed since it was issued.
            The file is only compared by its fingerprint and is not stored.
          </p>
        </div>

        {!result && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              verify(e.dataTransfer.files?.[0]);
            }}
            className={`rounded-2xl border-2 border-dashed bg-white px-6 py-12 text-center transition ${
              isDragging ? 'border-[#007355] bg-emerald-50/60' : 'border-slate-300'
            }`}
          >
            {isChecking ? (
              <div className="space-y-3" aria-live="polite">
                <Loader2 size={32} className="mx-auto text-[#007355] animate-spin" />
                <p className="text-sm font-semibold text-slate-700">Checking {file?.name}...</p>
              </div>
            ) : (
              <>
                <UploadCloud size={36} className={`mx-auto mb-3 ${isDragging ? 'text-[#007355]' : 'text-slate-400'}`} />
                <p className="text-sm font-bold text-slate-800">{isDragging ? 'Drop the PDF to verify it' : 'Drag and drop a signed PDF here'}</p>
                <p className="text-xs text-slate-500 mt-1 mb-5">or</p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="px-5 py-2.5 bg-[#007355] hover:bg-[#005c44] text-white rounded-lg text-xs font-bold shadow cursor-pointer"
                >
                  Choose PDF
                </button>
                <p className="text-[11px] text-slate-400 mt-4">Signed documents, certificates of completion and signer copies · up to 25 MB</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => verify(e.target.files?.[0])}
            />
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {result && result.verified && (
          <div className="rounded-2xl border border-emerald-200 bg-white shadow-sm overflow-hidden" aria-live="polite">
            <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-4 flex items-start gap-3">
              <ShieldCheck size={26} className="text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-base font-extrabold text-emerald-900">Verified: original and unchanged</h2>
                <p className="text-xs text-emerald-800 mt-0.5 break-words">
                  <strong>{result.fileName}</strong> is exactly the {(KIND_LABELS[record.kind] || 'document').toLowerCase()} issued by BexSign.
                </p>
              </div>
            </div>
            <dl className="px-5 py-4 grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-x-4 gap-y-2.5 text-xs">
              <dt className="font-semibold text-slate-500">Type</dt>
              <dd className="font-semibold text-slate-800 flex items-center gap-1.5"><FileCheck2 size={14} className="text-[#007355]" /> {KIND_LABELS[record.kind] || record.kind}</dd>
              <dt className="font-semibold text-slate-500">Request</dt>
              <dd className="text-slate-800 break-words">{record.requestName}</dd>
              <dt className="font-semibold text-slate-500">BexSign Document ID</dt>
              <dd className="font-mono text-[11px] text-slate-800 break-all">{record.bexsignDocId}</dd>
              <dt className="font-semibold text-slate-500">Issued on</dt>
              <dd className="text-slate-800">{formatDateTime(record.issuedAt)}</dd>
              {record.recipientEmail && (
                <>
                  <dt className="font-semibold text-slate-500">Copy of</dt>
                  <dd className="text-slate-800 break-all">{record.recipientEmail}</dd>
                </>
              )}
              <dt className="font-semibold text-slate-500">Signers</dt>
              <dd className="space-y-1">
                {(record.signers || []).map((s) => (
                  <div key={s.email} className="flex flex-wrap items-center gap-x-2 text-slate-800">
                    <span className="font-semibold">{s.name || s.email}</span>
                    <span className="text-slate-500 break-all">{s.email}</span>
                    <span className={`text-[10px] font-bold uppercase rounded px-1.5 py-0.5 ${s.status === 'signed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                      {s.status === 'signed' ? `Signed ${formatDateTime(s.signedAt)}` : s.status}
                    </span>
                  </div>
                ))}
              </dd>
              <dt className="font-semibold text-slate-500 flex items-center gap-1"><Fingerprint size={13} /> SHA-256</dt>
              <dd className="font-mono text-[10px] text-slate-600 break-all">{result.sha256}</dd>
            </dl>
          </div>
        )}

        {result && !result.verified && (
          <div className="rounded-2xl border border-red-200 bg-white shadow-sm overflow-hidden" aria-live="polite">
            <div className="bg-red-50 border-b border-red-200 px-5 py-4 flex items-start gap-3">
              <ShieldX size={26} className="text-red-600 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-base font-extrabold text-red-900">Not verified</h2>
                <p className="text-xs text-red-800 mt-0.5 break-words">
                  <strong>{result.fileName}</strong> does not match any PDF issued by BexSign. It was changed after it was
                  downloaded, or it is not a BexSign signed document. Ask the sender for the original.
                </p>
              </div>
            </div>
            <div className="px-5 py-4 text-xs">
              <p className="font-semibold text-slate-500 flex items-center gap-1 mb-1"><Fingerprint size={13} /> SHA-256 of this file</p>
              <p className="font-mono text-[10px] text-slate-600 break-all">{result.sha256}</p>
            </div>
          </div>
        )}

        {(result || error) && (
          <div className="text-center">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 bg-white rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <RotateCcw size={14} /> Verify another file
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
