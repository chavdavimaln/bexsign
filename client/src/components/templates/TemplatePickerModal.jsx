import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileBox, X, Search, Check, Eye, ArrowLeft, Loader2, LayoutGrid, Star, FileText } from 'lucide-react';
import { TEMPLATE_LIBRARY, TEMPLATE_CATEGORIES, searchTemplates } from '../../utils/templateLibrary';
import { getLoggedInUser } from '../../utils/currentUser';
import { CategoryIcon, categoryMeta, fetchSavedTemplates, TemplateDocument, TemplateNotice, countPlaceholders } from './templateUi';

/**
 * "Select templates" dialog. mode="add" lets the user pick several templates (each becomes a document);
 * mode="replace" picks one template whose text replaces the current document's text.
 * onConfirm receives the chosen templates ({ name, content, filePath, category, ... }).
 */
export default function TemplatePickerModal({ open, onClose, onConfirm, mode = 'add', maxSelect = 40, title }) {
  const single = mode === 'replace';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [focusedId, setFocusedId] = useState(TEMPLATE_LIBRARY[0]?.id || null);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [saved, setSaved] = useState({ status: 'idle', items: [], error: '' });
  const searchRef = useRef(null);

  // Saved templates are loaded each time the dialog opens
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelectedIds([]);
    setShowMobilePreview(false);
    setSaved((prev) => ({ ...prev, status: 'loading' }));
    fetchSavedTemplates(getLoggedInUser()?.id)
      .then((items) => setSaved({ status: 'ready', items, error: '' }))
      .catch((err) => setSaved({ status: 'error', items: [], error: err instanceof TypeError ? 'Your saved templates could not be loaded (server not reachable).' : err.message }));
    setTimeout(() => searchRef.current?.focus(), 60);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const allTemplates = useMemo(() => [...saved.items, ...TEMPLATE_LIBRARY], [saved.items]);
  const byId = useMemo(() => new Map(allTemplates.map((t) => [t.id, t])), [allTemplates]);

  const counts = useMemo(() => {
    const result = { all: TEMPLATE_LIBRARY.length, saved: saved.items.length };
    TEMPLATE_CATEGORIES.forEach((c) => {
      result[c.id] = TEMPLATE_LIBRARY.filter((t) => t.category === c.id).length;
    });
    return result;
  }, [saved.items]);

  const visible = useMemo(() => {
    const pool = category === 'saved'
      ? saved.items
      : (category === 'all' ? (query ? allTemplates : TEMPLATE_LIBRARY) : TEMPLATE_LIBRARY.filter((t) => t.category === category));
    return searchTemplates(pool, query);
  }, [category, query, saved.items, allTemplates]);

  const focused = byId.get(focusedId) || visible[0] || null;
  const selected = selectedIds.map((id) => byId.get(id)).filter(Boolean);

  if (!open) return null;

  const toggle = (template) => {
    setFocusedId(template.id);
    if (single) {
      setSelectedIds([template.id]);
      return;
    }
    setSelectedIds((prev) => {
      if (prev.includes(template.id)) return prev.filter((id) => id !== template.id);
      if (prev.length >= maxSelect) return prev;
      return [...prev, template.id];
    });
  };

  const confirm = (list = selected) => {
    if (list.length === 0) return;
    onConfirm(list);
  };

  const categoryButtons = [
    { id: 'all', label: 'All templates', icon: <LayoutGrid size={14} /> },
    { id: 'saved', label: 'My templates', icon: <Star size={14} /> },
    ...TEMPLATE_CATEGORIES.map((c) => ({ id: c.id, label: c.label, icon: <CategoryIcon category={c.id} size={12} className="w-5 h-5 rounded-md" /> }))
  ];

  const preview = focused && (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 sm:px-5 py-3 border-b border-slate-200 flex items-start gap-3 bg-white">
        <CategoryIcon category={focused.category} size={16} className="w-9 h-9" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 leading-snug">{focused.name}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {focused.categoryLabel} · {focused.kindLabel}
            {focused.parties?.length > 0 && ` · Signers: ${focused.parties.join(' & ')}`}
          </p>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto bg-slate-100 p-3 sm:p-4 space-y-3">
        <TemplateNotice category={focused.category} />
        <div className="bg-white border border-slate-200 rounded-md shadow-sm p-4 sm:p-6">
          <TemplateDocument content={focused.content} compact />
        </div>
      </div>
      <div className="px-4 py-2.5 border-t border-slate-200 bg-white flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500">
          {countPlaceholders(focused.content) > 0
            ? `${countPlaceholders(focused.content)} [placeholders] to fill in after adding`
            : 'Ready to use'}
        </span>
        <button
          type="button"
          onClick={() => confirm([focused])}
          className="px-3 py-1.5 bg-[#007355] hover:bg-[#005c44] text-white rounded-lg text-xs font-bold transition cursor-pointer shrink-0"
        >
          {single ? 'Use this template' : 'Add only this'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-stretch sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-picker-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-6xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden h-full sm:h-[88vh]"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-[#007355] flex items-center justify-center shrink-0">
              <FileBox size={20} />
            </span>
            <div className="min-w-0">
              <h3 id="template-picker-title" className="text-base font-extrabold text-slate-900">
                {title || (single ? 'Replace text with a template' : 'Select templates')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {single
                  ? 'The template text replaces this document\'s text. You can still edit it before sending.'
                  : 'Each template is added as a separate document. You can edit its text before sending.'}
              </p>
            </div>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates, e.g. NDA, lease, consent..."
              aria-label="Search templates"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#007355] focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <span className="text-xs text-slate-500 shrink-0">
            {visible.length} template{visible.length === 1 ? '' : 's'}
            {query && category !== 'saved' && category === 'all' ? ' across all categories' : ''}
          </span>
        </div>

        {/* Category chips (phones) */}
        <div className="md:hidden flex gap-1.5 overflow-x-auto px-4 py-2 border-b border-slate-200">
          {categoryButtons.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                category === c.id ? 'bg-[#007355] text-white border-[#007355]' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              {c.label} ({counts[c.id] ?? 0})
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 flex">
          {/* Categories (tablets and up) */}
          <nav className="hidden md:flex flex-col w-56 shrink-0 border-r border-slate-200 bg-slate-50/60 overflow-y-auto py-2" aria-label="Template categories">
            {categoryButtons.map((c, i) => (
              <React.Fragment key={c.id}>
                {i === 2 && <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Categories</p>}
                <button
                  type="button"
                  onClick={() => setCategory(c.id)}
                  aria-current={category === c.id ? 'true' : undefined}
                  className={`mx-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 text-left transition cursor-pointer ${
                    category === c.id ? 'bg-white text-[#007355] shadow-sm border border-emerald-200' : 'text-slate-600 hover:bg-white border border-transparent'
                  }`}
                >
                  <span className="shrink-0 flex items-center">{c.icon}</span>
                  <span className="flex-1 min-w-0 truncate">{c.label}</span>
                  <span className="text-[10px] text-slate-400 font-bold">{counts[c.id] ?? 0}</span>
                </button>
              </React.Fragment>
            ))}
          </nav>

          {/* Template list */}
          <div className={`flex-1 min-w-0 overflow-y-auto p-3 sm:p-4 ${showMobilePreview ? 'hidden lg:block' : ''}`}>
            {category !== 'all' && category !== 'saved' && <TemplateNotice category={category} className="mb-3" />}
            {category === 'saved' && saved.status === 'loading' && (
              <p className="text-xs text-slate-500 flex items-center gap-2 p-3"><Loader2 size={14} className="animate-spin" /> Loading your templates...</p>
            )}
            {category === 'saved' && saved.status === 'error' && (
              <p className="text-xs text-red-600 p-3">{saved.error}</p>
            )}
            {visible.length === 0 && saved.status !== 'loading' ? (
              <div className="py-16 text-center">
                <FileText size={34} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  {category === 'saved' && !query ? 'You have no saved templates yet' : 'No templates match your search'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {category === 'saved' && !query ? 'Save your own templates from the Templates page.' : 'Try another word or choose All templates.'}
                </p>
              </div>
            ) : (
              <ul className="grid grid-cols-1 2xl:grid-cols-2 gap-2">
                {visible.map((t) => {
                  const isSelected = selectedIds.includes(t.id);
                  const isFocused = focused?.id === t.id;
                  const meta = categoryMeta(t.category);
                  return (
                    <li key={t.id}>
                      <div
                        className={`group relative w-full rounded-xl border p-3 flex items-start gap-3 transition ${
                          isSelected
                            ? 'border-[#007355] bg-emerald-50/60 ring-1 ring-[#007355]'
                            : isFocused
                              ? 'border-slate-400 bg-white'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggle(t)}
                          onFocus={() => setFocusedId(t.id)}
                          aria-pressed={isSelected}
                          className="absolute inset-0 rounded-xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007355]"
                          aria-label={`${isSelected ? 'Deselect' : 'Select'} ${t.name}`}
                        />
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 w-4 h-4 ${single ? 'rounded-full' : 'rounded'} border flex items-center justify-center shrink-0 transition ${
                            isSelected ? 'bg-[#007355] border-[#007355] text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check size={11} strokeWidth={3} />}
                        </span>
                        <CategoryIcon category={t.category} size={15} className="w-8 h-8" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-bold text-slate-900 leading-snug">{t.name}</span>
                          <span className="block text-[11px] text-slate-500 mt-0.5 line-clamp-2">{t.description}</span>
                          <span className="mt-1.5 flex flex-wrap items-center gap-1">
                            <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wide ${meta.badge}`}>{t.categoryLabel}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-bold uppercase tracking-wide">{t.kindLabel}</span>
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setFocusedId(t.id);
                            setShowMobilePreview(true);
                          }}
                          className="relative lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-[#007355] hover:bg-emerald-50 shrink-0"
                          aria-label={`Preview ${t.name}`}
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Preview (large screens, or full panel on smaller screens) */}
          <aside className={`${showMobilePreview ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-[420px] xl:w-[460px] shrink-0 border-l border-slate-200 min-h-0`}>
            {showMobilePreview && (
              <button
                type="button"
                onClick={() => setShowMobilePreview(false)}
                className="lg:hidden px-4 py-2 text-xs font-bold text-[#007355] flex items-center gap-1.5 border-b border-slate-200 bg-white"
              >
                <ArrowLeft size={14} /> Back to templates
              </button>
            )}
            {preview || <p className="p-6 text-xs text-slate-400">Select a template to preview it.</p>}
          </aside>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs text-slate-600 min-w-0">
            {selected.length === 0 ? (
              <span>{single ? 'Choose the template to use.' : 'Choose one or more templates.'}</span>
            ) : (
              <span className="flex items-center gap-2 flex-wrap">
                <strong className="text-slate-900">{selected.length} selected:</strong>
                <span className="truncate max-w-[60vw] sm:max-w-md">{selected.map((t) => t.name).join(', ')}</span>
                {!single && (
                  <button type="button" onClick={() => setSelectedIds([])} className="text-[#007355] font-bold hover:underline">Clear</button>
                )}
              </span>
            )}
            {!single && selected.length >= maxSelect && (
              <span className="block text-amber-700 mt-0.5">A request can hold {maxSelect} more document{maxSelect === 1 ? '' : 's'}.</span>
            )}
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white cursor-pointer">
              Cancel
            </button>
            <button
              type="button"
              disabled={selected.length === 0}
              onClick={() => confirm()}
              className="px-4 py-2 bg-[#007355] hover:bg-[#005c44] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              {single ? 'Replace text' : `Add ${selected.length || ''} document${selected.length === 1 ? '' : 's'}`.replace('  ', ' ')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
