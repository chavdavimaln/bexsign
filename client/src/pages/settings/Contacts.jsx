import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookUser, Plus, Upload, Download, RefreshCw, Star, Users, Send, Tags, Trash2, Pencil, Mail, Building2, Phone, StickyNote, X,
  FileSignature, CheckCircle2, FileText, UserPlus, Info
} from 'lucide-react';
import {
  PageHeader, StatCard, Card, Button, Badge, SearchInput, SelectInput, EmptyState, ErrorBanner, LoadingBlock, Modal, Field, inputClass,
  Toggle, Pagination, ConfirmDialog, useToast, formatDateTime, formatRelative, thClass, tdClass
} from '../../components/ui/kit';
import { apiFetch } from '../../utils/api';

/**
 * Contacts (Settings > Contacts): the people you send documents to. Everyone you sent a request to is added
 * automatically with how many documents they received and signed; you can also add, import (CSV), tag, favorite
 * and export contacts. Deleting moves contacts to the trash. Contacts are suggested when adding recipients.
 */

const SOURCE = {
  recipient: { label: 'From sent documents', tone: 'sky' },
  manual: { label: 'Added manually', tone: 'violet' },
  import: { label: 'Imported', tone: 'amber' }
};

const AVATAR_COLORS = ['#007355', '#0ea5e9', '#6366f1', '#f59e0b', '#ec4899', '#14b8a6', '#8b5cf6', '#ef4444'];
const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
const colorFor = (email) => AVATAR_COLORS[[...String(email || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

function Avatar({ contact, size = 'md' }) {
  const dims = size === 'lg' ? 'w-14 h-14 text-lg' : 'w-9 h-9 text-xs';
  return (
    <span className={`${dims} rounded-full flex items-center justify-center font-black text-white shrink-0 shadow-sm`} style={{ background: colorFor(contact.email) }} aria-hidden="true">
      {initials(contact.name)}
    </span>
  );
}

function statusTone(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'signed' || s === 'completed') return 'emerald';
  if (s === 'declined') return 'rose';
  if (s === 'viewed') return 'sky';
  if (s === 'sent' || s === 'in progress') return 'amber';
  return 'slate';
}

/* ---------------------------------------------------------------- CSV */

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const src = String(text).replace(/^﻿/, '');
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',' || ch === ';' || ch === '\t') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell);
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

const HEADER_MAP = {
  name: ['name', 'full name', 'contact', 'contact name'],
  first: ['first name', 'firstname', 'given name'],
  last: ['last name', 'lastname', 'surname', 'family name'],
  email: ['email', 'e-mail', 'email address', 'mail'],
  company: ['company', 'organization', 'organisation', 'account'],
  job_title: ['job title', 'title', 'position', 'designation', 'role'],
  phone: ['phone', 'mobile', 'phone number', 'telephone'],
  tags: ['tags', 'tag', 'labels', 'groups'],
  notes: ['notes', 'note', 'comments']
};

function csvToContacts(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return { contacts: [], columns: [] };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const index = {};
  Object.entries(HEADER_MAP).forEach(([key, names]) => {
    const i = header.findIndex((h) => names.includes(h));
    if (i >= 0) index[key] = i;
  });
  const contacts = rows.slice(1).map((r) => {
    const get = (k) => (index[k] !== undefined ? String(r[index[k]] || '').trim() : '');
    const name = get('name') || `${get('first')} ${get('last')}`.trim();
    return {
      name,
      email: get('email'),
      company: get('company'),
      job_title: get('job_title'),
      phone: get('phone'),
      notes: get('notes'),
      tags: get('tags') ? get('tags').split(/[;|]/).map((t) => t.trim()).filter(Boolean) : []
    };
  });
  return { contacts, columns: Object.keys(index) };
}

/* ---------------------------------------------------------------- modals */

function TagInput({ value, onChange, suggestions = [] }) {
  const [draft, setDraft] = useState('');
  const add = (raw) => {
    const tag = String(raw).trim().slice(0, 30);
    if (tag && !value.some((t) => t.toLowerCase() === tag.toLowerCase()) && value.length < 10) onChange([...value, tag]);
    setDraft('');
  };
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 border border-slate-300 rounded-xl bg-white min-h-[42px] focus-within:border-[#007355] focus-within:ring-2 focus-within:ring-emerald-100">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-lg bg-emerald-50 text-[#007355] text-xs font-bold border border-emerald-200">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="p-0.5 rounded hover:bg-emerald-100"><X size={11} /></button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(draft);
            } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => draft && add(draft)}
          placeholder={value.length ? '' : 'Type a tag and press Enter'}
          className="flex-1 min-w-[120px] px-1.5 py-1 text-sm outline-none bg-transparent"
          list="contact-tag-suggestions"
        />
      </div>
      <datalist id="contact-tag-suggestions">{suggestions.map((t) => <option key={t} value={t} />)}</datalist>
    </div>
  );
}

function ContactFormModal({ open, contact, tagSuggestions, onClose, onSaved }) {
  const blank = { name: '', email: '', company: '', job_title: '', phone: '', notes: '', tags: [], is_favorite: false };
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(contact ? { ...blank, ...contact } : blank);
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contact]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const submit = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = { name: form.name, email: form.email, company: form.company, job_title: form.job_title, phone: form.phone, notes: form.notes, tags: form.tags, is_favorite: form.is_favorite };
      const res = contact
        ? await apiFetch(`/contacts/${contact.id}`, { method: 'PUT', body: payload })
        : await apiFetch('/contacts', { method: 'POST', body: payload });
      onSaved(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={contact ? 'Edit contact' : 'Add contact'}
      description={contact ? contact.email : 'Save someone you send documents to.'}
      icon={contact ? Pencil : UserPlus}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button busy={busy} onClick={submit}>{contact ? 'Save changes' : 'Add contact'}</Button>
        </>
      )}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" required><input className={inputClass} value={form.name} onChange={set('name')} maxLength={150} autoFocus /></Field>
          <Field label="Email" required><input className={inputClass} type="email" value={form.email} onChange={set('email')} maxLength={255} /></Field>
          <Field label="Company"><input className={inputClass} value={form.company} onChange={set('company')} maxLength={150} /></Field>
          <Field label="Job title"><input className={inputClass} value={form.job_title} onChange={set('job_title')} maxLength={120} /></Field>
          <Field label="Phone"><input className={inputClass} type="tel" value={form.phone} onChange={set('phone')} maxLength={40} placeholder="+91 98765 43210" /></Field>
          <div className="flex items-end pb-1">
            <div className="w-full rounded-xl border border-slate-200 px-3 py-2">
              <Toggle checked={Boolean(form.is_favorite)} onChange={(v) => setForm((f) => ({ ...f, is_favorite: v }))} label="Favorite" description="Shown first and suggested first" />
            </div>
          </div>
        </div>
        <Field label="Tags" hint="Group contacts, e.g. Client, Vendor, HR. Up to 10.">
          <TagInput value={form.tags || []} onChange={(tags) => setForm((f) => ({ ...f, tags }))} suggestions={tagSuggestions} />
        </Field>
        <Field label="Notes"><textarea className={`${inputClass} min-h-[80px]`} value={form.notes} onChange={set('notes')} maxLength={2000} /></Field>
      </form>
    </Modal>
  );
}

function ImportModal({ open, onClose, onImported }) {
  const fileRef = useRef(null);
  const [parsed, setParsed] = useState(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (open) {
      setParsed(null);
      setFileName('');
      setError('');
      setResult(null);
    }
  }, [open]);

  const onFile = (file) => {
    if (!file) return;
    setError('');
    setResult(null);
    if (file.size > 2 * 1024 * 1024) {
      setError('The file is larger than 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = csvToContacts(reader.result);
      if (!data.columns.includes('email')) {
        setError('No "Email" column was found. The first row must be a header such as: Name, Email, Company, Job title, Phone, Tags, Notes.');
        setParsed(null);
      } else if (!data.contacts.length) {
        setError('The file has no rows under the header.');
        setParsed(null);
      } else setParsed(data);
      setFileName(file.name);
    };
    reader.readAsText(file);
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await apiFetch('/contacts/import', { method: 'POST', body: { contacts: parsed.contacts } });
      setResult(res);
      onImported(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const template = 'Name,Email,Company,Job title,Phone,Tags,Notes\nPriya Shah,priya@example.com,Acme Ltd,HR Manager,+91 98765 43210,Client;HR,Signs offer letters\n';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import contacts"
      description="Upload a CSV file. Existing contacts (same email) are updated."
      icon={Upload}
      size="lg"
      footer={result ? <Button onClick={onClose}>Done</Button> : (
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={Upload} busy={busy} disabled={!parsed} onClick={submit}>{parsed ? `Import ${parsed.contacts.length} contact${parsed.contacts.length === 1 ? '' : 's'}` : 'Import'}</Button>
        </>
      )}
    >
      <div className="space-y-4">
        {error && <ErrorBanner message={error} />}
        {result ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center"><p className="text-2xl font-black text-emerald-700">{result.created}</p><p className="text-[11px] font-bold text-emerald-800">Added</p></div>
              <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 text-center"><p className="text-2xl font-black text-sky-700">{result.updated}</p><p className="text-[11px] font-bold text-sky-800">Updated</p></div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center"><p className="text-2xl font-black text-amber-700">{result.skipped.length}</p><p className="text-[11px] font-bold text-amber-800">Skipped</p></div>
            </div>
            {result.skipped.length > 0 && (
              <ul className="text-xs text-slate-600 max-h-40 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                {result.skipped.map((s) => <li key={s.row} className="px-3 py-1.5">Row {s.row}{s.email ? ` (${s.email})` : ''}: {s.reason}</li>)}
              </ul>
            )}
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onFile(e.dataTransfer.files?.[0]);
              }}
              className="w-full rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#007355] hover:bg-emerald-50/40 transition p-8 text-center cursor-pointer"
            >
              <Upload size={26} className="mx-auto text-slate-400" />
              <p className="text-sm font-bold text-slate-800 mt-2">{fileName || 'Choose a CSV file or drop it here'}</p>
              <p className="text-xs text-slate-500 mt-1">Columns: Name, Email, Company, Job title, Phone, Tags (separated by ;), Notes</p>
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(template)}`}
              download="bexsign-contacts-template.csv"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#007355] hover:underline"
            >
              <Download size={13} /> Download a sample file
            </a>
            {parsed && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <p className="px-3 py-2 text-[11px] font-bold text-slate-600 bg-slate-50 border-b border-slate-200">
                  Preview · {parsed.contacts.length} row{parsed.contacts.length === 1 ? '' : 's'} · columns found: {parsed.columns.join(', ')}
                </p>
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-xs">
                    <thead><tr><th className={thClass}>Name</th><th className={thClass}>Email</th><th className={thClass}>Company</th><th className={thClass}>Tags</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsed.contacts.slice(0, 8).map((c, i) => (
                        <tr key={i}><td className={tdClass}>{c.name || <span className="text-slate-400">from email</span>}</td><td className={tdClass}>{c.email}</td><td className={tdClass}>{c.company || '-'}</td><td className={tdClass}>{c.tags.join(', ') || '-'}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function ContactDrawer({ contactId, onClose, onEdit, onSend, onFavorite }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!contactId) return undefined;
    let cancelled = false;
    setData(null);
    setError('');
    apiFetch(`/contacts/${contactId}`)
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err.message));
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      window.removeEventListener('keydown', onKey);
    };
  }, [contactId, onClose]);

  if (!contactId) return null;
  const c = data?.contact;
  const rate = c && c.documents_sent ? Math.round((c.documents_signed / c.documents_sent) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label="Contact details" onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <p className="text-sm font-extrabold text-slate-900">Contact</p>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"><X size={18} /></button>
        </div>
        {error && <div className="p-5"><ErrorBanner message={error} /></div>}
        {!c && !error && <LoadingBlock />}
        {c && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 bg-gradient-to-br from-emerald-50/70 to-white border-b border-slate-100">
              <div className="flex items-start gap-3.5">
                <Avatar contact={c} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black text-slate-900 break-words">{c.name}</p>
                  <p className="text-xs text-slate-600 break-all">{c.email}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge tone={SOURCE[c.source]?.tone || 'slate'}>{SOURCE[c.source]?.label || c.source}</Badge>
                    {c.tags.map((t) => <Badge key={t} tone="emerald">{t}</Badge>)}
                  </div>
                </div>
                <button type="button" onClick={() => onFavorite(c, (fav) => setData((d) => ({ ...d, contact: { ...d.contact, is_favorite: fav } })))} aria-label={c.is_favorite ? 'Remove from favorites' : 'Add to favorites'} className="p-1.5 rounded-lg hover:bg-amber-50 cursor-pointer">
                  <Star size={18} className={c.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
                </button>
              </div>
              <div className="flex gap-2 mt-4">
                <Button icon={Send} onClick={() => onSend(c)} className="flex-1">Send document</Button>
                <Button variant="secondary" icon={Pencil} onClick={() => onEdit(c)}>Edit</Button>
              </div>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3"><p className="text-[10px] font-bold uppercase text-slate-500">Sent</p><p className="text-xl font-black text-slate-900">{c.documents_sent}</p></div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3"><p className="text-[10px] font-bold uppercase text-slate-500">Signed</p><p className="text-xl font-black text-emerald-700">{c.documents_signed}</p></div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3"><p className="text-[10px] font-bold uppercase text-slate-500">Sign rate</p><p className="text-xl font-black text-slate-900">{rate}%</p></div>
              </div>
              <dl className="space-y-2.5 text-xs">
                {[[Building2, 'Company', [c.company, c.job_title].filter(Boolean).join(' · ')], [Phone, 'Phone', c.phone], [Mail, 'Last document sent', c.last_sent_at ? formatDateTime(c.last_sent_at) : ''], [CheckCircle2, 'Last signed', c.last_signed_at ? formatDateTime(c.last_signed_at) : ''], [StickyNote, 'Notes', c.notes]].map(([Icon, label, value]) => (
                  <div key={label} className="flex items-start gap-2.5">
                    <Icon size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <dt className="w-32 shrink-0 font-bold text-slate-500">{label}</dt>
                    <dd className="text-slate-800 break-words min-w-0 whitespace-pre-line">{value || <span className="text-slate-400">-</span>}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <p className="text-xs font-extrabold text-slate-900 mb-2 flex items-center gap-1.5"><FileSignature size={14} /> Documents sent to {c.name.split(' ')[0]}</p>
                {data.documents.length === 0 ? (
                  <p className="text-xs text-slate-500 rounded-xl border border-dashed border-slate-200 p-4 text-center">No documents sent yet.</p>
                ) : (
                  <ul className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {data.documents.map((d) => (
                      <li key={d.id}>
                        <Link to={`/documents/${d.id}`} className="px-3 py-2.5 flex items-center gap-2.5 hover:bg-slate-50">
                          <FileText size={15} className="text-slate-400 shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-bold text-slate-800 truncate">{d.document_name || `Document ${d.id}`}</span>
                            <span className="block text-[11px] text-slate-500">{formatDateTime(d.sent_at || d.created_at, { withTime: false })} · {d.status}</span>
                          </span>
                          {['viewer', 'reviewer', 'cc'].includes(String(d.role || '').toLowerCase())
                            ? <Badge tone="slate">Copy</Badge>
                            : <Badge tone={statusTone(d.recipient_status)}>{d.recipient_status || 'pending'}</Badge>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

/* ---------------------------------------------------------------- page */

export default function Contacts() {
  const navigate = useNavigate();
  const [toast, showToast] = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState('all');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | contact
  const [importing, setImporting] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // ids
  const [deleting, setDeleting] = useState(false);
  const [tagging, setTagging] = useState(false);
  const [bulkTag, setBulkTag] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [debounced, filter, tag, sort, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ search: debounced, filter, tag, sort, page, pageSize });
      const res = await apiFetch(`/contacts?${qs}`);
      setData(res);
      setSelected((prev) => prev.filter((id) => res.contacts.some((c) => c.id === id)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debounced, filter, tag, sort, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const contacts = data?.contacts || [];
  const stats = data?.stats || {};
  const tagNames = useMemo(() => (data?.tags || []).map((t) => t.name), [data]);
  const allOnPage = contacts.length > 0 && contacts.every((c) => selected.includes(c.id));
  const closeDrawer = useCallback(() => setViewing(null), []);

  const toggleFavorite = async (contact, after) => {
    try {
      const res = await apiFetch(`/contacts/${contact.id}/favorite`, { method: 'POST', body: { favorite: !contact.is_favorite } });
      setData((d) => ({ ...d, contacts: d.contacts.map((c) => (c.id === contact.id ? { ...c, is_favorite: res.is_favorite } : c)) }));
      after?.(res.is_favorite);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const sendTo = (contact) => navigate('/documents/create', { state: { recipient: { email: contact.email, name: contact.name } } });

  const doDelete = async () => {
    setDeleting(true);
    try {
      const res = await apiFetch('/contacts/bulk-delete', { method: 'POST', body: { ids: confirmDelete } });
      showToast('success', `${res.message} Restore them from Settings > Trash.`);
      setConfirmDelete(null);
      setSelected([]);
      setViewing(null);
      load();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setDeleting(false);
    }
  };

  const applyTag = async (action) => {
    if (!bulkTag.trim()) return;
    try {
      const res = await apiFetch('/contacts/bulk-tag', { method: 'POST', body: { ids: selected, tag: bulkTag, action } });
      showToast('success', res.message);
      setTagging(false);
      setBulkTag('');
      load();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const exportCsv = async () => {
    try {
      const res = await apiFetch('/contacts/export', { raw: true });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bexsign-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const res = await apiFetch('/contacts/sync', { method: 'POST' });
      showToast('success', res.message);
      load();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Settings"
        title="Contacts"
        icon={BookUser}
        description="Everyone you send documents to. Recipients of your sent requests are added automatically; add, import, tag and export contacts, and pick them when adding recipients."
        actions={(
          <>
            <Button variant="secondary" icon={RefreshCw} busy={syncing} onClick={sync}>Sync</Button>
            <Button variant="secondary" icon={Upload} onClick={() => setImporting(true)}>Import</Button>
            <Button variant="secondary" icon={Download} onClick={exportCsv} disabled={!stats.total}>Export</Button>
            <Button icon={Plus} onClick={() => setEditing('new')}>Add contact</Button>
          </>
        )}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="All contacts" value={stats.total ?? '-'} icon={Users} tone="emerald" onClick={() => setFilter('all')} active={filter === 'all'} />
        <StatCard label="Favorites" value={stats.favorites ?? '-'} icon={Star} tone="amber" onClick={() => setFilter(filter === 'favorites' ? 'all' : 'favorites')} active={filter === 'favorites'} />
        <StatCard label="From sent documents" value={stats.recipient ?? '-'} icon={Send} tone="sky" hint={stats.active_30d ? `${stats.active_30d} active in the last 30 days` : undefined} onClick={() => setFilter(filter === 'recipient' ? 'all' : 'recipient')} active={filter === 'recipient'} />
        <StatCard label="Documents sent" value={stats.documents_sent ?? '-'} icon={FileSignature} tone="violet" hint="To your contacts in total" />
      </div>

      <Card bodyClassName="p-0">
        <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center gap-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, company, phone" className="lg:w-80" />
          <div className="flex flex-wrap gap-2 lg:ml-auto">
            <SelectInput value={filter} onChange={setFilter} label="Show" options={[['all', 'All contacts'], ['favorites', 'Favorites'], ['recipient', 'From sent documents'], ['manual', 'Added manually'], ['import', 'Imported']]} />
            <SelectInput value={tag} onChange={setTag} label="Tag" options={[['', 'Any tag'], ...(data?.tags || []).map((t) => [t.name, `${t.name} (${t.count})`])]} />
            <SelectInput value={sort} onChange={setSort} label="Sort" options={[['name', 'Favorites, then A-Z'], ['recent', 'Recently sent'], ['most_sent', 'Most documents'], ['newest', 'Newest added']]} />
          </div>
        </div>

        {selected.length > 0 && (
          <div className="px-3 sm:px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-emerald-900">{selected.length} selected</span>
            {tagging ? (
              <span className="flex items-center gap-1.5">
                <input value={bulkTag} onChange={(e) => setBulkTag(e.target.value)} placeholder="Tag" list="contact-tag-suggestions-bulk" className="px-2.5 py-1.5 text-xs border border-emerald-300 rounded-lg bg-white w-36 outline-none focus:border-[#007355]" autoFocus />
                <datalist id="contact-tag-suggestions-bulk">{tagNames.map((t) => <option key={t} value={t} />)}</datalist>
                <Button onClick={() => applyTag('add')} className="!py-1.5">Add</Button>
                <Button variant="secondary" onClick={() => applyTag('remove')} className="!py-1.5">Remove</Button>
                <Button variant="ghost" onClick={() => setTagging(false)} className="!py-1.5">Cancel</Button>
              </span>
            ) : (
              <Button variant="secondary" icon={Tags} onClick={() => setTagging(true)} className="!py-1.5">Tag</Button>
            )}
            <Button variant="subtleDanger" icon={Trash2} onClick={() => setConfirmDelete(selected)} className="!py-1.5">Delete</Button>
            <button type="button" onClick={() => setSelected([])} className="ml-auto text-xs font-bold text-emerald-800 hover:underline cursor-pointer">Clear selection</button>
          </div>
        )}

        {!data && loading && <LoadingBlock label="Loading contacts..." />}
        {data && contacts.length === 0 && (
          <EmptyState
            icon={BookUser}
            title={debounced || filter !== 'all' || tag ? 'No contacts match' : 'No contacts yet'}
            description={debounced || filter !== 'all' || tag ? 'Try another search or filter.' : 'Send a document and its recipients appear here, or add and import contacts yourself.'}
            action={!(debounced || filter !== 'all' || tag) && <Button icon={Plus} onClick={() => setEditing('new')}>Add contact</Button>}
          />
        )}

        {contacts.length > 0 && (
          <>
            {/* Table (tablet and desktop) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={`${thClass} w-10`}>
                      <input type="checkbox" aria-label="Select all on this page" checked={allOnPage} onChange={() => setSelected(allOnPage ? selected.filter((id) => !contacts.some((c) => c.id === id)) : [...new Set([...selected, ...contacts.map((c) => c.id)])])} className="accent-[#007355]" />
                    </th>
                    <th className={thClass}>Contact</th>
                    <th className={thClass}>Company</th>
                    <th className={thClass}>Tags</th>
                    <th className={thClass}>Documents</th>
                    <th className={thClass}>Last sent</th>
                    <th className={`${thClass} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-slate-100 ${loading ? 'opacity-60' : ''}`}>
                  {contacts.map((c) => {
                    const rate = c.documents_sent ? Math.round((c.documents_signed / c.documents_sent) * 100) : 0;
                    return (
                      <tr key={c.id} className={`hover:bg-slate-50/70 ${selected.includes(c.id) ? 'bg-emerald-50/40' : ''}`}>
                        <td className={tdClass}>
                          <input type="checkbox" aria-label={`Select ${c.name}`} checked={selected.includes(c.id)} onChange={() => setSelected((s) => (s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id]))} className="accent-[#007355]" />
                        </td>
                        <td className={tdClass}>
                          <button type="button" onClick={() => setViewing(c.id)} className="flex items-center gap-3 text-left cursor-pointer group">
                            <Avatar contact={c} />
                            <span className="min-w-0">
                              <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900 group-hover:text-[#007355]">
                                {c.name}{c.is_favorite && <Star size={12} className="fill-amber-400 text-amber-400" />}
                              </span>
                              <span className="block text-[11px] text-slate-500">{c.email}</span>
                            </span>
                          </button>
                        </td>
                        <td className={tdClass}>
                          <span className="block font-semibold text-slate-700">{c.company || <span className="text-slate-400">-</span>}</span>
                          {c.job_title && <span className="block text-[11px] text-slate-500">{c.job_title}</span>}
                        </td>
                        <td className={tdClass}>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {c.tags.length ? c.tags.slice(0, 3).map((t) => <Badge key={t} tone="emerald">{t}</Badge>) : <Badge tone={SOURCE[c.source]?.tone}>{SOURCE[c.source]?.label}</Badge>}
                            {c.tags.length > 3 && <Badge>+{c.tags.length - 3}</Badge>}
                          </div>
                        </td>
                        <td className={tdClass}>
                          <span className="text-xs font-bold text-slate-800 tabular-nums">{c.documents_signed}/{c.documents_sent} signed</span>
                          <span className="mt-1 block h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
                            <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${rate}%` }} />
                          </span>
                        </td>
                        <td className={`${tdClass} whitespace-nowrap`} title={c.last_sent_at ? formatDateTime(c.last_sent_at) : ''}>{c.last_sent_at ? formatRelative(c.last_sent_at) : <span className="text-slate-400">Never</span>}</td>
                        <td className={`${tdClass} text-right whitespace-nowrap`}>
                          <div className="inline-flex items-center gap-0.5">
                            <button type="button" title={c.is_favorite ? 'Remove from favorites' : 'Add to favorites'} aria-label={c.is_favorite ? 'Remove from favorites' : 'Add to favorites'} onClick={() => toggleFavorite(c)} className="p-1.5 rounded-lg hover:bg-amber-50 cursor-pointer">
                              <Star size={15} className={c.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
                            </button>
                            <button type="button" title="Send document" aria-label={`Send a document to ${c.name}`} onClick={() => sendTo(c)} className="p-1.5 rounded-lg text-slate-500 hover:text-[#007355] hover:bg-emerald-50 cursor-pointer"><Send size={15} /></button>
                            <button type="button" title="Edit" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"><Pencil size={15} /></button>
                            <button type="button" title="Delete" aria-label={`Delete ${c.name}`} onClick={() => setConfirmDelete([c.id])} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards (phones) */}
            <ul className="md:hidden divide-y divide-slate-100">
              {contacts.map((c) => (
                <li key={c.id} className="p-3 flex items-start gap-3">
                  <input type="checkbox" aria-label={`Select ${c.name}`} checked={selected.includes(c.id)} onChange={() => setSelected((s) => (s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id]))} className="mt-3 accent-[#007355]" />
                  <button type="button" onClick={() => setViewing(c.id)} className="flex items-start gap-3 text-left flex-1 min-w-0 cursor-pointer">
                    <Avatar contact={c} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900">{c.name}{c.is_favorite && <Star size={12} className="fill-amber-400 text-amber-400" />}</span>
                      <span className="block text-[11px] text-slate-500 break-all">{c.email}</span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">{c.documents_signed}/{c.documents_sent} signed{c.company ? ` · ${c.company}` : ''}</span>
                    </span>
                  </button>
                  <button type="button" aria-label={`Send a document to ${c.name}`} onClick={() => sendTo(c)} className="p-2 rounded-lg text-[#007355] bg-emerald-50 cursor-pointer"><Send size={15} /></button>
                </li>
              ))}
            </ul>
          </>
        )}
        <Pagination page={page} pageSize={pageSize} total={data?.total || 0} onPage={setPage} onPageSize={setPageSize} />
      </Card>

      <p className="flex items-start gap-2 text-[11px] text-slate-500">
        <Info size={13} className="shrink-0 mt-0.5" />
        Contacts are private to your account. Deleted contacts stay in the trash until the retention period ends; a contact from your sent documents is not added again after you delete it.
      </p>

      <ContactFormModal
        open={Boolean(editing)}
        contact={editing && editing !== 'new' ? editing : null}
        tagSuggestions={tagNames}
        onClose={() => setEditing(null)}
        onSaved={(res) => {
          showToast('success', res.message);
          setEditing(null);
          load();
        }}
      />
      <ImportModal open={importing} onClose={() => setImporting(false)} onImported={() => load()} />
      <ContactDrawer
        contactId={viewing}
        onClose={closeDrawer}
        onEdit={(c) => {
          setViewing(null);
          setEditing(c);
        }}
        onSend={sendTo}
        onFavorite={toggleFavorite}
      />
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={confirmDelete?.length > 1 ? `Delete ${confirmDelete.length} contacts?` : 'Delete this contact?'}
        message="They are moved to the trash, where you can restore them until the retention period ends."
        confirmLabel="Move to trash"
        danger
        busy={deleting}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
      {toast}
    </div>
  );
}
