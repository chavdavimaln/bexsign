/**
 * The templates a request was built from (client/src/components/documents/TemplatesUsedModal.jsx).
 *
 * Opened from the eye icon in the Templates column of the documents list: it names every template used and can
 * show the template's text without leaving the list.
 */
import React, { useEffect, useState } from 'react';
import { X, FileBox, Eye, ArrowLeft, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { findLibraryTemplateByName } from '../../utils/templateLibrary';
import { fetchSavedTemplates } from '../templates/templateUi';
import { getLoggedInUser } from '../../utils/currentUser';
import { Button, Badge, LoadingBlock } from '../ui/kit';

export default function TemplatesUsedModal({ documentName, templates = [], onClose }) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchSavedTemplates(getLoggedInUser()?.id)
      .then((rows) => { if (!cancelled) setSaved(rows || []); })
      .catch(() => { if (!cancelled) setSaved([]); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') (preview ? setPreview(null) : onClose()); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [preview, onClose]);

  /** The template's own record: a saved one first, then the built-in library. */
  const resolve = (name) => {
    const wanted = String(name || '').replace(/\.pdf$/i, '').trim().toLowerCase();
    const match = (saved || []).find((row) => String(row.name || '').trim().toLowerCase() === wanted);
    if (match) return { ...match, source: 'saved' };
    const library = findLibraryTemplateByName(name);
    return library ? { ...library, source: 'library' } : null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-4 overflow-y-auto" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Templates used"
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-full sm:max-h-[88vh] overflow-hidden my-auto"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {preview && (
              <button type="button" onClick={() => setPreview(null)} aria-label="Back to the list" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer">
                <ArrowLeft size={16} />
              </button>
            )}
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-[#007355] grid place-items-center shrink-0"><FileBox size={18} /></span>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-slate-900 truncate">{preview ? preview.name : 'Templates used'}</h2>
              <p className="text-[11px] text-slate-500 truncate">{documentName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {saved === null && <LoadingBlock label="Loading templates" />}

          {saved !== null && !preview && (
            <ul className="space-y-2">
              {templates.map((name) => {
                const record = resolve(name);
                return (
                  <li key={name} className="flex items-center justify-between gap-3 border border-slate-200 rounded-xl px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{name}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {record
                          ? `${record.categoryLabel || record.category || 'Template'} · ${record.source === 'saved' ? 'Saved in your account' : 'From the template library'}`
                          : 'This template is no longer available.'}
                      </p>
                    </div>
                    {record
                      ? <Button variant="secondary" icon={Eye} onClick={() => setPreview(record)}>View template</Button>
                      : <Badge tone="slate">Not available</Badge>}
                  </li>
                );
              })}
              {templates.length === 0 && <p className="text-xs text-slate-500">No template was used for this request.</p>}
            </ul>
          )}

          {preview && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {preview.categoryLabel && <Badge tone="emerald">{preview.categoryLabel}</Badge>}
                {preview.kindLabel && <Badge tone="slate">{preview.kindLabel}</Badge>}
                <Badge tone="violet">{preview.source === 'saved' ? 'Saved template' : 'Template library'}</Badge>
              </div>
              {preview.description && <p className="text-xs text-slate-600">{preview.description}</p>}
              {preview.notice && (
                <p className="text-[11px] bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">{preview.notice}</p>
              )}
              <div className="border border-slate-200 rounded-xl p-4 bg-white text-xs text-slate-700 leading-relaxed whitespace-pre-line bex-rich-text max-h-[46vh] overflow-y-auto">
                {preview.content || 'This template has no saved text.'}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" icon={ExternalLink} onClick={() => { onClose(); navigate('/templates'); }}>Open Templates</Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
