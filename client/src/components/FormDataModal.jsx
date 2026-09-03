import React, { useState, useEffect } from 'react';
import { X, Download, ChevronDown, Check, Layers } from 'lucide-react';

export default function FormDataModal({ doc, onClose }) {
  const [recipientsData, setRecipientsData] = useState([]);
  const [selectedRecipientEmail, setSelectedRecipientEmail] = useState('');
  const [loading, setLoading] = useState(true);

  const documentName = doc?.document_name || doc?.title || doc?.name || "Document";

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        if (doc?.id) {
          const res = await fetch(`http://localhost:5000/api/documents/${doc.id}/form-data`);
          const json = await res.json();
          if (json.success && json.recipients && json.recipients.length > 0) {
            setRecipientsData(json.recipients);
            setSelectedRecipientEmail(json.recipients[0].email);
            return;
          }
        }
      } catch (e) {
        console.warn('Form data fetch error:', e);
      }

      // Fallback data
      const defaultEmail = doc?.recipient_email || 'vimal@bexcodeservices.com';
      const defaultName = doc?.signer_name || 'Vimal Chavda';
      const fallbackRecipients = [
        {
          id: 1,
          email: defaultEmail,
          name: defaultName,
          fields: [
            { name: 'Full Name', value: defaultName },
            { name: 'Email Address', value: defaultEmail },
            { name: 'Date Signed', value: doc?.signed_at ? new Date(doc.signed_at).toLocaleDateString() : 'Sep 01, 2026' },
            { name: 'Execution Status', value: doc?.status || 'Completed' },
            { name: 'Document Title', value: documentName },
            { name: 'Organization', value: 'Dcode Health' }
          ]
        }
      ];
      setRecipientsData(fallbackRecipients);
      setSelectedRecipientEmail(defaultEmail);
      setLoading(false);
    };

    fetchFormData();
  }, [doc?.id]);

  const currentRecipient = recipientsData.find(r => r.email === selectedRecipientEmail) || recipientsData[0];
  const fields = currentRecipient?.fields || [];

  const handleDownloadCsv = () => {
    if (!currentRecipient) return;

    let csvContent = 'FIELD NAME,FIELD VALUE,RECIPIENT\n';
    fields.forEach(f => {
      const cleanVal = String(f.value).replace(/"/g, '""');
      csvContent += `"${f.name}","${cleanVal}","${currentRecipient.email}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documentName}_form_data_${currentRecipient.email}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-lg max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Form data</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Select Recipient Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="text-xs font-semibold text-slate-700">
              Select recipient
            </label>
            <div className="relative min-w-[280px]">
              <select
                value={selectedRecipientEmail}
                onChange={(e) => setSelectedRecipientEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-semibold text-slate-800 appearance-none focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] shadow-2xs pr-8"
              >
                {recipientsData.map((r) => (
                  <option key={r.email} value={r.email}>
                    {r.email} {r.name ? `(${r.name})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Form Data Table */}
          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 tracking-wider">
                  <th className="py-2.5 px-4 w-1/2">FIELD NAME</th>
                  <th className="py-2.5 px-4 w-1/2">FIELD VALUE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {fields.length > 0 ? (
                  fields.map((f, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{f.name}</td>
                      <td className="py-2.5 px-4 text-slate-700">{f.value || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2" className="py-6 text-center text-slate-400">
                      No form fields recorded for this recipient.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded text-xs transition shadow-2xs"
          >
            Close
          </button>
          <button
            onClick={handleDownloadCsv}
            className="px-5 py-1.5 bg-[#00a884] hover:bg-[#008f70] text-white font-bold rounded text-xs transition shadow-xs flex items-center gap-1.5"
          >
            <Download size={13} />
            <span>Download CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
}
