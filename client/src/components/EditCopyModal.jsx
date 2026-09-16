import React, { useEffect, useState } from 'react';
import { AlertTriangle, Copy, FileLock2, Loader2, X, ArrowRight } from 'lucide-react';
import { createEditableCopy, previewCopyName } from '../utils/signedPdf';
import { getLoggedInUser } from '../utils/currentUser';

/**
 * Editing a sent or completed request never changes it: after confirmation an editable draft copy is created
 * (documents, recipients, fields and settings) with an automatic "(Copy)" name, and onCopied(newId) opens it.
 */
export default function EditCopyModal({ doc, onClose, onCopied }) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const name = doc?.document_name || doc?.name || 'Document';
  const status = doc?.status || 'Sent';
  const isCompleted = String(status).toLowerCase() === 'completed';
  const isDraft = String(status).toLowerCase() === 'draft';

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !isCreating) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isCreating, onClose]);

  const handleConfirm = async () => {
    setIsCreating(true);
    setError('');
    try {
      const data = await createEditableCopy(doc.id, getLoggedInUser()?.id);
      onCopied(data.newDocumentId, data.documentName);
    } catch (err) {
      setError(err instanceof TypeError
        ? 'Could not reach the BexSign server at http://localhost:5000. Make sure it is running, then try again.'
        : err.message);
      setIsCreating(false);
    }
  };

  if (!doc) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 font-sans"
      onClick={() => !isCreating && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-copy-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
      >
        <div className="px-6 pt-6 pb-4 flex items-start gap-4">
          <span className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="edit-copy-title" className="text-base font-extrabold text-slate-900">{isDraft ? 'Edit as a new copy' : 'Edit creates a copy'}</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {isDraft ? (
                <>A new draft copy of <strong className="text-slate-700">{name}</strong> is created. The original draft stays as it is.</>
              ) : (
                <><strong className="text-slate-700">{name}</strong> is {isCompleted ? 'completed and signed' : `already ${String(status).toLowerCase()}`}, so it can't be changed. Editing creates a new draft copy instead.</>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-2 space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs">
              <FileLock2 size={15} className="text-slate-500 shrink-0" />
              <span className="text-slate-500 w-16 shrink-0">Original</span>
              <span className="font-semibold text-slate-700 truncate" title={name}>{name}</span>
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-white border border-slate-200 rounded px-1.5 py-0.5 shrink-0">Unchanged</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs">
              <Copy size={15} className="text-[#007355] shrink-0" />
              <span className="text-slate-500 w-16 shrink-0">New copy</span>
              <span className="font-bold text-slate-900 truncate" title={previewCopyName(name)}>{previewCopyName(name)}</span>
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-[#007355] bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 shrink-0">Draft</span>
            </div>
          </div>
          <ul className="text-[11px] text-slate-500 space-y-1 pl-1">
            <li>• Documents, recipients, fields and settings are copied.</li>
            <li>• Signatures and values entered by recipients are not copied.</li>
            <li>• The copy is renamed automatically. You can rename it before sending.</li>
          </ul>
          {error && (
            <p role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="px-6 py-4 mt-2 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="px-4 py-2 border border-slate-300 bg-white rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isCreating}
            autoFocus
            className="px-4 py-2 bg-[#007355] hover:bg-[#005c44] disabled:opacity-70 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow cursor-pointer"
          >
            {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
            {isCreating ? 'Creating copy...' : 'Create copy and edit'}
            {!isCreating && <ArrowRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
