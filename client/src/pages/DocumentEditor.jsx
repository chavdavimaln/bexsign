import React, { useState, useEffect } from 'react';
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
  ListFilter
} from 'lucide-react';

export default function DocumentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [documentTitle, setDocumentTitle] = useState('Employment_Agreement_2026.pdf');
  const [recipientEmail, setRecipientEmail] = useState('john@example.com');
  const [statusMsg, setStatusMsg] = useState('');

  // Zoho Sign Color-Coded Recipient Field Assignment
  const recipientList = [
    { id: 1, name: 'John Doe', email: 'john@example.com', color: '#E71414', bg: 'bg-red-50', border: 'border-[#E71414]', text: 'text-[#E71414]' },
    { id: 2, name: 'Sarah Connor', email: 'sarah@example.com', color: '#0284c7', bg: 'bg-sky-50', border: 'border-sky-600', text: 'text-sky-700' },
    { id: 3, name: 'Mike Ross', email: 'mike@example.com', color: '#16a34a', bg: 'bg-emerald-50', border: 'border-emerald-600', text: 'text-emerald-700' }
  ];

  const [selectedRecipient, setSelectedRecipient] = useState(recipientList[0]);

  const [fieldsOnDoc, setFieldsOnDoc] = useState([
    { id: 1, type: 'Signature', label: 'Signature', x: 220, y: 350, required: true, assigneeId: 1, assignee: 'John Doe (john@example.com)' },
    { id: 2, type: 'Date', label: 'Date Signed', x: 440, y: 350, required: true, assigneeId: 1, assignee: 'John Doe (john@example.com)' },
    { id: 3, type: 'Signature', label: 'Approver Signature', x: 220, y: 440, required: true, assigneeId: 2, assignee: 'Sarah Connor (sarah@example.com)' }
  ]);

  // Field Settings Modal State
  const [selectedField, setSelectedField] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    if (id) fetchDocumentDetails();
  }, [id]);

  const fetchDocumentDetails = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/documents/${id}`);
      const data = await res.json();
      if (data.success && data.document) {
        setDocumentTitle(data.document.document_name || data.document.title || 'Untitled Document.pdf');
        if (data.document.recipient_email) {
          setRecipientEmail(data.document.recipient_email);
        }
      }
    } catch (e) {
      console.warn('Doc fetch fallback:', e);
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
    { type: 'Name', icon: <User size={16} /> },
    { type: 'Email', icon: <Mail size={16} /> },
    { type: 'Date', icon: <Calendar size={16} /> },
    { type: 'Text', icon: <FileText size={16} /> },
    { type: 'Number', icon: <Hash size={16} /> },
    { type: 'Checkbox', icon: <CheckSquare size={16} /> },
    { type: 'Dropdown', icon: <ListFilter size={16} /> },
    { type: 'Company', icon: <Building size={16} /> },
    { type: 'Job Title', icon: <Briefcase size={16} /> },
    { type: 'Phone', icon: <Phone size={16} /> }
  ];

  const addFieldToCanvas = (type) => {
    const newField = {
      id: Date.now(),
      type,
      label: type,
      x: 220 + (fieldsOnDoc.length * 20) % 200,
      y: 280 + (fieldsOnDoc.length * 30) % 300,
      required: true,
      assigneeId: selectedRecipient.id,
      assignee: `${selectedRecipient.name} (${selectedRecipient.email})`
    };
    setFieldsOnDoc([...fieldsOnDoc, newField]);
  };

  const openFieldSettings = (field) => {
    setSelectedField({ ...field });
    setShowSettingsModal(true);
  };

  const saveFieldSettings = () => {
    setFieldsOnDoc(fieldsOnDoc.map(f => f.id === selectedField.id ? selectedField : f));
    setShowSettingsModal(false);
  };

  const deleteField = (fieldId) => {
    setFieldsOnDoc(fieldsOnDoc.filter(f => f.id !== fieldId));
    setShowSettingsModal(false);
  };

  return (
    <div className="-m-6 h-[calc(100vh-4rem)] flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
      {/* Editor Header Bar */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-[#E71414] text-white px-2.5 py-1 rounded font-black text-sm">BEXSIGN</div>
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            className="bg-transparent border-b border-slate-700 hover:border-slate-500 text-slate-100 font-bold text-sm px-1 py-0.5 focus:outline-none focus:border-[#E71414]"
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
            className="btn-primary px-5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-md"
          >
            Continue to Send <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* Editor Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <aside className="w-64 bg-slate-950 border-r border-slate-800 p-4 flex flex-col gap-6 overflow-y-auto shrink-0">
          {/* Recipient Color Selector */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Assign Field To:</h3>
            <div className="space-y-1.5">
              {recipientList.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => setSelectedRecipient(rec)}
                  className={`p-2.5 rounded-lg border text-xs font-bold cursor-pointer transition flex items-center justify-between ${
                    selectedRecipient.id === rec.id
                      ? `${rec.border} ${rec.bg} ${rec.text}`
                      : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{rec.name}</span>
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: rec.color }} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">Standard Fields</h3>
            <div className="grid grid-cols-2 gap-2">
              {standardFields.map((field) => (
                <button
                  key={field.type}
                  onClick={() => addFieldToCanvas(field.type)}
                  className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-lg flex items-center gap-2 text-xs font-medium text-slate-200 transition text-left"
                >
                  <span style={{ color: selectedRecipient.color }}>{field.icon}</span>
                  <span className="truncate">{field.type}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">Custom Fields</h3>
            <div className="space-y-2">
              {['Custom Text', 'Custom Date', 'Custom Dropdown'].map((cField) => (
                <button
                  key={cField}
                  onClick={() => addFieldToCanvas(cField)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-lg flex items-center justify-between text-xs font-medium text-slate-300"
                >
                  <span>{cField}</span>
                  <span style={{ color: selectedRecipient.color }}>+</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* PDF Canvas Preview with Color-Coded Fields */}
        <main className="flex-1 bg-slate-900 p-8 overflow-auto flex justify-center items-start">
          <div className="relative w-[650px] min-h-[850px] bg-white text-slate-900 p-12 shadow-2xl rounded-sm border border-slate-300">
            {/* PDF Sample Content */}
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{documentTitle.replace(/\.[^/.]+$/, '')}</h1>
                <span className="text-xs text-slate-500 font-mono">DOC-ID: #{id || '89201'}</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                This agreement is executed between <strong>Bexsign Inc.</strong> and the assigned recipients below.
                By affixing their signature, each party confirms agreement to all standard terms and conditions.
              </p>
              <div className="h-40 border border-slate-200 bg-slate-50 rounded p-4 text-xs text-slate-500 italic">
                [ Document Paragraph & Content Canvas Area — Drag fields onto the document preview ]
              </div>
            </div>

            {/* Render Color-Coded Fields */}
            {fieldsOnDoc.map((field) => {
              const rec = recipientList.find(r => r.id === field.assigneeId) || recipientList[0];

              return (
                <div
                  key={field.id}
                  onClick={() => openFieldSettings(field)}
                  style={{
                    top: `${field.y}px`,
                    left: `${field.x}px`,
                    borderColor: rec.color,
                    backgroundColor: `${rec.color}15`
                  }}
                  className="absolute p-2 border-2 rounded shadow-md cursor-pointer hover:scale-105 transition flex items-center justify-between gap-2 min-w-[140px]"
                >
                  <div className="text-xs font-bold flex items-center gap-1" style={{ color: rec.color }}>
                    <PenTool size={12} /> {field.label} {field.required && <span className="text-red-600">*</span>}
                  </div>
                  <Settings size={12} style={{ color: rec.color }} className="opacity-80" />
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* Field Configuration Popup Modal */}
      {showSettingsModal && selectedField && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Settings size={18} className="text-[#E71414]" /> Field Settings Configuration
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Field Type</label>
              <input
                type="text"
                value={selectedField.type}
                disabled
                className="w-full bg-slate-100 border border-slate-300 rounded p-2 text-slate-600 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Assigned Recipient</label>
              <select
                value={selectedField.assigneeId}
                onChange={(e) => {
                  const rId = parseInt(e.target.value);
                  const r = recipientList.find(item => item.id === rId);
                  setSelectedField({
                    ...selectedField,
                    assigneeId: rId,
                    assignee: `${r.name} (${r.email})`
                  });
                }}
                className="w-full border border-slate-300 rounded p-2 text-slate-800 font-medium"
              >
                {recipientList.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.email})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Field Label Name</label>
              <input
                type="text"
                value={selectedField.label}
                onChange={(e) => setSelectedField({ ...selectedField, label: e.target.value })}
                className="w-full border border-slate-300 rounded p-2 text-slate-800 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="reqCheck"
                checked={selectedField.required}
                onChange={(e) => setSelectedField({ ...selectedField, required: e.target.checked })}
                className="accent-[#E71414]"
              />
              <label htmlFor="reqCheck" className="font-bold text-slate-800">
                Required Field (Signer Must Fill)
              </label>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <button
                onClick={() => deleteField(selectedField.id)}
                className="text-red-600 hover:underline text-xs font-semibold"
              >
                Delete Field
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveFieldSettings}
                  className="btn-primary px-4 py-1.5 rounded text-xs font-bold"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
