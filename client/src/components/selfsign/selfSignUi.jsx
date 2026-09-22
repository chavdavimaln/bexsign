/**
 * Sign yourself - the pieces the module's screens share (client/src/components/selfsign/selfSignUi.jsx).
 * Everything is built from the BexSign UI kit so the module looks like the rest of the app.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  FileSignature,
  FileBox,
  Upload,
  Layers,
  PenTool,
  CheckCircle2,
  Clock,
  Download,
  Mail,
  Trash2,
  Pencil,
  Replace,
  MoreVertical,
  Plus,
  Check,
  X,
  GripVertical,
  History,
  Share2,
  Printer,
  Eye,
  FilePlus2,
  Combine,
  ShieldCheck,
  Info,
  AlertCircle
} from 'lucide-react';
import { Badge, Button, Modal, Field, inputClass, EmptyState, formatDateTime, formatRelative } from '../ui/kit';
import { STAGES, SOURCE_LABELS, ACTION_LABELS } from './selfSignApi';

/* ------------------------------------------------------------------ small bits */

export function StageBadge({ stage, className = '' }) {
  const meta = STAGES[stage] || STAGES.draft;
  return <Badge tone={meta.tone} dot className={className}>{meta.label}</Badge>;
}

const SOURCE_ICONS = { upload: Upload, template: FileBox, created: FilePlus2, merged: Combine };

export function SourceIcon({ source, size = 16, className = '' }) {
  const Icon = SOURCE_ICONS[source] || FileText;
  return <Icon size={size} className={className} />;
}

/** "Add documents -> Name & merge -> ..." with the step the user is on highlighted. */
export function Stepper({ steps, current, onStep }) {
  return (
    <ol className="flex flex-col sm:flex-row sm:items-stretch gap-2 sm:gap-0" aria-label="Steps">
      {steps.map((step, index) => {
        const number = index + 1;
        const done = number < current;
        const active = number === current;
        const clickable = Boolean(onStep) && number <= current;
        const Tag = clickable ? 'button' : 'div';
        return (
          <li key={step.id} className="flex-1 min-w-0 flex items-stretch">
            <Tag
              type={clickable ? 'button' : undefined}
              onClick={clickable ? () => onStep(number) : undefined}
              aria-current={active ? 'step' : undefined}
              className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 border transition min-w-0 ${
                index === 0 ? 'rounded-l-xl sm:rounded-r-none rounded-r-xl' : ''
              } ${index === steps.length - 1 ? 'rounded-r-xl sm:rounded-l-none rounded-l-xl' : ''} ${
                index !== 0 && index !== steps.length - 1 ? 'rounded-xl sm:rounded-none' : ''
              } ${index !== 0 ? 'sm:border-l-0' : ''} ${
                active
                  ? 'bg-emerald-50 border-[#007355] text-[#007355]'
                  : done
                    ? 'bg-white border-emerald-200 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-500'
              } ${clickable ? 'cursor-pointer hover:bg-emerald-50/70' : ''}`}
            >
              <span
                className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-black shrink-0 ${
                  active ? 'bg-[#007355] text-white' : done ? 'bg-emerald-100 text-[#007355]' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {done ? <Check size={13} strokeWidth={3} /> : number}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold truncate">{step.label}</span>
                {step.hint && <span className="block text-[10px] text-slate-400 truncate">{step.hint}</span>}
              </span>
            </Tag>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ add documents */

const MAX_FILE_MB = 25;

/**
 * "Add documents" panel: a real drag-and-drop zone, a desktop file picker, templates and a blank document.
 * `onFiles(FileList|File[])`, `onTemplates()`, `onBlank()`.
 */
export function DocumentDropzone({ onFiles, onTemplates, onBlank, busy = false, compact = false }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const accept = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    const tooBig = files.filter((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig.length > 0) {
      setError(`${tooBig.map((f) => f.name).join(', ')} is larger than ${MAX_FILE_MB} MB.`);
      return;
    }
    setError('');
    onFiles(files);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (e.currentTarget.contains(e.relatedTarget)) return;
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer?.files);
        }}
        className={`rounded-2xl border-2 border-dashed text-center transition ${compact ? 'p-5' : 'p-6 sm:p-8'} ${
          dragging ? 'border-[#007355] bg-emerald-50' : 'border-slate-300 bg-slate-50/70'
        }`}
      >
        <span className={`mx-auto mb-3 grid place-items-center rounded-2xl ${dragging ? 'bg-emerald-100 text-[#007355]' : 'bg-white text-slate-400 border border-slate-200'} ${compact ? 'w-11 h-11' : 'w-14 h-14'}`}>
          <Upload size={compact ? 20 : 24} />
        </span>
        <p className="text-sm font-bold text-slate-800">{dragging ? 'Drop the files to add them' : 'Drag your documents here'}</p>
        <p className="text-xs text-slate-500 mt-1">PDF, Word or image files, up to {MAX_FILE_MB} MB each.</p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button icon={Upload} busy={busy} onClick={() => inputRef.current?.click()}>Choose from this device</Button>
          {onTemplates && <Button variant="secondary" icon={FileBox} onClick={onTemplates}>Use templates</Button>}
          {onBlank && <Button variant="secondary" icon={FilePlus2} onClick={onBlank}>Write a new one</Button>}
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            accept(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-600">
          <AlertCircle size={14} /> {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ menus */

/**
 * Small "..." menu used by the document cards. `items` = [{ label, icon, onClick, danger, hidden }].
 *
 * The menu is rendered at the end of the page rather than inside the card: a card clips its own content to keep
 * its rounded corners, which used to cut the menu in half. It is positioned against the button and flips above it
 * when there is no room below.
 */
export function CardMenu({ items, label = 'More actions' }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const visible = items.filter((item) => item && !item.hidden);

  const place = () => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const width = 208;
    const height = Math.min(visible.length * 34 + 8, 320);
    const below = window.innerHeight - rect.bottom;
    setPosition({
      top: below < height + 12 ? Math.max(8, rect.top - height - 6) : rect.bottom + 6,
      left: Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8),
      width
    });
  };

  useEffect(() => {
    if (!open) return undefined;
    place();
    const close = () => setOpen(false);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  if (visible.length === 0) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
      >
        <MoreVertical size={16} />
      </button>
      {open && position && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div
            role="menu"
            className="fixed z-[61] bg-white border border-slate-200 rounded-xl shadow-xl py-1 max-h-[60vh] overflow-y-auto"
            style={{ top: position.top, left: position.left, width: position.width }}
            onClick={(e) => e.stopPropagation()}
          >
            {visible.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  item.onClick();
                }}
                className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                  item.danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.icon && <item.icon size={14} className={item.danger ? '' : 'text-slate-400'} />}
                {item.label}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  );
}

/* ------------------------------------------------------------------ cards */

/** One self-sign document in the hub list. */
export function SelfSignCard({ item, onOpen, actions = [], primary }) {
  const meta = STAGES[item.stage] || STAGES.draft;
  return (
    <article className="group bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${
          item.stage === 'signed' ? 'bg-emerald-100 text-[#007355]' : item.stage === 'prepared' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
        }`}
        >
          {item.stage === 'signed' ? <FileSignature size={20} /> : <SourceIcon source={item.source} size={20} />}
        </span>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpen(item)}
            className="block text-left text-sm font-extrabold text-slate-900 leading-snug hover:text-[#007355] transition cursor-pointer truncate w-full"
            title={item.title}
          >
            {item.title}
          </button>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
            {SOURCE_LABELS[item.source] || 'Document'}
            {item.templateName ? ` · ${item.templateName}` : ''}
            {item.documentCount > 1 ? ` · ${item.documentCount} documents` : ''}
          </p>
        </div>
        <CardMenu items={actions} label={`Actions for ${item.title}`} />
      </div>

      <div className="px-4 pb-3 flex flex-wrap items-center gap-1.5">
        <StageBadge stage={item.stage} />
        {item.fieldCount > 0 && (
          <Badge tone="sky">{item.fieldCount} field{item.fieldCount === 1 ? '' : 's'}</Badge>
        )}
        {item.shareCount > 0 && (
          <Badge tone="indigo">shared {item.shareCount}x</Badge>
        )}
      </div>

      <div className="mt-auto px-4 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500 min-w-0 truncate" title={formatDateTime(item.signedAt || item.updatedAt)}>
          {item.stage === 'signed' && item.signedAt
            ? `Signed ${formatRelative(item.signedAt)}`
            : `Updated ${formatRelative(item.updatedAt)}`}
        </span>
        {primary && (
          <Button variant={primary.variant || 'primary'} icon={primary.icon} onClick={() => primary.onClick(item)} className="shrink-0">
            {primary.label}
          </Button>
        )}
      </div>
    </article>
  );
}

/** One document (file) inside a self-sign document, with its own edit / replace / remove menu. */
export function DocumentTile({ doc, index, selected, onToggle, actions = [], readOnly = false }) {
  return (
    <div
      className={`relative rounded-2xl border p-3 transition ${
        selected ? 'border-[#007355] ring-1 ring-[#007355] bg-emerald-50/50' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {onToggle ? (
          <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggle(doc)}
              className="w-4 h-4 accent-[#007355] cursor-pointer"
              aria-label={`Select ${doc.name}`}
            />
            <span>#{index + 1}</span>
          </label>
        ) : (
          <span className="text-[11px] font-bold text-slate-400">#{index + 1}</span>
        )}
        {!readOnly && <CardMenu items={actions} label={`Actions for ${doc.name}`} />}
      </div>

      <div className="mt-2 h-28 rounded-xl border border-slate-200 bg-slate-50 grid place-items-center text-center px-2">
        <div>
          <FileText size={26} className="mx-auto text-[#007355]" />
          <p className="mt-1 text-[10px] font-semibold text-slate-500">
            {doc.hasFile ? (doc.fileType || 'pdf').toUpperCase() : 'Written in BexSign'}
          </p>
        </div>
      </div>

      <p className="mt-2 text-xs font-bold text-slate-800 truncate" title={doc.name}>{doc.name}</p>
      <p className="text-[10px] text-slate-500 truncate">
        {doc.hasFile ? `${doc.fileSize ? `${doc.fileSize} KB` : 'Uploaded file'}` : `${(doc.documentText || '').replace(/<[^>]+>/g, ' ').trim().slice(0, 60) || 'No text yet'}`}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ modals */

/** Merge dialog: the chosen documents in order, and the name of the file they become. */
export function MergeModal({ open, onClose, documents, selectedIds, onConfirm, busy }) {
  const [fileName, setFileName] = useState('');
  const chosen = useMemo(
    () => documents.filter((d) => selectedIds.includes(String(d.fileId))),
    [documents, selectedIds]
  );
  useEffect(() => {
    if (open) setFileName(`${(chosen[0]?.name || 'Merged document').replace(/\.pdf$/i, '')} (merged)`);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Merge documents"
      description="The documents you chose become one file, in the order shown below."
      icon={Combine}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={Combine} busy={busy} disabled={chosen.length < 2 || !fileName.trim()} onClick={() => onConfirm(fileName.trim())}>
            Merge {chosen.length} documents
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <Field label="File name" required>
          <input value={fileName} onChange={(e) => setFileName(e.target.value)} className={inputClass} placeholder="Merged document" />
        </Field>
        <div>
          <p className="text-xs font-bold text-slate-700 mb-1.5">Documents to merge ({chosen.length})</p>
          <ul className="space-y-1.5">
            {chosen.map((doc, i) => (
              <li key={doc.fileId} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <GripVertical size={15} className="text-slate-300 shrink-0" />
                <span className="w-5 h-5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-500 grid place-items-center shrink-0">{i + 1}</span>
                <span className="text-xs font-semibold text-slate-800 truncate">{doc.name}</span>
              </li>
            ))}
          </ul>
          {chosen.length < 2 && <p className="text-xs text-amber-700 mt-2">Choose at least two documents to merge.</p>}
        </div>
        <p role="note" className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] leading-relaxed text-sky-900">
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>
            Merged pages are rendered as page images, so the merged file keeps its look and page count but its text is
            no longer selectable, like a scanned document. Your original files stay untouched.
          </span>
        </p>
      </div>
    </Modal>
  );
}

/** Email a copy of a self-sign document to somebody else (this is what the Shared tab records). */
export function ShareModal({ open, onClose, item, onConfirm, busy }) {
  const [form, setForm] = useState({ email: '', name: '', message: '' });
  useEffect(() => {
    if (open) setForm({ email: '', name: '', message: '' });
  }, [open]);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim());
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Email a copy"
      description={item ? `A copy of "${item.title}" is attached to the email.` : ''}
      icon={Share2}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={Mail} busy={busy} disabled={!valid} onClick={() => onConfirm(form)}>Send the copy</Button>
        </>
      )}
    >
      <div className="space-y-3">
        <Field label="Email address" required>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClass}
            placeholder="name@example.com"
          />
        </Field>
        <Field label="Their name" hint="Shown in the history of this document.">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Optional" />
        </Field>
        <Field label="Note" hint="Kept with the share record so you remember why you sent it.">
          <textarea
            rows={3}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className={`${inputClass} resize-y`}
            placeholder="Optional"
          />
        </Field>
        <p className="text-[11px] text-slate-500">
          Sharing only sends a copy. Nobody is asked to sign it - use <strong>Send for signatures</strong> when you need
          someone else&apos;s signature.
        </p>
      </div>
    </Modal>
  );
}

/** Rename dialog used for both the self-sign document and one of its documents. */
export function RenameModal({ open, onClose, title = 'Rename', label = 'Name', value, onConfirm, busy }) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (open) setText(value || '');
  }, [open, value]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={Pencil}
      size="sm"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button busy={busy} disabled={!text.trim()} onClick={() => onConfirm(text.trim())}>Save</Button>
        </>
      )}
    >
      <Field label={label} required>
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && text.trim() && onConfirm(text.trim())}
          className={inputClass}
        />
      </Field>
    </Modal>
  );
}

/* ------------------------------------------------------------------ history */

const HISTORY_ICONS = {
  created: FilePlus2,
  document_added: Plus,
  document_replaced: Replace,
  document_removed: Trash2,
  merged: Combine,
  renamed: Pencil,
  fields_placed: PenTool,
  signed: FileSignature,
  downloaded: Download,
  shared: Mail,
  share_failed: AlertCircle,
  printed: Printer
};

const HISTORY_TONES = {
  signed: 'bg-emerald-100 text-[#007355]',
  shared: 'bg-indigo-100 text-indigo-700',
  share_failed: 'bg-red-100 text-red-600',
  merged: 'bg-violet-100 text-violet-700',
  fields_placed: 'bg-amber-100 text-amber-700',
  document_removed: 'bg-rose-100 text-rose-600'
};

/** Every event and every share of one self-sign document, oldest first. */
export function HistoryTimeline({ entries = [], emptyHint = 'Nothing has happened to this document yet.' }) {
  if (entries.length === 0) {
    return <EmptyState icon={History} title="No history yet" description={emptyHint} />;
  }
  return (
    <ol className="relative space-y-4 pl-8">
      <span className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200" aria-hidden="true" />
      {entries.map((entry) => {
        const Icon = HISTORY_ICONS[entry.action] || CheckCircle2;
        return (
          <li key={entry.id} className="relative">
            <span className={`absolute -left-8 top-0 w-8 h-8 rounded-full grid place-items-center ring-4 ring-white ${HISTORY_TONES[entry.action] || 'bg-slate-100 text-slate-500'}`}>
              <Icon size={15} />
            </span>
            <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-xs font-extrabold text-slate-900">{ACTION_LABELS[entry.action] || entry.action}</p>
                <p className="text-[11px] text-slate-400" title={formatDateTime(entry.at)}>{formatDateTime(entry.at)}</p>
              </div>
              {entry.detail && <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words">{entry.detail}</p>}
              {(entry.actor || entry.ip) && (
                <p className="text-[10px] text-slate-400 mt-1">
                  {entry.actor || 'You'}{entry.ip ? ` · ${entry.ip}` : ''}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export {
  FileText,
  FileSignature,
  FileBox,
  Upload,
  Layers,
  PenTool,
  CheckCircle2,
  Clock,
  Download,
  Mail,
  Trash2,
  Pencil,
  Replace,
  Plus,
  X,
  History,
  Share2,
  Eye,
  FilePlus2,
  Combine,
  ShieldCheck
};
