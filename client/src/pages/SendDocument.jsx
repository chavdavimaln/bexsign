import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Plus, Users, ShieldCheck, Clock, Mail, CheckCircle2, ArrowLeft, X, Lock, FileText, UserCheck, Eye, Sliders, ChevronDown } from 'lucide-react';

export default function SendDocument() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [documentName, setDocumentName] = useState('Document Sign 4');
  const [signingOrder, setSigningOrder] = useState(true); // true = send in order (sequential)
  const [recipients, setRecipients] = useState([
    { id: 1, name: 'Vimal Chavda', email: 'vimal@bexcodeservices.com', role: 'Needs to sign', auth: 'Email OTP', passcode: '', privateNote: 'Private note', fieldCount: 2 },
    { id: 2, name: 'Dhruv patel', email: 'dhruv@bexcodeservices.com', role: 'Needs to sign', auth: 'None', passcode: '', privateNote: '', fieldCount: 3 }
  ]);

  const [noteToAll, setNoteToAll] = useState('Note to all recipients');
  const [daysToComplete, setDaysToComplete] = useState('15');
  const [agreementValidUntil, setAgreementValidUntil] = useState('Forever');
  const [documentType, setDocumentType] = useState('Others');
  const [folder, setFolder] = useState('None');
  const [description, setDescription] = useState('Description setting');
  const [allowComments, setAllowComments] = useState(false);
  const [autoReminders, setAutoReminders] = useState(true);
  const [reminderEveryDays, setReminderEveryDays] = useState('5');
  const [showMoreSettings, setShowMoreSettings] = useState(true);

  // Modals
  const [showAddRecipientModal, setShowAddRecipientModal] = useState(false);
  const [showConfirmDetailsModal, setShowConfirmDetailsModal] = useState(false);
  const [newRecipient, setNewRecipient] = useState({ name: '', email: '', role: 'Needs to sign', auth: 'Email OTP', passcode: '', privateNote: '' });

  const handleAddRecipient = (e) => {
    e.preventDefault();
    if (!newRecipient.name || !newRecipient.email) return;
    setRecipients([...recipients, { ...newRecipient, id: Date.now(), fieldCount: 2 }]);
    setNewRecipient({ name: '', email: '', role: 'Needs to sign', auth: 'Email OTP', passcode: '', privateNote: '' });
    setShowAddRecipientModal(false);
  };

  const removeRecipient = (recId) => {
    setRecipients(recipients.filter(r => r.id !== recId));
  };

  const handleConfirmAndSend = async () => {
    try {
      await fetch(`http://localhost:5000/api/documents/send/${id || 1}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentName,
          recipients,
          signingOrder,
          noteToAll,
          daysToComplete,
          autoReminders,
          reminderEveryDays
        })
      });
    } catch (e) {
      console.warn('Send fallback:', e);
    }

    setShowConfirmDetailsModal(false);
    navigate('/documents/sent/in-progress');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <button
            onClick={() => navigate(`/documents/${id || 1}/edit`)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-1"
          >
            <ArrowLeft size={14} /> Back to Document Field Editor
          </button>
          <h1 className="text-xl font-extrabold text-slate-900">Edit document details</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/documents/all')}
            className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Save & close
          </button>
          <button
            onClick={() => setShowConfirmDetailsModal(true)}
            className="bg-[#00a884] hover:bg-[#008f70] text-white px-6 py-2 rounded-lg font-extrabold text-xs shadow-md flex items-center gap-2"
          >
            <Send size={15} /> Continue
          </button>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-2xs space-y-6">
        {/* Document Card Thumbnail (Page 14 PDF) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Add documents</label>
          <div className="flex items-center gap-4">
            <div className="h-28 w-24 border border-slate-300 bg-slate-900 rounded p-2 text-[8px] text-white flex flex-col justify-center items-center shadow">
              <FileText size={24} className="text-emerald-400 mb-1" />
              <span className="truncate w-full text-center">Test Document 1</span>
            </div>
            <div className="flex-1 space-y-1">
              <label className="block text-xs font-bold text-slate-700">Document name</label>
              <input
                type="text"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                className="w-72 p-2 bg-slate-50 border border-slate-300 rounded text-xs font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Recipients Section (Page 14 PDF) */}
        <div className="space-y-3">
          <div className="flex justify-between items-center pb-2 border-b">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-slate-900">Recipients</h2>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={signingOrder}
                  onChange={(e) => setSigningOrder(e.target.checked)}
                  className="accent-[#00a884]"
                /> Send in order
              </label>
            </div>
            <button
              onClick={() => setShowAddRecipientModal(true)}
              className="text-xs font-bold text-[#00a884] hover:underline flex items-center gap-1"
            >
              <Plus size={14} /> Add Recipient
            </button>
          </div>

          {recipients.map((rec, idx) => (
            <div key={rec.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/70 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-xs font-mono font-bold text-slate-400">:: {idx + 1}</span>
                  <input
                    type="text"
                    value={rec.email}
                    readOnly
                    className="flex-1 p-2 bg-white border border-slate-300 rounded text-xs font-medium"
                  />
                  <input
                    type="text"
                    value={rec.name}
                    readOnly
                    className="flex-1 p-2 bg-white border border-slate-300 rounded text-xs font-medium"
                  />
                  <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded text-xs font-bold">
                    {rec.role}
                  </span>
                  <span className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded text-xs font-semibold">
                    Email
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 border border-slate-300 bg-white hover:bg-slate-100 rounded text-xs font-semibold">
                    Customize
                  </button>
                  <button onClick={() => removeRecipient(rec.id)} className="text-slate-400 hover:text-red-600 p-1">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Sub-rows for Private Note & Authentication */}
              <div className="pl-8 space-y-1 text-xs text-slate-600">
                {rec.privateNote && (
                  <p className="flex items-center gap-1 text-amber-700">
                    🔒 <strong>Private message :</strong> {rec.privateNote}
                  </p>
                )}
                {rec.auth !== 'None' && (
                  <p className="flex items-center gap-1 text-emerald-700 font-medium">
                    🔑 <strong>Authentication ({rec.auth}):</strong> {rec.email}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* More Settings Dropdown (Page 14 PDF) */}
        <div className="border-t border-slate-200 pt-4 space-y-4">
          <button
            type="button"
            onClick={() => setShowMoreSettings(!showMoreSettings)}
            className="text-xs font-bold text-slate-800 flex items-center gap-1 hover:text-[#00a884]"
          >
            More settings <ChevronDown size={14} className={`transform transition ${showMoreSettings ? 'rotate-180' : ''}`} />
          </button>

          {showMoreSettings && (
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Days to complete</label>
                <input
                  type="number"
                  value={daysToComplete}
                  onChange={(e) => setDaysToComplete(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Agreement valid until</label>
                <select
                  value={agreementValidUntil}
                  onChange={(e) => setAgreementValidUntil(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
                >
                  <option value="Forever">Forever</option>
                  <option value="1 Year">1 Year</option>
                  <option value="3 Years">3 Years</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Document type</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
                >
                  <option value="Others">Others</option>
                  <option value="Sales Contract">Sales Contract</option>
                  <option value="NDA">NDA</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Folder</label>
                <select
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
                >
                  <option value="None">None</option>
                  <option value="Legal">Legal</option>
                  <option value="HR">HR</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded"
                />
              </div>
            </div>
          )}

          <div className="space-y-3 pt-2 text-xs">
            <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={allowComments}
                onChange={(e) => setAllowComments(e.target.checked)}
                className="accent-[#00a884]"
              /> Allow recipient comments
            </label>

            <div className="space-y-1">
              <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoReminders}
                  onChange={(e) => setAutoReminders(e.target.checked)}
                  className="accent-[#00a884]"
                /> Automatic reminders
              </label>
              <p className="text-[10px] text-slate-400 pl-6">Automatic reminders will only be delivered via email.</p>
            </div>

            {autoReminders && (
              <div className="pl-6 flex items-center gap-2">
                <span className="text-slate-600">Send a reminder every</span>
                <input
                  type="number"
                  value={reminderEveryDays}
                  onChange={(e) => setReminderEveryDays(e.target.value)}
                  className="w-16 p-1 bg-slate-50 border border-slate-300 rounded font-bold text-center"
                />
                <span className="text-slate-600">day(s)</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <label className="block text-xs font-bold text-slate-700 mb-1">Note to all recipients</label>
            <textarea
              rows={3}
              value={noteToAll}
              onChange={(e) => setNoteToAll(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-[#00a884]"
            ></textarea>
          </div>
        </div>
      </div>

      {/* Add Recipient Modal */}
      {showAddRecipientModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddRecipient} className="bg-white text-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Add Recipient</h3>
              <button type="button" onClick={() => setShowAddRecipientModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newRecipient.name}
                  onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                  placeholder="e.g. Vimal Chavda"
                  className="w-full border border-slate-300 rounded p-2"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newRecipient.email}
                  onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                  placeholder="vimal@bexcodeservices.com"
                  className="w-full border border-slate-300 rounded p-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role</label>
                  <select
                    value={newRecipient.role}
                    onChange={(e) => setNewRecipient({ ...newRecipient, role: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 font-semibold"
                  >
                    <option value="Needs to sign">Needs to sign</option>
                    <option value="In-person signer">In-person signer</option>
                    <option value="Approver">Approver</option>
                    <option value="Receive a copy">Receive a copy</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Authentication</label>
                  <select
                    value={newRecipient.auth}
                    onChange={(e) => setNewRecipient({ ...newRecipient, auth: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 font-semibold"
                  >
                    <option value="Email OTP">Email OTP</option>
                    <option value="SMS OTP">SMS OTP</option>
                    <option value="None">None</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Private message (Optional)</label>
                <input
                  type="text"
                  value={newRecipient.privateNote}
                  onChange={(e) => setNewRecipient({ ...newRecipient, privateNote: e.target.value })}
                  placeholder="Private note for recipient..."
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setShowAddRecipientModal(false)} className="px-4 py-1.5 border border-slate-300 rounded text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" className="bg-[#00a884] text-white px-5 py-1.5 rounded text-xs font-bold">
                Add Recipient
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Details Pre-Send Modal (Page 10 PDF) */}
      {showConfirmDetailsModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 font-sans text-xs">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="text-sm font-bold text-slate-900">Confirm details</h3>
              <button onClick={() => setShowConfirmDetailsModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <p className="text-slate-600">Please verify the number of fields added for each recipient and confirm:</p>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase font-bold border-b">
                    <th className="p-3">Recipient</th>
                    <th className="p-3 text-right">Fields</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                  {recipients.map((rec) => (
                    <tr key={rec.id}>
                      <td className="p-3">{rec.email}</td>
                      <td className="p-3 text-right font-mono font-bold text-[#00a884]">{rec.fieldCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setShowConfirmDetailsModal(false)}
                className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAndSend}
                className="bg-[#00a884] hover:bg-[#008f70] text-white px-5 py-2 rounded text-xs font-extrabold"
              >
                Confirm and send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
