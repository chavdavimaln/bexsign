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
  AlignRight,
  Check,
  Move,
  Upload
} from 'lucide-react';

export default function DocumentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const stampFileInputRef = useRef(null);

  const [documentTitle, setDocumentTitle] = useState('First sign.pdf');
  const [recipientEmail, setRecipientEmail] = useState('manu.yadav@oladigital.health');
  const [statusMsg, setStatusMsg] = useState('');

  // Zoho Sign Color-Coded Recipient Field Assignment
  const recipientList = [
    { id: 1, name: 'Manu Yadav', email: 'manu.yadav@oladigital.health', color: '#00a884', bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700' },
    { id: 2, name: 'Vimal Chavda', email: 'vimal@bexcodeservices.com', color: '#0284c7', bg: 'bg-sky-50', border: 'border-sky-600', text: 'text-sky-700' },
    { id: 3, name: 'Aakash', email: 'aakash@bexcodeservices.com', color: '#f97316', bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-700' }
  ];

  const [selectedRecipient, setSelectedRecipient] = useState(recipientList[0]);

  // Initial Fields with Inline Writing & Stamp Image Properties (Pages 9, 10, 11, 14, 15, 17, 18 PDF)
  const [fieldsOnDoc, setFieldsOnDoc] = useState([
    { id: 1, type: 'Signature', label: 'Signature', value: 'Manu Yadav', x: 180, y: 320, required: true, assigneeId: 1, assignee: 'Manu Yadav' },
    { id: 2, type: 'Stamp', label: 'Stamp', value: 'STAMP', x: 380, y: 320, required: true, assigneeId: 1, assignee: 'Manu Yadav', stampShape: 'square', stampImage: '', stampZoom: 100, stampRotation: 0 },
    { id: 3, type: 'Sign date', label: 'Sign date', value: 'Aug 26 2026', x: 180, y: 420, required: true, assigneeId: 1, assignee: 'Manu Yadav', dateFormat: 'MMM dd yyyy HH:mm z' },
    { id: 4, type: 'Split text', label: 'Split textfield', value: '', x: 340, y: 420, required: true, assigneeId: 1, assignee: 'Manu Yadav', charCount: 10, charSpace: 0, width: 16, height: 20, gridValue: ['s','-','1','','','','','','',''] },
    { id: 5, type: 'Company', label: 'Company', value: 'Company', x: 180, y: 490, required: true, assigneeId: 1, assignee: 'Manu Yadav', font: 'Roboto', fontSize: '11', isBold: false, isItalic: false, textColor: '#00a884' },
    { id: 6, type: 'Full name', label: 'Full name', value: 'Manu Yadav', x: 380, y: 490, required: true, assigneeId: 1, assignee: 'Manu Yadav', nameFormat: 'Full Name', font: 'Roboto', fontSize: '11', isBold: true, isItalic: false, textColor: '#00a884' },
    { id: 7, type: 'Job title', label: 'Job title', value: 'Job title', x: 180, y: 560, required: true, assigneeId: 1, assignee: 'Manu Yadav', font: 'Roboto', fontSize: '11', isBold: false, isItalic: false, textColor: '#00a884' },
    { id: 8, type: 'Email', label: 'Email', value: 'manu.yadav@oladigital.health', x: 380, y: 560, required: true, assigneeId: 1, assignee: 'Manu Yadav', font: 'Roboto', fontSize: '11', isBold: false, isItalic: false, textColor: '#00a884' },
    { id: 9, type: 'Checkbox', label: 'Checkbox', value: 'true', x: 260, y: 640, required: true, assigneeId: 1, assignee: 'Manu Yadav', checked: true }
  ]);

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

    // Keep within bounds
    newX = Math.max(10, Math.min(rect.width - 160, newX));
    newY = Math.max(10, Math.min(rect.height - 60, newY));

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
      x: 180 + (fieldsOnDoc.length * 20) % 220,
      y: 280 + (fieldsOnDoc.length * 30) % 300,
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
      x: 220,
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
      {/* Editor Header Bar */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-[#00a884] text-white px-2.5 py-1 rounded font-black text-sm">BEXSIGN</div>
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            className="bg-transparent border-b border-slate-700 hover:border-slate-500 text-slate-100 font-bold text-sm px-1 py-0.5 focus:outline-none focus:border-[#00a884]"
          />
          {statusMsg && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 size={14} /> {statusMsg}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveDraft}
            className="px-4 py-1.5 border border-slate-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5"
          >
            <Save size={14} /> Save Draft
          </button>

          <button
            onClick={handleContinueToSend}
            className="bg-[#00a884] hover:bg-[#008f70] text-white px-5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-md transition"
          >
            Continue to Send <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* Editor Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Canvas Preview with Mouse Drag-and-Drop & Direct Inline Editing */}
        <main
          className="flex-1 bg-slate-900 p-8 overflow-auto flex justify-center items-start cursor-default"
          onMouseMove={handleMouseMoveOnCanvas}
          onMouseUp={handleMouseUpCanvas}
        >
          <div
            ref={canvasRef}
            className="relative w-[680px] min-h-[880px] bg-white text-slate-900 p-12 shadow-2xl rounded-sm border border-slate-300"
          >
            {/* PDF Canvas Content */}
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Testing Sign</h1>
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
                  key={field.id}
                  onMouseDown={(e) => handleMouseDownOnField(e, field)}
                  style={{
                    top: `${field.y}px`,
                    left: `${field.x}px`,
                    borderColor: rec.color,
                    backgroundColor: `${rec.color}15`
                  }}
                  className={`absolute p-1.5 border-2 border-dashed rounded shadow-md cursor-move transition flex items-center gap-1.5 min-w-[150px] ${
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
                    className="w-full bg-transparent focus:outline-none font-bold text-xs p-0 m-0 border-b border-transparent focus:border-current"
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

              {/* Standard Fields Grid */}
              <div>
                <div className="flex border-b border-slate-800 pb-2 mb-3 text-xs font-extrabold text-slate-300">
                  <span className="border-b-2 border-[#00a884] text-[#00a884] pb-1">Standard fields</span>
                </div>
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
              </div>

              {/* Custom Fields Section */}
              <div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-800 mb-3 text-xs font-extrabold text-slate-300">
                  <span>Custom fields</span>
                  <button
                    onClick={() => setShowCreateCustomFieldModal(true)}
                    className="text-[11px] font-bold text-[#00a884] hover:underline flex items-center gap-0.5"
                  >
                    <Plus size={12} /> New Field
                  </button>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => addFieldToCanvas('Field Custom')}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-lg flex items-center justify-between text-xs font-medium text-slate-300"
                  >
                    <span>Field Custom</span>
                    <span style={{ color: selectedRecipient.color }}>+</span>
                  </button>
                </div>
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

      {/* Create Custom Field Modal */}
      {showCreateCustomFieldModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateCustomField} className="bg-white text-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Create custom field</h3>
              <button type="button" onClick={() => setShowCreateCustomFieldModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Custom field name</label>
                <input
                  type="text"
                  value={customFieldName}
                  onChange={(e) => setCustomFieldName(e.target.value)}
                  placeholder="e.g. Field Custom"
                  className="w-full border border-slate-300 rounded p-2"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Type</label>
                <select
                  value={customFieldType}
                  onChange={(e) => setCustomFieldType(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 font-semibold"
                >
                  <option value="Text">Text</option>
                  <option value="Date">Date</option>
                  <option value="Dropdown">Dropdown</option>
                </select>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-1.5 font-bold">
                  <input
                    type="checkbox"
                    checked={customFieldRequired}
                    onChange={(e) => setCustomFieldRequired(e.target.checked)}
                    className="accent-[#00a884]"
                  /> Required
                </label>
                <label className="flex items-center gap-1.5 font-bold text-slate-500">
                  <input type="checkbox" disabled /> Read only
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Character limit</label>
                <input
                  type="number"
                  value={customFieldCharLimit}
                  onChange={(e) => setCustomFieldCharLimit(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setShowCreateCustomFieldModal(false)} className="px-4 py-1.5 border border-slate-300 rounded text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" className="bg-[#00a884] hover:bg-[#008f70] text-white px-5 py-1.5 rounded text-xs font-bold">
                Create Field
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

