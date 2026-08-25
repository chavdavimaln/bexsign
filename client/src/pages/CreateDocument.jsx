import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CreateDocument() {
  const navigate = useNavigate();

  // Document & File state
  const [documentName, setDocumentName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showAddDocDropdown, setShowAddDocDropdown] = useState(false);

  // Recipient state
  const [sendInOrder, setSendInOrder] = useState(true);
  const [recipients, setRecipients] = useState([
    {
      id: 1,
      email: '',
      name: '',
      role: 'Needs to sign',
      deliveryMode: 'Email',
      phone: '',
      privateNote: '',
      authType: 'None',
      language: 'English',
      sigProviders: 'all',
    },
  ]);

  // Modal & Drawer States
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [customizeRecipientId, setCustomizeRecipientId] = useState(null);

  // Customize Drawer Temp State
  const [tempPrivateNote, setTempPrivateNote] = useState('');
  const [tempAuthType, setTempAuthType] = useState('None');
  const [tempLanguage, setTempLanguage] = useState('English');
  const [tempSigProviders, setTempSigProviders] = useState('all');

  // More Settings State
  const [showMoreSettings, setShowMoreSettings] = useState(false);
  const [daysToComplete, setDaysToComplete] = useState(15);
  const [validityType, setValidityType] = useState('Forever');
  const [validityDate, setValidityDate] = useState('');
  const [documentType, setDocumentType] = useState('Others');
  const [folder, setFolder] = useState('None');
  const [description, setDescription] = useState('');

  // Note to all recipients
  const [noteToAll, setNoteToAll] = useState('');
  const [loading, setLoading] = useState(false);

  // Handlers for Recipients
  const handleAddRecipient = () => {
    const newId = recipients.length > 0 ? Math.max(...recipients.map((r) => r.id)) + 1 : 1;
    setRecipients([
      ...recipients,
      {
        id: newId,
        email: '',
        name: '',
        role: 'Needs to sign',
        deliveryMode: 'Email',
        phone: '',
        privateNote: '',
        authType: 'None',
        language: 'English',
        sigProviders: 'all',
      },
    ]);
  };

  const handleAddMe = () => {
    const userStr = localStorage.getItem('user');
    let myEmail = 'manu.yadav@oladigital.health';
    let myName = 'Manu Yadav';
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        myEmail = u.email || myEmail;
        myName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || myName;
      } catch (e) {}
    }

    if (recipients.length === 1 && !recipients[0].email && !recipients[0].name) {
      setRecipients([
        {
          ...recipients[0],
          email: myEmail,
          name: myName,
        },
      ]);
    } else {
      const newId = recipients.length > 0 ? Math.max(...recipients.map((r) => r.id)) + 1 : 1;
      setRecipients([
        ...recipients,
        {
          id: newId,
          email: myEmail,
          name: myName,
          role: 'Needs to sign',
          deliveryMode: 'Email',
          phone: '',
          privateNote: '',
          authType: 'None',
          language: 'English',
          sigProviders: 'all',
        },
      ]);
    }
  };

  const handleRecipientChange = (id, field, value) => {
    setRecipients(recipients.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleRemoveRecipient = (id) => {
    if (recipients.length > 1) {
      setRecipients(recipients.filter((r) => r.id !== id));
    }
  };

  // Open Customize Drawer
  const handleOpenCustomize = (recipient) => {
    setCustomizeRecipientId(recipient.id);
    setTempPrivateNote(recipient.privateNote || '');
    setTempAuthType(recipient.authType || 'None');
    setTempLanguage(recipient.language || 'English');
    setTempSigProviders(recipient.sigProviders || 'all');
  };

  // Save Customize Drawer
  const handleSaveCustomize = () => {
    setRecipients(
      recipients.map((r) =>
        r.id === customizeRecipientId
          ? {
              ...r,
              privateNote: tempPrivateNote,
              authType: tempAuthType,
              language: tempLanguage,
              sigProviders: tempSigProviders,
            }
          : r
      )
    );
    setCustomizeRecipientId(null);
  };

  // Submit & Proceed
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const firstRecipient = recipients[0] ? recipients[0].email : '';
    const formData = new FormData();
    formData.append('documentName', documentName || (selectedFile ? selectedFile.name : 'Untitled Document'));
    if (selectedFile) {
      formData.append('documentFile', selectedFile);
    }
    formData.append('recipientEmail', firstRecipient);
    formData.append('folderName', folder === 'None' ? 'Unsorted' : folder);
    formData.append('userId', 1);

    try {
      const response = await fetch('http://localhost:5000/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        navigate(`/documents/sign/${data.documentId || 1}`);
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err) {
      navigate(`/documents/sign/1`);
    } finally {
      setLoading(false);
    }
  };

  const activeCustomizeRecipient = recipients.find((r) => r.id === customizeRecipientId);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6 relative pb-20">
      {/* Top Header */}
      <h1 className="text-xl font-semibold text-gray-800 mb-6">Send for signatures</h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
        {/* Section 1: Add documents */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Add documents</h3>

          {/* Green dashed border card matching screenshot */}
          <div className="relative w-64 h-56 border-2 border-dashed border-emerald-600 rounded-md bg-white flex flex-col items-center justify-center p-4 text-center hover:bg-emerald-50/20 transition">
            {/* File Icon */}
            <div className="w-12 h-14 border border-gray-300 rounded flex items-center justify-center mb-3 bg-white text-gray-400 text-2xl font-bold">
              📄
            </div>

            <p className="text-lg text-gray-800 font-normal mb-1">Drag files here</p>
            <p className="text-xs text-gray-400 mb-3">or</p>

            {/* Green Add document Button with Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAddDocDropdown(!showAddDocDropdown)}
                className="bg-[#00795c] hover:bg-[#00634b] text-white text-xs font-semibold py-2 px-4 rounded flex items-center gap-1.5 shadow-sm transition"
              >
                <span>{selectedFile ? selectedFile.name.substring(0, 14) + '...' : 'Add document'}</span>
                <span className="text-[10px]">⌄</span>
              </button>

              {/* Dropdown Menu matching uploaded screenshot */}
              {showAddDocDropdown && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded shadow-xl z-30 text-left py-1 text-xs">
                  <div className="px-3 py-1 text-[11px] text-gray-400 flex items-center gap-1 font-medium">
                    <span>From</span>
                    <div className="h-[1px] bg-gray-200 flex-1"></div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById('desktop-file-input').click();
                      setShowAddDocDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 hover:text-[#00795c] font-medium transition"
                  >
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      alert('Cloud storage integration picker opened.');
                      setShowAddDocDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 hover:text-[#00795c] font-medium transition"
                  >
                    Cloud
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      alert('Select from saved templates.');
                      setShowAddDocDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 hover:text-[#00795c] font-medium transition"
                  >
                    Template(s)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      alert('Select mail merge template.');
                      setShowAddDocDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 hover:text-[#00795c] font-medium transition"
                  >
                    Mail merge template
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      alert('Blank document created.');
                      setShowAddDocDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 hover:text-[#00795c] font-medium transition"
                  >
                    Create
                  </button>
                </div>
              )}
            </div>

            {/* Hidden Desktop File Input */}
            <input
              id="desktop-file-input"
              type="file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                  if (!documentName) {
                    setDocumentName(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Section 2: Document name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Document name</label>
          <input
            type="text"
            placeholder="Enter name"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            className="w-80 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600 bg-white"
          />
        </div>

        {/* Section 3: Add recipients */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Add recipients</h3>

          {/* Action buttons bar */}
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => setSendInOrder(!sendInOrder)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded text-xs font-medium bg-white hover:bg-gray-50 text-gray-700"
            >
              <input type="checkbox" checked={sendInOrder} onChange={() => {}} className="accent-[#00795c] cursor-pointer" />
              <span>Send in order</span>
            </button>
            <button
              type="button"
              onClick={handleAddMe}
              className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium bg-white hover:bg-gray-50 text-gray-700"
            >
              Add me
            </button>
            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium bg-white hover:bg-gray-50 text-gray-700"
            >
              Add bulk recipients
            </button>
          </div>

          {/* Recipient Rows Container */}
          <div className="border border-gray-200 rounded-md bg-white p-3 space-y-3">
            {recipients.map((recipient, index) => (
              <div key={recipient.id} className="flex items-center gap-2 text-sm">
                {/* Drag handle & order number */}
                <div className="flex items-center gap-1 text-gray-400 font-mono text-xs cursor-move">
                  <span>⋮⋮</span>
                  <span className="w-5 text-center font-bold text-gray-700">{index + 1}</span>
                </div>

                {/* Email input */}
                <input
                  type="email"
                  placeholder="Email"
                  value={recipient.email}
                  onChange={(e) => handleRecipientChange(recipient.id, 'email', e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600 text-black"
                />

                {/* Name input */}
                <input
                  type="text"
                  placeholder="Name"
                  value={recipient.name}
                  onChange={(e) => handleRecipientChange(recipient.id, 'name', e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600 text-black"
                />

                {/* Role select */}
                <select
                  value={recipient.role}
                  onChange={(e) => handleRecipientChange(recipient.id, 'role', e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-emerald-600 text-black bg-white"
                >
                  <option value="Needs to sign">Needs to sign</option>
                  <option value="In-person signer">In-person signer</option>
                  <option value="Sign with witness">Sign with witness</option>
                  <option value="Manages Recipients">Manages Recipients</option>
                  <option value="Approver">Approver</option>
                  <option value="Receive a copy">Receive a copy</option>
                </select>

                {/* Delivery select */}
                <select
                  value={recipient.deliveryMode}
                  onChange={(e) => handleRecipientChange(recipient.id, 'deliveryMode', e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-emerald-600 text-black bg-white"
                >
                  <option value="Email">Email</option>
                  <option value="Email + SMS">Email + SMS</option>
                </select>

                {/* Customize button */}
                <button
                  type="button"
                  onClick={() => handleOpenCustomize(recipient)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-1"
                >
                  <span className="text-xs">≡</span> Customize
                </button>

                {/* Delete row button */}
                {recipients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRecipient(recipient.id)}
                    className="text-gray-400 hover:text-red-600 text-base font-bold px-1"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add recipient button */}
          <button
            type="button"
            onClick={handleAddRecipient}
            className="mt-2 text-xs font-semibold text-emerald-800 hover:underline border border-gray-300 rounded px-3 py-1.5 bg-white"
          >
            + Add recipient
          </button>
        </div>

        {/* Section 4: More settings accordion */}
        <div className="border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={() => setShowMoreSettings(!showMoreSettings)}
            className="flex items-center gap-1 text-sm font-semibold text-gray-800 hover:text-emerald-700 mb-4"
          >
            <span>More settings</span>
            <span>{showMoreSettings ? '˅' : '›'}</span>
          </button>

          {showMoreSettings && (
            <div className="space-y-4 max-w-md bg-white p-4 border border-gray-200 rounded-md">
              {/* Days to complete */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Days to complete</label>
                <input
                  type="number"
                  value={daysToComplete}
                  onChange={(e) => setDaysToComplete(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Agreement valid until */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Agreement valid until</label>
                <select
                  value={validityType}
                  onChange={(e) => setValidityType(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm text-black bg-white focus:outline-none focus:border-emerald-600"
                >
                  <option value="Forever">Forever</option>
                  <option value="Select date">Select date</option>
                </select>
                {validityType === 'Select date' && (
                  <input
                    type="date"
                    value={validityDate}
                    onChange={(e) => setValidityDate(e.target.value)}
                    className="w-full mt-2 px-3 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:border-emerald-600"
                  />
                )}
              </div>

              {/* Document type */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Document type</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm text-black bg-white focus:outline-none focus:border-emerald-600"
                >
                  <option value="Others">Others</option>
                  <option value="Contract">Contract</option>
                  <option value="Agreement">Agreement</option>
                  <option value="NDA">NDA</option>
                  <option value="Invoice">Invoice</option>
                  <option value="Purchase Order">Purchase Order</option>
                </select>
              </div>

              {/* Folder */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Folder</label>
                <select
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm text-black bg-white focus:outline-none focus:border-emerald-600"
                >
                  <option value="None">None</option>
                  <option value="Unsorted">Unsorted</option>
                  <option value="Legal">Legal</option>
                  <option value="HR">HR</option>
                  <option value="Sales">Sales</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  placeholder="Add description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 5: Note to all recipients */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">Note to all recipients</label>
          <textarea
            rows={3}
            value={noteToAll}
            onChange={(e) => setNoteToAll(e.target.value)}
            className="w-full max-w-md p-3 border border-gray-300 rounded-md text-sm text-black bg-white focus:outline-none focus:border-emerald-600"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#00795c] hover:bg-[#00634b] text-white font-semibold px-6 py-2 rounded text-xs transition disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Continue'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/documents')}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold px-6 py-2 rounded text-xs transition"
          >
            Close
          </button>
        </div>
      </form>

      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6">
        <button className="h-10 w-10 bg-[#00795c] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#00634b] transition text-lg">
          💬
        </button>
      </div>

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl overflow-hidden relative">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-base text-gray-800">Bulk import recipients</h3>
              <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="flex justify-end mb-4">
                <a href="#download" onClick={(e) => { e.preventDefault(); alert('Sample CSV downloaded.'); }} className="text-xs text-blue-600 hover:underline">
                  Download sample CSV file
                </a>
              </div>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-12 flex flex-col items-center justify-center bg-gray-50 text-center">
                <div className="w-12 h-14 border border-emerald-500 rounded bg-white flex items-center justify-center mb-3 text-emerald-600 text-xl font-bold">
                  📄
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Drag files here <span className="font-normal text-gray-400">or</span></p>
                <button
                  type="button"
                  onClick={() => alert('Select CSV file')}
                  className="bg-[#00795c] hover:bg-[#00634b] text-white text-xs font-semibold px-4 py-2 rounded transition"
                >
                  Upload
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-4 py-2 rounded transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customize Drawer */}
      {customizeRecipientId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div>
              {/* Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-base text-gray-800">
                  Customize ({activeCustomizeRecipient?.email || 'Recipient'})
                </h3>
                <button onClick={() => setCustomizeRecipientId(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
                  ×
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                {/* Private note */}
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <label className="text-xs font-semibold text-gray-700">Private note</label>
                    <span className="text-xs text-gray-400 cursor-pointer" title="Private note visible only to this recipient">ⓘ</span>
                  </div>
                  <textarea
                    rows={4}
                    value={tempPrivateNote}
                    onChange={(e) => setTempPrivateNote(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md text-sm text-black focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* Authentication */}
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <h4 className="text-sm font-semibold text-gray-800">Authentication</h4>
                    <span className="text-xs text-gray-400 cursor-pointer" title="Authentication mode">ⓘ</span>
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Authentication type</label>
                    <select
                      value={tempAuthType}
                      onChange={(e) => setTempAuthType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-black bg-white focus:outline-none focus:border-emerald-600"
                    >
                      <option value="None">None</option>
                      <option value="Email OTP">Email OTP</option>
                      <option value="SMS OTP">SMS OTP</option>
                      <option value="Offline code">Offline code</option>
                    </select>
                  </div>
                </div>

                {/* Email and interface language */}
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <h4 className="text-sm font-semibold text-gray-800">Email and interface language</h4>
                    <span className="text-xs text-gray-400 cursor-pointer" title="Interface language">ⓘ</span>
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Select language</label>
                    <select
                      value={tempLanguage}
                      onChange={(e) => setTempLanguage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-black bg-white focus:outline-none focus:border-emerald-600"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                      <option value="Hindi">Hindi</option>
                    </select>
                  </div>
                </div>

                {/* Digital signature providers */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-1">Digital signature providers</h4>
                  <p className="text-xs text-gray-500 mb-3">
                    Select the digital signature providers to be made available for this recipient to sign this document(s) with.
                  </p>
                  <div className="space-y-2 text-xs text-gray-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sigProviders"
                        checked={tempSigProviders === 'all'}
                        onChange={() => setTempSigProviders('all')}
                        className="accent-[#00795c]"
                      />
                      <span>All providers enabled by administrator</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sigProviders"
                        checked={tempSigProviders === 'selected'}
                        onChange={() => setTempSigProviders('selected')}
                        className="accent-[#00795c]"
                      />
                      <span>Selected providers</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-start gap-3 bg-gray-50">
              <button
                type="button"
                onClick={handleSaveCustomize}
                className="bg-[#00795c] hover:bg-[#00634b] text-white font-semibold px-4 py-1.5 rounded text-xs transition"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setCustomizeRecipientId(null)}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-1.5 rounded text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
