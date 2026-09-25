import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PenTool,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  RefreshCw,
  Mail,
  Copy,
  Upload,
  RotateCcw,
  LayoutGrid,
  List,
  ShieldCheck,
  AlertCircle,
  Lock,
  History,
  Star,
  FileText,
  Users,
  Clock,
  ExternalLink,
  Eye
} from 'lucide-react';
import SignatureStamp from '../components/SignatureStamp';
import BexTableToolbar from '../components/BexTableToolbar';
import { canvasHasInk, canvasPoint } from '../utils/signatureInk';
import { usePermissions } from '../utils/permissions';
import {
  fetchMySignatures,
  fetchDirectorySignatures,
  createSignature,
  updateSignature,
  deleteSignature,
  setDefaultSignature,
  fetchSignatureHistory
} from '../utils/signatureDirectory';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  Field,
  LoadingBlock,
  Modal,
  Pagination,
  SearchInput,
  SelectInput,
  Tabs,
  inputClass,
  formatDateTime,
  formatRelative,
  useToast
} from '../components/ui/kit';

/**
 * Signatures module.
 *
 * Two tabs, because a signature has an owner:
 *   My signatures    your own stamps - create, edit, delete, choose the default, see where each one was used
 *   Team directory   everyone else's - view only. Another person's signature is confidential; there is no edit
 *                    control on the card and the server refuses the change even if one were forged.
 */

const INITIAL_SIG_COLUMNS = [
  { id: 'employee', label: 'Signer & Email', required: true, visible: true },
  { id: 'empId', label: 'Employee ID', visible: true },
  { id: 'dept', label: 'Department', visible: true },
  { id: 'stamp', label: 'Signature Stamp', visible: true },
  { id: 'signId', label: 'Unique Sign ID', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'actions', label: 'Actions', visible: true }
];

const FONT_STYLES = [
  { id: 'font-signature-1', label: 'Classic Elegant' },
  { id: 'font-signature-2', label: 'Modern Script' },
  { id: 'font-signature-3', label: 'Executive Flow' },
  { id: 'font-signature-4', label: 'Formal Cursive' }
];

const CONTEXT_LABELS = {
  signing_request: 'Signing request',
  self_sign: 'Signed by you',
  directory_prefill: 'Prefilled from directory',
  manual: 'Manual use'
};

const DOC_STATUS_TONE = {
  Completed: 'emerald',
  'In Progress': 'sky',
  Draft: 'slate',
  Declined: 'rose',
  Expired: 'amber',
  Trashed: 'slate'
};

const statusTone = (status) => (String(status).toLowerCase() === 'active' ? 'emerald' : 'slate');

export default function SignaturesModule() {
  const [tab, setTab] = useState('mine');
  const [mine, setMine] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [owner, setOwner] = useState(null);
  const [directoryNotice, setDirectoryNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, showToast] = useToast();
  // Viewing, history and copying IDs are open to everyone; adding or changing a signature needs signatures.manage
  const { can, loading: permissionsLoading } = usePermissions();
  const canManage = can('signatures.manage');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState('grid');
  const [copiedId, setCopiedId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [sigTableColumns, setSigTableColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('bexsign_signatures_columns');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_SIG_COLUMNS;
  });
  const [showSigInlineFilters, setShowSigInlineFilters] = useState(true);
  const [sigColumnFilters, setSigColumnFilters] = useState({ employee: '', empId: '', dept: '', signId: '', status: '' });

  const isSigColVisible = (colId) => {
    const col = sigTableColumns.find((c) => c.id === colId);
    return col ? col.visible !== false : false;
  };

  // Create / edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmpId, setFormEmpId] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formStatus, setFormStatus] = useState('Active');
  const [formMakeDefault, setFormMakeDefault] = useState(false);
  const [method, setMethod] = useState('type');
  const [selectedStyle, setSelectedStyle] = useState('font-signature-1');
  const [uploadedImage, setUploadedImage] = useState('');
  const [drawnImage, setDrawnImage] = useState('');
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [formError, setFormError] = useState('');
  const canvasRef = useRef(null);

  // History drawer
  const [historyFor, setHistoryFor] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historySummary, setHistorySummary] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const [own, dir] = await Promise.allSettled([fetchMySignatures(), fetchDirectorySignatures()]);
    if (own.status === 'fulfilled') {
      setMine(own.value.signatures);
      setOwner(own.value.owner);
    } else {
      setLoadError(own.reason?.message || 'Your signatures could not be loaded.');
    }
    if (dir.status === 'fulfilled') {
      setDirectory(dir.value.signatures);
      setDirectoryNotice(dir.value.notice);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeList = tab === 'mine' ? mine : directory;

  useEffect(() => { setPage(1); }, [tab, searchQuery, statusFilter]);

  const filtered = useMemo(() => activeList.filter((sig) => {
    const name = (sig.employee_name || '').toLowerCase();
    const email = (sig.employee_email || '').toLowerCase();
    const empId = (sig.employee_id || '').toLowerCase();
    const dept = (sig.department || '').toLowerCase();
    const signId = (sig.signature_id || '').toLowerCase();
    const status = (sig.status || 'Active').toLowerCase();
    const q = searchQuery.toLowerCase();

    const matchesSearch = !q || name.includes(q) || email.includes(q) || empId.includes(q) || dept.includes(q) || signId.includes(q);
    const matchesStatus = statusFilter === 'All' || sig.status === statusFilter;
    const f = sigColumnFilters;
    const matchColEmp = !f.employee || name.includes(f.employee.toLowerCase()) || email.includes(f.employee.toLowerCase());
    const matchColId = !f.empId || empId.includes(f.empId.toLowerCase());
    const matchColDept = !f.dept || dept.includes(f.dept.toLowerCase());
    const matchColSignId = !f.signId || signId.includes(f.signId.toLowerCase());
    const matchColStatus = !f.status || f.status === 'All' || status === f.status.toLowerCase();

    return matchesSearch && matchesStatus && matchColEmp && matchColId && matchColDept && matchColSignId && matchColStatus;
  }), [activeList, searchQuery, statusFilter, sigColumnFilters]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  const totalUses = useMemo(() => mine.reduce((sum, s) => sum + Number(s.usage_count || 0), 0), [mine]);
  const defaultSignature = useMemo(() => mine.find((s) => s.is_default) || null, [mine]);

  const hasActiveSigFilters = Object.values(sigColumnFilters).some((v) => v !== '') || searchQuery !== '';
  const clearAllSigFilters = () => {
    setSigColumnFilters({ employee: '', empId: '', dept: '', signId: '', status: '' });
    setSearchQuery('');
  };

  /* ------------------------------------------------------------------ modal */

  const resetForm = () => {
    setFormError('');
    setHasDrawn(false);
    setDrawnImage('');
    setUploadedImage('');
    setSaving(false);
  };

  const handleOpenAdd = () => {
    if (!canManage) return;
    resetForm();
    setEditingItem(null);
    setFormName(owner?.name || '');
    setFormEmpId(`EMP${String(Math.floor(100 + Math.random() * 900))}`);
    setFormDesignation(owner?.designation || 'Software Specialist');
    setFormDepartment(owner?.department || 'Engineering');
    setFormStatus('Active');
    setFormMakeDefault(mine.length === 0);
    setMethod('type');
    setSelectedStyle('font-signature-1');
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    // Another person's signature is never editable: no card offers this, and the server refuses it too
    if (!item.canEdit || !canManage) return;
    resetForm();
    setEditingItem(item);
    setFormName(item.employee_name || '');
    setFormEmpId(item.employee_id || '');
    setFormDesignation(item.designation || 'Software Specialist');
    setFormDepartment(item.department || 'Engineering');
    setFormStatus(item.status || 'Active');
    setFormMakeDefault(Boolean(item.is_default));
    setSelectedStyle(item.signature_style || 'font-signature-1');
    const savedMethod = item.method || (item.signature_image ? 'upload' : 'type');
    setMethod(savedMethod);
    if (item.signature_image && savedMethod !== 'type') {
      if (savedMethod === 'draw') setDrawnImage(item.signature_image);
      else setUploadedImage(item.signature_image);
    }
    setShowModal(true);
  };

  /* ---------------------------------------------------------------- drawing */

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = canvasPoint(canvas, e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#1c2434';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = canvasPoint(canvas, e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasDrawn) setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && hasDrawn && canvasHasInk(canvas)) setDrawnImage(canvas.toDataURL('image/png'));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setDrawnImage('');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setFormError('Image size exceeds the 2MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result);
      setFormError('');
    };
    reader.readAsDataURL(file);
  };

  /* ------------------------------------------------------------------- save */

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('A name is required.');
      return;
    }

    // The Type tab sends an explicit null so the server CLEARS any stored image: the chosen font is what renders.
    // Anything else would leave the old picture in place and the change would look like it never happened.
    let signatureImage = null;
    if (method === 'draw') {
      const drawn = drawnImage || (canvasRef.current && hasDrawn && canvasHasInk(canvasRef.current)
        ? canvasRef.current.toDataURL('image/png')
        : '');
      if (!drawn) {
        setFormError('The signature pad is empty. Draw a signature, or use the Type or Upload tab.');
        return;
      }
      signatureImage = drawn;
    } else if (method === 'upload') {
      if (!uploadedImage) {
        setFormError('Choose a signature image to upload, or use the Type or Draw tab.');
        return;
      }
      signatureImage = uploadedImage;
    }

    const payload = {
      display_name: formName.trim(),
      employee_code: formEmpId.trim(),
      designation: formDesignation.trim(),
      department: formDepartment.trim(),
      status: formStatus,
      signature_style: selectedStyle,
      method,
      signature_image: signatureImage,
      is_default: formMakeDefault
    };

    setSaving(true);
    setFormError('');
    try {
      if (editingItem) {
        const saved = await updateSignature(editingItem.id, payload);
        // The server's row replaces the local one outright - never merged with the previous image
        setMine((prev) => prev.map((s) => (s.id === saved.id
          ? saved
          : (saved.is_default ? { ...s, is_default: false } : s))));
        showToast('success', 'Signature updated.');
      } else {
        const saved = await createSignature(payload);
        setMine((prev) => [saved, ...(saved.is_default ? prev.map((s) => ({ ...s, is_default: false })) : prev)]);
        showToast('success', 'Signature registered.');
      }
      setShowModal(false);
      load();
    } catch (err) {
      // Whatever went wrong, the real reason is shown: nothing here ever claims a save that did not happen
      setFormError(err.message || 'The signature could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteSignature(confirmDelete.id);
      setMine((prev) => prev.filter((s) => s.id !== confirmDelete.id));
      showToast('success', `Signature for ${confirmDelete.employee_name} removed.`);
      setConfirmDelete(null);
      load();
    } catch (err) {
      showToast('error', err.message || 'The signature could not be removed.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSetDefault = async (sig) => {
    try {
      const saved = await setDefaultSignature(sig.id);
      setMine((prev) => prev.map((s) => ({ ...s, is_default: s.id === saved.id })));
      showToast('success', `${saved.employee_name} is now your default signature.`);
    } catch (err) {
      showToast('error', err.message || 'The default signature could not be set.');
    }
  };

  const handleCopyId = (sigId) => {
    try {
      navigator.clipboard.writeText(sigId);
    } catch (e) {}
    setCopiedId(sigId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openHistory = async (sig) => {
    setHistoryFor(sig);
    setHistoryRows([]);
    setHistorySummary(null);
    setHistoryError('');
    setHistoryLoading(true);
    try {
      const data = await fetchSignatureHistory(sig.id);
      setHistoryRows(data.history);
      setHistorySummary(data.summary);
    } catch (err) {
      setHistoryError(err.message || 'The history could not be loaded.');
    } finally {
      setHistoryLoading(false);
    }
  };

  /* ------------------------------------------------------------------- card */

  const SignatureCard = ({ sig }) => (
    <div className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-4 relative ${
      sig.is_default ? 'border-[#00a884] ring-1 ring-emerald-100' : 'border-slate-200'
    }`}>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 text-sm truncate">{sig.employee_name}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">
                {sig.employee_id || '-'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
              {sig.designation || 'Specialist'} &bull; {sig.department || 'Operations'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge tone={statusTone(sig.status)}>{sig.status || 'Active'}</Badge>
            {sig.is_default && sig.canEdit && <Badge tone="emerald"><Star size={9} /> Default</Badge>}
            {sig.readOnly && <Badge tone="slate"><Lock size={9} /> Protected</Badge>}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-slate-600 font-medium pt-3 pb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <Mail size={14} className="text-[#00a884] shrink-0" />
            <span className="truncate font-semibold text-slate-800">{sig.employee_email}</span>
          </div>
          {sig.canEdit && Number(sig.usage_count) > 0 && (
            <button
              type="button"
              onClick={() => openHistory(sig)}
              title="See where this signature was used"
              className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-[#007355] bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 hover:bg-emerald-100 transition cursor-pointer"
            >
              <History size={10} /> used {sig.usage_count}&times;
            </button>
          )}
        </div>
      </div>

      <div className="bg-slate-50/80 rounded-xl p-3 sm:p-4 border border-slate-200 flex items-center justify-center min-h-[120px] overflow-x-auto">
        <SignatureStamp
          signerName={sig.employee_name}
          signatureImage={sig.signature_image}
          signatureStyle={sig.signature_style || 'font-signature-1'}
          signId={sig.signature_id}
          employeeId={sig.employee_id}
          showBaseline
          showByPrefix
        />
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
        <button
          type="button"
          onClick={() => handleCopyId(sig.signature_id)}
          className="text-[10px] font-mono text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold cursor-pointer min-h-9 sm:min-h-0"
          title="Copy the unique signature ID"
        >
          {copiedId === sig.signature_id
            ? <span className="text-[#00a884] flex items-center gap-1"><Check size={12} /> Copied</span>
            : <span className="flex items-center gap-1"><Copy size={12} /> Copy ID</span>}
        </button>

        {sig.canEdit ? (
          <div className="flex items-center gap-0.5 sm:gap-1">
            {canManage && !sig.is_default && (
              <button
                type="button"
                onClick={() => handleSetDefault(sig)}
                className="p-2.5 sm:p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                title="Use this signature by default"
              >
                <Star size={15} />
              </button>
            )}
            <button
              type="button"
              onClick={() => openHistory(sig)}
              className="p-2.5 sm:p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
              title="Usage history"
            >
              <History size={15} />
            </button>
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(sig)}
                  className="p-2.5 sm:p-1.5 text-slate-600 hover:text-[#00a884] hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                  title="Edit signature"
                >
                  <Edit3 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(sig)}
                  className="p-2.5 sm:p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  title="Delete signature"
                >
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            <Eye size={12} /> View only
          </span>
        )}
      </div>
    </div>
  );

  /* ------------------------------------------------------------------ render */

  const tabs = [
    { id: 'mine', label: 'My signatures', icon: PenTool, count: mine.length },
    { id: 'directory', label: 'Team directory', icon: Users, count: directory.length }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans overflow-x-hidden">
      <header className="bg-white border-b border-slate-200 relative md:sticky md:top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                <span>Signatures</span>
                <span>/</span>
                <span className="text-[#00a884]">{tab === 'mine' ? 'My signatures' : 'Team directory'}</span>
              </div>
              <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                <PenTool className="text-[#00a884] shrink-0" size={22} />
                Signature Management
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                {tab === 'mine'
                  ? 'Your own signature stamps. Pick the one that prefills your signing screens and see every document it has signed.'
                  : 'Signatures registered by other people. They are shown so you can recognise a stamp - they cannot be edited.'}
              </p>
              {/* Waits for the permissions to load so the note does not flash for managers */}
              {!permissionsLoading && !canManage && (
                <p className="mt-1.5 inline-flex items-start gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                  <Lock size={12} className="shrink-0 mt-px" />
                  You can view signatures. Ask a manager for the Manage signatures permission to add or change them.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={load}
                className="p-2.5 sm:p-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
                title="Refresh"
                aria-label="Refresh signatures"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>

              <div className="flex border border-slate-200 rounded-lg overflow-hidden p-0.5 bg-slate-100">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                  className={`p-2 sm:p-1.5 rounded transition cursor-pointer ${viewMode === 'grid' ? 'bg-white shadow text-[#00a884]' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  aria-label="Table view"
                  className={`p-2 sm:p-1.5 rounded transition cursor-pointer ${viewMode === 'table' ? 'bg-white shadow text-[#00a884]' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <List size={15} />
                </button>
              </div>

              {tab === 'mine' && canManage && (
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="bg-[#00a884] hover:bg-[#008f70] text-white px-3.5 py-2.5 sm:py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                >
                  <Plus size={16} /> Add signature
                </button>
              )}
            </div>
          </div>

          <Tabs tabs={tabs} active={tab} onChange={setTab} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-5">
        {loadError && <ErrorBanner message={loadError} onRetry={load} />}

        {tab === 'mine' ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryTile icon={PenTool} label="My signatures" value={mine.length} />
            <SummaryTile icon={Star} label="Default stamp" value={defaultSignature ? defaultSignature.signature_style?.replace('font-signature-', 'Style ') : 'None'} small />
            <SummaryTile icon={FileText} label="Total uses" value={totalUses} />
            <SummaryTile icon={Clock} label="Last used" value={mine.reduce((latest, s) => (s.last_used_at && (!latest || s.last_used_at > latest) ? s.last_used_at : latest), null)
              ? formatRelative(mine.reduce((latest, s) => (s.last_used_at && (!latest || s.last_used_at > latest) ? s.last_used_at : latest), null))
              : 'Never'} small />
          </div>
        ) : (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <ShieldCheck size={16} className="shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">
              {directoryNotice || 'These signatures belong to other people. They are confidential and can only be changed by their owner.'}
              {' '}You can look one up to confirm a stamp, but editing and deleting are disabled here and refused by the server.
            </p>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name, email, employee ID, department, sign ID..."
            className="w-full md:w-96"
          />
          <div className="flex items-center gap-3 justify-between md:justify-end flex-wrap">
            <SelectInput
              value={statusFilter}
              onChange={setStatusFilter}
              label="Status"
              options={[['All', 'All statuses'], ['Active', 'Active'], ['Inactive', 'Inactive'], ['Revoked', 'Revoked']]}
            />
            <span className="text-xs text-slate-500 font-bold whitespace-nowrap">
              Showing <span className="text-slate-900 font-extrabold">{filtered.length}</span> of {activeList.length}
            </span>
          </div>
        </div>

        {loading ? (
          <LoadingBlock label="Loading signatures..." />
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl">
            <EmptyState
              icon={tab === 'mine' ? PenTool : Users}
              title={tab === 'mine' ? 'You have no signature yet' : 'No other signatures to show'}
              description={tab === 'mine'
                ? 'Register a signature to sign documents and to have it prefilled on your signing screens.'
                : 'Nobody else has registered a signature, or none matches your search.'}
              action={tab === 'mine'
                ? (canManage ? <Button icon={Plus} onClick={handleOpenAdd}>Add signature</Button> : null)
                : (hasActiveSigFilters ? <Button variant="secondary" onClick={clearAllSigFilters}>Clear filters</Button> : null)}
            />
          </div>
        ) : viewMode === 'grid' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {paginated.map((sig) => <SignatureCard key={sig.id} sig={sig} />)}
            </div>
            <div className="bg-white border border-slate-200 rounded-xl">
              <Pagination page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
            </div>
          </div>
        ) : (
          <div className="space-y-2 min-w-0">
            <BexTableToolbar
              totalItems={filtered.length}
              currentPage={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
              showInlineFilters={showSigInlineFilters}
              onToggleInlineFilters={() => setShowSigInlineFilters(!showSigInlineFilters)}
              columns={sigTableColumns}
              onSaveColumns={setSigTableColumns}
              storageKey="bexsign_signatures_columns"
            />

            <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-w-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[720px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px] select-none">
                      {isSigColVisible('employee') && <th className="p-2.5">Signer &amp; Email</th>}
                      {isSigColVisible('empId') && <th className="p-2.5">Employee ID</th>}
                      {isSigColVisible('dept') && <th className="p-2.5">Department</th>}
                      {isSigColVisible('stamp') && <th className="p-2.5">Signature Stamp</th>}
                      {isSigColVisible('signId') && <th className="p-2.5">Unique Signature ID</th>}
                      {isSigColVisible('status') && <th className="p-2.5 whitespace-nowrap">Status</th>}
                      {isSigColVisible('actions') && <th className="p-2.5 text-right whitespace-nowrap">Actions</th>}
                    </tr>

                    {showSigInlineFilters && (
                      <tr className="bg-slate-50/70 border-b border-slate-200">
                        {isSigColVisible('employee') && (
                          <th className="p-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={sigColumnFilters.employee}
                                onChange={(e) => { setSigColumnFilters({ ...sigColumnFilters, employee: e.target.value }); setPage(1); }}
                                aria-label="Filter by signer"
                                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355]"
                              />
                              {hasActiveSigFilters && (
                                <button type="button" onClick={clearAllSigFilters} title="Clear all filters" className="text-slate-400 hover:text-red-500 p-0.5 rounded cursor-pointer">
                                  <X size={13} />
                                </button>
                              )}
                            </div>
                          </th>
                        )}
                        {isSigColVisible('empId') && (
                          <th className="p-2">
                            <input
                              type="text"
                              value={sigColumnFilters.empId}
                              onChange={(e) => { setSigColumnFilters({ ...sigColumnFilters, empId: e.target.value }); setPage(1); }}
                              aria-label="Filter by employee ID"
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355]"
                            />
                          </th>
                        )}
                        {isSigColVisible('dept') && (
                          <th className="p-2">
                            <input
                              type="text"
                              value={sigColumnFilters.dept}
                              onChange={(e) => { setSigColumnFilters({ ...sigColumnFilters, dept: e.target.value }); setPage(1); }}
                              aria-label="Filter by department"
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355]"
                            />
                          </th>
                        )}
                        {isSigColVisible('stamp') && <th className="p-2" />}
                        {isSigColVisible('signId') && (
                          <th className="p-2">
                            <input
                              type="text"
                              value={sigColumnFilters.signId}
                              onChange={(e) => { setSigColumnFilters({ ...sigColumnFilters, signId: e.target.value }); setPage(1); }}
                              aria-label="Filter by signature ID"
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355]"
                            />
                          </th>
                        )}
                        {isSigColVisible('status') && (
                          <th className="p-2">
                            <select
                              value={sigColumnFilters.status}
                              onChange={(e) => { setSigColumnFilters({ ...sigColumnFilters, status: e.target.value }); setPage(1); }}
                              aria-label="Filter by status"
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355]"
                            >
                              <option value="">All</option>
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                              <option value="Revoked">Revoked</option>
                            </select>
                          </th>
                        )}
                        {isSigColVisible('actions') && <th className="p-2" />}
                      </tr>
                    )}
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-medium">
                    {paginated.map((sig) => (
                      <tr key={sig.id} className="hover:bg-slate-50/60 transition">
                        {isSigColVisible('employee') && (
                          <td className="p-3.5 align-middle">
                            <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                              {sig.employee_name}
                              {sig.is_default && <Star size={11} className="text-amber-500 fill-amber-400" />}
                            </div>
                            <div className="text-slate-500 font-semibold">{sig.employee_email}</div>
                          </td>
                        )}
                        {isSigColVisible('empId') && (
                          <td className="p-3.5 align-middle">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-mono font-bold text-slate-700 text-[10px] border">{sig.employee_id || '-'}</span>
                          </td>
                        )}
                        {isSigColVisible('dept') && <td className="p-3.5 align-middle text-slate-600 text-[11px]">{sig.department || 'Operations'}</td>}
                        {isSigColVisible('stamp') && (
                          <td className="p-3.5 align-middle">
                            <div className="scale-90 origin-left py-1">
                              <SignatureStamp
                                signerName={sig.employee_name}
                                signatureImage={sig.signature_image}
                                signatureStyle={sig.signature_style || 'font-signature-1'}
                                signId={sig.signature_id}
                                employeeId={sig.employee_id}
                                showBaseline
                                showByPrefix={false}
                              />
                            </div>
                          </td>
                        )}
                        {isSigColVisible('signId') && (
                          <td className="p-3.5 align-middle font-mono text-[10px] text-slate-600 select-all break-all max-w-[190px]">{sig.signature_id}</td>
                        )}
                        {isSigColVisible('status') && (
                          <td className="p-3.5 align-middle"><Badge tone={statusTone(sig.status)}>{sig.status || 'Active'}</Badge></td>
                        )}
                        {isSigColVisible('actions') && (
                          <td className="p-3.5 align-middle text-right whitespace-nowrap">
                            {sig.canEdit ? (
                              <div className="flex items-center justify-end gap-1">
                                <button type="button" onClick={() => openHistory(sig)} className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer" title="Usage history">
                                  <History size={15} />
                                </button>
                                {canManage && (
                                  <>
                                    <button type="button" onClick={() => handleOpenEdit(sig)} className="p-1.5 text-slate-600 hover:text-[#007355] hover:bg-emerald-50 rounded-lg transition cursor-pointer" title="Edit">
                                      <Edit3 size={15} />
                                    </button>
                                    <button type="button" onClick={() => setConfirmDelete(sig)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer" title="Delete">
                                      <Trash2 size={15} />
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase"><Lock size={11} /> Protected</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Phone layout: the per-column filters and one card per signature */}
            {showSigInlineFilters && (
              <div className="md:hidden bg-white border border-slate-200 rounded-2xl shadow-sm p-3 grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={sigColumnFilters.employee}
                  onChange={(e) => { setSigColumnFilters({ ...sigColumnFilters, employee: e.target.value }); setPage(1); }}
                  placeholder="Signer"
                  aria-label="Filter by signer"
                  className="w-full min-w-0 bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#007355]"
                />
                <input
                  type="text"
                  value={sigColumnFilters.empId}
                  onChange={(e) => { setSigColumnFilters({ ...sigColumnFilters, empId: e.target.value }); setPage(1); }}
                  placeholder="Employee ID"
                  aria-label="Filter by employee ID"
                  className="w-full min-w-0 bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#007355]"
                />
                <input
                  type="text"
                  value={sigColumnFilters.dept}
                  onChange={(e) => { setSigColumnFilters({ ...sigColumnFilters, dept: e.target.value }); setPage(1); }}
                  placeholder="Department"
                  aria-label="Filter by department"
                  className="w-full min-w-0 bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#007355]"
                />
                <input
                  type="text"
                  value={sigColumnFilters.signId}
                  onChange={(e) => { setSigColumnFilters({ ...sigColumnFilters, signId: e.target.value }); setPage(1); }}
                  placeholder="Signature ID"
                  aria-label="Filter by signature ID"
                  className="w-full min-w-0 bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#007355]"
                />
                <select
                  value={sigColumnFilters.status}
                  onChange={(e) => { setSigColumnFilters({ ...sigColumnFilters, status: e.target.value }); setPage(1); }}
                  aria-label="Filter by status"
                  className="w-full min-w-0 bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#007355]"
                >
                  <option value="">All statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Revoked">Revoked</option>
                </select>
                {hasActiveSigFilters && (
                  <button
                    type="button"
                    onClick={clearAllSigFilters}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                  >
                    <X size={13} /> Clear filters
                  </button>
                )}
              </div>
            )}

            <ul className="md:hidden bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100">
              {paginated.map((sig) => (
                <li key={sig.id} className="p-3 space-y-2.5 min-w-0">
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{sig.employee_name}</span>
                        {sig.is_default && <Star size={11} className="text-amber-500 fill-amber-400 shrink-0" />}
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold break-all">{sig.employee_email}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-mono font-bold text-slate-700 text-[10px] border">{sig.employee_id || '-'}</span>
                        <span className="break-words">{sig.department || 'Operations'}</span>
                      </div>
                    </div>
                    <span className="shrink-0"><Badge tone={statusTone(sig.status)}>{sig.status || 'Active'}</Badge></span>
                  </div>

                  <div className="bg-slate-50/80 rounded-xl border border-slate-200 px-2 py-1 overflow-x-auto">
                    <SignatureStamp
                      signerName={sig.employee_name}
                      signatureImage={sig.signature_image}
                      signatureStyle={sig.signature_style || 'font-signature-1'}
                      signId={sig.signature_id}
                      employeeId={sig.employee_id}
                      showBaseline
                      showByPrefix={false}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="font-mono text-[10px] text-slate-500 select-all break-all min-w-0">{sig.signature_id}</span>
                    {sig.canEdit ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => openHistory(sig)} className="w-9 h-9 inline-flex items-center justify-center text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer" title="Usage history" aria-label="Usage history">
                          <History size={16} />
                        </button>
                        {canManage && (
                          <>
                            <button type="button" onClick={() => handleOpenEdit(sig)} className="w-9 h-9 inline-flex items-center justify-center text-slate-600 hover:text-[#007355] hover:bg-emerald-50 rounded-lg transition cursor-pointer" title="Edit" aria-label="Edit signature">
                              <Edit3 size={16} />
                            </button>
                            <button type="button" onClick={() => setConfirmDelete(sig)} className="w-9 h-9 inline-flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer" title="Delete" aria-label="Delete signature">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase"><Lock size={11} /> Protected</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? 'Edit my signature' : 'Register my signature'}
        description={owner?.email ? `Saved against your account, ${owner.email}` : 'Saved against your own account'}
        icon={PenTool}
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button icon={Check} busy={saving} onClick={handleSave}>
              {editingItem ? 'Update signature' : 'Register signature'}
            </Button>
          </>
        )}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {formError && (
            <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-px" /> {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Name on the signature" required>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Vimal Chavda" className={inputClass} required />
            </Field>
            <Field label="Employee ID">
              <input type="text" value={formEmpId} onChange={(e) => setFormEmpId(e.target.value)} placeholder="e.g. EMP001" className={`${inputClass} font-mono`} />
            </Field>
            <Field label="Designation">
              <input type="text" value={formDesignation} onChange={(e) => setFormDesignation(e.target.value)} placeholder="e.g. Software Specialist" className={inputClass} />
            </Field>
            <Field label="Department">
              <input type="text" value={formDepartment} onChange={(e) => setFormDepartment(e.target.value)} placeholder="e.g. Engineering" className={inputClass} />
            </Field>
            <Field label="Status">
              <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className={inputClass}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Revoked">Revoked</option>
              </select>
            </Field>
            <label className="flex items-end gap-2 pb-2 cursor-pointer">
              <input type="checkbox" checked={formMakeDefault} onChange={(e) => setFormMakeDefault(e.target.checked)} className="w-4 h-4 rounded accent-[#007355] cursor-pointer" />
              <span className="font-bold text-slate-700">Use this as my default signature</span>
            </label>
          </div>

          <div className="pt-1">
            <span className="block font-bold text-slate-700 mb-2">Signature method</span>
            <div className="flex border-b border-slate-200 gap-4 mb-3">
              {[
                { id: 'type', label: 'TYPE', icon: null },
                { id: 'draw', label: 'DRAW', icon: PenTool },
                { id: 'upload', label: 'UPLOAD', icon: Upload }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`pb-2 text-xs font-extrabold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    method === m.id ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {m.icon ? <m.icon size={14} /> : <span className="font-serif">Aa</span>} {m.label}
                </button>
              ))}
            </div>

            {method === 'type' && (
              <div className="space-y-3 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200">
                <p className="text-[11px] text-slate-500 font-semibold">
                  Pick a handwritten font. A typed signature replaces any drawn or uploaded image you saved before.
                </p>
                <div className="space-y-2">
                  {FONT_STYLES.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setSelectedStyle(style.id)}
                      className={`w-full p-3 rounded-lg border transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                        selectedStyle === style.id ? 'border-[#00a884] bg-emerald-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <span className={`text-2xl text-slate-900 truncate ${style.id}`}>{formName || 'Your name'}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">({style.label})</span>
                      </span>
                      {selectedStyle === style.id && <Check size={16} className="text-[#00a884] shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {method === 'draw' && (
              <div className="space-y-2 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center text-[11px] gap-2">
                  <span className="font-bold text-slate-600">Draw with a mouse or your finger:</span>
                  <button type="button" onClick={clearCanvas} className="text-rose-600 font-bold hover:underline flex items-center gap-1 cursor-pointer">
                    <RotateCcw size={12} /> Clear
                  </button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={520}
                  height={140}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-36 bg-white border border-slate-300 rounded-lg cursor-crosshair shadow-inner touch-none"
                />
                {editingItem && drawnImage && !hasDrawn && (
                  <p className="text-[10px] text-slate-500 font-semibold">Your saved drawing is kept unless you draw a new one.</p>
                )}
              </div>
            )}

            {method === 'upload' && (
              <div className="space-y-3 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200 text-center">
                {uploadedImage ? (
                  <div className="space-y-2">
                    <img src={uploadedImage} alt="Uploaded signature" className="max-h-28 mx-auto object-contain border p-2 bg-white rounded-lg" />
                    <button type="button" onClick={() => setUploadedImage('')} className="text-rose-600 font-bold text-xs hover:underline cursor-pointer">
                      Remove image
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 bg-white hover:border-[#00a884] transition">
                    <Upload size={24} className="mx-auto text-slate-400 mb-2" />
                    <label className="cursor-pointer font-bold text-[#00a884] hover:underline block">
                      Click to upload a signature image
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1">PNG or JPG, transparent or clean background, up to 2MB</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <span className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px] tracking-wider">Live stamp preview</span>
            <div className="bg-slate-100/80 rounded-xl p-3 sm:p-4 border border-slate-300 flex items-center justify-center overflow-x-auto">
              <SignatureStamp
                signerName={formName || 'Your name'}
                signatureImage={method === 'upload' ? uploadedImage : (method === 'draw' ? drawnImage : '')}
                signatureStyle={selectedStyle}
                signId={editingItem?.signature_id || ''}
                employeeId={formEmpId || 'EMP001'}
                showBaseline
                showByPrefix
              />
            </div>
          </div>
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>
      </Modal>

      {/* ---------------------------------------------------- history drawer */}
      {historyFor && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs" onClick={() => setHistoryFor(null)}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Signature usage history"
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col"
          >
            <div className="px-4 sm:px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 bg-gradient-to-br from-white to-emerald-50/70">
              <div className="flex items-start gap-3 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-emerald-50 text-[#007355] flex items-center justify-center shrink-0 border border-emerald-200">
                  <History size={18} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold text-slate-900 truncate">Signature history</h2>
                  <p className="text-[11px] text-slate-500 font-mono truncate">{historyFor.signature_id}</p>
                </div>
              </div>
              <button type="button" onClick={() => setHistoryFor(null)} aria-label="Close" className="p-2 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center justify-center bg-white rounded-xl border border-slate-200 p-3 mb-3 overflow-x-auto">
                <SignatureStamp
                  signerName={historyFor.employee_name}
                  signatureImage={historyFor.signature_image}
                  signatureStyle={historyFor.signature_style}
                  signId={historyFor.signature_id}
                  employeeId={historyFor.employee_id}
                  showBaseline
                  showByPrefix={false}
                />
              </div>
              <p className="text-xs font-bold text-slate-700">
                {historySummary && historySummary.total > 0 ? (
                  <>
                    Used in <span className="text-[#007355]">{historySummary.documents}</span> document{historySummary.documents === 1 ? '' : 's'}
                    {' · '}
                    <span className="text-slate-500 font-semibold">last used {formatRelative(historySummary.lastUsedAt)}</span>
                  </>
                ) : (
                  <span className="text-slate-500 font-semibold">Not used on any document yet</span>
                )}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">
              {historyLoading ? (
                <LoadingBlock label="Loading history..." />
              ) : historyError ? (
                <ErrorBanner message={historyError} onRetry={() => openHistory(historyFor)} />
              ) : historyRows.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No usage recorded yet"
                  description="Once you sign a document with this signature, every document it stamps is listed here with the date and the request it belonged to."
                />
              ) : (
                <ol className="relative border-l-2 border-slate-200 ml-2 space-y-4">
                  {historyRows.map((row) => (
                    <li key={row.id} className="relative pl-5">
                      <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-[#00a884] ring-4 ring-emerald-50" />
                      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs hover:shadow-sm transition">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {row.document_id ? (
                              <Link
                                to={`/documents/${row.document_id}`}
                                className="text-xs font-extrabold text-slate-900 hover:text-[#007355] inline-flex items-center gap-1 break-words"
                              >
                                {row.document_name || `Document #${row.document_id}`}
                                <ExternalLink size={11} className="shrink-0" />
                              </Link>
                            ) : (
                              <span className="text-xs font-extrabold text-slate-900">{row.document_name || 'Unlinked use'}</span>
                            )}
                            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                              {CONTEXT_LABELS[row.context] || row.context}
                              {row.field_count ? ` · ${row.field_count} field${row.field_count === 1 ? '' : 's'}` : ''}
                            </p>
                          </div>
                          {row.document_status && (
                            <Badge tone={DOC_STATUS_TONE[row.document_status] || 'slate'}>{row.document_status}</Badge>
                          )}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[10px] text-slate-500 font-semibold">
                          <span className="truncate">{row.signer_name || historyFor.employee_name}</span>
                          <span className="shrink-0" title={formatDateTime(row.used_at)}>{formatRelative(row.used_at)}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete this signature?"
        message={`The signature for ${confirmDelete?.employee_name || ''} will be removed from your account and will no longer prefill your signing screens. Documents already signed with it keep their stamp.`}
        confirmLabel="Delete signature"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {toast}
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value, small = false }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 flex items-center gap-3 min-w-0">
      <span className="w-9 h-9 rounded-xl bg-emerald-50 text-[#007355] flex items-center justify-center shrink-0">
        <Icon size={17} />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 truncate">{label}</span>
        <span className={`block font-black text-slate-900 leading-tight truncate ${small ? 'text-sm mt-1' : 'text-2xl tabular-nums'}`}>{value}</span>
      </span>
    </div>
  );
}
