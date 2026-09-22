import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PenTool, CheckCircle2, ShieldCheck, AlertCircle, X, Download, ArrowLeft, Lock, ArrowRight, FileCheck, CheckSquare, Printer, Mail, Copy, Save, ChevronDown, ZoomIn, ZoomOut, FileText } from 'lucide-react';
import { generateBexsignId } from '../utils/documentId';
import SignatureStamp from '../components/SignatureStamp';
import { showPopupAlert } from '../components/GlobalAlertModal';
import { generatePdfBase64 } from '../utils/pdfGenerator';
import { fetchSignatureForEmail } from '../utils/signatureDirectory';
import CompletedDocumentViewer from '../components/CompletedDocumentViewer';
import BexDocumentSheet from '../components/BexDocumentSheet';
import { getDefaultDocContent } from '../utils/documentDefaults';
import { applySignerDefaults } from '../utils/documentFields';
import { canvasHasInk, isTypedSignatureValid, typedSignatureImage } from '../utils/signatureInk';
import { downloadSignedDocument, printLockedDocument } from '../utils/signedPdf';
import { API_BASE, API_ORIGIN } from '../utils/api';
import {
  TermsModal,
  QuickFillModal,
  AssignModal,
  PhysicalSignModal,
  DeclineModal,
  SkipModal,
  HistoryModal,
  SigningOutcomeScreen
} from '../components/SigningActionModals';

export default function PublicSigning() {
  const { token, id } = useParams();
  const docId = id || token || '1';
  const navigate = useNavigate();
  // The request's real BexSign ID comes from the server; the generated one is only a stable placeholder until then
  const [placeholderBexsignId] = useState(() => generateBexsignId(docId));
  const [serverBexsignId, setServerBexsignId] = useState('');
  const fullBexsignId = serverBexsignId || placeholderBexsignId;
  // Each recipient has their own signing session (multi-recipient requests)
  const signerEmailParam = (new URLSearchParams(window.location.search).get('email') || '').trim();
  const sigKey = (suffix) => `bexsign_doc_${docId}_${signerEmailParam ? `${signerEmailParam.toLowerCase()}_` : ''}${suffix}`;
  const [copiedId, setCopiedId] = useState(false);

  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  // Document the "You have signed" screen prints/downloads: a document index, or 'all' for every document
  const [outputDocIndex, setOutputDocIndex] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [downloadPassword, setDownloadPassword] = useState('');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Total placed fields of the request (the server only returns this signer's own fields while in progress)
  const [requestFieldCount, setRequestFieldCount] = useState(0);

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
  const [showConfirmChangeSigModal, setShowConfirmChangeSigModal] = useState(false);
  const [signerContext, setSignerContext] = useState(null);
  const [completionInfo, setCompletionInfo] = useState(null);

  const handleOpenSignatureModal = () => {
    if (signaturePlaced) {
      setShowConfirmChangeSigModal(true);
    } else {
      setShowSignatureModal(true);
    }
  };

  // Actions a recipient can take while signing ("More actions"), plus the disclosure and the guided fields
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showQuickFillModal, setShowQuickFillModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPhysicalModal, setShowPhysicalModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [actionBusy, setActionBusy] = useState('');
  const [actionError, setActionError] = useState('');
  // Set once the recipient declined, assigned the signing or skipped: the final screen is shown instead
  const [outcome, setOutcome] = useState(null);
  const [guideFieldId, setGuideFieldId] = useState(null);
  const moreActionsRef = useRef(null);
  const finishRef = useRef(null);

  // Canvas drawing ref
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    fetchDocumentDetails();
  }, [docId]);

  // The "More actions" menu closes when clicking anywhere else
  useEffect(() => {
    if (!showMoreActions) return undefined;
    const onPointerDown = (event) => {
      if (moreActionsRef.current && !moreActionsRef.current.contains(event.target)) setShowMoreActions(false);
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [showMoreActions]);

  const fetchDocumentDetails = async () => {
    try {
      // 1. Check local saved state first for instant responsiveness
      const localSig = localStorage.getItem(sigKey('signature'));
      const localSigner = localStorage.getItem(sigKey('signer'));
      const localType = localStorage.getItem(sigKey('sigtype'));
      const localStyle = localStorage.getItem(sigKey('sigstyle'));

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

      // Determine active user email for isolation and saved signature
      let activeUserEmail = '';
      let activeUserName = '';
      try {
        const qParams = new URLSearchParams(window.location.search);
        const paramEmail = qParams.get('email') || qParams.get('signerEmail');
        if (paramEmail && paramEmail.trim()) {
          activeUserEmail = paramEmail.trim();
        }
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const u = JSON.parse(userStr);
          if (!activeUserEmail) activeUserEmail = u.email;
          activeUserName = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim();
        }
      } catch (e) {}

      // 2. Fetch server database state (only this recipient's fields are returned while in progress)
      let doc = null;
      try {
        const res = await fetch(`${API_BASE}/documents/${docId}${activeUserEmail ? `?email=${encodeURIComponent(activeUserEmail)}` : ''}`);
        const data = await res.json();
        if (data.success && data.document) {
          doc = data.document;
        }
      } catch (eDoc) {}

      // Fallback: fetch via token route if document was not found directly
      if (!doc || !doc.id) {
        try {
          const resToken = await fetch(`${API_BASE}/signatures/token/${docId}?email=${encodeURIComponent(activeUserEmail || 'vimal@bexcodeservices.com')}`);
          const tokenData = await resToken.json();
          if (tokenData.success) {
            doc = {
              document_name: tokenData.recipient?.document_title,
              recipient_email: tokenData.recipient?.email,
              custom_message: tokenData.recipient?.custom_message,
              fields: tokenData.fields,
              fieldsByDoc: tokenData.fieldsByDoc,
              fieldCount: tokenData.fieldCount,
              status: tokenData.recipient?.status || 'In Progress'
            };
          }
        } catch (eTok) {}
      }

      if (doc) {
        if (doc.bexsign_doc_id) setServerBexsignId(doc.bexsign_doc_id);
        const currentSignerEmail = activeUserEmail || doc.recipient_email || 'vimal@bexcodeservices.com';
        const expiresOn = doc.expires_on ? new Date(doc.expires_on) : null;
        const daysLeft = expiresOn ? Math.max(0, Math.ceil((expiresOn.getTime() - Date.now()) / 86400000)) : 15;
        setDocumentDetails({
          title: doc.document_name || doc.title || 'Document 1.pdf',
          message: doc.custom_message || 'check the document for signature',
          sender: doc.sender?.email
            ? `${doc.sender.name} <${doc.sender.email}>`
            : (doc.owner ? `${doc.owner} <manu.yadav@oladigital.health>` : 'Manu Yadav <manu.yadav@oladigital.health>'),
          org: doc.sender?.company || 'Dcode Health',
          recipient: currentSignerEmail,
          status: doc.status || 'In Progress',
          expiresIn: `${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
          sentOn: doc.sent_at || doc.created_at || null
        });

        // Recipient context: role and whether this recipient already signed. Every signer can sign as soon as they
        // receive the email; "Send in order" only sets the order the emails go out in, not a wait between signers.
        const realRecipients = (doc.recipients || []).filter((r) => !r.isFallback);
        const matched = realRecipients.find((r) => r.email && r.email.toLowerCase() === currentSignerEmail.toLowerCase());
        if (matched && matched.name) {
          setTypedName(matched.name);
        }
        // Somebody who already agreed to the disclosure is not asked again
        if (matched && (matched.consent_at || matched.consentAt)) {
          setAgreedConsent(true);
        }
        if (matched) {
          const signingRoles = ['signer', 'approver'];
          const pending = realRecipients.filter((r) => signingRoles.includes(r.role || 'signer') && !['signed', 'declined'].includes(r.status));
          setSignerContext({
            recipientId: matched.id,
            role: matched.role_label || matched.role,
            isCopy: !signingRoles.includes(matched.role || 'signer'),
            alreadySigned: matched.status === 'signed',
            remaining: pending.filter((r) => r.id !== matched.id).map((r) => r.name || r.email)
          });
          if (doc.status !== 'Completed') {
            fetch(`${API_BASE}/signatures/viewed`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ documentId: docId, email: matched.email })
            }).catch(() => {});
          }
        }

        // Populate fieldsByDoc directly from server response. While in progress the response holds only this
        // recipient's fields, so it is cached only once completed (the sender's editor shares these keys).
        const serverFieldsComplete = doc.status === 'Completed';
        const serverFieldCount = Number(doc.fieldCount) || 0;
        setRequestFieldCount(serverFieldCount);
        // The signer's own untouched fields start with the values the page shows (name, email, company, today)
        const signerDefaults = {
          signerName: matched?.name || '',
          signerEmail: currentSignerEmail,
          signDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };
        const isSignerField = (f) => Boolean(f) && !f.isAssignedToOther
          && (!f.assigneeEmail || f.assigneeEmail.toLowerCase() === currentSignerEmail.toLowerCase());
        const withSignerDefaults = (list) => (serverFieldsComplete
          ? list
          : (list || []).map((f) => (isSignerField(f) ? applySignerDefaults([f], signerDefaults)[0] : f)));
        if (doc.fieldsByDoc && Object.keys(doc.fieldsByDoc).length > 0) {
          setFieldsByDoc(Object.fromEntries(Object.entries(doc.fieldsByDoc).map(([idx, list]) => [idx, withSignerDefaults(list)])));
          if (serverFieldsComplete) {
            try {
              localStorage.setItem(`bexsign_doc_${docId}_fields_by_doc`, JSON.stringify(doc.fieldsByDoc));
              localStorage.setItem(`bexsign_doc_${docId}_fields`, JSON.stringify(Object.values(doc.fieldsByDoc).flat()));
            } catch (e) {}
          }
        } else if (doc.fields && Array.isArray(doc.fields) && doc.fields.length > 0) {
          const byDoc = {};
          doc.fields.forEach(f => {
            const idx = f.docIndex !== undefined ? f.docIndex : ((f.page || 1) - 1);
            if (!byDoc[idx]) byDoc[idx] = [];
            byDoc[idx].push(f);
          });
          setFieldsByDoc(Object.fromEntries(Object.entries(byDoc).map(([idx, list]) => [idx, withSignerDefaults(list)])));
          if (serverFieldsComplete) {
            try {
              localStorage.setItem(`bexsign_doc_${docId}_fields_by_doc`, JSON.stringify(byDoc));
              localStorage.setItem(`bexsign_doc_${docId}_fields`, JSON.stringify(doc.fields));
            } catch (e) {}
          }
        } else if (Array.isArray(doc.fields) || doc.fieldCount !== undefined) {
          // The server answered: none of the request's fields belong to this recipient
          setFieldsByDoc({});
        }

        if ((Array.isArray(doc.files) && doc.files.length > 0) || !loadedDocs || loadedDocs.length === 0) {
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
        if (doc.signature_image && (!signerEmailParam || String(doc.signer_email || '').toLowerCase() === signerEmailParam.toLowerCase())) {
          setSignatureData(doc.signature_image);
          setSignaturePlaced(true);
          setSignatureType(doc.signature_image.startsWith('data:') ? 'draw' : 'type');
          if (doc.signer_name) setTypedName(doc.signer_name);
          if (doc.signature_style) setSelectedStyle(doc.signature_style);
        } else {
          // Auto-fetch saved signature from portal directory for existing user (manager, leader, team member, anyone)
          const targetEmail = activeUserEmail || doc.recipient_email || 'vimal@bexcodeservices.com';
          const targetName = activeUserName || doc.signer_name || 'Vimal Chavda';
          // Only the signer's own saved signature is prefilled; another person's is never offered
          const savedSig = await fetchSignatureForEmail(targetEmail)
            || (signerEmailParam || !doc.recipient_email ? null : await fetchSignatureForEmail(doc.recipient_email));
          if (savedSig && (savedSig.signature_image || savedSig.signature_id || savedSig.employee_name)) {
            if (savedSig.employee_name) setTypedName(savedSig.employee_name);
            else if (targetName) setTypedName(targetName);

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
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    if (!hasDrawn) setHasDrawn(true);
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
      if (canvas && hasDrawn && canvasHasInk(canvas)) {
        appliedSig = canvas.toDataURL('image/png');
        appliedType = 'draw';
      } else {
        showPopupAlert('The signature pad is empty. Draw your signature before clicking Ok.', { title: 'Signature Required', type: 'warning' });
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
      if (!isTypedSignatureValid(typedName)) {
        showPopupAlert('Type your name to create your signature before clicking Ok.', { title: 'Signature Required', type: 'warning' });
        return;
      }
      appliedSig = typedName.trim();
      appliedType = 'type';
    }

    setSignatureData(appliedSig);
    setSignatureType(appliedType);
    setSignaturePlaced(true);
    setShowSignatureModal(false);
    setValidationError('');

    // Persist immediately in local storage
    try {
      localStorage.setItem(sigKey('signature'), appliedSig);
      localStorage.setItem(sigKey('signer'), typedName);
      localStorage.setItem(sigKey('sigtype'), appliedType);
      localStorage.setItem(sigKey('sigstyle'), selectedStyle);
    } catch (e) {}
  };

  const handleUpdateFieldValue = (fieldId, value, gridValue) => {
    setFieldsByDoc((prev) => {
      const currentList = prev[activeDocIndex] || [];
      const updatedList = currentList.map((f) => {
        if (f.id === fieldId) {
          return {
            ...f,
            value,
            ...(gridValue ? { gridValue } : {})
          };
        }
        return f;
      });
      // Kept in memory only: the shared field cache belongs to the sender's editor and holds every recipient's fields
      return { ...prev, [activeDocIndex]: updatedList };
    });
  };

  const handleSaveDocument = async () => {
    try {
      if (signatureData) {
        localStorage.setItem(sigKey('signature'), signatureData);
        localStorage.setItem(sigKey('signer'), typedName);
        localStorage.setItem(sigKey('sigtype'), signatureType);
        localStorage.setItem(sigKey('sigstyle'), selectedStyle);
      }

      await fetch(`${API_BASE}/signatures/save`, {
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

  // Document indexes to print/download: the given list, otherwise the document on screen (a click event is ignored)
  const docIndexesFrom = (indexes) => (Array.isArray(indexes) && indexes.length > 0 ? indexes : [activeDocIndex]);

  const handleDownloadSignedPdf = async (pass = '', indexes = null) => {
    // Every copy is the locked PDF issued by the server: the signed copy once this recipient has signed, before that
    // the document for review (without the values being entered here). Neither can be edited.
    const password = typeof pass === 'string' ? pass : '';
    try {
      const fileNames = [];
      for (const index of docIndexesFrom(indexes)) {
        const { fileName } = await downloadSignedDocument(docId, { index, email: documentDetails.recipient, password });
        fileNames.push(`"${fileName}"`);
      }
      const signed = isCompleted || signerContext?.alreadySigned;
      const several = fileNames.length > 1;
      showPopupAlert(
        `Downloaded ${fileNames.join(', ')}${signed ? '' : ' for review'}. ${several ? 'The PDFs are' : 'The PDF is'} locked and cannot be edited${password ? `; ${several ? 'they open' : 'it opens'} with the password you set` : ''}.`,
        { title: 'Download Complete', type: 'success' }
      );
    } catch (err) {
      showPopupAlert(err instanceof TypeError ? `Could not reach the BexSign server at ${API_ORIGIN}.` : err.message, { title: 'Download Error', type: 'error' });
    }
  };

  const handlePrintSignedPdf = async (indexes = null) => {
    // Prints the locked PDF, so the print dialog's "Save as PDF" cannot create an editable copy
    try {
      for (const index of docIndexesFrom(indexes)) {
        await printLockedDocument(docId, { index, email: documentDetails.recipient });
      }
    } catch (err) {
      showPopupAlert(err instanceof TypeError ? `Could not reach the BexSign server at ${API_ORIGIN}.` : err.message, { title: 'Print failed', type: 'error' });
    }
  };

  const handleAgreeAndContinue = () => {
    setAgreedConsent(true);
    setValidationError('');
    // Recorded on the server with the time and IP, so the audit trail and the certificate can show the consent
    const consentEmail = documentDetails.recipient || '';
    if (docId && consentEmail) {
      fetch(`${API_BASE}/signatures/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId, email: consentEmail })
      }).catch(() => {});
    }
    const sigElement = document.getElementById('signature-field-container');
    if (sigElement) {
      sigElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const isFieldMissing = (f) => {
    if (f.required === false) return false;
    if (f.type === 'Signature' || f.type === 'Initial') {
      // The editor's placeholder value ("Signature"/"Initial") is not a signature
      const hasOwnValue = f.signatureImage || (f.value && f.value !== f.type && f.value !== f.label);
      return !signaturePlaced && !signatureData && !hasOwnValue;
    }
    if (f.type === 'Sign date') {
      return !f.value || String(f.value).trim() === '';
    }
    if (f.type === 'Checkbox') {
      return f.required && !f.value;
    }
    if (f.type === 'Stamp') {
      return false;
    }
    return f.value === undefined || f.value === null || String(f.value).trim() === '' || f.value === f.type;
  };

  // Only the fields assigned to the current recipient are required from them
  const isMyField = (f) => {
    if (!f || f.isAssignedToOther) return false;
    const me = (documentDetails.recipient || '').toLowerCase();
    return !f.assigneeEmail || !me || f.assigneeEmail.toLowerCase() === me;
  };
  const requestHasFields = requestFieldCount > 0 || Object.values(fieldsByDoc).some((list) => (list || []).length > 0);

  const getDocumentStatus = (docIdx) => {
    const docFields = (fieldsByDoc[docIdx] || []).filter(isMyField);
    if (docFields.length === 0 && requestHasFields) {
      return { isComplete: true, missingFields: [], remainingCount: 0 };
    }
    if (docFields.length > 0) {
      const missing = docFields.filter(isFieldMissing);
      return {
        isComplete: missing.length === 0,
        missingFields: missing,
        remainingCount: missing.length
      };
    } else {
      const isComplete = Boolean(signaturePlaced || signatureData);
      return {
        isComplete,
        missingFields: isComplete ? [] : [{ type: 'Signature', label: 'Signature' }],
        remainingCount: isComplete ? 0 : 1
      };
    }
  };

  const allDocumentsStatus = documentsList.map((_, idx) => getDocumentStatus(idx));
  const totalRemainingCount = allDocumentsStatus.reduce((sum, s) => sum + s.remainingCount, 0);
  const isAllDocsComplete = totalRemainingCount === 0;

  const handleFinishSigning = async () => {
    if (signerContext?.isCopy) {
      showPopupAlert('You receive a copy of this document. No signature is needed.', { title: 'No action needed', type: 'info' });
      return;
    }
    if (signerContext?.alreadySigned) {
      showPopupAlert('You have already signed this document.', { title: 'Already signed', type: 'info' });
      return;
    }
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

    // STRICT MULTI-DOCUMENT VALIDATION: Check every document in documentsList
    for (let idx = 0; idx < documentsList.length; idx++) {
      const docStatus = getDocumentStatus(idx);
      if (!docStatus.isComplete) {
        setActiveDocIndex(idx);
        const missing = docStatus.missingFields[0];
        const docName = documentsList[idx]?.name || `Document ${idx + 1}`;
        const fieldName = missing?.label || missing?.type || 'Signature';

        showPopupAlert(
          `Please complete the required "${fieldName}" field in "${docName}" before finishing. All documents must be filled.`,
          {
            title: 'Field Required',
            type: 'warning'
          }
        );
        setValidationError(`⚠ Please complete the required "${fieldName}" in "${docName}".`);

        setTimeout(() => {
          const sigElement = missing?.id
            ? document.getElementById(`doc-field-${missing.id}`)
            : document.getElementById('signature-field-container');
          if (sigElement) {
            sigElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);
        return;
      }
    }

    setIsSubmitting(true);
    setValidationError('');

    try {
      if (signatureData) {
        localStorage.setItem(sigKey('signature'), signatureData);
        localStorage.setItem(sigKey('signer'), typedName);
        localStorage.setItem(sigKey('sigtype'), signatureType);
        localStorage.setItem(sigKey('sigstyle'), selectedStyle);
      }

      // A typed signature is issued as an image in the chosen handwriting style, so every signed copy looks the same
      const isTypedText = typeof signatureData === 'string' && signatureData && !/^(data:|https?:|\/)/.test(signatureData);
      const submittedSignature = isTypedText ? ((await typedSignatureImage(signatureData, selectedStyle)) || signatureData) : signatureData;

      // Generate certified base64 PDF for EVERY document in documentsList
      const completedPdfs = [];
      for (let i = 0; i < documentsList.length; i++) {
        const doc = documentsList[i];
        const docTitle = doc.name || `Document ${i + 1}.pdf`;
        const docMsg = doc.customMessage || documentDetails.message || 'check the document for signature';
        const docBexId = documentsList.length > 1 ? `${fullBexsignId}-${i + 1}` : fullBexsignId;
        const activeText = doc.documentText || getDefaultDocContent(docTitle, docMsg);
        const currentFields = (fieldsByDoc[i] || []).filter(isMyField);

        try {
          const pdfObj = await generatePdfBase64({
            defaultSignature: !requestHasFields,
            documentName: docTitle,
            documentText: activeText,
            docId: docBexId || docId,
            signerName: typedName || 'Vimal Chavda',
            signerEmail: documentDetails.recipient || 'vimal@bexcodeservices.com',
            date: new Date().toLocaleString(),
            status: 'Completed',
            signatureImage: submittedSignature,
            signatureType: signatureType,
            fields: currentFields
          });

          if (pdfObj && pdfObj.base64) {
            completedPdfs.push(pdfObj);
          }
        } catch (ePdf) {
          console.warn(`PDF generation warning for document ${i}:`, ePdf);
        }
      }

      const res = await fetch(`${API_BASE}/signatures/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: docId,
          token: docId,
          signatureData: submittedSignature,
          signerName: typedName,
          signerEmail: documentDetails.recipient,
          signatureStyle: selectedStyle,
          recipientId: signerContext?.recipientId || null,
          fields: Object.values(fieldsByDoc).flat().filter(isMyField),
          completedPdfs: completedPdfs
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Your signature could not be submitted. Please try again.');
      }
      setCompletionInfo(data);
      setIsCompleted(true);
    } catch (e) {
      console.warn('Signature submit error:', e);
      showPopupAlert(e.message || 'Your signature could not be submitted. Please try again.', { title: 'Submission failed', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  finishRef.current = handleFinishSigning;

  // ---- Guided fields: the callout walks the signer through their own fields, one at a time ----
  const GUIDE_TEXT = {
    Signature: 'Enter your signature.',
    Initial: 'Enter your initials.',
    Stamp: 'Add your stamp.',
    Company: 'Enter the company name.',
    'Full name': 'Enter your name.',
    Email: 'Enter your email address.',
    'Sign date': 'Enter the date.',
    Checkbox: 'Select the checkbox.',
    'Split text': 'Enter the characters.',
    'Job title': 'Enter your job title.',
    Text: 'Enter the text.'
  };
  const guideFields = (fieldsByDoc[activeDocIndex] || []).filter(isMyField);
  const guideIndex = guideFields.findIndex((f) => f.id === guideFieldId);
  const guideField = guideIndex === -1 ? null : guideFields[guideIndex];
  const guideText = guideField ? (GUIDE_TEXT[guideField.type] || `Enter ${String(guideField.label || guideField.type || 'the value').toLowerCase()}.`) : '';
  const guidePosition = guideField && guideFields.length > 1 ? `Field ${guideIndex + 1} of ${guideFields.length}` : '';

  const focusGuideField = (field) => {
    if (!field) return;
    setGuideFieldId(field.id);
    setTimeout(() => {
      const el = document.getElementById(`doc-field-${field.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  // Previous/Next move through this document's own fields; from the last one they continue in the next document
  const stepGuideField = (delta) => {
    if (guideFields.length === 0) return;
    const next = guideIndex === -1 ? (delta > 0 ? 0 : guideFields.length - 1) : guideIndex + delta;
    if (next >= 0 && next < guideFields.length) {
      focusGuideField(guideFields[next]);
      return;
    }
    if (documentsList.length > 1) {
      const nextDoc = (activeDocIndex + (delta > 0 ? 1 : -1) + documentsList.length) % documentsList.length;
      setActiveDocIndex(nextDoc);
      const list = (fieldsByDoc[nextDoc] || []).filter(isMyField);
      if (list.length > 0) focusGuideField(delta > 0 ? list[0] : list[list.length - 1]);
      return;
    }
    focusGuideField(guideFields[delta > 0 ? 0 : guideFields.length - 1]);
  };

  // The first field that still needs an entry is highlighted once signing starts and when the document changes
  useEffect(() => {
    if (!agreedConsent || isCompleted) return;
    const list = (fieldsByDoc[activeDocIndex] || []).filter(isMyField);
    if (list.length === 0) {
      setGuideFieldId(null);
      return;
    }
    setGuideFieldId((prev) => (list.some((f) => f.id === prev) ? prev : (list.find(isFieldMissing) || list[0]).id));
  }, [agreedConsent, activeDocIndex, isCompleted, fieldsByDoc]);

  // ---- "More actions": decline, assign, sign on paper, quick fill, skip, history ----
  const signingActionEmail = documentDetails.recipient || signerEmailParam;

  const callSigningAction = async (path, body) => {
    const res = await fetch(`${API_BASE}/signatures/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: docId, token: docId, signerEmail: signingActionEmail, ...body })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) throw new Error(data.error || `The request failed (HTTP ${res.status}).`);
    return data;
  };

  const actionErrorText = (err) => (err instanceof TypeError ? `Could not reach the BexSign server at ${API_ORIGIN}.` : err.message);

  const handleDeclineDocument = async (reason) => {
    setActionBusy('decline');
    setActionError('');
    try {
      const data = await callSigningAction('decline', { reason });
      setShowDeclineModal(false);
      setOutcome({ type: 'declined', message: data.message });
    } catch (err) {
      setActionError(actionErrorText(err));
    } finally {
      setActionBusy('');
    }
  };

  const handleAssignDocument = async ({ email, name, reason }) => {
    setActionBusy('assign');
    setActionError('');
    try {
      const data = await callSigningAction('assign', { newEmail: email, newName: name, reason });
      setShowAssignModal(false);
      setOutcome({ type: 'assigned', message: data.message });
    } catch (err) {
      setActionError(actionErrorText(err));
    } finally {
      setActionBusy('');
    }
  };

  const handleUploadPhysicalCopy = async (file) => {
    if (!file) return;
    setActionBusy('physical');
    setActionError('');
    try {
      const form = new FormData();
      form.append('signedDocument', file);
      form.append('documentId', docId);
      form.append('signerEmail', signingActionEmail || '');
      form.append('signerName', typedName || '');
      form.append('fields', JSON.stringify(Object.values(fieldsByDoc).flat().filter(isMyField)));
      const res = await fetch(`${API_BASE}/signatures/physical-copy`, { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.error || `The upload failed (HTTP ${res.status}).`);
      setShowPhysicalModal(false);
      setCompletionInfo(data);
      setIsCompleted(true);
    } catch (err) {
      setActionError(actionErrorText(err));
    } finally {
      setActionBusy('');
    }
  };

  // Quickly fill and sign: the profile signature plus the values BexSign knows (name, email, company, date)
  const handleQuickFillAndSign = ({ finishWhenFilled }) => {
    if (!signatureData) return;
    setSignaturePlaced(true);
    setSignatureType(/^(data:|https?:|\/)/.test(signatureData) ? 'draw' : 'type');
    const defaults = {
      signerName: typedName,
      signerEmail: signingActionEmail,
      signDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    setFieldsByDoc((prev) => Object.fromEntries(
      Object.entries(prev).map(([idx, list]) => [idx, (list || []).map((f) => (isMyField(f) ? applySignerDefaults([f], defaults)[0] : f))])
    ));
    setShowQuickFillModal(false);
    setValidationError('');
    if (finishWhenFilled) setTimeout(() => finishRef.current && finishRef.current(), 220);
  };

  const handleSkipSigning = () => {
    setShowSkipModal(false);
    setOutcome({
      type: 'skipped',
      message: `You left "${documentDetails.title}" without signing. Nothing has been saved.`
    });
  };

  const moreActionsMenu = (
    <div className="relative" ref={moreActionsRef}>
      <button
        type="button"
        onClick={() => setShowMoreActions(!showMoreActions)}
        aria-expanded={showMoreActions}
        className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition bg-white cursor-pointer"
      >
        <span>More actions</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${showMoreActions ? 'rotate-180' : ''}`} />
      </button>
      {showMoreActions && (
        <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-md shadow-xl py-1 z-40 text-xs font-medium overflow-hidden">
          {[
            { label: 'Quickly fill and sign', onClick: () => setShowQuickFillModal(true) },
            { label: 'Assign to someone else', onClick: () => setShowAssignModal(true) },
            { label: 'Print and physically sign', onClick: () => setShowPhysicalModal(true) },
            { label: 'Document history', onClick: () => setShowHistoryModal(true) },
            { label: 'Decline', onClick: () => setShowDeclineModal(true), tone: 'text-red-600 hover:bg-red-50' },
            { label: 'Skip signing', onClick: () => setShowSkipModal(true), tone: 'text-slate-500' }
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setShowMoreActions(false);
                setActionError('');
                item.onClick();
              }}
              className={`w-full text-left px-4 py-2 transition cursor-pointer ${item.tone || 'text-slate-700'} hover:bg-slate-50`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const signingActionModals = (
    <>
      {showTermsModal && (
        <TermsModal
          senderName={String(documentDetails.sender || '').split('<')[0].trim()}
          senderEmail={(/<([^>]+)>/.exec(documentDetails.sender || '') || [])[1] || documentDetails.sender}
          orgName={documentDetails.org}
          onAgree={() => {
            setAgreedConsent(true);
            setValidationError('');
            setShowTermsModal(false);
          }}
          onClose={() => setShowTermsModal(false)}
        />
      )}
      {showQuickFillModal && (
        <QuickFillModal
          email={signingActionEmail}
          signature={signatureData}
          signatureStyle={selectedStyle}
          signerName={typedName}
          busy={actionBusy === 'quick'}
          onRemoveSignature={() => {
            setSignatureData('');
            setSignaturePlaced(false);
          }}
          onAddSignature={() => {
            setShowQuickFillModal(false);
            setShowSignatureModal(true);
          }}
          onConfirm={handleQuickFillAndSign}
          onClose={() => setShowQuickFillModal(false)}
        />
      )}
      {showAssignModal && (
        <AssignModal
          busy={actionBusy === 'assign'}
          error={actionError}
          onAssign={handleAssignDocument}
          onClose={() => setShowAssignModal(false)}
        />
      )}
      {showPhysicalModal && (
        <PhysicalSignModal
          busy={actionBusy === 'physical'}
          error={actionError}
          onDownload={() => handleDownloadSignedPdf('')}
          onPrint={handlePrintSignedPdf}
          onUpload={handleUploadPhysicalCopy}
          onClose={() => setShowPhysicalModal(false)}
        />
      )}
      {showDeclineModal && (
        <DeclineModal
          busy={actionBusy === 'decline'}
          error={actionError}
          onDecline={handleDeclineDocument}
          onClose={() => setShowDeclineModal(false)}
        />
      )}
      {showSkipModal && <SkipModal onSkip={handleSkipSigning} onClose={() => setShowSkipModal(false)} />}
      {showHistoryModal && (
        <HistoryModal documentId={docId} signerEmail={signingActionEmail} onClose={() => setShowHistoryModal(false)} />
      )}
    </>
  );

  // The recipient declined, assigned the signing to someone else or skipped it
  if (outcome) {
    return (
      <SigningOutcomeScreen
        outcome={outcome}
        documentName={documentDetails.title}
        onBack={() => navigate('/documents')}
      />
    );
  }

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
          status: 'Completed',
          // Completed requests return every recipient's fields from the server
          ...(Object.keys(fieldsByDoc).length > 0 ? { fieldsByDoc } : {})
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
              <span className="font-semibold text-slate-800 text-right">{documentDetails.sentOn ? new Date(documentDetails.sentOn).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Sep 02, 2026'} &lt;Expires in {documentDetails.expiresIn}&gt;</span>
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
    const hasSeveralDocs = documentsList.length > 1;
    const selectedOutput = hasSeveralDocs && (outputDocIndex === 'all' || outputDocIndex < documentsList.length) ? outputDocIndex : 0;
    const outputIndexes = selectedOutput === 'all' ? documentsList.map((_, idx) => idx) : [selectedOutput];
    const outputLabel = selectedOutput === 'all'
      ? `All ${documentsList.length} documents`
      : (documentsList[selectedOutput]?.name || `Document ${selectedOutput + 1}`);
    // Which of the request's documents Print and Download use (shown only when there is more than one)
    const documentPicker = (id) => hasSeveralDocs && (
      <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 text-left">
        <label htmlFor={id} className="text-xs font-bold text-slate-600 shrink-0">Document</label>
        <div className="relative w-full sm:w-auto sm:min-w-64">
          <select
            id={id}
            value={String(selectedOutput)}
            onChange={(e) => setOutputDocIndex(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="w-full appearance-none bg-white border border-slate-300 rounded pl-3 pr-8 py-2 text-xs font-semibold text-slate-800 shadow-xs focus:outline-none focus:border-[#007355] cursor-pointer"
          >
            {documentsList.map((d, idx) => (
              <option key={d.id || idx} value={idx}>{idx + 1}. {d.name || `Document ${idx + 1}`}</option>
            ))}
            <option value="all">All documents ({documentsList.length})</option>
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>
      </div>
    );

    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-xl w-full text-center space-y-8">
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-700 tracking-tight">
              {completionInfo?.alreadySigned ? 'You have already signed this document.' : 'You have signed this document.'}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              {completionInfo?.completed
                ? 'All recipients have completed the request. The signed documents and the certificate of completion have been emailed to everyone.'
                : (completionInfo?.remainingSigners?.length
                  ? `Waiting for ${completionInfo.remainingSigners.map((r) => r.name || r.email).join(', ')} to sign. You will receive the completed documents by email once everyone has signed.`
                  : 'You will receive the completed documents by email once everyone has signed.')}
            </p>
          </div>

          {hasSeveralDocs && (
            <div className="flex justify-center">{documentPicker('completion-document-picker')}</div>
          )}

          {/* Action Buttons matching Page 11 */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 relative">
            <button
              onClick={async () => {
                const targetEmail = documentDetails.recipient || 'vimal@bexcodeservices.com';
                try {
                  const res = await fetch(`${API_BASE}/documents/${docId}/email-copy`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ emails: [targetEmail], note: 'Here is your certified signed copy.' })
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok || data.success === false) throw new Error(data.error || data.message || 'The email could not be sent.');
                  showPopupAlert(data.message || `A copy of the document has been emailed to ${targetEmail}.`, { title: 'Email sent', type: 'success' });
                } catch (e) {
                  showPopupAlert(e.message || 'The email could not be sent.', { title: 'Email failed', type: 'error' });
                }
              }}
              className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 rounded text-xs font-bold text-slate-800 shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Mail size={16} className="text-[#007355]" /> Email to me
            </button>

            <button
              onClick={() => handlePrintSignedPdf(outputIndexes)}
              title={hasSeveralDocs ? `Print ${outputLabel}` : 'Print'}
              className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 rounded text-xs font-bold text-slate-800 shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Printer size={16} /> Print
            </button>

            {/* Split Download Button (Direct Download + Download with password) */}
            <div className="relative inline-flex rounded shadow-xs">
              <button
                onClick={() => handleDownloadSignedPdf('', outputIndexes)}
                title={hasSeveralDocs ? `Download ${outputLabel}` : 'Download'}
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
                Set an optional password to encrypt and secure {selectedOutput === 'all' ? 'these signed documents' : 'this signed document'}.
              </p>
              {documentPicker('password-document-picker')}
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
                    handleDownloadSignedPdf(downloadPassword, outputIndexes);
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
      <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between text-xs sticky top-0 z-30 shadow-xs gap-2 sm:gap-4">
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
              I confirm that I have read and understood the{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setShowTermsModal(true);
                }}
                className="underline text-[#007355] font-bold hover:text-[#005c44] cursor-pointer"
              >
                "Electronic Record and Signature Disclosure"
              </button>{' '}
              and consent to use electronic records and signatures.
            </span>
          </label>

          {!agreedConsent && (
            <span className="hidden lg:flex items-center gap-1.5 rounded bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md">
              Check this and click <strong className="font-bold">Agree &amp; Continue</strong> to start signing
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {!agreedConsent && moreActionsMenu}
          <button
            onClick={handleAgreeAndContinue}
            className={`px-4 py-1.5 rounded font-bold text-xs transition shadow-xs ${
              agreedConsent ? 'bg-[#007355] text-white' : 'bg-[#007355] hover:bg-[#005c44] text-white'
            }`}
          >
            Agree & Continue
          </button>

        </div>
      </div>

      {/* Guided Navigator Toolbar (Page 9) */}
      {agreedConsent && (
        <header className="min-h-12 bg-white border-b border-slate-300 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 sticky top-9 z-20 shadow-xs">
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
            <span className={`px-3 py-0.5 rounded-full text-[11px] font-bold ${
              totalRemainingCount === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              Fields remaining: {totalRemainingCount}
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

            {moreActionsMenu}

            <button
              onClick={handleFinishSigning}
              disabled={isSubmitting || Boolean(signerContext && (signerContext.isCopy || signerContext.alreadySigned))}
              className="bg-[#007355] hover:bg-[#005c44] disabled:opacity-60 text-white px-6 py-1.5 rounded font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                'Finish'
              )}
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
            const docStatus = allDocumentsStatus[idx] || { isComplete: false, remainingCount: 0 };
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
                {docStatus.isComplete ? (
                  <CheckCircle2 size={13} className={isDocActive ? 'text-emerald-200' : 'text-emerald-600'} />
                ) : (
                  <FileText size={13} />
                )}
                <span>{idx + 1}. {doc.name}</span>
                {docStatus.isComplete ? (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isDocActive ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    Filled ✓
                  </span>
                ) : (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isDocActive ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {docStatus.remainingCount} remaining
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Top Banner Message when Fields Completed (Page 11) */}
      {(() => {
        if (isAllDocsComplete) {
          return (
            <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 px-6 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 sticky top-21 z-20">
              <CheckCircle2 size={16} className="text-[#007355]" />
              <span>You've successfully filled all fields{documentsList.length > 1 ? ` across all ${documentsList.length} documents` : ''}. Click Finish to complete.</span>
            </div>
          );
        }
        if (documentsList.length > 1 && allDocumentsStatus[activeDocIndex]?.isComplete) {
          const nextUnfilledIdx = allDocumentsStatus.findIndex(s => !s.isComplete);
          return (
            <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-6 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2 sticky top-21 z-20">
              <AlertCircle size={15} className="text-amber-600 shrink-0" />
              <span>
                "{documentsList[activeDocIndex]?.name || `Document ${activeDocIndex + 1}`}" is complete. Please switch to Document {nextUnfilledIdx + 1} ({documentsList[nextUnfilledIdx]?.name}) to fill remaining fields before clicking Finish.
              </span>
              <button
                type="button"
                onClick={() => setActiveDocIndex(nextUnfilledIdx)}
                className="ml-2 px-2 py-0.5 bg-[#007355] text-white rounded text-[11px] font-bold hover:bg-[#005c44] cursor-pointer"
              >
                Go to Document {nextUnfilledIdx + 1}
              </button>
            </div>
          );
        }
        return null;
      })()}

      {signerContext && (signerContext.isCopy || signerContext.alreadySigned) && (
        <div className="bg-sky-50 border-b border-sky-200 text-sky-900 px-4 sm:px-6 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2">
          <AlertCircle size={15} className="text-sky-600 shrink-0" />
          <span>
            {signerContext.isCopy
              ? 'You receive a copy of this document. No signature is needed - the completed document will be emailed to you.'
              : `You have already signed this document.${signerContext.remaining?.length ? ` Waiting for ${signerContext.remaining.join(', ')}.` : ''}`}
          </span>
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
          onOpenSignatureModal={handleOpenSignatureModal}
          isCompleted={isCompleted}
          showTooltips={!agreedConsent}
          allFieldsComplete={isAllDocsComplete}
          defaultSignature={!requestHasFields}
          guideFieldId={agreedConsent && !isCompleted ? guideFieldId : null}
          guideText={guideText}
          guidePosition={guidePosition}
          onGuidePrevious={() => stepGuideField(-1)}
          onGuideNext={() => stepGuideField(1)}
          onGuideClose={() => setGuideFieldId(null)}
          copiedId={copiedId}
          onCopyId={handleCopyId}
          placedFields={fieldsByDoc[activeDocIndex] || []}
          onUpdateField={handleUpdateFieldValue}
        />
      </main>

      {/* Confirmation Modal to Change Saved Signature */}
      {showConfirmChangeSigModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans text-slate-900">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <PenTool size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Modify Saved Signature?</h3>
              </div>
              <button onClick={() => setShowConfirmChangeSigModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <p className="text-xs text-slate-700 leading-relaxed">
                You already have your official saved electronic signature active for <strong className="text-slate-900">{typedName}</strong>.
              </p>
              <p className="text-xs text-slate-500">
                Do you want to change or redraw your signature for this document, or keep the existing saved signature?
              </p>
            </div>

            <div className="flex justify-end items-center gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmChangeSigModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                No, Keep Existing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmChangeSigModal(false);
                  setShowSignatureModal(true);
                }}
                className="px-4 py-2 bg-[#007355] hover:bg-[#005c44] text-white rounded-lg text-xs font-bold transition shadow"
              >
                Yes, Change Signature
              </button>
            </div>
          </div>
        </div>
      )}

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

      {signingActionModals}
    </div>
  );
}
