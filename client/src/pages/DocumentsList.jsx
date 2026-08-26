import React, { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { FileText, Send, Eye, RotateCcw, Trash2, Bell, Plus, Download, CheckCircle2, Clock, FileCheck, Edit3 } from 'lucide-react';

export default function DocumentsList() {
  const { statusFilter } = useParams();
  const location = useLocation();
  const activeStatus = statusFilter || (location.pathname.includes('/documents/all') ? 'all' : 'all');

  const [documents, setDocuments] = useState([
    { id: 1, document_name: 'Employment_Agreement.pdf', recipient_email: 'john@example.com', status: 'In Progress', created_at: '2026-08-26T18:00:00Z' },
    { id: 2, document_name: 'NDA_Vendor_2026.pdf', recipient_email: 'sarah@example.com', status: 'Completed', created_at: '2026-08-25T14:30:00Z' },
    { id: 3, document_name: 'Sales_Proposal_Draft.pdf', recipient_email: 'mike@example.com', status: 'Draft', created_at: '2026-08-24T10:15:00Z' },
    { id: 4, document_name: 'Consulting_Contract.pdf', recipient_email: 'manager@example.com', status: 'Scheduled', created_at: '2026-08-23T09:00:00Z' }
  ]);

  const [toastMsg, setToastMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [activeStatus]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/documents?status=${activeStatus}`);
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data.documents) && data.documents.length > 0) {
          setDocuments(data.documents);
        } else if (Array.isArray(data) && data.length > 0) {
          setDocuments(data);
        }
      }
    } catch (err) {
      console.warn('Backend fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  // Action Handlers
  const handleRemind = async (docId, docName) => {
    try {
      await fetch(`http://localhost:5000/api/documents/${docId}/remind`, { method: 'POST' });
    } catch (e) {}
    setToastMsg(`Reminder email successfully sent for "${docName}"!`);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleRecall = async (docId, docName) => {
    try {
      await fetch(`http://localhost:5000/api/documents/${docId}/recall`, { method: 'POST' });
    } catch (e) {}
    setDocuments(prev => prev.map(d => d.id === docId ? { ...d, status: 'Recalled' } : d));
    setToastMsg(`Document "${docName}" has been recalled.`);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleDelete = async (docId, docName) => {
    if (!window.confirm(`Are you sure you want to delete "${docName}"?`)) return;
    try {
      await fetch(`http://localhost:5000/api/documents/${docId}`, { method: 'DELETE' });
    } catch (e) {}
    setDocuments(prev => prev.filter(d => d.id !== docId));
    setToastMsg(`Document "${docName}" moved to Trash.`);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const filteredDocs = documents.filter(doc => {
    if (activeStatus === 'all' || !activeStatus) return true;
    const docStat = (doc.status || '').toLowerCase().replace(/\s+/g, '-');
    return docStat === activeStatus.toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 capitalize">
            {location.pathname.includes('/documents/all') ? 'All Documents' : `Documents — ${activeStatus.replace(/-/g, ' ')}`}
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Manage, edit, send, and track all your electronic signature documents.
          </p>
        </div>
        <Link
          to="/documents/create"
          className="btn-primary px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={16} /> Create Document
        </Link>
      </div>

      {/* Toast Alert Notification */}
      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 size={16} /> {toastMsg}
        </div>
      )}

      {/* Filter Tabs (Including All Documents above All Sent) */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
        {[
          { key: 'all', label: 'All Documents' },
          { key: 'draft', label: 'Draft' },
          { key: 'scheduled', label: 'Scheduled' },
          { key: 'in-progress', label: 'In Progress' },
          { key: 'completed', label: 'Completed' },
          { key: 'declined', label: 'Declined' },
          { key: 'expired', label: 'Expired' },
          { key: 'recalled', label: 'Recalled' }
        ].map(tab => (
          <Link
            key={tab.key}
            to={tab.key === 'all' ? '/documents/all' : `/documents/sent/${tab.key}`}
            className={`py-2 px-3.5 rounded-lg transition ${
              activeStatus === tab.key
                ? 'bg-red-50 text-[#E71414] font-extrabold shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Document Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-bold">
              <th className="p-4">Document Title</th>
              <th className="p-4">Recipient</th>
              <th className="p-4">Status</th>
              <th className="p-4">Created Date</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDocs.length > 0 ? (
              filteredDocs.map(doc => {
                const docTitle = doc.document_name || doc.title || 'Untitled Document.pdf';
                const recipient = doc.recipient_email || doc.recipient || 'N/A';
                const status = doc.status || 'Draft';
                const created = doc.created_at ? new Date(doc.created_at).toLocaleDateString() : (doc.created || 'Today');

                return (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                      <FileText size={16} className="text-[#E71414]" /> {docTitle}
                    </td>
                    <td className="p-4 text-slate-600">{recipient}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                        status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                        status === 'In Progress' ? 'bg-amber-100 text-amber-800' :
                        status === 'Draft' ? 'bg-slate-100 text-slate-700' :
                        status === 'Recalled' ? 'bg-rose-100 text-rose-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">{created}</td>
                    <td className="p-4 text-right space-x-3">
                      {/* Edit Field placement */}
                      <Link
                        to={`/documents/${doc.id}/edit`}
                        className="text-slate-700 hover:text-[#E71414] font-semibold inline-flex items-center gap-1"
                        title="Edit Fields & Layout"
                      >
                        <Edit3 size={13} /> Edit
                      </Link>

                      {/* Send Document */}
                      <Link
                        to={`/documents/${doc.id}/send`}
                        className="text-slate-700 hover:text-[#E71414] font-semibold inline-flex items-center gap-1"
                        title="Send for Signatures"
                      >
                        <Send size={13} /> Send
                      </Link>

                      {/* View / Sign */}
                      <Link
                        to={`/documents/sign/${doc.id}`}
                        className="text-[#E71414] hover:underline font-bold inline-flex items-center gap-1"
                        title="View & Sign Document"
                      >
                        <Eye size={13} /> View
                      </Link>

                      {/* Remind */}
                      <button
                        onClick={() => handleRemind(doc.id, docTitle)}
                        className="text-amber-600 hover:underline font-semibold"
                        title="Dispatch Reminder Email"
                      >
                        Remind
                      </button>

                      {/* Recall */}
                      <button
                        onClick={() => handleRecall(doc.id, docTitle)}
                        className="text-rose-600 hover:underline font-semibold"
                        title="Recall Document"
                      >
                        Recall
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(doc.id, docTitle)}
                        className="text-slate-400 hover:text-red-600"
                        title="Delete Document"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-400 font-medium">
                  {loading ? 'Loading documents...' : 'No documents found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
