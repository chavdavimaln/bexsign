import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Plus, Trash2, FileText } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { PageHeader, Card, Button, Modal, EmptyState, LoadingBlock, ErrorBanner, useToast, Field, inputClass, ConfirmDialog } from '../components/ui/kit';

/**
 * Folders (/folders): a flat list of folders used to group documents (e.g. by client or project). Click a folder
 * to see its documents in the Documents list; creating/sending a document assigns it to one from the same list.
 */
export default function Folders() {
  const navigate = useNavigate();
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [toast, showToast] = useToast();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/folders');
      setFolders(Array.isArray(data.folders) ? data.folders : []);
    } catch (e) {
      setError(e.message || 'Folders could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createFolder = async () => {
    const clean = name.trim();
    if (!clean || busy) return;
    setBusy(true);
    try {
      await apiFetch('/folders', { method: 'POST', body: { name: clean } });
      setShowCreate(false);
      setName('');
      showToast('success', `Folder "${clean}" created.`);
      await load();
    } catch (e) {
      showToast('error', e.message || 'The folder could not be created.');
    } finally {
      setBusy(false);
    }
  };

  const deleteFolder = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await apiFetch(`/folders/${toDelete.id}`, { method: 'DELETE' });
      showToast('success', `Folder "${toDelete.name}" deleted.`);
      setToDelete(null);
      await load();
    } catch (e) {
      showToast('error', e.message || 'The folder could not be deleted.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Workspace"
        title="Folders"
        description="Group contracts and agreements by client or project. Assign a folder when sending a document, or move existing documents into one."
        icon={FolderKanban}
        actions={<Button icon={Plus} onClick={() => setShowCreate(true)}>New Folder</Button>}
      />

      <ErrorBanner message={error} onRetry={load} />

      {loading ? (
        <LoadingBlock label="Loading folders..." />
      ) : folders.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No folders yet"
          description="Create your first folder to start grouping documents."
          action={<Button icon={Plus} onClick={() => setShowCreate(true)}>New Folder</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map((folder) => (
            <Card key={folder.id} className="group hover:shadow-md hover:-translate-y-0.5 transition" bodyClassName="p-5">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/documents?folderId=${folder.id}`)}
                  className="flex items-start gap-3 min-w-0 text-left flex-1 cursor-pointer"
                >
                  <span
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${folder.color}1a`, color: folder.color }}
                  >
                    <FolderKanban size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold text-slate-900 truncate">{folder.name}</span>
                    <span className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                      <FileText size={12} /> {folder.documentCount} document{folder.documentCount === 1 ? '' : 's'}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setToDelete(folder)}
                  title="Delete folder"
                  aria-label={`Delete ${folder.name}`}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setName(''); }}
        title="New folder"
        description="Give it a name, like a client or project."
        icon={FolderKanban}
        footer={(
          <>
            <Button variant="secondary" onClick={() => { setShowCreate(false); setName(''); }}>Cancel</Button>
            <Button busy={busy} onClick={createFolder}>Create folder</Button>
          </>
        )}
      >
        <Field label="Folder name" required>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createFolder()}
            placeholder="e.g. Ola Digital Health"
            className={inputClass}
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete folder?"
        message={`"${toDelete?.name}" will be deleted. Its documents are not deleted — they move to "No folder".`}
        confirmLabel="Delete folder"
        danger
        busy={busy}
        onConfirm={deleteFolder}
        onCancel={() => setToDelete(null)}
      />

      {toast}
    </div>
  );
}
