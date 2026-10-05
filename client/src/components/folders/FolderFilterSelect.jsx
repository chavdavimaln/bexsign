import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Folder, FolderOpen, FolderX, ChevronDown, Check, Search, X } from 'lucide-react';

/**
 * Folder filter of the documents list: a button showing the chosen folder and a menu with every folder, its
 * colour and how many documents it holds.
 *
 *   value      '' (all folders) | NO_FOLDER (documents without a folder) | a folder id
 *   folders    [{ id, name, color }]
 *   counts     { [folderId]: number, [NO_FOLDER]: number, all: number } documents per folder in the current view
 *   onChange   (value) => void
 *
 * The menu is drawn on top of the page (not inside the table), so a scrolling or clipped table never cuts it off.
 */
export const NO_FOLDER = 'none';
const MENU_WIDTH = 264;
const SEARCH_FROM = 7; // the search box appears once there are this many folders

export default function FolderFilterSelect({ value = '', folders = [], counts = {}, onChange, className = '', align = 'left' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  const selected = folders.find((f) => String(f.id) === String(value)) || null;
  const isNone = value === NO_FOLDER;
  // A folder id that no longer exists (deleted, or a stale link) still shows that a filter is on
  const label = selected ? selected.name : isNone ? 'General (no folder)' : value ? 'Unknown folder' : 'All folders';
  const active = Boolean(value);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? folders.filter((f) => String(f.name).toLowerCase().includes(q)) : folders;
  }, [folders, query]);

  const place = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(MENU_WIDTH, window.innerWidth - 16);
    const wanted = align === 'right' ? rect.right - width : rect.left;
    const left = Math.max(8, Math.min(wanted, window.innerWidth - width - 8));
    const below = window.innerHeight - rect.bottom;
    // Opens upwards when there is clearly more room above the button
    const upwards = below < 260 && rect.top > below;
    setPosition({
      left,
      width,
      top: upwards ? undefined : rect.bottom + 6,
      bottom: upwards ? window.innerHeight - rect.top + 6 : undefined,
      maxHeight: Math.max(160, Math.min(360, (upwards ? rect.top : below) - 16))
    });
  };

  useLayoutEffect(() => {
    if (open) place();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    const timer = setTimeout(() => searchRef.current?.focus(), 30);
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || buttonRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    // The page moved under the menu: follow the button (a scroll inside the menu itself is not the page moving)
    const onMove = (e) => {
      if (e.type === 'scroll' && menuRef.current?.contains(e.target)) return;
      place();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (next) => {
    setOpen(false);
    if (String(next) !== String(value)) onChange?.(next);
  };

  const option = ({ key, optionValue, icon, name, count, muted = false }) => {
    const isSelected = String(optionValue) === String(value);
    return (
      <li key={key} role="option" aria-selected={isSelected}>
        <button
          type="button"
          onClick={() => choose(optionValue)}
          title={name}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition cursor-pointer ${
            isSelected ? 'bg-emerald-50 text-[#007355]' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          {icon}
          <span className={`flex-1 min-w-0 truncate text-xs ${isSelected ? 'font-extrabold' : 'font-semibold'} ${muted && !isSelected ? 'text-slate-500' : ''}`}>{name}</span>
          {count !== undefined && (
            <span className={`shrink-0 min-w-[1.5rem] text-center text-[10px] font-bold rounded-full px-1.5 py-0.5 ${isSelected ? 'bg-white text-[#007355] border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
              {count}
            </span>
          )}
          <Check size={14} className={`shrink-0 ${isSelected ? 'text-[#007355]' : 'text-transparent'}`} />
        </button>
      </li>
    );
  };

  const dot = (color) => (
    <span className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${color || '#00a884'}1f` }}>
      <Folder size={13} style={{ color: color || '#00a884' }} />
    </span>
  );

  return (
    <>
      <div className={`relative ${className}`}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          title={active ? `Folder: ${label}` : 'Filter by folder'}
          className={`w-full flex items-center gap-1.5 rounded px-2 py-1 text-xs font-normal border shadow-2xs transition cursor-pointer text-left ${
            active
              ? 'bg-emerald-50 border-[#00a884] text-[#007355] font-semibold pr-6'
              : 'bg-white border-slate-300 text-slate-800 hover:border-slate-400'
          } ${open ? 'ring-2 ring-emerald-100 border-[#007355]' : ''}`}
        >
          {isNone
            ? <FolderX size={13} className="shrink-0" />
            : <Folder size={13} className="shrink-0" style={selected ? { color: selected.color || '#00a884' } : { color: '#94a3b8' }} />}
          <span className="flex-1 min-w-0 truncate">{label}</span>
          {!active && <ChevronDown size={13} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />}
        </button>
        {active && (
          <button
            type="button"
            onClick={() => choose('')}
            aria-label="Show all folders"
            title="Show all folders"
            className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded text-[#007355] hover:bg-emerald-100 cursor-pointer"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {open && position && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[70] bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden font-sans"
          style={{ left: position.left, top: position.top, bottom: position.bottom, width: position.width, maxHeight: position.maxHeight }}
        >
          <div className="px-3 pt-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Filter by folder</div>
          {folders.length >= SEARCH_FROM && (
            <div className="px-2 pb-1.5">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a folder"
                  aria-label="Find a folder"
                  className="w-full pl-8 pr-2 py-1.5 text-xs font-normal border border-slate-300 rounded-lg bg-white text-slate-900 outline-none focus:border-[#007355] focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>
          )}
          <ul role="listbox" aria-label="Folders" className="flex-1 overflow-y-auto px-1.5 pb-1.5 space-y-0.5">
            {!query.trim() && option({
              key: 'all',
              optionValue: '',
              icon: <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><FolderOpen size={13} /></span>,
              name: 'All folders',
              count: counts.all
            })}
            {visible.map((f) => option({ key: f.id, optionValue: String(f.id), icon: dot(f.color), name: f.name, count: counts[f.id] || 0 }))}
            {!query.trim() && option({
              key: 'none',
              optionValue: NO_FOLDER,
              icon: <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-400 flex items-center justify-center shrink-0"><FolderX size={13} /></span>,
              name: 'General (no folder)',
              count: counts[NO_FOLDER] || 0,
              muted: true
            })}
            {visible.length === 0 && query.trim() && (
              <li className="px-3 py-4 text-center text-[11px] font-normal text-slate-400">No folder matches "{query.trim()}".</li>
            )}
            {folders.length === 0 && (
              <li className="px-3 py-2 text-[11px] font-normal text-slate-400 leading-relaxed">No folders yet. Create one on the Folders page.</li>
            )}
          </ul>
        </div>,
        document.body
      )}
    </>
  );
}
