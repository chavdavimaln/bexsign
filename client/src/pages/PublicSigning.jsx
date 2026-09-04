import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PenTool, CheckCircle2, ShieldCheck, AlertCircle, X, Download, ArrowLeft, Lock, ArrowRight, FileCheck, CheckSquare, Printer, Mail, Copy, Save, ChevronDown, ZoomIn, ZoomOut, FileText } from 'lucide-react';
import { generateBexsignId } from '../utils/documentId';
import SignatureStamp from '../components/SignatureStamp';
import { showPopupAlert } from '../components/GlobalAlertModal';
import { generateAndDownloadPdf } from '../utils/pdfGenerator';
import { fetchSignatureForEmail } from '../utils/signatureDirectory';
import CompletedDocumentViewer from '../components/CompletedDocumentViewer';
import BexDocumentSheet from '../components/BexDocumentSheet';
import { printDocumentSheet } from '../utils/documentPrinter';
import { getDefaultDocContent } from '../utils/documentDefaults';

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

  // Multi-document envelope state
  const [documentsList, setDocumentsList] = useState(() => {
    try {
      const saved = localStorage.getItem(`bexsign_doc_${docId}_documents`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((d, i) => ({
            ...d,
            id: d.id || i + 1,
            documentText: d.documentText || getDefaultDocContent(d.name, d.customMessage)
          }));
        }
      }
    } catch (e) {}
    return [
      {
        id: 1,
        name: 'Document 1.pdf',
        documentText: getDefaultDocContent('Document 1.pdf'),
        customMessage: 'check the document for signature'
      }
    ];
  });
  const [activeDocIndex, setActiveDocIndex] = useState(0);

  // Partitioned fields per document
  const [fieldsByDoc, setFieldsByDoc] = useState(() => {
    try {
      const saved = localStorage.getItem(`bexsign_doc_${docId}_fields_by_doc`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}
    return {};
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

      // Check for saved multiple documents in localStorage
      let loadedDocs = [];
      try {
        const savedDocs = localStorage.getItem(`bexsign_doc_${docId}_documents`);
        if (savedDocs) {
          loadedDocs = JSON.parse(savedDocs);
        }
      } catch (e) {}

      // Load saved fieldsByDoc
      let loadedFields = {};
      try {
        const savedFields = localStorage.getItem(`bexsign_doc_${docId}_fields_by_doc`);
        if (savedFields) {
          loadedFields = JSON.parse(savedFields);
        }
      } catch (e) {}
      if (Object.keys(loadedFields).length > 0) {
        setFieldsByDoc(loadedFields);
      }

      // 2. Fetch server database state
      const res = await fetch(`http://localhost:5000/api/documents/${docId}`);
      const data = await res.json();
      if (data.success && data.document) {
        const doc = data.document;
        setDocumentDetails({
          title: doc.document_name || doc.title || 'Document 1.pdf',
          message: doc.custom_message || 'check the document for signature',
          sender: doc.owner ? `${doc.owner} <manu.yadav@oladigital.health>` : 'Manu Yadav <manu.yadav@oladigital.health>',
          org: 'Dcode Health',
          recipient: doc.recipient_email || 'vimal@bexcodeservices.com',
          status: doc.status || 'In Progress',
          expiresIn: '15 days'
        });

        if (!loadedDocs || loadedDocs.length === 0) {
          if (doc.files && Array.isArray(doc.files) && doc.files.length > 0) {
            loadedDocs = doc.files.map((f, i) => ({
              id: f.id || i + 1,
              name: f.file_name || `Document ${i + 1}.pdf`,
              documentText: f.document_text || getDefaultDocContent(f.file_name, doc.custom_message),
              customMessage: doc.custom_message || 'check the document for signature'
            }));
          } else {
            const initialTitle = doc.document_name || doc.title || 'Document 1.pdf';
            loadedDocs = [
              {
                id: 1,
                name: initialTitle,
                documentText: getDefaultDocContent(initialTitle, doc.custom_message),
                customMessage: doc.custom_message || 'check the document for signature'
              }
            ];
          }
        } else {
          loadedDocs = loadedDocs.map((d) => ({
            ...d,
            documentText: d.documentText || getDefaultDocContent(d.name, d.customMessage || doc.custom_message)
          }));
        }
        setDocumentsList(loadedDocs);

        // If server database has saved signature on this document
        if (doc.signature_image) {
          setSignatureData(doc.signature_image);
          setSignaturePlaced(true);
          setSignatureType(doc.signature_image.startsWith('data:') ? 'draw' : 'type');
          if (doc.signer_name) setTypedName(doc.signer_name);
          if (doc.signature_style) setSelectedStyle(doc.signature_style);
        } else {
          // Auto-fetch saved signature from employee directory by email
          const targetEmail = doc.recipient_email || 'vimal@bexcodeservices.com';
          const savedSig = await fetchSignatureForEmail(targetEmail);
          if (savedSig && (savedSig.signature_image || savedSig.employee_name)) {
            if (savedSig.employee_name) setTypedName(savedSig.employee_name);
            if (savedSig.signature_image) {
              setSignatureData(savedSig.signature_image);
              setSignaturePlaced(true);
              setSignatureType(savedSig.signature_image.startsWith('data:') ? 'draw' : 'type');
            }
            if (savedSig.signature_style) setSelectedStyle(savedSig.signature_style);
          }
        }
      } else if (loadedDocs && loadedDocs.length > 0) {
        setDocumentsList(loadedDocs);
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

  const handleUpdateFieldValue = (fieldId, value) => {
    setFieldsByDoc((prev) => {
      const currentList = prev[activeDocIndex] || [];
      const updatedList = currentList.map((f) => (f.id === fieldId ? { ...f, value } : f));
      const nextByDoc = { ...prev, [activeDocIndex]: updatedList };
      try {
        localStorage.setItem(`bexsign_doc_${docId}_fields_by_doc`, JSON.stringify(nextByDoc));
        const flatList = Object.values(nextByDoc).flat();
        localStorage.setItem(`bexsign_doc_${docId}_fields`, JSON.stringify(flatList));
      } catch (e) {}
      return nextByDoc;
    });
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
      const activeDoc = documentsList[activeDocIndex] || {};
      const docTitle = activeDoc.name || documentDetails.title || `Document 1.pdf`;
      const docMsg = activeDoc.customMessage || documentDetails.message || 'check the document for signature';
      const docBexId = documentsList.length > 1 ? `${fullBexsignId}-${activeDocIndex + 1}` : fullBexsignId;
      const currentFields = fieldsByDoc[activeDocIndex] || [];

      const activeText = activeDoc.documentText || getDefaultDocContent(docTitle, docMsg);

      await generateAndDownloadPdf({
        documentName: docTitle,
        documentText: activeText,
        docId: docBexId || docId,
        signerName: typedName || 'Vimal Chavda',
        signerEmail: documentDetails.recipient || 'vimal@bexcodeservices.com',
        date: new Date().toLocaleString(),
        status: isCompleted ? 'Completed' : 'In Progress',
        signatureImage: signatureData,
        signatureType: signatureType,
        password: pass,
        fields: currentFields
      });
      showPopupAlert(`Downloaded "${docTitle}" successfully with official electronic signature.`, {
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
    const activeDoc = documentsList[activeDocIndex] || {};
    const docTitle = activeDoc.name || documentDetails.title || 'Document 1.pdf';
    const docMsg = activeDoc.customMessage || documentDetails.message || 'check the document for signature';
    const docBexId = documentsList.length > 1 ? `${fullBexsignId}-${activeDocIndex + 1}` : fullBexsignId;
    const activeText = activeDoc.documentText || getDefaultDocContent(docTitle, docMsg);
    const currentFields = fieldsByDoc[activeDocIndex] || [];

    printDocumentSheet({
      documentName: docTitle,
      documentText: activeText,
      docId: docBexId || docId,
      signerName: typedName || 'Vimal Chavda',
      signerEmail: documentDetails.recipient || 'vimal@bexcodeservices.com',
      signatureImage: signatureData,
      signatureStyle: selectedStyle,
      placedFields: currentFields
    });
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

  // If document is already Completed, display dedicated CompletedDocumentViewer (PDF 4 Page 1)
  if (documentDetails.status === 'Completed') {
    return (
      <CompletedDocumentViewer
        doc={{
          id: docId,
          document_name: documentDetails.title,
          signer_name: typedName,
          recipient_email: documentDetails.recipient,
          owner: documentDetails.sender ? documentDetails.sender.split('<')[0].trim() : 'Manu Yadav',
          signature_image: signatureData,
          status: 'Completed'
        }}
        onBack={() => navigate('/documents')}
      />
    );
  }

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

          <div className="pt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/documents'))}
              className="px-4 py-2 border border-slate-300 rounded font-semibold text-xs text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
            <button
              onClick={() => setShowLandingScreen(false)}
              className="bg-[#007355] hover:bg-[#005c44] text-white px-8 py-2 rounded font-bold text-xs shadow-xs transition cursor-pointer flex-1"
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
              onClick={async () => {
                const targetEmail = documentDetails.recipient || 'vimal@bexcodeservices.com';
                try {
                  await fetch(`http://localhost:5000/api/documents/${docId}/email-copy`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ emails: [targetEmail], note: 'Here is your certified signed copy.' })
                  });
                } catch (e) {}
                showPopupAlert(`Signed document with verified signature stamp has been emailed to ${targetEmail} via SMTP!`, { title: 'Email Dispatched', type: 'success' });
              }}
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/documents'))}
            className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 bg-white transition shadow-xs shrink-0 cursor-pointer"
            title="Go back"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>

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
        </div>

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
            <button
              type="button"
              onClick={() => {
                if (agreedConsent) {
                  setAgreedConsent(false);
                } else if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/documents');
                }
              }}
              className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 bg-white transition shadow-xs cursor-pointer mr-1"
              title="Return to review disclosure or back to documents"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
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

      {/* Multi-Document Switcher Navigation Bar (Pages 4 & 5) */}
      {agreedConsent && documentsList.length > 1 && (
        <div className="bg-slate-100 border-b border-slate-300 px-6 py-2.5 flex items-center gap-3 overflow-x-auto sticky top-21 z-20 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
            Documents ({documentsList.length}):
          </span>
          {documentsList.map((doc, idx) => {
            const isDocActive = activeDocIndex === idx;
            const docFields = fieldsByDoc[idx] || [];
            return (
              <button
                key={doc.id || idx}
                type="button"
                onClick={() => setActiveDocIndex(idx)}
                className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 shrink-0 transition cursor-pointer ${
                  isDocActive
                    ? 'bg-[#007355] text-white shadow-xs'
                    : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
                }`}
              >
                <FileText size={13} />
                <span>{idx + 1}. {doc.name}</span>
                {docFields.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isDocActive ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {docFields.length} field{docFields.length > 1 ? 's' : ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>
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

      {/* Main Document Viewer Container */}
      <main className="flex-1 p-4 sm:p-8 flex justify-center items-start overflow-y-auto print:p-0 print:m-0">
        <BexDocumentSheet
          docId={docId}
          bexsignDocId={documentsList.length > 1 ? `${fullBexsignId}-${activeDocIndex + 1}` : fullBexsignId}
          documentName={documentsList[activeDocIndex]?.name || documentDetails.title}
          documentText={documentsList[activeDocIndex]?.documentText || getDefaultDocContent(documentsList[activeDocIndex]?.name || documentDetails.title, documentsList[activeDocIndex]?.customMessage || documentDetails.message)}
          signerName={typedName}
          signerEmail={documentDetails.recipient}
          signatureImage={signatureData}
          signatureStyle={selectedStyle}
          signaturePlaced={signaturePlaced}
          onOpenSignatureModal={() => setShowSignatureModal(true)}
          isCompleted={isCompleted}
          showTooltips={true}
          copiedId={copiedId}
          onCopyId={handleCopyId}
          placedFields={fieldsByDoc[activeDocIndex] || []}
          onUpdateField={handleUpdateFieldValue}
        />
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
