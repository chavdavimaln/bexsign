import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Plus, Users, ShieldCheck, Clock, Mail, CheckCircle2, ArrowLeft, X, Lock, FileText, UserCheck, Eye } from 'lucide-react';

export default function SendDocument() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [signingOrder, setSigningOrder] = useState('parallel'); // parallel or sequential
  const [recipients, setRecipients] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Signer', auth: 'Passcode', passcode: '123456', privateNote: 'Please review section 3 before signing.' },
    { id: 2, name: 'Sarah Connor', email: 'sarah@example.com', role: 'Approver', auth: 'Email OTP', passcode: '', privateNote: '' }
  ]);

  const [message, setMessage] = useState('Please review and execute this agreement at your earliest convenience.');
  const [reminderDays, setReminderDays] = useState('3');
  const [expirationDays, setExpirationDays] = useState('30');

  // Modals
  const [showAddRecipientModal, setShowAddRecipientModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [newRecipient, setNewRecipient] = useState({ name: '', email: '', role: 'Signer', auth: 'Passcode', passcode: '', privateNote: '' });
  const [confirmedReady, setConfirmedReady] = useState(false);

  const handleAddRecipient = (e) => {
    e.preventDefault();
    if (!newRecipient.name || !newRecipient.email) return;
    setRecipients([...recipients, { ...newRecipient, id: Date.now() }]);
    setNewRecipient({ name: '', email: '', role: 'Signer', auth: 'Passcode', passcode: '', privateNote: '' });
    setShowAddRecipientModal(false);
  };

  const removeRecipient = (recId) => {
    setRecipients(recipients.filter(r => r.id !== recId));
  };

  const handleSendDocument = async () => {
    if (!confirmedReady) {
      alert('Please check the confirmation box before sending.');
      return;
    }

    try {
      await fetch(`http://localhost:5000/api/documents/send/${id || 1}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients, signingOrder, message, reminderDays, expirationDays })
      });
    } catch (e) {
      console.warn('Send fallback:', e);
    }

    setShowConfirmModal(false);
    navigate('/documents/sent/in-progress');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(`/documents/${id || 1}/edit`)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-1"
          >
            <ArrowLeft size={14} /> Back to Document Field Editor
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900">Zoho Sign Workflow Dispatch</h1>
          <p className="text-xs text-slate-500 mt-1">Configure multi-role recipients, passcode security, and automated reminders.</p>
        </div>
        <button
          onClick={() => setShowConfirmModal(true)}
          className="btn-primary px-6 py-2.5 rounded-lg font-extrabold text-sm shadow-md flex items-center gap-2"
        >
          <Send size={18} /> Send Document Now
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Recipients & Signing Order */}
        <div className="md:col-span-2 space-y-6">
          {/* Recipients Section with Zoho Sign Roles */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="text-[#E71414]" size={18} /> Recipients & Roles (Zoho Sign Standard)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Assign Signer, In-Person Signer, Approver, or CC roles.</p>
              </div>
              <button
                onClick={() => setShowAddRecipientModal(true)}
                className="text-xs font-bold text-[#E71414] hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Add Recipient
              </button>
            </div>

            <div className="space-y-3">
              {recipients.map((rec, index) => (
                <div key={rec.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="h-7 w-7 rounded-full bg-red-100 text-[#E71414] font-bold text-xs flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          {rec.name}
                          {rec.role === 'Signer' && <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded font-extrabold uppercase">Signer</span>}
                          {rec.role === 'In-Person Signer' && <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded font-extrabold uppercase">In-Person Host</span>}
                          {rec.role === 'Approver' && <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded font-extrabold uppercase">Approver</span>}
                          {rec.role === 'CC' && <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded font-extrabold uppercase">CC Copy</span>}
                        </p>
                        <p className="text-xs text-slate-500">{rec.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-1 rounded font-semibold flex items-center gap-1">
                        <Lock size={12} /> {rec.auth} {rec.passcode ? `(${rec.passcode})` : ''}
                      </span>
                      <button onClick={() => removeRecipient(rec.id)} className="text-slate-400 hover:text-red-600 p-1">
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {rec.privateNote && (
                    <div className="pl-10 text-xs text-slate-600 bg-amber-50/60 p-2 rounded border border-amber-100 italic">
                      <strong>Private Note:</strong> "{rec.privateNote}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Signing Order Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Signing Order Strategy</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setSigningOrder('parallel')}
                className={`p-4 rounded-xl border text-left transition ${
                  signingOrder === 'parallel'
                    ? 'border-[#E71414] bg-red-50 text-[#E71414]'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-sm">Parallel Signing</div>
                <div className="text-xs text-slate-500 mt-1">All recipients receive the document simultaneously.</div>
              </button>

              <button
                onClick={() => setSigningOrder('sequential')}
                className={`p-4 rounded-xl border text-left transition ${
                  signingOrder === 'sequential'
                    ? 'border-[#E71414] bg-red-50 text-[#E71414]'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-sm">Sequential Signing (1 → 2 → 3)</div>
                <div className="text-xs text-slate-500 mt-1">Recipients receive sign requests one after another in order.</div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Message & Reminders */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Mail className="text-[#E71414]" size={18} /> Email Message
            </h2>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Message to Recipients</label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#E71414] focus:outline-none"
              ></textarea>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="text-[#E71414]" size={18} /> Reminders & Expiration
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Automated Reminders</label>
              <select
                value={reminderDays}
                onChange={(e) => setReminderDays(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
              >
                <option value="1">Every 1 day</option>
                <option value="3">Every 3 days</option>
                <option value="5">Every 5 days</option>
                <option value="7">Every 7 days</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Expiration Period</label>
              <select
                value={expirationDays}
                onChange={(e) => setExpirationDays(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
              >
                <option value="7">7 Days</option>
                <option value="15">15 Days</option>
                <option value="30">30 Days</option>
                <option value="60">60 Days</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Add Recipient Popup Modal (Zoho Sign Standard) */}
      {showAddRecipientModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddRecipient} className="bg-white text-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Recipient (Zoho Sign Standard)</h3>
              <button type="button" onClick={() => setShowAddRecipientModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newRecipient.name}
                  onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                  placeholder="e.g. Sarah Connor"
                  className="w-full border border-slate-300 rounded-lg p-2.5"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newRecipient.email}
                  onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                  placeholder="sarah@example.com"
                  className="w-full border border-slate-300 rounded-lg p-2.5"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role</label>
                  <select
                    value={newRecipient.role}
                    onChange={(e) => setNewRecipient({ ...newRecipient, role: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-semibold"
                  >
                    <option value="Signer">Signer (Must Sign)</option>
                    <option value="In-Person Signer">In-Person Signer (Host)</option>
                    <option value="Approver">Approver (Must Approve)</option>
                    <option value="CC">Receive a Copy (CC)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Authentication</label>
                  <select
                    value={newRecipient.auth}
                    onChange={(e) => setNewRecipient({ ...newRecipient, auth: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-semibold"
                  >
                    <option value="Passcode">Access Passcode</option>
                    <option value="Email OTP">Email OTP</option>
                    <option value="SMS OTP">SMS OTP</option>
                    <option value="None">None</option>
                  </select>
                </div>
              </div>

              {newRecipient.auth === 'Passcode' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Secret Access Passcode</label>
                  <input
                    type="text"
                    value={newRecipient.passcode}
                    onChange={(e) => setNewRecipient({ ...newRecipient, passcode: e.target.value })}
                    placeholder="e.g. 123456"
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Private Note (Optional)</label>
                <input
                  type="text"
                  value={newRecipient.privateNote}
                  onChange={(e) => setNewRecipient({ ...newRecipient, privateNote: e.target.value })}
                  placeholder="Private message visible only to this recipient..."
                  className="w-full border border-slate-300 rounded-lg p-2.5"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddRecipientModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary px-5 py-2 rounded-lg text-xs font-bold">
                Add Recipient
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Popup Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Send Document Confirmation</h3>
            <p className="text-xs text-slate-600 mb-4">
              You are about to send document to {recipients.length} recipients via {signingOrder} signing workflow.
            </p>

            <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="confirmReady"
                checked={confirmedReady}
                onChange={(e) => setConfirmedReady(e.target.checked)}
                className="accent-[#E71414]"
              />
              <label htmlFor="confirmReady" className="text-xs font-bold text-slate-800">
                I confirm the document is ready for dispatch.
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSendDocument}
                className="btn-primary px-5 py-2 rounded-lg text-xs font-extrabold"
              >
                Send Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
