import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ShieldCheck,
  ShieldX,
  ShieldQuestion,
  FileX2,
  FileUp,
  Fingerprint,
  History,
  FileCheck2,
  Files,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Lock,
  Info,
  UserRound,
  BadgeCheck,
  RotateCcw
} from 'lucide-react';
import {
  PageHeader,
  StatCard,
  Card,
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  SearchInput,
  SelectInput,
  Tabs,
  Pagination,
  inputClass,
  thClass,
  tdClass,
  formatDateTime,
  formatRelative
} from '../../components/ui/kit';
import { apiFetch } from '../../utils/api';
import { usePermissions } from '../../utils/permissions';
import { buildQuery, useDebouncedValue, CopyButton, DateRangeInputs, shortHash } from '../../components/security/securityUi';

const MAX_SIZE = 25 * 1024 * 1024;

const RESULTS = {
  valid: { label: 'Authentic', tone: 'emerald', icon: ShieldCheck, title: 'Authentic document', card: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white', iconClass: 'bg-[#007355] text-white' },
  modified: { label: 'Modified', tone: 'red', icon: ShieldX, title: 'Modified after it was issued', card: 'border-red-200 bg-gradient-to-br from-red-50 to-white', iconClass: 'bg-red-600 text-white' },
  unknown: { label: 'Not recognized', tone: 'rose', icon: ShieldQuestion, title: 'Not issued by BexSign', card: 'border-rose-200 bg-gradient-to-br from-rose-50 to-white', iconClass: 'bg-rose-600 text-white' },
  invalid: { label: 'Not a PDF', tone: 'slate', icon: FileX2, title: 'Not a PDF document', card: 'border-slate-300 bg-gradient-to-br from-slate-100 to-white', iconClass: 'bg-slate-600 text-white' }
};
const SOURCES = { upload: 'Upload', link: 'Fingerprint / link', auto: 'Automatic' };
const STATUS_TONES = { Completed: 'emerald', 'In Progress': 'sky', Draft: 'slate', Declined: 'red', Recalled: 'amber', Expired: 'orange', Deleted: 'slate' };
const KIND_TONES = { signed: 'emerald', certificate: 'violet', 'signer-copy': 'sky', 'progress-copy': 'amber', 'protected-copy': 'indigo' };
const KIND_SHORT = { signed: 'signed', certificate: 'certificate', 'signer-copy': "signer's copy", 'progress-copy': 'in-progress copy', 'protected-copy': 'protected copy' };
const EMPTY_HISTORY_FILTERS = { search: '', result: 'all', source: 'all', from: '', to: '' };

const formatSize = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round((bytes || 0) / 1024))} KB`);

function ResultBadge({ result }) {
  const meta = RESULTS[result] || RESULTS.unknown;
  return <Badge tone={meta.tone} dot>{meta.label}</Badge>;
}

function DocStatus({ status }) {
  if (!status) return null;
  return <Badge tone={STATUS_TONES[status] || 'slate'}>{status}</Badge>;
}

function Detail({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-800 break-words">{children || '-'}</dd>
    </div>
  );
}

function HashLine({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex items-start gap-1">
        <code className="flex-1 min-w-0 text-[11px] text-slate-700 break-all leading-relaxed">{value}</code>
        <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} />
      </div>
    </div>
  );
}

function ResultCard({ result, onReset }) {
  const meta = RESULTS[result.result] || RESULTS.unknown;
  const Icon = meta.icon;
  const doc = result.document;
  const issuedHashDiffers = result.file?.sha256 && result.file.sha256 !== result.sha256;
  return (
    <section className={`rounded-2xl border p-4 sm:p-5 shadow-sm ${meta.card}`} aria-live="polite">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
        <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${meta.iconClass}`}><Icon size={24} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-slate-900">{meta.title}</h2>
            <ResultBadge result={result.result} />
          </div>
          <p className="text-sm text-slate-600 mt-1">{result.message}</p>
          <p className="text-xs text-slate-500 mt-1.5 break-all">
            {result.fileName ? <strong className="text-slate-700">{result.fileName}</strong> : 'Fingerprint check'}
            {result.fileSize ? ` · ${formatSize(result.fileSize)}` : ''}
            {result.check?.reference ? ` · Check ${result.check.reference}` : ''}
          </p>
        </div>
        <Button variant="secondary" icon={RotateCcw} onClick={onReset} className="self-stretch sm:self-start">Verify another</Button>
      </div>

      {doc && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
          {result.matchType === 'original' && (
            <p className="flex items-start gap-2 text-xs text-red-700 font-semibold"><Info size={14} className="shrink-0 mt-0.5" /> This file was made from the PDF issued for the document below, then changed.</p>
          )}
          {result.matchType === 'name' && (
            <p className="flex items-start gap-2 text-xs text-slate-600 font-semibold"><Info size={14} className="shrink-0 mt-0.5" /> BexSign issued a file with the same name for this document. Compare it with the original.</p>
          )}
          <dl className="grid gap-x-4 gap-y-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label={result.matchType === 'exact' ? 'Document' : 'Original document'}>{doc.deleted ? `Deleted document #${doc.id}` : doc.name}</Detail>
            <Detail label="BexSign ID">
              {doc.bexsignDocId ? (
                <span className="flex items-start gap-1">
                  <code className="text-xs break-all">{doc.bexsignDocId}</code>
                  <CopyButton value={doc.bexsignDocId} label="Copy BexSign ID" />
                </span>
              ) : '-'}
            </Detail>
            <Detail label="Status"><DocStatus status={doc.status} /></Detail>
            {result.file && (
              <Detail label="Issued file">
                <span className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={KIND_TONES[result.file.kind] || 'slate'}>{result.file.kindLabel}</Badge>
                  <span className="text-xs break-all">{result.file.fileName}</span>
                </span>
              </Detail>
            )}
            {result.file && <Detail label="Issued at">{formatDateTime(result.file.issuedAt)}</Detail>}
            <Detail label="Completed">{formatDateTime(doc.completedAt)}</Detail>
            {doc.owner && <Detail label="Sent by">{doc.owner.name || doc.owner.email}<span className="block text-xs font-normal text-slate-500">{doc.owner.email}</span></Detail>}
            {result.file?.recipientEmail && <Detail label="Copy issued to">{result.file.recipientEmail}</Detail>}
          </dl>
          {result.file?.newerIssuedAt && result.result === 'valid' && (
            <p className="text-xs text-slate-500 flex items-start gap-2"><Info size={14} className="shrink-0 mt-0.5" /> A newer copy of this file was issued {formatDateTime(result.file.newerIssuedAt)} (for example after a layout update). This copy remains authentic.</p>
          )}
          {result.signers?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Signers</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {result.signers.map((s) => (
                  <li key={`${s.email}-${s.name}`} className="flex items-start gap-2.5 rounded-xl border border-slate-200 px-3 py-2">
                    <span className="w-8 h-8 rounded-full bg-emerald-50 text-[#007355] flex items-center justify-center shrink-0"><UserRound size={15} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-800 truncate min-w-0 max-w-full">{s.name || s.email}</span>
                        <Badge tone={s.status === 'signed' ? 'emerald' : s.status === 'declined' ? 'red' : 'slate'}>{s.status || 'pending'}</Badge>
                      </span>
                      <span className="block text-xs text-slate-500 truncate">{s.email}</span>
                      {s.signedAt && <span className="block text-[11px] text-slate-500">Signed {formatDateTime(s.signedAt)}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-2 lg:grid-cols-2">
        <HashLine label={result.fileName || result.fileSize ? 'Fingerprint of this file (SHA-256)' : 'Fingerprint checked (SHA-256)'} value={result.sha256} />
        {issuedHashDiffers && <HashLine label="Fingerprint of the issued PDF" value={result.file.sha256} />}
      </div>
    </section>
  );
}

function VerifyPanel({ onResult, busy, setBusy, showError }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [hash, setHash] = useState('');
  const [hashError, setHashError] = useState('');

  const verifyFile = async (file) => {
    if (!file) return;
    if (file.size > MAX_SIZE) {
      showError('The file must be 25 MB or smaller.');
      return;
    }
    setFileName(file.name);
    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      onResult(await apiFetch('/security/document-validity/verify', { method: 'POST', body }));
    } catch (err) {
      showError(err.message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const verifyHash = async (event) => {
    event.preventDefault();
    const value = hash.trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(value)) {
      setHashError('A SHA-256 fingerprint has 64 characters (0-9, a-f).');
      return;
    }
    setHashError('');
    setFileName('');
    setBusy(true);
    try {
      onResult(await apiFetch('/security/document-validity/verify-hash', { method: 'POST', body: { sha256: value } }));
      setHash('');
    } catch (err) {
      showError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Verify a document" description="BexSign fingerprints (SHA-256) every signed PDF and certificate it issues. Any change to a file, by any application, changes its fingerprint.">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!busy) verifyFile(e.dataTransfer.files?.[0]);
          }}
          className={`rounded-2xl border-2 border-dashed px-4 py-8 sm:py-10 text-center transition ${dragging ? 'border-[#007355] bg-emerald-50' : 'border-slate-300 bg-slate-50/60'}`}
        >
          {busy ? (
            <div className="flex flex-col items-center gap-2" role="status">
              <Loader2 size={30} className="animate-spin text-[#007355]" />
              <p className="text-sm font-bold text-slate-800">Verifying{fileName ? ` ${fileName}` : ''}...</p>
              <p className="text-xs text-slate-500">Computing the fingerprint and comparing it with issued PDFs.</p>
            </div>
          ) : (
            <>
              <span className="mx-auto w-14 h-14 rounded-2xl bg-white border border-slate-200 text-[#007355] flex items-center justify-center shadow-sm"><FileUp size={26} /></span>
              <p className="mt-3 text-sm font-bold text-slate-800">Drop a PDF here to verify it</p>
              <p className="text-xs text-slate-500 mt-1">A signed document, a certificate of completion or a signer's copy</p>
              <Button icon={FileUp} className="mt-4" onClick={() => inputRef.current?.click()}>Choose PDF</Button>
              <p className="text-[11px] text-slate-400 mt-3">Up to 25 MB. The file is not stored: only its fingerprint and the result are logged.</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            tabIndex={-1}
            aria-label="PDF file to verify"
            onChange={(e) => verifyFile(e.target.files?.[0])}
          />
        </div>

        <div className="space-y-4">
          <form onSubmit={verifyHash} className="space-y-2" noValidate>
            <label htmlFor="verify-hash" className="block text-xs font-bold text-slate-700">Verify by fingerprint</label>
            <div className="flex gap-2">
              <input
                id="verify-hash"
                value={hash}
                onChange={(e) => setHash(e.target.value)}
                placeholder="64-character SHA-256"
                spellCheck={false}
                autoComplete="off"
                aria-invalid={Boolean(hashError)}
                aria-describedby="verify-hash-help"
                className={`${inputClass} font-mono text-xs min-w-0`}
              />
              <Button type="submit" icon={Fingerprint} disabled={busy || !hash.trim()}>Check</Button>
            </div>
            <p id="verify-hash-help" className={`text-[11px] ${hashError ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
              {hashError || 'For a fingerprint printed on a certificate or shared in a verification link.'}
            </p>
          </form>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">What the results mean</p>
            <ul className="space-y-1.5 text-xs text-slate-600">
              <li className="flex items-start gap-2"><ResultBadge result="valid" /> <span>Unchanged copy of an issued PDF.</span></li>
              <li className="flex items-start gap-2"><ResultBadge result="modified" /> <span>Issued by BexSign, changed afterwards.</span></li>
              <li className="flex items-start gap-2"><ResultBadge result="unknown" /> <span>No issued PDF has this fingerprint.</span></li>
              <li className="flex items-start gap-2"><ResultBadge result="invalid" /> <span>The file is not a PDF.</span></li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}

function HistoryTab({ reloadKey, onSummary }) {
  const [filters, setFilters] = useState(EMPTY_HISTORY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [state, setState] = useState({ loading: true, error: '', items: [], total: 0 });
  const [open, setOpen] = useState(null);
  const search = useDebouncedValue(filters.search.trim(), 350);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const data = await apiFetch(`/security/document-validity${buildQuery({ search, result: filters.result, source: filters.source, from: filters.from, to: filters.to, page, pageSize })}`);
      setState({ loading: false, error: '', items: data.items || [], total: data.total || 0 });
      onSummary(data.summary, data.scope);
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, [search, filters.result, filters.source, filters.from, filters.to, page, pageSize, onSummary]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const setFilter = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const hasFilters = Object.keys(EMPTY_HISTORY_FILTERS).some((k) => filters[k] !== EMPTY_HISTORY_FILTERS[k]);

  return (
    <>
      <div className="p-3 sm:p-4 border-b border-slate-100 grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_10rem_11rem_18rem]">
        <SearchInput value={filters.search} onChange={(v) => setFilter({ search: v })} placeholder="Search file, fingerprint, document, BexSign ID..." className="sm:col-span-2 xl:col-span-1" />
        <SelectInput
          label="Result"
          value={filters.result}
          onChange={(v) => setFilter({ result: v })}
          options={[['all', 'All results'], ['valid', 'Authentic'], ['failed', 'All failed'], ['modified', 'Modified'], ['unknown', 'Not recognized'], ['invalid', 'Not a PDF']]}
          className="w-full"
        />
        <SelectInput label="Source" value={filters.source} onChange={(v) => setFilter({ source: v })} options={[['all', 'All sources'], ...Object.entries(SOURCES)]} className="w-full" />
        <DateRangeInputs from={filters.from} to={filters.to} onChange={(range) => setFilter(range)} className="sm:col-span-2 xl:col-span-1" />
      </div>
      {state.error && <div className="p-3 sm:p-4"><ErrorBanner message={state.error} onRetry={load} /></div>}
      {state.loading && state.items.length === 0 ? (
        <LoadingBlock label="Loading verification history..." />
      ) : state.items.length === 0 ? (
        hasFilters ? (
          <EmptyState icon={History} title="No verifications match these filters" description="Try another search, result, source or date range." action={<Button variant="secondary" onClick={() => setFilter(EMPTY_HISTORY_FILTERS)}>Clear filters</Button>} />
        ) : (
          <EmptyState icon={History} title="No documents verified yet" description="Every verification, from this page or from the Verify document page, is logged here with its result, fingerprint and who ran it." />
        )
      ) : (
        <>
          {/* Phones: cards */}
          <ul className={`md:hidden divide-y divide-slate-100 ${state.loading ? 'opacity-60' : ''}`}>
            {state.items.map((item) => {
              const expanded = open === item.id;
              return (
                <li key={item.id} className={`p-3 ${expanded ? 'bg-slate-50/70' : ''}`}>
                  <div className="flex items-start gap-2">
                    <button type="button" onClick={() => setOpen(expanded ? null : item.id)} aria-expanded={expanded} className="flex-1 min-w-0 text-left cursor-pointer space-y-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <ResultBadge result={item.result} />
                        <span className="text-[11px] text-slate-500" title={formatDateTime(item.checkedAt)}>{formatRelative(item.checkedAt)}</span>
                      </span>
                      <span className="block text-sm font-bold text-slate-900 break-all">{item.fileName || 'Fingerprint check'}</span>
                      <code className="block text-[11px] text-slate-400 truncate">{shortHash(item.sha256, 8)}</code>
                    </button>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-label={expanded ? 'Hide details' : 'Show details'}
                      onClick={() => setOpen(expanded ? null : item.id)}
                      className="w-9 h-9 -mt-1 -mr-1 inline-flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer shrink-0"
                    >
                      {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </div>
                  <dl className="mt-2 grid grid-cols-1 min-[400px]:grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <div className="min-w-0">
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Document</dt>
                      <dd className="text-slate-800 font-semibold truncate">{item.document ? item.document.name : <span className="text-slate-400 font-normal">-</span>}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Checked by</dt>
                      <dd className="text-slate-700 truncate">{item.checkedBy?.name || item.checkedBy?.email || 'Public check'}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Source</dt>
                      <dd className="text-slate-700">{SOURCES[item.source] || item.source}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Checked</dt>
                      <dd className="text-slate-700">{formatDateTime(item.checkedAt)}</dd>
                    </div>
                  </dl>
                  {expanded && (
                    <div className="mt-3 space-y-3 text-xs">
                      <p className="text-slate-700 font-semibold break-words">{item.message || '-'}</p>
                      <dl className="grid gap-3 grid-cols-1">
                        <Detail label="Check reference">{item.reference}</Detail>
                        <Detail label="Document">
                          {item.document ? (
                            <span className="flex flex-wrap items-center gap-1.5">{item.document.name} <DocStatus status={item.document.status} /></span>
                          ) : 'No matching document'}
                        </Detail>
                        {item.document?.bexsignDocId && (
                          <Detail label="BexSign ID">
                            <span className="flex items-start gap-1">
                              <code className="text-xs break-all">{item.document.bexsignDocId}</code>
                              <CopyButton value={item.document.bexsignDocId} label="Copy BexSign ID" />
                            </span>
                          </Detail>
                        )}
                        <Detail label="Checked by"><span className="break-all">{item.checkedBy ? `${item.checkedBy.name || ''} ${item.checkedBy.email ? `(${item.checkedBy.email})` : ''}`.trim() : 'Public check'}{item.ip ? ` · ${item.ip}` : ''}</span></Detail>
                      </dl>
                      {item.sha256 && <HashLine label="SHA-256 fingerprint" value={item.sha256} />}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Tablets and up: table */}
          <div className={`relative hidden md:block overflow-x-auto ${state.loading ? 'opacity-60' : ''}`}>
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className={`${thClass} w-8`}><span className="sr-only">Details</span></th>
                  <th className={thClass}>Checked</th>
                  <th className={thClass}>File</th>
                  <th className={thClass}>Result</th>
                  <th className={`${thClass} hidden md:table-cell`}>Document</th>
                  <th className={`${thClass} hidden xl:table-cell`}>Source</th>
                  <th className={`${thClass} hidden lg:table-cell`}>Checked by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.items.map((item) => {
                  const expanded = open === item.id;
                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-slate-50/70 cursor-pointer" onClick={() => setOpen(expanded ? null : item.id)}>
                        <td className={`${tdClass} !pr-0`}>
                          <button type="button" aria-expanded={expanded} aria-label={expanded ? 'Hide details' : 'Show details'} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer" onClick={(e) => { e.stopPropagation(); setOpen(expanded ? null : item.id); }}>
                            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </button>
                        </td>
                        <td className={`${tdClass} whitespace-nowrap`}>
                          <span className="block font-semibold text-slate-800">{formatRelative(item.checkedAt)}</span>
                          <span className="block text-[11px] text-slate-400">{formatDateTime(item.checkedAt)}</span>
                        </td>
                        <td className={`${tdClass} max-w-[10rem] sm:max-w-[16rem]`}>
                          <span className="block font-semibold text-slate-800 truncate" title={item.fileName || ''}>{item.fileName || 'Fingerprint check'}</span>
                          <code className="block text-[11px] text-slate-400 truncate">{shortHash(item.sha256, 8)}</code>
                        </td>
                        <td className={tdClass}><ResultBadge result={item.result} /></td>
                        <td className={`${tdClass} hidden md:table-cell max-w-[16rem]`}>
                          {item.document ? (
                            <>
                              <span className="block font-semibold text-slate-800 truncate">{item.document.name}</span>
                              {item.document.bexsignDocId && <code className="block text-[11px] text-slate-400 truncate">{item.document.bexsignDocId}</code>}
                            </>
                          ) : <span className="text-slate-400">-</span>}
                        </td>
                        <td className={`${tdClass} hidden xl:table-cell whitespace-nowrap`}>{SOURCES[item.source] || item.source}</td>
                        <td className={`${tdClass} hidden lg:table-cell max-w-[12rem]`}>
                          <span className="block truncate">{item.checkedBy?.name || item.checkedBy?.email || 'Public check'}</span>
                          {item.ip && <span className="block text-[11px] text-slate-400 font-mono">{item.ip}</span>}
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="space-y-3 text-xs">
                              <p className="text-slate-700 font-semibold">{item.message || '-'}</p>
                              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <Detail label="Check reference">{item.reference}</Detail>
                                <Detail label="Document">
                                  {item.document ? (
                                    <span className="flex flex-wrap items-center gap-1.5">{item.document.name} <DocStatus status={item.document.status} /></span>
                                  ) : 'No matching document'}
                                </Detail>
                                <Detail label="Source">{SOURCES[item.source] || item.source}</Detail>
                                <Detail label="Checked by">{item.checkedBy ? `${item.checkedBy.name || ''} ${item.checkedBy.email ? `(${item.checkedBy.email})` : ''}`.trim() : 'Public check'}{item.ip ? ` · ${item.ip}` : ''}</Detail>
                              </dl>
                              {item.sha256 && <HashLine label="SHA-256 fingerprint" value={item.sha256} />}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={pageSize} total={state.total} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
        </>
      )}
    </>
  );
}

function IssuedTab({ onSummary, onVerifyHash, busy }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [state, setState] = useState({ loading: true, error: '', items: [], total: 0 });
  const [open, setOpen] = useState(null);
  const search = useDebouncedValue(query.trim(), 350);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const data = await apiFetch(`/security/document-validity/documents${buildQuery({ search, status, page, pageSize })}`);
      setState({ loading: false, error: '', items: data.items || [], total: data.total || 0 });
      onSummary(data.summary);
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, [search, status, page, pageSize, onSummary]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="p-3 sm:p-4 border-b border-slate-100 grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search document, BexSign ID, file name or fingerprint..." />
        <SelectInput
          label="Document status"
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={[['all', 'All statuses'], ['Completed', 'Completed'], ['In Progress', 'In progress'], ['Declined', 'Declined'], ['Recalled', 'Recalled'], ['Expired', 'Expired']]}
          className="w-full"
        />
      </div>
      {state.error && <div className="p-3 sm:p-4"><ErrorBanner message={state.error} onRetry={load} /></div>}
      {state.loading && state.items.length === 0 ? (
        <LoadingBlock label="Loading issued documents..." />
      ) : state.items.length === 0 ? (
        <EmptyState
          icon={Files}
          title={search || status !== 'all' ? 'No issued documents match' : 'No issued PDFs yet'}
          description={search || status !== 'all' ? 'Try another search or status.' : 'When a request is completed, BexSign locks and fingerprints the signed PDFs and the certificate. They are listed here.'}
        />
      ) : (
        <>
          <ul className={`divide-y divide-slate-100 ${state.loading ? 'opacity-60' : ''}`}>
            {state.items.map((doc) => {
              const expanded = open === doc.id;
              return (
                <li key={doc.id} className="p-3 sm:p-4">
                  <div className="flex flex-col md:flex-row md:items-start gap-3">
                    <span className="hidden sm:flex w-10 h-10 rounded-xl bg-emerald-50 text-[#007355] items-center justify-center shrink-0"><FileCheck2 size={19} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-extrabold text-slate-900 break-words">{doc.deleted ? `Deleted document #${doc.id}` : doc.name}</p>
                        <DocStatus status={doc.status} />
                      </div>
                      {doc.bexsignDocId && (
                        <div className="flex items-center gap-1 mt-0.5 min-w-0">
                          <code className="text-[11px] text-slate-500 truncate">{doc.bexsignDocId}</code>
                          <CopyButton value={doc.bexsignDocId} label="Copy BexSign ID" />
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {Object.entries(doc.kinds).map(([kind, n]) => (
                          <Badge key={kind} tone={KIND_TONES[kind] || 'slate'}>{n} {KIND_SHORT[kind] || kind}</Badge>
                        ))}
                        {doc.fingerprintCount > doc.fileCount && <span className="text-[11px] text-slate-400">+{doc.fingerprintCount - doc.fileCount} earlier cop{doc.fingerprintCount - doc.fileCount === 1 ? 'y' : 'ies'}</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-col md:items-end gap-x-4 gap-y-1 text-xs text-slate-500 shrink-0 min-w-0">
                      <span>{doc.completedAt ? `Completed ${formatDateTime(doc.completedAt, { withTime: false })}` : `Issued ${formatDateTime(doc.lastIssuedAt, { withTime: false })}`}</span>
                      <span className="md:text-right">
                        {doc.lastCheck ? (
                          <span className="inline-flex flex-wrap items-center gap-1.5" title={`${doc.lastCheck.checks} verification${doc.lastCheck.checks === 1 ? '' : 's'}`}>
                            Last check <ResultBadge result={doc.lastCheck.result} /> {formatRelative(doc.lastCheck.checkedAt)}
                          </span>
                        ) : 'Never verified'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : doc.id)}
                    aria-expanded={expanded}
                    className="mt-2 sm:ml-[52px] py-1.5 sm:py-0 inline-flex items-center gap-1 text-left text-xs font-bold text-[#007355] hover:underline cursor-pointer"
                  >
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {expanded ? 'Hide' : 'Show'} issued files and fingerprints ({doc.fingerprintCount})
                  </button>
                  {expanded && (
                    <ul className="mt-2 sm:ml-[52px] space-y-2">
                      {doc.files.map((f) => (
                        <li key={f.id} className={`rounded-xl border px-3 py-2.5 ${f.latest ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50/70'}`}>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge tone={KIND_TONES[f.kind] || 'slate'}>{f.kindLabel}</Badge>
                            <span className="text-xs font-bold text-slate-800 break-all">{f.fileName || '-'}</span>
                            {f.latest ? <Badge tone="emerald">Current</Badge> : <Badge tone="slate">Earlier copy</Badge>}
                            {f.stored && f.latest && <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><Lock size={11} /> Stored</span>}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Issued {formatDateTime(f.issuedAt)}{f.recipientEmail ? ` · for ${f.recipientEmail}` : ''}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <code className="flex-1 min-w-0 text-[11px] text-slate-600 break-all">{f.sha256}</code>
                            <CopyButton value={f.sha256} label="Copy fingerprint" />
                            <button
                              type="button"
                              onClick={() => onVerifyHash(f.sha256)}
                              disabled={busy}
                              title="Verify this fingerprint"
                              aria-label="Verify this fingerprint"
                              className="w-9 h-9 sm:w-7 sm:h-7 shrink-0 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-[#007355] hover:bg-emerald-50 cursor-pointer disabled:opacity-50"
                            >
                              <BadgeCheck size={14} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          <Pagination page={page} pageSize={pageSize} total={state.total} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} pageSizes={[10, 25, 50]} />
        </>
      )}
    </>
  );
}

export default function DocumentValidity() {
  const { can } = usePermissions();
  const allowed = can('security.document_validity');
  const [tab, setTab] = useState('history');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [summary, setSummary] = useState(null);
  const [scope, setScope] = useState('all');
  const [docSummary, setDocSummary] = useState(null);
  const resultRef = useRef(null);

  const onHistorySummary = useCallback((s, sc) => {
    setSummary(s);
    if (sc) setScope(sc);
  }, []);

  const showResult = (data) => {
    setError('');
    setResult(data);
    setReloadKey((k) => k + 1);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const verifyHash = async (sha256) => {
    setBusy(true);
    try {
      showResult(await apiFetch('/security/document-validity/verify-hash', { method: 'POST', body: { sha256 } }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Documents tab count before the tab is opened
  useEffect(() => {
    if (!allowed) return;
    apiFetch('/security/document-validity/documents?pageSize=1').then((d) => setDocSummary(d.summary)).catch(() => {});
  }, [allowed]);

  const tabs = useMemo(() => [
    { id: 'history', label: 'Verification history', icon: History, count: summary?.checks },
    { id: 'issued', label: 'Issued documents', icon: Files, count: docSummary?.documents }
  ], [summary, docSummary]);

  if (!allowed) {
    return (
      <div className="space-y-5 pb-10">
        <PageHeader eyebrow="Settings · Security" icon={ShieldCheck} title="Document validity" />
        <Card>
          <EmptyState icon={Lock} title="You don't have access to document validity" description="Ask a manager to grant you the “Document validity” permission." />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10 font-sans text-slate-900">
      <PageHeader
        eyebrow="Settings · Security"
        icon={ShieldCheck}
        title="Document validity"
        description="Check that a PDF is an authentic, unchanged copy of a document issued by BexSign, and review every verification."
        actions={<Button variant="secondary" icon={RefreshCw} onClick={() => setReloadKey((k) => k + 1)}>Refresh</Button>}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Verifications" value={summary ? summary.checks : '…'} icon={History} tone="sky" hint={summary ? `${summary.last30d} in the last 30 days` : ' '} />
        <StatCard label="Authentic" value={summary ? summary.valid : '…'} icon={ShieldCheck} tone="emerald" hint={summary?.lastCheckAt ? `Last check ${formatRelative(summary.lastCheckAt)}` : 'Unchanged copies'} />
        <StatCard label="Failed checks" value={summary ? summary.failed : '…'} icon={ShieldX} tone="rose" hint={summary ? `${summary.modified} modified · ${summary.unknown} unknown · ${summary.invalid} not PDF` : ' '} />
        <StatCard label="Issued documents" value={docSummary ? docSummary.documents : '…'} icon={Files} tone="violet" hint={docSummary ? `${docSummary.fingerprints} fingerprinted PDFs` : ' '} />
      </div>

      <VerifyPanel onResult={showResult} busy={busy} setBusy={setBusy} showError={setError} />
      <ErrorBanner message={error} />
      <div ref={resultRef} className="scroll-mt-4">
        {result && <ResultCard result={result} onReset={() => setResult(null)} />}
      </div>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="px-2 sm:px-4 pt-1">
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
        </div>
        {scope !== 'all' && (
          <p className="px-3 sm:px-4 pt-3 text-[11px] text-slate-500 flex items-start sm:items-center gap-1.5">
            <Info size={13} className="shrink-0 mt-px sm:mt-0" /> Showing documents you can access ({scope === 'team' ? 'your department' : 'your own and received'}) and your own checks.
          </p>
        )}
        {tab === 'history' ? (
          <HistoryTab reloadKey={reloadKey} onSummary={onHistorySummary} />
        ) : (
          <IssuedTab key={reloadKey} onSummary={setDocSummary} onVerifyHash={verifyHash} busy={busy} />
        )}
      </section>
    </div>
  );
}
