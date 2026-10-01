import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api';

/**
 * Folder picker backed by GET/POST /api/folders. Used wherever a document's folder is chosen: Send for
 * Signatures, Send Document, and the Documents list's bulk "move to folder" action.
 */
export default function FolderSelect({ value, onChange, className, allowCreate = true }) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/folders');
      setFolders(Array.isArray(data.folders) ? data.folders : []);
    } catch (e) {
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSelect = (e) => {
    const val = e.target.value;
    if (val === '__create__') {
      setCreating(true);
      return;
    }
    const id = val ? parseInt(val, 10) : null;
    const folder = folders.find((f) => f.id === id) || null;
    onChange(id, folder?.name || 'None');
  };

  const submitCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setError('');
    try {
      const data = await apiFetch('/folders', { method: 'POST', body: { name } });
      await load();
      setCreating(false);
      setNewName('');
      onChange(data.folder.id, data.folder.name);
    } catch (e) {
      setError(e.message || 'Could not create folder.');
    }
  };

  const selectClass = className || 'w-full p-2 border border-slate-300 rounded bg-white outline-none focus:border-[#007355] text-xs font-medium';

  if (creating) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); submitCreate(); }
              if (e.key === 'Escape') { setCreating(false); setError(''); }
            }}
            placeholder="New folder name"
            className="flex-1 p-2 border border-slate-300 rounded bg-white outline-none focus:border-[#007355] text-xs font-medium"
          />
          <button type="button" onClick={submitCreate} className="px-2.5 py-2 text-xs font-bold text-white bg-[#007355] hover:bg-[#005c44] rounded cursor-pointer">Add</button>
          <button type="button" onClick={() => { setCreating(false); setError(''); }} className="px-2 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer">Cancel</button>
        </div>
        {error && <p className="text-[10px] text-rose-600">{error}</p>}
      </div>
    );
  }

  return (
    <select value={value || ''} onChange={handleSelect} disabled={loading} className={selectClass}>
      <option value="">No folder</option>
      {folders.map((f) => (
        <option key={f.id} value={f.id}>{f.name} ({f.documentCount})</option>
      ))}
      {allowCreate && <option value="__create__">+ Create new folder...</option>}
    </select>
  );
}
