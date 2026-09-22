/**
 * Sign yourself (client/src/pages/SignYourself.jsx)
 *
 * The hub of the module: every document the signed-in user prepares and signs alone, kept in separate tabs so
 * generating a document and signing one never get mixed up.
 *
 *   Documents      generated or uploaded, no fields placed yet - stop here if you only wanted the document
 *   Ready to sign  fields (signature, date, full name, stamp...) are placed and it is waiting for your signature
 *   Signed         you signed it: download the signed PDF, email a copy, read its history
 *   Shared         the ones you emailed to somebody else, with who received them and when
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PenTool,
  Plus,
  FileText,
  FileSignature,
  Clock,
  Share2,
  Layers,
  Download,
  Mail,
  Trash2,
  Pencil,
  History,
  Eye,
  ArrowRight,
  RefreshCw,
  Inbox
} from 'lucide-react';
import {
  PageHeader,
  Card,
  StatCard,
  Button,
  Tabs,
  SearchInput,
  Pagination,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  useToast
} from '../components/ui/kit';
import { SelfSignCard, RenameModal, ShareModal } from '../components/selfsign/selfSignUi';
import {
  listSelfSign,
  renameSelfSign,
  deleteSelfSign,
  shareSelfSign,
  downloadSelfSign
} from '../components/selfsign/selfSignApi';

const TABS = [
  { id: 'all', label: 'All', icon: Layers, stage: 'all' },
  { id: 'documents', label: 'Documents', icon: FileText, stage: 'draft' },
  { id: 'ready', label: 'Ready to sign', icon: Clock, stage: 'prepared' },
  { id: 'signed', label: 'Signed', icon: FileSignature, stage: 'signed' },
  { id: 'shared', label: 'Shared', icon: Share2, stage: 'shared' }
];

const TAB_HINTS = {
  all: 'Everything you created in Sign yourself.',
  documents: 'Generated or uploaded documents with no fields yet. Add fields only when you want to sign one.',
  ready: 'Signature, date and other fields are placed. These are waiting for your signature.',
  signed: 'Signed by you. Download the signed PDF, email a copy, or open its history.',
  shared: 'Self-sign documents you emailed to somebody else, with the full delivery history.'
};

const EMPTY_STATES = {
  all: { title: 'Nothing here yet', description: 'Start a self-sign document: upload a file, pick a template, or write one in BexSign.' },
  documents: { title: 'No generated documents', description: 'Documents you create without placing any fields appear here, ready to download or prepare later.' },
  ready: { title: 'Nothing is waiting for your signature', description: 'Place fields on a document and it moves here, ready to sign.' },
  signed: { title: 'You have not signed anything yet', description: 'Once you sign a document, its signed PDF and certificate appear here.' },
  shared: { title: 'You have not shared a copy yet', description: 'Emailing a copy of a self-signed document records it here with its history.' }
};

export default function SignYourself() {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams();
  const activeTab = TABS.some((t) => t.id === tabParam) ? tabParam : 'all';

  const [toast, showToast] = useToast();
  const [state, setState] = useState({ status: 'loading', items: [], total: 0, stats: {}, error: '' });
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [renaming, setRenaming] = useState(null);
  const [sharing, setSharing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, debounced]);

  const stage = TABS.find((t) => t.id === activeTab)?.stage || 'all';

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: prev.items.length ? 'refreshing' : 'loading', error: '' }));
    try {
      const data = await listSelfSign({ stage, search: debounced, page, pageSize });
      setState({ status: 'ready', items: data.documents || [], total: data.total || 0, stats: data.stats || {}, error: '' });
    } catch (err) {
      setState((prev) => ({ ...prev, status: 'error', error: err.message }));
    }
  }, [stage, debounced, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = state.stats || {};
  const tabsWithCounts = useMemo(() => TABS.map((t) => ({
    ...t,
    count: t.stage === 'all' ? stats.total : (t.stage === 'shared' ? stats.shared : stats[t.stage])
  })), [stats]);

  const openDetail = (item) => navigate(`/sign-yourself/doc/${item.id}`);
  const openPrepare = (item) => navigate(`/sign-yourself/prepare/${item.documentId}`);

  const runDownload = async (item) => {
    try {
      await downloadSelfSign(item.id, { fallbackName: `${item.title}.pdf` });
      showToast('success', item.stage === 'signed' ? 'The signed PDF was downloaded.' : 'A copy of the document was downloaded.');
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const runRename = async (title) => {
    setBusy(true);
    try {
      await renameSelfSign(renaming.id, title);
      setRenaming(null);
      showToast('success', 'The document was renamed.');
      load();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const runShare = async (form) => {
    setBusy(true);
    try {
      await shareSelfSign(sharing.id, form);
      setSharing(null);
      showToast('success', `A copy was emailed to ${form.email}.`);
      load();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const runDelete = async () => {
    setBusy(true);
    try {
      await deleteSelfSign(deleting.id);
      setDeleting(null);
      showToast('success', 'The self-sign document was deleted.');
      load();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const actionsFor = (item) => [
    { label: 'Open', icon: Eye, onClick: () => openDetail(item) },
    { label: item.stage === 'signed' ? 'View fields' : (item.hasFields ? 'Edit fields' : 'Add fields'), icon: PenTool, onClick: () => openPrepare(item) },
    { label: 'Rename', icon: Pencil, onClick: () => setRenaming(item), hidden: item.stage === 'signed' },
    { label: item.stage === 'signed' ? 'Download signed PDF' : 'Download a copy', icon: Download, onClick: () => runDownload(item) },
    { label: 'Email a copy', icon: Mail, onClick: () => setSharing(item) },
    { label: 'History', icon: History, onClick: () => navigate(`/sign-yourself/doc/${item.id}/history`) },
    { label: 'Delete', icon: Trash2, danger: true, onClick: () => setDeleting(item) }
  ];

  const primaryFor = (item) => {
    if (item.stage === 'signed') return { label: 'Download', icon: Download, variant: 'secondary', onClick: runDownload };
    if (item.stage === 'prepared') return { label: 'Sign now', icon: FileSignature, onClick: openPrepare };
    return { label: 'Add fields', icon: PenTool, variant: 'secondary', onClick: openPrepare };
  };

  return (
    <div className="space-y-5 max-w-[1400px]">
      <PageHeader
        eyebrow="Sign yourself"
        title="Documents you sign yourself"
        description="Generate a document on its own, or place your signature and other fields and sign it - without sending it to anybody."
        icon={PenTool}
        actions={(
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={load} busy={state.status === 'refreshing'}>Refresh</Button>
            <Button icon={Plus} onClick={() => navigate('/sign-yourself/new')}>New self-sign document</Button>
          </>
        )}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="All" value={stats.total ?? 0} icon={Layers} tone="slate" onClick={() => navigate('/sign-yourself/all')} active={activeTab === 'all'} />
        <StatCard label="Generated" value={stats.draft ?? 0} icon={FileText} tone="sky" hint="No fields yet" onClick={() => navigate('/sign-yourself/documents')} active={activeTab === 'documents'} />
        <StatCard label="Ready to sign" value={stats.prepared ?? 0} icon={Clock} tone="amber" hint="Fields placed" onClick={() => navigate('/sign-yourself/ready')} active={activeTab === 'ready'} />
        <StatCard label="Signed" value={stats.signed ?? 0} icon={FileSignature} tone="emerald" onClick={() => navigate('/sign-yourself/signed')} active={activeTab === 'signed'} />
        <StatCard label="Shared" value={stats.shared ?? 0} icon={Share2} tone="indigo" hint="Emailed to someone" onClick={() => navigate('/sign-yourself/shared')} active={activeTab === 'shared'} />
      </div>

      <Card bodyClassName="p-0">
        <div className="px-3 sm:px-5 pt-3">
          <Tabs tabs={tabsWithCounts} active={activeTab} onChange={(id) => navigate(`/sign-yourself/${id}`)} />
        </div>

        <div className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3 border-b border-slate-100">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name or template..." className="flex-1 min-w-0" />
          <p className="text-xs text-slate-500 sm:max-w-md">{TAB_HINTS[activeTab]}</p>
        </div>

        <div className="p-4 sm:p-5">
          {state.error && <ErrorBanner message={state.error} onRetry={load} />}
          {state.status === 'loading' && <LoadingBlock label="Loading your self-sign documents..." />}

          {state.status !== 'loading' && !state.error && state.items.length === 0 && (
            <EmptyState
              icon={Inbox}
              title={EMPTY_STATES[activeTab].title}
              description={debounced ? `Nothing matches "${debounced}".` : EMPTY_STATES[activeTab].description}
              action={<Button icon={Plus} onClick={() => navigate('/sign-yourself/new')}>Start a self-sign document</Button>}
            />
          )}

          {state.items.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5">
              {state.items.map((item) => (
                <SelfSignCard
                  key={item.id}
                  item={item}
                  onOpen={openDetail}
                  actions={actionsFor(item)}
                  primary={primaryFor(item)}
                />
              ))}
            </div>
          )}
        </div>

        <Pagination page={page} pageSize={pageSize} total={state.total} onPage={setPage} onPageSize={setPageSize} pageSizes={[12, 24, 48]} />
      </Card>

      <Card
        title="How it works"
        description="Five steps, and you can stop after step 2 if you only wanted the document."
      >
        <ol className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 text-xs">
          {[
            { n: 1, title: 'Add documents', text: 'Upload files, choose templates, or write a document in BexSign.' },
            { n: 2, title: 'Name & merge', text: 'Rename, replace, remove, or merge several documents into one file.' },
            { n: 3, title: 'Prepare fields', text: 'Optional. Place signature, date, full name, stamp and the rest.' },
            { n: 4, title: 'Sign', text: 'Your own signature fills the fields and a signed PDF is issued.' },
            { n: 5, title: 'Done', text: 'Download it, email a copy, and read the full history any time.' }
          ].map((step) => (
            <li key={step.n} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <span className="w-6 h-6 rounded-full bg-[#007355] text-white grid place-items-center text-[11px] font-black">{step.n}</span>
              <p className="mt-2 font-extrabold text-slate-900">{step.title}</p>
              <p className="text-slate-500 mt-0.5 leading-relaxed">{step.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-4">
          <Button icon={ArrowRight} onClick={() => navigate('/sign-yourself/new')}>Start now</Button>
        </div>
      </Card>

      <RenameModal
        open={Boolean(renaming)}
        onClose={() => setRenaming(null)}
        title="Rename this document"
        label="Document name"
        value={renaming?.title}
        onConfirm={runRename}
        busy={busy}
      />
      <ShareModal open={Boolean(sharing)} onClose={() => setSharing(null)} item={sharing} onConfirm={runShare} busy={busy} />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this self-sign document?"
        message={`"${deleting?.title || ''}" and its documents, fields and history are removed for good. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={runDelete}
        onCancel={() => setDeleting(null)}
      />
      {toast}
    </div>
  );
}
