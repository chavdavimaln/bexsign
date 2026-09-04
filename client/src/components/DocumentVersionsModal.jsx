import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Eye, Clock, CheckCircle2 } from 'lucide-react';
import { generateAndDownloadPdf } from '../utils/pdfGenerator';
import { generateBexsignId } from '../utils/documentId';

export default function DocumentVersionsModal({ doc, onClose, onViewVersion }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  const documentName = doc?.document_name || doc?.title || doc?.name || "Document";
  const docId = doc?.bexsign_doc_id || generateBexsignId(doc?.id || 1);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        if (doc?.id) {
          const res = await fetch(`http://localhost:5000/api/documents/${doc.id}/versions`);
          const json = await res.json();
          if (json.success && json.versions && json.versions.length > 0) {
            setVersions(json.versions);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn('Versions fetch error:', e);
      }

      // Fallback version 1.0 snapshot
      const fallback = [
        {
          id: 1,
          version_label: '1.0',
          created_by: doc?.owner || 'Manu Yadav',
          details: doc?.status === 'Completed'
            ? 'Physically signed this document and uploaded a copy'
            : 'Initial draft version and document creation',
          created_at: doc?.created_at || '2026-09-02T19:40:00.000Z'
        }
      ];
      setVersions(fallback);
      setLoading(false);
    };

    fetchVersions();
  }, [doc?.id]);

  const handleDownloadVersion = (ver) => {
    const savedSig = doc?.signature_image || localStorage.getItem(`bexsign_doc_${doc?.id}_signature`) || '';
    const savedSigner = doc?.signer_name || localStorage.getItem(`bexsign_doc_${doc?.id}_signer`) || 'Vimal Chavda';
    const savedType = localStorage.getItem(`bexsign_doc_${doc?.id}_sigtype`) || (savedSig && savedSig.startsWith('data:') ? 'draw' : 'type');

    let docFields = [];
    if (doc?.fieldsByDoc && typeof doc.fieldsByDoc === 'object') {
      docFields = doc.fieldsByDoc[0] || Object.values(doc.fieldsByDoc).flat() || [];
    } else if (doc?.fields) {
      try {
        const parsed = typeof doc.fields === 'string' ? JSON.parse(doc.fields) : doc.fields;
        if (Array.isArray(parsed)) docFields = parsed;
      } catch (e) {}
    }
    if (docFields.length === 0 && doc?.id) {
      try {
        const savedByDoc = localStorage.getItem(`bexsign_doc_${doc.id}_fields_by_doc`);
        if (savedByDoc) {
          const parsed = JSON.parse(savedByDoc);
          if (parsed && typeof parsed === 'object') docFields = parsed[0] || Object.values(parsed).flat() || [];
        }
      } catch (e) {}
    }
    if (docFields.length === 0 && doc?.id) {
      try {
        const savedFlat = localStorage.getItem(`bexsign_doc_${doc.id}_fields`);
        if (savedFlat) {
          const parsed = JSON.parse(savedFlat);
          if (Array.isArray(parsed)) docFields = parsed;
        }
      } catch (e) {}
    }

    generateAndDownloadPdf({
      documentName: `${documentName}_v${ver.version_label || '1.0'}.pdf`,
      docId,
      signerName: savedSigner,
      signerEmail: doc?.recipient_email || 'vimal@bexcodeservices.com',
      date: ver.created_at ? new Date(ver.created_at).toLocaleString() : 'Sep 02, 2026 19:40',
      status: doc?.status || 'Completed',
      signatureImage: savedSig,
      signatureType: savedType,
      fields: docFields
    });
  };

  const handleViewVersion = (ver) => {
    if (onViewVersion) {
      onViewVersion(ver);
    } else {
      // Open CompletedDocumentViewer
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-lg max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Previous versions</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 tracking-wider">
                  <th className="py-2.5 px-4 w-[15%]">VERSION</th>
                  <th className="py-2.5 px-4 w-[60%]">DETAILS</th>
                  <th className="py-2.5 px-4 w-[25%] text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {versions.map((ver) => {
                  const formattedDate = ver.created_at
                    ? new Date(ver.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })
                    : 'Sep 02, 2026 19:40';

                  return (
                    <tr key={ver.id || ver.version_label} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-bold text-slate-800 align-top">
                        {ver.version_label || `${ver.version_number || 1}.0`}
                      </td>
                      <td className="py-3 px-4 space-y-0.5 align-top">
                        <p className="font-bold text-slate-900">
                          Created by {ver.created_by || 'Manu Yadav'}
                        </p>
                        <p className="text-slate-500 text-[11px]">
                          Created at {formattedDate}
                        </p>
                        <p className="text-slate-600 text-[11px]">
                          {ver.details || 'Physically signed this document and uploaded a copy'}
                        </p>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-center justify-end gap-3 font-semibold text-slate-700 text-xs">
                          <button
                            onClick={() => handleViewVersion(ver)}
                            className="hover:text-[#00a884] flex items-center gap-1 transition"
                            title="View this version"
                          >
                            <FileText size={14} />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => handleDownloadVersion(ver)}
                            className="hover:text-[#00a884] flex items-center gap-1 transition"
                            title="Download this version"
                          >
                            <Download size={14} />
                            <span>Download</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded text-xs transition shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
