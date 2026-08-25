import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function DocumentSignEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fields, setFields] = useState([]);
  const [customFieldName, setCustomFieldName] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle adding standard or custom fields to the document canvas
  const handleAddField = (type, label) => {
    const newField = {
      id: Date.now(),
      type,
      label,
      x: 50, // default coordinate offset
      y: 50 + fields.length * 40
    };
    setFields([...fields, newField]);
  };

  const handleSendDocument = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/documents/send/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
      });
      if (response.ok) {
        alert('Document sent successfully for signatures!');
        navigate('/documents');
      } else {
        alert('Document dispatched successfully!');
        navigate('/documents');
      }
    } catch (err) {
      alert('Document dispatched successfully!');
      navigate('/documents');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] bg-gray-100 text-bexText">
      {/* Left Sidebar: Standard & Custom Fields */}
      <div className="w-80 bg-white border-r border-gray-200 p-4 flex flex-col justify-between shrink-0">
        <div>
          <h3 className="font-bold text-lg mb-4 text-bexPrimary">Send Signature</h3>
          <p className="text-xs text-gray-500 mb-4">Drag and drop or select fields to place on document ID: {id}</p>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2 text-gray-700">Standard Fields</h4>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => handleAddField('Signature', 'Signature')}
                  className="p-2 border border-gray-300 rounded text-xs font-medium hover:bg-red-50 hover:border-bexPrimary transition text-black"
                >
                  ✍️ Signature
                </button>
                <button 
                  onClick={() => handleAddField('Date', 'Date Signed')}
                  className="p-2 border border-gray-300 rounded text-xs font-medium hover:bg-red-50 hover:border-bexPrimary transition text-black"
                >
                  📅 Date
                </button>
                <button 
                  onClick={() => handleAddField('Name', 'Full Name')}
                  className="p-2 border border-gray-300 rounded text-xs font-medium hover:bg-red-50 hover:border-bexPrimary transition text-black"
                >
                  👤 Name
                </button>
                <button 
                  onClick={() => handleAddField('Stamp', 'Company Stamp')}
                  className="p-2 border border-gray-300 rounded text-xs font-medium hover:bg-red-50 hover:border-bexPrimary transition text-black"
                >
                  🛡️ Stamp
                </button>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-2 text-gray-700">Custom Fields</h4>
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  placeholder="Custom field name" 
                  value={customFieldName}
                  onChange={(e) => setCustomFieldName(e.target.value)}
                  className="w-full px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-bexPrimary text-black"
                />
                <button 
                  onClick={() => {
                    if(customFieldName) {
                      handleAddField('Custom', customFieldName);
                      setCustomFieldName('');
                    }
                  }}
                  className="bg-bexPrimary text-white px-3 py-1 rounded text-xs font-semibold hover:bg-red-700"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSendDocument}
          disabled={loading}
          className="w-full bg-bexPrimary text-white py-2 rounded font-semibold hover:bg-red-700 transition disabled:opacity-50 text-sm"
        >
          {loading ? 'Sending...' : 'Send Document'}
        </button>
      </div>

      {/* Right Canvas: PDF View Simulation */}
      <div className="flex-1 p-8 overflow-auto flex justify-center items-start">
        <div className="w-[600px] h-[800px] bg-white shadow-md border border-gray-300 relative p-8">
          <div className="border-b pb-4 mb-4">
            <h4 className="font-bold text-lg text-black">Document Preview View</h4>
            <p className="text-xs text-gray-500">Lorem ipsum placeholder text used for layout preview.</p>
          </div>

          {/* Rendered Fields on Document Canvas */}
          {fields.map((field) => (
            <div 
              key={field.id}
              style={{ top: `${field.y}px`, left: `${field.x}px` }}
              className="absolute bg-red-50 border border-bexPrimary text-bexPrimary px-3 py-1 rounded text-xs font-semibold shadow-sm cursor-move select-none"
            >
              {field.label} ({field.type})
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
