import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Folder, X, FileText, MoreVertical, Edit } from 'lucide-react';
import BexTableToolbar from '../components/BexTableToolbar';

const INITIAL_TEMPLATE_COLUMNS = [
  { id: 'name', label: 'Template name', required: true, visible: true },
  { id: 'forms', label: 'Active sign forms', visible: true },
  { id: 'modified', label: 'Last modified on', visible: true },
  { id: 'actions', label: 'Actions', visible: true }
];

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // BexSign Table Columns State with LocalStorage Persistence
  const [tableColumns, setTableColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('bexsign_templates_columns');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_TEMPLATE_COLUMNS;
  });

  const isColVisible = (colId) => {
    const col = tableColumns.find((c) => c.id === colId);
    return col ? col.visible !== false : false;
  };

  // BexSign Inline Column Filters State
  const [showInlineFilters, setShowInlineFilters] = useState(true);
  const [columnFilters, setColumnFilters] = useState({
    name: '',
    forms: '',
    modified: ''
  });

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/templates/1');
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setTemplates(data);
      } else if (data.templates && Array.isArray(data.templates)) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error('Failed to load templates from server');
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('templateName', templateName);
    if (file) {
      formData.append('templateFile', file);
    }
    formData.append('userId', 1);
    formData.append('activeSignForms', 1);

    try {
      const response = await fetch('http://localhost:5000/api/templates/create', {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        setIsModalOpen(false);
        setTemplateName('');
        setFile(null);
        fetchTemplates();
      } else {
        alert('Failed to create template');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    const name = (t.template_name || '').toLowerCase();
    const forms = String(t.active_sign_forms ?? 1);
    const modified = new Date(t.last_modified || t.created_at || Date.now())
      .toLocaleString()
      .toLowerCase();

    const matchName = !columnFilters.name || name.includes(columnFilters.name.toLowerCase());
    const matchForms = !columnFilters.forms || forms.includes(columnFilters.forms.toLowerCase());
    const matchModified =
      !columnFilters.modified || modified.includes(columnFilters.modified.toLowerCase());

    return matchName && matchForms && matchModified;
  });

  // Paginated slice
  const paginatedTemplates = filteredTemplates.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Multi-Selection
  const allOnPageSelected =
    paginatedTemplates.length > 0 &&
    paginatedTemplates.every((t) => selectedIds.includes(t.id));

  const handleSelectAllOnPage = (e) => {
    if (e.target.checked) {
      const ids = paginatedTemplates.map((t) => t.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...ids])));
    } else {
      const ids = new Set(paginatedTemplates.map((t) => t.id));
      setSelectedIds(selectedIds.filter((id) => !ids.has(id)));
    }
  };

  const handleToggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Delete ${selectedIds.length} selected template(s)?`)) {
      setTemplates(templates.filter((t) => !selectedIds.includes(t.id)));
      setSelectedIds([]);
    }
  };

  const clearAllFilters = () => {
    setColumnFilters({ name: '', forms: '', modified: '' });
  };

  const hasActiveFilters = Object.values(columnFilters).some((v) => v !== '');

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 min-h-[calc(100vh-7rem)] text-slate-900 font-sans space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Templates</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Only admins can access all the templates by default. To limit users' use templates, use the "Shared" option.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#007355] hover:bg-[#005c44] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={15} /> Create Template
        </button>
      </div>

      {/* BexSign Standard Table Toolbar */}
      <BexTableToolbar
        totalItems={filteredTemplates.length}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={(p) => setCurrentPage(p)}
        onPageSizeChange={(sz) => {
          setPageSize(sz);
          setCurrentPage(1);
        }}
        selectedCount={selectedIds.length}
        onBulkDelete={handleBulkDelete}
        showInlineFilters={showInlineFilters}
        onToggleInlineFilters={() => setShowInlineFilters(!showInlineFilters)}
        columns={tableColumns}
        onSaveColumns={(cols) => setTableColumns(cols)}
        storageKey="bexsign_templates_columns"
      />

      {/* Templates Table with BexSign Responsive Flow - ZERO Horizontal Scrollbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs w-full overflow-hidden min-w-0">
        <table className="w-full text-left text-xs border-collapse table-auto">
          <thead>
            {/* Header Row */}
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase select-none">
              <th className="p-2.5 w-9 text-center">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={handleSelectAllOnPage}
                  className="w-4 h-4 rounded accent-[#007355] cursor-pointer"
                  title="Select all on this page"
                />
              </th>

              {isColVisible('name') && <th className="py-2.5 px-3 w-[42%] leading-tight break-words">Template Name</th>}
              {isColVisible('forms') && <th className="py-2.5 px-3 w-[23%] leading-tight break-words">Active Sign Forms</th>}
              {isColVisible('modified') && <th className="py-2.5 px-3 w-[23%] whitespace-nowrap leading-tight">Last Modified On</th>}
              {isColVisible('actions') && <th className="py-2.5 px-3 w-[8%] text-right whitespace-nowrap">Actions</th>}
            </tr>

            {/* BexSign Inline Filter Row */}
            {showInlineFilters && (
              <tr className="bg-slate-50/70 border-b border-slate-200">
                <th className="p-2 text-center">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      title="Clear all filters"
                      className="text-slate-400 hover:text-red-500 p-0.5 rounded"
                    >
                      <X size={13} />
                    </button>
                  )}
                </th>

                {isColVisible('name') && (
                  <th className="p-2">
                    <input
                      type="text"
                      value={columnFilters.name}
                      onChange={(e) => {
                        setColumnFilters({ ...columnFilters, name: e.target.value });
                        setCurrentPage(1);
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355] shadow-2xs"
                    />
                  </th>
                )}

                {isColVisible('forms') && (
                  <th className="p-2">
                    <input
                      type="text"
                      value={columnFilters.forms}
                      onChange={(e) => {
                        setColumnFilters({ ...columnFilters, forms: e.target.value });
                        setCurrentPage(1);
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355] shadow-2xs"
                    />
                  </th>
                )}

                {isColVisible('modified') && (
                  <th className="p-2">
                    <input
                      type="text"
                      value={columnFilters.modified}
                      onChange={(e) => {
                        setColumnFilters({ ...columnFilters, modified: e.target.value });
                        setCurrentPage(1);
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355] shadow-2xs"
                    />
                  </th>
                )}

                {isColVisible('actions') && <th className="p-2" />}
              </tr>
            )}
          </thead>

          <tbody className="divide-y divide-slate-100 font-medium">
            {paginatedTemplates.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-slate-400">
                  <FileText size={36} className="mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-sm text-slate-700">No templates found</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {hasActiveFilters
                      ? 'No templates match your search criteria. Try clearing column filters.'
                      : 'Create a new template to get started.'}
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="mt-3 px-4 py-1.5 bg-[#007355] text-white rounded text-xs font-bold shadow-xs hover:bg-[#005c44]"
                    >
                      Clear Filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              paginatedTemplates.map((t) => {
                const isSelected = selectedIds.includes(t.id);
                return (
                  <tr
                    key={t.id}
                    className={`hover:bg-slate-50 transition ${
                      isSelected ? 'bg-emerald-50/40' : ''
                    }`}
                  >
                    <td className="p-3 text-center align-middle">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(t.id)}
                        className="w-4 h-4 rounded accent-[#007355] cursor-pointer"
                      />
                    </td>

                    {isColVisible('name') && (
                      <td className="py-3.5 px-4 font-bold text-slate-900 break-words leading-snug align-middle">
                        <div className="flex items-center gap-2">
                          <FileText size={15} className="text-[#007355] shrink-0" />
                          <span>{t.template_name}</span>
                        </div>
                      </td>
                    )}

                    {isColVisible('forms') && (
                      <td className="py-3.5 px-4 text-slate-600 align-middle">
                        {t.active_sign_forms ?? 1}
                      </td>
                    )}

                    {isColVisible('modified') && (
                      <td className="py-3.5 px-4 text-slate-500 text-xs font-mono whitespace-nowrap align-middle">
                        {new Date(t.last_modified || t.created_at || Date.now()).toLocaleString()}
                      </td>
                    )}

                    {isColVisible('actions') && (
                      <td className="py-3.5 px-4 text-right whitespace-nowrap align-middle">
                        <button
                          type="button"
                          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition"
                          title="Actions"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Template Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg p-6 rounded-xl shadow-xl relative border border-slate-200">
            <h3 className="text-lg font-bold mb-4 text-[#007355]">Create a Template</h3>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  required
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-1 focus:ring-[#007355] focus:outline-none text-slate-900"
                  placeholder="e.g. Standard NDA Template"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Upload Document File
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#007355] file:text-white cursor-pointer"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-xs text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#007355] text-white rounded text-xs font-bold hover:bg-[#005c44] disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
