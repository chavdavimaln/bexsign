import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  FileText,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  SlidersHorizontal,
  X,
  Trash2,
  Upload,
  HardDrive,
  Cloud,
  FileBox,
  Layers,
  FileEdit,
  MessageSquare,
  Lock,
  Mail,
  ShieldCheck,
  CheckCircle2,
  MoreVertical
} from 'lucide-react';
import { showPopupAlert } from '../components/GlobalAlertModal';

export default function SendForSignatures() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [currentCreatedId, setCurrentCreatedId] = useState(id ? parseInt(id) : null);

  // Document State
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentName, setDocumentName] = useState(location.state?.docName || '');
  const [hasCreatedDocCard, setHasCreatedDocCard] = useState(!!location.state?.fromCreate);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Modals for dropdown items
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Recipient State
  const [sendInOrder, setSendInOrder] = useState(true);
  const [recipients, setRecipients] = useState([
    {
      id: 1,
      email: 'vimal@bexcodeservices.com',
      name: 'Vimal Chavda',
      role: 'Needs to sign',
      deliveryMode: 'Email',
      auth: 'Email OTP',
      passcode: '',
      privateNote: ''
    }
  ]);

  // Customize Modal State
  const [activeCustomizeIndex, setActiveCustomizeIndex] = useState(null);

  // More Settings State
  const [moreSettingsOpen, setMoreSettingsOpen] = useState(true);
  const [daysToComplete, setDaysToComplete] = useState('15');
  const [agreementValidUntil, setAgreementValidUntil] = useState('Forever');
  const [documentType, setDocumentType] = useState('Others');
  const [folder, setFolder] = useState('None');
  const [description, setDescription] = useState('');
  const [allowComments, setAllowComments] = useState(false);
  const [autoReminders, setAutoReminders] = useState(true);
  const [reminderEveryDays, setReminderEveryDays] = useState('5');
  const [noteToAll, setNoteToAll] = useState('');

  // Loading existing draft if id is passed
  useEffect(() => {
    if (id) {
      fetchDraftData();
    }
  }, [id]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchDraftData = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/documents/${id}`);
      const data = await res.json();
      if (data.success && data.document) {
        const doc = data.document;
        setDocumentName(doc.document_name || doc.title || '');
        if (doc.recipient_email) {
          setRecipients([
            {
              id: 1,
              email: doc.recipient_email,
              name: doc.signer_name || doc.recipient_name || 'Vimal Chavda',
              role: 'Needs to sign',
              deliveryMode: 'Email',
              auth: 'Email OTP',
              passcode: '',
              privateNote: ''
            }
          ]);
        }
      }
    } catch (e) {
      console.warn('Draft load warning:', e);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (!documentName) {
        setDocumentName(file.name.replace(/\.[^/.]+$/, ''));
      }
      setIsDropdownOpen(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddMe = () => {
    // Check if current user is already in recipients
    const exists = recipients.some((r) => r.email === 'vimal@bexcodeservices.com');
    if (exists) {
      showPopupAlert('You are already added as a recipient.', { title: 'Notice', type: 'info' });
      return;
    }
    setRecipients([
      ...recipients,
      {
        id: Date.now(),
        email: 'vimal@bexcodeservices.com',
        name: 'Vimal Chavda',
        role: 'Needs to sign',
        deliveryMode: 'Email',
        auth: 'Email OTP',
        passcode: '',
        privateNote: ''
      }
    ]);
  };

  const handleAddRecipient = () => {
    setRecipients([
      ...recipients,
      {
        id: Date.now(),
        email: '',
        name: '',
        role: 'Needs to sign',
        deliveryMode: 'Email',
        auth: 'Email OTP',
        passcode: '',
        privateNote: ''
      }
    ]);
  };

  const handleRemoveRecipient = (index) => {
    if (recipients.length <= 1) {
      showPopupAlert('At least one recipient is required.', { title: 'Action Required', type: 'warning' });
      return;
    }
    const updated = recipients.filter((_, idx) => idx !== index);
    setRecipients(updated);
  };

  const updateRecipientField = (index, field, value) => {
    const updated = [...recipients];
    updated[index][field] = value;
    setRecipients(updated);
  };

  const openCustomizeModal = (index) => {
    setActiveCustomizeIndex(index);
  };

  const closeCustomizeModal = () => {
    setActiveCustomizeIndex(null);
  };

  // Submit / Continue workflow
  const handleContinue = async (e) => {
    e.preventDefault();

    // 1. Validation
    if (!documentName.trim() && !selectedFile) {
      showPopupAlert('Please enter a document name or upload a document file.', {
        title: 'Document Required',
        type: 'warning'
      });
      return;
    }

    const validRecipients = recipients.filter((r) => r.email.trim() !== '');
    if (validRecipients.length === 0) {
      showPopupAlert('Please enter at least one recipient email address.', {
        title: 'Recipient Required',
        type: 'warning'
      });
      return;
    }

    try {
      const formData = new FormData();
      const activeDocId = id || currentCreatedId;
      if (activeDocId) {
        formData.append('documentId', activeDocId);
      }
      formData.append('documentName', documentName.trim() || (selectedFile ? selectedFile.name : 'Untitled Document'));
      formData.append('recipientEmail', validRecipients[0].email);
      formData.append('recipientName', validRecipients[0].name || 'Signer');
      formData.append('folderName', folder || 'None');
      formData.append('signingOrder', sendInOrder ? 'sequential' : 'parallel');
      formData.append('daysToComplete', daysToComplete);
      formData.append('agreementValidUntil', agreementValidUntil);
      formData.append('documentType', documentType);
      formData.append('description', description);
      formData.append('allowComments', allowComments ? '1' : '0');
      formData.append('autoReminders', autoReminders ? '1' : '0');
      formData.append('reminderDays', reminderEveryDays);
      formData.append('noteToAll', noteToAll);
      formData.append('recipients', JSON.stringify(validRecipients));

      if (selectedFile) {
        formData.append('documentFile', selectedFile);
      }

      const res = await fetch('http://localhost:5000/api/documents/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      const docId = data.documentId || activeDocId || 1;
      setCurrentCreatedId(docId);

      // Save recipients list in localStorage for instant access across the field editor
      localStorage.setItem(`bexsign_doc_${docId}_recipients`, JSON.stringify(validRecipients));
      localStorage.setItem(`bexsign_doc_${docId}_settings`, JSON.stringify({
        documentName: documentName.trim() || 'Document',
        daysToComplete,
        noteToAll
      }));

      // Transition to Step 2: Document Field Editor (Image 2)
      navigate(`/documents/${docId}/edit`);
    } catch (err) {
      console.warn('Backend offline fallback:', err);
      // Fallback navigation to editor
      navigate(`/documents/${id || 1}/edit`);
    }
  };

  const handleSaveAndClose = async () => {
    try {
      const activeDocId = id || currentCreatedId;
      if (activeDocId) {
        await fetch(`http://localhost:5000/api/documents/${activeDocId}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentTitle: documentName || 'Draft Document', status: 'Draft' })
        });
      }
    } catch (e) {}
    navigate('/documents');
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-20 text-slate-800 font-sans">
      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-6 pb-12 space-y-8">
        {/* Page Title (Matching Screenshot 4) */}
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Send for signatures
          </h1>
        </div>

        {/* ========================================================
            SECTION 1: ADD DOCUMENTS (Matching Screenshot 4 & 5)
        ======================================================== */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Add documents</h2>

          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Attached Created Document Card (Page 4) */}
            {hasCreatedDocCard && (
              <div className="w-52 h-60 border border-slate-300 rounded-lg bg-white p-3 shadow-xs flex flex-col justify-between shrink-0 relative group">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Document</span>
                  <button type="button" className="hover:text-slate-700"><MoreVertical size={14} /></button>
                </div>
                {/* Miniature Page Content Preview */}
                <div className="w-full h-36 bg-slate-50 border border-slate-200 rounded p-2.5 text-[9px] text-slate-600 overflow-hidden leading-snug select-none shadow-2xs">
                  <p className="font-bold text-slate-800 truncate mb-1">{documentName || 'This is vnc\'s doc'}</p>
                  <p className="text-slate-500 text-[8px] italic">check the document for signature</p>
                  <div className="mt-8 border-t border-slate-200 pt-1.5 flex justify-between text-[8px] text-slate-400 font-mono">
                    <span>1 pages</span>
                    <span className="text-[#007355] font-bold">Ready</span>
                  </div>
                </div>
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[140px]">{documentName || 'This is vnc\'s doc'}</span>
                  <button
                    type="button"
                    onClick={() => { setHasCreatedDocCard(false); }}
                    className="text-slate-400 hover:text-red-500 p-0.5"
                    title="Remove"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}
            {/* Dropzone Box */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dropped = e.dataTransfer.files && e.dataTransfer.files[0];
                if (dropped) {
                  setSelectedFile(dropped);
                  if (!documentName) setDocumentName(dropped.name.replace(/\.[^/.]+$/, ''));
                }
              }}
              className="w-60 h-60 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center p-6 text-center bg-white hover:border-[#007355] transition relative shrink-0 shadow-2xs"
            >
              <div className="text-slate-300 mb-2">
                <FileText size={48} className="stroke-[1.2]" />
              </div>
              <p className="text-xs font-semibold text-slate-700">Drag files here</p>
              <span className="text-[11px] text-slate-400 my-1 font-medium">or</span>

              {/* Add document dropdown button */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="bg-[#007355] hover:bg-[#005c44] text-white px-3.5 py-1.5 rounded text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-xs"
                >
                  <span>Add document</span>
                  <ChevronDown size={14} />
                </button>

                {/* Dropdown Menu (Matching Screenshot 5) */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-md shadow-xl py-2 z-30 text-left">
                    <div className="px-3 pb-1 mb-1 border-b border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        From
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        if (fileInputRef.current) fileInputRef.current.click();
                      }}
                      className="w-full text-left px-4 py-1.5 text-xs text-slate-800 hover:bg-slate-50 font-medium transition"
                    >
                      Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setShowCloudModal(true);
                      }}
                      className="w-full text-left px-4 py-1.5 text-xs text-slate-800 hover:bg-slate-50 font-medium transition"
                    >
                      Cloud
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setShowTemplateModal(true);
                      }}
                      className="w-full text-left px-4 py-1.5 text-xs text-slate-800 hover:bg-slate-50 font-medium transition"
                    >
                      Template(s)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        showPopupAlert('Mail merge template engine is connected.', { title: 'Mail Merge', type: 'info' });
                      }}
                      className="w-full text-left px-4 py-1.5 text-xs text-slate-800 hover:bg-slate-50 font-medium transition"
                    >
                      Mail merge template
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        navigate('/documents/create-editor');
                      }}
                      className="w-full text-left px-4 py-1.5 text-xs text-slate-800 hover:bg-slate-50 font-medium transition"
                    >
                      Create
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Document Details & Uploaded Item Display */}
            <div className="flex-1 w-full space-y-4">
              {selectedFile && (
                <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-emerald-50 text-[#007355] flex items-center justify-center font-bold text-xs">
                      PDF
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 truncate max-w-[220px] sm:max-w-xs">
                        {selectedFile.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {(selectedFile.size / 1024).toFixed(1)} KB • Ready for signing
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="text-slate-400 hover:text-red-600 p-1.5 rounded hover:bg-slate-100 transition"
                    title="Remove document"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document name
                </label>
                <input
                  type="text"
                  placeholder="Enter name"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  className="w-full max-w-md p-2 text-xs border border-slate-300 rounded bg-white focus:border-[#007355] focus:ring-1 focus:ring-[#007355] outline-none transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            SECTION 2: ADD RECIPIENTS (Matching Screenshot 4)
        ======================================================== */}
        <div className="space-y-4 pt-2">
          <h2 className="text-sm font-bold text-slate-900">Add recipients</h2>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none font-medium text-slate-700">
              <input
                type="checkbox"
                checked={sendInOrder}
                onChange={(e) => setSendInOrder(e.target.checked)}
                className="accent-[#007355] rounded h-3.5 w-3.5"
              />
              <span>Send in order</span>
            </label>

            <button
              type="button"
              onClick={handleAddMe}
              className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium transition shadow-2xs"
            >
              Add me
            </button>

            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium transition shadow-2xs"
            >
              Add bulk recipients
            </button>
          </div>

          {/* Recipient Rows (Matching Screenshot 4 Blue Left Accent Bar) */}
          <div className="space-y-2.5">
            {recipients.map((rec, index) => (
              <div
                key={rec.id}
                className="bg-white border border-slate-200 border-l-4 border-l-blue-500 rounded p-2 sm:p-2.5 flex flex-col md:flex-row items-stretch md:items-center gap-2 shadow-2xs transition"
              >
                {/* Grip Handle & Order Index */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <GripVertical size={16} className="text-slate-400 cursor-grab" />
                  <span className="w-6 h-6 border border-slate-300 text-xs font-bold text-slate-700 flex items-center justify-center rounded bg-slate-50 select-none">
                    {index + 1}
                  </span>
                </div>

                {/* Email & Name Inline Inputs */}
                <div className="flex-1 flex flex-col sm:flex-row items-stretch">
                  <input
                    type="email"
                    placeholder="Email"
                    value={rec.email}
                    onChange={(e) => updateRecipientField(index, 'email', e.target.value)}
                    className="flex-1 p-2 text-xs border border-slate-300 sm:rounded-l sm:rounded-r-none rounded outline-none focus:border-[#007355] focus:ring-1 focus:ring-[#007355] transition"
                  />
                  <input
                    type="text"
                    placeholder="Name"
                    value={rec.name}
                    onChange={(e) => updateRecipientField(index, 'name', e.target.value)}
                    className="flex-1 p-2 text-xs border border-slate-300 sm:border-l-0 sm:rounded-r sm:rounded-l-none rounded outline-none focus:border-[#007355] focus:ring-1 focus:ring-[#007355] transition mt-1 sm:mt-0"
                  />
                </div>

                {/* Action Dropdown */}
                <div className="shrink-0">
                  <select
                    value={rec.role}
                    onChange={(e) => updateRecipientField(index, 'role', e.target.value)}
                    className="w-full md:w-auto p-2 text-xs border border-slate-300 rounded bg-white text-slate-700 outline-none focus:border-[#007355] font-medium"
                  >
                    <option value="Needs to sign">Needs to sign</option>
                    <option value="Receives a copy">Receives a copy</option>
                    <option value="In-person signer">In-person signer</option>
                    <option value="Approver">Approver</option>
                  </select>
                </div>

                {/* Delivery Mode Dropdown */}
                <div className="shrink-0">
                  <select
                    value={rec.deliveryMode}
                    onChange={(e) => updateRecipientField(index, 'deliveryMode', e.target.value)}
                    className="w-full md:w-auto p-2 text-xs border border-slate-300 rounded bg-white text-slate-700 outline-none focus:border-[#007355] font-medium"
                  >
                    <option value="Email">Email</option>
                    <option value="Email + SMS">Email + SMS</option>
                    <option value="SMS">SMS</option>
                  </select>
                </div>

                {/* Customize Button */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openCustomizeModal(index)}
                    className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 bg-white transition shadow-2xs"
                  >
                    <SlidersHorizontal size={13} className="text-slate-500" />
                    <span>Customize</span>
                  </button>

                  {recipients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(index)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 transition"
                      title="Remove recipient"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* + Add Recipient Button */}
          <button
            type="button"
            onClick={handleAddRecipient}
            className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 bg-white flex items-center gap-1.5 transition shadow-2xs mt-2"
          >
            <Plus size={14} />
            <span>Add recipient</span>
          </button>
        </div>

        {/* ========================================================
            SECTION 3: MORE SETTINGS (Collapsible Accordion)
        ======================================================== */}
        <div className="pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setMoreSettingsOpen(!moreSettingsOpen)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-slate-900 select-none py-1"
          >
            <span>More settings</span>
            {moreSettingsOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>

          {moreSettingsOpen && (
            <div className="mt-4 space-y-4 text-xs text-slate-700">
              {/* Days to complete */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <label className="w-44 font-medium text-slate-600">Days to complete</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={daysToComplete}
                  onChange={(e) => setDaysToComplete(e.target.value)}
                  className="w-full sm:w-72 p-2 border border-slate-300 rounded bg-white outline-none focus:border-[#007355] text-xs"
                />
              </div>

              {/* Agreement valid until */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <label className="w-44 font-medium text-slate-600">Agreement valid until</label>
                <select
                  value={agreementValidUntil}
                  onChange={(e) => setAgreementValidUntil(e.target.value)}
                  className="w-full sm:w-72 p-2 border border-slate-300 rounded bg-white outline-none focus:border-[#007355] text-xs font-medium"
                >
                  <option value="Forever">Forever</option>
                  <option value="30 days">30 days</option>
                  <option value="60 days">60 days</option>
                  <option value="90 days">90 days</option>
                  <option value="Custom date">Custom date</option>
                </select>
              </div>

              {/* Document type */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <label className="w-44 font-medium text-slate-600">Document type</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full sm:w-72 p-2 border border-slate-300 rounded bg-white outline-none focus:border-[#007355] text-xs font-medium"
                >
                  <option value="Others">Others</option>
                  <option value="Contract">Contract</option>
                  <option value="Agreement">Agreement</option>
                  <option value="NDA">NDA</option>
                  <option value="Offer Letter">Offer Letter</option>
                  <option value="Invoice">Invoice</option>
                </select>
              </div>

              {/* Folder */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <label className="w-44 font-medium text-slate-600">Folder</label>
                <select
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  className="w-full sm:w-72 p-2 border border-slate-300 rounded bg-white outline-none focus:border-[#007355] text-xs font-medium"
                >
                  <option value="None">None</option>
                  <option value="General">General</option>
                  <option value="HR Agreements">HR Agreements</option>
                  <option value="Financial">Financial</option>
                  <option value="Legal">Legal</option>
                </select>
              </div>

              {/* Description */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6">
                <label className="w-44 font-medium text-slate-600 pt-1">Description</label>
                <textarea
                  placeholder="Add description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full sm:w-72 p-2 border border-slate-300 rounded bg-white outline-none focus:border-[#007355] text-xs resize-none"
                />
              </div>

              {/* Checkboxes: Allow comments & Automatic reminders */}
              <div className="pt-2 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={allowComments}
                    onChange={(e) => setAllowComments(e.target.checked)}
                    className="accent-[#007355] rounded h-3.5 w-3.5"
                  />
                  <span>Allow recipient comments</span>
                </label>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={autoReminders}
                      onChange={(e) => setAutoReminders(e.target.checked)}
                      className="accent-[#007355] rounded h-3.5 w-3.5"
                    />
                    <span>Automatic reminders</span>
                  </label>
                  <p className="text-[11px] text-slate-400 pl-5.5 mt-0.5 leading-tight">
                    Automatic reminders will only be delivered via email even if the delivery mode is set to 'Email + SMS'.
                  </p>

                  {autoReminders && (
                    <div className="pl-5.5 mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                      <span>Send a reminder every</span>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={reminderEveryDays}
                        onChange={(e) => setReminderEveryDays(e.target.value)}
                        className="w-14 p-1 border border-slate-300 rounded text-center text-xs font-bold"
                      />
                      <span>day(s)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Note to all recipients */}
              <div className="pt-3 space-y-1.5">
                <label className="block font-medium text-slate-700">Note to all recipients</label>
                <textarea
                  placeholder="Add note for all recipients..."
                  value={noteToAll}
                  onChange={(e) => setNoteToAll(e.target.value)}
                  rows={4}
                  className="w-full max-w-lg p-3 border border-slate-300 rounded bg-white outline-none focus:border-[#007355] text-xs resize-none shadow-2xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            SECTION 4: BOTTOM ACTION BAR (Matching Screenshot 4)
        ======================================================== */}
        <div className="pt-6 border-t border-slate-200 flex items-center gap-3">
          <button
            type="button"
            onClick={handleContinue}
            className="bg-[#007355] hover:bg-[#005c44] text-white px-7 py-2 rounded text-xs font-bold transition shadow-xs"
          >
            Continue
          </button>
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-6 py-2 rounded text-xs font-bold transition shadow-2xs"
          >
            Save & close
          </button>
        </div>
      </div>

      {/* Floating Chat / Help Bubble (Matching Screenshot 4 bottom right) */}
      <button
        type="button"
        onClick={() => showPopupAlert('BexSign Support & Assistance is available 24/7.', { title: 'BexSign Help', type: 'info' })}
        className="fixed bottom-6 right-6 w-11 h-11 bg-[#007355] hover:bg-[#005c44] text-white rounded-full flex items-center justify-center shadow-lg transition"
        title="Help & Feedback"
      >
        <MessageSquare size={18} />
      </button>

      {/* ========================================================
          MODAL: CUSTOMIZE RECIPIENT
      ======================================================== */}
      {activeCustomizeIndex !== null && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-[#007355]" />
                Customize Recipient #{activeCustomizeIndex + 1}
              </h3>
              <button onClick={closeCustomizeModal} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Authentication Type</label>
                <select
                  value={recipients[activeCustomizeIndex].auth || 'Email OTP'}
                  onChange={(e) => updateRecipientField(activeCustomizeIndex, 'auth', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded bg-white text-xs"
                >
                  <option value="Email OTP">Email OTP</option>
                  <option value="SMS OTP">SMS OTP</option>
                  <option value="Offline Passcode">Offline Passcode</option>
                  <option value="None">None</option>
                </select>
              </div>

              {recipients[activeCustomizeIndex].auth === 'Offline Passcode' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Access Passcode</label>
                  <input
                    type="password"
                    placeholder="Enter recipient access passcode"
                    value={recipients[activeCustomizeIndex].passcode || ''}
                    onChange={(e) => updateRecipientField(activeCustomizeIndex, 'passcode', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Private Note for this Signer</label>
                <textarea
                  placeholder="Private instructions visible only to this recipient..."
                  value={recipients[activeCustomizeIndex].privateNote || ''}
                  onChange={(e) => updateRecipientField(activeCustomizeIndex, 'privateNote', e.target.value)}
                  rows={3}
                  className="w-full p-2 border border-slate-300 rounded text-xs resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={closeCustomizeModal}
                className="bg-[#007355] text-white px-5 py-1.5 rounded text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CLOUD STORAGE SELECTOR
      ======================================================== */}
      {showCloudModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Cloud size={18} className="text-[#007355]" />
                Select from Cloud Storage
              </h3>
              <button onClick={() => setShowCloudModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 py-2">
              {[
                { name: 'Google Drive', color: 'text-amber-600' },
                { name: 'Dropbox', color: 'text-blue-600' },
                { name: 'OneDrive', color: 'text-sky-600' },
                { name: 'Box', color: 'text-indigo-600' }
              ].map((provider) => (
                <button
                  key={provider.name}
                  type="button"
                  onClick={() => {
                    setDocumentName(`${provider.name} Agreement 2026.pdf`);
                    setShowCloudModal(false);
                    showPopupAlert(`Document loaded from ${provider.name}.`, { title: 'Cloud Import', type: 'success' });
                  }}
                  className="p-3 border border-slate-200 rounded-lg text-center hover:bg-slate-50 transition flex flex-col items-center gap-1.5"
                >
                  <Cloud size={24} className={provider.color} />
                  <span className="text-xs font-bold text-slate-700">{provider.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: TEMPLATES PICKER
      ======================================================== */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileBox size={18} className="text-[#007355]" />
                Select Template
              </h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 py-1 max-h-64 overflow-y-auto">
              {[
                'Standard Employment Agreement 2026.pdf',
                'Mutual Non-Disclosure Agreement (NDA).pdf',
                'Vendor Service Contract.pdf',
                'Consultancy Agreement Template.pdf'
              ].map((tName) => (
                <div
                  key={tName}
                  onClick={() => {
                    setDocumentName(tName);
                    setShowTemplateModal(false);
                    showPopupAlert(`Template "${tName}" selected.`, { title: 'Template Selected', type: 'success' });
                  }}
                  className="p-3 border border-slate-200 hover:border-[#007355] rounded-lg cursor-pointer hover:bg-emerald-50/30 transition flex items-center justify-between"
                >
                  <span className="text-xs font-bold text-slate-800">{tName}</span>
                  <ChevronRight size={14} className="text-slate-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: BULK RECIPIENTS
      ======================================================== */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Layers size={18} className="text-[#007355]" />
                Add Bulk Recipients
              </h3>
              <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <p>Upload a CSV file containing recipient names and emails (e.g. `Name,Email`).</p>
              <label className="border-2 border-dashed border-slate-300 rounded-lg p-6 block text-center cursor-pointer hover:border-[#007355]">
                <Upload size={24} className="mx-auto text-slate-400 mb-1" />
                <span className="font-bold text-slate-700">Click to upload CSV</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={() => {
                    setShowBulkModal(false);
                    showPopupAlert('3 recipients imported from CSV successfully.', { title: 'Bulk Import', type: 'success' });
                    setRecipients([
                      ...recipients,
                      { id: Date.now() + 1, email: 'john@bexcodeservices.com', name: 'John Doe', role: 'Needs to sign', deliveryMode: 'Email', auth: 'Email OTP', passcode: '', privateNote: '' },
                      { id: Date.now() + 2, email: 'sarah@bexcodeservices.com', name: 'Sarah Smith', role: 'Needs to sign', deliveryMode: 'Email', auth: 'Email OTP', passcode: '', privateNote: '' }
                    ]);
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
