import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  Check
} from 'lucide-react';

export default function DocumentsList() {
  const { statusFilter } = useParams();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Active Modals State
  const [activeModal, setActiveModal] = useState(null); // 'extend' | 'reminder' | 'reminderSettings' | 'recall' | 'uploadSigned' | 'email' | 'saveCloud' | 'certificate' | 'history' | 'debug' | 'legal' | 'delete' | 'formData'
  const [recallReason, setRecallReason] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('2026-09-11');
  const [reminderDays, setReminderDays] = useState(5);
  const [autoReminderEnabled, setAutoReminderEnabled] = useState(true);
  const [emailRecipientInput, setEmailRecipientInput] = useState('');
  const [signedFileCertify, setSignedFileCertify] = useState(false);

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

  const triggerModal = (modalName, doc) => {
    setSelectedDoc(doc);
    setActiveMenuId(null);
    setActiveModal(modalName);
  };

  const handleActionToast = (msg) => {
    setActionMessage(msg);
    setActiveMenuId(null);
    setActiveModal(null);
    setTimeout(() => setActionMessage(''), 3500);
  };

  const executeDeleteDoc = () => {
    if (selectedDoc) {
      setDocuments(documents.filter(d => d.id !== selectedDoc.id));
      handleActionToast(`Moved document "${selectedDoc.document_name || selectedDoc.name}" to trash.`);
    }
  };

  const executeRecallDoc = () => {
    if (selectedDoc) {
      setDocuments(documents.map(d => d.id === selectedDoc.id ? { ...d, status: 'Draft' } : d));
      handleActionToast(`Document "${selectedDoc.document_name || selectedDoc.name}" recalled successfully.`);
    }
  };

  const filteredDocs = documents.filter(doc => {
    const docName = doc.document_name || doc.name || '';
    const matchSearch = docName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!statusFilter || statusFilter === 'all') return matchSearch;
    return matchSearch && doc.status?.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">All documents</h1>
          <p className="text-xs text-slate-500 mt-1">View status, manage signers, and execute document actions.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/documents/create"
            className="bg-[#00a884] hover:bg-[#008f70] text-white px-5 py-2 rounded-lg font-extrabold text-xs shadow-md flex items-center gap-2 transition"
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

      {/* Filter & Search Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by document name or recipient email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#00a884] focus:outline-none"
          />
        </div>
        <span className="text-xs font-bold text-slate-500">View 1 - {filteredDocs.length} of {documents.length}</span>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase font-extrabold border-b border-slate-200">
              <th className="p-3.5">DOCUMENT NAME</th>
              <th className="p-3.5">FOLDER NAME</th>
              <th className="p-3.5">OWNER</th>
              <th className="p-3.5">RECIPIENT EMAIL</th>
              <th className="p-3.5">SIGNFORM NAME</th>
              <th className="p-3.5">TEMPLATES USED</th>
              <th className="p-3.5">STATUS</th>
              <th className="p-3.5">CREATED ON</th>
              <th className="p-3.5 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredDocs.map((doc) => {
              const docName = doc.document_name || doc.name || 'Untitled.pdf';
              const docStatus = doc.status || 'Draft';
              const docOwner = doc.owner || 'Manu Yadav';
              const docRecipient = doc.recipient_email || doc.recipient || 'manu.yadav@oladigital.health';
              const docCreated = doc.created_at ? new Date(doc.created_at).toLocaleDateString() : doc.created || 'Aug 27, 2026';

              return (
                <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2">
                    <FileText size={16} className="text-[#00a884]" />
                    <span>{docName}</span>
                  </td>
                  <td className="p-3.5 text-slate-500">{doc.folder || '-'}</td>
                  <td className="p-3.5 text-slate-700">{docOwner}</td>
                  <td className="p-3.5 text-slate-600 max-w-xs truncate">{docRecipient}</td>
                  <td className="p-3.5 text-slate-500">{doc.signform || '-'}</td>
                  <td className="p-3.5 text-slate-500">{doc.templates || '-'}</td>
                  <td className="p-3.5">
                    {docStatus === 'Completed' && <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2.5 py-1 rounded font-black uppercase">COMPLETED</span>}
                    {docStatus === 'In Progress' && <span className="bg-orange-100 text-orange-800 text-[10px] px-2.5 py-1 rounded font-black uppercase">IN PROGRESS</span>}
                    {docStatus === 'Draft' && <span className="bg-sky-100 text-sky-800 text-[10px] px-2.5 py-1 rounded font-black uppercase">DRAFT</span>}
                  </td>
                  <td className="p-3.5 text-slate-500 font-mono text-[11px]">{docCreated}</td>
                  <td className="p-3.5 text-right relative">
                    <button
                      onClick={() => setActiveMenuId(activeMenuId === doc.id ? null : doc.id)}
                      className="p-1.5 hover:bg-slate-200 rounded text-slate-600"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {/* Status-Specific Context Action Menu Dropdown */}
                    {activeMenuId === doc.id && (
                      <div className="absolute right-3 top-10 w-52 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 text-left py-1 text-xs font-semibold text-slate-700 max-h-96 overflow-y-auto">
                        
                        {/* 1. IN PROGRESS STATUS CONTEXT MENU (17 ACTIONS) */}
                        {docStatus === 'In Progress' && (
                          <>
                            <button onClick={() => navigate(`/documents/sign/${doc.id}`)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 font-bold text-slate-900"><Eye size={14} /> View document</button>
                            <button onClick={() => navigate(`/documents/${doc.id}/send`)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Edit size={14} /> Edit</button>
                            <button onClick={() => { navigate(`/documents/${doc.id}/send`); handleActionToast('Document in correction state.'); }} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><FileCheck size={14} /> Correct document</button>
                            <button onClick={() => triggerModal('extend', doc)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Clock size={14} /> Extend</button>
                            <button onClick={() => triggerModal('reminder', doc)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Bell size={14} /> Send reminder</button>
                            <button onClick={() => triggerModal('reminderSettings', doc)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Sliders size={14} /> Reminder settings</button>
                            <button onClick={() => triggerModal('recall', doc)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-rose-600"><RotateCcw size={14} /> Recall</button>
                            <button onClick={() => triggerModal('uploadSigned', doc)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Upload size={14} /> Upload signed document</button>
                            <button onClick={() => triggerModal('email', doc)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Mail size={14} /> Email document</button>
                            <button onClick={() => triggerModal('saveCloud', doc)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Cloud size={14} /> Save to cloud</button>
                            <button onClick={() => handleActionToast(`Downloading ${docName}...`)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Download size={14} /> Download</button>
                            <button onClick={() => navigate(`/documents/${doc.id}/edit`)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Copy size={14} /> Edit as new</button>
                            <button onClick={() => handleActionToast(`Printing ${docName}...`)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Printer size={14} /> Print</button>
                            <button onClick={() => triggerModal('history', doc)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Clock size={14} /> Activity history</button>
                            <button onClick={() => triggerModal('debug', doc)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Info size={14} /> Copy debug info</button>
                            <button onClick={() => triggerModal('legal', doc)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><ShieldCheck size={14} /> View legal disclosure</button>
                            <div className="border-t my-1" />
                            <button onClick={() => triggerModal('delete', doc)} className="w-full px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2"><Trash2 size={14} /> Delete</button>
                          </>
                        )}

                        {/* 2. COMPLETED STATUS CONTEXT MENU (13 ACTIONS) */}
                        {docStatus === 'Completed' && (
                          <>
                            <button onClick={() => navigate(`/documents/sign/${doc.id}`)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 font-bold text-slate-900"><Eye size={14} /> View document</button>
                            <button onClick={() => navigate(`/documents/${doc.id}/send`)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Edit size={14} /> Edit</button>
                            <button onClick={() => triggerModal('certificate', doc)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 font-bold text-[#00a884]"><FileCheck size={14} /> Completion certificate</button>
                            <button onClick={() => triggerModal('email', doc)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Mail size={14} /> Email document</button>
                            <button onClick={() => triggerModal('saveCloud', doc)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Cloud size={14} /> Save to cloud</button>
                            <button onClick={() => handleActionToast(`Downloading ${docName}...`)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Download size={14} /> Download</button>
                            <button onClick={() => navigate(`/documents/${doc.id}/edit`)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Copy size={14} /> Edit as new</button>
                            <button onClick={() => handleActionToast(`Printing ${docName}...`)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Printer size={14} /> Print</button>
                            <button onClick={() => triggerModal('formData', doc)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Layers size={14} /> Form data</button>
                            <button onClick={() => triggerModal('history', doc)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Clock size={14} /> Activity history</button>
                            <button onClick={() => triggerModal('debug', doc)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Info size={14} /> Copy debug info</button>
                            <button onClick={() => triggerModal('legal', doc)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><ShieldCheck size={14} /> View legal disclosure</button>
                            <div className="border-t my-1" />
                            <button onClick={() => triggerModal('delete', doc)} className="w-full px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2"><Trash2 size={14} /> Delete</button>
                          </>
                        )}

                        {/* 3. DRAFT STATUS CONTEXT MENU (8 ACTIONS) */}
                        {docStatus === 'Draft' && (
                          <>
                            <button onClick={() => navigate(`/documents/${doc.id}/send`)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 font-bold text-[#00a884]"><ArrowRight size={14} /> Continue</button>
                            <button onClick={() => navigate(`/documents/sign/${doc.id}`)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Eye size={14} /> View document</button>
                            <button onClick={() => triggerModal('saveCloud', doc)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Cloud size={14} /> Save to cloud</button>
                            <button onClick={() => handleActionToast(`Downloading ${docName}...`)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Download size={14} /> Download</button>
                            <button onClick={() => navigate(`/documents/${doc.id}/edit`)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Copy size={14} /> Edit as new</button>
                            <button onClick={() => handleActionToast(`Printing ${docName}...`)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Printer size={14} /> Print</button>
                            <button onClick={() => triggerModal('debug', doc)} className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Info size={14} /> Copy debug info</button>
                            <div className="border-t my-1" />
                            <button onClick={() => triggerModal('delete', doc)} className="w-full px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2"><Trash2 size={14} /> Delete</button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
              <button onClick={() => handleActionToast(`Expiry date extended to ${newExpiryDate}`)} className="bg-[#00a884] text-white px-5 py-1.5 rounded text-xs font-extrabold shadow">Set</button>
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
              <button onClick={() => handleActionToast('Reminder notification sent to signers.')} className="bg-[#00a884] text-white px-5 py-1.5 rounded text-xs font-extrabold shadow">Yes</button>
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
              <button onClick={() => handleActionToast('Reminder settings saved successfully.')} className="bg-[#00a884] text-white px-5 py-1.5 rounded text-xs font-extrabold shadow">Save</button>
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
              <button onClick={() => handleActionToast('Signed document copy uploaded successfully!')} disabled={!signedFileCertify} className="bg-[#00a884] disabled:opacity-50 text-white px-5 py-1.5 rounded text-xs font-extrabold shadow">Confirm</button>
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
              <p><strong>Document ID:</strong> 361682B4-XIYNWFV9JTEVVY4CGVLPTGNY6UTSAXBV05CHNTWV7OA</p>
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
              <button onClick={() => window.print()} className="px-4 py-2 border border-slate-300 rounded font-bold">Print Certificate</button>
              <button onClick={() => handleActionToast('Certificate PDF downloaded!')} className="bg-[#00a884] text-white px-5 py-2 rounded font-extrabold shadow">Download PDF</button>
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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-extrabold border-b">
                    <th className="p-2">TIME OF ACTIVITY</th>
                    <th className="p-2">PERFORMED BY</th>
                    <th className="p-2">ACTION</th>
                    <th className="p-2">ACTIVITY</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[11px]">
                  <tr><td className="p-2">Aug 27, 2026 02:33</td><td className="p-2">Manu Yadav</td><td className="p-2"><span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">DRAFTED</span></td><td className="p-2">Document created</td></tr>
                  <tr><td className="p-2">Aug 27, 2026 02:36</td><td className="p-2">System Generated</td><td className="p-2"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">LINK EMAILED</span></td><td className="p-2">Document sent</td></tr>
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
              <p>Document ID - 361682B4-ERZWVA2U19FQKOU0LTHEPYMCRKHTZR2MFDEBT65NAG</p>
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
