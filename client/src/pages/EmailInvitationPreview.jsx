import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mail, ArrowLeft, ExternalLink, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';

/**
 * Email Invitation Preview (Page 7)
 * Replicates the exact email notification template shown in the PDF document:
 * - "Manu Yadav from Dcode Health requests you to sign This is vnc's doc"
 * - Digital Signature Request banner
 * - Metadata table (Sender, Organization, Expires on)
 * - Coral/Red [Start Signing] button
 */
export default function EmailInvitationPreview() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [docDetails, setDocDetails] = useState({
    name: "This is vnc's doc",
    sender: 'Manu Yadav',
    senderEmail: 'manu.yadav@oladigital.health',
    orgName: 'Dcode Health',
    expiresOn: 'Sep 16, 2026',
    message: '-'
  });

  useEffect(() => {
    // Fetch document details or read from localStorage
    const fetchDoc = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/documents/${id || 1}`);
        const data = await res.json();
        if (data && data.document) {
          const d = data.document;
          const expiry = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
          setDocDetails({
            name: d.document_name || "This is vnc's doc",
            sender: d.owner || 'Manu Yadav',
            senderEmail: 'manu.yadav@oladigital.health',
            orgName: 'Dcode Health',
            expiresOn: expiry,
            message: d.custom_message || '-'
          });
        }
      } catch (e) {}
    };
    fetchDoc();
  }, [id]);

  const handleStartSigning = () => {
    navigate(`/documents/sign/${id || 1}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans -m-6 pb-16">
      {/* Top Navigation Bar */}
      <header className="h-14 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/documents')}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
            title="Back to Documents"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="font-bold text-slate-800 text-sm">Email Notification View</span>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded">
            Live Preview
          </span>
        </div>

        <button
          onClick={handleStartSigning}
          className="bg-[#007355] hover:bg-[#005c44] text-white px-4 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5"
        >
          <span>Open Signing View</span>
          <ExternalLink size={14} />
        </button>
      </header>

      {/* Email Client Container Preview */}
      <div className="max-w-2xl w-full mx-auto mt-8 bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden">
        {/* Email Header Info */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-900 leading-snug">
            {docDetails.sender} from {docDetails.orgName} requests you to sign {docDetails.name}
          </h2>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs">
                {docDetails.sender[0]}
              </span>
              <div>
                <p className="font-bold text-slate-800">notifications@bexsign.com</p>
                <p className="text-[11px] text-slate-400">to me</p>
              </div>
            </div>
            <span className="text-[11px] font-mono">Just now (0 minutes ago)</span>
          </div>
        </div>

        {/* Email Body Content */}
        <div className="p-8 space-y-6">
          {/* Logo / Brand Header */}
          <div className="flex items-center gap-2.5">
            <div className="bg-[#007355] text-white p-1.5 rounded font-black text-xs">BEX</div>
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">Bex<span className="text-[#007355]">Sign</span></span>
          </div>

          {/* Digital Signature Request Banner */}
          <div className="bg-[#48c79c] text-white py-3 px-6 rounded font-bold text-base shadow-xs">
            Digital Signature Request
          </div>

          <p className="text-sm text-slate-700 leading-relaxed">
            <strong>{docDetails.sender}</strong> has requested you to review and sign <strong>{docDetails.name}</strong>
          </p>

          {/* Metadata Table */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5 text-xs">
            <div className="grid grid-cols-3 gap-4 border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-600">Sender</span>
              <span className="col-span-2 text-slate-800 font-medium">{docDetails.senderEmail}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-600">Organization Name</span>
              <span className="col-span-2 text-slate-800 font-medium">{docDetails.orgName}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-600">Expires on</span>
              <span className="col-span-2 text-slate-800 font-medium">{docDetails.expiresOn}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-600">Message to all</span>
              <span className="col-span-2 text-slate-500 font-medium">{docDetails.message}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <span className="font-bold text-slate-600">Private Message</span>
              <span className="col-span-2 text-slate-500 font-medium">-</span>
            </div>
          </div>

          {/* Coral/Red Start Signing Button (Matching Page 7) */}
          <div className="py-4 flex justify-center">
            <button
              onClick={handleStartSigning}
              className="bg-[#ea5254] hover:bg-[#d94244] text-white px-10 py-3 rounded text-sm font-extrabold shadow-md transition transform hover:scale-102 flex items-center gap-2 cursor-pointer"
            >
              <span>Start Signing</span>
            </button>
          </div>

          {/* Email Footer Disclaimer */}
          <div className="pt-6 border-t border-slate-100 text-[11px] text-slate-400 space-y-1 leading-normal">
            <p>
              This is an automated email from BexSign. For any queries regarding this email, please contact the sender {docDetails.senderEmail} directly.
            </p>
            <p>
              If you think this email is inappropriate or spam, you may file a report with BexSign <span className="text-blue-600 underline cursor-pointer">here</span>. To turn off reminders for this document, <span className="text-blue-600 underline cursor-pointer">click here</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
