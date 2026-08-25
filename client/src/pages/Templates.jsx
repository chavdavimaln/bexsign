import React, { useState, useEffect } from 'react';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/templates/1');
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setTemplates(data);
      } else if (data.templates && Array.isArray(data.templates)) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error('Failed to load templates from server');
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('templateName', templateName);
    if (file) {
      formData.append('templateFile', file);
    }
    formData.append('userId', 1);
    formData.append('activeSignForms', 1);

    try {
      const response = await fetch('http://localhost:5000/api/templates/create', {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        setIsModalOpen(false);
        setTemplateName('');
        setFile(null);
        fetchTemplates();
      } else {
        alert('Failed to create template');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 min-h-[calc(100vh-7rem)] text-bexText">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Templates</h2>
          <p className="text-xs text-gray-500 mt-1">
            Only admins can access all the templates by default. To limit users' use templates, use the "Shared" option.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-bexPrimary text-white px-4 py-2 rounded text-sm font-semibold hover:bg-red-700 transition"
        >
          + Create Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-gray-200 rounded-lg mt-6">
          <p className="text-gray-500 text-sm">No data available.</p>
        </div>
      ) : (
        <table className="w-full text-left mt-6 border-collapse">
          <thead>
            <tr className="border-b text-xs text-gray-500 uppercase">
              <th className="py-3 px-4">Template Name</th>
              <th className="py-3 px-4">Active Sign Forms</th>
              <th className="py-3 px-4">Last Modified On</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {templates.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{t.template_name}</td>
                <td className="py-3 px-4">{t.active_sign_forms ?? 1}</td>
                <td className="py-3 px-4 text-gray-500 text-xs">{new Date(t.last_modified || t.created_at || Date.now()).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Create Template Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg p-6 rounded-lg shadow-lg relative">
            <h3 className="text-lg font-bold mb-4 text-bexPrimary">Create a Template</h3>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Template Name</label>
                <input 
                  type="text" 
                  required
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-sm focus:ring-1 focus:ring-bexPrimary text-black"
                  placeholder="e.g. Standard NDA Template"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Upload Document File</label>
                <input 
                  type="file" 
                  required
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-bexPrimary file:text-white cursor-pointer"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded text-sm text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-4 py-2 bg-bexPrimary text-white rounded text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
