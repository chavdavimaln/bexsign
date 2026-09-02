import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Columns3,
  SlidersHorizontal,
  Trash2,
  Folder,
  Search,
  Check,
  X
} from 'lucide-react';

/**
 * BexTableToolbar - Authentic BexSign Table Header Toolbar & Column Customizer
 * 
 * Features:
 * - Left: "View X - Y of Z", "Show [ N v ]", Bulk Trash, Bulk Folder
 * - Right: Pagination (<< < [page] > >>), Filter Funnel Toggle, Column Customizer Toggle
 * - Floating Column Customizer Popup Modal matching BexSign specification
 */
export default function BexTableToolbar({
  totalItems = 0,
  currentPage = 1,
  pageSize = 25,
  onPageChange,
  onPageSizeChange,
  selectedCount = 0,
  onBulkDelete,
  onBulkMoveFolder,
  showInlineFilters = true,
  onToggleInlineFilters,
  columns = [],
  onSaveColumns,
  storageKey = 'bexsign_table_columns'
}) {
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [customizerSearch, setCustomizerSearch] = useState('');
  const [tempColumns, setTempColumns] = useState([]);
  const customizerRef = useRef(null);

  // Initialize tempColumns whenever columns change
  useEffect(() => {
    setTempColumns(columns);
  }, [columns]);

  // Close customizer popup on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (customizerRef.current && !customizerRef.current.contains(e.target)) {
        setShowCustomizer(false);
      }
    }
    if (showCustomizer) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCustomizer]);

  // Calculate View X - Y of Z
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const handleToggleColumn = (colId) => {
    setTempColumns(prev =>
      prev.map(c => {
        if (c.id === colId) {
          // Prevent unchecking required columns
          if (c.required) return c;
          return { ...c, visible: !c.visible };
        }
        return c;
      })
    );
  };

  const handleSelectAllCustomizer = (val) => {
    setTempColumns(prev =>
      prev.map(c => (c.required ? c : { ...c, visible: val }))
    );
  };

  const handleSaveCustomizer = () => {
    if (onSaveColumns) {
      onSaveColumns(tempColumns);
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(tempColumns));
    } catch (e) {
      console.warn('Failed to save columns to localStorage:', e);
    }
    setShowCustomizer(false);
  };

  const filteredTempColumns = tempColumns.filter(c =>
    c.label.toLowerCase().includes(customizerSearch.toLowerCase())
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2 px-1 text-xs text-slate-600 select-none">
      {/* Left Section: View Range, Show Page Size, Bulk Actions */}
      <div className="flex items-center gap-3">
        {/* Record Range Counter */}
        <span className="font-semibold text-slate-700 whitespace-nowrap">
          View <span className="font-bold text-slate-900">{startItem} - {endItem}</span> of <span className="font-bold text-slate-900">{totalItems}</span>
        </span>

        {/* Rows Per Page Dropdown */}
        <div className="flex items-center gap-1.5 border border-slate-300 rounded px-2 py-1 bg-white shadow-2xs">
          <span className="text-slate-500 font-medium">Show</span>
          <select
            value={pageSize}
            onChange={(e) => {
              if (onPageSizeChange) onPageSizeChange(Number(e.target.value));
            }}
            className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer pr-1"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* Bulk Actions (Visible when items selected) */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300 animate-in fade-in">
            <button
              type="button"
              onClick={onBulkDelete}
              title={`Delete ${selectedCount} selected items`}
              className="p-1 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer flex items-center gap-1 font-bold text-[11px]"
            >
              <Trash2 size={14} />
              <span>({selectedCount})</span>
            </button>
            {onBulkMoveFolder && (
              <button
                type="button"
                onClick={onBulkMoveFolder}
                title="Move selected to folder"
                className="p-1 text-slate-600 hover:text-[#007355] hover:bg-emerald-50 rounded transition cursor-pointer"
              >
                <Folder size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right Section: Pagination, Filter Toggle, Column Customizer */}
      <div className="flex items-center gap-2">
        {/* Authentic Pagination: << < [page] > >> */}
        <div className="flex items-center border border-slate-300 rounded overflow-hidden bg-white shadow-2xs">
          <button
            type="button"
            onClick={() => onPageChange && onPageChange(1)}
            disabled={currentPage <= 1}
            title="First page"
            className="px-2 py-1 text-slate-600 hover:bg-slate-50 disabled:text-slate-300 disabled:hover:bg-white transition border-r border-slate-200"
          >
            <ChevronsLeft size={13} />
          </button>
          <button
            type="button"
            onClick={() => onPageChange && onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            title="Previous page"
            className="px-2 py-1 text-slate-600 hover:bg-slate-50 disabled:text-slate-300 disabled:hover:bg-white transition border-r border-slate-200"
          >
            <ChevronLeft size={13} />
          </button>

          {/* Page Display */}
          <div className="px-2.5 py-1 text-[11px] font-mono font-bold text-slate-800 bg-slate-50">
            {currentPage} / {totalPages}
          </div>

          <button
            type="button"
            onClick={() => onPageChange && onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            title="Next page"
            className="px-2 py-1 text-slate-600 hover:bg-slate-50 disabled:text-slate-300 disabled:hover:bg-white transition border-l border-slate-200"
          >
            <ChevronRight size={13} />
          </button>
          <button
            type="button"
            onClick={() => onPageChange && onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            title="Last page"
            className="px-2 py-1 text-slate-600 hover:bg-slate-50 disabled:text-slate-300 disabled:hover:bg-white transition border-l border-slate-200"
          >
            <ChevronsRight size={13} />
          </button>
        </div>

        {/* Filter Funnel Toggle Icon (Green active state) */}
        <button
          type="button"
          onClick={onToggleInlineFilters}
          title={showInlineFilters ? 'Hide column filters' : 'Show column filters'}
          className={`p-1.5 border rounded shadow-2xs transition cursor-pointer ${
            showInlineFilters
              ? 'border-[#007355] bg-emerald-50 text-[#007355]'
              : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Filter size={15} className={showInlineFilters ? 'stroke-[2.2]' : ''} />
        </button>

        {/* Column Customizer Toggle Icon */}
        <div className="relative" ref={customizerRef}>
          <button
            type="button"
            onClick={() => setShowCustomizer(!showCustomizer)}
            title="Customize table columns"
            className={`p-1.5 border rounded shadow-2xs transition cursor-pointer ${
              showCustomizer
                ? 'border-[#007355] bg-emerald-50 text-[#007355]'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Columns3 size={15} />
          </button>

          {/* Column Customizer Popup Modal */}
          {showCustomizer && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 p-3 space-y-3 font-sans text-xs text-slate-800 animate-in fade-in zoom-in-95">
              {/* Search Box */}
              <div className="relative border border-slate-300 rounded-lg bg-slate-50/50 flex items-center px-2 py-1.5 focus-within:border-[#007355] focus-within:bg-white transition">
                <Search size={14} className="text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={customizerSearch}
                  onChange={(e) => setCustomizerSearch(e.target.value)}
                  placeholder="Search fields..."
                  className="w-full bg-transparent outline-none text-xs text-slate-800 placeholder-slate-400"
                />
                {customizerSearch && (
                  <button
                    type="button"
                    onClick={() => setCustomizerSearch('')}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Select All / Deselect All Options */}
              <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                <span>Select Columns</span>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAllCustomizer(true)}
                    className="text-[#007355] hover:underline"
                  >
                    All
                  </button>
                  <span>|</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAllCustomizer(false)}
                    className="text-slate-400 hover:text-slate-600 hover:underline"
                  >
                    None
                  </button>
                </div>
              </div>

              {/* Checkboxes List */}
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {filteredTempColumns.map((col) => (
                  <label
                    key={col.id}
                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition cursor-pointer ${
                      col.visible ? 'bg-slate-50 hover:bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={col.visible}
                      disabled={col.required}
                      onChange={() => handleToggleColumn(col.id)}
                      className="w-4 h-4 rounded accent-[#007355] cursor-pointer disabled:opacity-50"
                    />
                    <span className="flex-1 font-medium text-slate-700">
                      {col.label}
                    </span>
                    {col.required && (
                      <span className="text-red-500 font-bold text-xs" title="Required Column">*</span>
                    )}
                  </label>
                ))}
              </div>

              {/* Footer Actions: Close & Save */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCustomizer(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-600 hover:bg-slate-50 font-semibold transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomizer}
                  className="px-4 py-1.5 bg-[#007355] text-white rounded font-bold hover:bg-[#005c44] transition shadow-xs flex items-center gap-1.5"
                >
                  <Check size={13} />
                  <span>Save</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
