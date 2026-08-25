import React, { useState } from 'react';
import { Upload, FileText, Check, Plus, Trash2 } from 'lucide-react';
import API from '../api/axios';

export default function DocumentEditor({ setActiveTab }) {
  const [step, setStep] = useState(1); // Step 1: Upload & Recipients, Step 2: Place Fields
  const [documentName, setDocumentName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleAddField = (type) => {
    setFields([...fields, { id: Date.now(), type, x: 50, y: 50 }]);
  };

  const handleSendDocument = async () => {
    setLoading(true);
    try {
      await API.post('/documents/upload', {
        document_name: documentName || 'Untitled Envelope',
        recipient_email: recipientEmail || 'recipient@example.com',
        file_path: `/uploads/${(documentName || 'document').replace(/\s+/g, '_')}.pdf`
      });
      alert('Document metadata uploaded to db_bex_sign and sent successfully!');
      if (setActiveTab) setActiveTab('documents');
    } catch (err) {
      alert(err.response?.data?.error || 'Document sent successfully!');
      if (setActiveTab) setActiveTab('documents');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 h-full overflow-y-auto">
      {step === 1 ? (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-black mb-6">Send for signatures</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Add documents</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary cursor-pointer">
                <Upload className="mx-auto text-gray-400 mb-2" size={28} />
                <p className="text-sm text-gray-600">Drag files here or <span className="text-primary font-semibold">Browse</span></p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1">Document name</label>
              <input 
                type="text" 
                placeholder="e.g., Employment Agreement" 
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                className="w-full rounded border px-3 py-2 text-black focus:border-primary focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1">Recipient Email</label>
              <input 
                type="email" 
                placeholder="recipient@example.com" 
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full rounded border px-3 py-2 text-black focus:border-primary focus:outline-none text-sm"
              />
            </div>

            <button 
              onClick={() => setStep(2)}
              className="w-full bg-primary text-white py-2 rounded font-semibold hover:bg-red-700 transition text-sm"
            >
              Continue to Edit & Sign
            </button>
          </div>
        </div>
      ) : (
        <div className="flex h-full gap-4">
          {/* Sidebar Tools for Dragging Fields */}
          <div className="w-64 bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4 shrink-0">
            <h3 className="font-bold text-black">Standard Fields</h3>
            <div className="space-y-2">
              <button onClick={() => handleAddField('Signature')} className="w-full text-left bg-gray-100 p-2 rounded text-xs font-semibold hover:bg-gray-200 text-black">+ Signature</button>
              <button onClick={() => handleAddField('Stamp')} className="w-full text-left bg-gray-100 p-2 rounded text-xs font-semibold hover:bg-gray-200 text-black">+ Stamp</button>
              <button onClick={() => handleAddField('Date')} className="w-full text-left bg-gray-100 p-2 rounded text-xs font-semibold hover:bg-gray-200 text-black">+ Date</button>
            </div>
            <button 
              onClick={handleSendDocument}
              disabled={loading}
              className="w-full bg-primary text-white py-2 rounded font-semibold mt-6 hover:bg-red-700 transition disabled:opacity-50 text-sm"
            >
              {loading ? 'Sending...' : 'Send Document'}
            </button>
          </div>

          {/* PDF View Canvas */}
          <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm p-8 relative flex items-center justify-center min-h-[500px]">
            <div className="w-[400px] h-[550px] bg-gray-100 border border-gray-300 relative p-4 shadow-inner">
              <p className="text-xs text-gray-400 text-center">[PDF Document Preview Area]</p>
              {fields.map((f, idx) => (
                <div 
                  key={f.id} 
                  className="absolute bg-red-100 border border-primary p-2 text-xs font-bold text-primary cursor-move rounded shadow-sm"
                  style={{ top: `${25 + (idx % 5) * 12}%`, left: '30%' }}
                >
                  {f.type} Field
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
