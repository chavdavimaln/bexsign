import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Eye,
  Send,
  X,
  Trash2,
  Edit3,
  Copy,
  Sparkles,
  FileText,
  Library,
  Star,
  Layers,
  ChevronLeft,
  ChevronRight,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Share2
} from 'lucide-react';
import { getLoggedInUser } from '../utils/currentUser';
import { TEMPLATE_LIBRARY, TEMPLATE_CATEGORIES, TEMPLATE_KINDS, searchTemplates } from '../utils/templateLibrary';
import {
  API_BASE,
  CategoryIcon,
  categoryMeta,
  fetchSavedTemplates,
  countTemplateUse,
  TemplateDocument,
  TemplateNotice,
  countPlaceholders
} from '../components/templates/templateUi';

const PAGE_SIZES = [12, 24, 48];
const SORTS = {
  library: [
    ['recommended', 'Recommended'],
    ['name-asc', 'Name A-Z'],
    ['name-desc', 'Name Z-A'],
    ['category', 'Category']
  ],
  saved: [
    ['modified', 'Last modified'],
    ['name-asc', 'Name A-Z'],
    ['name-desc', 'Name Z-A'],
    ['used', 'Most used']
  ]
};

const formatDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const EMPTY_FORM = { id: null, title: '', category: 'custom', description: '', content: '', isShared: true, sourceTemplate: '', file: null };

// Page numbers with gaps: 1 ... 4 5 6 ... 12
function pageList(current, total) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap-' + p);
    out.push(p);
  });
  return out;
}

export default function Templates() {
  const navigate = useNavigate();
  const user = getLoggedInUser();
  const [tab, setTab] = useState('library');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [kind, setKind] = useState('all');
  const [sort, setSort] = useState('recommended');
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem('bexsign_templates_view') || 'grid';
    } catch (e) {
      return 'grid';
    }
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saved, setSaved] = useState({ status: 'loading', items: [], error: '' });
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [form, setForm] = useState(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const loadSaved = () => {
    setSaved((prev) => ({ ...prev, status: 'loading' }));
    fetchSavedTemplates(user?.id)
      .then((items) => setSaved({ status: 'ready', items, error: '' }))
      .catch((err) => setSaved({
        status: 'error',
        items: [],
        error: err instanceof TypeError ? 'Could not reach the BexSign server at http://localhost:5000.' : err.message
      }));
  };

  useEffect(() => {
    loadSaved();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('bexsign_templates_view', view);
    } catch (e) {}
  }, [view]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const switchTab = (next) => {
    setTab(next);
    setSort(next === 'library' ? 'recommended' : 'modified');
    setCategory('all');
    setKind('all');
    setPage(1);
    setSelectedIds([]);
  };

  const pool = tab === 'library' ? TEMPLATE_LIBRARY : saved.items;

  const categoryCounts = useMemo(() => {
    const counts = { all: pool.length };
    pool.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, [pool]);

  const filtered = useMemo(() => {
    // Best search matches first when sorted by relevance
    const list = searchTemplates(pool.filter((t) => (category === 'all' || t.category === category)
      && (kind === 'all' || t.kind === kind)), query);
    const byName = (a, b) => a.name.localeCompare(b.name);
    switch (sort) {
      case 'name-asc':
        return [...list].sort(byName);
      case 'name-desc':
        return [...list].sort((a, b) => byName(b, a));
      case 'category':
        return [...list].sort((a, b) => a.categoryLabel.localeCompare(b.categoryLabel) || byName(a, b));
      case 'used':
        return [...list].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0) || byName(a, b));
      case 'modified':
        return [...list].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      default:
        return list;
    }
  }, [pool, category, kind, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const allOnPageSelected = pageItems.length > 0 && pageItems.every((t) => selectedIds.includes(t.id));
  const selectedTemplates = selectedIds.map((sid) => pool.find((t) => t.id === sid)).filter(Boolean);
  const hasFilters = Boolean(query) || category !== 'all' || kind !== 'all';

  const toggleSelect = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const togglePage = () => {
    const ids = pageItems.map((t) => t.id);
    setSelectedIds((prev) => (allOnPageSelected ? prev.filter((x) => !ids.includes(x)) : [...new Set([...prev, ...ids])]));
  };
  const clearFilters = () => {
    setQuery('');
    setCategory('all');
    setKind('all');
    setPage(1);
  };

  // Starts a new request with the templates as editable documents
  const startWithTemplates = (templates) => {
    if (!templates.length) return;
    templates.forEach(countTemplateUse);
    navigate('/send-for-signatures', {
      state: {
        templates: templates.map((t) => ({ id: t.id, name: t.name, content: t.content, filePath: t.filePath || null, category: t.category }))
      }
    });
  };

  const openCreate = (prefill = {}) => {
    setFormError('');
    setForm({ ...EMPTY_FORM, ...prefill });
  };

  const openCustomize = (template) => {
    openCreate({
      title: `${template.name} (Custom)`,
      category: template.source === 'library' ? template.category : (template.category || 'custom'),
      description: template.description,
      content: template.content,
      sourceTemplate: template.source === 'library' ? template.id : (template.sourceTemplate || '')
    });
    setPreviewTemplate(null);
  };

  const openEdit = (template) => {
    setFormError('');
    setForm({
      id: template.dbId,
      title: template.name,
      category: template.category,
      description: template.source === 'saved' && template.description !== 'Saved template' ? template.description : '',
      content: template.content,
      isShared: template.isShared,
      sourceTemplate: template.sourceTemplate || '',
      file: null,
      hasFile: Boolean(template.filePath)
    });
    setPreviewTemplate(null);
  };

  const saveForm = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError('Enter a template name.');
      return;
    }
    if (!form.content.trim() && !form.file && !form.hasFile) {
      setFormError('Write the template text or upload a file.');
      return;
    }
    setFormBusy(true);
    setFormError('');
    try {
      let res;
      if (form.id) {
        res = await fetch(`${API_BASE}/templates/${form.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, userId: user?.id })
        });
      } else {
        const body = new FormData();
        body.append('title', form.title.trim());
        body.append('category', form.category);
        body.append('description', form.description.trim());
        body.append('content', form.content);
        body.append('isShared', form.isShared ? 'true' : 'false');
        body.append('userId', user?.id || 1);
        if (form.sourceTemplate) body.append('sourceTemplate', form.sourceTemplate);
        if (form.file) body.append('templateFile', form.file);
        res = await fetch(`${API_BASE}/templates/create`, { method: 'POST', body });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.error || `The template could not be saved (HTTP ${res.status}).`);
      setForm(null);
      setToast({ type: 'success', text: data.message || 'Template saved.' });
      if (tab !== 'saved') switchTab('saved');
      loadSaved();
    } catch (err) {
      setFormError(err instanceof TypeError ? 'Could not reach the BexSign server at http://localhost:5000.' : err.message);
    } finally {
      setFormBusy(false);
    }
  };

  const deleteTemplates = async (templates) => {
    const ids = templates.map((t) => t.dbId).filter(Boolean);
    try {
      const res = await fetch(`${API_BASE}/templates/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, userId: user?.id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.error || 'The templates could not be deleted.');
      const skipped = data.skipped?.length || 0;
      setToast({
        type: skipped ? 'error' : 'success',
        text: skipped ? `${data.message} ${skipped} could not be deleted: only their owner or a manager can delete them.` : data.message
      });
      setSelectedIds((prev) => prev.filter((sid) => !templates.some((t) => t.id === sid)));
      loadSaved();
    } catch (err) {
      setToast({ type: 'error', text: err instanceof TypeError ? 'Could not reach the BexSign server.' : err.message });
    } finally {
      setConfirmDelete(null);
    }
  };

  const tabButton = (id, label, count, Icon) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => switchTab(id)}
      className={`px-3 sm:px-4 py-2.5 text-sm font-bold flex items-center gap-2 whitespace-nowrap border-b-2 -mb-px transition cursor-pointer ${
        tab === id ? 'border-[#007355] text-[#007355]' : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      <Icon size={16} />
      <span>{label}</span>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === id ? 'bg-emerald-100 text-[#007355]' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
    </button>
  );

  const actionButtons = (t, size = 'md') => (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setPreviewTemplate(t)}
        className={`${size === 'sm' ? 'p-1.5' : 'px-2.5 py-1.5'} border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer`}
        title="Preview"
        aria-label={`Preview ${t.name}`}
      >
        <Eye size={14} />
        {size !== 'sm' && <span>Preview</span>}
      </button>
      <button
        type="button"
        onClick={() => startWithTemplates([t])}
        className={`${size === 'sm' ? 'p-1.5' : 'px-2.5 py-1.5'} bg-[#007355] hover:bg-[#005c44] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer`}
        title="Use in a new request"
        aria-label={`Use ${t.name}`}
      >
        <Send size={13} />
        {size !== 'sm' && <span>Use</span>}
      </button>
      {t.source === 'saved' ? (
        <>
          <button type="button" onClick={() => openEdit(t)} className="p-1.5 text-slate-500 hover:text-[#007355] hover:bg-emerald-50 rounded-lg transition cursor-pointer" title="Edit" aria-label={`Edit ${t.name}`}>
            <Edit3 size={14} />
          </button>
          <button type="button" onClick={() => openCustomize(t)} className="p-1.5 text-slate-500 hover:text-[#007355] hover:bg-emerald-50 rounded-lg transition cursor-pointer" title="Duplicate" aria-label={`Duplicate ${t.name}`}>
            <Copy size={14} />
          </button>
          <button type="button" onClick={() => setConfirmDelete([t])} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer" title="Delete" aria-label={`Delete ${t.name}`}>
            <Trash2 size={14} />
          </button>
        </>
      ) : (
        <button type="button" onClick={() => openCustomize(t)} className="p-1.5 text-slate-500 hover:text-[#007355] hover:bg-emerald-50 rounded-lg transition cursor-pointer" title="Customize and save as my template" aria-label={`Customize ${t.name}`}>
          <Sparkles size={14} />
        </button>
      )}
    </div>
  );

  const categoryChips = [{ id: 'all', label: 'All' }, ...TEMPLATE_CATEGORIES, ...(tab === 'saved' && categoryCounts.custom ? [{ id: 'custom', label: 'Other' }] : [])]
    .filter((c) => c.id === 'all' || categoryCounts[c.id]);

  return (
    <div className="space-y-5 pb-10 font-sans text-slate-900">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#007355]">Templates</p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-1">Start every document from a template</h1>
            <p className="text-sm text-slate-600 mt-2">
              Choose from {TEMPLATE_LIBRARY.length} ready-made agreements, forms and consents, or save your own. The text of every
              template can be edited before it is sent for signature.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openCreate()}
              className="bg-[#007355] hover:bg-[#005c44] text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} /> Create template
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5 max-w-xl">
          {[
            { label: 'Library templates', value: TEMPLATE_LIBRARY.length, icon: Library },
            { label: 'My templates', value: saved.status === 'loading' ? '…' : saved.items.length, icon: Star },
            { label: 'Categories', value: TEMPLATE_CATEGORIES.length, icon: Layers }
          ].map((stat) => (
            <div key={stat.label} className="bg-white/80 border border-slate-200 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 text-[#007355] flex items-center justify-center shrink-0">
                <stat.icon size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-black leading-none">{stat.value}</span>
                <span className="block text-[10px] sm:text-[11px] text-slate-500 leading-tight">{stat.label}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        {/* Tabs */}
        <div role="tablist" aria-label="Template sources" className="flex border-b border-slate-200 px-2 sm:px-4 overflow-x-auto">
          {tabButton('library', 'Template library', TEMPLATE_LIBRARY.length, Library)}
          {tabButton('saved', 'My templates', saved.items.length, Star)}
        </div>

        {/* Toolbar */}
        <div className="p-3 sm:p-4 space-y-3 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={tab === 'library' ? 'Search 100 templates, e.g. lease, NDA, consent...' : 'Search my templates...'}
                aria-label="Search templates"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#007355] focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2">
              {tab === 'library' && (
                <select
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Template type"
                  className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white text-slate-700 cursor-pointer"
                >
                  <option value="all">All types</option>
                  {Object.entries(TEMPLATE_KINDS).map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              )}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort templates"
                className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white text-slate-700 cursor-pointer"
              >
                {SORTS[tab].map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
              <div className="col-span-2 sm:col-span-1 flex border border-slate-300 rounded-xl overflow-hidden" role="group" aria-label="View">
                {[['grid', LayoutGrid, 'Grid view'], ['list', List, 'List view']].map(([id, Icon, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setView(id)}
                    aria-pressed={view === id}
                    title={label}
                    className={`flex-1 px-3 py-2 flex items-center justify-center gap-1.5 text-xs font-semibold transition cursor-pointer ${view === id ? 'bg-[#007355] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    <Icon size={14} />
                    <span className="sm:hidden">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Categories */}
          {categoryChips.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" aria-label="Filter by category">
              {categoryChips.map((c) => {
                const active = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCategory(c.id);
                      setPage(1);
                    }}
                    aria-pressed={active}
                    className={`shrink-0 pl-1.5 pr-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                      active ? 'bg-[#007355] border-[#007355] text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {c.id === 'all' ? (
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center ${active ? 'bg-white/20' : 'bg-slate-100'}`}><LayoutGrid size={11} /></span>
                    ) : (
                      <CategoryIcon category={c.id} size={11} className="w-5 h-5 rounded-full" />
                    )}
                    <span>{c.label}</span>
                    <span className={`text-[10px] ${active ? 'text-emerald-100' : 'text-slate-400'}`}>{categoryCounts[c.id] || 0}</span>
                  </button>
                );
              })}
            </div>
          )}
          {category !== 'all' && <TemplateNotice category={category} />}
        </div>

        {/* Selection bar */}
        {selectedTemplates.length > 0 && (
          <div className="px-3 sm:px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-xs text-emerald-900 font-semibold">
              {selectedTemplates.length} template{selectedTemplates.length === 1 ? '' : 's'} selected
              <button type="button" onClick={() => setSelectedIds([])} className="ml-2 text-[#007355] font-bold hover:underline">Clear</button>
            </p>
            <div className="flex items-center gap-2">
              {tab === 'saved' && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(selectedTemplates)}
                  className="px-3 py-1.5 border border-red-200 bg-white text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={13} /> Delete
                </button>
              )}
              <button
                type="button"
                onClick={() => startWithTemplates(selectedTemplates.slice(0, 40))}
                className="px-3 py-1.5 bg-[#007355] hover:bg-[#005c44] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Send size={13} /> Use {selectedTemplates.length} in one request
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="p-3 sm:p-4">
          {tab === 'saved' && saved.status === 'loading' ? (
            <p className="py-16 text-center text-sm text-slate-500 flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading your templates...</p>
          ) : tab === 'saved' && saved.status === 'error' ? (
            <div className="py-16 text-center">
              <AlertCircle size={32} className="mx-auto text-red-400 mb-2" />
              <p className="text-sm font-semibold text-slate-800">Your templates could not be loaded</p>
              <p className="text-xs text-slate-500 mt-1">{saved.error}</p>
              <button type="button" onClick={loadSaved} className="mt-3 px-4 py-1.5 bg-[#007355] text-white rounded-lg text-xs font-bold">Try again</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <span className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <FileText size={26} />
              </span>
              <p className="text-sm font-bold text-slate-800">
                {hasFilters ? 'No templates match your filters' : 'You have not saved any templates yet'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {hasFilters
                  ? 'Try a different word or clear the filters.'
                  : 'Create a template from scratch, or customize one from the library and save it here.'}
              </p>
              <div className="mt-4 flex justify-center gap-2">
                {hasFilters ? (
                  <button type="button" onClick={clearFilters} className="px-4 py-2 bg-[#007355] text-white rounded-lg text-xs font-bold">Clear filters</button>
                ) : (
                  <>
                    <button type="button" onClick={() => openCreate()} className="px-4 py-2 bg-[#007355] text-white rounded-lg text-xs font-bold flex items-center gap-1.5"><Plus size={14} /> Create template</button>
                    <button type="button" onClick={() => switchTab('library')} className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700">Browse the library</button>
                  </>
                )}
              </div>
            </div>
          ) : view === 'grid' ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
              {pageItems.map((t) => {
                const isSelected = selectedIds.includes(t.id);
                const meta = categoryMeta(t.category);
                return (
                  <li key={t.id}>
                    <article
                      className={`group h-full bg-white border rounded-2xl p-4 flex flex-col transition hover:shadow-lg hover:-translate-y-0.5 ${
                        isSelected ? 'border-[#007355] ring-2 ring-emerald-100' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(t.id)}
                            aria-label={`Select ${t.name}`}
                            className="w-4 h-4 rounded accent-[#007355] cursor-pointer shrink-0"
                          />
                          <CategoryIcon category={t.category} size={17} className="w-9 h-9 rounded-xl" />
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wide shrink-0">{t.kindLabel}</span>
                      </div>
                      <button type="button" onClick={() => setPreviewTemplate(t)} className="text-left mt-3 cursor-pointer">
                        <h3 className="text-sm font-extrabold text-slate-900 leading-snug group-hover:text-[#007355] transition">{t.name}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>
                      </button>
                      {/* Page preview */}
                      <button
                        type="button"
                        onClick={() => setPreviewTemplate(t)}
                        className="mt-3 mb-3 relative h-24 rounded-lg border border-slate-200 bg-slate-50 px-3 pt-2 overflow-hidden text-left cursor-pointer"
                        aria-label={`Preview ${t.name}`}
                      >
                        <p className="text-[7px] font-black text-slate-700 text-center truncate">{(t.content.split('\n')[0] || t.name).slice(0, 60)}</p>
                        <p className="text-[6.5px] leading-[9px] text-slate-500 mt-1 whitespace-pre-line">{t.content.split('\n').slice(1, 12).join('\n') || 'Uploaded template file'}</p>
                        <span className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-50 to-transparent" />
                      </button>
                      <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold truncate ${meta.badge}`} title={t.categoryLabel}>
                          {t.source === 'saved' ? (t.category === 'custom' ? 'My template' : t.categoryLabel) : t.categoryLabel}
                        </span>
                        {actionButtons(t, 'sm')}
                      </div>
                      {t.source === 'saved' && (
                        <p className="mt-2 text-[10px] text-slate-400 flex items-center gap-1.5">
                          {t.isShared && <Share2 size={10} />}
                          Updated {formatDate(t.updatedAt)} · Used {t.usageCount} time{t.usageCount === 1 ? '' : 's'}
                          {t.ownerName && ` · ${t.ownerName}`}
                        </p>
                      )}
                    </article>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wide">
                  <tr>
                    <th className="p-3 w-10">
                      <input type="checkbox" checked={allOnPageSelected} onChange={togglePage} aria-label="Select all on this page" className="w-4 h-4 rounded accent-[#007355] cursor-pointer" />
                    </th>
                    <th className="p-3">Template</th>
                    <th className="p-3 hidden md:table-cell">Category</th>
                    <th className="p-3 hidden sm:table-cell">Type</th>
                    {tab === 'saved' && <th className="p-3 hidden lg:table-cell">Last modified</th>}
                    {tab === 'saved' && <th className="p-3 hidden lg:table-cell">Used</th>}
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.map((t) => {
                    const isSelected = selectedIds.includes(t.id);
                    const meta = categoryMeta(t.category);
                    return (
                      <tr key={t.id} className={`hover:bg-slate-50 transition ${isSelected ? 'bg-emerald-50/50' : ''}`}>
                        <td className="p-3 align-middle">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(t.id)} aria-label={`Select ${t.name}`} className="w-4 h-4 rounded accent-[#007355] cursor-pointer" />
                        </td>
                        <td className="p-3 align-middle">
                          <button type="button" onClick={() => setPreviewTemplate(t)} className="flex items-center gap-2.5 text-left cursor-pointer">
                            <CategoryIcon category={t.category} size={14} className="w-8 h-8" />
                            <span className="min-w-0">
                              <span className="block font-bold text-slate-900 hover:text-[#007355]">{t.name}</span>
                              <span className="block text-[11px] text-slate-500 line-clamp-1">{t.description}</span>
                            </span>
                          </button>
                        </td>
                        <td className="p-3 hidden md:table-cell align-middle">
                          <span className={`px-2 py-0.5 rounded border text-[10px] font-bold whitespace-nowrap ${meta.badge}`}>{t.category === 'custom' ? 'My template' : t.categoryLabel}</span>
                        </td>
                        <td className="p-3 hidden sm:table-cell align-middle text-slate-600">{t.kindLabel}</td>
                        {tab === 'saved' && <td className="p-3 hidden lg:table-cell align-middle text-slate-500 whitespace-nowrap">{formatDate(t.updatedAt)}</td>}
                        {tab === 'saved' && <td className="p-3 hidden lg:table-cell align-middle text-slate-500">{t.usageCount}</td>}
                        <td className="p-3 align-middle">
                          <div className="flex justify-end">{actionButtons(t, 'sm')}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="px-3 sm:px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-3 flex-wrap">
              <span>
                Showing <strong>{(currentPage - 1) * pageSize + 1}</strong>-<strong>{Math.min(currentPage * pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong>
              </span>
              {view === 'grid' && (
                <button type="button" onClick={togglePage} className="text-[#007355] font-bold hover:underline">
                  {allOnPageSelected ? 'Deselect this page' : 'Select this page'}
                </button>
              )}
              <label className="flex items-center gap-1.5">
                <span>Per page</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 border border-slate-300 rounded-lg bg-white cursor-pointer"
                >
                  {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>
            <nav className="flex items-center gap-1" aria-label="Pagination">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft size={15} />
              </button>
              {pageList(currentPage, totalPages).map((p) => (typeof p === 'string' ? (
                <span key={p} className="px-1 text-slate-400">…</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  aria-current={p === currentPage ? 'page' : undefined}
                  className={`min-w-8 h-8 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${p === currentPage ? 'bg-[#007355] text-white' : 'border border-slate-200 hover:bg-slate-50'}`}
                >
                  {p}
                </button>
              )))}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight size={15} />
              </button>
            </nav>
          </div>
        )}
      </section>

      {/* Preview */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-stretch sm:items-center justify-center sm:p-4" onClick={() => setPreviewTemplate(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="template-preview-title" onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-4xl sm:rounded-2xl shadow-2xl flex flex-col h-full sm:h-[90vh] overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <CategoryIcon category={previewTemplate.category} size={18} className="w-10 h-10 rounded-xl" />
                <div className="min-w-0">
                  <h2 id="template-preview-title" className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">{previewTemplate.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {previewTemplate.category === 'custom' ? 'My template' : previewTemplate.categoryLabel} · {previewTemplate.kindLabel}
                    {previewTemplate.parties?.length > 0 && ` · Signers: ${previewTemplate.parties.join(' & ')}`}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setPreviewTemplate(null)} aria-label="Close preview" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-100 p-3 sm:p-6 space-y-3">
              <TemplateNotice category={previewTemplate.category} className="max-w-3xl mx-auto" />
              {countPlaceholders(previewTemplate.content) > 0 && (
                <p className="max-w-3xl mx-auto text-[11px] text-slate-600">
                  <mark className="bg-amber-100 text-amber-900 rounded px-1">[Highlighted]</mark> text marks the {countPlaceholders(previewTemplate.content)} placeholders you fill in before sending.
                </p>
              )}
              <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-md shadow-sm px-5 py-6 sm:px-12 sm:py-10">
                <TemplateDocument content={previewTemplate.content} />
                {previewTemplate.filePath && (
                  <a href={`http://localhost:5000${previewTemplate.filePath}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#007355] hover:underline">
                    <FileText size={14} /> Open the uploaded file
                  </a>
                )}
              </div>
            </div>
            <div className="px-4 sm:px-6 py-3 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2">
              <button type="button" onClick={() => setPreviewTemplate(null)} className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50">
                Close
              </button>
              <div className="flex flex-col sm:flex-row gap-2">
                {previewTemplate.source === 'saved' ? (
                  <button type="button" onClick={() => openEdit(previewTemplate)} className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5">
                    <Edit3 size={14} /> Edit template
                  </button>
                ) : (
                  <button type="button" onClick={() => openCustomize(previewTemplate)} className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5">
                    <Sparkles size={14} /> Customize and save as mine
                  </button>
                )}
                <button type="button" onClick={() => startWithTemplates([previewTemplate])} className="px-4 py-2 bg-[#007355] hover:bg-[#005c44] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5">
                  <Send size={14} /> Use this template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / edit */}
      {form && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-stretch sm:items-center justify-center sm:p-4">
          <form onSubmit={saveForm} role="dialog" aria-modal="true" aria-labelledby="template-form-title" className="bg-white w-full max-w-3xl sm:rounded-2xl shadow-2xl flex flex-col h-full sm:max-h-[92vh] overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
              <div>
                <h2 id="template-form-title" className="text-base font-extrabold text-slate-900">{form.id ? 'Edit template' : 'Create template'}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Use [square brackets] for details the sender fills in, for example [Client Name].</p>
              </div>
              <button type="button" onClick={() => setForm(null)} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 text-xs">
              {formError && (
                <p role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold">
                  <AlertCircle size={15} className="shrink-0" /> {formError}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block font-bold text-slate-700 mb-1">Template name <span className="text-red-500">*</span></span>
                  <input
                    type="text"
                    value={form.title}
                    maxLength={150}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Standard NDA for partners"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#007355] focus:ring-2 focus:ring-emerald-100"
                    autoFocus
                  />
                </label>
                <label className="block">
                  <span className="block font-bold text-slate-700 mb-1">Category</span>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white cursor-pointer"
                  >
                    <option value="custom">Other</option>
                    {TEMPLATE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">Description</span>
                <input
                  type="text"
                  value={form.description}
                  maxLength={255}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What is this template for?"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#007355] focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              {!form.id && (
                <label className="block">
                  <span className="block font-bold text-slate-700 mb-1">Start from a library template (optional)</span>
                  <select
                    value={form.sourceTemplate}
                    onChange={(e) => {
                      const source = TEMPLATE_LIBRARY.find((t) => t.id === e.target.value);
                      setForm({
                        ...form,
                        sourceTemplate: e.target.value,
                        ...(source ? {
                          content: source.content,
                          category: source.category,
                          title: form.title || `${source.name} (Custom)`,
                          description: form.description || source.description
                        } : {})
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white cursor-pointer"
                  >
                    <option value="">Blank template</option>
                    {TEMPLATE_CATEGORIES.map((c) => (
                      <optgroup key={c.id} label={`${c.letter}. ${c.label}`}>
                        {TEMPLATE_LIBRARY.filter((t) => t.category === c.id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </label>
              )}
              <label className="block">
                <span className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-700">Template text</span>
                  <span className="text-[10px] text-slate-400">
                    {countPlaceholders(form.content)} placeholder{countPlaceholders(form.content) === 1 ? '' : 's'} · {form.content.length} characters
                  </span>
                </span>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={14}
                  placeholder={'AGREEMENT TITLE\n\nThis Agreement is made on [Date] between [Company Name] and [Client Name].\n\n1. SCOPE\n[Describe the scope].'}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg font-mono text-[11px] leading-relaxed focus:outline-none focus:border-[#007355] focus:ring-2 focus:ring-emerald-100 resize-y"
                />
                <span className="block text-[10px] text-slate-400 mt-1">Blank lines separate paragraphs. Lines like "1. HEADING" in capitals are shown as headings.</span>
              </label>
              {!form.id && (
                <label className="block">
                  <span className="block font-bold text-slate-700 mb-1">Attach a file (optional)</span>
                  <span className="flex items-center gap-3 p-3 border border-dashed border-slate-300 rounded-lg bg-slate-50">
                    <Upload size={16} className="text-slate-400 shrink-0" />
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.rtf,.png,.jpg,.jpeg"
                      onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
                      className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#007355] file:text-white cursor-pointer min-w-0"
                    />
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-1">PDF, Word, text or image, up to 25 MB. A .txt file becomes the template text.</span>
                </label>
              )}
              {form.id && form.hasFile && <p className="text-[11px] text-slate-500">This template also has an uploaded file.</p>}
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isShared} onChange={(e) => setForm({ ...form, isShared: e.target.checked })} className="mt-0.5 w-4 h-4 accent-[#007355]" />
                <span>
                  <span className="font-bold text-slate-700">Share with my team</span>
                  <span className="block text-[11px] text-slate-500">Everyone in the organization can use shared templates. Managers can see all templates.</span>
                </span>
              </label>
              <TemplateNotice category={form.category} />
            </div>
            <div className="px-4 sm:px-6 py-3 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
              <button type="button" onClick={() => setForm(null)} className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={formBusy} className="px-5 py-2 bg-[#007355] hover:bg-[#005c44] disabled:opacity-60 text-white rounded-lg text-xs font-bold flex items-center gap-1.5">
                {formBusy && <Loader2 size={14} className="animate-spin" />}
                {form.id ? 'Save changes' : 'Save template'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-template-title" onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-3">
            <h2 id="delete-template-title" className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Trash2 size={16} className="text-red-600" />
              Delete {confirmDelete.length === 1 ? 'template' : `${confirmDelete.length} templates`}?
            </h2>
            <p className="text-xs text-slate-600">
              {confirmDelete.length === 1 ? `"${confirmDelete[0].name}"` : 'The selected templates'} will be removed for everyone. Documents already created from {confirmDelete.length === 1 ? 'it' : 'them'} are not affected.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setConfirmDelete(null)} className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700">Cancel</button>
              <button type="button" onClick={() => deleteTemplates(confirmDelete)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div role="status" className={`fixed bottom-5 right-5 left-5 sm:left-auto z-50 max-w-sm px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-start gap-2 ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle size={16} className="shrink-0" /> : <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
