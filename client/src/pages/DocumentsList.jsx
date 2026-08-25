import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function DocumentsList() {
  const [activeTab, setActiveTab] = useState('All');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fallback initial documents when backend database is empty
  const initialDocuments = [
    { id: 1, document_name: 'Agreement.pdf', folder_name: 'Sent', recipient_email: 'akash@bexcodeservices.com', status: 'Completed', created_at: '2026-08-25T18:30:00Z' },
    { id: 2, document_name: 'Contract_v2.pdf', folder_name: 'Sent', recipient_email: 'client@example.com', status: 'In Progress', created_at: '2026-08-24T14:15:00Z' },
    { id: 3, document_name: 'NDA_Vendor.pdf', folder_name: 'Unsorted', recipient_email: 'legal@vendor.com', status: 'Draft', created_at: '2026-08-23T10:00:00Z' },
  ];

  // Fetch documents based on selected tab status
  useEffect(() => {
    fetchDocuments(activeTab);
  }, [activeTab]);

  const fetchDocuments = async (status) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/documents/status/1/${encodeURIComponent(status)}`);
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setDocuments(data);
      } else {
        const filtered = status === 'All' ? initialDocuments : initialDocuments.filter(d => d.status.toLowerCase() === status.toLowerCase());
        setDocuments(filtered);
      }
    } catch (err) {
      console.warn('Failed to fetch documents, fallback to initial state:', err.message);
      const filtered = status === 'All' ? initialDocuments : initialDocuments.filter(d => d.status.toLowerCase() === status.toLowerCase());
      setDocuments(filtered);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    'All', 'Draft', 'In Progress', 'Completed', 'Declined', 'Expired', 'Recalled', 'Scheduled', 'Bulk send'
  ];

  return (
    <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 min-h-[calc(100vh-7rem)] text-bexText">
      {/* Sidebar Filter Menu */}
      <div className="w-64 border-r border-gray-200 p-4 shrink-0">
        <h3 className="font-bold text-md mb-3 text-bexPrimary">Documents</h3>
        
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Sent</p>
          <ul className="space-y-1">
            {tabs.map((tab) => (
              <li key={tab}>
                <button
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-3 py-1.5 rounded text-sm transition ${
                    activeTab === tab ? 'bg-red-50 text-bexPrimary font-semibold' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab === 'All' ? 'All Documents' : tab}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Received</p>
          <button 
            onClick={() => setActiveTab('Needs your action')}
            className={`w-full text-left px-3 py-1.5 rounded text-sm transition ${
              activeTab === 'Needs your action' ? 'bg-red-50 text-bexPrimary font-semibold' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Needs your action
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{activeTab} Documents</h2>
          <Link 
            to="/documents/create" 
            className="bg-bexPrimary text-white px-4 py-2 rounded text-sm font-semibold hover:bg-red-700 transition"
          >
            + Create Document
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading documents...</p>
        ) : documents.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-500 text-sm">No data available for {activeTab}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                  <th className="py-3 px-4">Document Name</th>
                  <th className="py-3 px-4">Folder</th>
                  <th className="py-3 px-4">Recipient Email</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{doc.document_name}</td>
                    <td className="py-3 px-4 text-gray-600">{doc.folder_name || 'Unsorted'}</td>
                    <td className="py-3 px-4 text-gray-600">{doc.recipient_email || 'N/A'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        doc.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        doc.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {new Date(doc.created_at || doc.created_on || Date.now()).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
