/**
 * Sign yourself - one self-sign document (client/src/pages/selfsign/SelfSignDetail.jsx).
 *
 * Shows where the document stands in the five steps, the documents it holds, what to do next, and - in its own
 * tab - the complete history: every change, every download and every copy emailed to somebody else.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  PenTool,
  ArrowLeft,
  Download,
  Mail,
  Trash2,
  Pencil,
  History,
  FileText,
  FileSignature,
  ShieldCheck,
  Printer,
  Layers,
  Send,
  CheckCircle2,
  Replace,
  Combine,
  FileBox,
  ArrowRight
} from 'lucide-react';
import {
  PageHeader,
  Card,
  Badge,
  Button,
  Tabs,
  ConfirmDialog,
  ErrorBanner,
  LoadingBlock,
  EmptyState,
  useToast,
  formatDateTime,
  thClass,
  tdClass,
  tableWrap
} from '../../components/ui/kit';
import {
  Stepper,
  StageBadge,
  DocumentTile,
  HistoryTimeline,
  RenameModal,
  ShareModal,
  MergeModal
} from '../../components/selfsign/selfSignUi';
import {
  getSelfSign,
  getSelfSignHistory,
  renameSelfSign,
  deleteSelfSign,
  shareSelfSign,
  downloadSelfSign,
  removeSelfSignDocument,
  mergeSelfSignDocuments,
  replaceSelfSignDocument,
  SOURCE_LABELS,
  STAGES
} from '../../components/selfsign/selfSignApi';

const STEPS = [
  { id: 'add', label: 'Add documents', hint: 'Done' },
  { id: 'name', label: 'Name & merge', hint: 'Organise' },
  { id: 'fields', label: 'Prepare fields', hint: 'Optional' },
  { id: 'sign', label: 'Sign', hint: 'Your signature' },
  { id: 'done', label: 'Done', hint: 'Download & share' }
];

const STEP_OF_STAGE = { draft: 2, prepared: 3, signed: 5 };

export default function SelfSignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const startOnHistory = location.pathname.endsWith('/history');
  const [toast, showToast] = useToast();

  const [tab, setTab] = useState(startOnHistory ? 'history' : 'overview');
  const [state, setState] = useState({ status: 'loading', record: null, documents: [], shares: [], error: '' });
  const [timeline, setTimeline] = useState({ status: 'idle', entries: [] });
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showMerge, setShowMerge] = useState(false);
  const [renamingDoc, setRenamingDoc] = useState(null);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: prev.record ? 'refreshing' : 'loading', error: '' }));
    try {
      const data = await getSelfSign(id);
      setState({ status: 'ready', record: data.selfSign, documents: data.documents || [], shares: data.shares || [], error: '' });
      setSelectedIds([]);
    } catch (err) {
      setState((prev) => ({ ...prev, status: 'error', error: err.message }));
    }
  }, [id]);

  const loadHistory = useCallback(async () => {
    setTimeline({ status: 'loading', entries: [] });
    try {
      const data = await getSelfSignHistory(id);
      setTimeline({ status: 'ready', entries: data.timeline || [] });
    } catch (err) {
      setTimeline({ status: 'error', entries: [], error: err.message });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab, loadHistory]);

  const record = state.record;
  const stage = record?.stage || 'draft';
  const isSigned = stage === 'signed';

  const act = async (fn, successMessage) => {
    setBusy(true);
    try {
      const result = await fn();
      if (successMessage) showToast('success', successMessage);
      await load();
      if (tab === 'history') await loadHistory();
      return result;
    } catch (err) {
      showToast('error', err.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const download = async (options, message) => {
    try {
      await downloadSelfSign(id, options);
      showToast('success', message);
      if (tab === 'history') loadHistory();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  if (state.status === 'loading') return <LoadingBlock label="Loading this self-sign document..." />;
  if (!record) {
    return (
      <div className="space-y-4">
        <ErrorBanner message={state.error || 'This self-sign document was not found in your account.'} onRetry={load} />
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/sign-yourself/all')}>Back to Sign yourself</Button>
      </div>
    );
  }

  const stageMeta = STAGES[stage] || STAGES.draft;

  return (
    <div className="space-y-5 max-w-[1200px]">
      <PageHeader
        eyebrow={`Sign yourself · ${SOURCE_LABELS[record.source] || 'Document'}`}
        title={record.title}
        description={stageMeta.description}
        icon={isSigned ? FileSignature : PenTool}
        actions={(
          <>
            <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/sign-yourself/all')}>All documents</Button>
            {!isSigned && (
              <Button icon={PenTool} onClick={() => navigate(`/sign-yourself/prepare/${record.documentId}`)}>
                {record.hasFields ? 'Continue & sign' : 'Add fields & sign'}
              </Button>
            )}
            {isSigned && (
              <Button icon={Download} onClick={() => download({ fallbackName: `${record.title}.pdf` }, 'The signed PDF was downloaded.')}>
                Download signed PDF
              </Button>
            )}
          </>
        )}
      >
        <Stepper steps={STEPS} current={STEP_OF_STAGE[stage] || 2} />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <StageBadge stage={stage} />
        <Badge tone="slate">{record.documentCount || state.documents.length} document{(record.documentCount || state.documents.length) === 1 ? '' : 's'}</Badge>
        <Badge tone="sky">{record.fieldCount} field{record.fieldCount === 1 ? '' : 's'}</Badge>
        {record.bexsignDocId && <Badge tone="violet">{record.bexsignDocId}</Badge>}
        {record.signedAt && <Badge tone="emerald">Signed {formatDateTime(record.signedAt)}</Badge>}
      </div>

      <Card bodyClassName="p-0">
        <div className="px-3 sm:px-5 pt-3">
          <Tabs
            tabs={[
              { id: 'overview', label: 'Documents', icon: FileText, count: state.documents.length },
              { id: 'history', label: 'History', icon: History },
              { id: 'shared', label: 'Shared with', icon: Mail, count: state.shares.length }
            ]}
            active={tab}
            onChange={(next) => {
              setTab(next);
              navigate(next === 'history' ? `/sign-yourself/doc/${id}/history` : `/sign-yourself/doc/${id}`, { replace: true });
            }}
          />
        </div>

        <div className="p-4 sm:p-5">
          {tab === 'overview' && (
            <div className="space-y-4">
              {!isSigned && state.documents.length > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" icon={Combine} disabled={selectedIds.length < 2} onClick={() => setShowMerge(true)}>
                    Merge{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                  </Button>
                  <span className="text-[11px] text-slate-500">Select two or more documents to merge them into one file.</span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {state.documents.map((doc, index) => (
                  <DocumentTile
                    key={doc.fileId}
                    doc={doc}
                    index={index}
                    readOnly={isSigned}
                    selected={selectedIds.includes(String(doc.fileId))}
                    onToggle={isSigned || state.documents.length < 2 ? undefined : () => setSelectedIds((prev) => (
                      prev.includes(String(doc.fileId)) ? prev.filter((x) => x !== String(doc.fileId)) : [...prev, String(doc.fileId)]
                    ))}
                    actions={[
                      { label: 'Edit fields', icon: PenTool, onClick: () => navigate(`/sign-yourself/prepare/${record.documentId}`) },
                      { label: 'Rename', icon: Pencil, onClick: () => setRenamingDoc(doc) },
                      { label: 'Download', icon: Download, onClick: () => download({ index, fallbackName: doc.name }, `"${doc.name}" was downloaded.`) },
                      { label: 'Remove', icon: Trash2, danger: true, hidden: state.documents.length <= 1, onClick: () => setRemoving(doc) }
                    ]}
                  />
                ))}
                {!isSigned && (
                  <button
                    type="button"
                    onClick={() => navigate(`/sign-yourself/new/${record.id}?step=2`)}
                    className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 hover:border-[#007355] hover:bg-emerald-50/60 transition grid place-items-center text-center p-4 cursor-pointer min-h-[190px]"
                  >
                    <span>
                      <FileBox size={22} className="mx-auto text-slate-400" />
                      <span className="block mt-2 text-xs font-bold text-slate-700">Add or replace documents</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">Back to step 2</span>
                    </span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5"><Layers size={14} className="text-slate-400" /> What to do next</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!isSigned && (
                      <Button icon={ArrowRight} onClick={() => navigate(`/sign-yourself/prepare/${record.documentId}`)}>
                        {record.hasFields ? 'Open the editor and sign' : 'Place fields'}
                      </Button>
                    )}
                    <Button variant="secondary" icon={Download} onClick={() => download({ fallbackName: `${record.title}.pdf` }, isSigned ? 'The signed PDF was downloaded.' : 'A copy was downloaded.')}>
                      {isSigned ? 'Signed PDF' : 'Download a copy'}
                    </Button>
                    {isSigned && (
                      <Button variant="secondary" icon={ShieldCheck} onClick={() => download({ type: 'certificate', fallbackName: 'certificate.pdf' }, 'The certificate of completion was downloaded.')}>
                        Certificate
                      </Button>
                    )}
                    <Button variant="secondary" icon={Mail} onClick={() => setSharing(true)}>Email a copy</Button>
                    <Button variant="secondary" icon={Printer} onClick={() => window.print()}>Print</Button>
                    <Button variant="secondary" icon={Pencil} disabled={isSigned} onClick={() => setRenaming(true)}>Rename</Button>
                    <Button variant="subtleDanger" icon={Trash2} onClick={() => setDeleting(true)}>Delete</Button>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4 text-xs text-slate-600 space-y-1.5">
                  <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5"><CheckCircle2 size={14} className="text-slate-400" /> Details</h3>
                  <p><span className="text-slate-400">Created</span> · {formatDateTime(record.createdAt)}</p>
                  <p><span className="text-slate-400">Last change</span> · {formatDateTime(record.updatedAt)}</p>
                  <p><span className="text-slate-400">Source</span> · {SOURCE_LABELS[record.source] || record.source}{record.templateName ? ` (${record.templateName})` : ''}</p>
                  <p><span className="text-slate-400">Pages</span> · {record.pageCount}</p>
                  {record.bexsignDocId && <p className="break-all"><span className="text-slate-400">BexSign Document ID</span> · {record.bexsignDocId}</p>}
                  <p className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    This document was never sent for anybody else&apos;s signature. To collect someone else&apos;s
                    signature, use <strong>Send for signatures</strong> instead.
                  </p>
                  <Button variant="ghost" icon={Send} className="mt-1" onClick={() => navigate('/send-for-signatures')}>Send for signatures</Button>
                </div>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div>
              {timeline.status === 'loading' && <LoadingBlock label="Loading the history..." />}
              {timeline.status === 'error' && <ErrorBanner message={timeline.error} onRetry={loadHistory} />}
              {timeline.status === 'ready' && (
                <HistoryTimeline
                  entries={timeline.entries}
                  emptyHint="Every change, download and shared copy of this document is recorded here."
                />
              )}
            </div>
          )}

          {tab === 'shared' && (
            state.shares.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="No copy has been emailed yet"
                description="Emailing a copy records who received it and when, and it also shows up in the history."
                action={<Button icon={Mail} onClick={() => setSharing(true)}>Email a copy</Button>}
              />
            ) : (
              <div className={tableWrap}>
                <table className="w-full min-w-[560px] text-left border-collapse">
                  <thead>
                    <tr>
                      <th className={thClass}>Recipient</th>
                      <th className={thClass}>Note</th>
                      <th className={thClass}>Status</th>
                      <th className={thClass}>Sent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.shares.map((share) => (
                      <tr key={share.id}>
                        <td className={tdClass}>
                          <p className="font-bold text-slate-800">{share.recipient_name || share.recipient_email.split('@')[0]}</p>
                          <p className="text-[11px] text-slate-500">{share.recipient_email}</p>
                        </td>
                        <td className={`${tdClass} max-w-xs`}>{share.message || '-'}</td>
                        <td className={tdClass}>
                          <Badge tone={share.status === 'failed' ? 'rose' : 'emerald'} dot>{share.status === 'failed' ? 'Failed' : 'Sent'}</Badge>
                          {share.error_message && <p className="text-[10px] text-red-600 mt-1">{share.error_message}</p>}
                        </td>
                        <td className={tdClass}>{formatDateTime(share.shared_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </Card>

      <RenameModal
        open={renaming}
        onClose={() => setRenaming(false)}
        title="Rename this document"
        label="Document name"
        value={record.title}
        busy={busy}
        onConfirm={(title) => act(() => renameSelfSign(id, title), 'The document was renamed.').then(() => setRenaming(false))}
      />
      <RenameModal
        open={Boolean(renamingDoc)}
        onClose={() => setRenamingDoc(null)}
        title="Rename this document"
        label="File name"
        value={renamingDoc?.name}
        busy={busy}
        onConfirm={(name) => {
          const form = new FormData();
          form.set('name', name);
          const target = renamingDoc;
          setRenamingDoc(null);
          act(() => replaceSelfSignDocument(id, target.fileId, form), 'The document was renamed.');
        }}
      />
      <ShareModal
        open={sharing}
        onClose={() => setSharing(false)}
        item={record}
        busy={busy}
        onConfirm={(form) => act(() => shareSelfSign(id, form), `A copy was emailed to ${form.email}.`).then((ok) => ok && setSharing(false))}
      />
      <MergeModal
        open={showMerge}
        onClose={() => setShowMerge(false)}
        documents={state.documents}
        selectedIds={selectedIds}
        busy={busy}
        onConfirm={(fileName) => act(() => mergeSelfSignDocuments(id, { fileIds: selectedIds, fileName }), 'The documents were merged.').then(() => setShowMerge(false))}
      />
      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove this document?"
        message={`"${removing?.name || ''}" is removed from this self-sign document, together with the fields placed on it.`}
        confirmLabel="Remove"
        danger
        busy={busy}
        onConfirm={() => {
          const target = removing;
          setRemoving(null);
          act(() => removeSelfSignDocument(id, target.fileId), `"${target.name}" was removed.`);
        }}
        onCancel={() => setRemoving(null)}
      />
      <ConfirmDialog
        open={deleting}
        title="Delete this self-sign document?"
        message={`"${record.title}" and its documents, fields and history are removed for good. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          try {
            await deleteSelfSign(id);
            navigate('/sign-yourself/all');
          } catch (err) {
            showToast('error', err.message);
          } finally {
            setBusy(false);
            setDeleting(false);
          }
        }}
        onCancel={() => setDeleting(false)}
      />
      {toast}
    </div>
  );
}
