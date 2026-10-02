import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers, FileBox, Upload, Download, Plus, Trash2, ArrowLeft, ArrowRight, Send, FilePenLine, ChevronLeft,
  ChevronRight, AlertTriangle, CheckCircle2, Check, Pencil, Users, Table2, Info, RotateCcw
} from 'lucide-react';
import { Modal, Button, Badge, inputClass } from '../ui/kit';
import { apiFetch } from '../../utils/api';
import TemplatePickerModal from '../templates/TemplatePickerModal';
import { TemplateDocument, countTemplateUse } from '../templates/templateUi';

/**
 * "Add document > Mail merge template": one template, many recipients.
 *
 *   1. Template     choose a template; the [Merge fields] in its text are found automatically
 *   2. Recipients   one row per recipient (name, email and a value for every merge field), typed or from a CSV file
 *   3. Review       preview each recipient's copy, then send every request or save them as drafts
 *
 * Each row becomes its own signature request (POST /api/documents/mail-merge), so recipients only ever see
 * their own copy.
 */

const MAX_ROWS = 500;
const CHUNK = 5;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FIELD = /\[([^\]\n]{1,80})\]/g;
const keyOf = (name) => String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
const looseKey = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** The merge fields of a text in the order they first appear: [{ key, label, count }] */
export function findMergeFields(text) {
  const found = new Map();
  for (const match of String(text || '').matchAll(FIELD)) {
    const key = keyOf(match[1]);
    if (!key) continue;
    if (found.has(key)) found.get(key).count += 1;
    else found.set(key, { key, label: match[1].trim(), count: 1 });
  }
  return [...found.values()];
}

export const mergeText = (text, values) => String(text || '').replace(FIELD, (token, name) => {
  const value = String(values?.[keyOf(name)] ?? '').trim();
  return value || token;
});

/** CSV rows (comma, semicolon or tab separated; quoted cells may contain separators and line breaks). */
export function parseCsv(text) {
  const src = String(text || '').replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] || '';
  const delimiter = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell);
      cell = '';
      rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.map((r) => r.map((c) => String(c).trim())).filter((r) => r.some((c) => c !== ''));
}

const csvCell = (value) => (/[",\n\r]/.test(String(value)) ? `"${String(value).replace(/"/g, '""')}"` : String(value));

let rowSeq = 0;
const blankRow = () => ({ id: `row-${Date.now()}-${rowSeq++}`, name: '', email: '', values: {} });

const NAME_HEADERS = ['name', 'fullname', 'recipientname', 'signername', 'recipient', 'signer'];
const EMAIL_HEADERS = ['email', 'emailaddress', 'recipientemail', 'signeremail', 'mail', 'emailid'];

function StepDot({ index, label, active, done }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`h-6 w-6 shrink-0 rounded-full grid place-items-center text-[11px] font-black ${
        done ? 'bg-[#007355] text-white' : active ? 'bg-[#007355] text-white ring-4 ring-emerald-100' : 'bg-slate-200 text-slate-500'
      }`}
      >
        {done ? <Check size={13} /> : index}
      </span>
      <span className={`text-xs font-bold truncate ${active || done ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}

export default function MailMergeModal({ open, onClose, canSend = true, defaults = {}, onFinished }) {
  const [step, setStep] = useState(1);
  const [template, setTemplate] = useState(null);
  const [content, setContent] = useState('');
  const [editingText, setEditingText] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [csv, setCsv] = useState(null); // { fileName, headers, records, mapping }
  const [csvError, setCsvError] = useState('');
  const [previewIndex, setPreviewIndex] = useState(0);
  const [mode, setMode] = useState('send');
  const [addSignDate, setAddSignDate] = useState(true);
  const [note, setNote] = useState('');
  const [days, setDays] = useState(15);
  const [verify, setVerify] = useState(true);
  const [run, setRun] = useState(null); // { done, total, results, batchId, finished, error }
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setTemplate(null);
    setContent('');
    setEditingText(false);
    setRows([]);
    setCsv(null);
    setCsvError('');
    setPreviewIndex(0);
    setMode(canSend ? 'send' : 'draft');
    setAddSignDate(true);
    setNote(defaults.noteToAll || '');
    setDays(parseInt(defaults.daysToComplete, 10) || 15);
    setVerify(defaults.requireVerification !== false);
    setRun(null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const fields = useMemo(() => findMergeFields(content), [content]);
  const usableRows = useMemo(() => rows.filter((r) => r.name.trim() || r.email.trim() || Object.values(r.values).some((v) => String(v || '').trim())), [rows]);

  const rowProblems = (row) => {
    const problems = [];
    if (!EMAIL.test(row.email.trim())) problems.push(row.email.trim() ? 'The email address is not valid' : 'The email address is missing');
    return problems;
  };
  const invalidRows = usableRows.filter((r) => rowProblems(r).length > 0);
  const emptyValues = usableRows.reduce((sum, r) => sum + fields.filter((f) => !String(r.values[f.key] || '').trim()).length, 0);
  const duplicateEmails = useMemo(() => {
    const seen = new Map();
    usableRows.forEach((r) => {
      const email = r.email.trim().toLowerCase();
      if (email) seen.set(email, (seen.get(email) || 0) + 1);
    });
    return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([email]) => email));
  }, [usableRows]);

  /* ------------------------------------------------------------ template */

  const chooseTemplate = ([chosen]) => {
    setPickerOpen(false);
    if (!chosen) return;
    setTemplate(chosen);
    setContent(chosen.content || '');
    setEditingText(!chosen.content);
    if (rows.length === 0) setRows([blankRow(), blankRow(), blankRow()]);
  };

  /* ------------------------------------------------------------ rows */

  const updateRow = (id, patch) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const updateValue = (id, key, value) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, values: { ...r.values, [key]: value } } : r)));
  const removeRow = (id) => setRows((prev) => prev.filter((r) => r.id !== id));
  const addRow = () => setRows((prev) => (prev.length >= MAX_ROWS ? prev : [...prev, blankRow()]));

  const onCsvChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCsvError('');
    try {
      const parsed = parseCsv(await file.text());
      if (parsed.length < 2) throw new Error('The file needs a header row and at least one recipient row.');
      const [headers, ...records] = parsed;
      const loose = headers.map(looseKey);
      const guess = (candidates) => loose.findIndex((h) => candidates.includes(h));
      const mapping = { __name: guess(NAME_HEADERS), __email: guess(EMAIL_HEADERS) };
      fields.forEach((f) => {
        mapping[f.key] = loose.findIndex((h) => h === looseKey(f.label));
      });
      setCsv({ fileName: file.name, headers, records: records.slice(0, MAX_ROWS), total: records.length, mapping });
    } catch (err) {
      setCsvError(err.message || 'The file could not be read.');
    }
  };

  const applyCsv = () => {
    if (!csv) return;
    const at = (record, index) => (index >= 0 ? String(record[index] ?? '').trim() : '');
    const imported = csv.records.map((record) => ({
      ...blankRow(),
      name: at(record, csv.mapping.__name),
      email: at(record, csv.mapping.__email),
      values: Object.fromEntries(fields.map((f) => [f.key, at(record, csv.mapping[f.key])]))
    }));
    // Rows typed before the import stay; untouched blank rows make room for the file
    setRows((prev) => [...prev.filter((r) => r.name.trim() || r.email.trim() || Object.values(r.values).some((v) => String(v || '').trim())), ...imported].slice(0, MAX_ROWS));
    setCsv(null);
  };

  const downloadSample = () => {
    const header = ['Name', 'Email', ...fields.map((f) => f.label)];
    const example = ['Asha Patel', 'asha.patel@example.com', ...fields.map((f) => `${f.label} of Asha`)];
    const blob = new Blob([`﻿${[header, example].map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `${(template?.name || 'mail-merge').replace(/[\\/:*?"<>|]+/g, '_')} - recipients.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1500);
  };

  /* ------------------------------------------------------------ send */

  const start = async (onlyRows = null) => {
    const list = (onlyRows || usableRows).map((r) => ({ index: usableRows.indexOf(r), name: r.name.trim(), email: r.email.trim(), values: r.values }));
    const previous = onlyRows && run ? run.results.filter((r) => r.documentId) : [];
    let batchId = run?.batchId || null;
    let results = [...previous];
    setRun({ done: 0, total: list.length, results, batchId, finished: false, error: '', mode });
    setStep(4);
    for (let i = 0; i < list.length; i += CHUNK) {
      const chunk = list.slice(i, i + CHUNK);
      try {
        const data = await apiFetch('/documents/mail-merge', {
          method: 'POST',
          body: {
            templateName: template?.name || 'Document',
            content,
            rows: chunk,
            mode,
            batchId,
            addSignDate: mode === 'send' && addSignDate,
            noteToAll: note,
            daysToComplete: days,
            requireVerification: verify
          }
        });
        batchId = data.batchId;
        results = [...results, ...data.results];
      } catch (err) {
        results = [...results, ...chunk.map((r) => ({ index: r.index, name: r.name, email: r.email, status: 'failed', documentId: null, error: err.message }))];
      }
      setRun({ done: Math.min(i + CHUNK, list.length), total: list.length, results, batchId, finished: false, error: '', mode });
    }
    setRun({ done: list.length, total: list.length, results, batchId, finished: true, error: '', mode });
    if (results.some((r) => r.documentId)) {
      countTemplateUse(template);
      window.dispatchEvent(new Event('bexsign-documents-changed'));
      onFinished?.({ batchId, mode, results });
    }
  };

  const retryFailed = () => {
    const failed = new Set(run.results.filter((r) => !r.documentId).map((r) => r.index));
    start(usableRows.filter((_, i) => failed.has(i)));
  };

  /* ------------------------------------------------------------ navigation */

  const canLeaveStep1 = Boolean(template) && content.trim().length > 0;
  const canLeaveStep2 = usableRows.length > 0 && invalidRows.length === 0;
  const busy = Boolean(run && !run.finished);
  const previewRow = usableRows[Math.min(previewIndex, Math.max(usableRows.length - 1, 0))];

  let footer = null;
  if (step === 1) {
    footer = (
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button icon={ArrowRight} disabled={!canLeaveStep1} onClick={() => { setEditingText(false); setStep(2); }}>Recipients</Button>
      </>
    );
  } else if (step === 2) {
    footer = (
      <>
        <span className="mr-auto self-center text-[11px] font-semibold text-slate-500">
          {usableRows.length} recipient{usableRows.length === 1 ? '' : 's'}
          {invalidRows.length > 0 && <span className="text-rose-600"> · {invalidRows.length} with an email to correct</span>}
        </span>
        <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep(1)}>Back</Button>
        <Button icon={ArrowRight} disabled={!canLeaveStep2} onClick={() => { setPreviewIndex(0); setStep(3); }}>Review</Button>
      </>
    );
  } else if (step === 3) {
    footer = (
      <>
        <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep(2)}>Back</Button>
        <Button icon={mode === 'send' ? Send : FilePenLine} onClick={() => start()}>
          {mode === 'send'
            ? `Send ${usableRows.length} request${usableRows.length === 1 ? '' : 's'}`
            : `Save ${usableRows.length} draft${usableRows.length === 1 ? '' : 's'}`}
        </Button>
      </>
    );
  } else if (run?.finished) {
    footer = (
      <>
        {run.results.some((r) => !r.documentId) && <Button variant="secondary" icon={RotateCcw} onClick={retryFailed}>Try the failed rows again</Button>}
        <Button onClick={onClose}>Done</Button>
      </>
    );
  }

  return (
    <>
      <Modal
        open={open && !pickerOpen}
        onClose={busy ? undefined : onClose}
        title="Mail merge template"
        description="One template, a personal copy for every recipient: each row becomes its own signature request."
        icon={Layers}
        size="xl"
        footer={footer}
      >
        {step < 4 && (
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
            <StepDot index={1} label="Template" active={step === 1} done={step > 1} />
            <span className="h-px flex-1 bg-slate-200" />
            <StepDot index={2} label="Recipients" active={step === 2} done={step > 2} />
            <span className="h-px flex-1 bg-slate-200" />
            <StepDot index={3} label="Review" active={step === 3} done={false} />
          </div>
        )}

        {/* ------------------------------------------------------------ 1. template */}
        {step === 1 && !template && (
          <div className="flex flex-col items-center text-center gap-3 py-10">
            <span className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#007355] flex items-center justify-center"><FileBox size={26} /></span>
            <h3 className="text-sm font-extrabold text-slate-900">Choose the template to personalize</h3>
            <p className="text-xs text-slate-500 max-w-md leading-relaxed">
              Text in square brackets, such as <mark className="bg-amber-100 text-amber-900 rounded px-0.5">[Client Name]</mark> or{' '}
              <mark className="bg-amber-100 text-amber-900 rounded px-0.5">[Start Date]</mark>, is a merge field. Every recipient gets a copy in which the
              fields are replaced by their own values.
            </p>
            <Button icon={FileBox} onClick={() => setPickerOpen(true)}>Choose a template</Button>
          </div>
        )}

        {step === 1 && template && (
          <div className="grid lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] gap-4">
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Template</p>
                <p className="text-sm font-extrabold text-slate-900 break-words mt-0.5">{template.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{template.categoryLabel || template.kindLabel || 'Template'}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button variant="secondary" icon={FileBox} onClick={() => setPickerOpen(true)}>Change</Button>
                  <Button variant="secondary" icon={Pencil} onClick={() => setEditingText((v) => !v)}>{editingText ? 'Show preview' : 'Edit text'}</Button>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Merge fields ({fields.length})</p>
                {fields.length === 0 ? (
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-1.5">
                    This text has no merge fields, so every recipient receives the same document. Click "Edit text" and type a name in square
                    brackets, for example [Client Name], to add one.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {fields.map((f) => (
                      <span key={f.key} className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                        {f.label}{f.count > 1 && <span className="text-amber-600">×{f.count}</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 min-w-0">
              {editingText ? (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  aria-label="Template text"
                  className={`${inputClass} font-mono text-xs leading-relaxed h-[24rem] resize-none`}
                  placeholder="Type the document text. Put merge fields in square brackets: [Client Name]"
                />
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-5 h-[24rem] overflow-y-auto">
                  <TemplateDocument content={content} compact />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ 2. recipients */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileRef} type="file" accept=".csv,text/csv,.txt,.tsv" onChange={onCsvChosen} className="hidden" />
              <Button variant="secondary" icon={Upload} onClick={() => fileRef.current?.click()}>Import CSV</Button>
              <Button variant="secondary" icon={Download} onClick={downloadSample}>Download sample CSV</Button>
              <Button variant="secondary" icon={Plus} onClick={addRow} disabled={rows.length >= MAX_ROWS}>Add row</Button>
              <span className="ml-auto text-[11px] text-slate-400">Up to {MAX_ROWS} recipients</span>
            </div>

            {csvError && <p role="alert" className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{csvError}</p>}

            {csv && (
              <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-3.5 space-y-3">
                <p className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                  <Table2 size={14} /> {csv.fileName}: {csv.total} row{csv.total === 1 ? '' : 's'}
                  {csv.total > csv.records.length && ` (only the first ${csv.records.length} are imported)`}
                </p>
                <p className="text-[11px] text-sky-900/80">Check which column of the file fills each value. Columns with a matching name were chosen for you.</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {[{ key: '__name', label: 'Recipient name' }, { key: '__email', label: 'Recipient email', required: true }, ...fields].map((target) => (
                    <label key={target.key} className="block">
                      <span className="block text-[11px] font-bold text-slate-700 mb-1">{target.label}{target.required && <span className="text-rose-600"> *</span>}</span>
                      <select
                        value={csv.mapping[target.key] ?? -1}
                        onChange={(e) => setCsv((prev) => ({ ...prev, mapping: { ...prev.mapping, [target.key]: parseInt(e.target.value, 10) } }))}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 outline-none focus:border-[#007355]"
                      >
                        <option value={-1}>Not in the file</option>
                        {csv.headers.map((h, i) => <option key={`${h}-${i}`} value={i}>{h || `Column ${i + 1}`}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="secondary" onClick={() => setCsv(null)}>Cancel import</Button>
                  <Button icon={Check} disabled={(csv.mapping.__email ?? -1) < 0} onClick={applyCsv}>Import {csv.records.length} row{csv.records.length === 1 ? '' : 's'}</Button>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="overflow-auto max-h-[21rem]">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      <th className="px-2 py-2 w-8">#</th>
                      <th className="px-2 py-2 min-w-[10rem]">Name</th>
                      <th className="px-2 py-2 min-w-[13rem]">Email <span className="text-rose-600">*</span></th>
                      {fields.map((f) => <th key={f.key} className="px-2 py-2 min-w-[10rem] normal-case tracking-normal"><span className="rounded bg-amber-100 text-amber-900 px-1">[{f.label}]</span></th>)}
                      <th className="px-2 py-2 w-9" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.length === 0 && (
                      <tr><td colSpan={fields.length + 4} className="px-3 py-8 text-center text-slate-400">No recipients yet. Import a CSV file or add a row.</td></tr>
                    )}
                    {rows.map((row, index) => {
                      const used = usableRows.includes(row);
                      const email = row.email.trim();
                      const emailBad = used && !EMAIL.test(email);
                      const cell = 'w-full px-2 py-1.5 text-xs border rounded-lg bg-white text-slate-900 outline-none focus:border-[#007355] focus:ring-2 focus:ring-emerald-100';
                      return (
                        <tr key={row.id} className="align-top">
                          <td className="px-2 py-2.5 text-slate-400 font-mono">{index + 1}</td>
                          <td className="px-1.5 py-1.5">
                            <input value={row.name} onChange={(e) => updateRow(row.id, { name: e.target.value })} placeholder="Full name" aria-label={`Name, row ${index + 1}`} className={`${cell} border-slate-300`} />
                          </td>
                          <td className="px-1.5 py-1.5">
                            <input
                              type="email"
                              value={row.email}
                              onChange={(e) => updateRow(row.id, { email: e.target.value })}
                              placeholder="name@company.com"
                              aria-label={`Email, row ${index + 1}`}
                              aria-invalid={emailBad}
                              className={`${cell} ${emailBad ? 'border-rose-400 bg-rose-50' : 'border-slate-300'}`}
                            />
                            {emailBad && <p className="text-[10px] font-semibold text-rose-600 mt-0.5">{email ? 'Not a valid email address' : 'Email is required'}</p>}
                            {!emailBad && duplicateEmails.has(email.toLowerCase()) && <p className="text-[10px] font-semibold text-amber-700 mt-0.5">Listed more than once</p>}
                          </td>
                          {fields.map((f) => {
                            const empty = used && !String(row.values[f.key] || '').trim();
                            return (
                              <td key={f.key} className="px-1.5 py-1.5">
                                <input
                                  value={row.values[f.key] || ''}
                                  onChange={(e) => updateValue(row.id, f.key, e.target.value)}
                                  placeholder={f.label}
                                  aria-label={`${f.label}, row ${index + 1}`}
                                  className={`${cell} ${empty ? 'border-amber-300 bg-amber-50/60' : 'border-slate-300'}`}
                                />
                              </td>
                            );
                          })}
                          <td className="px-1 py-1.5">
                            <button type="button" onClick={() => removeRow(row.id)} aria-label={`Remove row ${index + 1}`} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {emptyValues > 0 && invalidRows.length === 0 && (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
                <Info size={13} className="shrink-0 mt-0.5" />
                {emptyValues} value{emptyValues === 1 ? ' is' : 's are'} empty. An empty merge field stays in the document as [Field name], so fill it in or remove the field from the text.
              </p>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------ 3. review */}
        {step === 3 && previewRow && (
          <div className="grid lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] gap-4">
            <div className="space-y-3">
              <div role="radiogroup" aria-label="What to do with the merged documents" className="space-y-2">
                {[
                  { key: 'send', icon: Send, title: 'Send now', text: 'Each recipient is emailed their own copy with a signature block under the text.', disabled: !canSend },
                  { key: 'draft', icon: FilePenLine, title: 'Save as drafts', text: 'One draft per recipient. Open each to place the fields yourself, then send.' }
                ].map((option) => {
                  const isActive = mode === option.key;
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      disabled={option.disabled}
                      onClick={() => setMode(option.key)}
                      className={`w-full text-left rounded-2xl border p-3 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                        isActive ? 'border-[#00a884] bg-emerald-50/60 shadow-[0_0_0_3px_rgba(0,168,132,0.10)]' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`h-7 w-7 rounded-lg grid place-items-center ${isActive ? 'bg-[#007355] text-white' : 'bg-slate-100 text-slate-500'}`}><Icon size={14} /></span>
                        <span className="text-xs font-extrabold text-slate-900">{option.title}</span>
                      </span>
                      <span className="block text-[11px] text-slate-500 leading-relaxed mt-1.5">
                        {option.disabled ? 'You do not have permission to send documents for signature.' : option.text}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-slate-200 p-3 space-y-3">
                {mode === 'send' && (
                  <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={addSignDate} onChange={(e) => setAddSignDate(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 accent-[#007355]" />
                    <span>Add the signing date next to the signature</span>
                  </label>
                )}
                <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={verify} onChange={(e) => setVerify(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 accent-[#007355]" />
                  <span>Verify and confirm each document when it is signed</span>
                </label>
                <label className="block">
                  <span className="block text-[11px] font-bold text-slate-700 mb-1">Days to complete</span>
                  <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Math.max(1, Math.min(365, parseInt(e.target.value, 10) || 1)))} className="w-24 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-[#007355]" />
                </label>
                <label className="block">
                  <span className="block text-[11px] font-bold text-slate-700 mb-1">Note to every recipient</span>
                  <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Shown in the email" className={`${inputClass} text-xs resize-none`} />
                </label>
              </div>

              {emptyValues > 0 && (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  {emptyValues} merge value{emptyValues === 1 ? ' is' : 's are'} empty and will stay in the document as [Field name].
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 min-w-0">
              <div className="flex items-center gap-2 mb-2.5">
                <Users size={14} className="text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold text-slate-900 truncate">{previewRow.name.trim() || previewRow.email.trim()}</p>
                  <p className="text-[10px] text-slate-500 truncate">{previewRow.email.trim()}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))} disabled={previewIndex === 0} aria-label="Previous recipient" className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"><ChevronLeft size={14} /></button>
                  <span className="text-[11px] font-bold text-slate-600 tabular-nums px-1">{previewIndex + 1} of {usableRows.length}</span>
                  <button type="button" onClick={() => setPreviewIndex((i) => Math.min(usableRows.length - 1, i + 1))} disabled={previewIndex >= usableRows.length - 1} aria-label="Next recipient" className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"><ChevronRight size={14} /></button>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 h-[22rem] overflow-y-auto">
                <TemplateDocument content={mergeText(content, previewRow.values)} compact />
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ 4. progress and result */}
        {step === 4 && run && (
          <div className="space-y-4">
            {!run.finished ? (
              <div className="py-8 text-center space-y-3" role="status">
                <p className="text-sm font-extrabold text-slate-900">
                  {run.mode === 'send' ? 'Sending' : 'Saving'} {Math.min(run.done + 1, run.total)} of {run.total}...
                </p>
                <div className="w-full max-w-md mx-auto bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-[#007355] h-2.5 transition-all duration-500" style={{ width: `${run.total ? (run.done / run.total) * 100 : 0}%` }} />
                </div>
                <p className="text-[11px] text-slate-500">Keep this window open until every request is done.</p>
              </div>
            ) : (() => {
              const created = run.results.filter((r) => r.documentId);
              const failed = run.results.filter((r) => !r.documentId);
              const warned = created.filter((r) => r.error);
              return (
                <>
                  <div className={`rounded-2xl border px-4 py-3 flex items-start gap-3 ${failed.length ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                    {failed.length ? <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" /> : <CheckCircle2 size={18} className="text-[#007355] shrink-0 mt-0.5" />}
                    <div className="text-xs text-slate-700 leading-relaxed">
                      <p className="font-extrabold text-slate-900">
                        {created.length} request{created.length === 1 ? '' : 's'} {run.mode === 'send' ? 'sent' : 'saved as draft'}
                        {failed.length > 0 && `, ${failed.length} not created`}
                      </p>
                      <p>
                        {run.mode === 'send'
                          ? 'Each recipient received their own copy by email. Follow them under Sent documents > In progress.'
                          : 'Find them under Sent documents > Draft, place the fields and send each one.'}
                        {warned.length > 0 && ` ${warned.length} email${warned.length === 1 ? '' : 's'} could not be delivered: open the request to send a reminder.`}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Batch {run.batchId}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <ul className="divide-y divide-slate-100 max-h-[18rem] overflow-y-auto">
                      {[...run.results].sort((a, b) => a.index - b.index).map((r, i) => (
                        <li key={`${r.email}-${i}`} className="px-3.5 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate">{r.name || r.email} <span className="font-medium text-slate-500">· {r.email}</span></p>
                            {r.error && <p className="text-[11px] text-rose-600 break-words">{r.error}</p>}
                          </div>
                          {r.documentId
                            ? <Badge tone={r.error ? 'amber' : 'emerald'}>{r.status === 'sent' ? (r.error ? 'Created, email failed' : 'Sent') : 'Draft'}</Badge>
                            : <Badge tone="rose">Failed</Badge>}
                          {r.documentId && (
                            <Link to={r.status === 'draft' ? `/documents/${r.documentId}/send` : `/documents/${r.documentId}`} onClick={onClose} className="text-[11px] font-bold text-[#007355] hover:underline">Open</Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </Modal>

      <TemplatePickerModal
        open={open && pickerOpen}
        mode="replace"
        maxSelect={1}
        title="Choose the mail merge template"
        onClose={() => setPickerOpen(false)}
        onConfirm={chooseTemplate}
      />
    </>
  );
}
