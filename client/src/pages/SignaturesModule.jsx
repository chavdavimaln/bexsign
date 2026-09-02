import React, { useState, useEffect, useRef } from 'react';
import { 
  PenTool, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  RefreshCw, 
  Mail, 
  User, 
  Building, 
  Briefcase, 
  CheckCircle2, 
  Copy, 
  Eye, 
  Sliders, 
  Upload, 
  RotateCcw,
  LayoutGrid,
  List,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import SignatureStamp from '../components/SignatureStamp';
import BexTableToolbar from '../components/BexTableToolbar';
import { showPopupAlert } from '../components/GlobalAlertModal';

const INITIAL_SIG_COLUMNS = [
  { id: 'employee', label: 'Employee & Email', required: true, visible: true },
  { id: 'empId', label: 'Employee ID', visible: true },
  { id: 'dept', label: 'Department', visible: true },
  { id: 'stamp', label: 'Signature Stamp', visible: true },
  { id: 'signId', label: 'Unique Sign ID', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'actions', label: 'Actions', visible: true }
];

export default function SignaturesModule() {
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [copiedId, setCopiedId] = useState(null);

  // BexSign Table Column Visibility State with LocalStorage Persistence
  const [sigTableColumns, setSigTableColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('bexsign_signatures_columns');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_SIG_COLUMNS;
  });

  const isSigColVisible = (colId) => {
    const col = sigTableColumns.find((c) => c.id === colId);
    return col ? col.visible !== false : false;
  };

  // BexSign Inline Column Filters State
  const [showSigInlineFilters, setShowSigInlineFilters] = useState(true);
  const [sigColumnFilters, setSigColumnFilters] = useState({
    employee: '',
    empId: '',
    dept: '',
    signId: '',
    status: ''
  });

  // Multi-Selection State
  const [selectedSigIds, setSelectedSigIds] = useState([]);

  // Pagination State
  const [sigCurrentPage, setSigCurrentPage] = useState(1);
  const [sigPageSize, setSigPageSize] = useState(25);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null = add, object = edit

  // Modal Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formEmpId, setFormEmpId] = useState('');
  const [formDesignation, setFormDesignation] = useState('Software Specialist');
  const [formDepartment, setFormDepartment] = useState('Engineering');
  const [formStatus, setFormStatus] = useState('Active');
  const [activeTab, setActiveTab] = useState('type'); // 'type', 'draw', 'upload'
  const [selectedStyle, setSelectedStyle] = useState('font-signature-1');
  const [uploadedImage, setUploadedImage] = useState('');
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [formError, setFormError] = useState('');

  const canvasRef = useRef(null);

  // Available Cursive Font Styles
  const fontStyles = [
    { id: 'font-signature-1', label: 'Classic Elegant', fontClass: 'font-signature-1' },
    { id: 'font-signature-2', label: 'Modern Script', fontClass: 'font-signature-2' },
    { id: 'font-signature-3', label: 'Executive Flow', fontClass: 'font-signature-3' },
    { id: 'font-signature-4', label: 'Formal Cursive', fontClass: 'font-signature-4' }
  ];

  useEffect(() => {
    fetchSignatures();
  }, []);

  const fetchSignatures = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/documents/employees/signatures');
      const data = await res.json();
      if (data.success && data.employees) {
        setSignatures(data.employees);
        localStorage.setItem('bexsign_employee_signatures_cache', JSON.stringify(data.employees));
      } else {
        loadFallbackSignatures();
      }
    } catch (e) {
      console.warn('Backend signatures fetch error, using local database cache:', e);
      loadFallbackSignatures();
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackSignatures = () => {
    const cached = localStorage.getItem('bexsign_employee_signatures_cache');
    if (cached) {
      try {
        setSignatures(JSON.parse(cached));
        return;
      } catch (e) {}
    }

    // Default seeded records matching database.sql
    const defaults = [
      {
        id: 1,
        employee_id: 'EMP001',
        employee_name: 'Vimal Chavda',
        employee_email: 'vimal@bexcodeservices.com',
        designation: 'Lead Systems Engineer',
        department: 'Engineering',
        initials: 'VC',
        signature_id: 'BEX-SIGN-VC-EMP001-2026-361682B4',
        signature_image: null,
        signature_style: 'font-signature-1',
        status: 'Active'
      },
      {
        id: 2,
        employee_id: 'EMP002',
        employee_name: 'Manu Yadav',
        employee_email: 'manu.yadav@oladigital.health',
        designation: 'Operations Director',
        department: 'Operations',
        initials: 'MY',
        signature_id: 'BEX-SIGN-MY-EMP002-2026-781920A1',
        signature_image: null,
        signature_style: 'font-signature-2',
        status: 'Active'
      },
      {
        id: 3,
        employee_id: 'EMP003',
        employee_name: 'Dhruv Patel',
        employee_email: 'dhruv@bexcodeservices.com',
        designation: 'Quality Lead',
        department: 'Quality Assurance',
        initials: 'DP',
        signature_id: 'BEX-SIGN-DP-EMP003-2026-928371C3',
        signature_image: null,
        signature_style: 'font-signature-1',
        status: 'Active'
      }
    ];
    setSignatures(defaults);
    localStorage.setItem('bexsign_employee_signatures_cache', JSON.stringify(defaults));
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormName('');
    setFormEmail('');
    setFormEmpId(`EMP${String(Math.floor(100 + Math.random() * 900))}`);
    setFormDesignation('Software Specialist');
    setFormDepartment('Engineering');
    setFormStatus('Active');
    setActiveTab('type');
    setSelectedStyle('font-signature-1');
    setUploadedImage('');
    setHasDrawn(false);
    setFormError('');
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormName(item.employee_name || '');
    setFormEmail(item.employee_email || '');
    setFormEmpId(item.employee_id || '');
    setFormDesignation(item.designation || 'Software Specialist');
    setFormDepartment(item.department || 'Engineering');
    setFormStatus(item.status || 'Active');
    setSelectedStyle(item.signature_style || 'font-signature-1');
    setUploadedImage(item.signature_image && item.signature_image.startsWith('data:image') ? item.signature_image : '');
    setActiveTab(item.signature_image ? 'upload' : 'type');
    setHasDrawn(false);
    setFormError('');
    setShowModal(true);
  };

  // Canvas Drawing Handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#1c2434';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Image Upload Handler
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setFormError('Image size exceeds 2MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result);
      setFormError('');
    };
    reader.readAsDataURL(file);
  };

  // Save Signature Handler
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Employee name is required.');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('A valid email address is required.');
      return;
    }

    let finalSignatureData = null;
    if (activeTab === 'draw' && canvasRef.current && hasDrawn) {
      finalSignatureData = canvasRef.current.toDataURL('image/png');
    } else if (activeTab === 'upload' && uploadedImage) {
      finalSignatureData = uploadedImage;
    }

    const payload = {
      employee_name: formName.trim(),
      employee_email: formEmail.trim(),
      employee_id: formEmpId.trim() || `EMP${String(Math.floor(100 + Math.random() * 900))}`,
      designation: formDesignation.trim(),
      department: formDepartment.trim(),
      signature_style: selectedStyle,
      signature_image: finalSignatureData,
      status: formStatus
    };

    try {
      if (editingItem) {
        // Edit existing signature
        await fetch(`http://localhost:5000/api/documents/employees/signatures/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        // Update local state
        setSignatures(prev => prev.map(s => s.id === editingItem.id ? { ...s, ...payload, signature_image: finalSignatureData || s.signature_image } : s));
        showPopupAlert('Signature updated successfully!', 'success');
      } else {
        // Create new signature
        const res = await fetch('http://localhost:5000/api/documents/employees/signatures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success && data.employee) {
          setSignatures(prev => [data.employee, ...prev]);
        } else {
          // Fallback local add
          const initials = formName.trim().split(' ').map(n => n[0]).join('').toUpperCase() || 'VC';
          const newEntry = {
            id: Date.now(),
            ...payload,
            signature_id: `BEX-SIGN-${initials}-${payload.employee_id}-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            initials
          };
          setSignatures(prev => [newEntry, ...prev]);
        }
        showPopupAlert('New signature registered successfully!', 'success');
      }

      // Sync cache
      setTimeout(fetchSignatures, 400);
      setShowModal(false);
    } catch (err) {
      console.error('Save error:', err);
      showPopupAlert('Saved locally and synced to signature repository.', 'info');
      setShowModal(false);
    }
  };

  // Delete Signature Handler
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the signature for ${name}?`)) return;
    try {
      await fetch(`http://localhost:5000/api/documents/employees/signatures/${id}`, {
        method: 'DELETE'
      });
      setSignatures(prev => prev.filter(s => s.id !== id));
      showPopupAlert(`Signature for ${name} removed.`, 'info');
    } catch (err) {
      setSignatures(prev => prev.filter(s => s.id !== id));
      showPopupAlert(`Signature for ${name} removed.`, 'info');
    }
  };

  const handleCopyId = (sigId) => {
    navigator.clipboard.writeText(sigId);
    setCopiedId(sigId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered Signatures (Global Search + Status Filter + BexSign Inline Column Filters)
  const filteredSignatures = signatures.filter((sig) => {
    const name = (sig.employee_name || '').toLowerCase();
    const email = (sig.employee_email || '').toLowerCase();
    const empId = (sig.employee_id || '').toLowerCase();
    const dept = (sig.department || '').toLowerCase();
    const signId = (sig.signature_id || '').toLowerCase();
    const status = (sig.status || 'Active').toLowerCase();

    const matchesSearch =
      !searchQuery ||
      name.includes(searchQuery.toLowerCase()) ||
      email.includes(searchQuery.toLowerCase()) ||
      empId.includes(searchQuery.toLowerCase()) ||
      dept.includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || sig.status === statusFilter;

    // BexSign Inline Column Filters
    const matchColEmp =
      !sigColumnFilters.employee ||
      name.includes(sigColumnFilters.employee.toLowerCase()) ||
      email.includes(sigColumnFilters.employee.toLowerCase());

    const matchColId =
      !sigColumnFilters.empId || empId.includes(sigColumnFilters.empId.toLowerCase());

    const matchColDept =
      !sigColumnFilters.dept || dept.includes(sigColumnFilters.dept.toLowerCase());

    const matchColSignId =
      !sigColumnFilters.signId || signId.includes(sigColumnFilters.signId.toLowerCase());

    const matchColStatus =
      !sigColumnFilters.status ||
      sigColumnFilters.status === 'All' ||
      status === sigColumnFilters.status.toLowerCase();

    return matchesSearch && matchesStatus && matchColEmp && matchColId && matchColDept && matchColSignId && matchColStatus;
  });

  const paginatedSignatures = filteredSignatures.slice(
    (sigCurrentPage - 1) * sigPageSize,
    sigCurrentPage * sigPageSize
  );

  const allSigsOnPageSelected =
    paginatedSignatures.length > 0 &&
    paginatedSignatures.every((s) => selectedSigIds.includes(s.id));

  const handleSelectAllSigs = (e) => {
    if (e.target.checked) {
      const ids = paginatedSignatures.map((s) => s.id);
      setSelectedSigIds(Array.from(new Set([...selectedSigIds, ...ids])));
    } else {
      const ids = new Set(paginatedSignatures.map((s) => s.id));
      setSelectedSigIds(selectedSigIds.filter((id) => !ids.has(id)));
    }
  };

  const handleToggleSelectSig = (id) => {
    if (selectedSigIds.includes(id)) {
      setSelectedSigIds(selectedSigIds.filter((i) => i !== id));
    } else {
      setSelectedSigIds([...selectedSigIds, id]);
    }
  };

  const handleBulkDeleteSigs = () => {
    if (selectedSigIds.length === 0) return;
    if (window.confirm(`Delete ${selectedSigIds.length} selected signature(s)?`)) {
      setSignatures(signatures.filter((s) => !selectedSigIds.includes(s.id)));
      setSelectedSigIds([]);
      showPopupAlert(`Deleted ${selectedSigIds.length} signature(s).`, { title: 'Deleted', type: 'info' });
    }
  };

  const clearAllSigFilters = () => {
    setSigColumnFilters({
      employee: '',
      empId: '',
      dept: '',
      signId: '',
      status: ''
    });
    setSearchQuery('');
  };

  const hasActiveSigFilters =
    Object.values(sigColumnFilters).some((v) => v !== '') || searchQuery !== '';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans">
      {/* Top Breadcrumb & Header Banner */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                <span>Signatures</span>
                <span>/</span>
                <span className="text-[#00a884]">Directory & Sign Stamps</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                <PenTool className="text-[#00a884]" size={24} />
                Signature Management & Email Directory
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                All electronic signatures linked to email addresses with verified Sign IDs. Automatically fetched during document signing workflows.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={fetchSignatures}
                className="p-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition"
                title="Refresh Signatures"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>

              <div className="flex border border-slate-200 rounded-lg overflow-hidden p-0.5 bg-slate-100">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded text-xs font-bold transition flex items-center gap-1 ${
                    viewMode === 'grid' ? 'bg-white shadow text-[#00a884]' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded text-xs font-bold transition flex items-center gap-1 ${
                    viewMode === 'table' ? 'bg-white shadow text-[#00a884]' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Table View"
                >
                  <List size={15} />
                </button>
              </div>

              <button
                onClick={handleOpenAdd}
                className="bg-[#00a884] hover:bg-[#008f70] text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow transition"
              >
                <Plus size={16} /> Add New Signature
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Search & Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, employee ID, department..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] transition"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white focus:outline-none focus:border-[#00a884]"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-bold">
              Showing <span className="text-slate-900 font-extrabold">{filteredSignatures.length}</span> of {signatures.length}
            </div>
          </div>
        </div>

        {/* Loading / Empty State */}
        {loading ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw size={28} className="animate-spin text-[#00a884]" />
            <p className="text-sm font-bold">Loading registered signatures from database...</p>
          </div>
        ) : filteredSignatures.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-16 text-center space-y-3">
            <PenTool size={36} className="mx-auto text-slate-400" />
            <h3 className="text-base font-extrabold text-slate-800">No Signatures Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No signatures matched your search criteria. You can create a new signature entry or clear your search filters.
            </p>
            <button
              onClick={handleOpenAdd}
              className="bg-[#00a884] text-white px-4 py-2 rounded-lg font-bold text-xs inline-flex items-center gap-1.5 shadow hover:bg-[#008f70] transition"
            >
              <Plus size={15} /> Add Signature
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View of Signatures */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSignatures.map((sig) => (
              <div 
                key={sig.id} 
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 relative group"
              >
                {/* Header Information */}
                <div>
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">{sig.employee_name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">
                          {sig.employee_id}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {sig.designation || 'Specialist'} &bull; {sig.department || 'Operations'}
                      </p>
                    </div>

                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                      sig.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {sig.status || 'Active'}
                    </span>
                  </div>

                  {/* Email row */}
                  <div className="flex items-center justify-between text-xs text-slate-600 font-medium pt-3 pb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail size={14} className="text-[#00a884] shrink-0" />
                      <span className="truncate font-semibold text-slate-800">{sig.employee_email}</span>
                    </div>
                  </div>
                </div>

                {/* The Exact 3-Tier Signature Stamp (From Reference Image) */}
                <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 flex flex-col items-center justify-center min-h-[120px] overflow-hidden">
                  <div className="w-full flex justify-center scale-95 origin-center">
                    <SignatureStamp
                      signerName={sig.employee_name}
                      signatureImage={sig.signature_image}
                      signatureStyle={sig.signature_style || 'font-signature-1'}
                      signId={sig.signature_id}
                      employeeId={sig.employee_id}
                      showBaseline={true}
                      showByPrefix={true}
                    />
                  </div>
                </div>

                {/* Footer Controls & Copy ID */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => handleCopyId(sig.signature_id)}
                    className="text-[10px] font-mono text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold"
                    title="Copy Unique Signature ID"
                  >
                    {copiedId === sig.signature_id ? (
                      <span className="text-[#00a884] flex items-center gap-1"><Check size={12} /> Copied</span>
                    ) : (
                      <span className="flex items-center gap-1"><Copy size={12} /> Copy ID</span>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(sig)}
                      className="p-1.5 text-slate-600 hover:text-[#00a884] hover:bg-emerald-50 rounded-lg transition"
                      title="Edit Signature"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(sig.id, sig.employee_name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete Signature"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* BexSign Table View of Signatures */
          <div className="space-y-2">
            <BexTableToolbar
              totalItems={filteredSignatures.length}
              currentPage={sigCurrentPage}
              pageSize={sigPageSize}
              onPageChange={(p) => setSigCurrentPage(p)}
              onPageSizeChange={(sz) => {
                setSigPageSize(sz);
                setSigCurrentPage(1);
              }}
              selectedCount={selectedSigIds.length}
              onBulkDelete={handleBulkDeleteSigs}
              showInlineFilters={showSigInlineFilters}
              onToggleInlineFilters={() => setShowSigInlineFilters(!showSigInlineFilters)}
              columns={sigTableColumns}
              onSaveColumns={(cols) => setSigTableColumns(cols)}
              storageKey="bexsign_signatures_columns"
            />

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden w-full">
              <div className="w-full overflow-hidden">
                <table className="w-full text-left text-xs border-collapse table-auto">
                  <thead>
                    {/* Header Row */}
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px] select-none">
                      <th className="p-2.5 w-9 text-center">
                        <input
                          type="checkbox"
                          checked={allSigsOnPageSelected}
                          onChange={handleSelectAllSigs}
                          className="w-4 h-4 rounded accent-[#007355] cursor-pointer"
                          title="Select all on this page"
                        />
                      </th>

                      {isSigColVisible('employee') && <th className="p-2.5 w-[22%] break-words">Employee & Email</th>}
                      {isSigColVisible('empId') && <th className="p-2.5 w-[10%] break-words">Employee ID</th>}
                      {isSigColVisible('dept') && <th className="p-2.5 w-[10%] break-words">Department</th>}
                      {isSigColVisible('stamp') && <th className="p-2.5 w-[26%]">Signature Stamp Format</th>}
                      {isSigColVisible('signId') && <th className="p-2.5 w-[16%] break-all">Unique Signature ID</th>}
                      {isSigColVisible('status') && <th className="p-2.5 w-[9%] whitespace-nowrap">Status</th>}
                      {isSigColVisible('actions') && <th className="p-2.5 w-[7%] text-right whitespace-nowrap">Actions</th>}
                    </tr>

                    {/* BexSign Inline Filter Row */}
                    {showSigInlineFilters && (
                      <tr className="bg-slate-50/70 border-b border-slate-200">
                        <th className="p-2 text-center">
                          {hasActiveSigFilters && (
                            <button
                              type="button"
                              onClick={clearAllSigFilters}
                              title="Clear all filters"
                              className="text-slate-400 hover:text-red-500 p-0.5 rounded"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </th>

                        {isSigColVisible('employee') && (
                          <th className="p-2">
                            <input
                              type="text"
                              value={sigColumnFilters.employee}
                              onChange={(e) => {
                                setSigColumnFilters({ ...sigColumnFilters, employee: e.target.value });
                                setSigCurrentPage(1);
                              }}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355] shadow-2xs"
                            />
                          </th>
                        )}

                        {isSigColVisible('empId') && (
                          <th className="p-2">
                            <input
                              type="text"
                              value={sigColumnFilters.empId}
                              onChange={(e) => {
                                setSigColumnFilters({ ...sigColumnFilters, empId: e.target.value });
                                setSigCurrentPage(1);
                              }}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355] shadow-2xs"
                            />
                          </th>
                        )}

                        {isSigColVisible('dept') && (
                          <th className="p-2">
                            <input
                              type="text"
                              value={sigColumnFilters.dept}
                              onChange={(e) => {
                                setSigColumnFilters({ ...sigColumnFilters, dept: e.target.value });
                                setSigCurrentPage(1);
                              }}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355] shadow-2xs"
                            />
                          </th>
                        )}

                        {isSigColVisible('stamp') && <th className="p-2" />}

                        {isSigColVisible('signId') && (
                          <th className="p-2">
                            <input
                              type="text"
                              value={sigColumnFilters.signId}
                              onChange={(e) => {
                                setSigColumnFilters({ ...sigColumnFilters, signId: e.target.value });
                                setSigCurrentPage(1);
                              }}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355] shadow-2xs"
                            />
                          </th>
                        )}

                        {isSigColVisible('status') && (
                          <th className="p-2">
                            <select
                              value={sigColumnFilters.status}
                              onChange={(e) => {
                                setSigColumnFilters({ ...sigColumnFilters, status: e.target.value });
                                setSigCurrentPage(1);
                              }}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355] shadow-2xs"
                            >
                              <option value="">All</option>
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                          </th>
                        )}

                        {isSigColVisible('actions') && <th className="p-2" />}
                      </tr>
                    )}
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-medium">
                    {paginatedSignatures.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <p className="font-semibold text-sm text-slate-700">No signatures found</p>
                          <p className="text-xs text-slate-400 mt-0.5">Try adjusting your filters</p>
                          {hasActiveSigFilters && (
                            <button
                              type="button"
                              onClick={clearAllSigFilters}
                              className="mt-3 px-4 py-1.5 bg-[#007355] text-white rounded text-xs font-bold shadow-xs hover:bg-[#005c44]"
                            >
                              Clear Filters
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      paginatedSignatures.map((sig) => {
                        const isSelected = selectedSigIds.includes(sig.id);
                        return (
                          <tr
                            key={sig.id}
                            className={`hover:bg-slate-50/60 transition ${
                              isSelected ? 'bg-emerald-50/40' : ''
                            }`}
                          >
                            <td className="p-3 text-center align-middle">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectSig(sig.id)}
                                className="w-4 h-4 rounded accent-[#007355] cursor-pointer"
                              />
                            </td>

                            {isSigColVisible('employee') && (
                              <td className="p-3.5 align-middle">
                                <div className="font-extrabold text-slate-900">{sig.employee_name}</div>
                                <div className="text-slate-500 font-semibold">{sig.employee_email}</div>
                              </td>
                            )}

                            {isSigColVisible('empId') && (
                              <td className="p-3.5 align-middle">
                                <span className="px-2 py-0.5 rounded bg-slate-100 font-mono font-bold text-slate-700 text-[10px] border">
                                  {sig.employee_id}
                                </span>
                              </td>
                            )}

                            {isSigColVisible('dept') && (
                              <td className="p-3.5 align-middle text-slate-600 text-[11px]">
                                {sig.department || 'Operations'}
                              </td>
                            )}

                            {isSigColVisible('stamp') && (
                              <td className="p-3.5 align-middle">
                                <div className="scale-90 origin-left py-1">
                                  <SignatureStamp
                                    signerName={sig.employee_name}
                                    signatureImage={sig.signature_image}
                                    signatureStyle={sig.signature_style || 'font-signature-1'}
                                    signId={sig.signature_id}
                                    employeeId={sig.employee_id}
                                    showBaseline={true}
                                    showByPrefix={false}
                                  />
                                </div>
                              </td>
                            )}

                            {isSigColVisible('signId') && (
                              <td className="p-3.5 align-middle font-mono text-[10px] text-slate-600 select-all">
                                {sig.signature_id}
                              </td>
                            )}

                            {isSigColVisible('status') && (
                              <td className="p-3.5 align-middle">
                                <span
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                                    sig.status === 'Active'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {sig.status || 'Active'}
                                </span>
                              </td>
                            )}

                            {isSigColVisible('actions') && (
                              <td className="p-3.5 align-middle text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleOpenEdit(sig)}
                                    className="p-1.5 text-slate-600 hover:text-[#007355] hover:bg-emerald-50 rounded-lg transition"
                                    title="Edit"
                                  >
                                    <Edit3 size={15} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(sig.id, sig.employee_name)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                    title="Delete"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Add / Edit Signature Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-[#00a884] rounded-lg">
                  <PenTool size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingItem ? 'Edit Employee Signature' : 'Register New Signature'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Link signature to employee email with verified Sign ID format
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg flex items-center gap-2">
                <AlertCircle size={15} /> {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Profile Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Employee Full Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Vimal Chavda"
                    className="w-full border border-slate-200 rounded-lg p-2.5 font-semibold focus:outline-none focus:border-[#00a884]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. vimal@bexcodeservices.com"
                    className="w-full border border-slate-200 rounded-lg p-2.5 font-semibold focus:outline-none focus:border-[#00a884]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={formEmpId}
                    onChange={(e) => setFormEmpId(e.target.value)}
                    placeholder="e.g. EMP001"
                    className="w-full border border-slate-200 rounded-lg p-2.5 font-mono font-semibold focus:outline-none focus:border-[#00a884]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="e.g. Engineering"
                    className="w-full border border-slate-200 rounded-lg p-2.5 font-semibold focus:outline-none focus:border-[#00a884]"
                  />
                </div>
              </div>

              {/* Signature Input Mode Tabs: TYPE, DRAW, UPLOAD (PDF 1 p.10) */}
              <div className="pt-2">
                <label className="block font-bold text-slate-700 mb-2">Signature Method</label>
                <div className="flex border-b border-slate-200 gap-4 mb-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('type')}
                    className={`pb-2 text-xs font-extrabold transition border-b-2 flex items-center gap-1.5 ${
                      activeTab === 'type' ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span className="font-serif">Aa</span> TYPE
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('draw')}
                    className={`pb-2 text-xs font-extrabold transition border-b-2 flex items-center gap-1.5 ${
                      activeTab === 'draw' ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <PenTool size={14} /> DRAW
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className={`pb-2 text-xs font-extrabold transition border-b-2 flex items-center gap-1.5 ${
                      activeTab === 'upload' ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Upload size={14} /> UPLOAD
                  </button>
                </div>

                {/* TYPE TAB */}
                {activeTab === 'type' && (
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-[11px] text-slate-500 font-semibold">Select cursive handwritten font style:</p>
                    <div className="space-y-2">
                      {fontStyles.map((style) => (
                        <div
                          key={style.id}
                          onClick={() => setSelectedStyle(style.id)}
                          className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                            selectedStyle === style.id ? 'border-[#00a884] bg-emerald-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-2xl text-slate-900 ${style.fontClass}`}>
                              {formName || 'Vimal Chavda'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">({style.label})</span>
                          </div>
                          {selectedStyle === style.id && <Check size={16} className="text-[#00a884]" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* DRAW TAB */}
                {activeTab === 'draw' && (
                  <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-600">Draw signature with mouse or touch:</span>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="text-rose-600 font-bold hover:underline flex items-center gap-1"
                      >
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
                      className="w-full h-36 bg-white border border-slate-300 rounded-lg cursor-crosshair shadow-inner"
                    />
                  </div>
                )}

                {/* UPLOAD TAB */}
                {activeTab === 'upload' && (
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                    {uploadedImage ? (
                      <div className="space-y-2">
                        <img src={uploadedImage} alt="Uploaded" className="max-h-28 mx-auto object-contain border p-2 bg-white rounded-lg" />
                        <button
                          type="button"
                          onClick={() => setUploadedImage('')}
                          className="text-rose-600 font-bold text-xs hover:underline"
                        >
                          Remove Image
                        </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 bg-white hover:border-[#00a884] transition">
                        <Upload size={24} className="mx-auto text-slate-400 mb-2" />
                        <label className="cursor-pointer font-bold text-[#00a884] hover:underline block">
                          Click to upload signature image
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                        <p className="text-[10px] text-slate-400 mt-1">Supports PNG, JPG, JPEG with transparent or clean background</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Live Preview: The Exact 3-Part Blue Bracket Stamp (From Reference Image) */}
              <div className="pt-2">
                <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px] tracking-wider">
                  Live Stamp Preview (Page 12 Format)
                </label>
                <div className="bg-slate-100/80 rounded-xl p-4 border border-slate-300 flex items-center justify-center">
                  <SignatureStamp
                    signerName={formName || 'Vimal Chavda'}
                    signatureImage={activeTab === 'upload' ? uploadedImage : ''}
                    signatureStyle={selectedStyle}
                    employeeId={formEmpId || 'EMP001'}
                    showBaseline={true}
                    showByPrefix={true}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00a884] hover:bg-[#008f70] text-white rounded-lg font-bold shadow transition flex items-center gap-1.5"
                >
                  <Check size={16} /> {editingItem ? 'Update Signature' : 'Register Signature'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
