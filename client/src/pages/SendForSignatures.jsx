import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  FileText,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  SlidersHorizontal,
  X,
  Trash2,
  Upload,
  HardDrive,
  Cloud,
  FileBox,
  Layers,
  FileEdit,
  MessageSquare,
  Lock,
  Mail,
  ShieldCheck,
  CheckCircle2,
  MoreVertical,
  Edit3,
  PenTool,
  RotateCw,
  Copy,
  ChevronUp,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { showPopupAlert } from '../components/GlobalAlertModal';
import { getDefaultDocContent, DEFAULT_DOCUMENT_TEXTS } from '../utils/documentDefaults';

const API_BASE = 'http://localhost:5000/api';
// Zoho Sign limits
const MAX_RECIPIENTS = 25;
const MAX_DOCUMENTS = 40;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIGNING_ROLE_LABELS = ['Needs to sign', 'In-person signer', 'Approver'];
const AUTOSAVE_DELAY_MS = 1500;

function getCurrentUser() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    if (u && u.email) {
      const fullName = u.name || `${u.firstName || u.first_name || ''} ${u.lastName || u.last_name || ''}`.trim();
      return { id: u.id || 1, email: u.email, name: fullName || u.email.split('@')[0] };
    }
  } catch (e) {}
  return { id: 1, email: 'vimal@bexcodeservices.com', name: 'Vimal Chavda' };
}

function toRoleLabel(role) {
  const low = String(role || '').toLowerCase();
  if (low.includes('approv')) return 'Approver';
  if (low.includes('in-person') || low.includes('inperson')) return 'In-person signer';
  if (low.includes('copy') || low.includes('view') || low === 'cc') return 'Receives a copy';
  return 'Needs to sign';
}

function newUploadKey(seed) {
  return `${seed || 'doc'}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

// Zoho Sign: a request has no default document. The only document created without "Add document" is one the
// user already chose on another screen (written in the rich-text editor, or "Edit as new" of a document).
function documentsFromNavigationState(state) {
  const name = String(state?.docName || state?.documentName || '').trim();
  if (!name) return [];
  const fileName = /\.pdf$/i.test(name) ? name : `${name}.pdf`;
  return [
    {
      id: Date.now(),
      name: fileName,
      pages: 1,
      status: 'Ready',
      file: null,
      documentText: state.docContent || getDefaultDocContent(fileName),
      customMessage: 'check the document for signature'
    }
  ];
}

// Built-in agreement templates offered by "Add document > Template(s)"
const BUILT_IN_TEMPLATES = [
  { name: 'Standard Employment Agreement 2026.pdf', description: 'Appointment, duties, compensation and confidentiality' },
  { name: 'Mutual Non-Disclosure Agreement (NDA).pdf', description: 'Protect confidential information shared by both parties' },
  { name: 'Vendor Service Contract.pdf', description: 'Scope of services, service levels and payment terms' },
  { name: 'Consultancy Agreement Template.pdf', description: 'Engagement terms for independent consultants' }
];

// Signing order ("Send in order"): a recipient's step number; recipients sharing a step are emailed at the same time
function stepOf(recipient, index) {
  const n = parseInt(recipient?.signingOrder, 10);
  return Number.isFinite(n) && n > 0 ? n : index + 1;
}

function nextStep(list) {
  return (list || []).reduce((max, r, idx) => Math.max(max, stepOf(r, idx)), 0) + 1;
}

/** Sorts recipients by step (keeping their relative order) and makes the steps consecutive (1, 1, 4 -> 1, 1, 2). */
function normalizeRecipientSteps(list) {
  const ordered = (list || [])
    .map((r, idx) => ({ r, idx, step: stepOf(r, idx) }))
    .sort((a, b) => a.step - b.step || a.idx - b.idx);
  const ranks = new Map([...new Set(ordered.map((x) => x.step))].map((step, i) => [step, i + 1]));
  return ordered.map(({ r, step }) => ({ ...r, signingOrder: ranks.get(step) }));
}

function cleanRecipientList(list, { validOnly = false } = {}) {
  return (list || [])
    .map((r, idx) => ({ r, step: stepOf(r, idx) }))
    .filter(({ r }) => r.email && r.email.trim() && (!validOnly || EMAIL_PATTERN.test(r.email.trim())))
    .map(({ r, step }) => ({
      email: r.email.trim(),
      name: r.name && r.name.trim() ? r.name.trim() : r.email.trim().split('@')[0],
      role: r.role || 'Needs to sign',
      deliveryMode: r.deliveryMode || 'Email',
      privateNote: r.privateNote || '',
      signingOrder: step
    }));
}

function buildSnapshotKey(state) {
  return JSON.stringify({
    docs: (state.documentsList || []).map((d) => [d.name, d.documentText, d.fileId || null, d.file ? d.uploadKey : null]),
    recipients: (state.recipients || []).map((r, idx) => [r.email, r.name, r.role, r.deliveryMode, r.privateNote, stepOf(r, idx)]),
    settings: [
      state.sendInOrder, state.daysToComplete, state.agreementValidUntil, state.documentType, state.folder,
      state.description, state.allowComments, state.autoReminders, state.reminderEveryDays, state.noteToAll
    ]
  });
}

function clearDraftCache(docId) {
  ['documents', 'recipients', 'fields_by_doc', 'fields', 'is_new', 'settings', 'extra_pages'].forEach((key) => {
    localStorage.removeItem(`bexsign_doc_${docId}_${key}`);
  });
  localStorage.removeItem('bexsign_draft_documents');
}

function DraftSaveIndicator({ saveState, isDraft }) {
  if (!isDraft) return null;
  if (saveState.status === 'saving') {
    return (
      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
        <Loader2 size={12} className="animate-spin" /> Saving draft...
      </span>
    );
  }
  if (saveState.status === 'saved') {
    return (
      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
        <CheckCircle2 size={12} /> Draft saved{saveState.at ? ` at ${saveState.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
      </span>
    );
  }
  if (saveState.status === 'error') {
    return (
      <span className="text-[11px] font-semibold text-red-600 flex items-center gap-1.5" title={saveState.error}>
        <AlertCircle size={12} /> Draft not saved: {saveState.error}
      </span>
    );
  }
  return <span className="text-[11px] font-medium text-slate-400">Changes are saved as a draft automatically</span>;
}

export default function SendForSignatures() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [currentUser] = useState(getCurrentUser);
  const [currentCreatedId, setCurrentCreatedId] = useState(id ? parseInt(id) : null);

  // Multi-Document State (Pages 4 & 5): starts empty for a new request, documents are added by the user
  const [documentsList, setDocumentsList] = useState(() => {
    const saved = id ? localStorage.getItem(`bexsign_doc_${id}_documents`) : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((d, idx) => ({
            ...d,
            file: null,
            id: d.id || Date.now() + idx,
            documentText: d.documentText || getDefaultDocContent(d.name, d.customMessage)
          }));
        }
      } catch (e) {}
    }
    return documentsFromNavigationState(location.state);
  });
  // Set once the user removes documents, so an emptied draft is saved without documents
  const documentsRemovedRef = useRef(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState({ status: 'idle', items: [] });
  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [activeCardMenuIndex, setActiveCardMenuIndex] = useState(null);
  const [isCustomTextOpen, setIsCustomTextOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const replaceFileInputRef = useRef(null);
  const [targetReplaceDocIndex, setTargetReplaceDocIndex] = useState(null);

  // Modals for dropdown items
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Recipient State
  // Everyone is emailed at once unless the sender chooses "Send in order"
  const [sendInOrder, setSendInOrder] = useState(false);
  const [recipients, setRecipients] = useState(() => [
    {
      id: 1,
      email: currentUser.email,
      name: currentUser.name,
      role: 'Needs to sign',
      deliveryMode: 'Email',
      auth: 'Email OTP',
      passcode: '',
      privateNote: '',
      signingOrder: 1
    }
  ]);

  // Customize Modal State
  const [activeCustomizeIndex, setActiveCustomizeIndex] = useState(null);

  // More Settings State
  const [moreSettingsOpen, setMoreSettingsOpen] = useState(true);
  const [daysToComplete, setDaysToComplete] = useState('15');
  const [agreementValidUntil, setAgreementValidUntil] = useState('Forever');
  const [documentType, setDocumentType] = useState('Others');
  const [folder, setFolder] = useState('None');
  const [description, setDescription] = useState('');
  const [allowComments, setAllowComments] = useState(false);
  const [autoReminders, setAutoReminders] = useState(true);
  const [reminderEveryDays, setReminderEveryDays] = useState('5');
  const [noteToAll, setNoteToAll] = useState('');

  // Draft State (Zoho Sign: a request stays a Draft until it is sent or discarded)
  const [requestStatus, setRequestStatus] = useState(id ? null : 'Draft');
  const [saveState, setSaveState] = useState({ status: 'idle', at: null, error: '' });
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragRecipientIndex, setDragRecipientIndex] = useState(null);
  const [armedDragIndex, setArmedDragIndex] = useState(null);
  const draftIdRef = useRef(id ? parseInt(id) : null);
  const savePromiseRef = useRef(null);
  const lastSavedKeyRef = useRef(null);
  const skipNextAutosaveRef = useRef(true);
  const discardedRef = useRef(false);
  const saveDraftRef = useRef(null);
  const latestRef = useRef({});

  const isDraftRequest = requestStatus === 'Draft';
  latestRef.current = {
    documentsList, recipients, sendInOrder, daysToComplete, agreementValidUntil, documentType, folder,
    description, allowComments, autoReminders, reminderEveryDays, noteToAll, requestStatus
  };
  const draftSnapshotKey = buildSnapshotKey(latestRef.current);

  // Per-row recipient problems (duplicate / invalid email) shown as red inputs
  const recipientIssues = (() => {
    const counts = {};
    recipients.forEach((r) => {
      const key = (r.email || '').trim().toLowerCase();
      if (key) counts[key] = (counts[key] || 0) + 1;
    });
    return recipients.map((r) => {
      const email = (r.email || '').trim();
      if (!email) return '';
      if (counts[email.toLowerCase()] > 1) return 'This email is added more than once';
      if (email.includes('@') && !EMAIL_PATTERN.test(email)) return 'Enter a valid email address';
      return '';
    });
  })();

  // Loading existing draft if id is passed
  useEffect(() => {
    if (id) {
      fetchDraftData();
    }
  }, [id]);

  // Close dropdown and card 3-dots menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (!event.target.closest('.card-3dots-menu-container')) {
        setActiveCardMenuIndex(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Saved templates listed in "Add document > Template(s)" (loaded the first time the picker opens)
  useEffect(() => {
    if (!showTemplateModal || savedTemplates.status !== 'idle') return;
    setSavedTemplates({ status: 'loading', items: [] });
    fetch(`${API_BASE}/templates`)
      .then((res) => res.json())
      .then((data) => setSavedTemplates({ status: 'ready', items: Array.isArray(data.templates) ? data.templates : [] }))
      .catch(() => setSavedTemplates({ status: 'ready', items: [] }));
  }, [showTemplateModal]);

  const fetchDraftData = async () => {
    try {
      const res = await fetch(`${API_BASE}/documents/${id}`);
      const data = await res.json();
      if (data.success && data.document) {
        const doc = data.document;
        let loadedDocs = [];

        if (doc.files && Array.isArray(doc.files) && doc.files.length > 0) {
          // Server documents are the source of truth (they carry the file ids used for field mapping)
          loadedDocs = doc.files.map((f, i) => ({
            id: f.id || i + 1,
            fileId: f.id || null,
            name: f.file_name || `Document ${i + 1}.pdf`,
            pages: 1,
            status: 'Ready',
            file: null,
            filePath: f.file_path || null,
            fileSize: f.file_size ? `${f.file_size} KB` : undefined,
            documentText: f.document_text || getDefaultDocContent(f.file_name, doc.custom_message),
            customMessage: doc.custom_message || 'check the document for signature'
          }));
        } else {
          try {
            const savedDocs = localStorage.getItem(`bexsign_doc_${id}_documents`);
            if (savedDocs) loadedDocs = JSON.parse(savedDocs);
          } catch (e) {}
          if (!Array.isArray(loadedDocs) || loadedDocs.length === 0) {
            // No documents saved yet: nothing is invented, the user adds documents from "Add document"
            loadedDocs = documentsFromNavigationState(location.state);
          } else {
            loadedDocs = loadedDocs.map((d) => ({
              ...d,
              file: null,
              documentText: d.documentText || getDefaultDocContent(d.name, d.customMessage)
            }));
          }
        }

        skipNextAutosaveRef.current = true;
        setDocumentsList(loadedDocs);
        setActiveDocIndex(0);
        localStorage.setItem(`bexsign_doc_${id}_documents`, JSON.stringify(loadedDocs));

        if (doc.custom_message) setNoteToAll(doc.custom_message);
        if (doc.signing_order) setSendInOrder(doc.signing_order === 'sequential');
        if (doc.expiration_days) setDaysToComplete(String(doc.expiration_days));
        if (doc.reminder_days) setReminderEveryDays(String(doc.reminder_days));
        if (doc.document_type) setDocumentType(doc.document_type);
        if (doc.description) setDescription(doc.description);
        if (doc.validity) setAgreementValidUntil(doc.validity);
        if (doc.folder_name) setFolder(doc.folder_name);
        if (doc.auto_reminders !== undefined && doc.auto_reminders !== null) setAutoReminders(Boolean(doc.auto_reminders));
        if (doc.allow_comments !== undefined && doc.allow_comments !== null) setAllowComments(Boolean(doc.allow_comments));

        const realRecipients = (doc.recipients || []).filter((r) => !r.isFallback);
        if (realRecipients.length > 0) {
          const loadedRecs = realRecipients.map((r, idx) => ({
            id: r.id || idx + 1,
            serverId: r.id || null,
            email: r.email || '',
            name: r.name || (r.email ? r.email.split('@')[0] : `Signer ${idx + 1}`),
            role: r.role_label || toRoleLabel(r.role),
            deliveryMode: r.delivery_mode || 'Email',
            auth: 'Email OTP',
            passcode: '',
            privateNote: r.private_note || '',
            signingOrder: r.signing_order_index || idx + 1,
            status: r.status
          }));
          setRecipients(loadedRecs);
          localStorage.setItem(`bexsign_doc_${id}_recipients`, JSON.stringify(loadedRecs));
        } else {
          const savedRecs = localStorage.getItem(`bexsign_doc_${id}_recipients`);
          if (savedRecs) {
            try {
              const parsed = JSON.parse(savedRecs);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setRecipients(parsed);
              }
            } catch (e) {}
          } else if (doc.recipient_email) {
            setRecipients([
              {
                id: 1,
                email: doc.recipient_email,
                name: doc.signer_name || doc.recipient_name || doc.recipient_email.split('@')[0],
                role: 'Needs to sign',
                deliveryMode: 'Email',
                auth: 'Email OTP',
                passcode: '',
                privateNote: ''
              }
            ]);
          }
        }
        setRequestStatus(doc.status || 'Draft');
      }
    } catch (e) {
      console.warn('Draft load warning:', e);
      setRequestStatus((prev) => prev || 'Draft');
    }
  };

  // ---------------------------------------------------------------------------
  // Draft persistence (creates the draft on first save, then updates it)
  // ---------------------------------------------------------------------------
  const buildRequestFormData = (snapshot, status) => {
    const docsMeta = snapshot.documentsList.map((d, i) => ({
      fileId: d.fileId || null,
      uploadKey: d.file ? d.uploadKey : null,
      name: (d.name || `Document ${i + 1}.pdf`).trim(),
      documentText: d.documentText || getDefaultDocContent(d.name, d.customMessage || snapshot.noteToAll),
      filePath: d.filePath || null
    }));

    const formData = new FormData();
    if (draftIdRef.current) formData.append('documentId', draftIdRef.current);
    formData.append('userId', currentUser.id);
    formData.append('documentName', docsMeta[0]?.name || 'Untitled document');
    formData.append('status', status);
    formData.append('folderName', snapshot.folder || 'None');
    formData.append('signingOrder', snapshot.sendInOrder ? 'sequential' : 'parallel');
    formData.append('daysToComplete', snapshot.daysToComplete);
    formData.append('agreementValidUntil', snapshot.agreementValidUntil);
    formData.append('documentType', snapshot.documentType);
    formData.append('description', snapshot.description);
    formData.append('allowComments', snapshot.allowComments ? '1' : '0');
    formData.append('autoReminders', snapshot.autoReminders ? '1' : '0');
    formData.append('reminderDays', snapshot.reminderEveryDays);
    formData.append('noteToAll', snapshot.noteToAll);
    formData.append('recipients', JSON.stringify(cleanRecipientList(snapshot.recipients, { validOnly: true })));
    formData.append('documentsMeta', JSON.stringify(docsMeta));
    formData.append('documentsCleared', docsMeta.length === 0 && documentsRemovedRef.current ? '1' : '0');
    snapshot.documentsList.forEach((d) => {
      if (d.file && d.uploadKey) {
        formData.append(`file_${d.uploadKey}`, d.file, d.file.name);
      }
    });
    return formData;
  };

  const saveDraft = async ({ silent = false, status } = {}) => {
    if (discardedRef.current) return null;
    while (savePromiseRef.current) {
      try {
        await savePromiseRef.current;
      } catch (e) {}
    }

    const snapshot = latestRef.current;
    const keyAtSend = buildSnapshotKey(snapshot);
    const statusToSave = status || (snapshot.requestStatus && snapshot.requestStatus !== 'Draft' ? snapshot.requestStatus : 'Draft');

    const run = (async () => {
      setSaveState({ status: 'saving', at: null, error: '' });
      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        body: buildRequestFormData(snapshot, statusToSave)
      });
      let data = {};
      try {
        data = await res.json();
      } catch (e) {}
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Could not save the request (HTTP ${res.status}).`);
      }

      const newId = data.documentId;
      const createdNow = draftIdRef.current !== newId;
      draftIdRef.current = newId;
      setCurrentCreatedId(newId);
      if (createdNow && !id) {
        // Keep the draft on refresh without remounting the page
        window.history.replaceState(window.history.state, '', `/documents/${newId}/send`);
      }
      if (data.document?.status) setRequestStatus(data.document.status);

      // Attach server file ids/paths to the documents that were just uploaded
      const savedFiles = Array.isArray(data.files) ? data.files : [];
      const unchangedDuringSave = buildSnapshotKey(latestRef.current) === keyAtSend;
      const updatedDocs = latestRef.current.documentsList.map((d, idx) => {
        let match = null;
        if (d.file && d.uploadKey) match = savedFiles.find((f) => f.uploadKey === d.uploadKey);
        if (!match && d.fileId) match = savedFiles.find((f) => String(f.id) === String(d.fileId));
        if (!match && !d.fileId && !d.file && unchangedDuringSave) match = savedFiles[idx] || null;
        if (!match) return d;
        const next = { ...d, fileId: match.id, filePath: match.file_path };
        if (d.file && d.uploadKey && match.uploadKey === d.uploadKey) {
          next.file = null;
          next.uploadKey = null;
        }
        return next;
      });
      latestRef.current = { ...latestRef.current, documentsList: updatedDocs };
      setDocumentsList(updatedDocs);
      lastSavedKeyRef.current = unchangedDuringSave ? buildSnapshotKey(latestRef.current) : keyAtSend;

      localStorage.setItem(`bexsign_doc_${newId}_documents`, JSON.stringify(updatedDocs));
      localStorage.setItem(`bexsign_doc_${newId}_recipients`, JSON.stringify(cleanRecipientList(snapshot.recipients)));
      localStorage.removeItem('bexsign_draft_documents');

      setSaveState({ status: 'saved', at: new Date(), error: '' });
      return { documentId: newId, recipients: data.recipients || [], files: savedFiles, documents: updatedDocs };
    })();

    savePromiseRef.current = run;
    try {
      return await run;
    } catch (err) {
      setSaveState({ status: 'error', at: null, error: err.message });
      if (!silent) throw err;
      return null;
    } finally {
      savePromiseRef.current = null;
    }
  };
  saveDraftRef.current = saveDraft;

  // Auto-save: every change to a Draft request is persisted after a short pause
  useEffect(() => {
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      lastSavedKeyRef.current = draftSnapshotKey;
      return;
    }
    if (requestStatus !== 'Draft' || discardedRef.current || draftSnapshotKey === lastSavedKeyRef.current) return;
    const timer = setTimeout(() => {
      saveDraftRef.current?.({ silent: true });
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draftSnapshotKey, requestStatus]);

  // Leaving the page without discarding keeps the request as a draft
  useEffect(() => {
    const hasUnsavedDraft = () => latestRef.current.requestStatus === 'Draft'
      && !discardedRef.current
      && (Boolean(savePromiseRef.current) || buildSnapshotKey(latestRef.current) !== lastSavedKeyRef.current);

    const handleBeforeUnload = (e) => {
      if (hasUnsavedDraft()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (hasUnsavedDraft() && !savePromiseRef.current) {
        saveDraftRef.current?.({ silent: true });
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Documents
  // ---------------------------------------------------------------------------
  const addFilesToDocuments = async (files) => {
    if (!files || files.length === 0) return;
    const tooLarge = files.filter((f) => f.size > MAX_FILE_SIZE);
    const accepted = files.filter((f) => f.size <= MAX_FILE_SIZE);
    if (tooLarge.length > 0) {
      showPopupAlert(`${tooLarge.map((f) => f.name).join(', ')} ${tooLarge.length === 1 ? 'is' : 'are'} larger than 25 MB and cannot be added.`, {
        title: 'File too large',
        type: 'warning'
      });
    }
    if (accepted.length === 0) return;

    const newDocs = await Promise.all(
      accepted.map(async (f, idx) => {
        let text = '';
        if (f.name.endsWith('.txt') || f.name.endsWith('.md') || f.type.startsWith('text/')) {
          try {
            text = await f.text();
          } catch (err) {
            text = getDefaultDocContent(f.name);
          }
        } else {
          text = getDefaultDocContent(f.name);
        }
        const cleanName = f.name.endsWith('.pdf') ? f.name : `${f.name.replace(/\.[^/.]+$/, '')}.pdf`;
        const docId = Date.now() + idx + Math.floor(Math.random() * 1000);
        return {
          id: docId,
          name: cleanName,
          pages: 1,
          status: 'Ready',
          file: f,
          uploadKey: newUploadKey(docId),
          fileSize: (f.size / 1024).toFixed(1) + ' KB',
          documentText: text,
          customMessage: noteToAll || 'check the document for signature'
        };
      })
    );

    setDocumentsList((prev) => {
      const room = MAX_DOCUMENTS - prev.length;
      if (newDocs.length > room) {
        showPopupAlert(`A request can contain at most ${MAX_DOCUMENTS} documents. Only the first ${Math.max(room, 0)} file(s) were added.`, {
          title: 'Document limit',
          type: 'warning'
        });
      }
      const updated = [...prev, ...newDocs.slice(0, Math.max(room, 0))];
      setActiveDocIndex(Math.max(0, updated.length - 1));
      return updated;
    });

    setIsDropdownOpen(false);
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    await addFilesToDocuments(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDocumentsDragOver = (e) => {
    e.preventDefault();
    if (!isDraggingFiles) setIsDraggingFiles(true);
  };

  const handleDocumentsDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDraggingFiles(false);
  };

  const handleDocumentsDrop = (e) => {
    e.preventDefault();
    setIsDraggingFiles(false);
    addFilesToDocuments(Array.from(e.dataTransfer.files || []));
  };

  const handleAddTemplateDocument = (templateName, extra = {}) => {
    const fileName = /\.pdf$/i.test(templateName) ? templateName : `${templateName}.pdf`;
    setShowTemplateModal(false);
    handleAddNewDoc(fileName, extra);
  };

  const handleAddNewDoc = (customTitle = '', extra = {}) => {
    if (documentsList.length >= MAX_DOCUMENTS) {
      showPopupAlert(`A request can contain at most ${MAX_DOCUMENTS} documents.`, { title: 'Document limit', type: 'warning' });
      return;
    }
    const nextNum = documentsList.length + 1;
    const cleanTitle = customTitle || `Document ${nextNum}.pdf`;
    const newDoc = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      name: cleanTitle,
      pages: 1,
      status: 'Ready',
      file: null,
      documentText: getDefaultDocContent(cleanTitle),
      customMessage: noteToAll || 'check the document for signature',
      ...extra
    };
    setDocumentsList((prev) => {
      const updated = [...prev, newDoc];
      setActiveDocIndex(updated.length - 1);
      return updated;
    });
    setIsDropdownOpen(false);
  };

  const handleRemoveDoc = (indexToRemove) => {
    const updated = documentsList.filter((_, idx) => idx !== indexToRemove);
    documentsRemovedRef.current = true;
    setDocumentsList(updated);
    const activeId = draftIdRef.current || id || currentCreatedId;
    if (activeId) {
      localStorage.setItem(`bexsign_doc_${activeId}_documents`, JSON.stringify(updated));
      try {
        const savedFields = localStorage.getItem(`bexsign_doc_${activeId}_fields_by_doc`);
        if (savedFields) {
          const parsed = JSON.parse(savedFields);
          const nextFields = {};
          let newIdx = 0;
          for (let i = 0; i < documentsList.length; i++) {
            if (i !== indexToRemove) {
              if (parsed[i]) nextFields[newIdx] = parsed[i].map((f) => ({ ...f, docIndex: newIdx }));
              newIdx++;
            }
          }
          localStorage.setItem(`bexsign_doc_${activeId}_fields_by_doc`, JSON.stringify(nextFields));
          localStorage.setItem(`bexsign_doc_${activeId}_fields`, JSON.stringify(Object.values(nextFields).flat()));
        }
      } catch (e) {}
    }
    if (activeDocIndex >= updated.length) {
      setActiveDocIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleDuplicateDoc = (idx) => {
    const source = documentsList[idx];
    if (!source) return;
    if (documentsList.length >= MAX_DOCUMENTS) {
      showPopupAlert(`A request can contain at most ${MAX_DOCUMENTS} documents.`, { title: 'Document limit', type: 'warning' });
      return;
    }
    const baseName = source.name.replace(/\.pdf$/i, '');
    const duplicatedId = Date.now() + Math.floor(Math.random() * 1000);
    const duplicated = {
      ...source,
      id: duplicatedId,
      fileId: null,
      name: `${baseName} (Copy).pdf`,
      file: source.file || null,
      uploadKey: source.file ? newUploadKey(duplicatedId) : null,
      filePath: source.filePath || null
    };
    const nextList = [...documentsList.slice(0, idx + 1), duplicated, ...documentsList.slice(idx + 1)];
    setDocumentsList(nextList);
    setActiveDocIndex(idx + 1);
    // Documents after the copy move one position: their cached fields move with them (the copy starts without fields)
    const activeId = draftIdRef.current || id || currentCreatedId;
    if (activeId) {
      try {
        const savedFields = localStorage.getItem(`bexsign_doc_${activeId}_fields_by_doc`);
        if (savedFields) {
          const parsed = JSON.parse(savedFields) || {};
          const shifted = {};
          Object.entries(parsed).forEach(([key, list]) => {
            const docIdx = parseInt(key, 10) || 0;
            const target = docIdx > idx ? docIdx + 1 : docIdx;
            shifted[target] = (list || []).map((f) => ({ ...f, docIndex: target }));
          });
          localStorage.setItem(`bexsign_doc_${activeId}_fields_by_doc`, JSON.stringify(shifted));
          localStorage.setItem(`bexsign_doc_${activeId}_fields`, JSON.stringify(Object.values(shifted).flat()));
        }
      } catch (e) {}
    }
    showPopupAlert(`Duplicated "${source.name}" as "${duplicated.name}".`, { title: 'Document Duplicated', type: 'info' });
  };

  const handleReplaceFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || targetReplaceDocIndex === null) return;
    if (file.size > MAX_FILE_SIZE) {
      showPopupAlert(`${file.name} is larger than 25 MB and cannot be used.`, { title: 'File too large', type: 'warning' });
      e.target.value = '';
      return;
    }
    let text = '';
    if (file.name.endsWith('.txt') || file.name.endsWith('.md') || file.type.startsWith('text/')) {
      try {
        text = await file.text();
      } catch (err) {
        text = getDefaultDocContent(file.name);
      }
    } else {
      text = getDefaultDocContent(file.name);
    }
    const cleanName = file.name.endsWith('.pdf') ? file.name : `${file.name.replace(/\.[^/.]+$/, '')}.pdf`;
    setDocumentsList((prev) => {
      const copy = [...prev];
      if (copy[targetReplaceDocIndex]) {
        copy[targetReplaceDocIndex] = {
          ...copy[targetReplaceDocIndex],
          name: cleanName,
          file,
          uploadKey: newUploadKey(copy[targetReplaceDocIndex].id),
          fileSize: (file.size / 1024).toFixed(1) + ' KB',
          documentText: text || copy[targetReplaceDocIndex].documentText
        };
      }
      return copy;
    });
    showPopupAlert(`Replaced with file "${cleanName}".`, { title: 'File Replaced', type: 'success' });
    setTargetReplaceDocIndex(null);
    e.target.value = '';
  };

  // ---------------------------------------------------------------------------
  // Recipients
  // ---------------------------------------------------------------------------
  const blankRecipient = (overrides = {}) => ({
    id: Date.now() + Math.floor(Math.random() * 1000),
    email: '',
    name: '',
    role: 'Needs to sign',
    deliveryMode: 'Email',
    auth: 'Email OTP',
    passcode: '',
    privateNote: '',
    ...overrides
  });

  const handleAddMe = () => {
    const exists = recipients.some((r) => (r.email || '').trim().toLowerCase() === currentUser.email.toLowerCase());
    if (exists) {
      showPopupAlert('You are already added as a recipient.', { title: 'Notice', type: 'info' });
      return;
    }
    if (recipients.length >= MAX_RECIPIENTS) {
      showPopupAlert(`A request can have at most ${MAX_RECIPIENTS} recipients.`, { title: 'Recipient limit', type: 'warning' });
      return;
    }
    const emptyIndex = recipients.findIndex((r) => !(r.email || '').trim() && !(r.name || '').trim());
    if (emptyIndex !== -1) {
      setRecipients(recipients.map((r, idx) => (idx === emptyIndex ? { ...r, email: currentUser.email, name: currentUser.name } : r)));
      return;
    }
    setRecipients([...recipients, blankRecipient({ email: currentUser.email, name: currentUser.name, signingOrder: nextStep(recipients) })]);
  };

  const handleAddRecipient = () => {
    if (recipients.length >= MAX_RECIPIENTS) {
      showPopupAlert(`A request can have at most ${MAX_RECIPIENTS} recipients.`, { title: 'Recipient limit', type: 'warning' });
      return;
    }
    setRecipients([...recipients, blankRecipient({ signingOrder: nextStep(recipients) })]);
  };

  const handleRemoveRecipient = (index) => {
    if (recipients.length <= 1) {
      showPopupAlert('At least one recipient is required.', { title: 'Action Required', type: 'warning' });
      return;
    }
    setRecipients(normalizeRecipientSteps(recipients.filter((_, idx) => idx !== index)));
  };

  const updateRecipientField = (index, field, value) => {
    setRecipients((prev) => prev.map((r, idx) => (idx === index ? { ...r, [field]: value } : r)));
  };

  // Typing a step number: recipients with the same number receive the email at the same time
  const updateRecipientStep = (index, rawValue) => {
    const digits = String(rawValue).replace(/\D/g, '');
    const value = digits === '' ? '' : Math.min(Math.max(parseInt(digits, 10), 1), recipients.length);
    setRecipients((prev) => prev.map((r, idx) => (idx === index ? { ...r, signingOrder: value } : r)));
  };

  // Dragging or the arrow buttons put recipients in a strict one-by-one order
  const moveRecipient = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= recipients.length || fromIndex === toIndex) return;
    setRecipients((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy.map((r, idx) => ({ ...r, signingOrder: idx + 1 }));
    });
  };

  // Who is emailed first and who follows ("Send in order"), or everyone at once
  const signingPlan = (() => {
    const signers = recipients
      .map((r, idx) => ({ r, step: stepOf(r, idx) }))
      .filter(({ r }) => (r.email || '').trim() && SIGNING_ROLE_LABELS.includes(r.role || 'Needs to sign'));
    const steps = [];
    [...signers].sort((a, b) => a.step - b.step).forEach(({ r, step }) => {
      const label = (r.name || '').trim() || r.email.trim();
      const group = steps.find((s) => s.step === step);
      if (group) group.names.push(label);
      else steps.push({ step, names: [label] });
    });
    return { steps: steps.map((s, idx) => ({ ...s, position: idx + 1 })), names: signers.map(({ r }) => (r.name || '').trim() || r.email.trim()) };
  })();

  const handleRecipientDrop = (targetIndex) => {
    if (dragRecipientIndex !== null) moveRecipient(dragRecipientIndex, targetIndex);
    setDragRecipientIndex(null);
    setArmedDragIndex(null);
  };

  const handleBulkCsv = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let text = '';
    try {
      text = await file.text();
    } catch (err) {
      showPopupAlert('The CSV file could not be read.', { title: 'Bulk Import', type: 'error' });
      return;
    }

    const parsed = [];
    text.split(/\r?\n/).forEach((line) => {
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const emailIdx = cols.findIndex((c) => EMAIL_PATTERN.test(c));
      if (emailIdx === -1) return;
      const name = cols.find((c, i) => i !== emailIdx && c) || cols[emailIdx].split('@')[0];
      parsed.push({ email: cols[emailIdx], name });
    });

    const existing = new Set(recipients.map((r) => (r.email || '').trim().toLowerCase()).filter(Boolean));
    const fresh = parsed.filter((p) => {
      const key = p.email.toLowerCase();
      if (existing.has(key)) return false;
      existing.add(key);
      return true;
    });
    const kept = recipients.filter((r) => (r.email || '').trim() || (r.name || '').trim());
    const room = MAX_RECIPIENTS - kept.length;
    const toAdd = fresh.slice(0, Math.max(room, 0));
    setShowBulkModal(false);

    if (toAdd.length === 0) {
      showPopupAlert('No new valid recipients were found in the CSV file. Use one "Name,Email" row per recipient.', { title: 'Bulk Import', type: 'warning' });
      return;
    }
    const firstNewStep = nextStep(kept);
    setRecipients([...kept, ...toAdd.map((p, i) => blankRecipient({ id: Date.now() + i, email: p.email, name: p.name, signingOrder: firstNewStep + i }))]);
    showPopupAlert(
      `${toAdd.length} recipient${toAdd.length === 1 ? '' : 's'} imported from CSV.${fresh.length > toAdd.length ? ` The limit of ${MAX_RECIPIENTS} recipients was reached.` : ''}`,
      { title: 'Bulk Import', type: 'success' }
    );
  };

  const validateRecipients = (list) => {
    const namedWithoutEmail = list.find((r) => !(r.email || '').trim() && (r.name || '').trim());
    if (namedWithoutEmail) return `Enter the email address for ${namedWithoutEmail.name.trim()}.`;
    const valid = list.filter((r) => r.email && r.email.trim());
    if (valid.length === 0) return 'Please enter at least one recipient email address.';
    if (valid.length > MAX_RECIPIENTS) return `A request can have at most ${MAX_RECIPIENTS} recipients.`;
    const invalid = valid.find((r) => !EMAIL_PATTERN.test(r.email.trim()));
    if (invalid) return `"${invalid.email.trim()}" is not a valid email address.`;
    const seen = new Set();
    for (const r of valid) {
      const key = r.email.trim().toLowerCase();
      if (seen.has(key)) return `${r.email.trim()} is added more than once.`;
      seen.add(key);
    }
    if (!valid.some((r) => SIGNING_ROLE_LABELS.includes(r.role || 'Needs to sign'))) {
      return 'Add at least one recipient who needs to sign or approve the document.';
    }
    return null;
  };

  const openCustomizeModal = (index) => {
    setActiveCustomizeIndex(index);
  };

  const closeCustomizeModal = () => {
    setActiveCustomizeIndex(null);
  };

  // ---------------------------------------------------------------------------
  // Continue to the field editor (Step 2) / Save & close / Discard
  // ---------------------------------------------------------------------------
  const buildEditorDocuments = (docs) => docs.map((d, i) => ({
    id: d.fileId || d.id || i + 1,
    fileId: d.fileId || null,
    name: (d.name || `Document ${i + 1}.pdf`).trim(),
    pages: d.pages || 1,
    status: d.status || 'Ready',
    file_path: d.filePath || '/uploads/sample.pdf',
    filePath: d.filePath || null,
    file_name: (d.name || `Document ${i + 1}.pdf`).trim(),
    customMessage: d.customMessage || noteToAll || 'check the document for signature',
    documentText: d.documentText || getDefaultDocContent(d.name, d.customMessage || noteToAll)
  }));

  const buildEditorRecipients = (serverRecipients) => {
    if (Array.isArray(serverRecipients) && serverRecipients.length > 0) {
      return serverRecipients.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        role: r.role_label || toRoleLabel(r.role),
        deliveryMode: r.delivery_mode || 'Email',
        privateNote: r.private_note || '',
        status: r.status,
        signingOrder: r.signing_order_index
      }));
    }
    return cleanRecipientList(recipients).map((r, idx) => ({ ...r, id: idx + 1 }));
  };

  const openEditor = async (docIdx = activeDocIndex) => {
    setIsProcessing(true);
    try {
      const saved = await saveDraft();
      const docId = saved.documentId;
      const editorDocs = buildEditorDocuments(saved.documents);
      const editorRecipients = buildEditorRecipients(saved.recipients);

      localStorage.setItem(`bexsign_doc_${docId}_documents`, JSON.stringify(editorDocs));
      localStorage.setItem(`bexsign_doc_${docId}_recipients`, JSON.stringify(editorRecipients));
      const hasExistingFields = localStorage.getItem(`bexsign_doc_${docId}_fields_by_doc`) || localStorage.getItem(`bexsign_doc_${docId}_fields`);
      if (!hasExistingFields && !id) {
        localStorage.setItem(`bexsign_doc_${docId}_is_new`, 'true');
      } else {
        localStorage.removeItem(`bexsign_doc_${docId}_is_new`);
      }
      localStorage.removeItem('bexsign_draft_documents');
      localStorage.setItem(`bexsign_doc_${docId}_settings`, JSON.stringify({
        documentName: editorDocs[0]?.name,
        daysToComplete,
        noteToAll
      }));

      // Step 2: Document Field Editor with every document and recipient
      navigate(`/documents/${docId}/edit`, {
        state: { documents: editorDocs, recipients: editorRecipients, activeDocIndex: docIdx }
      });
    } catch (err) {
      showPopupAlert(err.message || 'The request could not be saved. Please make sure the server is running and try again.', {
        title: 'Save failed',
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Card Actions & Editor Transitions
  const handleOpenInEditor = (docIdx = activeDocIndex) => {
    setActiveCardMenuIndex(null);
    openEditor(docIdx);
  };

  const handleCreateInEditor = () => {
    if (documentsList.length >= MAX_DOCUMENTS) {
      showPopupAlert(`A request can contain at most ${MAX_DOCUMENTS} documents.`, { title: 'Document limit', type: 'warning' });
      return;
    }
    const nextNum = documentsList.length + 1;
    const docName = `Blank Agreement Document ${nextNum > 1 ? nextNum : ''}.pdf`.replace(' .pdf', '.pdf');
    const newDoc = {
      id: Date.now(),
      name: docName,
      pages: 1,
      status: 'Ready',
      file: null,
      documentText: getDefaultDocContent(docName),
      customMessage: noteToAll || 'check the document for signature'
    };
    const updated = [...documentsList, newDoc];
    setDocumentsList(updated);
    const newIdx = updated.length - 1;
    setActiveDocIndex(newIdx);
    latestRef.current = { ...latestRef.current, documentsList: updated };
    openEditor(newIdx);
  };

  // Submit / Continue workflow
  const handleContinue = async (e) => {
    e?.preventDefault?.();

    if (documentsList.length === 0 || !documentsList.some(d => d.name && d.name.trim())) {
      showPopupAlert('Please add at least one document to proceed.', {
        title: 'Document Required',
        type: 'warning'
      });
      return;
    }

    const recipientError = validateRecipients(recipients);
    if (recipientError) {
      showPopupAlert(recipientError, { title: 'Check recipients', type: 'warning' });
      return;
    }

    await openEditor(activeDocIndex);
  };

  const handleSaveAndClose = async () => {
    setIsProcessing(true);
    try {
      await saveDraft();
      showPopupAlert(
        isDraftRequest
          ? 'Your request has been saved as a draft. You can continue it any time from Sent documents > Draft.'
          : 'Your changes have been saved.',
        { title: isDraftRequest ? 'Draft saved' : 'Changes saved', type: 'success' }
      );
      navigate(isDraftRequest ? '/documents/sent/draft' : '/documents');
    } catch (err) {
      showPopupAlert(err.message || 'The draft could not be saved.', { title: 'Save failed', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiscardConfirmed = async () => {
    discardedRef.current = true;
    setShowDiscardModal(false);
    setIsProcessing(true);
    while (savePromiseRef.current) {
      try {
        await savePromiseRef.current;
      } catch (e) {}
    }
    const draftId = draftIdRef.current;
    if (draftId && latestRef.current.requestStatus === 'Draft') {
      try {
        await fetch(`${API_BASE}/documents/${draftId}?permanent=true`, { method: 'DELETE' });
      } catch (e) {}
      clearDraftCache(draftId);
    }
    localStorage.removeItem('bexsign_draft_documents');
    setIsProcessing(false);
    navigate('/documents');
  };

  // "Add document" menu: the only way documents are added to a request (besides dropping files)
  const addDocumentOptions = [
    { key: 'desktop', icon: HardDrive, title: 'Desktop', description: 'Upload files from this computer', onSelect: () => fileInputRef.current?.click() },
    { key: 'cloud', icon: Cloud, title: 'Cloud', description: 'Google Drive, Dropbox, OneDrive or Box', onSelect: () => setShowCloudModal(true) },
    { key: 'templates', icon: FileBox, title: 'Template(s)', description: 'Start from an agreement template', onSelect: () => setShowTemplateModal(true) },
    { key: 'mail-merge', icon: Layers, title: 'Mail merge template', description: 'Personalize one template for many recipients', onSelect: () => handleAddNewDoc('Customer Service Agreement.pdf') },
    { key: 'create', icon: FileEdit, title: 'Create', description: 'Write a new document in the editor', badge: 'Opens editor', onSelect: () => handleCreateInEditor() }
  ];

  const renderAddDocumentMenu = () => (
    <div
      className="relative inline-block"
      ref={dropdownRef}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setIsDropdownOpen(false);
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isDropdownOpen}
        onClick={() => setIsDropdownOpen((open) => !open)}
        className="bg-[#007355] hover:bg-[#005c44] text-white px-4 py-2 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
      >
        <Plus size={14} />
        <span>Add document</span>
        <ChevronDown size={14} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {isDropdownOpen && (
        <div
          role="menu"
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-2xl p-1.5 z-30 text-left"
        >
          <p className="px-3 pt-1.5 pb-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">Add from</p>
          {addDocumentOptions.map(({ key, icon: Icon, title, description, badge, onSelect }) => (
            <button
              key={key}
              type="button"
              role="menuitem"
              onClick={() => {
                setIsDropdownOpen(false);
                onSelect();
              }}
              className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none transition group cursor-pointer"
            >
              <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-white group-hover:text-[#007355] group-focus:bg-white group-focus:text-[#007355] flex items-center justify-center shrink-0 transition">
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2 text-xs font-bold text-slate-800">
                  {title}
                  {badge && <span className="text-[10px] font-bold text-[#007355] whitespace-nowrap">{badge} →</span>}
                </span>
                <span className="block text-[11px] text-slate-500 leading-snug mt-0.5">{description}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-20 text-slate-800 font-sans">
      {/* Hidden Native File Input (accepts multiple files) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Hidden File Input for Document Replacement */}
      <input
        ref={replaceFileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.md"
        onChange={handleReplaceFile}
        className="hidden"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-6 pb-12 space-y-8">
        {/* Page Title (Matching Screenshot 4 & Part 4 Page 2) */}
        <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {requestStatus && requestStatus !== 'Draft' ? 'Edit document details' : 'Send for signatures'}
          </h1>
          <DraftSaveIndicator saveState={saveState} isDraft={isDraftRequest} />
        </div>

        {/* ========================================================
            SECTION 1: ADD DOCUMENTS (Multi-Document Support)
        ======================================================== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Add documents</h2>
            <span className="text-xs font-semibold text-slate-500">
              {documentsList.length === 0
                ? 'No documents added'
                : `${documentsList.length} document${documentsList.length > 1 ? 's' : ''} added`}
            </span>
          </div>

          {documentsList.length === 0 ? (
            /* Empty request: the user chooses what to add (no default document) */
            <div
              onDragOver={handleDocumentsDragOver}
              onDragLeave={handleDocumentsDragLeave}
              onDrop={handleDocumentsDrop}
              className={`relative rounded-xl border-2 border-dashed px-6 py-12 sm:py-14 text-center transition ${
                isDraggingFiles ? 'border-[#007355] bg-emerald-50/70' : 'border-slate-300 bg-white hover:border-slate-400'
              }`}
            >
              <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-[#007355] flex items-center justify-center mb-4 shadow-2xs">
                <Upload size={26} />
              </div>
              <p className="text-sm font-bold text-slate-900">
                {isDraggingFiles ? 'Drop files to add them' : 'Add the documents you want to send'}
              </p>
              <p className="text-xs text-slate-500 mt-1 mb-5">
                Drag and drop files here, or choose where to add them from.
              </p>
              {renderAddDocumentMenu()}
              <p className="text-[11px] text-slate-400 mt-5">
                PDF, Word or image files · Up to 25 MB each · Up to {MAX_DOCUMENTS} documents
              </p>
            </div>
          ) : (
          <div className="flex flex-col sm:flex-row items-start gap-6 flex-wrap">
            {/* Render all attached document cards side by side */}
            {documentsList.map((docItem, idx) => {
              const isSelected = activeDocIndex === idx;
              return (
                <div
                  key={docItem.id || idx}
                  onClick={() => setActiveDocIndex(idx)}
                  className={`w-52 h-60 border rounded-lg bg-white p-3 shadow-xs flex flex-col justify-between shrink-0 relative group cursor-pointer transition ${
                    isSelected
                      ? 'border-2 border-[#007355] ring-2 ring-emerald-100 shadow-md'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                  title="Click to select and rename document"
                >
                  <div className="flex justify-between items-center text-slate-400 relative">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-[#007355]' : 'text-slate-500'}`}>
                      Document {idx + 1}
                    </span>
                    <div className="relative card-3dots-menu-container">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCardMenuIndex(activeCardMenuIndex === idx ? null : idx);
                        }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition cursor-pointer"
                        title="More actions"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {activeCardMenuIndex === idx && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-40 text-xs font-semibold text-slate-700 animate-in fade-in zoom-in-95"
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenInEditor(idx)}
                            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-800 hover:text-[#007355] transition cursor-pointer"
                          >
                            <Edit3 size={13} className="text-[#007355]" /> Open in Editor
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCardMenuIndex(null);
                              setActiveDocIndex(idx);
                              setIsCustomTextOpen(true);
                              setTimeout(() => {
                                document.getElementById('document-text-textarea')?.focus();
                              }, 100);
                            }}
                            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-800 hover:text-[#007355] transition cursor-pointer"
                          >
                            <FileText size={13} /> Customize text
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCardMenuIndex(null);
                              setActiveDocIndex(idx);
                              setTimeout(() => {
                                document.getElementById('document-name-input')?.focus();
                              }, 100);
                            }}
                            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-800 hover:text-[#007355] transition cursor-pointer"
                          >
                            <PenTool size={13} /> Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCardMenuIndex(null);
                              setTargetReplaceDocIndex(idx);
                              replaceFileInputRef.current?.click();
                            }}
                            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-800 hover:text-[#007355] transition cursor-pointer"
                          >
                            <RotateCw size={13} /> Replace file
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCardMenuIndex(null);
                              handleDuplicateDoc(idx);
                            }}
                            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-800 hover:text-[#007355] transition cursor-pointer"
                          >
                            <Copy size={13} /> Duplicate
                          </button>
                          <div className="border-t border-slate-100 my-1" />
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCardMenuIndex(null);
                              handleRemoveDoc(idx);
                            }}
                            className="w-full text-left px-3.5 py-1.5 hover:bg-red-50 flex items-center gap-2 text-red-600 transition cursor-pointer"
                          >
                            <Trash2 size={13} /> Remove document
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Miniature Page Content Preview */}
                  <div className="w-full h-36 bg-slate-50 border border-slate-200 rounded p-2.5 text-[9px] text-slate-600 overflow-hidden leading-snug select-none shadow-2xs relative">
                    <p className="font-bold text-slate-800 truncate mb-1">
                      {docItem.name || `Document ${idx + 1}`}
                    </p>
                    <p className="text-slate-500 text-[8px] line-clamp-4 leading-relaxed font-sans whitespace-pre-line">
                      {docItem.documentText || getDefaultDocContent(docItem.name, docItem.customMessage)}
                    </p>
                    <div className="absolute bottom-2 left-2 right-2 border-t border-slate-200 pt-1 flex justify-between text-[8px] text-slate-400 font-mono">
                      <span>{docItem.pages || 1} pages</span>
                      <span className="text-[#007355] font-bold">{docItem.status || 'Ready'}</span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <span
                      className="text-xs font-bold text-slate-800 truncate max-w-[140px]"
                      title={docItem.name}
                    >
                      {docItem.name || `Document ${idx + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveDoc(idx);
                      }}
                      className="text-slate-400 hover:text-red-500 p-0.5 rounded hover:bg-slate-100 transition"
                      title="Remove document"
                      aria-label={`Remove ${docItem.name || `document ${idx + 1}`}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Dropzone Box */}
            <div
              onDragOver={handleDocumentsDragOver}
              onDragLeave={handleDocumentsDragLeave}
              onDrop={handleDocumentsDrop}
              className={`w-full sm:w-60 h-60 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-6 text-center transition relative shrink-0 shadow-2xs ${
                isDraggingFiles ? 'border-[#007355] bg-emerald-50/70' : 'border-slate-300 bg-white hover:border-[#007355]'
              }`}
            >
              <div className={`mb-2 ${isDraggingFiles ? 'text-[#007355]' : 'text-slate-300'}`}>
                <FileText size={48} className="stroke-[1.2]" />
              </div>
              <p className="text-xs font-semibold text-slate-700">{isDraggingFiles ? 'Drop files to add them' : 'Drag files here'}</p>
              <span className="text-[11px] text-slate-400 my-1 font-medium">or</span>
              {renderAddDocumentMenu()}
            </div>

            {/* Document Details & Name Input Display */}
            <div className="flex-1 w-full min-w-[280px] space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Document name</span>
                  {documentsList.length > 1 && (
                    <span className="text-[11px] text-[#007355] font-bold">
                      Document {activeDocIndex + 1} of {documentsList.length}
                    </span>
                  )}
                </label>
                <input
                  id="document-name-input"
                  type="text"
                  placeholder="Enter document name"
                  value={documentsList[activeDocIndex]?.name || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDocumentsList((prev) => {
                      const copy = [...prev];
                      if (copy[activeDocIndex]) {
                        copy[activeDocIndex] = { ...copy[activeDocIndex], name: val };
                      }
                      const activeId = id || currentCreatedId;
                      if (activeId) {
                        localStorage.setItem(`bexsign_doc_${activeId}_documents`, JSON.stringify(copy));
                      }
                      return copy;
                    });
                  }}
                  className="w-full max-w-md p-2 text-xs border border-slate-300 rounded bg-white focus:border-[#007355] focus:ring-1 focus:ring-[#007355] outline-none transition font-semibold text-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Click on any document card to select and rename it.
                </p>
              </div>

              {/* Optional Document Text / Agreement Data Collapsible Section */}
              <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2 max-w-md shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-800">
                      Document text / agreement data
                    </span>
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                      Optional
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCustomTextOpen(!isCustomTextOpen)}
                    className="text-xs text-[#007355] hover:text-[#005c44] font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>{isCustomTextOpen ? 'Collapse' : 'Customize text'}</span>
                    <ChevronDown size={14} className={`transform transition-transform ${isCustomTextOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {!isCustomTextOpen ? (
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Standard document agreement content is applied by default. If you do not wish to edit or create custom clauses, you can leave this as-is and proceed.
                  </p>
                ) : (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <textarea
                      id="document-text-textarea"
                      rows={6}
                      value={documentsList[activeDocIndex]?.documentText || getDefaultDocContent(documentsList[activeDocIndex]?.name, documentsList[activeDocIndex]?.customMessage)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDocumentsList((prev) => {
                          const copy = [...prev];
                          if (copy[activeDocIndex]) {
                            copy[activeDocIndex] = { ...copy[activeDocIndex], documentText: val };
                          }
                          const activeId = id || currentCreatedId;
                          if (activeId) {
                            localStorage.setItem(`bexsign_doc_${activeId}_documents`, JSON.stringify(copy));
                          }
                          return copy;
                        });
                      }}
                      placeholder="Enter agreement terms, clauses, or text that will appear on this document..."
                      className="w-full p-2.5 text-[11px] border border-slate-300 rounded bg-white focus:border-[#007355] focus:ring-1 focus:ring-[#007355] outline-none transition font-sans text-slate-800 leading-relaxed resize-y"
                    />
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-semibold">Presets:</span>
                      {['employment', 'nda', 'service', 'standard'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setDocumentsList((prev) => {
                              const copy = [...prev];
                              if (copy[activeDocIndex]) {
                                copy[activeDocIndex] = { ...copy[activeDocIndex], documentText: DEFAULT_DOCUMENT_TEXTS[preset] };
                              }
                              const activeId = id || currentCreatedId;
                              if (activeId) {
                                localStorage.setItem(`bexsign_doc_${activeId}_documents`, JSON.stringify(copy));
                              }
                              return copy;
                            });
                          }}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition font-medium capitalize cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
        </div>

        {/* ========================================================
            SECTION 2: ADD RECIPIENTS (Matching Screenshot 4)
        ======================================================== */}
        <div className="space-y-4 pt-2">
          <h2 className="text-sm font-bold text-slate-900">Add recipients</h2>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none font-medium text-slate-700">
              <input
                type="checkbox"
                checked={sendInOrder}
                onChange={(e) => setSendInOrder(e.target.checked)}
                className="accent-[#007355] rounded h-3.5 w-3.5"
              />
              <span>Send in order</span>
            </label>

            <button
              type="button"
              onClick={handleAddMe}
              className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium transition shadow-2xs"
            >
              Add me
            </button>

            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium transition shadow-2xs"
            >
              Add bulk recipients
            </button>
          </div>

          {/* Recipient Rows (Matching Screenshot 4 Blue Left Accent Bar) */}
          <div className="space-y-2.5">
            {recipients.map((rec, index) => (
              <div
                key={rec.id}
                draggable={armedDragIndex === index}
                onDragStart={(e) => {
                  setDragRecipientIndex(index);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  if (dragRecipientIndex !== null) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleRecipientDrop(index);
                }}
                onDragEnd={() => {
                  setDragRecipientIndex(null);
                  setArmedDragIndex(null);
                }}
                className={`bg-white border border-slate-200 border-l-4 border-l-blue-500 rounded p-2 sm:p-2.5 flex flex-col md:flex-row items-stretch md:items-center gap-2 shadow-2xs transition ${dragRecipientIndex === index ? 'opacity-50' : ''}`}
              >
                {/* Grip Handle & Order Index */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    onMouseDown={() => setArmedDragIndex(index)}
                    onMouseUp={() => setArmedDragIndex(null)}
                    className="hidden md:inline-flex cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-slate-100"
                    title="Drag to change the signing order"
                  >
                    <GripVertical size={16} className="text-slate-400" />
                  </span>
                  <span className="flex md:hidden flex-col">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveRecipient(index, index - 1)}
                      className="text-slate-500 disabled:opacity-30"
                      aria-label="Move recipient up"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={index === recipients.length - 1}
                      onClick={() => moveRecipient(index, index + 1)}
                      className="text-slate-500 disabled:opacity-30"
                      aria-label="Move recipient down"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </span>
                  {sendInOrder && (
                    <input
                      type="text"
                      inputMode="numeric"
                      value={rec.signingOrder ?? index + 1}
                      onChange={(e) => updateRecipientStep(index, e.target.value)}
                      onBlur={() => setRecipients((prev) => normalizeRecipientSteps(prev))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                      }}
                      aria-label={`Signing order for ${rec.email || `recipient ${index + 1}`}`}
                      title="Signing order. Give recipients the same number to email them at the same time."
                      className="w-8 h-7 text-center text-xs font-bold text-slate-700 border border-slate-300 rounded bg-slate-50 hover:border-slate-400 focus:bg-white focus:border-[#007355] focus:ring-1 focus:ring-[#007355] outline-none transition"
                    />
                  )}
                </div>

                {/* Email & Name Inline Inputs */}
                <div className="flex-1 flex flex-col sm:flex-row items-stretch">
                  <input
                    type="email"
                    placeholder="Email"
                    value={rec.email}
                    onChange={(e) => updateRecipientField(index, 'email', e.target.value)}
                    aria-invalid={Boolean(recipientIssues[index])}
                    title={recipientIssues[index] || ''}
                    className={`flex-1 min-w-0 p-2 text-xs border sm:rounded-l sm:rounded-r-none rounded outline-none focus:border-[#007355] focus:ring-1 focus:ring-[#007355] transition ${recipientIssues[index] ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                  />
                  <input
                    type="text"
                    placeholder="Name"
                    value={rec.name}
                    onChange={(e) => updateRecipientField(index, 'name', e.target.value)}
                    className="flex-1 p-2 text-xs border border-slate-300 sm:border-l-0 sm:rounded-r sm:rounded-l-none rounded outline-none focus:border-[#007355] focus:ring-1 focus:ring-[#007355] transition mt-1 sm:mt-0"
                  />
                </div>

                {/* Action Dropdown */}
                <div className="shrink-0">
                  <select
                    value={rec.role}
                    onChange={(e) => updateRecipientField(index, 'role', e.target.value)}
                    className="w-full md:w-auto p-2 text-xs border border-slate-300 rounded bg-white text-slate-700 outline-none focus:border-[#007355] font-medium"
                  >
                    <option value="Needs to sign">Needs to sign</option>
                    <option value="Receives a copy">Receives a copy</option>
                    <option value="In-person signer">In-person signer</option>
                    <option value="Approver">Approver</option>
                  </select>
                </div>

                {/* Delivery Mode Dropdown */}
                <div className="shrink-0">
                  <select
                    value={rec.deliveryMode}
                    onChange={(e) => updateRecipientField(index, 'deliveryMode', e.target.value)}
                    className="w-full md:w-auto p-2 text-xs border border-slate-300 rounded bg-white text-slate-700 outline-none focus:border-[#007355] font-medium"
                  >
                    <option value="Email">Email</option>
                    <option value="Email + SMS">Email + SMS</option>
                    <option value="SMS">SMS</option>
                  </select>
                </div>

                {/* Customize Button */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openCustomizeModal(index)}
                    className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 bg-white transition shadow-2xs"
                  >
                    <SlidersHorizontal size={13} className="text-slate-500" />
                    <span>Customize</span>
                  </button>

                  {recipients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(index)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 transition"
                      title="Remove recipient"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* + Add Recipient Button */}
          <button
            type="button"
            onClick={handleAddRecipient}
            disabled={recipients.length >= MAX_RECIPIENTS}
            className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 bg-white flex items-center gap-1.5 transition shadow-2xs mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            <span>Add recipient</span>
          </button>

          {/* Email delivery plan: in order (steps) or everyone at once */}
          {signingPlan.steps.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-3 shadow-2xs space-y-1.5" aria-live="polite">
              <div className="flex items-start gap-2 text-xs text-slate-600">
                <Mail size={14} className="text-[#007355] mt-0.5 shrink-0" />
                {sendInOrder ? (
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5 min-w-0">
                    <span className="font-semibold text-slate-800">Emails go out in order:</span>
                    {signingPlan.steps.map((s, i) => (
                      <React.Fragment key={s.step}>
                        {i > 0 && <ChevronRight size={12} className="text-slate-400 shrink-0" />}
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 pl-1 pr-2 py-0.5 max-w-full">
                          <span className="w-4 h-4 rounded-full bg-[#007355] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {s.position}
                          </span>
                          <span className="truncate font-medium text-slate-700">{s.names.join(', ')}</span>
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  <p className="min-w-0">
                    <span className="font-semibold text-slate-800">All at once:</span>{' '}
                    {signingPlan.names.join(', ')} receive the email at the same time.
                  </p>
                )}
              </div>
              {sendInOrder && (
                <p className="text-[11px] text-slate-400 pl-6">
                  Drag recipients or change their number to set the order. Give recipients the same number to email them at the same time.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ========================================================
            SECTION 3: MORE SETTINGS (Collapsible Accordion)
        ======================================================== */}
        <div className="pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setMoreSettingsOpen(!moreSettingsOpen)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-slate-900 select-none py-1"
          >
            <span>More settings</span>
            {moreSettingsOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>

          {moreSettingsOpen && (
            <div className="mt-4 space-y-4 text-xs text-slate-700">
              {/* Days to complete */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <label className="w-44 font-medium text-slate-600">Days to complete</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={daysToComplete}
                  onChange={(e) => setDaysToComplete(e.target.value)}
                  className="w-full sm:w-72 p-2 border border-slate-300 rounded bg-white outline-none focus:border-[#007355] text-xs"
                />
              </div>

              {/* Agreement valid until */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <label className="w-44 font-medium text-slate-600">Agreement valid until</label>
                <select
                  value={agreementValidUntil}
                  onChange={(e) => setAgreementValidUntil(e.target.value)}
                  className="w-full sm:w-72 p-2 border border-slate-300 rounded bg-white outline-none focus:border-[#007355] text-xs font-medium"
                >
                  <option value="Forever">Forever</option>
                  <option value="30 days">30 days</option>
                  <option value="60 days">60 days</option>
                  <option value="90 days">90 days</option>
                  <option value="Custom date">Custom date</option>
                </select>
              </div>

              {/* Document type */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <label className="w-44 font-medium text-slate-600">Document type</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full sm:w-72 p-2 border border-slate-300 rounded bg-white outline-none focus:border-[#007355] text-xs font-medium"
                >
                  <option value="Others">Others</option>
                  <option value="Contract">Contract</option>
                  <option value="Agreement">Agreement</option>
                  <option value="NDA">NDA</option>
                  <option value="Offer Letter">Offer Letter</option>
                  <option value="Invoice">Invoice</option>
                </select>
              </div>

              {/* Folder */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <label className="w-44 font-medium text-slate-600">Folder</label>
                <select
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  className="w-full sm:w-72 p-2 border border-slate-300 rounded bg-white outline-none focus:border-[#007355] text-xs font-medium"
                >
                  <option value="None">None</option>
                  <option value="General">General</option>
                  <option value="HR Agreements">HR Agreements</option>
                  <option value="Financial">Financial</option>
                  <option value="Legal">Legal</option>
                </select>
              </div>

              {/* Description */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6">
                <label className="w-44 font-medium text-slate-600 pt-1">Description</label>
                <textarea
                  placeholder="Add description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full sm:w-72 p-2 border border-slate-300 rounded bg-white outline-none focus:border-[#007355] text-xs resize-none"
                />
              </div>

              {/* Checkboxes: Allow comments & Automatic reminders */}
              <div className="pt-2 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={allowComments}
                    onChange={(e) => setAllowComments(e.target.checked)}
                    className="accent-[#007355] rounded h-3.5 w-3.5"
                  />
                  <span>Allow recipient comments</span>
                </label>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={autoReminders}
                      onChange={(e) => setAutoReminders(e.target.checked)}
                      className="accent-[#007355] rounded h-3.5 w-3.5"
                    />
                    <span>Automatic reminders</span>
                  </label>
                  <p className="text-[11px] text-slate-400 pl-5.5 mt-0.5 leading-tight">
                    Automatic reminders will only be delivered via email even if the delivery mode is set to 'Email + SMS'.
                  </p>

                  {autoReminders && (
                    <div className="pl-5.5 mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                      <span>Send a reminder every</span>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={reminderEveryDays}
                        onChange={(e) => setReminderEveryDays(e.target.value)}
                        className="w-14 p-1 border border-slate-300 rounded text-center text-xs font-bold"
                      />
                      <span>day(s)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Note to all recipients */}
              <div className="pt-3 space-y-1.5">
                <label className="block font-medium text-slate-700">Note to all recipients</label>
                <textarea
                  placeholder="Add note for all recipients..."
                  value={noteToAll}
                  onChange={(e) => setNoteToAll(e.target.value)}
                  rows={4}
                  className="w-full max-w-lg p-3 border border-slate-300 rounded bg-white outline-none focus:border-[#007355] text-xs resize-none shadow-2xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            SECTION 4: BOTTOM ACTION BAR (Matching Screenshot 4)
        ======================================================== */}
        <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleContinue}
            disabled={isProcessing}
            className="bg-[#007355] hover:bg-[#005c44] disabled:opacity-60 text-white px-7 py-2 rounded text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            {isProcessing && <Loader2 size={13} className="animate-spin" />}
            Continue
          </button>
          <button
            type="button"
            onClick={handleSaveAndClose}
            disabled={isProcessing}
            className="bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-60 text-slate-700 px-6 py-2 rounded text-xs font-bold transition shadow-2xs"
          >
            Save & close
          </button>
          <button
            type="button"
            onClick={() => (isDraftRequest ? setShowDiscardModal(true) : navigate('/documents'))}
            disabled={isProcessing}
            className="sm:ml-auto text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 disabled:opacity-60 px-4 py-2 rounded text-xs font-bold transition"
          >
            {isDraftRequest ? 'Discard' : 'Cancel'}
          </button>
        </div>
      </div>

      {/* Floating Chat / Help Bubble (Matching Screenshot 4 bottom right) */}
      <button
        type="button"
        onClick={() => showPopupAlert('BexSign Support & Assistance is available 24/7.', { title: 'BexSign Help', type: 'info' })}
        className="fixed bottom-6 right-6 w-11 h-11 bg-[#007355] hover:bg-[#005c44] text-white rounded-full flex items-center justify-center shadow-lg transition"
        title="Help & Feedback"
      >
        <MessageSquare size={18} />
      </button>

      {/* ========================================================
          MODAL: DISCARD DRAFT CONFIRMATION
      ======================================================== */}
      {showDiscardModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4" role="dialog" aria-modal="true">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Discard this request?</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  The documents, recipients and fields added to this draft will be deleted. To finish it later, choose Save & close instead.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDiscardModal(false)}
                className="px-4 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={handleDiscardConfirmed}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CUSTOMIZE RECIPIENT
      ======================================================== */}
      {activeCustomizeIndex !== null && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-[#007355]" />
                Customize Recipient #{activeCustomizeIndex + 1}
              </h3>
              <button onClick={closeCustomizeModal} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Authentication Type</label>
                <select
                  value={recipients[activeCustomizeIndex].auth || 'Email OTP'}
                  onChange={(e) => updateRecipientField(activeCustomizeIndex, 'auth', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded bg-white text-xs"
                >
                  <option value="Email OTP">Email OTP</option>
                  <option value="SMS OTP">SMS OTP</option>
                  <option value="Offline Passcode">Offline Passcode</option>
                  <option value="None">None</option>
                </select>
              </div>

              {recipients[activeCustomizeIndex].auth === 'Offline Passcode' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Access Passcode</label>
                  <input
                    type="password"
                    placeholder="Enter recipient access passcode"
                    value={recipients[activeCustomizeIndex].passcode || ''}
                    onChange={(e) => updateRecipientField(activeCustomizeIndex, 'passcode', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Private Note for this Signer</label>
                <textarea
                  placeholder="Private instructions visible only to this recipient..."
                  value={recipients[activeCustomizeIndex].privateNote || ''}
                  onChange={(e) => updateRecipientField(activeCustomizeIndex, 'privateNote', e.target.value)}
                  rows={3}
                  className="w-full p-2 border border-slate-300 rounded text-xs resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={closeCustomizeModal}
                className="bg-[#007355] text-white px-5 py-1.5 rounded text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CLOUD STORAGE SELECTOR
      ======================================================== */}
      {showCloudModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Cloud size={18} className="text-[#007355]" />
                Select from Cloud Storage
              </h3>
              <button onClick={() => setShowCloudModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 py-2">
              {[
                { name: 'Google Drive', color: 'text-amber-600' },
                { name: 'Dropbox', color: 'text-blue-600' },
                { name: 'OneDrive', color: 'text-sky-600' },
                { name: 'Box', color: 'text-indigo-600' }
              ].map((provider) => (
                <button
                  key={provider.name}
                  type="button"
                  onClick={() => {
                    handleAddNewDoc(`${provider.name} Agreement 2026.pdf`);
                    setShowCloudModal(false);
                    showPopupAlert(`Document loaded from ${provider.name}.`, { title: 'Cloud Import', type: 'success' });
                  }}
                  className="p-3 border border-slate-200 rounded-lg text-center hover:bg-slate-50 transition flex flex-col items-center gap-1.5"
                >
                  <Cloud size={24} className={provider.color} />
                  <span className="text-xs font-bold text-slate-700">{provider.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: TEMPLATES PICKER
      ======================================================== */}
      {showTemplateModal && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setShowTemplateModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-picker-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-3 border-b pb-3">
              <div>
                <h3 id="template-picker-title" className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileBox size={18} className="text-[#007355]" />
                  Select a template
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">The template is added to this request as a new document.</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowTemplateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {[
                savedTemplates.items.length > 0 && {
                  heading: 'Your templates',
                  items: savedTemplates.items.map((t) => ({
                    key: `saved-${t.id}`,
                    name: t.title || 'Untitled template',
                    description: t.description || 'Saved template',
                    onSelect: () => handleAddTemplateDocument(t.title || 'Untitled template', { filePath: t.file_path || null })
                  }))
                },
                {
                  heading: 'Agreement templates',
                  items: BUILT_IN_TEMPLATES.map((t) => ({
                    key: t.name,
                    name: t.name.replace(/\.pdf$/i, ''),
                    description: t.description,
                    onSelect: () => handleAddTemplateDocument(t.name)
                  }))
                }
              ].filter(Boolean).map((group) => (
                <section key={group.heading}>
                  <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">{group.heading}</h4>
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={item.onSelect}
                        className="w-full p-3 border border-slate-200 hover:border-[#007355] rounded-lg hover:bg-emerald-50/40 transition flex items-center gap-3 text-left group cursor-pointer"
                      >
                        <span className="w-9 h-9 rounded-lg bg-emerald-50 text-[#007355] flex items-center justify-center shrink-0">
                          <FileText size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-bold text-slate-800 truncate">{item.name}</span>
                          <span className="block text-[11px] text-slate-500 truncate">{item.description}</span>
                        </span>
                        <ChevronRight size={14} className="text-slate-400 group-hover:text-[#007355] shrink-0" />
                      </button>
                    ))}
                  </div>
                </section>
              ))}
              {savedTemplates.status === 'loading' && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" /> Loading your templates...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: BULK RECIPIENTS
      ======================================================== */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Layers size={18} className="text-[#007355]" />
                Add Bulk Recipients
              </h3>
              <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <p>Upload a CSV file containing recipient names and emails (e.g. `Name,Email`).</p>
              <label className="border-2 border-dashed border-slate-300 rounded-lg p-6 block text-center cursor-pointer hover:border-[#007355]">
                <Upload size={24} className="mx-auto text-slate-400 mb-1" />
                <span className="font-bold text-slate-700">Click to upload CSV</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkCsv}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
