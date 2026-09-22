import React, { useState, useEffect } from 'react';
import { X, Download, Printer, ShieldCheck, FileCheck, CheckCircle2 } from 'lucide-react';
import { generateBexsignId } from '../utils/documentId';
import { generateCompletionCertificatePdf } from '../utils/pdfGenerator';
import { getDocumentOwner } from '../utils/currentUser';
import { downloadCompletionCertificate } from '../utils/signedPdf';
import { API_BASE } from '../utils/api';

export default function CompletionCertificateModal({ doc, onClose }) {
  const [certData, setCertData] = useState(null);
  const [loading, setLoading] = useState(true);

  const documentName = doc?.document_name || doc?.title || doc?.name || "This is vnc's doc";
  const docId = doc?.bexsign_doc_id || generateBexsignId(doc?.id || 1);
  const signerName = doc?.signer_name || '';
  const signerEmail = doc?.recipient_email || '';
  const owner = getDocumentOwner(doc);
  const ownerName = owner.name;
  const ownerEmail = owner.email;
  const organization = owner.company || 'BexSign';
  const orgAddress = '';
  const isPhysicallySigned = Boolean(doc?.file_path && doc?.file_path.includes('signed'));
  const savedSig = doc?.signature_image || localStorage.getItem(`bexsign_doc_${doc?.id}_signature`) || '';

  // A certificate is evidence: a value that does not exist is shown as "-", never invented
  const stamp = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? String(value)
      : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  const sentDate = stamp(doc?.sent_at || doc?.created_at);
  const completedDate = stamp(doc?.completed_at || doc?.signed_at);
  const signedDate = stamp(doc?.signed_at);

  useEffect(() => {
    // Optionally fetch live certificate data from backend API
    const loadData = async () => {
      try {
        if (doc?.id) {
          const res = await fetch(`${API_BASE}/documents/${doc.id}/certificate-data`);
          const json = await res.json();
          if (json.success && json.certificate) {
            setCertData(json.certificate);
          }
        }
      } catch (e) {
        // Fallback to local props
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [doc?.id]);

  // What the server recorded for this request; the props are only a first paint before it arrives
  const summary = {
    sentOn: certData?.sentOn || sentDate,
    completedOn: certData?.completedOn || completedDate,
    signOrder: certData?.signOrder || '-',
    noOfDocuments: certData?.noOfDocuments ?? 1,
    timeZone: certData?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || '-',
    signersCount: certData?.signersCount ?? 0,
    receivesCopyCount: certData?.receivesCopyCount ?? 0,
    approversCount: certData?.approversCount ?? 0,
    witnessesCount: certData?.witnessesCount ?? 0,
    recipientReviewersCount: certData?.recipientReviewersCount ?? 0
  };
  const recipientList = certData?.recipients?.length
    ? certData.recipients
    : (signerName
      ? [{
        id: 'local',
        name: signerName,
        email: signerEmail,
        role: 'Signer',
        emailedOn: sentDate,
        viewedOn: '-',
        termsAgreedOn: '-',
        signedOn: signedDate,
        accessedFrom: '-',
        deviceUsed: '-',
        authenticationType: 'Email link',
        signatureImage: savedSig,
        signatureStyle: doc?.signature_style || 'font-signature-1',
        signedName: signerName,
        signedOnPaper: isPhysicallySigned
      }]
      : []);

  const handleDownloadPdf = async () => {
    // Completed requests: the locked certificate issued by the server (with document fingerprints)
    if (String(doc?.status || '').toLowerCase() === 'completed' && doc?.id) {
      try {
        await downloadCompletionCertificate(doc.id);
        return;
      } catch (err) {
        console.warn('Certificate download fallback:', err);
      }
    }
    // Fallback copy (the request is not completed yet, or the server file could not be fetched): still the real
    // recipient and the signature they actually used
    const primary = recipientList.find((r) => r.signedOn && r.signedOn !== '-') || recipientList[0] || {};
    generateCompletionCertificatePdf({
      documentName,
      docId,
      signerName: primary.name || signerName,
      signerEmail: primary.email || signerEmail,
      ownerName: certData?.owner || ownerName,
      ownerEmail: certData?.ownerEmail || ownerEmail,
      organization: certData?.organization || organization,
      orgAddress: certData?.orgAddress || orgAddress,
      sentDate: summary.sentOn,
      completedDate: summary.completedOn,
      signedDate: primary.signedOn || signedDate,
      ipAddress: primary.accessedFrom || '-',
      signatureImage: primary.signatureImage || savedSig,
      isPhysicallySigned: Boolean(primary.signedOnPaper || isPhysicallySigned)
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-4xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* MODAL CONTROLS HEADER */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#0284c7] flex items-center justify-center">
              <FileCheck size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Certificate of Completion</h2>
              <p className="text-xs text-slate-500 font-mono">BexSign Official Audit Trail</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded text-xs transition flex items-center gap-1.5 shadow-2xs"
            >
              <Printer size={14} />
              <span>Print Certificate</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="px-4 py-1.5 bg-[#00a884] hover:bg-[#008f70] text-white font-bold rounded text-xs transition flex items-center gap-1.5 shadow-xs"
            >
              <Download size={14} />
              <span>Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50 transition ml-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* SCROLLABLE CERTIFICATE DOCUMENT PAGES CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/90 flex flex-col items-center gap-8">
          {/* ================= PAGE 1 (Matching completion certificate example.pdf) ================= */}
          <div className="bg-white w-full max-w-[760px] min-h-[1020px] p-10 sm:p-14 shadow-lg border border-slate-300 rounded text-slate-800 flex flex-col justify-between select-text text-xs leading-relaxed font-sans">
            <div>
              {/* Top Row: Logo & Timestamp */}
              <div className="flex items-center justify-between pb-6">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-[10px]">
                    <FileCheck size={14} className="text-[#0284c7]" />
                  </div>
                  <span className="font-bold text-sm tracking-tight text-slate-900">BexSign</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Generated on {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} 06:12 EDT
                </div>
              </div>

              {/* Main Title */}
              <div className="text-center py-4">
                <h1 className="text-2xl font-bold text-[#0284c7] tracking-tight">
                  Certificate of Completion
                </h1>
              </div>

              <div className="border-t border-[#0284c7]/40 mb-6" />

              {/* Summary Section */}
              <div className="space-y-4 mb-8">
                <h2 className="text-base font-bold text-[#0284c7]">Summary</h2>
                <div className="space-y-1 text-xs">
                  <p className="break-all">
                    <span className="font-bold text-slate-900">Document ID:</span>{' '}
                    <span className="font-mono text-slate-800">{docId}</span>
                  </p>
                  <p>
                    <span className="font-bold text-slate-900">Document name:</span>{' '}
                    <span className="text-slate-800">{documentName}</span>
                  </p>
                  <p>
                    <span className="font-bold text-slate-900">Sent by:</span>{' '}
                    <span className="text-slate-800">{ownerName} &lt;{ownerEmail}&gt;</span>
                  </p>
                  <div>
                    <span className="font-bold text-slate-900">Organization:</span>{' '}
                    <span className="text-slate-800">{certData?.organization || organization}</span>
                    {(certData?.orgAddress || orgAddress) && (
                      <div className="text-slate-600 pl-4">{certData?.orgAddress || orgAddress}</div>
                    )}
                  </div>
                </div>

                {/* Summary of the request, from the request itself */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 text-xs">
                  <div className="space-y-1">
                    <p><span className="font-bold text-slate-900">Sent on:</span> {summary.sentOn}</p>
                    <p><span className="font-bold text-slate-900">Completed on:</span> {summary.completedOn}</p>
                    <p><span className="font-bold text-slate-900">Sign order:</span> {summary.signOrder}</p>
                    <p><span className="font-bold text-slate-900">No. of documents:</span> {summary.noOfDocuments}</p>
                    <p><span className="font-bold text-slate-900">Time zone:</span> {summary.timeZone}</p>
                  </div>
                  <div className="space-y-1">
                    <p><span className="font-bold text-slate-900">Signers:</span> {summary.signersCount}</p>
                    <p><span className="font-bold text-slate-900">Receives a copy:</span> {summary.receivesCopyCount}</p>
                    <p><span className="font-bold text-slate-900">Approvers:</span> {summary.approversCount}</p>
                    <p><span className="font-bold text-slate-900">Witnesses:</span> {summary.witnessesCount}</p>
                    <p><span className="font-bold text-slate-900">Recipient reviewers:</span> {summary.recipientReviewersCount}</p>
                  </div>
                </div>
              </div>

              {/* Recipients: every one of them, with the signature they actually signed with */}
              <div className="space-y-5">
                <h2 className="text-base font-bold text-[#0284c7]">Recipients</h2>

                {recipientList.length === 0 && (
                  <p className="text-xs text-slate-500">This request has no recipients.</p>
                )}

                {recipientList.map((rec, index) => (
                  <div key={rec.id || rec.email || index} className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1 border-t border-slate-100 first:border-t-0 pt-4 first:pt-1">
                    {/* Who they are and what they did */}
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="text-[#0284c7] flex flex-col items-center shrink-0">
                          <div className="w-8 h-8 rounded border border-sky-300 bg-sky-50 flex items-center justify-center">
                            <CheckCircle2 size={16} />
                          </div>
                          <span className="text-[10px] font-bold mt-0.5">{rec.role || 'Signer'}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 break-words">{rec.name}</p>
                          <p className="text-xs text-slate-600 font-mono break-all">{rec.email}</p>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs pt-2">
                        <p><span className="font-bold text-slate-700">Emailed on:</span> {rec.emailedOn}</p>
                        <p><span className="font-bold text-slate-700">Viewed on:</span> {rec.viewedOn}</p>
                        <p><span className="font-bold text-slate-700">Terms agreed on:</span> {rec.termsAgreedOn}</p>
                        <p><span className="font-bold text-slate-700">Signed on:</span> {rec.signedOn}</p>
                        {rec.declinedOn && rec.declinedOn !== '-' && (
                          <p className="text-rose-700"><span className="font-bold">Declined on:</span> {rec.declinedOn}{rec.declineReason ? ` - ${rec.declineReason}` : ''}</p>
                        )}
                      </div>
                    </div>

                    {/* The signature itself */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-[#0284c7]">Signature</h3>
                      <div className="min-h-16 flex items-center">
                        {rec.signedOnPaper ? (
                          <p className="text-xs text-slate-600">Signed on paper; the scanned copy is part of this request.</p>
                        ) : rec.signatureImage && String(rec.signatureImage).startsWith('data:') ? (
                          <img src={rec.signatureImage} alt={`Signature of ${rec.name}`} className="max-h-14 max-w-[220px] object-contain" />
                        ) : rec.signedOn && rec.signedOn !== '-' ? (
                          // Typed signature: rendered in the very style the signer chose
                          <span className={`text-2xl text-slate-900 border-b border-slate-400 pb-0.5 px-2 ${rec.signatureStyle || 'font-signature-1'}`}>
                            {rec.signedName || rec.name}
                          </span>
                        ) : (
                          <p className="text-xs text-slate-400">Not signed yet.</p>
                        )}
                      </div>

                      <div className="space-y-1 text-xs pt-2">
                        <p><span className="font-bold text-slate-700">Accessed from:</span> {rec.accessedFrom}</p>
                        <p><span className="font-bold text-slate-700">Device used:</span> {rec.deviceUsed}</p>
                        <p><span className="font-bold text-slate-700">Authentication type:</span> {rec.authenticationType}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ================= PAGE 2 (Legal Disclosure) ================= */}
          <div className="bg-white w-full max-w-[760px] min-h-[1020px] p-10 sm:p-14 shadow-lg border border-slate-300 rounded text-slate-800 flex flex-col justify-between select-text text-xs leading-relaxed font-sans">
            <div className="space-y-5">
              <h2 className="text-base font-bold text-[#0284c7]">Legal Disclosure</h2>
              <h3 className="text-sm font-bold text-[#0284c7] uppercase">ELECTRONIC RECORD AND SIGNATURE DISCLOSURE</h3>
              <p className="text-slate-700 text-xs leading-relaxed">
                Please read the following information carefully. By clicking the 'I agree' button, you agree that you have reviewed the
                following terms and conditions and consent to transact business electronically using Zoho Sign electronic signature
                system. If you do not agree to these terms, do not click the 'I agree' button.
              </p>

              <div className="space-y-1.5 pt-2">
                <h4 className="font-bold text-xs text-[#0284c7]">Electronic documents</h4>
                <p className="text-slate-700 text-xs leading-relaxed">
                  Please note that Dcode Health ("we", "us" or "Company") will send all documents electronically to you to the email
                  address that you have given us during the course of the business relationship unless you tell us otherwise in accordance
                  with the procedure explained herein. Once you sign a document electronically, we will send a PDF version of the
                  document to you.
                </p>
              </div>

              <div className="space-y-1.5 pt-2">
                <h4 className="font-bold text-xs text-[#0284c7]">Request for paper copies</h4>
                <p className="text-slate-700 text-xs leading-relaxed">
                  You have the right to request paper copies of these documents sent to you electronically from alpesh@dcodehealth.com.
                  Alternatively, you also have the ability to download and print these documents sent to you electronically, and re-upload a
                  scanned copy of the printed and physically signed documents. If you, however, wish to request paper copies of these
                  documents sent to you electronically, you can write back to the sender.
                </p>
              </div>

              <div className="space-y-1.5 pt-2">
                <h4 className="font-bold text-xs text-[#0284c7]">Withdrawing your consent</h4>
                <p className="text-slate-700 text-xs leading-relaxed">
                  At any point in time during the course of our business relationship, you have the right to withdraw your consent to
                  receive documents in electronic format. If you wish to withdraw your consent, you can decline to sign a document that we
                  have sent to you and send an email to alpesh@dcodehealth.com informing us that you wish to receive documents only in
                  paper format. Upon request from you, we will stop sending documents using Zoho Sign electronic signature system.
                </p>
              </div>

              <div className="space-y-1.5 pt-2">
                <h4 className="font-bold text-xs text-[#0284c7]">To advise Dcode Health of your new email address</h4>
                <p className="text-slate-700 text-xs leading-relaxed">
                  If you need to change the email address that you use to receive notices and disclosures from us, write to us at
                  alpesh@dcodehealth.com
                </p>
              </div>

              <div className="space-y-1.5 pt-2">
                <h4 className="font-bold text-xs text-[#0284c7]">System requirements</h4>
                <p className="text-slate-700 text-xs leading-relaxed">
                  Compatible with recent versions of popular browsers such as Chrome, Firefox, Safari, and Edge. Zoho Sign is also
                  available on iOS and Android devices.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
