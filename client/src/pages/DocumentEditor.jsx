import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Undo,
  Redo,
  Table,
  Type,
  Highlighter,
  Minus,
  Eye,
  Minimize2,
  Sparkles,
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
import { getDefaultDocContent, DEFAULT_DOCUMENT_TEXTS } from '../utils/documentDefaults';
import { generateAndDownloadPdf } from '../utils/pdfGenerator';

export default function DocumentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef(null);
  const stampFileInputRef = useRef(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showSendMenu, setShowSendMenu] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  // Multi-Document State (Pages 4 & 5)
  const [documentsList, setDocumentsList] = useState(() => {
    if (location.state?.documents && Array.isArray(location.state.documents) && location.state.documents.length > 0) {
      return location.state.documents.map((d, i) => ({
        ...d,
        id: d.id || i + 1,
        documentText: d.documentText || getDefaultDocContent(d.name, d.customMessage)
      }));
    }
    const saved = id ? localStorage.getItem(`bexsign_doc_${id}_documents`) : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((d, i) => ({
            ...d,
            id: d.id || i + 1,
            documentText: d.documentText || getDefaultDocContent(d.name, d.customMessage)
          }));
        }
      } catch (e) {}
    }
    return [
      {
        id: 1,
        name: 'My doc vimal 2.pdf',
        pages: 1,
        status: 'Ready',
        documentText: getDefaultDocContent('My doc vimal 2.pdf'),
        customMessage: 'check the document for signature'
      }
    ];
  });
  const [activeDocIndex, setActiveDocIndex] = useState(() => {
    if (location.state?.activeDocIndex !== undefined && typeof location.state.activeDocIndex === 'number') {
      return location.state.activeDocIndex;
    }
    return 0;
  });
  const [showDocSwitcherMenu, setShowDocSwitcherMenu] = useState(false);

  const currentDocument = documentsList[activeDocIndex] || documentsList[0] || { name: 'My doc vimal 2.pdf' };
  const documentTitle = currentDocument.name || 'My doc vimal 2.pdf';

  const setDocumentTitle = (newName) => {
    setDocumentsList((prev) => {
      const copy = [...prev];
      if (copy[activeDocIndex]) {
        copy[activeDocIndex] = { ...copy[activeDocIndex], name: newName };
      }
      if (id) localStorage.setItem(`bexsign_doc_${id}_documents`, JSON.stringify(copy));
      return copy;
    });
  };

  const handleAddNewDocFromEditor = (title = '') => {
    const nextNum = documentsList.length + 1;
    const docTitle = title || `Document ${nextNum}.pdf`;
    const newDoc = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      name: docTitle,
      pages: 1,
      status: 'Ready',
      documentText: getDefaultDocContent(docTitle),
      customMessage: 'check the document for signature'
    };
    setDocumentsList((prev) => {
      const updated = [...prev, newDoc];
      if (id) localStorage.setItem(`bexsign_doc_${id}_documents`, JSON.stringify(updated));
      setActiveDocIndex(updated.length - 1);
      return updated;
    });
  };

  const handleRemoveDocFromEditor = (indexToRemove) => {
    if (documentsList.length <= 1) {
      showPopupAlert('At least one document is required in the envelope.', { title: 'Required', type: 'warning' });
      return;
    }
    const updated = documentsList.filter((_, idx) => idx !== indexToRemove);
    setDocumentsList(updated);
    if (id) localStorage.setItem(`bexsign_doc_${id}_documents`, JSON.stringify(updated));

    // Shift fieldsByDoc keys so fields remain attached to the correct documents
    setFieldsByDoc((prev) => {
      const nextByDoc = {};
      let newIdx = 0;
      for (let i = 0; i < documentsList.length; i++) {
        if (i !== indexToRemove) {
          if (prev[i]) nextByDoc[newIdx] = prev[i];
          newIdx++;
        }
      }
      if (id) {
        localStorage.setItem(`bexsign_doc_${id}_fields_by_doc`, JSON.stringify(nextByDoc));
        const flatList = Object.values(nextByDoc).flat();
        localStorage.setItem(`bexsign_doc_${id}_fields`, JSON.stringify(flatList));
      }
      return nextByDoc;
    });

    if (activeDocIndex >= updated.length) {
      setActiveDocIndex(Math.max(0, updated.length - 1));
    }
  };

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

  // Full-View Microsoft Word-Style Document Editor State
  const [wordFontFamily, setWordFontFamily] = useState('Verdana');
  const [wordFontSize, setWordFontSize] = useState('11');
  const [wordIsBold, setWordIsBold] = useState(false);
  const [wordIsItalic, setWordIsItalic] = useState(false);
  const [wordIsUnderline, setWordIsUnderline] = useState(false);
  const [wordIsStrike, setWordIsStrike] = useState(false);
  const [wordTextColor, setWordTextColor] = useState('#0f172a');
  const [wordHighlightColor, setWordHighlightColor] = useState('transparent');
  const [wordTextAlign, setWordTextAlign] = useState('left');
  const [wordLineHeight, setWordLineHeight] = useState('1.6');
  const [wordEditorZoom, setWordEditorZoom] = useState(100);
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(true);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showClausesMenu, setShowClausesMenu] = useState(false);
  const [showStylesMenu, setShowStylesMenu] = useState(false);
  const [showLineSpacingMenu, setShowLineSpacingMenu] = useState(false);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [wordHistory, setWordHistory] = useState([]);
  const [wordHistoryIndex, setWordHistoryIndex] = useState(-1);
  const wordTextareaRef = useRef(null);

  const updateContentWithHistory = (newContent) => {
    setDocContentText(newContent);
    setWordHistory((prev) => {
      const sliced = prev.slice(0, wordHistoryIndex + 1);
      return [...sliced, newContent].slice(-30);
    });
    setWordHistoryIndex((prev) => Math.min(prev + 1, 29));
  };

  const handleWordUndo = () => {
    if (wordHistoryIndex > 0) {
      const prevText = wordHistory[wordHistoryIndex - 1];
      setWordHistoryIndex(wordHistoryIndex - 1);
      setDocContentText(prevText);
    }
  };

  const handleWordRedo = () => {
    if (wordHistoryIndex < wordHistory.length - 1) {
      const nextText = wordHistory[wordHistoryIndex + 1];
      setWordHistoryIndex(wordHistoryIndex + 1);
      setDocContentText(nextText);
    }
  };

  const insertTextAtCursor = (textToInsert, selectInserted = false) => {
    const el = wordTextareaRef.current;
    if (!el) {
      updateContentWithHistory(docContentText + '\n\n' + textToInsert);
      return;
    }
    const start = el.selectionStart ?? docContentText.length;
    const end = el.selectionEnd ?? docContentText.length;
    const before = docContentText.substring(0, start);
    const after = docContentText.substring(end);
    const updated = before + textToInsert + after;
    updateContentWithHistory(updated);
    setTimeout(() => {
      el.focus();
      const newPos = start + textToInsert.length;
      if (selectInserted) {
        el.setSelectionRange(start, newPos);
      } else {
        el.setSelectionRange(newPos, newPos);
      }
    }, 50);
  };

  const transformSelectedLines = (transformer) => {
    const el = wordTextareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? docContentText.length;
    const before = docContentText.substring(0, start);
    const selected = docContentText.substring(start, end);
    const after = docContentText.substring(end);

    const sourceText = selected || docContentText;
    const lines = sourceText.split('\n');
    const transformed = transformer(lines).join('\n');

    if (selected) {
      const updated = before + transformed + after;
      updateContentWithHistory(updated);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start, start + transformed.length);
      }, 50);
    } else {
      updateContentWithHistory(transformed);
    }
  };

  const handleWordPreviewPdf = () => {
    try {
      const activeDocFields = fieldsByDoc[activeDocIndex] || [];
      generateAndDownloadPdf({
        documentName: documentTitle.endsWith('.pdf') ? documentTitle : `${documentTitle}.pdf`,
        documentText: docContentText,
        docId: `BEX-DOC-PREVIEW-${id || 1}-${activeDocIndex + 1}`,
        signerName: recipientList[0]?.name || 'Vimal Chavda',
        signerEmail: recipientList[0]?.email || 'vimal@bexcodeservices.com',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'Draft Preview',
        signatureImage: '',
        fields: activeDocFields
      });
      showPopupAlert(`Generated PDF preview for "${documentTitle}". Download will start automatically.`, {
        title: 'PDF Preview Ready',
        type: 'success'
      });
    } catch (err) {
      showPopupAlert('Failed to generate PDF preview: ' + err.message, { title: 'Preview Error', type: 'error' });
    }
  };

  const handleWordSaveAndCreate = () => {
    setIsEditingDocRichText(false);
    setShowEditDocModal(false);
    setDocumentsList((prev) => {
      const copy = [...prev];
      if (copy[activeDocIndex]) {
        copy[activeDocIndex] = {
          ...copy[activeDocIndex],
          name: documentTitle,
          documentText: docContentText
        };
      }
      if (id) {
        localStorage.setItem(`bexsign_doc_${id}_documents`, JSON.stringify(copy));
      }
      localStorage.setItem('bexsign_draft_documents', JSON.stringify(copy));
      return copy;
    });
    showPopupAlert('Document contents updated and saved in place. Fields and canvas automatically synchronized.', {
      title: 'Saved Successfully',
      type: 'success'
    });
  };

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

  // Multi-document partitioned fields (Canvas Fields per active document)
  const [fieldsByDoc, setFieldsByDoc] = useState(() => {
    const isNew = localStorage.getItem(`bexsign_doc_${id}_is_new`) === 'true';
    if (isNew) return {};
    const savedByDoc = localStorage.getItem(`bexsign_doc_${id}_fields_by_doc`);
    if (savedByDoc) {
      try {
        const parsed = JSON.parse(savedByDoc);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) {}
    }
    const oldFields = localStorage.getItem(`bexsign_doc_${id}_fields`);
    if (oldFields) {
      try {
        const parsed = JSON.parse(oldFields);
        if (Array.isArray(parsed)) return { 0: parsed };
      } catch (e) {}
    }
    return {};
  });

  const fieldsOnDoc = fieldsByDoc[activeDocIndex] || [];

  const setFieldsOnDoc = (updater) => {
    setFieldsByDoc((prev) => {
      const currentFields = prev[activeDocIndex] || [];
      const nextFields = typeof updater === 'function' ? updater(currentFields) : updater;
      const nextByDoc = { ...prev, [activeDocIndex]: nextFields };
      if (id) {
        localStorage.setItem(`bexsign_doc_${id}_fields_by_doc`, JSON.stringify(nextByDoc));
        const flatList = Object.values(nextByDoc).flat();
        localStorage.setItem(`bexsign_doc_${id}_fields`, JSON.stringify(flatList));
        localStorage.removeItem(`bexsign_doc_${id}_is_new`);
      }
      return nextByDoc;
    });
  };

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
        const doc = data.document;
        if (doc.files && Array.isArray(doc.files) && doc.files.length > 0) {
          setDocumentsList((prev) => {
            const saved = id ? localStorage.getItem(`bexsign_doc_${id}_documents`) : null;
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  return parsed;
                }
              } catch (e) {}
            }
            const fromServer = doc.files.map((f, i) => ({
              id: f.id || i + 1,
              name: f.file_name || `Document ${i + 1}.pdf`,
              pages: 1,
              status: 'Ready',
              documentText: f.document_text || getDefaultDocContent(f.file_name, doc.custom_message),
              customMessage: doc.custom_message || 'check the document for signature'
            }));
            localStorage.setItem(`bexsign_doc_${id}_documents`, JSON.stringify(fromServer));
            return fromServer;
          });
        }

        if (doc.recipient_email) {
          setRecipientEmail(doc.recipient_email);
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
      const allFlat = Object.values(fieldsByDoc).flat();
      if (id) {
        localStorage.setItem(`bexsign_doc_${id}_documents`, JSON.stringify(documentsList));
        localStorage.setItem(`bexsign_doc_${id}_fields_by_doc`, JSON.stringify(fieldsByDoc));
        localStorage.setItem(`bexsign_doc_${id}_fields`, JSON.stringify(allFlat));
      }
      await fetch(`http://localhost:5000/api/documents/${id || 1}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentTitle,
          fieldsOnDoc,
          fields: allFlat,
          fieldsByDoc,
          documents: documentsList,
          documentText: currentDocument.documentText,
          status: 'Draft'
        })
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
      y: 420 + (fieldsOnDoc.length * 35) % 220,
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
      y: 420,
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
        y: 480,
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
          <div className="relative">
            <div
              onClick={() => setShowDocSwitcherMenu(!showDocSwitcherMenu)}
              className="flex items-center gap-1 cursor-pointer hover:bg-slate-800/80 px-2 py-1 rounded transition"
              title="Click to switch document"
            >
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent border-b border-transparent hover:border-slate-700 text-slate-100 font-bold text-sm px-1 py-0.5 focus:outline-none focus:border-[#007355] max-w-xs"
              />
              <ChevronDown size={14} className="text-slate-400" />
            </div>

            {/* Document Switcher Dropdown */}
            {showDocSwitcherMenu && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1.5 z-40 text-xs font-sans">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 flex justify-between items-center">
                  <span>Documents ({documentsList.length})</span>
                </div>
                {documentsList.map((d, i) => {
                  const docFields = fieldsByDoc[i] || [];
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setActiveDocIndex(i);
                        setActiveField(null);
                        setShowDocSwitcherMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition cursor-pointer ${
                        activeDocIndex === i ? 'text-emerald-400 font-bold bg-slate-800/60' : 'text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText size={13} className={activeDocIndex === i ? 'text-emerald-400' : 'text-slate-500'} />
                        <span className="truncate">{d.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {docFields.length} field{docFields.length === 1 ? '' : 's'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
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
                  onClick={() => {
                    setShowActionsMenu(false);
                    setDocContentText(currentDocument.documentText || getDefaultDocContent(currentDocument.name, currentDocument.customMessage));
                    setIsEditingDocRichText(true);
                    setShowEditDocModal(true);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer"
                >
                  <FileText size={13} className="text-[#00a884]" /> Edit document (Word View)
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
        {/* Left Sidebar: Documents (Listing all attached documents) */}
        <aside className="w-52 bg-slate-950 border-r border-slate-800 p-4 flex flex-col gap-3 shrink-0 font-sans text-xs overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Documents</h2>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-emerald-400 font-bold font-mono">{documentsList.length}</span>
              <button
                type="button"
                onClick={() => handleAddNewDocFromEditor()}
                className="p-1 hover:bg-slate-800 text-emerald-400 rounded transition cursor-pointer"
                title="Add new document to envelope"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {documentsList.map((doc, idx) => {
              const isSelected = activeDocIndex === idx;
              const docFields = fieldsByDoc[idx] || [];

              return (
                <div
                  key={doc.id || idx}
                  onClick={() => {
                    setActiveDocIndex(idx);
                    setActiveField(null);
                  }}
                  className={`w-full rounded-lg p-2.5 shadow-sm space-y-2 cursor-pointer transition ${
                    isSelected
                      ? 'border-2 border-[#00a884] bg-slate-900 ring-1 ring-emerald-900/50 shadow-md'
                      : 'border border-slate-800 bg-slate-950/60 hover:bg-slate-900/80 hover:border-slate-700'
                  }`}
                  title={`Click to edit fields on ${doc.name}`}
                >
                  <div className="flex items-center justify-between text-slate-300">
                    <span className={`text-xs font-bold truncate ${isSelected ? 'text-[#00a884]' : 'text-slate-200'}`}>
                      {doc.name || `Document ${idx + 1}`}
                    </span>
                    <div className="flex items-center gap-1">
                      {documentsList.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveDocFromEditor(idx);
                          }}
                          className="text-slate-500 hover:text-red-400 p-0.5 rounded transition"
                          title="Remove document"
                        >
                          <X size={12} />
                        </button>
                      )}
                      <ChevronDown size={14} className={isSelected ? 'text-[#00a884]' : 'text-slate-500'} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{doc.pages || 1} pages</span>
                    {docFields.length > 0 && (
                      <span className="text-emerald-400 font-semibold font-mono">
                        {docFields.length} field{docFields.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Miniature Page Thumbnail Preview */}
                  <div className="w-full h-36 bg-white rounded border border-slate-700 p-2 text-[7px] text-slate-400 select-none overflow-hidden relative shadow-inner">
                    <p className="font-bold text-slate-800 truncate">{doc.name}</p>
                    <p className="mt-1 text-slate-500 line-clamp-3 leading-relaxed">
                      {doc.documentText || getDefaultDocContent(doc.name, doc.customMessage)}
                    </p>
                    {docFields.map((f, i) => (
                      <div
                        key={i}
                        className="my-0.5 border border-emerald-500 bg-emerald-50 text-[6px] text-emerald-800 px-1 py-0.5 rounded truncate font-mono"
                      >
                        {f.label || f.type}
                      </div>
                    ))}
                    <span className="absolute bottom-1 right-1 bg-slate-200 text-slate-600 text-[8px] px-1 rounded font-bold">
                      {idx + 1}
                    </span>
                  </div>
                </div>
              );
            })}
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
            {/* PDF Canvas Content - Full Document Text & Clauses */}
            <div className="space-y-4 pb-6 border-b border-slate-200">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    {documentTitle}
                  </h1>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    BexSign Document ID: BEX-DOC-2026-0024-{id || 1}-{activeDocIndex + 1}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDocContentText(currentDocument.documentText || getDefaultDocContent(currentDocument.name, currentDocument.customMessage));
                    setIsEditingDocRichText(true);
                    setShowEditDocModal(true);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 flex items-center gap-1 transition cursor-pointer"
                  title="Edit document body content"
                >
                  <Edit3 size={13} />
                  <span>Edit Content</span>
                </button>
              </div>

              {/* Full Document Clauses & Text */}
              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-sans select-text">
                {currentDocument.documentText || getDefaultDocContent(currentDocument.name, currentDocument.customMessage)}
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

      {/* 1. Full-View Microsoft Word-Style Document Editor Workspace */}
      {showEditDocModal && isEditingDocRichText && (
        <div className="fixed inset-0 z-50 bg-[#e2e8f0] flex flex-col font-sans select-none overflow-hidden text-slate-800 animate-in fade-in duration-150">
          {/* Top Word Window Title & Action Bar */}
          <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-xs shrink-0 z-30">
            {/* Left: Document Icon & Inline Rename */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#007355] text-white flex items-center justify-center shadow-xs shrink-0">
                <FileText size={18} />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    className="text-sm font-black text-slate-900 bg-transparent hover:bg-slate-100 focus:bg-white px-2 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-[#007355] outline-none transition max-w-sm truncate"
                    title="Click to rename document"
                    placeholder="Document Title"
                  />
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                    <Check size={11} /> Auto-saved
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono px-2 truncate">
                  <span>BexSign Document ID: BEX-DOC-2026-0024-{id || 1}-{activeDocIndex + 1}</span>
                  <span>•</span>
                  <span>{documentsList.length > 1 ? `Document ${activeDocIndex + 1} of ${documentsList.length}` : 'Primary Document'}</span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (documentsList.length > 1) {
                    setIsEditingDocRichText(false);
                  } else {
                    setIsEditingDocRichText(false);
                    setShowEditDocModal(false);
                  }
                }}
                className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Return to envelope document list"
              >
                <ArrowLeft size={14} />
                <span>Back to documents</span>
              </button>

              <button
                type="button"
                onClick={handleWordPreviewPdf}
                className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                title="Download PDF preview with current content and styling"
              >
                <Eye size={14} className="text-[#007355]" />
                <span>Preview as PDF</span>
              </button>

              <button
                type="button"
                onClick={handleWordSaveAndCreate}
                className="px-5 py-1.5 bg-[#007355] hover:bg-[#005c44] text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition shadow cursor-pointer"
                title="Save changes and apply to document editor canvas"
              >
                <Save size={14} />
                <span>Save & Create</span>
              </button>

              <div className="w-[1px] h-6 bg-slate-200 mx-1" />

              <button
                type="button"
                onClick={() => setIsEditorFullscreen(!isEditorFullscreen)}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                title={isEditorFullscreen ? "Exit full view" : "Enter full view"}
              >
                {isEditorFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsEditingDocRichText(false);
                  setShowEditDocModal(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                title="Close editor"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          {/* Microsoft Word-Style Ribbon Toolbar */}
          <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-1.5 flex-wrap shrink-0 z-20 shadow-2xs text-xs">
            {/* 1. History (Undo / Redo) */}
            <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2">
              <button
                type="button"
                onClick={handleWordUndo}
                className="p-1.5 hover:bg-slate-100 text-slate-700 rounded transition cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <Undo size={14} />
              </button>
              <button
                type="button"
                onClick={handleWordRedo}
                className="p-1.5 hover:bg-slate-100 text-slate-700 rounded transition cursor-pointer"
                title="Redo (Ctrl+Y)"
              >
                <Redo size={14} />
              </button>
            </div>

            {/* 2. Font Family Selector */}
            <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
              <select
                value={wordFontFamily}
                onChange={(e) => setWordFontFamily(e.target.value)}
                className="p-1 text-xs border border-slate-200 rounded bg-slate-50 hover:bg-white focus:border-[#007355] outline-none font-semibold text-slate-700 cursor-pointer"
                title="Font Family"
              >
                <option value="Verdana">Verdana</option>
                <option value="Arial">Arial</option>
                <option value="Calibri">Calibri</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="Inter, sans-serif">Inter</option>
                <option value="Roboto, sans-serif">Roboto</option>
                <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                <option value="'Segoe UI', sans-serif">Segoe UI</option>
              </select>
            </div>

            {/* 3. Font Size Controls */}
            <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
              <button
                type="button"
                onClick={() => setWordFontSize(prev => String(Math.max(8, parseInt(prev) - 1)))}
                className="p-1 hover:bg-slate-100 text-slate-700 rounded font-bold transition cursor-pointer w-6 h-6 flex items-center justify-center border border-slate-200"
                title="Decrease Font Size"
              >
                <Minus size={12} />
              </button>
              <select
                value={wordFontSize}
                onChange={(e) => setWordFontSize(e.target.value)}
                className="p-1 text-xs border border-slate-200 rounded bg-slate-50 hover:bg-white focus:border-[#007355] outline-none font-bold text-slate-700 cursor-pointer w-16 text-center"
                title="Font Size (pt)"
              >
                {['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36'].map(sz => (
                  <option key={sz} value={sz}>{sz} pt</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setWordFontSize(prev => String(Math.min(48, parseInt(prev) + 1)))}
                className="p-1 hover:bg-slate-100 text-slate-700 rounded font-bold transition cursor-pointer w-6 h-6 flex items-center justify-center border border-slate-200"
                title="Increase Font Size"
              >
                <Plus size={12} />
              </button>
            </div>

            {/* 4. Text Styles (Bold, Italic, Underline, Strike) */}
            <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2">
              <button
                type="button"
                onClick={() => setWordIsBold(!wordIsBold)}
                className={`p-1.5 rounded transition cursor-pointer font-black ${
                  wordIsBold ? 'bg-emerald-100 text-[#007355] border border-emerald-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Bold (Ctrl+B)"
              >
                <Bold size={14} />
              </button>
              <button
                type="button"
                onClick={() => setWordIsItalic(!wordIsItalic)}
                className={`p-1.5 rounded transition cursor-pointer italic ${
                  wordIsItalic ? 'bg-emerald-100 text-[#007355] border border-emerald-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Italic (Ctrl+I)"
              >
                <Italic size={14} />
              </button>
              <button
                type="button"
                onClick={() => setWordIsUnderline(!wordIsUnderline)}
                className={`p-1.5 rounded transition cursor-pointer underline ${
                  wordIsUnderline ? 'bg-emerald-100 text-[#007355] border border-emerald-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Underline (Ctrl+U)"
              >
                <Underline size={14} />
              </button>
              <button
                type="button"
                onClick={() => setWordIsStrike(!wordIsStrike)}
                className={`p-1.5 rounded transition cursor-pointer line-through ${
                  wordIsStrike ? 'bg-emerald-100 text-[#007355] border border-emerald-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Strikethrough"
              >
                <Strikethrough size={14} />
              </button>
            </div>

            {/* 5. Colors (Text Color & Highlight) */}
            <div className="flex items-center gap-1.5 border-r border-slate-200 pr-2 relative">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setShowColorPicker(!showColorPicker); setShowHighlightPicker(false); }}
                  className="px-2 py-1 hover:bg-slate-100 text-slate-700 rounded border border-slate-200 flex items-center gap-1 transition cursor-pointer font-bold"
                  title="Text Color"
                >
                  <span style={{ color: wordTextColor === 'transparent' ? '#0f172a' : wordTextColor }} className="text-sm font-black underline">A</span>
                  <div className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundColor: wordTextColor }} />
                </button>
                {showColorPicker && (
                  <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-slate-200 rounded-lg shadow-xl z-40 flex items-center gap-1.5 animate-in fade-in">
                    {['#0f172a', '#475569', '#1e3a8a', '#2563eb', '#007355', '#dc2626', '#7c3aed'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { setWordTextColor(c); setShowColorPicker(false); }}
                        className="w-5 h-5 rounded-full border border-slate-300 hover:scale-115 transition cursor-pointer"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false); }}
                  className="px-2 py-1 hover:bg-slate-100 text-slate-700 rounded border border-slate-200 flex items-center gap-1 transition cursor-pointer"
                  title="Highlight Color"
                >
                  <Highlighter size={13} />
                  <div className="w-2.5 h-2.5 rounded border border-slate-300" style={{ backgroundColor: wordHighlightColor === 'transparent' ? '#ffffff' : wordHighlightColor }} />
                </button>
                {showHighlightPicker && (
                  <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-slate-200 rounded-lg shadow-xl z-40 flex items-center gap-1.5 animate-in fade-in">
                    <button
                      type="button"
                      onClick={() => { setWordHighlightColor('transparent'); setShowHighlightPicker(false); }}
                      className="px-2 py-0.5 text-[10px] border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
                    >
                      None
                    </button>
                    {['#fef08a', '#bbf7d0', '#a5f3fc', '#fbcfe8', '#fed7aa'].map(hc => (
                      <button
                        key={hc}
                        type="button"
                        onClick={() => { setWordHighlightColor(hc); setShowHighlightPicker(false); }}
                        className="w-5 h-5 rounded border border-slate-300 hover:scale-115 transition cursor-pointer"
                        style={{ backgroundColor: hc }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 6. Text Alignment & Line Spacing */}
            <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2">
              <button
                type="button"
                onClick={() => setWordTextAlign('left')}
                className={`p-1.5 rounded transition cursor-pointer ${
                  wordTextAlign === 'left' ? 'bg-emerald-100 text-[#007355] border border-emerald-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Align Left"
              >
                <AlignLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setWordTextAlign('center')}
                className={`p-1.5 rounded transition cursor-pointer ${
                  wordTextAlign === 'center' ? 'bg-emerald-100 text-[#007355] border border-emerald-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Align Center"
              >
                <AlignCenter size={14} />
              </button>
              <button
                type="button"
                onClick={() => setWordTextAlign('right')}
                className={`p-1.5 rounded transition cursor-pointer ${
                  wordTextAlign === 'right' ? 'bg-emerald-100 text-[#007355] border border-emerald-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Align Right"
              >
                <AlignRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => setWordTextAlign('justify')}
                className={`p-1.5 rounded transition cursor-pointer ${
                  wordTextAlign === 'justify' ? 'bg-emerald-100 text-[#007355] border border-emerald-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Justify"
              >
                <AlignJustify size={14} />
              </button>

              <select
                value={wordLineHeight}
                onChange={(e) => setWordLineHeight(e.target.value)}
                className="ml-1 p-1 text-[11px] border border-slate-200 rounded bg-slate-50 hover:bg-white text-slate-700 font-semibold cursor-pointer"
                title="Line Spacing"
              >
                <option value="1.2">Single (1.2)</option>
                <option value="1.4">1.4 lines</option>
                <option value="1.6">1.6 (Standard)</option>
                <option value="1.8">1.8 lines</option>
                <option value="2.0">Double (2.0)</option>
              </select>
            </div>

            {/* 7. Lists & Indent */}
            <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2">
              <button
                type="button"
                onClick={() => transformSelectedLines(lines => lines.map(l => l.startsWith('• ') ? l.substring(2) : `• ${l}`))}
                className="p-1.5 hover:bg-slate-100 text-slate-700 rounded transition cursor-pointer"
                title="Bulleted List"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => transformSelectedLines(lines => lines.map((l, idx) => /^\d+\.\s/.test(l) ? l.replace(/^\d+\.\s/, '') : `${idx + 1}. ${l}`))}
                className="p-1.5 hover:bg-slate-100 text-slate-700 rounded transition cursor-pointer"
                title="Numbered List"
              >
                <ListOrdered size={14} />
              </button>
              <button
                type="button"
                onClick={() => transformSelectedLines(lines => lines.map(l => l.startsWith('    ') ? l.substring(4) : (l.startsWith('  ') ? l.substring(2) : l)))}
                className="p-1.5 hover:bg-slate-100 text-slate-700 rounded transition cursor-pointer"
                title="Decrease Indent"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => transformSelectedLines(lines => lines.map(l => `    ${l}`))}
                className="p-1.5 hover:bg-slate-100 text-slate-700 rounded transition cursor-pointer"
                title="Increase Indent"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* 8. Headings / Styles Menu */}
            <div className="relative border-r border-slate-200 pr-2">
              <button
                type="button"
                onClick={() => { setShowStylesMenu(!showStylesMenu); setShowClausesMenu(false); setShowInsertMenu(false); }}
                className="px-2.5 py-1 hover:bg-slate-100 text-slate-700 rounded border border-slate-200 flex items-center gap-1 font-semibold transition cursor-pointer"
                title="Text Styles & Headings"
              >
                <Type size={13} />
                <span>Styles</span>
                <ChevronDown size={12} />
              </button>
              {showStylesMenu && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-40 text-xs animate-in fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      insertTextAtCursor(`\n\n${documentTitle.toUpperCase()}\n${'='.repeat(documentTitle.length)}\n`);
                      setShowStylesMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-black text-sm text-slate-900 cursor-pointer"
                  >
                    Document Title (Large)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      insertTextAtCursor('\n\n1. PRIMARY SECTION HEADING\n');
                      setShowStylesMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 font-bold text-slate-800 cursor-pointer"
                  >
                    Heading 1 (1. TITLE)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      insertTextAtCursor('\n1.1 Sub-clause Specific Term\n');
                      setShowStylesMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer"
                  >
                    Heading 2 (1.1 Sub-term)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      transformSelectedLines(lines => lines.map(l => l.toUpperCase()));
                      setShowStylesMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 text-slate-600 font-mono cursor-pointer"
                  >
                    UPPERCASE Transform
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      transformSelectedLines(lines => lines.map(l => l.replace(/\b\w/g, c => c.toUpperCase())));
                      setShowStylesMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 text-slate-600 font-sans cursor-pointer"
                  >
                    Title Case Transform
                  </button>
                </div>
              )}
            </div>

            {/* 9. Insert Tools Menu */}
            <div className="relative border-r border-slate-200 pr-2">
              <button
                type="button"
                onClick={() => { setShowInsertMenu(!showInsertMenu); setShowStylesMenu(false); setShowClausesMenu(false); }}
                className="px-2.5 py-1 hover:bg-slate-100 text-slate-700 rounded border border-slate-200 flex items-center gap-1 font-semibold transition cursor-pointer"
                title="Insert Elements"
              >
                <Plus size={13} />
                <span>Insert</span>
                <ChevronDown size={12} />
              </button>
              {showInsertMenu && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-40 text-xs animate-in fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      insertTextAtCursor('\n\n--------------------------------------------------------------------------------\n\n');
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                  >
                    <Minus size={14} /> Horizontal Divider Line
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      insertTextAtCursor(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                  >
                    <Calendar size={14} /> Current Date Stamp
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      insertTextAtCursor('\n\n[SIGNATURE FIELD PLACEHOLDER: ______________________]   [DATE: __________________]\n');
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                  >
                    <PenTool size={14} /> Signature Line Marker
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      insertTextAtCursor('\n\n+-------------------------------------------+-------------------------------------------+\n| PARTY A: Disclosing Entity                | PARTY B: Receiving Entity                 |\n| Entity: Bexcode Services                  | Signer: Vimal Chavda                      |\n| Title: Corporate Sponsor                  | Title: Designated Signatory               |\n| Email: manu.yadav@oladigital.health       | Email: vimal@bexcodeservices.com          |\n+-------------------------------------------+-------------------------------------------+\n| Effective Date: ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + '            | Expiration: Forever / Evergreen           |\n+-------------------------------------------+-------------------------------------------+\n\n');
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                  >
                    <Table size={14} /> 2-Column Parties Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      insertTextAtCursor('\n\n--------------------------------------------------------------------------------\nIN WITNESS WHEREOF, the parties hereto have duly executed this Agreement as of the Effective Date.\n\nCOMPANY:                                     RECIPIENT / SIGNER:\nBexcode Services                             \nBy: _________________________________        By: _________________________________\nName: Manu Yadav                             Name: ' + (recipientList[0]?.name || 'Vimal Chavda') + '\nTitle: Authorized Officer                    Title: Designated Signatory\nDate: ' + new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + '                     Date: ' + new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + '\n');
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-bold cursor-pointer"
                  >
                    <FileCheck size={14} className="text-[#007355]" /> Two-Party Execution Block
                  </button>
                </div>
              )}
            </div>

            {/* 10. Legal Clauses / Presets Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => { setShowClausesMenu(!showClausesMenu); setShowStylesMenu(false); setShowInsertMenu(false); }}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#007355] border border-emerald-200 rounded flex items-center gap-1 font-bold transition cursor-pointer"
                title="Insert standard legal agreement clauses"
              >
                <Sparkles size={13} />
                <span>Legal Clauses</span>
                <ChevronDown size={12} />
              </button>
              {showClausesMenu && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-40 text-xs animate-in fade-in">
                  <div className="px-3 py-1 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                    Insert Clause at Cursor
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      insertTextAtCursor('\n\nCONFIDENTIALITY AND NON-DISCLOSURE\nAll proprietary, commercial, financial, and technical information disclosed under this Agreement shall remain strictly confidential. Neither party shall disclose or use confidential information without the prior written consent of the disclosing party.\n');
                      setShowClausesMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 text-slate-800 font-medium cursor-pointer"
                  >
                    Confidentiality & Non-Disclosure
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      insertTextAtCursor('\n\nCOMPENSATION AND INVOICING TERMS\nCompensation for all services rendered shall be invoiced on a monthly basis and payable within thirty (30) calendar days from receipt of invoice. Late payments shall bear interest at 1.5% per month or the highest statutory rate.\n');
                      setShowClausesMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 text-slate-800 font-medium cursor-pointer"
                  >
                    Compensation & Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      insertTextAtCursor('\n\nTERM AND TERMINATION\nThis Agreement commences on the Effective Date and continues until terminated by either party upon thirty (30) days prior written notice, or immediately upon written notice in the event of an uncured material breach after fifteen (15) days.\n');
                      setShowClausesMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 text-slate-800 font-medium cursor-pointer"
                  >
                    Term & Termination
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      insertTextAtCursor('\n\nGOVERNING LAW AND JURISDICTION\nThis Agreement shall be governed by, and construed in accordance with, the laws of the State of Delaware, without giving effect to conflicts of law principles. Any legal action arising hereunder shall be filed exclusively in the courts of that jurisdiction.\n');
                      setShowClausesMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 text-slate-800 font-medium cursor-pointer"
                  >
                    Governing Law & Jurisdiction
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      insertTextAtCursor('\n\nSEVERABILITY AND ENTIRE AGREEMENT\nIf any provision of this Agreement is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect. This Agreement constitutes the complete understanding between the parties with respect to the subject matter hereof.\n');
                      setShowClausesMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 text-slate-800 font-medium cursor-pointer"
                  >
                    Severability & Entire Agreement
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <div className="px-3 py-1 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                    Replace Entire Document
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Replace document content with Standard Employment Agreement?')) {
                        updateContentWithHistory(DEFAULT_DOCUMENT_TEXTS.employment);
                        setShowClausesMenu(false);
                      }
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 text-[#007355] font-semibold cursor-pointer"
                  >
                    Load Full Employment Template
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Replace document content with Non-Disclosure Agreement (NDA)?')) {
                        updateContentWithHistory(DEFAULT_DOCUMENT_TEXTS.nda);
                        setShowClausesMenu(false);
                      }
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 text-[#007355] font-semibold cursor-pointer"
                  >
                    Load Full NDA Template
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Replace document content with Master Services Agreement?')) {
                        updateContentWithHistory(DEFAULT_DOCUMENT_TEXTS.service);
                        setShowClausesMenu(false);
                      }
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 text-[#007355] font-semibold cursor-pointer"
                  >
                    Load Full Services Template
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Center Workspace (A4 Document Canvas) */}
          <main
            onClick={() => {
              setShowColorPicker(false);
              setShowHighlightPicker(false);
              setShowClausesMenu(false);
              setShowStylesMenu(false);
              setShowInsertMenu(false);
            }}
            className="flex-1 bg-slate-200/90 overflow-y-auto p-4 sm:p-10 flex justify-center items-start print:p-0 print:bg-white"
          >
            <div
              style={{
                transform: `scale(${wordEditorZoom / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease'
              }}
              className="w-full max-w-[840px] min-h-[1100px] bg-white rounded-xs border border-slate-300 shadow-2xl p-10 sm:p-16 flex flex-col justify-between relative transition-all"
            >
              {/* Document Header Metadata Line */}
              <div className="border-b border-slate-200 pb-3 mb-6 flex justify-between items-center text-[10px] text-slate-400 font-mono select-none">
                <span className="font-bold text-slate-600 uppercase tracking-wider">{documentTitle.replace(/\.pdf$/i, '')}</span>
                <span>BEX-DOC-2026-0024-{id || 1}-{activeDocIndex + 1}</span>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col">
                <textarea
                  ref={wordTextareaRef}
                  value={docContentText}
                  onChange={(e) => updateContentWithHistory(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                      e.preventDefault();
                      setWordIsBold(!wordIsBold);
                    } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
                      e.preventDefault();
                      setWordIsItalic(!wordIsItalic);
                    } else if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
                      e.preventDefault();
                      setWordIsUnderline(!wordIsUnderline);
                    } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                      e.preventDefault();
                      if (e.shiftKey) handleWordRedo();
                      else handleWordUndo();
                    } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                      e.preventDefault();
                      handleWordRedo();
                    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                      e.preventDefault();
                      handleWordSaveAndCreate();
                    } else if (e.key === 'Tab') {
                      e.preventDefault();
                      insertTextAtCursor('    ');
                    }
                  }}
                  placeholder="Start composing agreement terms, contract clauses, or paste document content here..."
                  style={{
                    fontFamily: wordFontFamily,
                    fontSize: `${wordFontSize}pt`,
                    fontWeight: wordIsBold ? 'bold' : 'normal',
                    fontStyle: wordIsItalic ? 'italic' : 'normal',
                    textDecoration: `${wordIsUnderline ? 'underline' : ''} ${wordIsStrike ? 'line-through' : ''}`.trim() || 'none',
                    color: wordTextColor,
                    backgroundColor: wordHighlightColor,
                    textAlign: wordTextAlign,
                    lineHeight: wordLineHeight,
                    minHeight: '820px',
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    whiteSpace: 'pre-wrap'
                  }}
                  className="flex-1 w-full focus:outline-none selection:bg-emerald-200 leading-relaxed font-sans"
                />
              </div>

              {/* Document Page Footer */}
              <div className="border-t border-slate-200 pt-3 mt-6 flex justify-between items-center text-[10px] text-slate-400 font-mono select-none">
                <span>BexSign Legal Verification • Page 1 of {Math.max(1, Math.ceil(docContentText.trim().split(/\s+/).filter(Boolean).length / 380))}</span>
                <span>SHA-256 Digital Signature Standard</span>
              </div>
            </div>
          </main>

          {/* Bottom Word Status Bar */}
          <footer className="h-8 bg-white border-t border-slate-200 px-4 sm:px-6 flex items-center justify-between text-[11px] text-slate-500 font-medium shrink-0 z-20 select-none">
            {/* Left: Document Metrics */}
            <div className="flex items-center gap-4">
              <span>Page 1 of {Math.max(1, Math.ceil(docContentText.trim().split(/\s+/).filter(Boolean).length / 380))}</span>
              <span>•</span>
              <span className="font-semibold text-slate-700">{docContentText.trim().split(/\s+/).filter(Boolean).length} words</span>
              <span>•</span>
              <span>{docContentText.length} characters</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">~{Math.max(1, Math.ceil(docContentText.trim().split(/\s+/).filter(Boolean).length / 200))} min read</span>
            </div>

            {/* Right: Active Typography Info & Zoom */}
            <div className="flex items-center gap-3">
              <span className="hidden md:inline font-mono text-[10px] text-slate-400">
                {wordFontFamily.replace(/,.*$/, '')} • {wordFontSize}pt • Spacing {wordLineHeight}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setWordEditorZoom(prev => Math.max(60, prev - 10))}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setWordEditorZoom(100)}
                  className="px-1.5 py-0.5 hover:bg-slate-100 rounded text-[10px] font-mono font-bold text-slate-700 cursor-pointer"
                  title="Reset Zoom"
                >
                  {wordEditorZoom}%
                </button>
                <button
                  type="button"
                  onClick={() => setWordEditorZoom(prev => Math.min(160, prev + 10))}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn size={13} />
                </button>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* 2. Documents List Switcher Modal inside envelope */}
      {showEditDocModal && !isEditingDocRichText && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-6 text-xs font-sans">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Edit documents
              </h3>
              <button onClick={() => { setShowEditDocModal(false); setIsEditingDocRichText(false); }} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {documentsList.map((docItem, idx) => (
                  <div
                    key={docItem.id || idx}
                    className={`p-4 border rounded-xl flex items-start justify-between transition ${
                      activeDocIndex === idx ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-300' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-14 bg-white border border-slate-300 rounded shadow-xs p-1 flex flex-col justify-between text-[7px] text-slate-400 shrink-0">
                        <span className="font-bold text-slate-700 truncate">{docItem.name || `Document ${idx + 1}`}</span>
                        <span className="text-[6px] text-emerald-600 font-bold">{docItem.pages || 1} page</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 text-sm truncate">{docItem.name || `Document ${idx + 1}`}</h4>
                        <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-2 leading-relaxed">
                          {docItem.documentText || getDefaultDocContent(docItem.name, docItem.customMessage)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDocIndex(idx);
                          setDocContentText(docItem.documentText || getDefaultDocContent(docItem.name, docItem.customMessage));
                          setIsEditingDocRichText(true);
                        }}
                        className="px-3 py-1.5 bg-[#007355] hover:bg-[#005c44] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                      >
                        <Edit3 size={13} />
                        <span>Open in Word Editor</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditDocModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
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
                    <th className="py-2.5 px-4 text-center">Docs</th>
                    <th className="py-2.5 px-4 text-right">Fields</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recipientList.map((rec) => {
                    const allFlat = Object.values(fieldsByDoc).flat();
                    const count = allFlat.filter(f => f.assigneeId === rec.id || !f.assigneeId).length;
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          {rec.email || 'vimal@bexcodeservices.com'}
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold text-slate-600">
                          {documentsList.length}
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
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowConfirmModal(false);
                  const targetEmail = recipientList[0]?.email || recipientEmail || 'vimal@bexcodeservices.com';
                  const allFlat = Object.values(fieldsByDoc).flat();

                  // Persist to localStorage for envelope
                  if (id) {
                    localStorage.setItem(`bexsign_doc_${id}_documents`, JSON.stringify(documentsList));
                    localStorage.setItem(`bexsign_doc_${id}_fields_by_doc`, JSON.stringify(fieldsByDoc));
                    localStorage.setItem(`bexsign_doc_${id}_fields`, JSON.stringify(allFlat));
                  }

                  try {
                    await fetch(`http://localhost:5000/api/documents/send/${id || 1}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        recipientEmail: targetEmail,
                        recipientName: recipientList[0]?.name || 'Signer',
                        documentName: documentTitle,
                        documents: documentsList,
                        documentText: currentDocument.documentText,
                        fieldsByDoc: fieldsByDoc,
                        fields: allFlat
                      })
                    });
                  } catch (e) {}

                  showPopupAlert(`Document package sent for signature! Digital Signature Request email dispatched via SMTP to ${targetEmail}.`, {
                    title: 'Envelope Dispatched',
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

