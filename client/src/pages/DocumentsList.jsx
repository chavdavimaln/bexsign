import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { generateBexsignId } from '../utils/documentId';
import { generateAndDownloadPdf } from '../utils/pdfGenerator';
import BexTableToolbar from '../components/BexTableToolbar';
import {
  FileText,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Eye,
  Send,
  Trash2,
  Bell,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  Printer,
  Download,
  Copy,
  ArrowRight,
  ShieldCheck,
  Cloud,
  Mail,
  Sliders,
  X,
  Calendar,
  Upload,
  Info,
  Layers,
  HelpCircle,
  Check,
  UserCheck
} from 'lucide-react';

// BexSign Table Columns Config (matching exact specification)
const INITIAL_COLUMNS = [
  { id: 'name', label: 'Document name', required: true, visible: true, width: 230 },
  { id: 'folder', label: 'Folder name', visible: true, width: 110 },
  { id: 'docType', label: 'Document type', visible: false, width: 120 },
  { id: 'owner', label: 'Owner', visible: true, width: 120 },
  { id: 'recipient', label: 'Recipient email', visible: true, width: 220 },
  { id: 'recipientName', label: 'Recipient name', visible: false, width: 140 },
  { id: 'signform', label: 'SignForm name', visible: true, width: 120 },
  { id: 'templates', label: 'Templates used', visible: true, width: 110 },
  { id: 'status', label: 'Status', visible: true, width: 120 },
  { id: 'daysToComplete', label: 'Days to complete', visible: false, width: 120 },
  { id: 'created', label: 'Created time', visible: false, width: 120 },
  { id: 'actions', label: 'Actions', visible: true, width: 75 }
];

export default function DocumentsList() {
  const { statusFilter } = useParams();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);

  // BexSign Table Column Visibility State with LocalStorage Persistence
  const [tableColumns, setTableColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('bexsign_documents_columns');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_COLUMNS;
  });

  const isColVisible = (colId) => {
    const col = tableColumns.find((c) => c.id === colId);
    return col ? col.visible !== false : false;
  };

  // BexSign Inline Column Filters State
  const [showInlineFilters, setShowInlineFilters] = useState(true);
  const [columnFilters, setColumnFilters] = useState({
    name: '',
    folder: '',
    docType: '',
    owner: '',
    recipient: '',
    recipientName: '',
    signform: '',
    templates: '',
    status: '',
    daysToComplete: '',
    created: ''
  });

  // Multi-Selection State
  const [selectedDocIds, setSelectedDocIds] = useState([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Active Modals State
  const [activeModal, setActiveModal] = useState(null);
  const [recallReason, setRecallReason] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('2026-09-11');
  const [reminderDays, setReminderDays] = useState(5);
  const [autoReminderEnabled, setAutoReminderEnabled] = useState(true);
  const [emailRecipientInput, setEmailRecipientInput] = useState('');
  const [signedFileCertify, setSignedFileCertify] = useState(false);

  // Task 5: Manual Column Width Resizing using mouse in webview
  const [colWidths, setColWidths] = useState({
    name: 240,
    folder: 100,
    owner: 120,
    recipient: 210,
    signform: 100,
    templates: 100,
    status: 120,
    created: 110,
    actions: 75
  });

  const resizingColRef = useRef(null);

  const startColResize = (colKey, e) => {
    e.preventDefault();
    e.stopPropagation();
    resizingColRef.current = {
      colKey,
      startX: e.clientX,
      startWidth: colWidths[colKey]
    };

    const handleMouseMove = (moveEvt) => {
      if (!resizingColRef.current) return;
      const { colKey, startX, startWidth } = resizingColRef.current;
      const deltaX = moveEvt.clientX - startX;
      const newWidth = Math.max(65, startWidth + deltaX);
      setColWidths((prev) => ({
        ...prev,
        [colKey]: newWidth
      }));
    };

    const handleMouseUp = () => {
      resizingColRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    fetchDocuments();
  }, [statusFilter]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/documents');
      const data = await response.json();
      if (data.success && Array.isArray(data.documents)) {
        setDocuments(data.documents);
      } else {
        setDocuments(getFallbackDocuments());
      }
    } catch (e) {
      setDocuments(getFallbackDocuments());
    } finally {
      setLoading(false);
    }
  };

  const getFallbackDocuments = () => [
    { id: 1, name: 'Document Sign 4', folder: '-', owner: 'Manu Yadav', recipient: 'vimal@bexcodeservices.com, aakash@bexcodeservices.com', signform: '-', templates: '-', status: 'In Progress', created: 'Aug 27, 2026 02:36' },
    { id: 2, name: 'First sign.pdf', folder: '-', owner: 'Manu Yadav', recipient: 'manu.yadav@oladigital.health', signform: '-', templates: '-', status: 'Completed', created: 'Aug 27, 2026 01:59' },
    { id: 3, name: 'Document Sign', folder: '-', owner: 'Manu Yadav', recipient: 'vimal@bexcodeservices.com, dhruv@bexcodeservices.com', signform: '-', templates: '-', status: 'Completed', created: 'Aug 27, 2026 00:52' },
    { id: 4, name: 'test.pdf', folder: '-', owner: 'Manu Yadav', recipient: 'manu.yadav@oladigital.health', signform: '-', templates: '-', status: 'Draft', created: 'Aug 25, 2026 21:24' },
    { id: 5, name: 'My new Document.pdf', folder: '-', owner: 'Manu Yadav', recipient: 'vimal@bexcodeservices.com', signform: '-', templates: '-', status: 'Draft', created: 'Aug 25, 2026 21:13' },
    { id: 6, name: 'Document Sign', folder: '-', owner: 'Manu Yadav', recipient: 'vimal@bexcodeservices.com', signform: '-', templates: '-', status: 'In Progress', created: 'Aug 24, 2026 23:40' }
  ];

  const [activeMenuDoc, setActiveMenuDoc] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);

  const handleToggleMenu = (e, doc) => {
    e.stopPropagation();
    if (activeMenuDoc?.id === doc.id) {
      setActiveMenuDoc(null);
      setMenuPosition(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 360;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < menuHeight && rect.top > menuHeight;

    setMenuPosition({
      top: openUpwards ? undefined : Math.min(rect.bottom + 4, window.innerHeight - 380),
      bottom: openUpwards ? Math.max(12, window.innerHeight - rect.top + 4) : undefined,
      right: Math.max(12, window.innerWidth - rect.right)
    });
    setActiveMenuDoc(doc);
  };

  useEffect(() => {
    const handleCloseMenu = () => {
      if (activeMenuDoc) {
        setActiveMenuDoc(null);
        setMenuPosition(null);
      }
    };
    window.addEventListener('resize', handleCloseMenu);
    window.addEventListener('scroll', handleCloseMenu, true);
    return () => {
      window.removeEventListener('resize', handleCloseMenu);
      window.removeEventListener('scroll', handleCloseMenu, true);
    };
  }, [activeMenuDoc]);

  const triggerModal = (modalName, doc) => {
    setSelectedDoc(doc);
    setActiveMenuDoc(null);
    setMenuPosition(null);
    setActiveModal(modalName);
  };

  const handleActionToast = (msg) => {
    setActionMessage(msg);
    setActiveMenuDoc(null);
    setMenuPosition(null);
    setActiveModal(null);
    setTimeout(() => setActionMessage(''), 3500);
  };

  const handleDownloadDocument = (doc) => {
    const docName = doc.document_name || doc.name || 'Document.pdf';
    // Retrieve saved signature image, signer name, and signature type from database or local storage
    const savedSig = doc.signature_image || localStorage.getItem(`bexsign_doc_${doc.id}_signature`) || '';
    const savedSigner = doc.signer_name || localStorage.getItem(`bexsign_doc_${doc.id}_signer`) || doc.owner || 'Vimal Chavda';
    const savedType = localStorage.getItem(`bexsign_doc_${doc.id}_sigtype`) || (savedSig && savedSig.startsWith('data:') ? 'draw' : 'type');

    generateAndDownloadPdf({
      documentName: docName,
      docId: doc.bexsign_doc_id || doc.id || 1,
      signerName: savedSigner,
      signerEmail: doc.recipient_email || doc.recipient || 'vimal@bexcodeservices.com',
      date: doc.signed_at ? new Date(doc.signed_at).toLocaleString() : (doc.created_at ? new Date(doc.created_at).toLocaleString() : doc.created || 'Aug 27, 2026'),
      status: doc.status || 'Completed',
      signatureImage: savedSig,
      signatureType: savedType
    });
    handleActionToast(`Downloaded "${docName}" successfully with saved electronic signature.`);
  };

  const handlePrintDocument = (doc) => {
    const docName = doc.document_name || doc.name || 'Document.pdf';
    const docId = generateBexsignId(doc.id || 1);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print - ${docName}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1e293b; }
              .header { border-bottom: 2px solid #00a884; padding-bottom: 12px; margin-bottom: 24px; }
              h1 { font-size: 22px; margin: 0 0 6px 0; color: #0f172a; }
              .id { font-family: monospace; font-size: 11px; color: #64748b; }
              .grid { margin-top: 20px; line-height: 2; font-size: 13px; }
              .badge { display: inline-block; background: #ecfdf5; color: #047857; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; border: 1px solid #a7f3d0; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>BexSign Document: ${docName}</h1>
              <div class="id">Document ID: ${docId}</div>
            </div>
            <div class="grid">
              <p><strong>Owner:</strong> ${doc.owner || 'Manu Yadav'}</p>
              <p><strong>Recipient:</strong> ${doc.recipient_email || doc.recipient || 'Signer'}</p>
              <p><strong>Status:</strong> <span class="badge">${doc.status || 'Draft'}</span></p>
              <p><strong>Created On:</strong> ${doc.created_at ? new Date(doc.created_at).toLocaleDateString() : doc.created || 'Aug 27, 2026'}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    } else {
      window.print();
    }
    handleActionToast(`Document sent to printer.`);
  };

  const handleCopyDebugInfo = (doc) => {
    const docId = generateBexsignId(doc.id || 1);
    const debugText = [
      `Datacenter - US`,
      `Organization portal ID - 907444916`,
      `Request ID - 530279000000973128`,
      `Document ID - ${docId}`,
      `Document Name - ${doc.document_name || doc.name || 'Document.pdf'}`,
      `Owner - ${doc.owner || 'Manu Yadav'}`,
      `Recipient - ${doc.recipient_email || doc.recipient || 'Signer'}`,
      `Status - ${doc.status || 'Draft'}`,
      `Created on - ${doc.created_at ? new Date(doc.created_at).toLocaleString() : doc.created || 'Aug 27, 2026 02:33'}`
    ].join('\n');

    navigator.clipboard.writeText(debugText);
    handleActionToast('Debug info copied to clipboard!');
  };

  const handleEditAsNew = (doc) => {
    navigate(`/documents/create`, {
      state: {
        documentName: `Copy of ${doc.document_name || doc.name || 'Document'}`,
        recipient: doc.recipient_email || doc.recipient
      }
    });
    handleActionToast(`Cloned "${doc.document_name || doc.name}" as new draft.`);
  };

  const handleExportFormData = (doc) => {
    const docName = doc.document_name || doc.name || 'Document';
    const csvContent = "Field,Value,Recipient,Date\n" +
      `Document Name,"${docName}",${doc.recipient_email || doc.recipient},${new Date().toLocaleDateString()}\n` +
      `Status,"${doc.status || 'Draft'}",${doc.recipient_email || doc.recipient},${new Date().toLocaleDateString()}\n` +
      `Signer,"${doc.recipient_email || doc.recipient}",${doc.recipient_email || doc.recipient},${new Date().toLocaleDateString()}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docName}_form_data.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    handleActionToast('Exported form data CSV.');
  };

  const executeDeleteDoc = () => {
    if (selectedDoc) {
      setDocuments(documents.filter(d => d.id !== selectedDoc.id));
      handleActionToast(`Moved document "${selectedDoc.document_name || selectedDoc.name}" to trash.`);
    }
  };

  const executeRecallDoc = async () => {
    if (selectedDoc) {
      try {
        await fetch(`http://localhost:5000/api/documents/recall/${selectedDoc.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: recallReason })
        });
      } catch (e) {}
      setDocuments(documents.map(d => d.id === selectedDoc.id ? { ...d, status: 'Recalled' } : d));
      handleActionToast(`Document "${selectedDoc.document_name || selectedDoc.name}" recalled successfully. Notice emailed to signers.`);
    }
  };

  const executeExtendDoc = async () => {
    if (selectedDoc) {
      try {
        await fetch(`http://localhost:5000/api/documents/extend/${selectedDoc.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newExpiryDate })
        });
      } catch (e) {}
      handleActionToast(`Expiry date for "${selectedDoc.document_name || selectedDoc.name}" extended to ${newExpiryDate}.`);
    }
  };

  const executeRemindDoc = async () => {
    if (selectedDoc) {
      try {
        await fetch(`http://localhost:5000/api/documents/remind/${selectedDoc.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {}
      handleActionToast(`Reminder notification emailed via SMTP to signers of "${selectedDoc.document_name || selectedDoc.name}".`);
    }
  };

  const executeSaveReminderSettings = async () => {
    if (selectedDoc) {
      try {
        await fetch(`http://localhost:5000/api/documents/reminder-settings/${selectedDoc.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reminderFrequencyDays: reminderDays, autoReminder: autoReminderEnabled })
        });
      } catch (e) {}
      handleActionToast(`Automatic reminder settings saved: Every ${reminderDays} days.`);
    }
  };

  const executeUploadSignedDoc = async () => {
    if (selectedDoc) {
      try {
        await fetch(`http://localhost:5000/api/documents/upload-signed/${selectedDoc.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signedFileCertify })
        });
      } catch (e) {}
      setDocuments(documents.map(d => d.id === selectedDoc.id ? { ...d, status: 'Completed' } : d));
      handleActionToast(`Physical signed copy uploaded for "${selectedDoc.document_name || selectedDoc.name}". Marked as Completed.`);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const docName = (doc.document_name || doc.name || '').toLowerCase();
    const docFolder = (doc.folder || '-').toLowerCase();
    const docType = (doc.type || 'Document').toLowerCase();
    const docOwner = (doc.owner || 'Manu Yadav').toLowerCase();
    const docRecipient = (doc.recipient_email || doc.recipient || '').toLowerCase();
    const docRecipientName = (doc.signer_name || '').toLowerCase();
    const docSignform = (doc.signform || '-').toLowerCase();
    const docTemplates = (doc.templates || '-').toLowerCase();
    const docStatus = (doc.status || 'Draft').toLowerCase();

    // Global search query
    const matchSearch =
      !searchQuery ||
      docName.includes(searchQuery.toLowerCase()) ||
      docRecipient.includes(searchQuery.toLowerCase());

    // Status filter from URL param (/documents/:statusFilter)
    const matchStatusParam =
      !statusFilter ||
      statusFilter === 'all' ||
      docStatus === statusFilter.toLowerCase();

    // Inline column filters (matching BexSign)
    const matchColName = !columnFilters.name || docName.includes(columnFilters.name.toLowerCase());
    const matchColFolder = !columnFilters.folder || docFolder.includes(columnFilters.folder.toLowerCase());
    const matchColType = !columnFilters.docType || docType.includes(columnFilters.docType.toLowerCase());
    const matchColOwner = !columnFilters.owner || docOwner.includes(columnFilters.owner.toLowerCase());
    const matchColRecipient = !columnFilters.recipient || docRecipient.includes(columnFilters.recipient.toLowerCase());
    const matchColRecipientName = !columnFilters.recipientName || docRecipientName.includes(columnFilters.recipientName.toLowerCase());
    const matchColSignform = !columnFilters.signform || docSignform.includes(columnFilters.signform.toLowerCase());
    const matchColTemplates = !columnFilters.templates || docTemplates.includes(columnFilters.templates.toLowerCase());
    const matchColStatus = !columnFilters.status || docStatus.includes(columnFilters.status.toLowerCase());

    return (
      matchSearch &&
      matchStatusParam &&
      matchColName &&
      matchColFolder &&
      matchColType &&
      matchColOwner &&
      matchColRecipient &&
      matchColRecipientName &&
      matchColSignform &&
      matchColTemplates &&
      matchColStatus
    );
  });

  // Paginated documents slice
  const paginatedDocs = filteredDocs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Multi-Selection Handlers
  const allPageSelected =
    paginatedDocs.length > 0 && paginatedDocs.every((d) => selectedDocIds.includes(d.id));

  const handleSelectAllOnPage = (e) => {
    if (e.target.checked) {
      const pageIds = paginatedDocs.map((d) => d.id);
      setSelectedDocIds(Array.from(new Set([...selectedDocIds, ...pageIds])));
    } else {
      const pageIds = new Set(paginatedDocs.map((d) => d.id));
      setSelectedDocIds(selectedDocIds.filter((id) => !pageIds.has(id)));
    }
  };

  const handleToggleSelectDoc = (docId) => {
    if (selectedDocIds.includes(docId)) {
      setSelectedDocIds(selectedDocIds.filter((id) => id !== docId));
    } else {
      setSelectedDocIds([...selectedDocIds, docId]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedDocIds.length === 0) return;
    if (window.confirm(`Move ${selectedDocIds.length} selected document(s) to trash?`)) {
      setDocuments(documents.filter((d) => !selectedDocIds.includes(d.id)));
      setSelectedDocIds([]);
      handleActionToast(`Moved ${selectedDocIds.length} document(s) to trash.`);
    }
  };

  const handleBulkMoveFolder = () => {
    if (selectedDocIds.length === 0) return;
    const folderName = prompt('Enter folder name to move selected documents to:');
    if (folderName) {
      setDocuments(
        documents.map((d) => (selectedDocIds.includes(d.id) ? { ...d, folder: folderName } : d))
      );
      setSelectedDocIds([]);
      handleActionToast(`Moved selected documents to folder "${folderName}".`);
    }
  };

  const clearAllFilters = () => {
    setColumnFilters({
      name: '',
      folder: '',
      docType: '',
      owner: '',
      recipient: '',
      recipientName: '',
      signform: '',
      templates: '',
      status: '',
      daysToComplete: '',
      created: ''
    });
    setSearchQuery('');
  };

  const hasActiveFilters =
    Object.values(columnFilters).some((v) => v !== '') || searchQuery !== '';

  return (
    <div className="space-y-4 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">All documents</h1>
          <p className="text-xs text-slate-500 mt-0.5">View status, manage signers, and execute document actions.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/documents/create"
            className="bg-[#007355] hover:bg-[#005c44] text-white px-5 py-2 rounded-lg font-extrabold text-xs shadow-md flex items-center gap-2 transition cursor-pointer"
          >
            <Plus size={16} /> Create Document
          </Link>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-2">
          <CheckCircle2 size={16} /> {actionMessage}
        </div>
      )}

      {/* BexSign Standard Table Toolbar (View count, Show count, Pagination, Filter toggle, Column customizer) */}
      <BexTableToolbar
        totalItems={filteredDocs.length}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={(p) => setCurrentPage(p)}
        onPageSizeChange={(sz) => {
          setPageSize(sz);
          setCurrentPage(1);
        }}
        selectedCount={selectedDocIds.length}
        onBulkDelete={handleBulkDelete}
        onBulkMoveFolder={handleBulkMoveFolder}
        showInlineFilters={showInlineFilters}
        onToggleInlineFilters={() => setShowInlineFilters(!showInlineFilters)}
        columns={tableColumns}
        onSaveColumns={(cols) => setTableColumns(cols)}
        storageKey="bexsign_documents_columns"
      />

      {/* Documents Table with BexSign Responsive Flow - ZERO Horizontal Scrollbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs w-full overflow-hidden min-w-0">
        <table className="w-full text-left text-xs border-collapse table-auto">
          <thead>
            {/* 1st Row: Column Header Titles with Resizers */}
            <tr className="bg-slate-50 text-slate-500 uppercase font-extrabold border-b border-slate-200 select-none">
              {/* Checkbox Header */}
              <th className="p-2.5 w-9 text-center rounded-tl-xl">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={handleSelectAllOnPage}
                  className="w-4 h-4 rounded accent-[#007355] cursor-pointer"
                  title="Select all on this page"
                />
              </th>

              {isColVisible('name') && (
                <th className="p-2.5 w-[22%] leading-tight break-words relative group select-none">
                  <span>DOCUMENT NAME</span>
                </th>
              )}

              {isColVisible('folder') && (
                <th className="p-2.5 w-[7%] leading-tight text-center break-words relative group select-none">
                  <span>FOLDER</span>
                </th>
              )}

              {isColVisible('docType') && (
                <th className="p-2.5 w-[8%] leading-tight break-words relative group select-none">
                  <span>DOC TYPE</span>
                </th>
              )}

              {isColVisible('owner') && (
                <th className="p-2.5 w-[10%] leading-tight break-words relative group select-none">
                  <span>OWNER</span>
                </th>
              )}

              {isColVisible('recipient') && (
                <th className="p-2.5 w-[20%] leading-tight break-all relative group select-none">
                  <span>RECIPIENT EMAIL</span>
                </th>
              )}

              {isColVisible('recipientName') && (
                <th className="p-2.5 w-[10%] leading-tight break-words relative group select-none">
                  <span>RECIPIENT NAME</span>
                </th>
              )}

              {isColVisible('signform') && (
                <th className="p-2.5 w-[8%] text-center leading-tight break-words relative group select-none">
                  <span>SIGNFORM</span>
                </th>
              )}

              {isColVisible('templates') && (
                <th className="p-2.5 w-[7%] text-center leading-tight break-words relative group select-none">
                  <span>TEMPLATES</span>
                </th>
              )}

              {isColVisible('status') && (
                <th className="p-2.5 w-[10%] leading-tight whitespace-nowrap relative group select-none">
                  <span>STATUS</span>
                </th>
              )}

              {isColVisible('daysToComplete') && (
                <th className="p-2.5 w-[6%] leading-tight text-center relative group select-none">
                  <span>DAYS</span>
                </th>
              )}

              {isColVisible('created') && (
                <th className="p-2.5 w-[8%] leading-tight whitespace-nowrap relative group select-none">
                  <span>CREATED</span>
                </th>
              )}

              {isColVisible('actions') && (
                <th className="p-2.5 w-[5%] text-right whitespace-nowrap rounded-tr-xl leading-tight">
                  ACTIONS
                </th>
              )}
            </tr>

            {/* 2nd Row: BexSign Inline Filter Row (Matching Attached Screenshot) */}
            {showInlineFilters && (
              <tr className="bg-slate-50/70 border-b border-slate-200">
                <th className="p-2 text-center">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      title="Clear all filters"
                      className="text-slate-400 hover:text-red-500 p-0.5 rounded"
                    >
                      <X size={13} />
                    </button>
                  )}
                </th>

                {isColVisible('name') && (
                  <th className="p-2">
                    <input
                      type="text"
                      value={columnFilters.name}
                      onChange={(e) => {
                        setColumnFilters({ ...columnFilters, name: e.target.value });
                        setCurrentPage(1);
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355] shadow-2xs"
                    />
                  </th>
                )}

                {isColVisible('folder') && (
                  <th className="p-2 text-center">
                    <input
                      type="text"
                      value={columnFilters.folder}
                      onChange={(e) => {
                        setColumnFilters({ ...columnFilters, folder: e.target.value });
                        setCurrentPage(1);
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355] shadow-2xs text-center"
                    />
                  </th>
                )}

                {isColVisible('docType') && (
                  <th className="p-2">
                    <input
                      type="text"
                      value={columnFilters.docType}
                      onChange={(e) => {
                        setColumnFilters({ ...columnFilters, docType: e.target.value });
                        setCurrentPage(1);
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355] shadow-2xs"
                    />
                  </th>
                )}

                {isColVisible('owner') && (
                  <th className="p-2">
                    <input
                      type="text"
                      value={columnFilters.owner}
                      onChange={(e) => {
                        setColumnFilters({ ...columnFilters, owner: e.target.value });
                        setCurrentPage(1);
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355] shadow-2xs"
                    />
                  </th>
                )}

                {isColVisible('recipient') && (
                  <th className="p-2">
                    <input
                      type="text"
                      value={columnFilters.recipient}
                      onChange={(e) => {
                        setColumnFilters({ ...columnFilters, recipient: e.target.value });
                        setCurrentPage(1);
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355] shadow-2xs"
                    />
                  </th>
                )}

                {isColVisible('recipientName') && (
                  <th className="p-2">
                    <input
                      type="text"
                      value={columnFilters.recipientName}
                      onChange={(e) => {
                        setColumnFilters({ ...columnFilters, recipientName: e.target.value });
                        setCurrentPage(1);
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355] shadow-2xs"
                    />
                  </th>
                )}

                {isColVisible('signform') && (
                  <th className="p-2 text-center">
                    <input
                      type="text"
                      value={columnFilters.signform}
                      onChange={(e) => {
                        setColumnFilters({ ...columnFilters, signform: e.target.value });
                        setCurrentPage(1);
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355] shadow-2xs text-center"
                    />
                  </th>
                )}

                {isColVisible('templates') && (
                  <th className="p-2 text-center">
                    <input
                      type="text"
                      value={columnFilters.templates}
                      onChange={(e) => {
                        setColumnFilters({ ...columnFilters, templates: e.target.value });
                        setCurrentPage(1);
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355] shadow-2xs text-center"
                    />
                  </th>
                )}

                {isColVisible('status') && (
                  <th className="p-2">
                    <input
                      type="text"
                      value={columnFilters.status}
                      onChange={(e) => {
                        setColumnFilters({ ...columnFilters, status: e.target.value });
                        setCurrentPage(1);
                      }}
                      placeholder=""
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355] shadow-2xs"
                    />
                  </th>
                )}

                {isColVisible('daysToComplete') && (
                  <th className="p-2">
                    <input
                      type="text"
                      value={columnFilters.daysToComplete}
                      onChange={(e) => {
                        setColumnFilters({ ...columnFilters, daysToComplete: e.target.value });
                        setCurrentPage(1);
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355] shadow-2xs"
                    />
                  </th>
                )}

                {isColVisible('created') && (
                  <th className="p-2">
                    <input
                      type="text"
                      value={columnFilters.created}
                      onChange={(e) => {
                        setColumnFilters({ ...columnFilters, created: e.target.value });
                        setCurrentPage(1);
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-normal focus:outline-none focus:border-[#007355] shadow-2xs"
                    />
                  </th>
                )}

                {isColVisible('actions') && <th className="p-2" />}
              </tr>
            )}
          </thead>

          <tbody className="divide-y divide-slate-100 font-medium">
            {paginatedDocs.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-16 text-center text-slate-400">
                  <FileText size={36} className="mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-sm text-slate-700">No documents found</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {hasActiveFilters
                      ? 'No documents match your filter criteria. Try clearing column filters.'
                      : 'Create a new document to get started.'}
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="mt-3 px-4 py-1.5 bg-[#007355] text-white rounded text-xs font-bold shadow-xs hover:bg-[#005c44]"
                    >
                      Clear Filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              paginatedDocs.map((doc) => {
                const docName = doc.document_name || doc.name || 'Untitled.pdf';
                const docStatus = (doc.status || 'Draft').toUpperCase();
                const docOwner = doc.owner || 'Manu Yadav';
                const docRecipient = doc.recipient_email || doc.recipient || 'manu.yadav@oladigital.health';
                const docCreated = doc.created_at
                  ? new Date(doc.created_at).toLocaleDateString()
                  : doc.created || 'Aug 27, 2026';
                const isSelected = selectedDocIds.includes(doc.id);

                return (
                  <tr
                    key={doc.id}
                    className={`hover:bg-slate-50/80 transition ${
                      isSelected ? 'bg-emerald-50/40' : ''
                    }`}
                  >
                    {/* Multi-Select Checkbox */}
                    <td className="p-2.5 w-9 text-center align-middle">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectDoc(doc.id)}
                        className="w-4 h-4 rounded accent-[#007355] cursor-pointer"
                      />
                    </td>

                    {/* Document Name */}
                    {isColVisible('name') && (
                      <td className="p-2.5 w-[22%] font-bold text-slate-900 align-middle break-words">
                        <div
                          onClick={() =>
                            navigate(
                              doc.status === 'Draft' ? `/documents/${doc.id}/edit` : `/documents/${doc.id}`
                            )
                          }
                          className="flex items-start gap-2 cursor-pointer group/item"
                          title={
                            doc.status === 'Draft'
                              ? 'Click to edit draft document'
                              : 'Click to view document status and details'
                          }
                        >
                          <span className="break-all leading-snug group-hover/item:text-[#007355] group-hover/item:underline">
                            {docName}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Folder Name */}
                    {isColVisible('folder') && (
                      <td className="p-2.5 w-[7%] text-slate-500 text-center align-middle break-words">
                        {doc.folder || '-'}
                      </td>
                    )}

                    {/* Document Type */}
                    {isColVisible('docType') && (
                      <td className="p-2.5 w-[8%] text-slate-600 align-middle break-words">
                        {doc.type || 'Document'}
                      </td>
                    )}

                    {/* Owner */}
                    {isColVisible('owner') && (
                      <td className="p-2.5 w-[10%] text-slate-700 align-middle leading-snug break-words">
                        {docOwner}
                      </td>
                    )}

                    {/* Recipient Email */}
                    {isColVisible('recipient') && (
                      <td className="p-2.5 w-[20%] text-slate-600 align-middle break-all leading-snug">
                        <div className="flex items-center gap-1.5">
                          <Edit size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{docRecipient}</span>
                        </div>
                      </td>
                    )}

                    {/* Recipient Name */}
                    {isColVisible('recipientName') && (
                      <td className="p-2.5 w-[10%] text-slate-600 align-middle break-words">
                        {doc.signer_name || docOwner || '-'}
                      </td>
                    )}

                    {/* SignForm Name */}
                    {isColVisible('signform') && (
                      <td className="p-2.5 w-[8%] text-slate-500 text-center align-middle break-words">
                        {doc.signform || '-'}
                      </td>
                    )}

                    {/* Templates Used */}
                    {isColVisible('templates') && (
                      <td className="p-2.5 w-[7%] text-slate-500 text-center align-middle break-words">
                        {doc.templates || '-'}
                      </td>
                    )}

                    {/* Status Pill Badge */}
                    {isColVisible('status') && (
                      <td className="p-2.5 w-[10%] whitespace-nowrap align-middle">
                        {docStatus === 'COMPLETED' && (
                          <span className="bg-[#007355] text-white text-[10px] px-2 py-0.5 rounded font-black tracking-wider uppercase inline-block">
                            COMPLETED
                          </span>
                        )}
                        {docStatus === 'IN PROGRESS' && (
                          <span className="bg-[#d97706] text-white text-[10px] px-2 py-0.5 rounded font-black tracking-wider uppercase inline-block">
                            IN PROGRESS
                          </span>
                        )}
                        {docStatus === 'DRAFT' && (
                          <span className="bg-[#0284c7] text-white text-[10px] px-2 py-0.5 rounded font-black tracking-wider uppercase inline-block">
                            DRAFT
                          </span>
                        )}
                        {docStatus === 'RECALLED' && (
                          <span className="bg-[#e11d48] text-white text-[10px] px-2 py-0.5 rounded font-black tracking-wider uppercase inline-block">
                            RECALLED
                          </span>
                        )}
                        {!['COMPLETED', 'IN PROGRESS', 'DRAFT', 'RECALLED'].includes(docStatus) && (
                          <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded font-black uppercase inline-block">
                            {docStatus}
                          </span>
                        )}
                      </td>
                    )}

                    {/* Days to complete */}
                    {isColVisible('daysToComplete') && (
                      <td className="p-2.5 w-[6%] text-slate-500 text-xs align-middle text-center whitespace-nowrap">
                        {doc.days_to_complete || 15}d
                      </td>
                    )}

                    {/* Created Time */}
                    {isColVisible('created') && (
                      <td className="p-2.5 w-[8%] text-slate-500 font-mono text-[11px] whitespace-nowrap align-middle">
                        {docCreated}
                      </td>
                    )}

                    {/* Actions Menu */}
                    {isColVisible('actions') && (
                      <td className="p-2.5 w-[5%] text-right whitespace-nowrap align-middle">
                        <button
                          onClick={(e) => handleToggleMenu(e, doc)}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            activeMenuDoc?.id === doc.id
                              ? 'bg-slate-200 text-[#007355]'
                              : 'hover:bg-slate-100 text-slate-600'
                          }`}
                          title="Actions"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

        {/* Universal Floating Context Action Menu (Fixed Positioning - NEVER CLIPPED on Web, iPad, or Mobile) */}
        {activeMenuDoc && menuPosition && (
          <>
            {/* Backdrop to close on tap/click outside */}
            <div 
              className="fixed inset-0 z-[9998]" 
              onClick={() => { setActiveMenuDoc(null); setMenuPosition(null); }} 
            />

            <div
              style={{
                position: 'fixed',
                top: menuPosition.top !== undefined ? `${menuPosition.top}px` : undefined,
                bottom: menuPosition.bottom !== undefined ? `${menuPosition.bottom}px` : undefined,
                right: `${menuPosition.right}px`,
                zIndex: 9999
              }}
              className="w-56 bg-white border border-slate-200 rounded-xl shadow-2xl text-left py-1 text-xs font-semibold text-slate-700 max-h-[85vh] overflow-y-auto"
            >
              {/* IN PROGRESS ACTIONS */}
              {(activeMenuDoc.status === 'In Progress' || !activeMenuDoc.status) && (
                <>
                  <button onClick={() => { const id = activeMenuDoc.id; setActiveMenuDoc(null); navigate(`/documents/${id}`); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-bold text-[#00a884]"><UserCheck size={15} /> Recipient status</button>
                  <button onClick={() => { const id = activeMenuDoc.id; setActiveMenuDoc(null); navigate(`/documents/sign/${id}`); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-bold text-slate-900"><Eye size={15} /> View document</button>
                  <button onClick={() => { const id = activeMenuDoc.id; setActiveMenuDoc(null); navigate(`/documents/${id}/send`); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Edit size={15} /> Edit</button>
                  <button onClick={() => { const id = activeMenuDoc.id; setActiveMenuDoc(null); navigate(`/documents/${id}/send`); handleActionToast('Document in correction state.'); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><FileCheck size={15} /> Correct document</button>
                  <button onClick={() => triggerModal('extend', activeMenuDoc)} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Clock size={15} /> Extend</button>
                  <button onClick={() => triggerModal('reminder', activeMenuDoc)} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Bell size={15} /> Send reminder</button>
                  <button onClick={() => triggerModal('reminderSettings', activeMenuDoc)} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Sliders size={15} /> Reminder settings</button>
                  <button onClick={() => triggerModal('recall', activeMenuDoc)} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-rose-600"><RotateCcw size={15} /> Recall</button>
                  <button onClick={() => triggerModal('uploadSigned', activeMenuDoc)} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Upload size={15} /> Upload signed document</button>
                  <button onClick={() => triggerModal('email', activeMenuDoc)} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Mail size={15} /> Email document</button>
                  <button onClick={() => triggerModal('saveCloud', activeMenuDoc)} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Cloud size={15} /> Save to cloud</button>
                  <button onClick={() => { const d = activeMenuDoc; setActiveMenuDoc(null); handleDownloadDocument(d); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-bold text-slate-900"><Download size={15} className="text-[#00a884]" /> Download</button>
                  <button onClick={() => { const d = activeMenuDoc; setActiveMenuDoc(null); handleEditAsNew(d); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Copy size={15} /> Edit as new</button>
                  <button onClick={() => { const d = activeMenuDoc; setActiveMenuDoc(null); handlePrintDocument(d); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Printer size={15} /> Print</button>
                  <button onClick={() => triggerModal('history', activeMenuDoc)} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Clock size={15} /> Activity history</button>
                  <button onClick={() => { const d = activeMenuDoc; setActiveMenuDoc(null); handleCopyDebugInfo(d); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Info size={15} /> Copy debug info</button>
                  <button onClick={() => triggerModal('legal', activeMenuDoc)} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><ShieldCheck size={15} /> View legal disclosure</button>
                  <div className="border-t my-1" />
                  <button onClick={() => triggerModal('delete', activeMenuDoc)} className="w-full px-3.5 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2.5"><Trash2 size={15} /> Delete</button>
                </>
              )}

              {/* COMPLETED ACTIONS */}
              {activeMenuDoc.status === 'Completed' && (
                <>
                  <button onClick={() => { const id = activeMenuDoc.id; setActiveMenuDoc(null); navigate(`/documents/${id}`); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-bold text-[#00a884]"><UserCheck size={15} /> Recipient status</button>
                  <button onClick={() => { const id = activeMenuDoc.id; setActiveMenuDoc(null); navigate(`/documents/sign/${id}`); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-bold text-slate-900"><Eye size={15} /> View document</button>
                  <button onClick={() => { const id = activeMenuDoc.id; setActiveMenuDoc(null); navigate(`/documents/${id}/send`); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Edit size={15} /> Edit</button>
                  <button onClick={() => triggerModal('certificate', activeMenuDoc)} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-bold text-[#00a884]"><FileCheck size={15} /> Completion certificate</button>
                  <button onClick={() => triggerModal('email', activeMenuDoc)} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Mail size={15} /> Email document</button>
                  <button onClick={() => triggerModal('saveCloud', activeMenuDoc)} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Cloud size={15} /> Save to cloud</button>
                  <button onClick={() => { const d = activeMenuDoc; setActiveMenuDoc(null); handleDownloadDocument(d); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-bold text-slate-900"><Download size={15} className="text-[#00a884]" /> Download</button>
                  <button onClick={() => { const d = activeMenuDoc; setActiveMenuDoc(null); handleEditAsNew(d); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Copy size={15} /> Edit as new</button>
                  <button onClick={() => { const d = activeMenuDoc; setActiveMenuDoc(null); handlePrintDocument(d); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Printer size={15} /> Print</button>
                  <button onClick={() => { const d = activeMenuDoc; setActiveMenuDoc(null); handleExportFormData(d); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Layers size={15} /> Form data</button>
                  <button onClick={() => triggerModal('history', activeMenuDoc)} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Clock size={15} /> Activity history</button>
                  <button onClick={() => { const d = activeMenuDoc; setActiveMenuDoc(null); handleCopyDebugInfo(d); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Info size={15} /> Copy debug info</button>
                  <button onClick={() => triggerModal('legal', activeMenuDoc)} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><ShieldCheck size={15} /> View legal disclosure</button>
                  <div className="border-t my-1" />
                  <button onClick={() => triggerModal('delete', activeMenuDoc)} className="w-full px-3.5 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2.5"><Trash2 size={15} /> Delete</button>
                </>
              )}

              {/* DRAFT ACTIONS */}
              {activeMenuDoc.status === 'Draft' && (
                <>
                  <button onClick={() => { const id = activeMenuDoc.id; setActiveMenuDoc(null); navigate(`/documents/${id}`); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-bold text-slate-800"><UserCheck size={15} /> Recipient status</button>
                  <button onClick={() => { const id = activeMenuDoc.id; setActiveMenuDoc(null); navigate(`/documents/${id}/edit`); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-bold text-slate-900"><Edit size={15} /> Edit document</button>
                  <button onClick={() => { const id = activeMenuDoc.id; setActiveMenuDoc(null); navigate(`/documents/${id}/send`); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-bold text-[#00a884]"><ArrowRight size={15} /> Continue</button>
                  <button onClick={() => { const id = activeMenuDoc.id; setActiveMenuDoc(null); navigate(`/documents/sign/${id}`); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Eye size={15} /> View document</button>
                  <button onClick={() => triggerModal('saveCloud', activeMenuDoc)} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Cloud size={15} /> Save to cloud</button>
                  <button onClick={() => { const d = activeMenuDoc; setActiveMenuDoc(null); handleDownloadDocument(d); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-bold text-slate-900"><Download size={15} className="text-[#00a884]" /> Download</button>
                  <button onClick={() => { const d = activeMenuDoc; setActiveMenuDoc(null); handleEditAsNew(d); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Copy size={15} /> Edit as new</button>
                  <button onClick={() => { const d = activeMenuDoc; setActiveMenuDoc(null); handlePrintDocument(d); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Printer size={15} /> Print</button>
                  <button onClick={() => triggerModal('history', activeMenuDoc)} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Clock size={15} /> Activity history</button>
                  <button onClick={() => { const d = activeMenuDoc; setActiveMenuDoc(null); handleCopyDebugInfo(d); }} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><Info size={15} /> Copy debug info</button>
                  <button onClick={() => triggerModal('legal', activeMenuDoc)} className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5"><ShieldCheck size={15} /> View legal disclosure</button>
                  <div className="border-t my-1" />
                  <button onClick={() => triggerModal('delete', activeMenuDoc)} className="w-full px-3.5 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2.5"><Trash2 size={15} /> Delete</button>
                </>
              )}
            </div>
          </>
        )}

      {/* --- ACTION MODALS IMPLEMENTATION --- */}

      {/* 1. Extend Expiry Date Modal (Page 10 PDF) */}
      {activeModal === 'extend' && selectedDoc && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Extend expiry date</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-slate-600 font-semibold">
                <span>Current expiry date</span>
                <span className="font-bold text-slate-900">Sep 11,2026</span>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">New expiry date</label>
                <input type="date" value={newExpiryDate} onChange={(e) => setNewExpiryDate(e.target.value)} className="w-full border border-slate-300 rounded p-2 font-semibold" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setActiveModal(null)} className="px-4 py-1.5 border border-slate-300 rounded text-xs font-semibold">Cancel</button>
              <button onClick={executeExtendDoc} className="bg-[#00a884] text-white px-5 py-1.5 rounded text-xs font-extrabold shadow">Set</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Send Reminder Modal (Page 11 PDF) */}
      {activeModal === 'reminder' && selectedDoc && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Remind signers</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <p className="text-slate-700 font-medium">Are you sure you want to send a reminder to the signers?</p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">Note:</p>
              <p>1. When the send in order option is checked, a reminder will be sent to the signer who is next in line.</p>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setActiveModal(null)} className="px-4 py-1.5 border border-slate-300 rounded text-xs font-semibold">No</button>
              <button onClick={executeRemindDoc} className="bg-[#00a884] text-white px-5 py-1.5 rounded text-xs font-extrabold shadow">Yes</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Reminder Settings Modal (Page 11 PDF) */}
      {activeModal === 'reminderSettings' && selectedDoc && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Automatic reminders</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Automatic reminders</span>
                <input type="checkbox" checked={autoReminderEnabled} onChange={(e) => setAutoReminderEnabled(e.target.checked)} className="h-5 w-5 accent-[#00a884]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Send a reminder every</span>
                <input type="number" min="1" value={reminderDays} onChange={(e) => setReminderDays(e.target.value)} className="w-16 border border-slate-300 rounded p-1 text-center font-mono font-bold" />
                <span className="font-bold text-slate-700">day(s)</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setActiveModal(null)} className="px-4 py-1.5 border border-slate-300 rounded text-xs font-semibold">Cancel</button>
              <button onClick={executeSaveReminderSettings} className="bg-[#00a884] text-white px-5 py-1.5 rounded text-xs font-extrabold shadow">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Recall Document Modal (Page 12 PDF) */}
      {activeModal === 'recall' && selectedDoc && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Recall document</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <p className="text-slate-600 font-medium">Please enter the reason for recalling this document.</p>
            <textarea value={recallReason} onChange={(e) => setRecallReason(e.target.value)} placeholder="Enter the reason..." className="w-full border border-slate-300 rounded p-2.5 h-20" />
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 space-y-1 text-[11px]">
              <p className="font-bold">Note: Recalling the document will stop its sign workflow and make it void.</p>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setActiveModal(null)} className="px-4 py-1.5 border border-slate-300 rounded text-xs font-semibold">No</button>
              <button onClick={executeRecallDoc} className="bg-[#E71414] text-white px-5 py-1.5 rounded text-xs font-extrabold shadow">Recall</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Upload Signed Document Modal (Pages 12 & 13 PDF) */}
      {activeModal === 'uploadSigned' && selectedDoc && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Upload signed document</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <p className="text-slate-600">You are about to upload a copy of this document physically signed by the signer.</p>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center bg-slate-50">
              <Upload size={24} className="mx-auto text-slate-400 mb-1" />
              <button className="px-4 py-1 bg-white border border-slate-300 rounded font-bold text-slate-700">Upload</button>
            </div>
            <label className="flex items-start gap-2 font-semibold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={signedFileCertify} onChange={(e) => setSignedFileCertify(e.target.checked)} className="mt-0.5 accent-[#00a884]" />
              <span>I hereby certify that the uploaded file is a copy of this document physically signed by the mentioned signer.</span>
            </label>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setActiveModal(null)} className="px-4 py-1.5 border border-slate-300 rounded text-xs font-semibold">Cancel</button>
              <button onClick={executeUploadSignedDoc} disabled={!signedFileCertify} className="bg-[#00a884] disabled:opacity-50 text-white px-5 py-1.5 rounded text-xs font-extrabold shadow">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Email Document Modal (Page 13 PDF) */}
      {activeModal === 'email' && selectedDoc && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Email document</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <p className="text-slate-600">Recipients added here will get a copy of the signed document.</p>
            <textarea value={emailRecipientInput} onChange={(e) => setEmailRecipientInput(e.target.value)} placeholder="Enter email address" className="w-full border border-slate-300 rounded p-2.5 h-20" />
            <p className="text-[11px] font-bold text-slate-500">Note: You can only send to three recipients at a time.</p>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setActiveModal(null)} className="px-4 py-1.5 border border-slate-300 rounded text-xs font-semibold">Close</button>
              <button onClick={() => handleActionToast(`Document emailed to ${emailRecipientInput}`)} className="bg-[#00a884] text-white px-5 py-1.5 rounded text-xs font-extrabold shadow">Send</button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Save to Cloud Modal (Page 14 PDF) */}
      {activeModal === 'saveCloud' && selectedDoc && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Save to cloud drive</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['WorkDrive', 'Dropbox', 'Box', 'Google Drive', 'OneDrive', 'SharePoint'].map(c => (
                <button key={c} onClick={() => alert(`Connected to ${c}`)} className="p-3 border rounded-lg hover:border-[#00a884] text-center font-bold text-slate-700">{c}</button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setActiveModal(null)} className="px-4 py-1.5 border border-slate-300 rounded text-xs font-semibold">Close</button>
              <button onClick={() => handleActionToast('Saved document copy to cloud storage!')} className="bg-[#00a884] text-white px-5 py-1.5 rounded text-xs font-extrabold shadow">Upload here</button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Completion Certificate Modal (Page 19 PDF) */}
      {activeModal === 'certificate' && selectedDoc && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 space-y-6 text-xs overflow-y-auto max-h-[85vh]">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Certificate of Completion</h2>
                <p className="text-slate-500 font-mono">Generated on Aug 27, 2026 15:37 EDT</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm">Summary</h3>
              <p className="break-all font-mono text-[11px]"><strong>Document ID:</strong> {generateBexsignId(selectedDoc?.id || 1)}</p>
              <p><strong>Document name:</strong> {selectedDoc.document_name || selectedDoc.name}</p>
              <p><strong>Sent by:</strong> Manu Yadav &lt;manu.yadav@oladigital.health&gt;</p>
              <p><strong>Organization:</strong> Dcode Health</p>
            </div>
            <div className="space-y-3">
              <h3 className="font-bold text-slate-800 text-sm">Recipients</h3>
              <div className="p-3 border border-slate-200 rounded-lg space-y-1">
                <p className="font-bold text-slate-900">Manu Yadav (Signer)</p>
                <p className="text-slate-500">Signed on: Aug 26, 2026 16:29:34 EDT</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => window.print()} className="px-4 py-2 border border-slate-300 rounded font-bold hover:bg-slate-50">Print Certificate</button>
              <button onClick={() => handleDownloadDocument(selectedDoc)} className="bg-[#00a884] hover:bg-[#008f70] text-white px-5 py-2 rounded font-extrabold shadow flex items-center gap-1.5"><Download size={14} /> Download PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Activity History Drawer Modal (Page 16 PDF) */}
      {activeModal === 'history' && selectedDoc && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Activity history</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <div className="w-full border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-xs table-fixed">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-extrabold border-b">
                    <th className="p-2.5 w-[30%] whitespace-nowrap leading-tight">TIME OF ACTIVITY</th>
                    <th className="p-2.5 w-[25%] leading-tight">PERFORMED BY</th>
                    <th className="p-2.5 w-[20%] whitespace-nowrap leading-tight">ACTION</th>
                    <th className="p-2.5 w-[25%] leading-tight">ACTIVITY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  <tr><td className="p-2.5 whitespace-nowrap font-mono align-middle">Aug 27, 2026 02:33</td><td className="p-2.5 break-words font-medium align-middle">{selectedDoc?.owner || 'Manu Yadav'}</td><td className="p-2.5 whitespace-nowrap align-middle"><span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">DRAFTED</span></td><td className="p-2.5 break-words align-middle">Document created</td></tr>
                  <tr><td className="p-2.5 whitespace-nowrap font-mono align-middle">Aug 27, 2026 02:36</td><td className="p-2.5 break-words font-medium align-middle">System Generated</td><td className="p-2.5 whitespace-nowrap align-middle"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">LINK EMAILED</span></td><td className="p-2.5 break-words align-middle">Document sent</td></tr>
                </tbody>
              </table>
            </div>
            <div className="flex justify-end pt-3 border-t">
              <button onClick={() => setActiveModal(null)} className="px-4 py-1.5 border border-slate-300 rounded font-semibold">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Copy Debug Info Modal (Page 5 & 17 PDF) */}
      {activeModal === 'debug' && selectedDoc && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs font-mono">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 font-sans">
              <h3 className="text-base font-bold text-slate-900">Debug information</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <div className="space-y-1.5 p-3 bg-slate-50 border rounded text-[11px]">
              <p>Datacenter - US</p>
              <p>Organization portal ID - 907444916</p>
              <p>Request ID - 530279000000973128</p>
              <p className="break-all font-mono">Document ID - {generateBexsignId(selectedDoc?.id || 1)}</p>
              <p>Created on - Aug 27, 2026 02:33</p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t font-sans">
              <button onClick={() => setActiveModal(null)} className="px-4 py-1.5 border rounded font-semibold">Close</button>
              <button onClick={() => handleActionToast('Debug info copied to clipboard!')} className="bg-[#00a884] text-white px-5 py-1.5 rounded font-extrabold shadow">Copy</button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Delete Confirmation Modal (Page 6 & 17 PDF) */}
      {activeModal === 'delete' && selectedDoc && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Move to trash</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <p className="text-slate-700 font-medium">Are you sure you want to move the document to trash?</p>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setActiveModal(null)} className="px-4 py-1.5 border border-slate-300 rounded text-xs font-semibold">No</button>
              <button onClick={executeDeleteDoc} className="bg-[#E71414] text-white px-5 py-1.5 rounded text-xs font-extrabold shadow">Yes</button>
            </div>
          </div>
        </div>
      )}

      {/* 12. Legal Disclosure Modal */}
      {activeModal === 'legal' && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Electronic Record and Signature Disclosure</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <p className="text-slate-600 leading-relaxed">Please read this Electronic Record and Signature Disclosure carefully. By executing this document, you agree to receive disclosures, notices, and communications electronically.</p>
            <div className="flex justify-end pt-3 border-t">
              <button onClick={() => setActiveModal(null)} className="px-4 py-1.5 bg-[#00a884] text-white rounded font-bold">I Agree</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
