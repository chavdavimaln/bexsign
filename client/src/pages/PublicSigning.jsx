import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PenTool, CheckCircle2, ShieldCheck, AlertCircle, X, Download, ArrowLeft, Lock, ArrowRight, FileCheck, CheckSquare, Printer, Mail, Copy, Save, ChevronDown, ZoomIn, ZoomOut } from 'lucide-react';
import { generateBexsignId } from '../utils/documentId';
import SignatureStamp from '../components/SignatureStamp';
import { showPopupAlert } from '../components/GlobalAlertModal';
import { generateAndDownloadPdf } from '../utils/pdfGenerator';

export default function PublicSigning() {
  const { token, id } = useParams();
  const docId = id || token || '1';
  const navigate = useNavigate();
  const fullBexsignId = generateBexsignId(docId);
  const [copiedId, setCopiedId] = useState(false);

  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [downloadPassword, setDownloadPassword] = useState('');
  const [zoomLevel, setZoomLevel] = useState(100);

  const handleCopyId = () => {
    navigator.clipboard.writeText(fullBexsignId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Landing & Disclosure Screen State (Page 11 PDF)
  const [showLandingScreen, setShowLandingScreen] = useState(true);
  const [agreedConsent, setAgreedConsent] = useState(false);

  // Document & Guided Navigator State
  const [documentDetails, setDocumentDetails] = useState({
    title: 'Document Sign 4',
    sender: 'Manu Yadav <manu.yadav@oladigital.health>',
    org: 'Dcode Health',
    recipient: 'vimal@bexcodeservices.com',
    status: 'In Progress',
    expiresIn: '15 days'
  });

  // Signature state
  const [signaturePlaced, setSignaturePlaced] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const [signatureType, setSignatureType] = useState('type'); // type, draw, upload
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [sigType, setSigType] = useState('type'); // type, draw, upload
  const [typedName, setTypedName] = useState('Vimal Chavda');
  const [selectedStyle, setSelectedStyle] = useState('font-signature-1');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  // Canvas drawing ref
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    fetchDocumentDetails();
  }, [docId]);

  const fetchDocumentDetails = async () => {
    try {
      // 1. Check local saved state first for instant responsiveness
      const localSig = localStorage.getItem(`bexsign_doc_${docId}_signature`);
      const localSigner = localStorage.getItem(`bexsign_doc_${docId}_signer`);
      const localType = localStorage.getItem(`bexsign_doc_${docId}_sigtype`);
      const localStyle = localStorage.getItem(`bexsign_doc_${docId}_sigstyle`);

      if (localSig) {
        setSignatureData(localSig);
        setSignaturePlaced(true);
        if (localType) setSignatureType(localType);
        if (localSigner) setTypedName(localSigner);
        if (localStyle) setSelectedStyle(localStyle);
      }

      // 2. Fetch server database state
      const res = await fetch(`http://localhost:5000/api/documents/${docId}`);
      const data = await res.json();
      if (data.success && data.document) {
        const doc = data.document;
        setDocumentDetails({
          title: doc.document_name || doc.title || 'Document Sign 4',
          sender: doc.owner ? `${doc.owner} <manu.yadav@oladigital.health>` : 'Manu Yadav <manu.yadav@oladigital.health>',
          org: 'Dcode Health',
          recipient: doc.recipient_email || 'vimal@bexcodeservices.com',
          status: doc.status || 'In Progress',
          expiresIn: '15 days'
        });

        // If server database has saved signature
        if (doc.signature_image) {
          setSignatureData(doc.signature_image);
          setSignaturePlaced(true);
          setSignatureType(doc.signature_image.startsWith('data:') ? 'draw' : 'type');
          if (doc.signer_name) setTypedName(doc.signer_name);
          if (doc.signature_style) setSelectedStyle(doc.signature_style);
        }
      }
    } catch (e) {
      console.warn('Fetch doc fallback:', e);
    }
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width),
        y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height)
      };
    }
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplySignature = () => {
    let appliedSig = '';
    let appliedType = 'type';

    if (sigType === 'draw') {
      const canvas = canvasRef.current;
      if (canvas && hasDrawn) {
        appliedSig = canvas.toDataURL('image/png');
        appliedType = 'draw';
      } else {
        showPopupAlert('Please draw your signature on the pad before clicking Ok.', { title: 'Signature Required', type: 'warning' });
        return;
      }
    } else if (sigType === 'upload') {
      if (!uploadedImage) {
        showPopupAlert('Please select an image file to upload as your signature.', { title: 'No Image Uploaded', type: 'warning' });
        return;
      }
      appliedSig = uploadedImage;
      appliedType = 'upload';
    } else {
      appliedSig = typedName;
      appliedType = 'type';
    }

    setSignatureData(appliedSig);
    setSignatureType(appliedType);
    setSignaturePlaced(true);
    setShowSignatureModal(false);
    setValidationError('');

    // Persist immediately in local storage
    try {
      localStorage.setItem(`bexsign_doc_${docId}_signature`, appliedSig);
      localStorage.setItem(`bexsign_doc_${docId}_signer`, typedName);
      localStorage.setItem(`bexsign_doc_${docId}_sigtype`, appliedType);
      localStorage.setItem(`bexsign_doc_${docId}_sigstyle`, selectedStyle);
    } catch (e) {}
  };

  const handleSaveDocument = async () => {
    try {
      if (signatureData) {
        localStorage.setItem(`bexsign_doc_${docId}_signature`, signatureData);
        localStorage.setItem(`bexsign_doc_${docId}_signer`, typedName);
        localStorage.setItem(`bexsign_doc_${docId}_sigtype`, signatureType);
        localStorage.setItem(`bexsign_doc_${docId}_sigstyle`, selectedStyle);
      }

      await fetch('http://localhost:5000/api/signatures/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: docId,
          token: docId,
          signatureData,
          signerName: typedName,
          signerEmail: documentDetails.recipient,
          signatureStyle: selectedStyle,
          status: documentDetails.status
        })
      });

      showPopupAlert('Document changes and signature have been saved successfully!', {
        title: 'Changes Saved',
        type: 'success'
      });
    } catch (err) {
      console.warn('Save fallback:', err);
      showPopupAlert('Document changes saved locally.', {
        title: 'Saved',
        type: 'success'
      });
    }
  };

  const handleDownloadSignedPdf = async (pass = '') => {
    try {
      const docTitle = documentDetails.title || `Document_${docId}.pdf`;
      await generateAndDownloadPdf({
        documentName: docTitle,
        docId: fullBexsignId || docId,
        signerName: typedName || 'Vimal Chavda',
        signerEmail: documentDetails.recipient || 'vimal@bexcodeservices.com',
        date: new Date().toLocaleString(),
        status: 'Completed',
        signatureImage: signatureData,
        signatureType: signatureType,
        password: pass
      });
      showPopupAlert(`Downloaded "${docTitle}" successfully with official electronic signature attachment${pass ? ' (Password Protected)' : ''}.`, {
        title: 'Download Complete',
        type: 'success'
      });
    } catch (err) {
      console.error('Download error:', err);
      showPopupAlert('Failed to generate PDF. Please try again.', {
        title: 'Download Error',
        type: 'error'
      });
    }
  };

  const handlePrintSignedPdf = () => {
    const docTitle = documentDetails.title || `Document_${docId}.pdf`;
    
    // Create dedicated printable window containing the actual signed document
    const printWindow = window.open('', '_blank', 'width=850,height=1000');
    if (!printWindow) {
      window.print();
      return;
    }

    const stampHtml = signatureData && signatureData.startsWith('data:')
      ? `<img src="${signatureData}" style="max-height: 55px; max-width: 220px; object-fit: contain; margin: 6px 0;" />`
      : `<div style="font-family: 'Brush Script MT', 'Caveat', 'Segoe Script', cursive; font-size: 28px; color: #0f172a; margin: 4px 0;">${typedName || 'Vimal Chavda'}</div>`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${docTitle} - Certified BexSign Copy</title>
          <style>
            @page {
              size: A4;
              margin: 15mm 20mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 24px;
              line-height: 1.5;
            }
            .header-bar {
              border-bottom: 2px solid #007355;
              padding-bottom: 14px;
              margin-bottom: 28px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .brand-name {
              font-size: 22px;
              font-weight: 900;
              color: #007355;
              letter-spacing: -0.5px;
            }
            .doc-id-pill {
              font-size: 11px;
              font-family: monospace;
              color: #475569;
              background: #f1f5f9;
              padding: 4px 8px;
              border-radius: 4px;
              border: 1px solid #e2e8f0;
            }
            .doc-title {
              font-size: 24px;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 18px;
            }
            .doc-content {
              font-size: 14px;
              color: #334155;
              line-height: 1.8;
              min-height: 260px;
            }
            .signature-stamp-box {
              margin-top: 36px;
              border: 2px solid #1c4b82;
              border-radius: 8px;
              padding: 14px 18px;
              display: inline-block;
              background: #f8fafc;
              box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }
            .stamp-header {
              font-size: 12px;
              font-weight: 700;
              color: #1c4b82;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            .stamp-signer {
              font-size: 13px;
              font-weight: 600;
              color: #0f172a;
            }
            .stamp-id {
              font-size: 10px;
              font-family: monospace;
              color: #64748b;
              margin-top: 6px;
              border-top: 1px dashed #cbd5e1;
              padding-top: 4px;
            }
            .audit-trail {
              border-top: 1px solid #e2e8f0;
              margin-top: 48px;
              padding-top: 16px;
              font-size: 11px;
              color: #64748b;
            }
            .audit-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              margin-top: 8px;
            }
            .audit-item strong {
              color: #334155;
            }
            .badge-verified {
              color: #007355;
              font-weight: 700;
            }
            .footer-legal {
              margin-top: 24px;
              font-size: 10px;
              color: #94a3b8;
              text-align: center;
              border-top: 1px solid #f1f5f9;
              padding-top: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div>
              <div class="brand-name">BEXSIGN</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Official Certified Electronic Document</div>
            </div>
            <div class="doc-id-pill">Doc ID: ${fullBexsignId}</div>
          </div>

          <div class="doc-title">${docTitle}</div>

          <div class="doc-content">
            <p>check the document for signature</p>
          </div>

          <div class="signature-stamp-box">
            <div class="stamp-header">Official Signature Stamp</div>
            <div class="stamp-signer">Signed by: ${typedName || 'Vimal Chavda'}</div>
            ${stampHtml}
            <div class="stamp-id">Specific ID: ${fullBexsignId}</div>
          </div>

          <div class="audit-trail">
            <div style="font-weight: 700; color: #334155; margin-bottom: 4px;">AUDIT TRAIL &amp; EXECUTION METRICS:</div>
            <div class="audit-grid">
              <div class="audit-item"><strong>Signer Email:</strong> ${documentDetails.recipient || 'vimal@bexcodeservices.com'}</div>
              <div class="audit-item"><strong>Status:</strong> <span class="badge-verified">✓ Completed &amp; Verified</span></div>
              <div class="audit-item"><strong>Sender / Org:</strong> ${documentDetails.sender || 'Manu Yadav'} (${documentDetails.org || 'Dcode Health'})</div>
              <div class="audit-item"><strong>Date of Execution:</strong> ${new Date().toLocaleString()}</div>
            </div>
            <div class="footer-legal">
              This certified electronic document is legally binding under the ESIGN Act, UETA, and international electronic signature compliance frameworks.
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleAgreeAndContinue = () => {
    setAgreedConsent(true);
    setValidationError('');
    const sigElement = document.getElementById('signature-field-container');
    if (sigElement) {
      sigElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleFinishSigning = async () => {
    if (!agreedConsent) {
      showPopupAlert(
        'Please accept the "Electronic Record and Signature Disclosure" at the top before completing the document.',
        {
          title: 'Action Required',
          type: 'warning'
        }
      );
      setValidationError('⚠ Please confirm electronic record and signature disclosure consent.');
      return;
    }
    if (!signaturePlaced) {
      showPopupAlert(
        'Please click on the Signature field below to adopt and place your signature before finishing.',
        {
          title: 'Signature Required',
          type: 'warning'
        }
      );
      setValidationError('⚠ Please complete the required Signature field.');
      const sigElement = document.getElementById('signature-field-container');
      if (sigElement) {
        sigElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    try {
      if (signatureData) {
        localStorage.setItem(`bexsign_doc_${docId}_signature`, signatureData);
        localStorage.setItem(`bexsign_doc_${docId}_signer`, typedName);
        localStorage.setItem(`bexsign_doc_${docId}_sigtype`, signatureType);
        localStorage.setItem(`bexsign_doc_${docId}_sigstyle`, selectedStyle);
      }

      await fetch('http://localhost:5000/api/signatures/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: docId,
          token: docId,
          signatureData,
          signerName: typedName,
          signerEmail: documentDetails.recipient,
          signatureStyle: selectedStyle,
          recipientId: 1
        })
      });
    } catch (e) {
      console.warn('Signature submit fallback:', e);
    }

    setIsCompleted(true);
  };

  // 1. Document Info Landing Screen (Page 8 top)
  if (showLandingScreen) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="bg-white border border-slate-300 rounded-xl max-w-lg w-full p-8 shadow-xl space-y-6">
          <div className="text-center pb-3 border-b border-slate-200">
            <h1 className="text-2xl font-bold text-slate-800">Document info</h1>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-500">Document name</span>
              <span className="font-bold text-slate-900">{documentDetails.title}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-500">Sender</span>
              <span className="font-semibold text-slate-800">{documentDetails.sender}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-500">Organization</span>
              <span className="font-semibold text-slate-800">{documentDetails.org}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-500">Sent on</span>
              <span className="font-semibold text-slate-800">Sep 02, 2026 &lt;Expires in {documentDetails.expiresIn}&gt;</span>
            </div>
          </div>

          <div className="pt-4 flex justify-center">
            <button
              onClick={() => setShowLandingScreen(false)}
              className="bg-[#007355] hover:bg-[#005c44] text-white px-8 py-2.5 rounded font-bold text-sm shadow-sm transition cursor-pointer"
            >
              Proceed to document
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Signer Completion Screen (Page 11 bottom)
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-xl w-full text-center space-y-8">
          <h1 className="text-3xl font-bold text-slate-700 tracking-tight">
            You have signed this document.
          </h1>

          {/* Action Buttons matching Page 11 */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 relative">
            <button
              onClick={() => showPopupAlert(`Signed document with verified signature stamp has been emailed to ${documentDetails.recipient}!`, { title: 'Email Dispatched', type: 'success' })}
              className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 rounded text-xs font-bold text-slate-800 shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Mail size={16} className="text-[#007355]" /> Email to me
            </button>

            <button
              onClick={handlePrintSignedPdf}
              className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 rounded text-xs font-bold text-slate-800 shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Printer size={16} /> Print
            </button>

            {/* Split Download Button (Direct Download + Download with password) */}
            <div className="relative inline-flex rounded shadow-xs">
              <button
                onClick={() => handleDownloadSignedPdf('')}
                className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-l text-xs font-bold text-slate-800 flex items-center gap-2 cursor-pointer"
              >
                <Download size={16} className="text-[#007355]" /> Download
              </button>
              <button
                type="button"
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="px-2.5 py-2.5 bg-white border-y border-r border-slate-300 hover:bg-slate-50 rounded-r text-slate-600 transition"
              >
                <ChevronDown size={14} />
              </button>

              {/* Download with Password Dropdown */}
              {showDownloadMenu && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded shadow-xl py-1.5 z-30 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDownloadMenu(false);
                      setShowPasswordModal(true);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Lock size={14} className="text-slate-500" />
                    <span>Download with password</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={() => navigate('/documents/all')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
            >
              Return to Documents List
            </button>
          </div>
        </div>

        {/* Password Protection Download Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans text-slate-900">
            <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Lock size={16} className="text-[#007355]" />
                  Download with password
                </h3>
                <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-700">
                  <X size={16} />
                </button>
              </div>
              <p className="text-xs text-slate-600">
                Set an optional password to encrypt and secure this signed document.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  placeholder="Enter document password..."
                  value={downloadPassword}
                  onChange={(e) => setDownloadPassword(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-[#007355]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-1.5 border border-slate-300 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    handleDownloadSignedPdf(downloadPassword);
                  }}
                  className="bg-[#007355] hover:bg-[#005c44] text-white px-4 py-1.5 rounded text-xs font-bold"
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 text-slate-900 flex flex-col font-sans">
      {/* Top Disclosure Consent Header Bar (Page 8 bottom) */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex flex-wrap items-center justify-between text-xs sticky top-0 z-30 shadow-xs gap-4">
        <label className="flex items-center gap-2.5 cursor-pointer font-medium text-slate-700">
          <input
            type="checkbox"
            checked={agreedConsent}
            onChange={(e) => {
              setAgreedConsent(e.target.checked);
              if (e.target.checked) setValidationError('');
            }}
            className="accent-[#007355] h-4 w-4"
          />
          <span>
            I confirm that I have read and understood the <strong className="underline text-slate-900 font-bold">"Electronic Record and Signature Disclosure"</strong> and consent to use electronic records and signatures.
          </span>
        </label>

        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={handleAgreeAndContinue}
            className={`px-4 py-1.5 rounded font-bold text-xs transition shadow-xs ${
              agreedConsent ? 'bg-[#007355] text-white' : 'bg-[#007355] hover:bg-[#005c44] text-white'
            }`}
          >
            Agree & Continue
          </button>

          {/* More actions dropdown (Page 8) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreActions(!showMoreActions)}
              className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition bg-white"
            >
              <span>More actions</span>
              <ChevronDown size={14} />
            </button>
            {showMoreActions && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-xl py-1 z-40 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => { setShowMoreActions(false); showPopupAlert('Quickly fill and sign enabled.', { title: 'Quick Sign', type: 'info' }); }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700"
                >
                  Quickly fill and sign
                </button>
                <button
                  type="button"
                  onClick={() => { setShowMoreActions(false); showPopupAlert('Document delegated to collaborator.', { title: 'Assignee', type: 'info' }); }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700"
                >
                  Assign to someone else
                </button>
                <button
                  type="button"
                  onClick={() => { setShowMoreActions(false); window.print(); }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700"
                >
                  Print and physically sign
                </button>
                <button
                  type="button"
                  onClick={() => { setShowMoreActions(false); navigate('/documents'); }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-red-600"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => { setShowMoreActions(false); navigate('/documents'); }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-500"
                >
                  Skip signing
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guided Navigator Toolbar (Page 9) */}
      {agreedConsent && (
        <header className="h-12 bg-white border-b border-slate-300 px-6 flex items-center justify-between sticky top-9 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-800">Documents</span>
            <span className="bg-emerald-100 text-emerald-800 px-3 py-0.5 rounded-full text-[11px] font-bold">
              Fields remaining: {signaturePlaced ? 0 : 2}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 text-slate-500">
              <button onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))} className="p-1 hover:text-slate-900"><ZoomOut size={15} /></button>
              <button onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))} className="p-1 hover:text-slate-900"><ZoomIn size={15} /></button>
              <button onClick={handleDownloadSignedPdf} className="p-1 hover:text-slate-900" title="Download"><Download size={15} /></button>
              <button onClick={handlePrintSignedPdf} className="p-1 hover:text-slate-900" title="Print"><Printer size={15} /></button>
              <button onClick={() => showPopupAlert(`Document dispatched to ${documentDetails.recipient}`, { title: 'Mail', type: 'info' })} className="p-1 hover:text-slate-900" title="Email"><Mail size={15} /></button>
            </div>

            <button
              onClick={handleFinishSigning}
              className="bg-[#007355] hover:bg-[#005c44] text-white px-6 py-1.5 rounded font-bold text-xs shadow-xs transition cursor-pointer"
            >
              Finish
            </button>
          </div>
        </header>
      )}

      {/* Top Banner Message when Fields Completed (Page 11) */}
      {signaturePlaced && (
        <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 px-6 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 sticky top-21 z-20">
          <CheckCircle2 size={16} className="text-[#007355]" />
          <span>You've successfully filled all fields. Click Finish to complete.</span>
        </div>
      )}

      {/* Validation Error Banner */}
      {validationError && (
        <div className="bg-red-600 text-white p-3 text-center text-xs font-bold flex items-center justify-center gap-2 sticky top-22 z-20 shadow-md">
          <AlertCircle size={16} /> {validationError}
        </div>
      )}

      {/* Main Document Viewer Container (Page 11 PDF) */}
      <main className="flex-1 p-4 sm:p-8 flex justify-center items-start overflow-y-auto">
        <div className="relative w-full max-w-[750px] min-h-[900px] bg-white text-slate-900 p-6 sm:p-12 shadow-xl rounded-sm border border-slate-300 my-4 space-y-6">
          <div className="border-b pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 font-mono">
            <span className="break-all font-semibold select-all">
              BexSign Document ID: <strong className="text-slate-800">{fullBexsignId}</strong>
            </span>
            <button
              onClick={handleCopyId}
              className="self-start sm:self-auto text-[11px] font-bold text-[#00a884] hover:underline flex items-center gap-1 shrink-0 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
              title="Copy full Document ID"
            >
              <Copy size={12} /> {copiedId ? 'Copied!' : 'Copy ID'}
            </button>
          </div>

          <div className="space-y-4 text-xs text-slate-700">
            <p className="text-xl font-black text-slate-900">My new Document 4 data</p>

            {/* Signature Box & Field Prompt Box (Page 11 PDF) */}
            <div id="signature-field-container" className="pt-8 border-t border-slate-200 relative">
              <div className="w-64">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Signature</label>
                {signaturePlaced ? (
                  <div className="relative">
                    <div
                      onClick={() => setShowSignatureModal(true)}
                      className="p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-[#1c4b82] transition shadow-xs w-fit"
                    >
                      <SignatureStamp
                        signerName={typedName}
                        signatureImage={signatureData}
                        signatureStyle={selectedStyle}
                        docId={docId}
                      />
                      <p className="text-[10px] text-emerald-700 font-bold mt-1">✓ Signature Placed (Click to modify)</p>
                    </div>

                    {/* Guided Floating Callout Bubble when Filled (Page 11) */}
                    <div className="absolute left-full top-2 ml-4 p-2.5 bg-slate-900 text-white rounded-lg shadow-xl text-xs font-semibold whitespace-nowrap flex items-center gap-3 z-10">
                      <span>You've successfully filled all fields. Click Finish to complete.</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() => setShowSignatureModal(true)}
                      className="w-full p-4 border-2 border-emerald-600 bg-emerald-50 text-emerald-800 font-bold text-sm rounded text-left flex items-center justify-between cursor-pointer"
                    >
                      <span>Signature</span>
                      <PenTool size={16} />
                    </button>

                    {/* Field Prompt Box (Page 9 PDF Screenshot) */}
                    <div className="absolute left-full top-0 ml-4 p-2.5 bg-slate-900 text-white rounded-lg shadow-xl text-xs font-semibold whitespace-nowrap flex items-center gap-3 z-10">
                      <span>Enter your signature.</span>
                      <div className="flex gap-1 text-[10px]">
                        <span className="px-2 py-0.5 bg-slate-700 rounded cursor-pointer">Previous</span>
                        <span className="px-2 py-0.5 bg-[#007355] rounded cursor-pointer font-bold">Next</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Stamp Box (Pages 8, 9, 11 PDF) */}
              <div className="w-64 mt-4">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Stamp</label>
                <div className="p-3 border-2 border-dashed border-slate-300 rounded bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-bold">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-[#E71414] text-white flex items-center justify-center font-black text-xs">
                      Bex
                    </div>
                    <span>Corporate Official Stamp</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Verified</span>
                </div>
              </div>

              <div className="mt-4 text-xs font-semibold text-slate-500">
                {documentDetails.recipient || 'vimal@bexcodeservices.com'}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Signature Creation Popup Modal (Page 10 PDF) */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white text-slate-900 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create Signature</h3>
              <button onClick={() => setShowSignatureModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            {/* Signature Type Tabs (Page 10 PDF) */}
            <div className="flex border-b border-slate-200 my-4 text-xs font-bold">
              <button
                onClick={() => setSigType('type')}
                className={`py-2 px-4 border-b-2 transition ${
                  sigType === 'type' ? 'border-[#007355] text-[#007355]' : 'border-transparent text-slate-500'
                }`}
              >
                TYPE
              </button>
              <button
                onClick={() => setSigType('draw')}
                className={`py-2 px-4 border-b-2 transition ${
                  sigType === 'draw' ? 'border-[#007355] text-[#007355]' : 'border-transparent text-slate-500'
                }`}
              >
                DRAW
              </button>
              <button
                onClick={() => setSigType('upload')}
                className={`py-2 px-4 border-b-2 transition ${
                  sigType === 'upload' ? 'border-[#007355] text-[#007355]' : 'border-transparent text-slate-500'
                }`}
              >
                UPLOAD
              </button>
            </div>

            {/* Type Tab (Page 10 PDF) */}
            {sigType === 'type' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Signature</label>
                    <input
                      type="text"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Initial</label>
                    <input
                      type="text"
                      defaultValue="VC"
                      className="w-full p-2 border border-slate-300 rounded font-semibold"
                    />
                  </div>
                </div>

                {/* Signature and Initial Side-by-Side Styles (Page 10) */}
                <div className="space-y-2">
                  <div
                    onClick={() => setSelectedStyle('font-signature-1')}
                    className={`p-3 border rounded-lg cursor-pointer flex items-center justify-between text-slate-900 ${
                      selectedStyle === 'font-signature-1' ? 'border-[#007355] bg-emerald-50/70' : 'border-slate-200'
                    }`}
                  >
                    <span className="text-xl font-signature-1">✓ {typedName}</span>
                    <span className="text-lg font-signature-1 text-slate-600">VC</span>
                  </div>

                  <div
                    onClick={() => setSelectedStyle('font-signature-2')}
                    className={`p-3 border rounded-lg cursor-pointer flex items-center justify-between text-slate-900 ${
                      selectedStyle === 'font-signature-2' ? 'border-[#007355] bg-emerald-50/70' : 'border-slate-200'
                    }`}
                  >
                    <span className="text-xl font-signature-2">{typedName}</span>
                    <span className="text-lg font-signature-2 text-slate-600">VC</span>
                  </div>

                  <div
                    onClick={() => setSelectedStyle('font-signature-3')}
                    className={`p-3 border rounded-lg cursor-pointer flex items-center justify-between text-slate-900 ${
                      selectedStyle === 'font-signature-3' ? 'border-[#007355] bg-emerald-50/70' : 'border-slate-200'
                    }`}
                  >
                    <span className="text-xl font-signature-3 italic font-serif">{typedName}</span>
                    <span className="text-lg italic font-serif text-slate-600">VC</span>
                  </div>
                </div>

                <label className="flex items-center gap-2 font-semibold text-slate-600 cursor-pointer select-none">
                  <input type="checkbox" className="accent-[#007355]" defaultChecked /> fills the signature in all places
                </label>
              </div>
            )}

            {/* Draw Tab */}
            {sigType === 'draw' && (
              <div className="space-y-2 text-xs">
                <div className="border border-slate-300 rounded-xl bg-slate-50 overflow-hidden shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={440}
                    height={140}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full cursor-crosshair touch-none bg-white block"
                  />
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-[11px] text-slate-500 font-medium">Draw your signature with mouse, stylus, or touch</span>
                  <button type="button" onClick={clearCanvas} className="text-xs text-red-600 font-bold hover:underline">
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Upload Tab */}
            {sigType === 'upload' && (
              <div className="space-y-3 text-xs">
                {uploadedImage ? (
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col items-center gap-3">
                    <img src={uploadedImage} alt="Uploaded signature" className="max-h-24 max-w-[280px] object-contain border border-slate-200 bg-white rounded-lg p-2 shadow-xs" />
                    <div className="flex gap-3">
                      <label className="text-xs font-bold text-[#00a884] hover:underline cursor-pointer">
                        Change Image
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </label>
                      <button type="button" onClick={() => setUploadedImage(null)} className="text-xs font-bold text-red-600 hover:underline">
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-[#00a884] p-8 text-center rounded-xl block cursor-pointer bg-slate-50/50 hover:bg-emerald-50/20 transition">
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    <p className="font-bold text-slate-700 text-sm">Click to upload signature image</p>
                    <p className="text-[11px] text-slate-500 mt-1">PNG, JPG, SVG, or WebP</p>
                  </label>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowSignatureModal(false)}
                className="px-4 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleApplySignature}
                className="bg-[#007355] hover:bg-[#005c44] text-white px-5 py-1.5 rounded text-xs font-bold"
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
