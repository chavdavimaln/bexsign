import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Cloud, Folder, FolderOpen, FileText, Image as ImageIcon, File as FileIcon, Search, ChevronRight, Home,
  Loader2, Plug, Unplug, CheckCircle2, AlertTriangle, RefreshCw, Settings, ExternalLink, Users, X
} from 'lucide-react';
import { Modal, Button, Badge } from '../ui/kit';
import { apiFetch } from '../../utils/api';

/**
 * "Add document > Cloud": pick files from Google Drive, Dropbox, OneDrive or Box.
 *
 * Each user connects their own account once (a popup with the provider's consent screen); after that the dialog
 * browses the account's folders, searches by file name and adds the ticked files to the request. The server
 * downloads each file and reads its text (see server/routes/cloud.js).
 *
 * onImport([{ file: File, text: string | null }]) receives the downloaded files.
 */

const INITIALS = { 'google-drive': 'GD', 'dropbox-files': 'DB', onedrive: 'OD', box: 'B' };
const SETUP_KEYS = { 'google-drive': 'google-drive', 'dropbox-files': 'dropbox-files', onedrive: 'onedrive', box: 'box' };
const CONNECT_TIMEOUT_MS = 3 * 60 * 1000;

function ProviderTile({ provider, size = 'md' }) {
  const dims = size === 'lg' ? 'w-14 h-14 text-lg rounded-2xl' : 'w-9 h-9 text-[11px] rounded-xl';
  return (
    <span
      className={`${dims} shrink-0 flex items-center justify-center font-black text-white shadow-sm ring-1 ring-black/5`}
      style={{ background: `linear-gradient(135deg, ${provider.color}, ${provider.color}cc)` }}
      aria-hidden="true"
    >
      {INITIALS[provider.key] || <Cloud size={16} />}
    </span>
  );
}

const formatSize = (bytes) => {
  if (bytes === null || bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

function ItemIcon({ item }) {
  if (item.type === 'folder') {
    const Icon = item.virtual ? Users : Folder;
    return <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center shrink-0"><Icon size={16} /></span>;
  }
  const ext = String(item.name || '').split('.').pop().toLowerCase();
  const isImage = ['png', 'jpg', 'jpeg'].includes(ext);
  const isPdf = ext === 'pdf';
  const Icon = isImage ? ImageIcon : (item.importable ? FileText : FileIcon);
  const toneClass = !item.importable ? 'bg-slate-100 text-slate-400' : isPdf ? 'bg-rose-50 text-rose-500' : isImage ? 'bg-violet-50 text-violet-500' : 'bg-sky-50 text-sky-600';
  return <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${toneClass}`}><Icon size={16} /></span>;
}

async function toFile(downloaded) {
  const { name, mimeType, base64 } = downloaded;
  let bytes;
  try {
    bytes = await (await fetch(`data:application/octet-stream;base64,${base64}`)).arrayBuffer();
  } catch (e) {
    bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  }
  return new File([bytes], name, { type: mimeType || 'application/octet-stream' });
}

export default function CloudImportModal({ open, onClose, onImport, room = 40 }) {
  const [providers, setProviders] = useState({ status: 'loading', items: [], canConfigure: false, error: '' });
  const [activeKey, setActiveKey] = useState(null);
  const [connect, setConnect] = useState({ key: null, url: '', error: '', blocked: false });
  const [stack, setStack] = useState([]);
  const [query, setQuery] = useState('');
  const [list, setList] = useState({ status: 'idle', items: [], nextCursor: null, error: '', more: false });
  const [selected, setSelected] = useState({});
  const [importing, setImporting] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const listSeq = useRef(0);
  const pollRef = useRef(null);
  const popupRef = useRef(null);

  const active = providers.items.find((p) => p.key === activeKey) || null;
  const folderId = stack.length ? stack[stack.length - 1].id : '';
  const selectedItems = useMemo(() => Object.values(selected), [selected]);

  const loadProviders = useCallback(async ({ keepActive = true } = {}) => {
    try {
      const data = await apiFetch('/cloud/providers');
      setProviders({ status: 'ready', items: data.providers || [], canConfigure: Boolean(data.canConfigure), error: '' });
      setActiveKey((current) => {
        if (keepActive && current && (data.providers || []).some((p) => p.key === current)) return current;
        const first = (data.providers || []).find((p) => p.connected) || (data.providers || []).find((p) => p.configured) || (data.providers || [])[0];
        return first ? first.key : null;
      });
      return data.providers || [];
    } catch (err) {
      setProviders({ status: 'error', items: [], canConfigure: false, error: err.message });
      return [];
    }
  }, []);

  const stopWaiting = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  // Everything starts fresh each time the dialog opens
  useEffect(() => {
    if (!open) {
      stopWaiting();
      return;
    }
    setProviders({ status: 'loading', items: [], canConfigure: false, error: '' });
    setConnect({ key: null, url: '', error: '', blocked: false });
    setSelected({});
    setImporting(null);
    setImportErrors([]);
    setQuery('');
    setStack([]);
    setConfirmDisconnect(false);
    loadProviders({ keepActive: false });
    return stopWaiting;
  }, [open, loadProviders, stopWaiting]);

  const loadFiles = useCallback(async ({ key, folder, search, cursor = '' }) => {
    const seq = ++listSeq.current;
    setList((prev) => (cursor ? { ...prev, more: true } : { status: 'loading', items: [], nextCursor: null, error: '', more: false }));
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      else if (folder) params.set('folder', folder);
      if (cursor) params.set('cursor', cursor);
      const data = await apiFetch(`/cloud/${key}/files?${params}`);
      if (seq !== listSeq.current) return;
      setList((prev) => ({ status: 'ready', items: cursor ? [...prev.items, ...(data.items || [])] : (data.items || []), nextCursor: data.nextCursor || null, error: '', more: false }));
    } catch (err) {
      if (seq !== listSeq.current) return;
      // The stored connection stopped working: back to the Connect screen
      if (err.status === 401) loadProviders();
      setList({ status: 'error', items: [], nextCursor: null, error: err.message, more: false });
    }
  }, [loadProviders]);

  // The folder (or the search) of the connected provider; typing waits a moment before searching
  const connected = Boolean(active?.connected);
  useEffect(() => {
    if (!open || !activeKey || !connected) return undefined;
    const search = query.trim();
    const timer = setTimeout(() => loadFiles({ key: activeKey, folder: folderId, search }), search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [open, activeKey, connected, folderId, query, loadFiles]);

  const chooseProvider = (key) => {
    if (key === activeKey || importing) return;
    stopWaiting();
    setActiveKey(key);
    setConnect({ key: null, url: '', error: '', blocked: false });
    setStack([]);
    setQuery('');
    setSelected({});
    setImportErrors([]);
    setConfirmDisconnect(false);
    setList({ status: 'idle', items: [], nextCursor: null, error: '', more: false });
  };

  // The popup tells this window when it is done; the provider list is read again either way
  useEffect(() => {
    if (!open) return undefined;
    const onMessage = (event) => {
      const data = event.data;
      if (!data || data.source !== 'bexsign-cloud') return;
      if (data.ok === false) {
        stopWaiting();
        setConnect((prev) => ({ ...prev, key: null, error: data.message || 'The account was not connected.' }));
        return;
      }
      loadProviders().then((items) => {
        if (items.some((p) => p.key === data.provider && p.connected)) {
          stopWaiting();
          setConnect({ key: null, url: '', error: '', blocked: false });
        }
      });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [open, loadProviders, stopWaiting]);

  const startConnect = async () => {
    if (!active) return;
    const key = active.key;
    setConnect({ key, url: '', error: '', blocked: false });
    // Opened before the request so the browser treats it as the result of the click
    const popup = window.open('', 'bexsign-cloud-connect', 'width=560,height=720,menubar=no,toolbar=no');
    popupRef.current = popup;
    try {
      const data = await apiFetch(`/cloud/${key}/connect`, { method: 'POST' });
      if (popup && !popup.closed) popup.location.href = data.url;
      setConnect({ key, url: data.url, error: '', blocked: !popup });
    } catch (err) {
      if (popup && !popup.closed) popup.close();
      setConnect({ key: null, url: '', error: err.message, blocked: false });
      return;
    }
    // The popup may not be able to report back (blocked messages): the connection is checked until it shows up
    stopWaiting();
    const startedAt = Date.now();
    pollRef.current = setInterval(async () => {
      if (Date.now() - startedAt > CONNECT_TIMEOUT_MS) {
        stopWaiting();
        setConnect((prev) => (prev.key === key ? { key: null, url: '', error: 'The connection was not completed. Click Connect to try again.', blocked: false } : prev));
        return;
      }
      const items = await loadProviders();
      if (items.some((p) => p.key === key && p.connected)) {
        stopWaiting();
        setConnect({ key: null, url: '', error: '', blocked: false });
      }
    }, 2500);
  };

  const cancelConnect = () => {
    stopWaiting();
    try {
      if (popupRef.current && !popupRef.current.closed) popupRef.current.close();
    } catch (e) {}
    setConnect({ key: null, url: '', error: '', blocked: false });
  };

  const disconnect = async () => {
    if (!active) return;
    setConfirmDisconnect(false);
    try {
      await apiFetch(`/cloud/${active.key}`, { method: 'DELETE' });
    } catch (e) {}
    setSelected({});
    setStack([]);
    setQuery('');
    setList({ status: 'idle', items: [], nextCursor: null, error: '', more: false });
    loadProviders();
  };

  const toggle = (item) => setSelected((prev) => {
    if (prev[item.id]) {
      const { [item.id]: _removed, ...rest } = prev;
      return rest;
    }
    if (Object.keys(prev).length >= room) return prev;
    return { ...prev, [item.id]: item };
  });

  const openFolder = (item) => {
    setQuery('');
    setStack((prev) => [...prev, { id: item.id, name: item.name }]);
  };

  const addSelected = async () => {
    if (!active || selectedItems.length === 0 || importing) return;
    const items = selectedItems;
    const done = [];
    const errors = [];
    setImportErrors([]);
    for (const [index, item] of items.entries()) {
      setImporting({ index, total: items.length, name: item.name });
      try {
        const data = await apiFetch(`/cloud/${active.key}/import`, { method: 'POST', body: { fileId: item.id } });
        done.push({ file: await toFile(data.file), text: data.text || null, source: active.label });
      } catch (err) {
        errors.push({ name: item.name, error: err.message });
        if (err.status === 401) break;
      }
    }
    setImporting(null);
    if (done.length > 0) onImport?.(done, { provider: active.label, failed: errors });
    if (errors.length === 0) {
      onClose?.();
      return;
    }
    // What was added leaves the selection; what failed stays ticked with the reason shown
    setImportErrors(errors);
    setSelected((prev) => Object.fromEntries(Object.entries(prev).filter(([, item]) => errors.some((e) => e.name === item.name))));
  };

  const waiting = connect.key && connect.key === activeKey;
  const searching = query.trim().length > 0;
  const atLimit = selectedItems.length >= room;

  const footer = (
    <>
      <span className="mr-auto self-center text-[11px] font-semibold text-slate-500">
        {importing
          ? `Adding ${importing.index + 1} of ${importing.total}: ${importing.name}`
          : selectedItems.length > 0
            ? `${selectedItems.length} file${selectedItems.length === 1 ? '' : 's'} selected${atLimit ? ` (the request has room for ${room})` : ''}`
            : 'PDF, Word, PNG, JPG and text files up to 25 MB'}
      </span>
      <Button variant="secondary" onClick={onClose} disabled={Boolean(importing)}>Cancel</Button>
      <Button onClick={addSelected} busy={Boolean(importing)} disabled={selectedItems.length === 0}>
        {selectedItems.length > 1 ? `Add ${selectedItems.length} documents` : 'Add document'}
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={importing ? undefined : onClose}
      title="Add from cloud storage"
      description="Pick documents from your Google Drive, Dropbox, OneDrive or Box account."
      icon={Cloud}
      size="xl"
      footer={footer}
    >
      {providers.status === 'loading' && (
        <p className="py-16 text-center text-xs font-semibold text-slate-400 flex items-center justify-center gap-2">
          <Loader2 size={15} className="animate-spin" /> Loading your cloud storage...
        </p>
      )}
      {providers.status === 'error' && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 flex items-start gap-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <div className="flex-1">{providers.error}</div>
          <button type="button" onClick={() => loadProviders()} className="font-bold underline cursor-pointer">Try again</button>
        </div>
      )}
      {providers.status === 'ready' && providers.items.length === 0 && (
        <p className="py-12 text-center text-xs text-slate-500">Cloud storage is turned off by your administrator.</p>
      )}

      {providers.status === 'ready' && providers.items.length > 0 && (
        <div className="grid md:grid-cols-[13.5rem_minmax(0,1fr)] gap-4 md:min-h-[26rem]">
          {/* Providers: a rail on wide screens, a row of chips on phones */}
          <nav aria-label="Cloud storage providers" className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-1 md:pb-0 -mx-1 px-1 md:mx-0 md:px-0">
            {providers.items.map((provider) => {
              const isActive = provider.key === activeKey;
              return (
                <button
                  key={provider.key}
                  type="button"
                  onClick={() => chooseProvider(provider.key)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`shrink-0 md:w-full text-left flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition cursor-pointer ${
                    isActive ? 'border-[#00a884] bg-emerald-50/60 shadow-[0_0_0_3px_rgba(0,168,132,0.10)]' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <ProviderTile provider={provider} />
                  <span className="min-w-0">
                    <span className="block text-xs font-extrabold text-slate-900 whitespace-nowrap">{provider.label}</span>
                    <span className={`block text-[10px] font-semibold truncate max-w-[9.5rem] ${provider.connected ? 'text-[#007355]' : 'text-slate-400'}`}>
                      {provider.connected ? (provider.account?.email || 'Connected') : provider.configured ? 'Not connected' : 'Not set up'}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>

          <section className="min-w-0 rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* ---------------------------------------------------- not set up on this server */}
            {active && !active.configured && (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10 gap-3">
                <ProviderTile provider={active} size="lg" />
                <h3 className="text-sm font-extrabold text-slate-900">{active.label} is not set up yet</h3>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                  An administrator registers BexSign with {active.label} once and enters the app credentials in
                  Settings &gt; Integrations. After that everyone can connect their own {active.label} account here.
                </p>
                {providers.canConfigure ? (
                  <Link
                    to={`/settings/integrations/${SETUP_KEYS[active.key]}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#007355] hover:bg-[#005c44] text-white shadow-sm"
                  >
                    <Settings size={14} /> Set up {active.label}
                  </Link>
                ) : (
                  <Badge tone="amber">Ask a manager to set it up</Badge>
                )}
              </div>
            )}

            {/* ---------------------------------------------------- set up, this user has not connected */}
            {active && active.configured && !active.connected && (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10 gap-3">
                <ProviderTile provider={active} size="lg" />
                {waiting ? (
                  <>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Loader2 size={15} className="animate-spin text-[#007355]" /> Waiting for {active.label}...
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                      Sign in and allow access in the window that opened. This dialog continues by itself when you are done.
                    </p>
                    {connect.url && (
                      <a href={connect.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#007355] hover:underline">
                        <ExternalLink size={13} /> {connect.blocked ? 'The window was blocked: open it here' : 'Open the window again'}
                      </a>
                    )}
                    <Button variant="secondary" onClick={cancelConnect}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-extrabold text-slate-900">Connect your {active.label} account</h3>
                    <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                      BexSign only reads the files you choose to add. It never changes or deletes anything in your {active.label}, and you can disconnect at any time.
                    </p>
                    {connect.error && (
                      <p role="alert" className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 max-w-sm">{connect.error}</p>
                    )}
                    <Button icon={Plug} onClick={startConnect}>Connect {active.label}</Button>
                  </>
                )}
              </div>
            )}

            {/* ---------------------------------------------------- connected: browse and pick */}
            {active && active.connected && (
              <>
                <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[10rem]">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={`Search ${active.label} by file name`}
                      aria-label={`Search ${active.label}`}
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 outline-none focus:border-[#007355] focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => loadFiles({ key: active.key, folder: folderId, search: query.trim() })}
                    className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 cursor-pointer"
                    title="Reload this folder"
                    aria-label="Reload this folder"
                  >
                    <RefreshCw size={14} className={list.status === 'loading' ? 'animate-spin' : ''} />
                  </button>
                  {confirmDisconnect ? (
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                      Disconnect {active.account?.email || active.label}?
                      <button type="button" onClick={disconnect} className="font-bold text-rose-600 hover:underline cursor-pointer">Yes</button>
                      <button type="button" onClick={() => setConfirmDisconnect(false)} className="font-bold text-slate-500 hover:underline cursor-pointer">No</button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDisconnect(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 cursor-pointer"
                      title={`Connected as ${active.account?.email || active.account?.name || active.label}`}
                    >
                      <Unplug size={13} /> Disconnect
                    </button>
                  )}
                </div>

                {/* Where am I */}
                <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-1 text-[11px] font-semibold text-slate-500 overflow-x-auto whitespace-nowrap">
                  {searching ? (
                    <>
                      <Search size={12} className="shrink-0" /> Results for "{query.trim()}"
                      <button type="button" onClick={() => setQuery('')} className="ml-1 inline-flex items-center gap-0.5 font-bold text-[#007355] hover:underline cursor-pointer"><X size={11} /> Clear</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => setStack([])} className={`inline-flex items-center gap-1 cursor-pointer hover:text-[#007355] ${stack.length === 0 ? 'text-slate-800 font-bold' : ''}`}>
                        <Home size={12} /> {active.label}
                      </button>
                      {stack.map((entry, index) => (
                        <React.Fragment key={`${entry.id}-${index}`}>
                          <ChevronRight size={12} className="shrink-0 text-slate-300" />
                          <button
                            type="button"
                            onClick={() => setStack((prev) => prev.slice(0, index + 1))}
                            className={`cursor-pointer hover:text-[#007355] ${index === stack.length - 1 ? 'text-slate-800 font-bold' : ''}`}
                          >
                            {entry.name}
                          </button>
                        </React.Fragment>
                      ))}
                    </>
                  )}
                </div>

                {importErrors.length > 0 && (
                  <div role="alert" className="mx-3 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700 space-y-0.5">
                    <p className="font-bold flex items-center gap-1.5"><AlertTriangle size={13} /> {importErrors.length === 1 ? 'One file could not be added' : `${importErrors.length} files could not be added`}</p>
                    {importErrors.map((e) => <p key={e.name} className="break-words"><span className="font-bold">{e.name}:</span> {e.error}</p>)}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto max-h-[22rem] md:max-h-[24rem]" aria-busy={list.status === 'loading'}>
                  {list.status === 'loading' && (
                    <p className="py-14 text-center text-xs font-semibold text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 size={15} className="animate-spin" /> {searching ? 'Searching...' : 'Opening the folder...'}
                    </p>
                  )}
                  {list.status === 'error' && (
                    <div className="m-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700 flex items-start gap-2">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" /> <span className="flex-1 break-words">{list.error}</span>
                    </div>
                  )}
                  {list.status === 'ready' && list.items.length === 0 && (
                    <div className="py-14 text-center text-xs text-slate-400 space-y-1.5">
                      <FolderOpen size={26} className="mx-auto text-slate-300" />
                      <p className="font-semibold">{searching ? 'No file name matches your search.' : 'This folder is empty.'}</p>
                    </div>
                  )}
                  {list.status === 'ready' && list.items.length > 0 && (
                    <ul className="divide-y divide-slate-100">
                      {list.items.map((item) => {
                        const isFolder = item.type === 'folder';
                        const isSelected = Boolean(selected[item.id]);
                        const disabled = !isFolder && (!item.importable || (!isSelected && atLimit));
                        return (
                          <li key={`${item.type}-${item.id}`}>
                            <button
                              type="button"
                              disabled={disabled || Boolean(importing)}
                              onClick={() => (isFolder ? openFolder(item) : toggle(item))}
                              aria-pressed={isFolder ? undefined : isSelected}
                              title={!isFolder && !item.importable ? item.note : undefined}
                              className={`w-full text-left flex items-center gap-3 px-3 py-2 transition cursor-pointer disabled:cursor-not-allowed ${
                                isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                              } ${disabled ? 'opacity-55' : ''}`}
                            >
                              {!isFolder && (
                                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#007355] border-[#007355] text-white' : 'bg-white border-slate-300'}`}>
                                  {isSelected && <CheckCircle2 size={12} />}
                                </span>
                              )}
                              <ItemIcon item={item} />
                              <span className="min-w-0 flex-1">
                                <span className="block text-xs font-bold text-slate-800 truncate">{item.name}</span>
                                <span className="block text-[10px] text-slate-400 truncate">
                                  {isFolder
                                    ? (item.virtual ? 'Files other people shared with you' : 'Folder')
                                    : [item.note, formatSize(item.size), formatDate(item.modifiedAt)].filter(Boolean).join(' · ')}
                                </span>
                              </span>
                              {isFolder && <ChevronRight size={15} className="shrink-0 text-slate-300" />}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {list.status === 'ready' && list.nextCursor && (
                    <div className="p-3 text-center">
                      <Button
                        variant="secondary"
                        busy={list.more}
                        onClick={() => loadFiles({ key: active.key, folder: folderId, search: query.trim(), cursor: list.nextCursor })}
                      >
                        Show more
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
