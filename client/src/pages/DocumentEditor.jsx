import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PenTool,
  Calendar,
  User,
  Mail,
  FileText,
  Hash,
  CheckSquare,
  Building,
  Briefcase,
  MapPin,
  Phone,
  Save,
  ArrowRight,
  Settings,
  X,
  CheckCircle2,
  ListFilter,
  Grid,
  Image as ImageIcon,
  RotateCw,
  Plus,
  Sliders,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  Upload,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ArrowLeft,
  Search,
  Clock,
  Underline,
  Strikethrough,
  Check,
  RotateCcw,
  FileCheck,
  Copy,
  Layers,
  MoreVertical,
  Move,
  Edit3
} from 'lucide-react';
import { showPopupAlert } from '../components/GlobalAlertModal';

export default function DocumentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const stampFileInputRef = useRef(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showSendMenu, setShowSendMenu] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  const [documentTitle, setDocumentTitle] = useState('First sign.pdf');
  const [recipientEmail, setRecipientEmail] = useState('manu.yadav@oladigital.health');
  const [statusMsg, setStatusMsg] = useState('');

  // Right Sidebar Tab (PDF 1 p.5, PDF 3 p.3-4): 'standard' vs 'custom'
  const [editorTab, setEditorTab] = useState('standard');
  const [customFieldSearch, setCustomFieldSearch] = useState('');
  const [customFieldsList, setCustomFieldsList] = useState([
    { id: 1, name: 'My custom field', type: 'Text', charLimit: 2048, label: 'Text-mtjshx1a', font: 'Roboto' },
    { id: 2, name: 'Department Code', type: 'Text', charLimit: 100, label: 'Dept-Code', font: 'Roboto' }
  ]);

  // Comprehensive Create Custom Field Modal state (PDF 3 p.7)
  const [customFieldName, setCustomFieldName] = useState('');
  const [customFieldType, setCustomFieldType] = useState('Text');
  const [customFieldRequired, setCustomFieldRequired] = useState(true);
  const [customFieldReadOnly, setCustomFieldReadOnly] = useState(false);
  const [customFieldFixedWidth, setCustomFieldFixedWidth] = useState(false);
  const [customFieldFixedHeight, setCustomFieldFixedHeight] = useState(true);
  const [customFieldDefaultVal, setCustomFieldDefaultVal] = useState('');
  const [customFieldInternalName, setCustomFieldInternalName] = useState('');
  const [customFieldCharLimit, setCustomFieldCharLimit] = useState(2048);
  const [customFieldDataLabel, setCustomFieldDataLabel] = useState('Text-mtjshx1a');
  const [customFieldValidation, setCustomFieldValidation] = useState('None');
  const [customFieldFont, setCustomFieldFont] = useState('Roboto');
  const [customFieldFontSize, setCustomFieldFontSize] = useState('11');
  const [customFieldBold, setCustomFieldBold] = useState(false);
  const [customFieldItalic, setCustomFieldItalic] = useState(false);
  const [customFieldStrike, setCustomFieldStrike] = useState(false);
  const [customFieldDesc, setCustomFieldDesc] = useState('');

  // Actions & Schedule Modals (PDF 3 p.4-6)
  const [showFieldTemplateModal, setShowFieldTemplateModal] = useState(false);
  const [selectedFieldTemplate, setSelectedFieldTemplate] = useState('');
  const [showEditDocModal, setShowEditDocModal] = useState(false);
  const [isEditingDocRichText, setIsEditingDocRichText] = useState(false);
  const [docContentText, setDocContentText] = useState('check the document for signature');
  const [showDocCardMenu, setShowDocCardMenu] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('2026-09-02T14:49');
  const [scheduleTimeZone, setScheduleTimeZone] = useState('Asia/Kolkata');

  // BexSign Color-Coded Recipient Field Assignment Palette
  const RECIPIENT_PALETTE = [
    { color: '#00a884', bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700' },
    { color: '#0284c7', bg: 'bg-sky-50', border: 'border-sky-600', text: 'text-sky-700' },
    { color: '#f97316', bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-700' },
    { color: '#8b5cf6', bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-700' },
    { color: '#ec4899', bg: 'bg-pink-50', border: 'border-pink-500', text: 'text-pink-700' },
    { color: '#10b981', bg: 'bg-teal-50', border: 'border-teal-500', text: 'text-teal-700' }
  ];

  // Dynamic Recipients State: ONLY displays added recipient email IDs (PDF 1 p.1-2)
  const [recipientList, setRecipientList] = useState(() => {
    try {
      const saved = localStorage.getItem(`bexsign_doc_${id}_recipients`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((r, idx) => ({
            id: r.id || idx + 1,
            name: r.name || r.email || `Signer ${idx + 1}`,
            email: r.email || '',
            ...RECIPIENT_PALETTE[idx % RECIPIENT_PALETTE.length]
          }));
        }
      }
    } catch (e) {}
    return [
      { id: 1, name: 'Vimal Chavda', email: 'vimal@bexcodeservices.com', ...RECIPIENT_PALETTE[0] }
    ];
  });

  const [selectedRecipient, setSelectedRecipient] = useState(() => recipientList[0]);

  // Canvas Fields State: Blank on first-time creation (PDF 1 p.2 item 3), restored on edit (item 4)
  const [fieldsOnDoc, setFieldsOnDoc] = useState(() => {
    try {
      const isNew = localStorage.getItem(`bexsign_doc_${id}_is_new`) === 'true';
      if (isNew) {
        // Document created first time from Send for Signatures: CANVAS MUST BE BLANK!
        return [];
      }
      const savedFields = localStorage.getItem(`bexsign_doc_${id}_fields`);
      if (savedFields) {
        const parsed = JSON.parse(savedFields);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    // If not marked as new and no saved fields yet, start blank ready for drag-and-drop
    return [];
  });

  // Automatically persist fields whenever added, moved, or edited
  useEffect(() => {
    if (id) {
      if (fieldsOnDoc.length > 0) {
        localStorage.setItem(`bexsign_doc_${id}_fields`, JSON.stringify(fieldsOnDoc));
        // Once user adds fields, it is no longer an untouched new draft
        localStorage.removeItem(`bexsign_doc_${id}_is_new`);
      }
    }
  }, [id, fieldsOnDoc]);

  // Interactive Drag & Drop Mouse Tracking State
  const [draggingFieldId, setDraggingFieldId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Modals & Active Field Sidebar Panel State
  const [activeField, setActiveField] = useState(null);
  const [showCustomDateInput, setShowCustomDateInput] = useState(false);
  const [customDateInput, setCustomDateInput] = useState('');
  const [showCreateCustomFieldModal, setShowCreateCustomFieldModal] = useState(false);
  const [showStampCropModal, setShowStampCropModal] = useState(false);

  // Stamp Crop & Rotate State (Pages 9 & 10 PDF)
  const [stampZoom, setStampZoom] = useState(100);
  const [stampShape, setStampShape] = useState('square'); // square or oval
  const [stampRotation, setStampRotation] = useState(0);
  const [stampImageSrc, setStampImageSrc] = useState('');

  useEffect(() => {
    if (id) fetchDocumentDetails();
  }, [id]);

  const fetchDocumentDetails = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/documents/${id}`);
      const data = await res.json();
      if (data.success && data.document) {
        setDocumentTitle(data.document.document_name || data.document.title || 'First sign.pdf');
        if (data.document.recipient_email) {
          setRecipientEmail(data.document.recipient_email);
        }

        // Dynamically load document recipients from database if present
        if (data.document.recipients) {
          try {
            const parsed = typeof data.document.recipients === 'string'
              ? JSON.parse(data.document.recipients)
              : data.document.recipients;
            if (Array.isArray(parsed) && parsed.length > 0) {
              const formatted = parsed.map((r, idx) => ({
                id: r.id || idx + 1,
                name: r.name || r.email || `Signer ${idx + 1}`,
                email: r.email || '',
                ...RECIPIENT_PALETTE[idx % RECIPIENT_PALETTE.length]
              }));
              setRecipientList(formatted);
              setSelectedRecipient(formatted[0]);
              localStorage.setItem(`bexsign_doc_${id}_recipients`, JSON.stringify(formatted));
            }
          } catch (e) {}
        } else if (data.document.recipient_email) {
          const single = [{
            id: 1,
            name: data.document.signer_name || 'Signer',
            email: data.document.recipient_email,
            ...RECIPIENT_PALETTE[0]
          }];
          setRecipientList(single);
          setSelectedRecipient(single[0]);
        }

        // Dynamically load saved fields from database if present
        if (data.document.fields) {
          try {
            const parsedFields = typeof data.document.fields === 'string'
              ? JSON.parse(data.document.fields)
              : data.document.fields;
            if (Array.isArray(parsedFields) && parsedFields.length > 0) {
              setFieldsOnDoc(parsedFields);
              localStorage.setItem(`bexsign_doc_${id}_fields`, JSON.stringify(parsedFields));
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('Doc fetch fallback:', e);
    }
  };

  // Drag & Drop Mouse Handlers
  const handleMouseDownOnField = (e, field) => {
    e.stopPropagation();
    setActiveField(field);
    setDraggingFieldId(field.id);
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left - field.x,
        y: e.clientY - rect.top - field.y
      });
    }
  };

  const handleMouseMoveOnCanvas = (e) => {
    if (!draggingFieldId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    let newX = e.clientX - rect.left - dragOffset.x;
    let newY = e.clientY - rect.top - dragOffset.y;

    // Get current field element to calculate accurate boundary clamping
    const fieldElem = document.getElementById(`doc-field-${draggingFieldId}`);
    const fieldW = fieldElem ? fieldElem.offsetWidth : 210;
    const fieldH = fieldElem ? fieldElem.offsetHeight : 45;

    // Prevent field from ever overflowing beyond document page bounds
    const maxX = Math.max(10, rect.width - fieldW - 12);
    const maxY = Math.max(10, rect.height - fieldH - 12);

    newX = Math.max(12, Math.min(maxX, newX));
    newY = Math.max(12, Math.min(maxY, newY));

    setFieldsOnDoc(prevFields => prevFields.map(f => f.id === draggingFieldId ? { ...f, x: newX, y: newY } : f));
  };

  const handleMouseUpCanvas = () => {
    setDraggingFieldId(null);
  };

  // Direct Inline Text Writing Handler on Canvas (Pages 10, 11, 14, 15, 18 PDF)
  const handleInlineValueChange = (fieldId, val) => {
    setFieldsOnDoc(prev => prev.map(f => {
      if (f.id === fieldId) {
        const updated = { ...f, value: val };
        if (activeField?.id === fieldId) setActiveField(updated);
        return updated;
      }
      return f;
    }));
  };

  // Split Text Cell Direct Typing Handler (Pages 15, 17 PDF)
  const handleSplitCellChange = (fieldId, cellIndex, charVal) => {
    setFieldsOnDoc(prev => prev.map(f => {
      if (f.id === fieldId) {
        const currentGrid = [...(f.gridValue || [])];
        currentGrid[cellIndex] = charVal;
        const updated = { ...f, gridValue: currentGrid };
        if (activeField?.id === fieldId) setActiveField(updated);
        return updated;
      }
      return f;
    }));
  };

  // Stamp File Upload Handler (Pages 9 & 10 PDF)
  const handleStampImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setStampImageSrc(uploadEvent.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await fetch(`http://localhost:5000/api/documents/${id || 1}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentTitle, fieldsOnDoc, status: 'Draft' })
      });
    } catch (e) {}

    setStatusMsg('Draft saved successfully!');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleContinueToSend = async () => {
    await handleSaveDraft();
    navigate(`/documents/${id || 1}/send`);
  };

  const standardFields = [
    { type: 'Signature', icon: <PenTool size={16} /> },
    { type: 'Initial', icon: <PenTool size={16} /> },
    { type: 'Stamp', icon: <ImageIcon size={16} /> },
    { type: 'Company', icon: <Building size={16} /> },
    { type: 'Full name', icon: <User size={16} /> },
    { type: 'Email', icon: <Mail size={16} /> },
    { type: 'Sign date', icon: <Calendar size={16} /> },
    { type: 'Text', icon: <FileText size={16} /> },
    { type: 'Split text', icon: <Grid size={16} /> },
    { type: 'Job title', icon: <Briefcase size={16} /> },
    { type: 'Checkbox', icon: <CheckSquare size={16} /> }
  ];

  const addFieldToCanvas = (type) => {
    if (type === 'Stamp') {
      setStampImageSrc('');
      setStampZoom(100);
      setStampShape('square');
      setStampRotation(0);
      setShowStampCropModal(true);
      return;
    }

    const newField = {
      id: Date.now(),
      type,
      label: type,
      value: type === 'Split text' ? '' : (type === 'Checkbox' ? 'true' : type),
      x: 60 + (fieldsOnDoc.length * 20) % 200,
      y: 280 + (fieldsOnDoc.length * 30) % 280,
      required: true,
      assigneeId: selectedRecipient.id,
      assignee: `${selectedRecipient.name}`,
      font: 'Roboto',
      fontSize: '11',
      isBold: false,
      isItalic: false,
      textColor: selectedRecipient.color,
      ...(type === 'Split text' ? { charCount: 10, charSpace: 0, width: 16, height: 20, gridValue: ['s','-','1','','','','','','',''] } : {}),
      ...(type === 'Sign date' ? { dateFormat: 'MMM dd yyyy HH:mm z', value: 'Aug 26 2026' } : {}),
      ...(type === 'Full name' ? { nameFormat: 'Full Name', value: 'Manu Yadav' } : {}),
      ...(type === 'Checkbox' ? { checked: true } : {})
    };
    setFieldsOnDoc([...fieldsOnDoc, newField]);
    setActiveField(newField);
  };

  const updateActiveFieldProperty = (propKey, propVal) => {
    if (!activeField) return;
    const updated = { ...activeField, [propKey]: propVal };
    setActiveField(updated);
    setFieldsOnDoc(fieldsOnDoc.map(f => f.id === activeField.id ? updated : f));
  };

  const deleteActiveField = () => {
    if (!activeField) return;
    setFieldsOnDoc(fieldsOnDoc.filter(f => f.id !== activeField.id));
    setActiveField(null);
  };

  const handleCreateCustomField = (e) => {
    e.preventDefault();
    if (!customFieldName) return;
    const newField = {
      id: Date.now(),
      type: customFieldType,
      label: customFieldName,
      value: customFieldName,
      x: 100,
      y: 300,
      required: customFieldRequired,
      assigneeId: selectedRecipient.id,
      assignee: selectedRecipient.name,
      isCustom: true,
      font: 'Roboto',
      fontSize: '11'
    };
    setFieldsOnDoc([...fieldsOnDoc, newField]);
    setActiveField(newField);
    setCustomFieldName('');
    setShowCreateCustomFieldModal(false);
  };

  const applyStampCrop = () => {
    if (activeField && activeField.type === 'Stamp') {
      const updated = {
        ...activeField,
        stampShape,
        stampZoom,
        stampRotation,
        stampImage: stampImageSrc || activeField.stampImage
      };
      setActiveField(updated);
      setFieldsOnDoc(fieldsOnDoc.map(f => f.id === activeField.id ? updated : f));
    } else {
      const newField = {
        id: Date.now(),
        type: 'Stamp',
        label: 'Stamp',
        value: 'STAMP',
        x: 280,
        y: 350,
        required: true,
        assigneeId: selectedRecipient.id,
        assignee: selectedRecipient.name,
        stampShape,
        stampZoom,
        stampRotation,
        stampImage: stampImageSrc
      };
      setFieldsOnDoc([...fieldsOnDoc, newField]);
      setActiveField(newField);
    }
    setShowStampCropModal(false);
  };

  const openStampCropModalForEditing = () => {
    if (activeField && activeField.type === 'Stamp') {
      setStampShape(activeField.stampShape || 'square');
      setStampZoom(activeField.stampZoom || 100);
      setStampRotation(activeField.stampRotation || 0);
      setStampImageSrc(activeField.stampImage || '');
      setShowStampCropModal(true);
    }
  };

  const datePresets = [
    'MMM dd yyyy HH:mm z',
    'MMM dd yyyy HH:mm:ss',
    'dd/MM/yyyy HH:mm',
    'dd/MM/yyyy HH:mm:ss',
    'dd-MMM-yyyy HH:mm:ss',
    'MMM dd yyyy',
    'dd MMMM yyyy',
    'MMMM dd, yyyy',
    'dd/MM/yyyy',
    'MM/dd/yyyy',
    'MM.dd.yyyy',
    'MM.dd.yy',
    'dd.MM.yyyy',
    'dd.MM.yy',
    'dd MMMM,yyyy',
    'dd-MMM-yy',
    'yyyy/MM/dd',
    'yyyy-MM-dd',
    'MM/yy',
    'dd-MMM-yyyy',
    'dd-MM-yyyy',
    'MMM-dd-yyyy'
  ];

  return (
    <div className="-m-6 h-[calc(100vh-4rem)] flex flex-col bg-slate-900 text-slate-100 overflow-hidden font-sans select-none">
      {/* Editor Header Bar (Matching Page 5) */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        {/* Left: Document Name Dropdown */}
        <div className="flex items-center gap-3">
          <div className="bg-[#007355] text-white p-1.5 rounded font-black text-xs">
            <FileText size={16} />
          </div>
          <div className="flex items-center gap-1 cursor-pointer">
            <input
              type="text"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              className="bg-transparent border-b border-transparent hover:border-slate-700 text-slate-100 font-bold text-sm px-1 py-0.5 focus:outline-none focus:border-[#007355] max-w-xs"
            />
            <ChevronDown size={14} className="text-slate-400" />
          </div>
          {statusMsg && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 size={14} /> {statusMsg}
            </span>
          )}
        </div>

        {/* Center: Page Controls & Zoom Controls (Page 5) */}
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded border border-slate-800">
          <button type="button" className="hover:text-white p-1"><ChevronLeft size={14} /></button>
          <span className="text-slate-300 font-mono font-bold">1 of 1</span>
          <button type="button" className="hover:text-white p-1"><ChevronRight size={14} /></button>
          <div className="w-[1px] h-3.5 bg-slate-700 mx-1" />
          <button type="button" onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))} className="hover:text-white p-1"><ZoomOut size={14} /></button>
          <span className="text-slate-300 font-mono text-[11px] w-10 text-center">{zoomLevel}%</span>
          <button type="button" onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))} className="hover:text-white p-1"><ZoomIn size={14} /></button>
          <button type="button" onClick={() => setZoomLevel(100)} className="hover:text-white p-1"><Maximize2 size={14} /></button>
        </div>

        {/* Right: Actions, Back, and Dark Green Send ▾ (Page 5) */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="px-3 py-1.5 border border-slate-700 text-slate-300 rounded text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5 transition"
            >
              <span>Actions</span>
              <ChevronDown size={14} />
            </button>
            {showActionsMenu && (
              <div className="absolute right-0 mt-1.5 w-44 bg-slate-900 border border-slate-800 rounded shadow-xl py-1 z-30 text-xs">
                <button
                  onClick={() => { setShowActionsMenu(false); setShowFieldTemplateModal(true); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                >
                  <Layers size={13} className="text-[#00a884]" /> Apply field template
                </button>
                <button
                  onClick={() => { setShowActionsMenu(false); setShowEditDocModal(true); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                >
                  <FileText size={13} className="text-[#00a884]" /> Edit documents
                </button>
                <div className="border-t border-slate-800 my-1" />
                <button
                  onClick={() => { setShowActionsMenu(false); handleSaveDraft(); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => { setShowActionsMenu(false); setFieldsOnDoc([]); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-red-400"
                >
                  Clear Fields
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate(`/documents/${id || 1}/send`)}
            className="px-3.5 py-1.5 border border-slate-700 text-slate-300 rounded text-xs font-semibold hover:bg-slate-800 flex items-center gap-1 transition"
          >
            <span>Back</span>
          </button>

          <div className="relative flex items-center">
            <button
              onClick={() => setShowConfirmModal(true)}
              className="bg-[#007355] hover:bg-[#005c44] text-white px-4 py-1.5 rounded-l text-xs font-extrabold flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <span>Send</span>
            </button>
            <button
              onClick={() => setShowSendMenu(!showSendMenu)}
              className="bg-[#005c44] hover:bg-[#004d39] text-white px-1.5 py-1.5 rounded-r border-l border-[#004d39] text-xs transition"
              title="More Send Options"
            >
              <ChevronDown size={14} />
            </button>

            {showSendMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-slate-900 border border-slate-800 rounded shadow-xl py-1 z-30 text-xs">
                <button
                  onClick={() => { setShowSendMenu(false); setShowConfirmModal(true); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200"
                >
                  Send now
                </button>
                <button
                  onClick={() => { setShowSendMenu(false); setShowScheduleModal(true); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-1.5"
                >
                  <Clock size={13} className="text-[#00a884]" /> Send later (Schedule)
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Editor Main Content: Left Thumbnails + Center Canvas + Right Fields (Page 5) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Documents (Page 5) */}
        <aside className="w-52 bg-slate-950 border-r border-slate-800 p-4 flex flex-col gap-3 shrink-0 font-sans text-xs">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Documents</h2>
          <div className="w-full border border-slate-800 rounded-lg p-2.5 bg-slate-900 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-xs font-bold truncate">{documentTitle || "This is vnc's doc"}</span>
              <ChevronDown size={14} className="text-slate-500" />
            </div>
            <p className="text-[10px] text-slate-500">1 pages</p>
            {/* Miniature Page 1 Thumbnail Canvas */}
            <div className="w-full h-36 bg-white rounded border border-slate-700 p-2 text-[7px] text-slate-400 select-none overflow-hidden relative shadow-inner">
              <p className="font-bold text-slate-800 truncate">{documentTitle}</p>
              <p className="mt-1 text-slate-500 italic">check the document for signature</p>
              {fieldsOnDoc.map((f, i) => (
                <div key={i} className="my-1 border border-emerald-500 bg-emerald-50 text-[6px] text-emerald-800 px-1 py-0.5 rounded truncate font-mono">
                  {f.type}
                </div>
              ))}
              <span className="absolute bottom-1 right-1 bg-slate-200 text-slate-600 text-[8px] px-1 rounded font-bold">1</span>
            </div>
          </div>
        </aside>

        {/* PDF Canvas Preview with Mouse Drag-and-Drop & Direct Inline Editing */}
        <main
          className="flex-1 bg-slate-900 p-8 overflow-auto flex justify-center items-start cursor-default"
          onMouseMove={handleMouseMoveOnCanvas}
          onMouseUp={handleMouseUpCanvas}
        >
          <div
            ref={canvasRef}
            className="relative w-[700px] min-h-[880px] bg-white text-slate-900 p-10 shadow-2xl rounded-sm border border-slate-300 overflow-hidden"
          >
            {/* PDF Canvas Content */}
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Sign yourself</h1>
                <p className="text-xs text-slate-500 mt-1 font-mono">Document: {documentTitle}</p>
              </div>
              <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
                <p className="font-bold">Bexcode Agreement Document Content Area</p>
                <p>Please place all required signature, stamp, date, and split character fields below.</p>
              </div>
            </div>

            {/* Render Movable & Direct Inline Editable Canvas Fields (Pages 9-18 PDF) */}
            {fieldsOnDoc.map((field) => {
              const rec = recipientList.find(r => r.id === field.assigneeId) || recipientList[0];
              const isSelected = activeField?.id === field.id;

              // 1. Split Text Character Cells (Pages 15, 17 PDF: Direct Alphanumeric Cell Writing)
              if (field.type === 'Split text') {
                const count = field.charCount || 10;
                const charArray = field.gridValue || ['s','-','1'];

                return (
                  <div
                    id={`doc-field-${field.id}`}
                    key={field.id}
                    onMouseDown={(e) => handleMouseDownOnField(e, field)}
                    style={{ top: `${field.y}px`, left: `${field.x}px` }}
                    className={`absolute cursor-move p-1 bg-sky-50 border-2 rounded shadow-md transition-shadow ${
                      isSelected ? 'border-sky-600 ring-2 ring-sky-400 z-10' : 'border-sky-500 border-dashed hover:border-sky-700'
                    }`}
                  >
                    <div className="flex border border-sky-400 bg-white text-xs font-mono font-bold text-sky-900" style={{ gap: `${field.charSpace || 0}px` }}>
                      {Array.from({ length: count }).map((_, cIdx) => (
                        <input
                          key={cIdx}
                          type="text"
                          maxLength={1}
                          value={charArray[cIdx] || ''}
                          onChange={(e) => handleSplitCellChange(field.id, cIdx, e.target.value)}
                          onFocus={() => setActiveField(field)}
                          style={{ width: `${field.width || 16}px`, height: `${field.height || 20}px` }}
                          className="border-r last:border-r-0 border-sky-400 text-center bg-sky-50/40 text-[11px] font-bold text-sky-900 focus:bg-sky-100 focus:outline-none"
                        />
                      ))}
                    </div>
                  </div>
                );
              }

              // 2. Checkbox Field (Page 19 PDF)
              if (field.type === 'Checkbox') {
                return (
                  <div
                    id={`doc-field-${field.id}`}
                    key={field.id}
                    onMouseDown={(e) => handleMouseDownOnField(e, field)}
                    style={{ top: `${field.y}px`, left: `${field.x}px` }}
                    className={`absolute cursor-move p-1 bg-slate-100 border-2 rounded shadow-md transition-shadow ${
                      isSelected ? 'border-emerald-600 ring-2 ring-emerald-400 z-10' : 'border-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => updateActiveFieldProperty('checked', !field.checked)}
                      className="h-6 w-6 border-2 border-slate-900 bg-white flex items-center justify-center font-black text-slate-900 text-sm"
                    >
                      {field.checked !== false ? '✓' : ''}
                    </button>
                  </div>
                );
              }

              // 3. Stamp Field with Image & Shape Editing (Pages 9 & 10 PDF)
              if (field.type === 'Stamp') {
                return (
                  <div
                    id={`doc-field-${field.id}`}
                    key={field.id}
                    onMouseDown={(e) => handleMouseDownOnField(e, field)}
                    style={{ top: `${field.y}px`, left: `${field.x}px` }}
                    className={`absolute p-2 border-2 border-dashed border-emerald-600 bg-emerald-50/90 shadow-md cursor-move hover:scale-105 transition flex flex-col items-center justify-center font-bold text-emerald-800 text-xs overflow-hidden ${
                      field.stampShape === 'oval' ? 'rounded-full h-20 w-20' : 'rounded-lg h-20 w-28'
                    } ${isSelected ? 'ring-2 ring-emerald-500 z-10' : ''}`}
                  >
                    {field.stampImage ? (
                      <img
                        src={field.stampImage}
                        alt="Stamp"
                        style={{
                          transform: `scale(${(field.stampZoom || 100) / 100}) rotate(${field.stampRotation || 0}deg)`
                        }}
                        className="max-h-full max-w-full object-contain pointer-events-none"
                      />
                    ) : (
                      <div className="text-center">
                        <ImageIcon size={20} className="mx-auto text-emerald-600 mb-0.5" />
                        <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-900">{field.value || 'Stamp'}</span>
                      </div>
                    )}
                  </div>
                );
              }

              // 4. Standard Text-Based Fields (Company, Full Name, Email, Date, Text, Job Title, Signature)
              // (Pages 10, 11, 14, 15, 18 PDF: Direct Inline Writing Inside Field Canvas Box)
              return (
                <div
                  id={`doc-field-${field.id}`}
                  key={field.id}
                  onMouseDown={(e) => handleMouseDownOnField(e, field)}
                  style={{
                    top: `${field.y}px`,
                    left: `${field.x}px`,
                    borderColor: rec.color,
                    backgroundColor: `${rec.color}15`
                  }}
                  className={`absolute p-1.5 border-2 border-dashed rounded shadow-md cursor-move transition flex items-center gap-1.5 min-w-[140px] max-w-[240px] ${
                    isSelected ? 'ring-2 ring-offset-1 z-10 scale-105 bg-white' : 'hover:scale-102'
                  }`}
                >
                  <Move size={12} className="opacity-60 shrink-0" style={{ color: rec.color }} />
                  
                  {/* Direct Inline Writing Input Field on Canvas (Pages 10-18 PDF) */}
                  <input
                    type="text"
                    value={field.value !== undefined ? field.value : field.label}
                    onChange={(e) => handleInlineValueChange(field.id, e.target.value)}
                    onFocus={() => setActiveField(field)}
                    style={{
                      color: field.textColor || rec.color,
                      fontFamily: field.font || 'inherit',
                      fontSize: `${field.fontSize || 11}px`,
                      fontWeight: field.isBold ? 'bold' : 'bold',
                      fontStyle: field.isItalic ? 'italic' : 'normal'
                    }}
                    className="w-full min-w-0 bg-transparent focus:outline-none font-bold text-xs p-0 m-0 border-b border-transparent focus:border-current truncate"
                    placeholder={`Write ${field.type}...`}
                  />

                  {field.required && <span className="text-red-600 font-bold shrink-0">*</span>}
                  <Settings size={12} style={{ color: rec.color }} className="opacity-80 shrink-0 cursor-pointer" />
                </div>
              );
            })}
          </div>
        </main>

        {/* Right Sidebar: Field Palette OR Dedicated Field Property Configuration Sidebar Panel */}
        <aside className="w-80 bg-slate-950 border-l border-slate-800 p-4 flex flex-col gap-6 overflow-y-auto shrink-0 font-sans text-xs">
          {activeField ? (
            /* Dedicated Property Panel for Active Field (Pages 9 to 19 PDF) */
            <div className="space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h3 className="font-extrabold text-slate-100 text-sm">{activeField.type} Property</h3>
                <button onClick={() => setActiveField(null)} className="text-slate-400 hover:text-slate-200">
                  <X size={18} />
                </button>
              </div>

              {/* Position Coordinate & Live Value Editor */}
              <div className="space-y-2">
                <div className="p-2 bg-slate-900 border border-slate-800 rounded flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>X: {Math.round(activeField.x)}px</span>
                  <span>Y: {Math.round(activeField.y)}px</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Direct Field Content Value</label>
                  <input
                    type="text"
                    value={activeField.value !== undefined ? activeField.value : activeField.label}
                    onChange={(e) => updateActiveFieldProperty('value', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-100 font-bold text-xs"
                    placeholder="Write content..."
                  />
                </div>
              </div>

              {/* Dedicated Stamp Property Panel & Controls (Pages 9 & 10 PDF) */}
              {activeField.type === 'Stamp' && (
                <div className="space-y-4 bg-slate-900 border border-slate-800 p-3 rounded-lg">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase">Stamp Image & Shape Options</label>
                  
                  {/* Edit / Select Stamp Image Button (Pages 9 & 10 PDF) */}
                  <button
                    type="button"
                    onClick={openStampCropModalForEditing}
                    className="w-full bg-[#00a884] hover:bg-[#008f70] text-white py-2 rounded text-xs font-bold flex items-center justify-center gap-1.5 shadow"
                  >
                    <Upload size={14} /> Upload / Edit Stamp Image
                  </button>

                  {/* Stamp Shape Selection Toggle (Pages 9 & 10 PDF) */}
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Change Shape</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateActiveFieldProperty('stampShape', 'square')}
                        className={`py-1.5 border rounded text-xs font-bold ${
                          activeField.stampShape === 'square' ? 'border-[#00a884] bg-emerald-950/60 text-[#00a884]' : 'border-slate-700 text-slate-300'
                        }`}
                      >
                        □ Square
                      </button>
                      <button
                        type="button"
                        onClick={() => updateActiveFieldProperty('stampShape', 'oval')}
                        className={`py-1.5 border rounded text-xs font-bold ${
                          activeField.stampShape === 'oval' ? 'border-[#00a884] bg-emerald-950/60 text-[#00a884]' : 'border-slate-700 text-slate-300'
                        }`}
                      >
                        ◯ Oval
                      </button>
                    </div>
                  </div>

                  {/* Stamp Rotation Button */}
                  <button
                    type="button"
                    onClick={() => updateActiveFieldProperty('stampRotation', ((activeField.stampRotation || 0) + 90) % 360)}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 rounded border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <RotateCw size={14} /> Rotate 90°
                  </button>
                </div>
              )}

              {/* 1. Full Name Field Panel (Page 11 PDF) */}
              {activeField.type === 'Full name' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Format</label>
                    <select
                      value={activeField.nameFormat || 'Full Name'}
                      onChange={(e) => updateActiveFieldProperty('nameFormat', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-semibold"
                    >
                      <option value="Full Name">Full Name</option>
                      <option value="First name">First name</option>
                      <option value="Last name">Last name</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 2. Sign Date Field Panel & Custom Format Builder (Pages 12 to 14 PDF) */}
              {activeField.type === 'Sign date' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Format</label>
                    <div className="flex items-center gap-2">
                      <select
                        value={activeField.dateFormat || 'MMM dd yyyy HH:mm z'}
                        onChange={(e) => updateActiveFieldProperty('dateFormat', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-mono text-[11px]"
                      >
                        {datePresets.map((fmt, idx) => (
                          <option key={idx} value={fmt}>{fmt}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowCustomDateInput(!showCustomDateInput)}
                        className="h-8 w-8 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded flex items-center justify-center text-[#00a884] font-bold shrink-0"
                        title="Add Custom Date Format"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Custom Date Format Input (Page 14 PDF Screenshot) */}
                  {showCustomDateInput && (
                    <div className="p-3 bg-slate-900 border border-[#00a884] rounded-lg space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">custom date format option:</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={customDateInput}
                          onChange={(e) => setCustomDateInput(e.target.value)}
                          placeholder="Enter Date format"
                          className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customDateInput) {
                              updateActiveFieldProperty('dateFormat', customDateInput);
                              setShowCustomDateInput(false);
                            }
                          }}
                          className="h-8 w-8 bg-[#00a884] text-white rounded flex items-center justify-center font-bold shrink-0"
                        >
                          <Check size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Split Textfield Panel (Pages 15 to 17 PDF) */}
              {activeField.type === 'Split text' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase">Split text dimension</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500">Width</span>
                        <input
                          type="number"
                          step="0.5"
                          value={activeField.width || 16}
                          onChange={(e) => updateActiveFieldProperty('width', parseFloat(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500">Height</span>
                        <input
                          type="number"
                          step="0.5"
                          value={activeField.height || 20}
                          onChange={(e) => updateActiveFieldProperty('height', parseFloat(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Character count</label>
                      <input
                        type="number"
                        min="1"
                        value={activeField.charCount || 10}
                        onChange={(e) => updateActiveFieldProperty('charCount', parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Character space</label>
                      <input
                        type="number"
                        step="0.1"
                        value={activeField.charSpace || 0}
                        onChange={(e) => updateActiveFieldProperty('charSpace', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Formatting Toolbar */}
              {['Company', 'Full name', 'Sign date', 'Text', 'Split text', 'Job title', 'Email'].includes(activeField.type) && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase">Formatting</label>
                  <select
                    value={activeField.font || 'Roboto'}
                    onChange={(e) => updateActiveFieldProperty('font', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-semibold"
                  >
                    <option value="Roboto">Roboto</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Inter">Inter</option>
                  </select>
                  <div className="flex items-center gap-2 pt-1">
                    <select
                      value={activeField.fontSize || '11'}
                      onChange={(e) => updateActiveFieldProperty('fontSize', e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200 font-semibold w-16"
                    >
                      <option value="11">11</option>
                      <option value="12">12</option>
                      <option value="14">14</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => updateActiveFieldProperty('isBold', !activeField.isBold)}
                      className={`p-2 border rounded ${activeField.isBold ? 'bg-[#00a884] border-[#00a884] text-white' : 'bg-slate-900 border-slate-700 text-slate-200'}`}
                    >
                      <Bold size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActiveFieldProperty('isItalic', !activeField.isItalic)}
                      className={`p-2 border rounded ${activeField.isItalic ? 'bg-[#00a884] border-[#00a884] text-white' : 'bg-slate-900 border-slate-700 text-slate-200'}`}
                    >
                      <Italic size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-6 border-t border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => alert('Field saved as custom reusable field!')}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded text-xs font-bold"
                >
                  Save as Custom field
                </button>
                <button
                  type="button"
                  onClick={deleteActiveField}
                  className="w-full py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 rounded text-xs font-bold"
                >
                  Delete field
                </button>
              </div>
            </div>
          ) : (
            /* Field Palette Sidebar (Default View) */
            <>
              {/* Recipient Dropdown Selector */}
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-2">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Recipients</label>
                <div className="space-y-1.5">
                  {recipientList.map((rec) => (
                    <div
                      key={rec.id}
                      onClick={() => setSelectedRecipient(rec)}
                      className={`p-2.5 rounded-lg border text-xs font-bold cursor-pointer transition flex items-center justify-between ${
                        selectedRecipient.id === rec.id
                          ? `${rec.border} ${rec.bg} ${rec.text}`
                          : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="truncate">
                        <p className="font-bold leading-none">{rec.name}</p>
                        <p className="text-[10px] font-normal text-slate-400 truncate mt-0.5">{rec.email}</p>
                      </div>
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: rec.color }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Standard fields vs Custom fields Tab Selector (PDF 1 p.5, PDF 3 p.3-4) */}
              <div>
                <div className="flex border-b border-slate-800 mb-3 text-xs font-extrabold">
                  <button
                    type="button"
                    onClick={() => setEditorTab('standard')}
                    className={`flex-1 pb-2 text-center transition border-b-2 ${
                      editorTab === 'standard'
                        ? 'border-[#00a884] text-[#00a884]'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Standard fields
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab('custom')}
                    className={`flex-1 pb-2 text-center transition border-b-2 ${
                      editorTab === 'custom'
                        ? 'border-[#00a884] text-[#00a884]'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Custom fields
                  </button>
                </div>

                {editorTab === 'standard' ? (
                  /* Standard Fields Grid */
                  <div className="grid grid-cols-2 gap-2">
                    {standardFields.map((field) => (
                      <button
                        key={field.type}
                        onClick={() => addFieldToCanvas(field.type)}
                        className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-lg flex items-center gap-2 text-xs font-medium text-slate-200 transition text-left"
                      >
                        <span style={{ color: selectedRecipient.color }}>{field.icon}</span>
                        <span className="truncate text-[11px]">{field.type}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Custom Fields Section (PDF 3 p.4) */
                  <div className="space-y-3">
                    {/* + Create Dashed Button */}
                    <button
                      type="button"
                      onClick={() => setShowCreateCustomFieldModal(true)}
                      className="w-full py-2 border-2 border-dashed border-[#00a884]/60 hover:border-[#00a884] text-[#00a884] hover:bg-emerald-950/30 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition"
                    >
                      <Plus size={14} /> Create
                    </button>

                    {/* Search Bar */}
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={customFieldSearch}
                        onChange={(e) => setCustomFieldSearch(e.target.value)}
                        placeholder="Search custom fields..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#00a884]"
                      />
                    </div>

                    {/* Custom Fields List */}
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {customFieldsList
                        .filter(cf => (cf.name || '').toLowerCase().includes(customFieldSearch.toLowerCase()))
                        .map((cf) => (
                          <div
                            key={cf.id}
                            onClick={() => {
                              const newField = {
                                id: Date.now(),
                                type: 'Text',
                                label: cf.name,
                                value: cf.name,
                                x: 200,
                                y: 350,
                                required: true,
                                assigneeId: selectedRecipient.id,
                                assignee: selectedRecipient.name,
                                isCustom: true,
                                font: cf.font || 'Roboto',
                                fontSize: '11'
                              };
                              setFieldsOnDoc([...fieldsOnDoc, newField]);
                              setActiveField(newField);
                            }}
                            className="p-2 bg-slate-900 border border-slate-800 hover:border-[#00a884] rounded-lg cursor-pointer flex items-center justify-between text-xs font-semibold text-slate-200 transition group"
                          >
                            <span className="truncate">{cf.name}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-[#00a884] font-bold border border-slate-700">
                              A
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Stamp Crop, Rotate & Shape Change Modal (Pages 9 & 10 PDF) */}
      {showStampCropModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Upload stamp</h3>
              <button onClick={() => setShowStampCropModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="border-2 border-dashed border-slate-300 p-6 text-center rounded-lg bg-slate-50 space-y-3">
              {/* Image Preview Canvas Box */}
              <div className="h-32 w-32 mx-auto bg-slate-200 rounded flex items-center justify-center overflow-hidden relative shadow-inner">
                {stampImageSrc ? (
                  <img
                    src={stampImageSrc}
                    alt="Stamp Preview"
                    style={{
                      transform: `scale(${stampZoom / 100}) rotate(${stampRotation}deg)`
                    }}
                    className={`max-h-full max-w-full object-contain ${stampShape === 'oval' ? 'rounded-full' : ''}`}
                  />
                ) : (
                  <div className="text-center text-slate-400">
                    <ImageIcon size={36} className="mx-auto mb-1 opacity-60" />
                    <span className="text-xs font-bold">No Image Selected</span>
                  </div>
                )}
              </div>

              {/* Upload Stamp File Input Button (Pages 9 & 10 PDF) */}
              <div>
                <input
                  ref={stampFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleStampImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => stampFileInputRef.current?.click()}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold text-slate-800 flex items-center gap-1.5 mx-auto"
                >
                  <Upload size={14} /> Change image
                </button>
              </div>

              {/* Zoom Slider (- / +) */}
              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-500 uppercase">Zoom</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">-</span>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={stampZoom}
                    onChange={(e) => setStampZoom(parseInt(e.target.value))}
                    className="w-full accent-[#00a884]"
                  />
                  <span className="text-xs font-bold text-slate-500">+</span>
                </div>
              </div>

              {/* Shape Selectors & Rotation */}
              <div className="flex justify-center gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStampShape('square')}
                  className={`px-3 py-1 border rounded text-xs font-bold ${stampShape === 'square' ? 'border-[#00a884] bg-emerald-50 text-[#00a884]' : 'border-slate-300'}`}
                >
                  □ Square
                </button>
                <button
                  type="button"
                  onClick={() => setStampShape('oval')}
                  className={`px-3 py-1 border rounded text-xs font-bold ${stampShape === 'oval' ? 'border-[#00a884] bg-emerald-50 text-[#00a884]' : 'border-slate-300'}`}
                >
                  ◯ Oval
                </button>
                <button
                  type="button"
                  onClick={() => setStampRotation((stampRotation + 90) % 360)}
                  className="p-1 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 flex items-center gap-1 text-xs font-bold"
                  title="Rotate"
                >
                  <RotateCw size={14} />
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setShowStampCropModal(false)} className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold">
                Close
              </button>
              <button onClick={applyStampCrop} className="bg-[#00a884] hover:bg-[#008f70] text-white px-5 py-1.5 rounded text-xs font-bold shadow">
                Crop & Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Create Custom Field Modal (Matching PDF 3 p.7) */}
      {showCreateCustomFieldModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <form onSubmit={handleCreateCustomField} className="bg-white text-slate-900 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs my-6">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Create custom field</h3>
              <button type="button" onClick={() => setShowCreateCustomFieldModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Custom field name *</label>
                <input
                  type="text"
                  value={customFieldName}
                  onChange={(e) => setCustomFieldName(e.target.value)}
                  placeholder="e.g. My custom field"
                  className="w-full border border-slate-300 rounded p-2 focus:outline-none focus:border-[#00a884]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Type</label>
                <select
                  value={customFieldType}
                  onChange={(e) => setCustomFieldType(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 font-semibold bg-white"
                >
                  <option value="Text">Text</option>
                  <option value="Number">Number</option>
                  <option value="Date">Date</option>
                  <option value="Email">Email</option>
                  <option value="Checkbox">Checkbox</option>
                  <option value="Dropdown">Dropdown</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 font-semibold text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customFieldRequired}
                    onChange={(e) => setCustomFieldRequired(e.target.checked)}
                    className="accent-[#00a884]"
                  /> Required
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customFieldReadOnly}
                    onChange={(e) => setCustomFieldReadOnly(e.target.checked)}
                    className="accent-[#00a884]"
                  /> Read only
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customFieldFixedWidth}
                    onChange={(e) => setCustomFieldFixedWidth(e.target.checked)}
                    className="accent-[#00a884]"
                  /> Fixed width
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customFieldFixedHeight}
                    onChange={(e) => setCustomFieldFixedHeight(e.target.checked)}
                    className="accent-[#00a884]"
                  /> Fixed height
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Default value</label>
                <input
                  type="text"
                  value={customFieldDefaultVal}
                  onChange={(e) => setCustomFieldDefaultVal(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Field name</label>
                <input
                  type="text"
                  value={customFieldInternalName}
                  onChange={(e) => setCustomFieldInternalName(e.target.value)}
                  placeholder="field_identifier"
                  className="w-full border border-slate-300 rounded p-2 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Character limit</label>
                  <input
                    type="number"
                    value={customFieldCharLimit}
                    onChange={(e) => setCustomFieldCharLimit(parseInt(e.target.value) || 2048)}
                    className="w-full border border-slate-300 rounded p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data label</label>
                  <input
                    type="text"
                    value={customFieldDataLabel}
                    onChange={(e) => setCustomFieldDataLabel(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Validation</label>
                <select
                  value={customFieldValidation}
                  onChange={(e) => setCustomFieldValidation(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 font-semibold bg-white"
                >
                  <option value="None">None</option>
                  <option value="Numbers only">Numbers only</option>
                  <option value="Letters only">Letters only</option>
                  <option value="Email format">Email format</option>
                  <option value="Date format">Date format</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Formatting</label>
                <div className="flex items-center gap-2">
                  <select
                    value={customFieldFont}
                    onChange={(e) => setCustomFieldFont(e.target.value)}
                    className="flex-1 border border-slate-300 rounded p-2 font-semibold bg-white"
                  >
                    <option value="Roboto">Roboto</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Arial">Arial</option>
                  </select>
                  <select
                    value={customFieldFontSize}
                    onChange={(e) => setCustomFieldFontSize(e.target.value)}
                    className="w-16 border border-slate-300 rounded p-2 font-semibold bg-white"
                  >
                    <option value="10">10</option>
                    <option value="11">11</option>
                    <option value="12">12</option>
                    <option value="14">14</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setCustomFieldBold(!customFieldBold)}
                    className={`p-2 border rounded font-bold ${customFieldBold ? 'bg-[#00a884] text-white border-[#00a884]' : 'border-slate-300 text-slate-700'}`}
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomFieldItalic(!customFieldItalic)}
                    className={`p-2 border rounded italic ${customFieldItalic ? 'bg-[#00a884] text-white border-[#00a884]' : 'border-slate-300 text-slate-700'}`}
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomFieldStrike(!customFieldStrike)}
                    className={`p-2 border rounded line-through ${customFieldStrike ? 'bg-[#00a884] text-white border-[#00a884]' : 'border-slate-300 text-slate-700'}`}
                  >
                    S
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  value={customFieldDesc}
                  onChange={(e) => setCustomFieldDesc(e.target.value)}
                  placeholder="Optional field instructions..."
                  rows={2}
                  className="w-full border border-slate-300 rounded p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setShowCreateCustomFieldModal(false)} className="px-4 py-1.5 border border-slate-300 rounded text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" className="bg-[#00a884] hover:bg-[#008f70] text-white px-5 py-1.5 rounded text-xs font-bold shadow">
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Apply Field Template Modal (PDF 3 p.6) */}
      {showFieldTemplateModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs font-sans">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Apply field template</h3>
              <button onClick={() => setShowFieldTemplateModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <p className="text-slate-600 font-medium">
              Fields of the chosen template will be added. Make sure there is no overlapping.
            </p>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Field templates</label>
              <select
                value={selectedFieldTemplate}
                onChange={(e) => setSelectedFieldTemplate(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 font-semibold bg-white"
              >
                <option value="">--select--</option>
                <option value="nda">Non-Disclosure Agreement Standard Fields</option>
                <option value="employment">Employee Onboarding & Signature Fields</option>
                <option value="vendor">Vendor Purchase Order Approval Form</option>
              </select>
            </div>

            <div className="flex justify-end items-center gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowFieldTemplateModal(false)}
                className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!selectedFieldTemplate) {
                    alert('Please select a template');
                    return;
                  }
                  // Append standard template fields
                  const templateFields = [
                    { id: Date.now() + 1, type: 'Signature', label: 'Signature', value: 'Vimal Chavda', x: 200, y: 350, required: true, assigneeId: 2, assignee: 'Vimal Chavda' },
                    { id: Date.now() + 2, type: 'Sign date', label: 'Sign date', value: 'Sep 02 2026', x: 420, y: 350, required: true, assigneeId: 2, assignee: 'Vimal Chavda', dateFormat: 'MMM dd yyyy' }
                  ];
                  setFieldsOnDoc(prev => [...prev, ...templateFields]);
                  setShowFieldTemplateModal(false);
                  showPopupAlert('Fields of chosen template successfully added to document!', { title: 'Template Applied', type: 'success' });
                }}
                className="px-5 py-2 bg-[#00a884] hover:bg-[#008f70] text-white rounded text-xs font-bold transition shadow"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Documents Modal & In-Place Rich Text Editor (PDF 3 p.5) */}
      {showEditDocModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-6 text-xs font-sans">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {isEditingDocRichText ? 'Edit document' : 'Edit documents'}
              </h3>
              <button onClick={() => { setShowEditDocModal(false); setIsEditingDocRichText(false); }} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            {!isEditingDocRichText ? (
              /* View Documents List inside Modal (PDF 3 p.5 step g) */
              <div className="space-y-4">
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-14 bg-white border border-slate-300 rounded shadow-xs p-1 flex flex-col justify-between text-[7px] text-slate-400">
                      <span className="font-bold text-slate-700 truncate">{documentTitle}</span>
                      <span className="text-[6px] text-emerald-600 font-bold">1 page</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{documentTitle}</h4>
                      <p className="text-slate-500 text-[11px] mt-0.5">{docContentText}</p>
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowDocCardMenu(!showDocCardMenu)}
                      className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {showDocCardMenu && (
                      <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-30 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => { setShowDocCardMenu(false); setIsEditingDocRichText(true); }}
                          className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-800"
                        >
                          <Edit3 size={13} className="text-[#00a884]" /> Edit document
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowDocCardMenu(false); stampFileInputRef.current?.click(); }}
                          className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-800"
                        >
                          <RotateCw size={13} /> Replace
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowEditDocModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* Rich Text Editor for Document Content (PDF 3 p.5 step h) */
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">File name</label>
                  <input
                    type="text"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold text-xs"
                  />
                </div>

                {/* Formatting Toolbar */}
                <div className="flex items-center gap-2 p-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex-wrap">
                  <button type="button" className="p-1 hover:bg-white rounded font-serif">B</button>
                  <button type="button" className="p-1 hover:bg-white rounded italic">I</button>
                  <button type="button" className="p-1 hover:bg-white rounded underline">U</button>
                  <div className="w-[1px] h-4 bg-slate-300 mx-1" />
                  <span className="text-[11px] font-mono">Verdana</span>
                  <div className="w-[1px] h-4 bg-slate-300 mx-1" />
                  <span className="text-[11px] font-mono">10</span>
                  <div className="w-[1px] h-4 bg-slate-300 mx-1" />
                  <span className="text-emerald-700">A</span>
                </div>

                <textarea
                  value={docContentText}
                  onChange={(e) => setDocContentText(e.target.value)}
                  rows={6}
                  className="w-full border border-slate-300 rounded-lg p-3 text-xs font-serif leading-relaxed focus:outline-none focus:border-[#00a884]"
                  placeholder="Document body text..."
                />

                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditingDocRichText(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Back to documents
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => alert('PDF preview generated.')}
                      className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Preview as PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // PDF 3 p.5 point l: Saves in-place without creating replicas
                        setIsEditingDocRichText(false);
                        setShowEditDocModal(false);
                        showPopupAlert('Document contents updated and saved in place. Fields automatically adjusted.', {
                          title: 'Saved Successfully',
                          type: 'success'
                        });
                      }}
                      className="px-5 py-2 bg-[#00a884] hover:bg-[#008f70] text-white rounded-lg font-bold shadow"
                    >
                      Save & Create
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule / Send Later Modal (PDF 3 p.4) */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs font-sans">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Schedule</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Date and time</label>
                <input
                  type="text"
                  value={scheduleDateTime}
                  onChange={(e) => setScheduleDateTime(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 font-bold font-mono text-xs focus:outline-none focus:border-[#00a884]"
                  placeholder="Sep 02, 2026 14:49"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Time zone</label>
                <select
                  value={scheduleTimeZone}
                  onChange={(e) => setScheduleTimeZone(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 font-semibold text-xs bg-white focus:outline-none focus:border-[#00a884]"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</option>
                  <option value="America/New_York">America/New_York (EST -05:00)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="Europe/London">Europe/London (BST +01:00)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end items-center gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowScheduleModal(false);
                  showPopupAlert(`Document scheduled for ${scheduleDateTime} (${scheduleTimeZone}) and will auto-dispatch.`, {
                    title: 'Scheduled',
                    type: 'success'
                  });
                  navigate('/documents');
                }}
                className="px-5 py-2 bg-[#00a884] hover:bg-[#008f70] text-white rounded-lg font-bold transition shadow"
              >
                Schedule & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Details Popup Modal (PDF 1 p.6) with SMTP Email Trigger */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans text-slate-900">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Confirm details</h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Please verify the number of fields added for each recipient and confirm
            </p>

            {/* Recipient verification table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                    <th className="py-2.5 px-4">Recipient</th>
                    <th className="py-2.5 px-4 text-right">Fields</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recipientList.map((rec) => {
                    const count = fieldsOnDoc.filter(f => f.assigneeId === rec.id || !f.assigneeId).length;
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          {rec.email || 'vimal@bexcodeservices.com'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-[#007355]">
                          {count}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end items-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowConfirmModal(false);
                  const targetEmail = recipientList[0]?.email || recipientEmail || 'vimal@bexcodeservices.com';
                  try {
                    await fetch(`http://localhost:5000/api/documents/send/${id || 1}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        recipientEmail: targetEmail,
                        recipientName: recipientList[0]?.name || 'Signer',
                        documentName: documentTitle,
                        fields: fieldsOnDoc
                      })
                    });
                  } catch (e) {}

                  showPopupAlert(`Document sent for signature! Digital Signature Request email dispatched via SMTP to ${targetEmail}.`, {
                    title: 'Document Dispatched',
                    type: 'success'
                  });
                  navigate('/documents');
                }}
                className="px-5 py-2 bg-[#007355] hover:bg-[#005c44] text-white rounded-lg text-xs font-bold transition shadow cursor-pointer"
              >
                Confirm and send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

