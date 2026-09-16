import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  PenTool,
  Calendar,
  User,
  Mail,
  FileText,
  Hash,
  CheckSquare,
  Building,
  Briefcase,
  MapPin,
  Phone,
  Save,
  ArrowRight,
  Settings,
  X,
  CheckCircle2,
  ListFilter,
  Grid,
  Image as ImageIcon,
  RotateCw,
  Plus,
  Sliders,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Undo,
  Redo,
  Table,
  Type,
  Highlighter,
  Minus,
  Eye,
  Minimize2,
  Sparkles,
  Upload,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ArrowLeft,
  Search,
  Clock,
  Underline,
  Strikethrough,
  Check,
  RotateCcw,
  FileCheck,
  Copy,
  Layers,
  MoreVertical,
  Move,
  Edit3,
  Subscript,
  Superscript,
  Eraser,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { showPopupAlert } from '../components/GlobalAlertModal';
import { getDefaultDocContent, DEFAULT_DOCUMENT_TEXTS } from '../utils/documentDefaults';
import { generateAndDownloadPdf } from '../utils/pdfGenerator';

export default function DocumentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef(null);
  const stampFileInputRef = useRef(null);
  const docTextContentRef = useRef(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showSendMenu, setShowSendMenu] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const zoomScale = zoomLevel / 100 || 1;
  const [activePage, setActivePage] = useState(1);

  // Multi-Document State (Pages 4 & 5)
  const [documentsList, setDocumentsList] = useState(() => {
    if (location.state?.documents && Array.isArray(location.state.documents) && location.state.documents.length > 0) {
      return location.state.documents.map((d, i) => ({
        ...d,
        id: d.id || i + 1,
        documentText: d.documentText || getDefaultDocContent(d.name, d.customMessage)
      }));
    }
    const saved = id ? localStorage.getItem(`bexsign_doc_${id}_documents`) : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((d, i) => ({
            ...d,
            id: d.id || i + 1,
            documentText: d.documentText || getDefaultDocContent(d.name, d.customMessage)
          }));
        }
      } catch (e) {}
    }
    // No default document: the request's documents come from the server (or are added by the user)
    return [];
  });
  const [activeDocIndex, setActiveDocIndex] = useState(() => {
    if (location.state?.activeDocIndex !== undefined && typeof location.state.activeDocIndex === 'number') {
      return location.state.activeDocIndex;
    }
    return 0;
  });
  const [showDocSwitcherMenu, setShowDocSwitcherMenu] = useState(false);

  const currentDocument = documentsList[activeDocIndex] || documentsList[0] || { name: '' };
  const documentTitle = currentDocument.name || '';
  const hasDocuments = documentsList.length > 0;

  const setDocumentTitle = (newName) => {
    setDocumentsList((prev) => {
      const copy = [...prev];
      if (copy[activeDocIndex]) {
        copy[activeDocIndex] = { ...copy[activeDocIndex], name: newName };
      }
      if (id) localStorage.setItem(`bexsign_doc_${id}_documents`, JSON.stringify(copy));
      return copy;
    });
  };

  const handleAddNewDocFromEditor = (title = '') => {
    const nextNum = documentsList.length + 1;
    const docTitle = title || `Document ${nextNum}.pdf`;
    const newDoc = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      name: docTitle,
      pages: 1,
      status: 'Ready',
      documentText: getDefaultDocContent(docTitle),
      customMessage: 'check the document for signature'
    };
    const updated = [...documentsList, newDoc];
    setDocumentsList(updated);
    if (id) localStorage.setItem(`bexsign_doc_${id}_documents`, JSON.stringify(updated));
    switchToDocument(updated.length - 1);
  };

  const handleRemoveDocFromEditor = (indexToRemove) => {
    if (documentsList.length <= 1) {
      showPopupAlert('At least one document is required in the envelope.', { title: 'Required', type: 'warning' });
      return;
    }
    const updated = documentsList.filter((_, idx) => idx !== indexToRemove);
    setDocumentsList(updated);
    if (id) localStorage.setItem(`bexsign_doc_${id}_documents`, JSON.stringify(updated));

    // Added pages follow their documents too
    setExtraPagesByDoc((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, count]) => {
        const idx = parseInt(key, 10);
        if (idx < indexToRemove) next[idx] = count;
        else if (idx > indexToRemove) next[idx - 1] = count;
      });
      if (id) localStorage.setItem(`bexsign_doc_${id}_extra_pages`, JSON.stringify(next));
      return next;
    });

    // Shift fieldsByDoc keys so fields remain attached to the correct documents
    setFieldsByDoc((prev) => {
      const nextByDoc = {};
      let newIdx = 0;
      for (let i = 0; i < documentsList.length; i++) {
        if (i !== indexToRemove) {
          if (prev[i]) nextByDoc[newIdx] = prev[i].map((f) => ({ ...f, docIndex: newIdx }));
          newIdx++;
        }
      }
      if (id) {
        localStorage.setItem(`bexsign_doc_${id}_fields_by_doc`, JSON.stringify(nextByDoc));
        const flatList = Object.values(nextByDoc).flat();
        localStorage.setItem(`bexsign_doc_${id}_fields`, JSON.stringify(flatList));
      }
      return nextByDoc;
    });

    // Stay on the same document when an earlier one is removed
    if (indexToRemove === activeDocIndex) {
      switchToDocument(Math.min(indexToRemove, updated.length - 1));
    } else if (indexToRemove < activeDocIndex) {
      setActiveFieldId(null);
      setActiveDocIndex(activeDocIndex - 1);
    }
  };

  const [recipientEmail, setRecipientEmail] = useState('manu.yadav@oladigital.health');
  const [statusMsg, setStatusMsg] = useState('');

  // Right Sidebar Tab (PDF 1 p.5, PDF 3 p.3-4): 'standard' vs 'custom'
  const [editorTab, setEditorTab] = useState('standard');
  const [customFieldSearch, setCustomFieldSearch] = useState('');
  const [customFieldsList, setCustomFieldsList] = useState([
    { id: 1, name: 'My custom field', type: 'Text', charLimit: 2048, label: 'Text-mtjshx1a', font: 'Roboto' },
    { id: 2, name: 'Department Code', type: 'Text', charLimit: 100, label: 'Dept-Code', font: 'Roboto' }
  ]);

  // Comprehensive Create Custom Field Modal state (PDF 3 p.7)
  const [customFieldName, setCustomFieldName] = useState('');
  const [customFieldType, setCustomFieldType] = useState('Text');
  const [customFieldRequired, setCustomFieldRequired] = useState(true);
  const [customFieldReadOnly, setCustomFieldReadOnly] = useState(false);
  const [customFieldFixedWidth, setCustomFieldFixedWidth] = useState(false);
  const [customFieldFixedHeight, setCustomFieldFixedHeight] = useState(true);
  const [customFieldDefaultVal, setCustomFieldDefaultVal] = useState('');
  const [customFieldInternalName, setCustomFieldInternalName] = useState('');
  const [customFieldCharLimit, setCustomFieldCharLimit] = useState(2048);
  const [customFieldDataLabel, setCustomFieldDataLabel] = useState('Text-mtjshx1a');
  const [customFieldValidation, setCustomFieldValidation] = useState('None');
  const [customFieldFont, setCustomFieldFont] = useState('Roboto');
  const [customFieldFontSize, setCustomFieldFontSize] = useState('11');
  const [customFieldBold, setCustomFieldBold] = useState(false);
  const [customFieldItalic, setCustomFieldItalic] = useState(false);
  const [customFieldStrike, setCustomFieldStrike] = useState(false);
  const [customFieldDesc, setCustomFieldDesc] = useState('');

  // Actions & Schedule Modals (PDF 3 p.4-6)
  const [showFieldTemplateModal, setShowFieldTemplateModal] = useState(false);
  const [selectedFieldTemplate, setSelectedFieldTemplate] = useState('');
  const [showEditDocModal, setShowEditDocModal] = useState(false);
  const [isEditingDocRichText, setIsEditingDocRichText] = useState(false);
  const [docContentText, setDocContentText] = useState('check the document for signature');
  const [showDocCardMenu, setShowDocCardMenu] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('2026-09-02T14:49');
  const [scheduleTimeZone, setScheduleTimeZone] = useState('Asia/Kolkata');

  // Full-View Microsoft Word-Style Document Editor State
  const [wordFontFamily, setWordFontFamily] = useState('Verdana');
  const [wordFontSize, setWordFontSize] = useState('14');
  const [wordFontSizeInput, setWordFontSizeInput] = useState('14');
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const [wordIsBold, setWordIsBold] = useState(false);
  const [wordIsItalic, setWordIsItalic] = useState(false);
  const [wordIsUnderline, setWordIsUnderline] = useState(false);
  const [wordIsStrike, setWordIsStrike] = useState(false);
  const [wordIsSubscript, setWordIsSubscript] = useState(false);
  const [wordIsSuperscript, setWordIsSuperscript] = useState(false);
  const [wordIsBulletedList, setWordIsBulletedList] = useState(false);
  const [wordIsNumberedList, setWordIsNumberedList] = useState(false);
  const [wordTextColor, setWordTextColor] = useState('#0f172a');
  const [wordHighlightColor, setWordHighlightColor] = useState('transparent');
  const [customHexTextColor, setCustomHexTextColor] = useState('#0f172a');
  const [customHexBgColor, setCustomHexBgColor] = useState('#fef08a');
  const [wordTextAlign, setWordTextAlign] = useState('left');
  const [wordLineHeight, setWordLineHeight] = useState('1.6');
  const [wordEditorZoom, setWordEditorZoom] = useState(100);
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(true);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showClausesMenu, setShowClausesMenu] = useState(false);
  const [showStylesMenu, setShowStylesMenu] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showLineSpacingMenu, setShowLineSpacingMenu] = useState(false);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [wordHistory, setWordHistory] = useState([]);
  const [wordHistoryIndex, setWordHistoryIndex] = useState(-1);
  const wordEditorRef = useRef(null);
  const savedSelectionRef = useRef(null);

  const WORDPAD_TEXT_COLORS = [
    '#000000', '#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1',
    '#7f1d1d', '#991b1b', '#b91c1c', '#dc2626', '#ef4444', '#f87171', '#fca5a5',
    '#7c2d12', '#9a3412', '#c2410c', '#ea580c', '#f97316', '#fb923c', '#fdba74',
    '#713f12', '#854d0e', '#a16207', '#ca8a04', '#d97706', '#eab308', '#facc15',
    '#14532d', '#166534', '#15803d', '#16a34a', '#22c55e', '#4ade80', '#86efac',
    '#064e3b', '#065f46', '#047857', '#007355', '#059669', '#10b981', '#34d399',
    '#134e4a', '#115e59', '#0f766e', '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4',
    '#1e3a8a', '#1e40af', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd',
    '#312e81', '#3730a3', '#4338ca', '#4f46e5', '#6366f1', '#818cf8', '#a5b4fc',
    '#4c1d95', '#581c87', '#6b21a8', '#7c3aed', '#8b5cf6', '#a855f7', '#c084fc',
    '#701a75', '#86198f', '#a21caf', '#c026d3', '#d946ef', '#e879f9', '#f0abfc',
    '#831843', '#9d174d', '#be185d', '#db2777', '#ec4899', '#f472b6', '#fbcfe8'
  ];

  const WORDPAD_HIGHLIGHT_COLORS = [
    '#fef08a', '#bbf7d0', '#a5f3fc', '#fbcfe8', '#fed7aa',
    '#ddd6fe', '#fed7d7', '#c6f6d5', '#e9d8fd', '#feebc8',
    '#fef9c3', '#dcfce7', '#e0f2fe', '#fce7f3', '#ffedd5',
    '#fae8ff', '#ffe4e6', '#ecfdf5', '#f0f9ff', '#fff1f2'
  ];

  // Helper to convert plain text with newlines to clean HTML paragraphs
  const convertPlainTextToHtml = (text) => {
    if (!text) return '<p><br></p>';
    if (/<[a-z][\s\S]*>/i.test(text)) {
      return text;
    }
    return text
      .split(/\n\n+/)
      .map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return '';
        const escaped = trimmed
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        const isHeading =
          /^[0-9]+\.\s+[A-Z\s]+/.test(trimmed) ||
          (/^[A-Z\s]{5,}$/.test(trimmed) && trimmed.length < 70);
        if (isHeading) {
          return `<p style="margin-bottom: 12px;"><strong>${escaped.replace(/\n/g, '<br>')}</strong></p>`;
        }
        return `<p style="margin-bottom: 12px; line-height: 1.6;">${escaped.replace(/\n/g, '<br>')}</p>`;
      })
      .filter(Boolean)
      .join('');
  };

  // Sync contentEditable innerHTML with React state
  const syncEditorContent = () => {
    if (wordEditorRef.current) {
      const html = wordEditorRef.current.innerHTML;
      setDocContentText(html);
    }
  };

  // Keep selection when clicking toolbar buttons
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && wordEditorRef.current && wordEditorRef.current.contains(sel.anchorNode)) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (savedSelectionRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRef.current);
      }
    }
  };

  // Continuously track active selection within the document editor
  useEffect(() => {
    const handleGlobalSelectionChange = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && wordEditorRef.current) {
        const node = sel.anchorNode;
        if (node && wordEditorRef.current.contains(node)) {
          savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
          updateActiveFormatting();
        }
      }
    };
    document.addEventListener('selectionchange', handleGlobalSelectionChange);
    return () => document.removeEventListener('selectionchange', handleGlobalSelectionChange);
  }, []);

  // Query formatting states on active cursor/selection
  const updateActiveFormatting = () => {
    try {
      setWordIsBold(document.queryCommandState('bold'));
      setWordIsItalic(document.queryCommandState('italic'));
      setWordIsUnderline(document.queryCommandState('underline'));
      setWordIsStrike(document.queryCommandState('strikeThrough'));
      setWordIsSubscript(document.queryCommandState('subscript'));
      setWordIsSuperscript(document.queryCommandState('superscript'));
      setWordIsBulletedList(document.queryCommandState('insertUnorderedList'));
      setWordIsNumberedList(document.queryCommandState('insertOrderedList'));

      const fontVal = document.queryCommandValue('fontName');
      if (fontVal) {
        setWordFontFamily(fontVal.replace(/['"]/g, ''));
      }

      const colorVal = document.queryCommandValue('foreColor');
      if (colorVal) {
        setWordTextColor(colorVal);
      }

      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let node = sel.anchorNode;
        if (node && node.nodeType === 3) node = node.parentNode;
        if (
          node &&
          node !== wordEditorRef.current &&
          wordEditorRef.current &&
          wordEditorRef.current.contains(node)
        ) {
          const computed = window.getComputedStyle(node);
          if (computed && computed.fontSize) {
            const rawPx = Math.round(parseFloat(computed.fontSize));
            if (rawPx && rawPx >= 8 && rawPx <= 96) {
              setWordFontSize(String(rawPx));
              setWordFontSizeInput(String(rawPx));
            }
          }
          if (computed && computed.textAlign) {
            setWordTextAlign(computed.textAlign);
          }
        }
      }
    } catch (e) {
      // Ignore
    }
  };

  // Standard execCommand formatting wrapper
  const applyFormat = (command, value = null) => {
    restoreSelection();
    if (wordEditorRef.current) wordEditorRef.current.focus();
    document.execCommand(command, false, value);
    updateActiveFormatting();
    syncEditorContent();
    saveSelection();
  };

  // Font name application
  const applyFontName = (font) => {
    restoreSelection();
    if (wordEditorRef.current) wordEditorRef.current.focus();
    document.execCommand('fontName', false, font);
    setWordFontFamily(font);
    updateActiveFormatting();
    syncEditorContent();
    saveSelection();
  };

  // Font size application (px specific - works for selected text, current block, or typed input)
  const applyFontSize = (sizeInput) => {
    const rawNum = parseInt(String(sizeInput).replace(/[^0-9]/g, ''), 10);
    if (!rawNum || isNaN(rawNum)) return;
    // Strict clamp: between 8px and 96px
    const numericSize = Math.max(8, Math.min(96, rawNum));
    const pxSize = `${numericSize}px`;

    setWordFontSize(String(numericSize));
    setWordFontSizeInput(String(numericSize));

    // Ensure editor has focus, then restore previous selection
    if (wordEditorRef.current) wordEditorRef.current.focus();
    restoreSelection();

    let sel = window.getSelection();
    let range = null;
    if (sel && sel.rangeCount > 0) {
      range = sel.getRangeAt(0);
    }

    // Verify range is within wordEditorRef.current
    const isInsideEditor = range && wordEditorRef.current && wordEditorRef.current.contains(range.commonAncestorContainer);

    if (isInsideEditor && !range.collapsed) {
      // CASE 1: Text is selected - style the selection
      document.execCommand('styleWithCSS', false, false);
      document.execCommand('fontSize', false, '7');

      const createdSpans = [];
      if (wordEditorRef.current) {
        const query = 'font[size="7"], font[size="+7"], span[style*="-webkit-xxx-large"], span[style*="xxx-large"]';
        const matched = Array.from(wordEditorRef.current.querySelectorAll(query));

        if (matched.length > 0) {
          matched.forEach((el) => {
            const span = document.createElement('span');
            span.style.fontSize = pxSize;
            // Clear inner font-size overrides
            span.querySelectorAll('*').forEach((child) => {
              if (child.style && child.style.fontSize) child.style.fontSize = '';
              if (child.tagName === 'FONT') child.removeAttribute('size');
            });
            while (el.firstChild) {
              span.appendChild(el.firstChild);
            }
            el.parentNode.replaceChild(span, el);
            createdSpans.push(span);
          });
        }
      }

      // Re-establish selection over modified elements so subsequent +/- or inputs continue to work seamlessly
      if (createdSpans.length > 0) {
        try {
          const newRange = document.createRange();
          newRange.setStartBefore(createdSpans[0]);
          newRange.setEndAfter(createdSpans[createdSpans.length - 1]);
          sel.removeAllRanges();
          sel.addRange(newRange);
          savedSelectionRef.current = newRange.cloneRange();
        } catch (e) {
          saveSelection();
        }
      } else {
        // Fallback for complex selections (e.g. cross-elements or lists)
        try {
          const fragment = range.extractContents();
          const span = document.createElement('span');
          span.style.fontSize = pxSize;
          fragment.querySelectorAll?.('*').forEach((child) => {
            if (child.style && child.style.fontSize) child.style.fontSize = '';
            if (child.tagName === 'FONT') child.removeAttribute('size');
          });
          span.appendChild(fragment);
          range.insertNode(span);

          const newRange = document.createRange();
          newRange.selectNodeContents(span);
          sel.removeAllRanges();
          sel.addRange(newRange);
          savedSelectionRef.current = newRange.cloneRange();
        } catch (e) {
          saveSelection();
        }
      }
    } else if (isInsideEditor && range.collapsed) {
      // CASE 2: Cursor is placed at a position (no highlighted text)
      let container = range.startContainer;
      if (container && container.nodeType === 3) {
        container = container.parentNode;
      }

      // Update the active block element (p, h1-h6, li, td, th) if present
      const block = container ? container.closest('p, h1, h2, h3, h4, h5, h6, li, td, th') : null;
      if (block && block !== wordEditorRef.current) {
        block.style.fontSize = pxSize;
        // Also clear inner spans that had old hardcoded sizes
        block.querySelectorAll('span, font').forEach((child) => {
          if (child.style && child.style.fontSize) child.style.fontSize = '';
          if (child.tagName === 'FONT') child.removeAttribute('size');
        });
      } else if (container && container !== wordEditorRef.current) {
        container.style.fontSize = pxSize;
      } else if (wordEditorRef.current) {
        wordEditorRef.current.style.fontSize = pxSize;
      }

      saveSelection();
    } else {
      // CASE 3: No active selection inside editor - apply to base editor container
      if (wordEditorRef.current) {
        wordEditorRef.current.style.fontSize = pxSize;
      }
    }

    syncEditorContent();
  };

  // Text Color application
  const applyTextColor = (color) => {
    restoreSelection();
    if (wordEditorRef.current) wordEditorRef.current.focus();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, color);
    setWordTextColor(color);
    setShowColorPicker(false);
    updateActiveFormatting();
    syncEditorContent();
    saveSelection();
  };

  // Background Highlight Color application
  const applyHighlightColor = (color) => {
    restoreSelection();
    if (wordEditorRef.current) wordEditorRef.current.focus();
    document.execCommand('styleWithCSS', false, true);
    if (color === 'transparent') {
      document.execCommand('removeFormat', false, null);
    } else {
      if (!document.execCommand('hiliteColor', false, color)) {
        document.execCommand('backColor', false, color);
      }
    }
    setWordHighlightColor(color);
    setShowHighlightPicker(false);
    updateActiveFormatting();
    syncEditorContent();
    saveSelection();
  };

  // Text Alignment
  const applyAlignment = (align) => {
    restoreSelection();
    if (wordEditorRef.current) wordEditorRef.current.focus();
    if (align === 'left') document.execCommand('justifyLeft', false, null);
    else if (align === 'center') document.execCommand('justifyCenter', false, null);
    else if (align === 'right') document.execCommand('justifyRight', false, null);
    else if (align === 'justify') document.execCommand('justifyFull', false, null);
    setWordTextAlign(align);
    updateActiveFormatting();
    syncEditorContent();
    saveSelection();
  };

  // Line Height
  const applyLineHeight = (lh) => {
    restoreSelection();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      let node = sel.anchorNode;
      if (node && node.nodeType === 3) node = node.parentNode;
      const block = node ? node.closest('p, div, h1, h2, h3, li') : null;
      if (block) {
        block.style.lineHeight = lh;
      } else if (wordEditorRef.current) {
        wordEditorRef.current.style.lineHeight = lh;
      }
    } else if (wordEditorRef.current) {
      wordEditorRef.current.style.lineHeight = lh;
    }
    setWordLineHeight(lh);
    syncEditorContent();
  };

  // Text Case transformations
  const transformCase = (type) => {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed) return;
    const selectedText = sel.toString();
    if (!selectedText) return;
    let newText = selectedText;
    if (type === 'upper') {
      newText = selectedText.toUpperCase();
    } else if (type === 'title') {
      newText = selectedText.replace(/\b\w/g, (c) => c.toUpperCase());
    } else if (type === 'lower') {
      newText = selectedText.toLowerCase();
    }
    document.execCommand('insertText', false, newText);
    syncEditorContent();
    saveSelection();
  };

  // HTML Insertion at cursor
  const insertHtmlAtCursor = (html) => {
    restoreSelection();
    if (wordEditorRef.current) wordEditorRef.current.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      if (wordEditorRef.current) {
        wordEditorRef.current.innerHTML += html;
        syncEditorContent();
      }
      return;
    }
    const range = sel.getRangeAt(0);
    range.deleteContents();

    const temp = document.createElement('div');
    temp.innerHTML = html;
    const frag = document.createDocumentFragment();
    let node, lastNode;
    while ((node = temp.firstChild)) {
      lastNode = frag.appendChild(node);
    }
    range.insertNode(frag);
    if (lastNode) {
      const newRange = range.cloneRange();
      newRange.setStartAfter(lastNode);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      saveSelection();
    }
    syncEditorContent();
  };

  const insertTextAtCursor = (text) => {
    const html = text
      .split(/\n\n+/)
      .map((para) => `<p style="margin-bottom: 12px; line-height: 1.6;">${para.replace(/\n/g, '<br>')}</p>`)
      .join('');
    insertHtmlAtCursor(html);
  };

  // Interactive Table Helpers (WordPad / Word style)
  const getActiveTableCellInfo = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    let node = sel.anchorNode;
    if (node && node.nodeType === 3) node = node.parentNode;
    if (!node) return null;
    const cell = node.closest('td, th');
    if (!cell) return null;
    const row = cell.closest('tr');
    const table = cell.closest('table');
    if (!row || !table) return null;
    const colIndex = Array.from(row.children).indexOf(cell);
    const rowIndex = Array.from(table.querySelectorAll('tr')).indexOf(row);
    return { cell, row, table, colIndex, rowIndex };
  };

  const insertTable = (rows = 3, cols = 3) => {
    restoreSelection();
    if (wordEditorRef.current) wordEditorRef.current.focus();

    let tableHtml = `<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: ${wordFontSize}pt; border: 1px solid #cbd5e1;"><thead><tr style="background: #f8fafc; border-bottom: 2px solid #cbd5e1;">`;
    for (let c = 0; c < cols; c++) {
      tableHtml += `<th style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: left; font-weight: bold;">Header ${c + 1}</th>`;
    }
    tableHtml += `</tr></thead><tbody>`;
    for (let r = 0; r < rows - 1; r++) {
      tableHtml += `<tr style="border-bottom: 1px solid #e2e8f0;">`;
      for (let c = 0; c < cols; c++) {
        tableHtml += `<td style="padding: 8px 12px; border: 1px solid #cbd5e1;">Cell ${r + 1},${c + 1}</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><p><br></p>`;

    insertHtmlAtCursor(tableHtml);
    setShowTableMenu(false);
  };

  const insertTableRow = (position = 'below') => {
    const info = getActiveTableCellInfo();
    if (!info) {
      showPopupAlert('Click inside any table cell first to insert a row.', { title: 'Table Tool', type: 'info' });
      return;
    }
    const { row } = info;
    const colsCount = row.children.length;
    const newRow = document.createElement('tr');
    newRow.style.borderBottom = '1px solid #e2e8f0';
    for (let i = 0; i < colsCount; i++) {
      const newCell = document.createElement('td');
      newCell.style.padding = '8px 12px';
      newCell.style.border = '1px solid #cbd5e1';
      newCell.innerHTML = '<br>';
      newRow.appendChild(newCell);
    }
    if (position === 'above') {
      row.parentNode.insertBefore(newRow, row);
    } else {
      row.parentNode.insertBefore(newRow, row.nextSibling);
    }
    syncEditorContent();
  };

  const insertTableCol = (position = 'right') => {
    const info = getActiveTableCellInfo();
    if (!info) {
      showPopupAlert('Click inside any table cell first to insert a column.', { title: 'Table Tool', type: 'info' });
      return;
    }
    const { table, colIndex } = info;
    const allRows = table.querySelectorAll('tr');
    allRows.forEach((r) => {
      const isHead = r.closest('thead') || r.querySelector('th');
      const newCell = document.createElement(isHead ? 'th' : 'td');
      newCell.style.padding = '8px 12px';
      newCell.style.border = '1px solid #cbd5e1';
      newCell.style.textAlign = 'left';
      newCell.innerHTML = isHead ? 'Header' : '<br>';
      const refCell = r.children[colIndex];
      if (position === 'left') {
        r.insertBefore(newCell, refCell);
      } else {
        r.insertBefore(newCell, refCell ? refCell.nextSibling : null);
      }
    });
    syncEditorContent();
  };

  const deleteTableRow = () => {
    const info = getActiveTableCellInfo();
    if (!info) {
      showPopupAlert('Click inside the row you want to delete.', { title: 'Table Tool', type: 'info' });
      return;
    }
    const { row, table } = info;
    const rows = table.querySelectorAll('tr');
    if (rows.length <= 1) {
      table.remove();
    } else {
      row.remove();
    }
    syncEditorContent();
  };

  const deleteTableCol = () => {
    const info = getActiveTableCellInfo();
    if (!info) {
      showPopupAlert('Click inside the column you want to delete.', { title: 'Table Tool', type: 'info' });
      return;
    }
    const { table, colIndex } = info;
    const rows = table.querySelectorAll('tr');
    const firstRowCols = rows[0]?.children.length || 0;
    if (firstRowCols <= 1) {
      table.remove();
    } else {
      rows.forEach((r) => {
        if (r.children[colIndex]) {
          r.children[colIndex].remove();
        }
      });
    }
    syncEditorContent();
  };

  const deleteTable = () => {
    const info = getActiveTableCellInfo();
    if (!info) {
      showPopupAlert('Click inside the table you wish to delete.', { title: 'Table Tool', type: 'info' });
      return;
    }
    info.table.remove();
    syncEditorContent();
  };

  const handleWordUndo = () => {
    applyFormat('undo');
  };

  const handleWordRedo = () => {
    applyFormat('redo');
  };

  // Populate contentEditable editor when modal opens
  useEffect(() => {
    if (showEditDocModal && isEditingDocRichText && wordEditorRef.current) {
      const initialHtml = convertPlainTextToHtml(docContentText);
      wordEditorRef.current.innerHTML = initialHtml;
      setTimeout(() => {
        if (wordEditorRef.current) {
          wordEditorRef.current.focus();
          updateActiveFormatting();
        }
      }, 50);
    }
  }, [showEditDocModal, isEditingDocRichText]);

  const handleWordPreviewPdf = () => {
    try {
      const activeDocFields = fieldsByDoc[activeDocIndex] || [];
      const currentContent = wordEditorRef.current ? wordEditorRef.current.innerHTML : docContentText;
      generateAndDownloadPdf({
        documentName: documentTitle.endsWith('.pdf') ? documentTitle : `${documentTitle}.pdf`,
        documentText: currentContent,
        docId: `BEX-DOC-PREVIEW-${id || 1}-${activeDocIndex + 1}`,
        signerName: recipientList[0]?.name || 'Vimal Chavda',
        signerEmail: recipientList[0]?.email || 'vimal@bexcodeservices.com',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'Draft Preview',
        signatureImage: '',
        fields: activeDocFields
      });
      showPopupAlert(`Generated PDF preview for "${documentTitle}". Download will start automatically.`, {
        title: 'PDF Preview Ready',
        type: 'success'
      });
    } catch (err) {
      showPopupAlert('Failed to generate PDF preview: ' + err.message, { title: 'Preview Error', type: 'error' });
    }
  };

  const handleWordSaveAndCreate = () => {
    const finalContent = wordEditorRef.current ? wordEditorRef.current.innerHTML : docContentText;
    setIsEditingDocRichText(false);
    setShowEditDocModal(false);
    setDocumentsList((prev) => {
      const copy = [...prev];
      if (copy[activeDocIndex]) {
        copy[activeDocIndex] = {
          ...copy[activeDocIndex],
          name: documentTitle,
          documentText: finalContent
        };
      }
      if (id) {
        localStorage.setItem(`bexsign_doc_${id}_documents`, JSON.stringify(copy));
      }
      return copy;
    });
    showPopupAlert('Document contents updated and saved in place. Fields and canvas automatically synchronized.', {
      title: 'Saved Successfully',
      type: 'success'
    });
  };

  // BexSign Color-Coded Recipient Field Assignment Palette
  const RECIPIENT_PALETTE = [
    { color: '#00a884', bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700' },
    { color: '#0284c7', bg: 'bg-sky-50', border: 'border-sky-600', text: 'text-sky-700' },
    { color: '#f97316', bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-700' },
    { color: '#8b5cf6', bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-700' },
    { color: '#ec4899', bg: 'bg-pink-50', border: 'border-pink-500', text: 'text-pink-700' },
    { color: '#10b981', bg: 'bg-teal-50', border: 'border-teal-500', text: 'text-teal-700' }
  ];

  // Dynamic Recipients State: every recipient added in step 1 with role label and colour (PDF 1 p.1-2)
  const toEditorRecipient = (r, idx) => {
    const rawRole = r.role_label || r.role || 'Needs to sign';
    const low = String(rawRole).toLowerCase();
    const role = low.includes('approv')
      ? 'Approver'
      : (low.includes('in-person') ? 'In-person signer' : ((low.includes('copy') || low.includes('view') || low === 'cc') ? 'Receives a copy' : 'Needs to sign'));
    return {
      id: r.id || idx + 1,
      name: r.name || (r.email ? r.email.split('@')[0] : `Signer ${idx + 1}`),
      email: r.email || '',
      role,
      status: r.status || 'pending',
      // Signing step ("Send in order"); recipients sharing a step are emailed at the same time
      signingOrder: parseInt(r.signingOrder ?? r.signing_order_index, 10) || idx + 1,
      ...RECIPIENT_PALETTE[idx % RECIPIENT_PALETTE.length]
    };
  };

  const recipientsSourceRef = useRef(
    location.state?.recipients?.length ? 'state' : (localStorage.getItem(`bexsign_doc_${id}_recipients`) ? 'storage' : 'default')
  );

  const [recipientList, setRecipientList] = useState(() => {
    // 1. Navigation state recipients (from SendForSignatures)
    if (location.state?.recipients && Array.isArray(location.state.recipients) && location.state.recipients.length > 0) {
      return location.state.recipients.map(toEditorRecipient);
    }
    // 2. Saved envelope recipients in localStorage
    try {
      const saved = localStorage.getItem(`bexsign_doc_${id}_recipients`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(toEditorRecipient);
        }
      }
    } catch (e) {}
    return [toEditorRecipient({ id: 1, name: 'Vimal Chavda', email: 'vimal@bexcodeservices.com', role: 'Needs to sign' }, 0)];
  });

  // "Receives a copy" recipients never get fields (Zoho Sign rule)
  const canReceiveFields = (rec) => Boolean(rec) && rec.role !== 'Receives a copy';
  const fieldBelongsTo = (field, rec) => {
    if (!field || !rec) return false;
    if (field.assigneeEmail) return Boolean(rec.email) && field.assigneeEmail.toLowerCase() === rec.email.toLowerCase();
    if (field.recipientId !== undefined && field.recipientId !== null && String(field.recipientId) === String(rec.id)) return true;
    return field.assigneeId !== undefined && field.assigneeId !== null && String(field.assigneeId) === String(rec.id);
  };
  // A field that matches no recipient is shown as unassigned (grey) instead of taking the first recipient's colour
  const UNASSIGNED_RECIPIENT = { id: null, name: 'Unassigned', email: '', color: '#94a3b8' };
  const recipientForField = (field) => recipientList.find((r) => fieldBelongsTo(field, r)) || UNASSIGNED_RECIPIENT;

  const [selectedRecipient, setSelectedRecipient] = useState(() => recipientList.find(canReceiveFields) || recipientList[0]);
  const [requestStatus, setRequestStatus] = useState('Draft');
  // 'sequential' = "Send in order" (step by step), 'parallel' = everyone is emailed at once
  const [signingOrderMode, setSigningOrderMode] = useState('sequential');
  const [bexsignDocId, setBexsignDocId] = useState('');
  const [initialLoadDone, setInitialLoadDone] = useState(!id);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showDocsPanel, setShowDocsPanel] = useState(false);
  const [showFieldsPanel, setShowFieldsPanel] = useState(false);
  const discardedRef = useRef(false);
  const displayDocId = bexsignDocId
    ? `${bexsignDocId}${documentsList.length > 1 ? `-${activeDocIndex + 1}` : ''}`
    : `BEX-DOC-2026-${String(id || 1).padStart(4, '0')}-${activeDocIndex + 1}`;

  // Multi-document partitioned fields (Canvas Fields per active document)
  const [fieldsByDoc, setFieldsByDoc] = useState(() => {
    const isNew = localStorage.getItem(`bexsign_doc_${id}_is_new`) === 'true' || location.state?.fromCreate;
    if (isNew) return {};
    const savedByDoc = localStorage.getItem(`bexsign_doc_${id}_fields_by_doc`);
    if (savedByDoc) {
      try {
        const parsed = JSON.parse(savedByDoc);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) {}
    }
    return {};
  });

  // Pages added with "Add Page", kept per document (keyed by document index)
  const [extraPagesByDoc, setExtraPagesByDoc] = useState(() => {
    try {
      const saved = localStorage.getItem(`bexsign_doc_${id}_extra_pages`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
        const legacyCount = parseInt(saved, 10); // older builds stored one count shared by every document
        if (legacyCount > 0) return { 0: legacyCount };
      }
    } catch (e) {}
    return {};
  });
  const extraPagesCount = extraPagesByDoc[activeDocIndex] || 0;
  const setExtraPagesForDoc = (docIdx, count) => {
    setExtraPagesByDoc((prev) => {
      const next = { ...prev, [docIdx]: Math.max(0, count) };
      if (id) localStorage.setItem(`bexsign_doc_${id}_extra_pages`, JSON.stringify(next));
      return next;
    });
  };

  const fieldsOnDoc = fieldsByDoc[activeDocIndex] || [];

  // Calculate total pages for current active document:
  // Default is 1 page. Only generates extra pages if user explicitly added pages, edited text overflowing Page 1 (>2800 chars), or placed fields on page 2+
  const totalPages = useMemo(() => {
    const maxFieldPage = fieldsOnDoc.reduce((max, f) => Math.max(max, f.page || 1), 1);
    const text = currentDocument?.documentText || '';
    const textLength = text.replace(/<[^>]+>/g, ' ').length;
    // An A4 page (min-h-[960px]) comfortably fits ~2800 characters of standard body text.
    // Only generate Page 2 if text is genuinely overflowing Page 1 (> 2800 chars)
    const textNeedsExtraPage = textLength > 2800;
    const manualPages = (currentDocument?.isUploadedPdf ? (currentDocument?.pdfPageCount || 1) : 1) + extraPagesCount;

    return Math.max(1, maxFieldPage, textNeedsExtraPage ? 2 : 1, manualPages);
  }, [fieldsOnDoc, currentDocument, extraPagesCount]);

  const pagesForDoc = (idx) => {
    if (idx === activeDocIndex) return totalPages;
    const doc = documentsList[idx] || {};
    const maxFieldPage = (fieldsByDoc[idx] || []).reduce((max, f) => Math.max(max, f.page || 1), 1);
    const textLength = (doc.documentText || '').replace(/<[^>]+>/g, ' ').length;
    const manualPages = (doc.isUploadedPdf ? (doc.pdfPageCount || 1) : 1) + (extraPagesByDoc[idx] || 0);
    return Math.max(1, maxFieldPage, textLength > 2800 ? 2 : 1, manualPages);
  };

  // Keep the active document valid when documents are removed or reloaded from the server
  useEffect(() => {
    if (documentsList.length > 0 && activeDocIndex > documentsList.length - 1) {
      setActiveDocIndex(documentsList.length - 1);
      setActivePage(1);
    }
  }, [documentsList.length, activeDocIndex]);

  // Every way of opening a document (cards, page thumbnails, top-bar switcher) starts from a clean view
  const switchToDocument = (idx, page = 1) => {
    setActiveFieldId(null);
    setActiveDocIndex(idx);
    setActivePage(page);
    setTimeout(() => {
      const pageElem = page > 1 ? document.getElementById(`doc-page-${page}`) : null;
      if (pageElem) pageElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else canvasScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 60);
  };

  // Keep activePage valid when totalPages decreases
  useEffect(() => {
    if (activePage > totalPages) {
      setActivePage(totalPages);
    }
  }, [totalPages, activePage]);

  // Consolidate fields to Page 1 if Page 1 has ample free space and user did not request extra pages
  useEffect(() => {
    if (!docTextContentRef.current) return;
    const textHeight = docTextContentRef.current.offsetHeight || 280;
    const textBottom = (docTextContentRef.current?.offsetTop || 48) + textHeight;

    // Standard A4 is 1123px high: Page 1 is only full if text alone > 850px
    if (textHeight < 850 && extraPagesCount === 0) {
      const p2Fields = fieldsOnDoc.filter(f => f.page && f.page > 1);
      if (p2Fields.length > 0) {
        setFieldsOnDoc(prev => {
          let p1Count = prev.filter(f => (f.page || 1) === 1).length;
          return prev.map(f => {
            if (f.page && f.page > 1) {
              const newY = Math.min(920, Math.max(120, Math.round(textBottom + 25 + ((p1Count % 6) * 54))));
              const newX = 60 + ((Math.floor(p1Count / 6) * 240) % 480);
              p1Count++;
              return { ...f, page: 1, x: newX, y: newY };
            }
            return f;
          });
        });
      }
    } else {
      // Page 1 IS fully occupied (textHeight >= 850) or fields overflow past 940px
      const hasOverflow = fieldsOnDoc.some(f => (f.page || 1) === 1 && f.y > 940);
      if (hasOverflow) {
        setFieldsOnDoc(prev => {
          let p2Count = prev.filter(f => f.page === 2).length;
          return prev.map(f => {
            if ((f.page || 1) === 1 && f.y > 940) {
              const newY = 190 + ((p2Count % 8) * 60);
              const newX = 60 + ((Math.floor(p2Count / 8) * 240) % 480);
              p2Count++;
              return { ...f, page: 2, x: newX, y: newY };
            }
            return f;
          });
        });
      }
    }
  }, [currentDocument?.documentText, fieldsOnDoc.length, extraPagesCount]);

  const setFieldsOnDoc = (updater) => {
    setFieldsByDoc((prev) => {
      const currentFields = prev[activeDocIndex] || [];
      const nextFields = typeof updater === 'function' ? updater(currentFields) : updater;
      const nextByDoc = { ...prev, [activeDocIndex]: nextFields };
      if (id) {
        localStorage.setItem(`bexsign_doc_${id}_fields_by_doc`, JSON.stringify(nextByDoc));
        const flatList = Object.values(nextByDoc).flat();
        localStorage.setItem(`bexsign_doc_${id}_fields`, JSON.stringify(flatList));
        localStorage.removeItem(`bexsign_doc_${id}_is_new`);
      }
      return nextByDoc;
    });
  };

  // Interactive Drag & Drop Mouse Tracking State
  const [draggingFieldId, setDraggingFieldId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);
  const dragStartCoordsRef = useRef({ x: 0, y: 0 });
  const lastDragEndRef = useRef(0);
  const initialOverlapCheckedRef = useRef(false);

  // Text Overlap Prevention Modal State
  const [showOverlapModal, setShowOverlapModal] = useState(false);
  const [pendingOverlapField, setPendingOverlapField] = useState(null);

  // Modals & Active Field Sidebar Panel State
  // The selected field is tracked by id and always read from the active document's current fields, so edits never
  // write back an outdated copy (e.g. right after dragging) and a field of another document is never selected
  const [activeFieldId, setActiveFieldId] = useState(null);
  const activeField = activeFieldId !== null ? (fieldsOnDoc.find((f) => f.id === activeFieldId) || null) : null;
  const setActiveField = (next) => {
    const value = typeof next === 'function' ? next(activeField) : next;
    setActiveFieldId(value ? value.id : null);
  };
  const [showCustomDateInput, setShowCustomDateInput] = useState(false);
  const [customDateInput, setCustomDateInput] = useState('');
  const [showCreateCustomFieldModal, setShowCreateCustomFieldModal] = useState(false);
  const [showStampCropModal, setShowStampCropModal] = useState(false);

  // Stamp Crop & Rotate State (Pages 9 & 10 PDF)
  const [stampZoom, setStampZoom] = useState(100);
  const [stampShape, setStampShape] = useState('square'); // square or oval
  const [stampRotation, setStampRotation] = useState(0);
  const [stampImageSrc, setStampImageSrc] = useState('');

  useEffect(() => {
    if (id) fetchDocumentDetails();
  }, [id]);

  const fetchDocumentDetails = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/documents/${id}`);
      const data = await res.json();
      if (data.success && data.document) {
        const doc = data.document;
        if (doc.status) setRequestStatus(doc.status);
        if (doc.signing_order) setSigningOrderMode(doc.signing_order === 'parallel' ? 'parallel' : 'sequential');
        if (doc.bexsign_doc_id) setBexsignDocId(doc.bexsign_doc_id);

        // Documents: server rows carry the file ids that keep fields attached to the right document
        if (doc.files && Array.isArray(doc.files) && doc.files.length > 0) {
          setDocumentsList((prev) => {
            const fromServer = doc.files.map((f, i) => {
              const local = prev.find((d) => String(d.fileId || d.id) === String(f.id)) || prev[i] || {};
              return {
                ...local,
                id: f.id,
                fileId: f.id,
                name: f.file_name || local.name || `Document ${i + 1}.pdf`,
                pages: local.pages || 1,
                status: local.status || 'Ready',
                filePath: f.file_path || local.filePath || null,
                documentText: f.document_text || local.documentText || getDefaultDocContent(f.file_name, doc.custom_message),
                customMessage: local.customMessage || doc.custom_message || 'check the document for signature'
              };
            });
            localStorage.setItem(`bexsign_doc_${id}_documents`, JSON.stringify(fromServer));
            return fromServer;
          });
        }

        if (doc.recipient_email) {
          setRecipientEmail(doc.recipient_email);
        }

        // Recipients: real database rows; a legacy single-recipient fallback never replaces step 1 recipients
        const realRecipients = (doc.recipients || []).filter((r) => !r.isFallback);
        if (realRecipients.length > 0) {
          const formatted = realRecipients.map(toEditorRecipient);
          recipientsSourceRef.current = 'server';
          setRecipientList(formatted);
          setSelectedRecipient((prev) =>
            formatted.find((f) => prev?.email && f.email.toLowerCase() === prev.email.toLowerCase() && canReceiveFields(f))
            || formatted.find(canReceiveFields)
            || formatted[0]
          );
          localStorage.setItem(`bexsign_doc_${id}_recipients`, JSON.stringify(formatted));
        } else if (recipientsSourceRef.current === 'default' && doc.recipients?.length) {
          const single = doc.recipients.map(toEditorRecipient);
          setRecipientList(single);
          setSelectedRecipient(single[0]);
        }

        // Fields: grouped per document by the server
        if (doc.fieldsByDoc && Object.keys(doc.fieldsByDoc).length > 0) {
          const normalized = {};
          Object.entries(doc.fieldsByDoc).forEach(([idx, list]) => {
            const docIdx = parseInt(idx, 10) || 0;
            normalized[docIdx] = (list || []).map((f) => ({ ...f, docIndex: docIdx }));
          });
          setFieldsByDoc(normalized);
          localStorage.setItem(`bexsign_doc_${id}_fields_by_doc`, JSON.stringify(normalized));
          localStorage.setItem(`bexsign_doc_${id}_fields`, JSON.stringify(Object.values(normalized).flat()));
          localStorage.removeItem(`bexsign_doc_${id}_is_new`);
        }
      }
    } catch (e) {
      console.warn('Doc fetch fallback:', e);
    } finally {
      setInitialLoadDone(true);
    }
  };

  // Drag & Drop Mouse Handlers
  const handleMouseDownOnField = (e, field) => {
    if (e.target.tagName !== 'INPUT') {
      e.preventDefault();
    }
    e.stopPropagation();
    setActiveField(field);
    setDraggingFieldId(field.id);
    hasDraggedRef.current = false;
    dragStartCoordsRef.current = { x: e.clientX, y: e.clientY };
    const pageNum = field.page || 1;
    const pageElem = document.getElementById(`doc-page-${pageNum}`) || canvasRef.current;
    if (pageElem) {
      const rect = pageElem.getBoundingClientRect();
      setDragOffset({
        x: (e.clientX - rect.left) / zoomScale - field.x,
        y: (e.clientY - rect.top) / zoomScale - field.y
      });
    }
  };

  const handleMouseMoveOnCanvas = (e) => {
    if (!draggingFieldId) return;
    e.preventDefault();

    if (Math.hypot(e.clientX - dragStartCoordsRef.current.x, e.clientY - dragStartCoordsRef.current.y) > 4) {
      hasDraggedRef.current = true;
    }

    const draggingField = fieldsOnDoc.find(f => f.id === draggingFieldId);
    if (!draggingField) return;

    // Detect which page sheet the cursor is currently over (supports dragging across Page 1 & Page 2!)
    const page1Elem = document.getElementById('doc-page-1');
    const page2Elem = document.getElementById('doc-page-2');
    let targetPage = draggingField.page || 1;

    if (page1Elem && page2Elem) {
      const p1Rect = page1Elem.getBoundingClientRect();
      const p2Rect = page2Elem.getBoundingClientRect();
      if (e.clientY < p1Rect.bottom + 20) {
        targetPage = 1;
      } else if (e.clientY >= p2Rect.top - 20) {
        targetPage = 2;
      }
    }

    const activePageElem = document.getElementById(`doc-page-${targetPage}`) || canvasRef.current;
    if (!activePageElem) return;

    const rect = activePageElem.getBoundingClientRect();
    let newX = (e.clientX - rect.left) / zoomScale - dragOffset.x;
    let newY = (e.clientY - rect.top) / zoomScale - dragOffset.y;

    // Get current field element to calculate accurate boundary clamping
    const fieldElem = document.getElementById(`doc-field-${draggingFieldId}`);
    const fieldW = fieldElem ? fieldElem.offsetWidth : 210;
    const fieldH = fieldElem ? fieldElem.offsetHeight : 45;

    // Allow field to be placed anywhere across page boundaries, including freely overlapping text, tables, headers
    const maxX = Math.max(10, rect.width / zoomScale - fieldW - 8);
    const maxY = Math.max(10, rect.height / zoomScale - fieldH - 8);

    newX = Math.max(8, Math.min(maxX, newX));
    newY = Math.max(8, Math.min(maxY, newY));

    setFieldsOnDoc(prevFields => prevFields.map(f => f.id === draggingFieldId ? { ...f, page: targetPage, x: newX, y: newY } : f));
  };

  // 2D Collision Detection between Field and Document Content
  const checkFieldOverlapsText = (fieldId, targetPage = 1) => {
    const pageElem = document.getElementById(`doc-page-${targetPage}`);
    if (!pageElem) return false;
    const textElem = pageElem.querySelector('[data-doc-text="true"]') || (targetPage === 1 ? docTextContentRef.current : null);
    const fieldElem = document.getElementById(`doc-field-${fieldId}`);
    if (!textElem || !fieldElem) return false;

    const textRect = textElem.getBoundingClientRect();
    const fieldRect = fieldElem.getBoundingClientRect();

    // 6px buffer to prevent false-positives at the exact border
    return !(
      fieldRect.right < textRect.left + 6 ||
      fieldRect.left > textRect.right - 6 ||
      fieldRect.bottom < textRect.top + 6 ||
      fieldRect.top > textRect.bottom - 6
    );
  };

  const handleMouseUpCanvas = () => {
    if (draggingFieldId && hasDraggedRef.current) {
      lastDragEndRef.current = Date.now();
      const fieldId = draggingFieldId;
      const field = fieldsOnDoc.find(f => f.id === fieldId);
      if (field) {
        const targetPage = field.page || 1;
        setTimeout(() => {
          if (checkFieldOverlapsText(fieldId, targetPage)) {
            setPendingOverlapField(field);
            setShowOverlapModal(true);
          }
        }, 40);
      }
    }
    setDraggingFieldId(null);
    hasDraggedRef.current = false;
  };

  const handleConfirmOverlap = () => {
    if (pendingOverlapField) {
      setFieldsOnDoc(prev => prev.map(f => f.id === pendingOverlapField.id ? { ...f, overlapConfirmed: true } : f));
    }
    setShowOverlapModal(false);
    setPendingOverlapField(null);
  };

  const handleRejectOverlap = () => {
    if (pendingOverlapField) {
      const smartPos = getSmartFieldPosition();
      setFieldsOnDoc(prev => prev.map(f => {
        if (f.id === pendingOverlapField.id) {
          return {
            ...f,
            page: smartPos.page,
            x: smartPos.x,
            y: smartPos.y,
            overlapConfirmed: false
          };
        }
        return f;
      }));

      setActiveField(prev => {
        if (prev?.id === pendingOverlapField.id) {
          return { ...prev, page: smartPos.page, x: smartPos.x, y: smartPos.y, overlapConfirmed: false };
        }
        return prev;
      });

      setActivePage(smartPos.page);
      setTimeout(() => {
        const destElem = document.getElementById(`doc-page-${smartPos.page}`);
        if (destElem) {
          destElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 80);
    }
    setShowOverlapModal(false);
    setPendingOverlapField(null);
  };

  // Initial check on document load: if any existing field overlaps text without prior user confirmation, prompt modal
  useEffect(() => {
    if (initialOverlapCheckedRef.current) return;
    if (fieldsOnDoc.length === 0 || !docTextContentRef.current) return;

    const timer = setTimeout(() => {
      const overlapping = fieldsOnDoc.find(f => {
        if (f.overlapConfirmed) return false;
        return checkFieldOverlapsText(f.id, f.page || 1);
      });
      if (overlapping) {
        initialOverlapCheckedRef.current = true;
        setPendingOverlapField(overlapping);
        setShowOverlapModal(true);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [fieldsOnDoc.length, currentDocument?.documentText]);

  // Direct Inline Text Writing Handler on Canvas (Pages 10, 11, 14, 15, 18 PDF)
  const handleInlineValueChange = (fieldId, val) => {
    setFieldsOnDoc(prev => prev.map(f => {
      if (f.id === fieldId) {
        const updated = { ...f, value: val };
        if (activeField?.id === fieldId) setActiveField(updated);
        return updated;
      }
      return f;
    }));
  };

  // Split Text Cell Direct Typing Handler (Pages 15, 17 PDF)
  const handleSplitCellChange = (fieldId, cellIndex, charVal) => {
    setFieldsOnDoc(prev => prev.map(f => {
      if (f.id === fieldId) {
        const currentGrid = [...(f.gridValue || [])];
        currentGrid[cellIndex] = charVal;
        const updated = { ...f, gridValue: currentGrid };
        if (activeField?.id === fieldId) setActiveField(updated);
        return updated;
      }
      return f;
    }));
  };

  // Stamp File Upload Handler (Pages 9 & 10 PDF)
  const handleStampImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setStampImageSrc(uploadEvent.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const computeEditorKey = (fieldsMap, docs) => JSON.stringify({
    f: fieldsMap,
    d: docs.map((d) => [d.name, d.documentText])
  });

  const documentFieldLists = () => Object.entries(fieldsByDoc)
    .filter(([docIdx]) => (parseInt(docIdx, 10) || 0) < documentsList.length)
    .map(([, list]) => list || []);

  const buildFieldsPayload = () => {
    const normalized = {};
    Object.entries(fieldsByDoc).forEach(([docIdx, fList]) => {
      const idx = parseInt(docIdx, 10) || 0;
      if (idx < documentsList.length) {
        normalized[idx] = (fList || []).map((f) => ({ ...f, docIndex: idx, page: f.page || 1 }));
      }
    });
    return normalized;
  };

  const buildDocumentsPayload = () => documentsList.map((d, i) => ({
    fileId: d.fileId || null,
    id: d.fileId || d.id,
    name: (d.name || `Document ${i + 1}.pdf`).trim(),
    documentText: d.documentText || getDefaultDocContent(d.name, d.customMessage),
    filePath: d.filePath || d.file_path || null
  }));

  const buildRecipientsPayload = () => (
    recipientsSourceRef.current === 'default'
      ? {}
      : { recipients: recipientList.map((r) => ({ email: r.email, name: r.name, role: r.role, signingOrder: r.signingOrder })) }
  );

  const lastEditorSaveKeyRef = useRef(null);
  const latestEditorKeyRef = useRef(null);
  const requestStatusRef = useRef(requestStatus);
  const saveDraftRef = useRef(null);
  const canvasScrollRef = useRef(null);
  const editorSaveKey = computeEditorKey(fieldsByDoc, documentsList);
  latestEditorKeyRef.current = editorSaveKey;
  requestStatusRef.current = requestStatus;

  const handleSaveDraft = async ({ silent = false } = {}) => {
    if (discardedRef.current || !id) return null;
    const keyAtSave = editorSaveKey;
    const fieldsPayload = buildFieldsPayload();
    localStorage.setItem(`bexsign_doc_${id}_documents`, JSON.stringify(documentsList));
    localStorage.setItem(`bexsign_doc_${id}_fields_by_doc`, JSON.stringify(fieldsPayload));
    localStorage.setItem(`bexsign_doc_${id}_fields`, JSON.stringify(Object.values(fieldsPayload).flat()));

    try {
      const res = await fetch(`http://localhost:5000/api/documents/${id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentTitle: documentsList[0]?.name || documentTitle,
          fieldsByDoc: fieldsPayload,
          documents: buildDocumentsPayload(),
          ...buildRecipientsPayload(),
          status: 'Draft'
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      if (Array.isArray(data.files)) {
        // Only attach server file ids when the document list did not change while the save was running
        setDocumentsList((prev) => (data.files.length !== prev.length ? prev : prev.map((d, i) => (
          data.files[i] && String(d.fileId) !== String(data.files[i].id)
            ? { ...d, fileId: data.files[i].id, filePath: data.files[i].file_path }
            : d
        ))));
      }
      lastEditorSaveKeyRef.current = keyAtSave;
      setStatusMsg(silent ? 'Draft saved' : 'Draft saved successfully!');
      setTimeout(() => setStatusMsg(''), 3000);
      return data;
    } catch (e) {
      setStatusMsg('Draft not saved - check the server connection');
      setTimeout(() => setStatusMsg(''), 4000);
      if (!silent) throw e;
      return null;
    }
  };
  saveDraftRef.current = handleSaveDraft;

  // Auto-save the draft (fields per document) shortly after every change
  useEffect(() => {
    if (!id || !initialLoadDone || draggingFieldId) return;
    if (lastEditorSaveKeyRef.current === null) {
      lastEditorSaveKeyRef.current = editorSaveKey;
      return;
    }
    if (discardedRef.current || editorSaveKey === lastEditorSaveKeyRef.current || requestStatus !== 'Draft') return;
    const timer = setTimeout(() => saveDraftRef.current?.({ silent: true }), 2000);
    return () => clearTimeout(timer);
  }, [editorSaveKey, initialLoadDone, draggingFieldId, requestStatus]);

  // Leaving the editor without discarding keeps the latest fields in the draft
  useEffect(() => () => {
    if (
      !discardedRef.current
      && lastEditorSaveKeyRef.current !== null
      && latestEditorKeyRef.current !== lastEditorSaveKeyRef.current
      && requestStatusRef.current === 'Draft'
    ) {
      saveDraftRef.current?.({ silent: true });
    }
  }, []);

  // Narrow canvas (phones, tablets, small laptops): zoom the A4 page out so it fits the available width
  useEffect(() => {
    const fitToWidth = () => {
      if (!canvasScrollRef.current) return;
      const available = canvasScrollRef.current.clientWidth - 24;
      if (available >= 794) return;
      setZoomLevel(Math.max(30, Math.floor((available / 794) * 100)));
    };
    fitToWidth();
    window.addEventListener('resize', fitToWidth);
    return () => window.removeEventListener('resize', fitToWidth);
  }, []);

  const handleContinueToSend = async () => {
    await handleSaveDraft({ silent: true });
    navigate(`/documents/${id || 1}/send`);
  };

  const getSignersWithoutFields = () => {
    const allFields = documentFieldLists().flat();
    return recipientList.filter((rec) => ['Needs to sign', 'In-person signer'].includes(rec.role) && !allFields.some((f) => fieldBelongsTo(f, rec)));
  };

  // Delivery plan shown before sending: who is emailed now and who follows in signing order
  const sendPlan = (() => {
    const signers = recipientList.filter((r) => r.role !== 'Receives a copy');
    const stepOfRecipient = (r) => r.signingOrder || 1;
    const isParallel = signingOrderMode === 'parallel';
    const firstStep = signers.length > 0 ? Math.min(...signers.map(stepOfRecipient)) : 1;
    return {
      isParallel,
      now: isParallel ? signers : signers.filter((r) => stepOfRecipient(r) === firstStep),
      later: isParallel ? [] : signers.filter((r) => stepOfRecipient(r) !== firstStep).sort((a, b) => stepOfRecipient(a) - stepOfRecipient(b)),
      alreadySigned: recipientList.filter((r) => r.status === 'signed'),
      // A request that was sent before starts a new signing round when it is sent again
      isResend: Boolean(requestStatus) && requestStatus !== 'Draft'
    };
  })();

  const openSendConfirm = () => {
    if (!hasDocuments) {
      showPopupAlert('Add at least one document to this request before sending.', { title: 'Document required', type: 'warning' });
      return;
    }
    const missing = getSignersWithoutFields();
    if (missing.length > 0) {
      setSelectedRecipient(missing[0]);
      setActiveField(null);
      setShowFieldsPanel(true);
      showPopupAlert(
        `Add at least one field for ${missing.map((r) => r.name || r.email).join(', ')} before sending. Select the recipient in the Recipients panel and place their fields.`,
        { title: 'Fields required', type: 'warning' }
      );
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    if (!id) return;
    setIsSending(true);
    const fieldsPayload = buildFieldsPayload();
    localStorage.setItem(`bexsign_doc_${id}_documents`, JSON.stringify(documentsList));
    localStorage.setItem(`bexsign_doc_${id}_fields_by_doc`, JSON.stringify(fieldsPayload));
    localStorage.setItem(`bexsign_doc_${id}_fields`, JSON.stringify(Object.values(fieldsPayload).flat()));
    localStorage.setItem(`bexsign_doc_${id}_recipients`, JSON.stringify(recipientList));

    try {
      const res = await fetch(`http://localhost:5000/api/documents/send/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentName: documentsList[0]?.name || documentTitle,
          documents: buildDocumentsPayload(),
          fieldsByDoc: fieldsPayload,
          ...buildRecipientsPayload()
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || `The document could not be sent (HTTP ${res.status}).`);
      }

      const dispatched = Array.isArray(data.dispatched)
        ? data.dispatched
        : (data.dispatchedEmails || []).map((email) => ({ email }));
      const failed = (data.failedEmails || []).map((f) => f.email).join(', ');
      if (dispatched.length === 0 && !failed) {
        throw new Error('No signature request email was sent. Check that at least one recipient needs to sign, then try again.');
      }

      discardedRef.current = true; // the request is no longer a draft: stop editor autosave
      setShowConfirmModal(false);
      const sentTo = dispatched.map((r) => (r.name ? `${r.name} (${r.email})` : r.email)).join(', ');
      const waiting = Array.isArray(data.waiting) ? data.waiting : null;
      const signingCount = recipientList.filter((r) => r.role !== 'Receives a copy').length;
      const laterNote = waiting
        ? (waiting.length > 0 ? ` ${waiting.map((r) => r.name || r.email).join(', ')} will receive it next, in signing order.` : '')
        : (dispatched.length < signingCount ? ' The remaining recipients will receive it in signing order.' : '');
      const restartNote = data.restarted ? ' Signing was restarted, so every recipient signs again.' : '';
      showPopupAlert(
        failed
          ? `The document was sent, but the email could not be delivered to: ${failed}.${laterNote}`
          : `Signature request emailed to: ${sentTo}.${laterNote}${restartNote}`,
        { title: failed ? 'Sent with email errors' : 'Document sent', type: failed ? 'warning' : 'success' }
      );
      navigate('/documents');
    } catch (err) {
      // fetch rejects with a TypeError only when the server could not be reached at all
      const message = err instanceof TypeError
        ? 'Could not reach the BexSign server at http://localhost:5000, so the document was not sent and no emails went out. Make sure the server is running, then try again.'
        : err.message;
      showPopupAlert(message, { title: 'Send failed', type: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  const handleDiscardDraft = async () => {
    setShowDiscardModal(false);
    if (requestStatus !== 'Draft' || !id) return;
    discardedRef.current = true;
    try {
      await fetch(`http://localhost:5000/api/documents/${id}?permanent=true`, { method: 'DELETE' });
    } catch (e) {}
    ['documents', 'recipients', 'fields_by_doc', 'fields', 'is_new', 'settings', 'extra_pages'].forEach((key) => {
      localStorage.removeItem(`bexsign_doc_${id}_${key}`);
    });
    navigate('/documents');
  };

  const standardFields = [
    { type: 'Signature', icon: <PenTool size={16} /> },
    { type: 'Initial', icon: <PenTool size={16} /> },
    { type: 'Stamp', icon: <ImageIcon size={16} /> },
    { type: 'Company', icon: <Building size={16} /> },
    { type: 'Full name', icon: <User size={16} /> },
    { type: 'Email', icon: <Mail size={16} /> },
    { type: 'Sign date', icon: <Calendar size={16} /> },
    { type: 'Text', icon: <FileText size={16} /> },
    { type: 'Split text', icon: <Grid size={16} /> },
    { type: 'Job title', icon: <Briefcase size={16} /> },
    { type: 'Checkbox', icon: <CheckSquare size={16} /> }
  ];

  const getSmartFieldPosition = () => {
    let textHeight = 0;
    if (docTextContentRef.current) {
      textHeight = docTextContentRef.current.offsetHeight;
    }
    const page1Fields = fieldsOnDoc.filter(f => (f.page || 1) === 1);
    const textBottom = (docTextContentRef.current?.offsetTop || 48) + textHeight;
    const maxFieldBottomOnP1 = page1Fields.reduce((max, f) => Math.max(max, (f.y || 0) + (f.height || 40)), textBottom);

    // Standard A4 is 1123px high with usable height up to ~960px.
    // Page 1 is only full if text alone occupies > 850px, or existing fields extend past 930px, or text + fields exceed 960px.
    const page1IsFull = textHeight > 850 || maxFieldBottomOnP1 > 930 || (textBottom + (page1Fields.length * 52) > 960);

    if (page1IsFull || (activePage > 1 && totalPages > 1)) {
      const targetP = activePage > 1 ? activePage : 2;
      const targetFields = fieldsOnDoc.filter(f => f.page === targetP);
      const idxOnP = targetFields.length;
      return {
        page: targetP,
        x: 60 + ((Math.floor(idxOnP / 8) * 240) % 480),
        y: 190 + ((idxOnP % 8) * 60)
      };
    } else {
      const idxOnP1 = page1Fields.length;
      return {
        page: 1,
        x: 60 + ((Math.floor(idxOnP1 / 6) * 240) % 480),
        y: Math.min(920, Math.max(120, Math.round(textBottom + 25 + ((idxOnP1 % 6) * 54))))
      };
    }
  };

  const addFieldToCanvas = (type) => {
    if (!hasDocuments) {
      showPopupAlert('Add a document to this request before placing fields.', { title: 'No documents', type: 'warning' });
      return;
    }
    if (!canReceiveFields(selectedRecipient)) {
      showPopupAlert(`${selectedRecipient?.name || 'This recipient'} receives a copy and cannot be assigned fields. Select a recipient who signs.`, {
        title: 'Select a signer',
        type: 'warning'
      });
      return;
    }
    if (type === 'Stamp') {
      setStampImageSrc('');
      setStampZoom(100);
      setStampShape('square');
      setStampRotation(0);
      setShowStampCropModal(true);
      return;
    }

    const { page: targetPage, x: targetX, y: targetY } = getSmartFieldPosition();

    const newField = {
      id: Date.now(),
      type,
      label: type,
      value: type === 'Split text' ? '' : (type === 'Checkbox' ? 'true' : (type === 'Full name' ? (selectedRecipient.name || type) : type)),
      x: targetX,
      y: targetY,
      width: type === 'Signature' || type === 'Initial' ? 200 : (type === 'Stamp' ? 180 : 160),
      height: type === 'Signature' || type === 'Initial' ? 70 : 40,
      docIndex: activeDocIndex,
      page: targetPage,
      required: true,
      assigneeId: selectedRecipient.id,
      assignee: `${selectedRecipient.name}`,
      assigneeEmail: selectedRecipient.email || '',
      font: 'Roboto',
      fontSize: '11',
      isBold: false,
      isItalic: false,
      ...(type === 'Split text' ? { charCount: 10, charSpace: 0, width: 16, height: 20, gridValue: ['s','-','1','','','','','','',''] } : {}),
      // A sign date is filled with the date the recipient signs
      ...(type === 'Sign date' ? { dateFormat: 'MMM dd yyyy HH:mm z' } : {}),
      ...(type === 'Full name' ? { nameFormat: 'Full Name' } : {}),
      ...(type === 'Checkbox' ? { checked: true } : {})
    };
    setFieldsOnDoc((prev) => [...prev, newField]);
    setActiveField(newField);
    setActivePage(targetPage);
    setShowFieldsPanel(false);
    setTimeout(() => {
      const el = document.getElementById(`doc-field-${newField.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const updateActiveFieldProperty = (propKey, propVal) => {
    if (!activeField) return;
    const fieldId = activeField.id;
    setFieldsOnDoc((prev) => prev.map((f) => (f.id === fieldId ? { ...f, [propKey]: propVal } : f)));
  };

  const deleteActiveField = () => {
    if (!activeField) return;
    const fieldId = activeField.id;
    setFieldsOnDoc((prev) => prev.filter((f) => f.id !== fieldId));
    setActiveField(null);
  };

  const handleCreateCustomField = (e) => {
    e.preventDefault();
    if (!customFieldName) return;

    const { page: targetPage, x: targetX, y: targetY } = getSmartFieldPosition();

    const newField = {
      id: Date.now(),
      type: customFieldType,
      label: customFieldName,
      value: customFieldName,
      x: targetX,
      y: targetY,
      width: 160,
      height: 40,
      docIndex: activeDocIndex,
      page: targetPage,
      required: customFieldRequired,
      assigneeId: selectedRecipient.id,
      assignee: selectedRecipient.name,
      assigneeEmail: selectedRecipient.email || '',
      isCustom: true,
      font: 'Roboto',
      fontSize: '11'
    };
    setFieldsOnDoc((prev) => [...prev, newField]);
    setActiveField(newField);
    setActivePage(targetPage);
    setCustomFieldName('');
    setShowCreateCustomFieldModal(false);
    setTimeout(() => {
      const el = document.getElementById(`doc-field-${newField.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const applyStampCrop = () => {
    if (activeField && activeField.type === 'Stamp') {
      const fieldId = activeField.id;
      setFieldsOnDoc((prev) => prev.map((f) => (f.id === fieldId
        ? { ...f, stampShape, stampZoom, stampRotation, stampImage: stampImageSrc || f.stampImage }
        : f)));
    } else {
      const { page: targetPage, x: targetX, y: targetY } = getSmartFieldPosition();

      const newField = {
        id: Date.now(),
        type: 'Stamp',
        label: 'Stamp',
        value: 'STAMP',
        x: targetX,
        y: targetY,
        width: 180,
        height: 70,
        docIndex: activeDocIndex,
        page: targetPage,
        required: true,
        assigneeId: selectedRecipient.id,
        assignee: selectedRecipient.name,
        assigneeEmail: selectedRecipient.email || '',
        stampShape,
        stampZoom,
        stampRotation,
        stampImage: stampImageSrc
      };
      setFieldsOnDoc((prev) => [...prev, newField]);
      setActiveField(newField);
      setActivePage(targetPage);
      setTimeout(() => {
        const el = document.getElementById(`doc-field-${newField.id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
    setShowStampCropModal(false);
  };

  const openStampCropModalForEditing = () => {
    if (activeField && activeField.type === 'Stamp') {
      setStampShape(activeField.stampShape || 'square');
      setStampZoom(activeField.stampZoom || 100);
      setStampRotation(activeField.stampRotation || 0);
      setStampImageSrc(activeField.stampImage || '');
      setShowStampCropModal(true);
    }
  };

  const datePresets = [
    'MMM dd yyyy HH:mm z',
    'MMM dd yyyy HH:mm:ss',
    'dd/MM/yyyy HH:mm',
    'dd/MM/yyyy HH:mm:ss',
    'dd-MMM-yyyy HH:mm:ss',
    'MMM dd yyyy',
    'dd MMMM yyyy',
    'MMMM dd, yyyy',
    'dd/MM/yyyy',
    'MM/dd/yyyy',
    'MM.dd.yyyy',
    'MM.dd.yy',
    'dd.MM.yyyy',
    'dd.MM.yy',
    'dd MMMM,yyyy',
    'dd-MMM-yy',
    'yyyy/MM/dd',
    'yyyy-MM-dd',
    'MM/yy',
    'dd-MMM-yyyy',
    'dd-MM-yyyy',
    'MMM-dd-yyyy'
  ];

  return (
    <div className="-m-4 sm:-m-6 h-[calc(100vh-4rem)] flex flex-col bg-slate-900 text-slate-100 overflow-hidden font-sans select-none">
      {/* Editor Header Bar (Matching Page 5) */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 px-2 sm:px-6 flex items-center justify-between gap-2 shrink-0">
        {/* Left: Document Name Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              setShowDocsPanel((v) => !v);
              setShowFieldsPanel(false);
            }}
            className="lg:hidden p-1.5 rounded border border-slate-700 text-slate-300 hover:bg-slate-800 shrink-0"
            title="Documents"
            aria-label="Show documents"
          >
            <Layers size={16} />
          </button>
          <div className="hidden sm:block bg-[#007355] text-white p-1.5 rounded font-black text-xs">
            <FileText size={16} />
          </div>
          <div className="relative">
            <div
              onClick={() => setShowDocSwitcherMenu(!showDocSwitcherMenu)}
              className="flex items-center gap-1 cursor-pointer hover:bg-slate-800/80 px-2 py-1 rounded transition"
              title="Click to switch document"
            >
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent border-b border-transparent hover:border-slate-700 text-slate-100 font-bold text-sm px-1 py-0.5 focus:outline-none focus:border-[#007355] w-24 sm:w-56 min-w-0 max-w-xs"
              />
              <ChevronDown size={14} className="text-slate-400" />
            </div>

            {/* Document Switcher Dropdown */}
            {showDocSwitcherMenu && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1.5 z-40 text-xs font-sans">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 flex justify-between items-center">
                  <span>Documents ({documentsList.length})</span>
                </div>
                {documentsList.map((d, i) => {
                  const docFields = fieldsByDoc[i] || [];
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        switchToDocument(i);
                        setShowDocSwitcherMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition cursor-pointer ${
                        activeDocIndex === i ? 'text-emerald-400 font-bold bg-slate-800/60' : 'text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText size={13} className={activeDocIndex === i ? 'text-emerald-400' : 'text-slate-500'} />
                        <span className="truncate">{d.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {docFields.length} field{docFields.length === 1 ? '' : 's'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {statusMsg && (
            <span className={`hidden sm:flex text-xs font-bold items-center gap-1 ${statusMsg.startsWith('Draft not saved') ? 'text-red-400' : 'text-emerald-400'}`}>
              {statusMsg.startsWith('Draft not saved') ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />} {statusMsg}
            </span>
          )}
        </div>

        {/* Center: Page Controls & Zoom Controls (Page 5) */}
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded border border-slate-800">
          <button
            type="button"
            onClick={() => {
              const prev = Math.max(1, activePage - 1);
              setActivePage(prev);
              const el = document.getElementById(`doc-page-${prev}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            disabled={activePage <= 1}
            className="hover:text-white p-1 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-slate-300 font-mono font-bold">{activePage} of {totalPages}</span>
          <button
            type="button"
            onClick={() => {
              const next = Math.min(totalPages, activePage + 1);
              setActivePage(next);
              const el = document.getElementById(`doc-page-${next}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            disabled={activePage >= totalPages}
            className="hover:text-white p-1 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Next Page"
          >
            <ChevronRight size={14} />
          </button>
          <div className="w-[1px] h-3.5 bg-slate-700 mx-1" />
          <button type="button" onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))} className="hover:text-white p-1 cursor-pointer"><ZoomOut size={14} /></button>
          <span className="text-slate-300 font-mono text-[11px] w-10 text-center">{zoomLevel}%</span>
          <button type="button" onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))} className="hover:text-white p-1 cursor-pointer"><ZoomIn size={14} /></button>
          <button type="button" onClick={() => setZoomLevel(100)} className="hover:text-white p-1 cursor-pointer"><Maximize2 size={14} /></button>
          <div className="w-[1px] h-3.5 bg-slate-700 mx-1" />
          <span className="text-emerald-400/90 font-mono text-[10px] font-bold px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 select-none">
            A4 (210 × 297 mm)
          </span>
        </div>

        {/* Right: Actions, Back, and Dark Green Send ▾ (Page 5) */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="px-2 sm:px-3 py-1.5 border border-slate-700 text-slate-300 rounded text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5 transition"
              aria-label="Actions"
            >
              <Sliders size={14} className="sm:hidden" />
              <span className="hidden sm:inline">Actions</span>
              <ChevronDown size={14} className="hidden sm:block" />
            </button>
            {showActionsMenu && (
              <div className="absolute right-0 mt-1.5 w-44 bg-slate-900 border border-slate-800 rounded shadow-xl py-1 z-30 text-xs">
                <button
                  onClick={() => { setShowActionsMenu(false); setShowFieldTemplateModal(true); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                >
                  <Layers size={13} className="text-[#00a884]" /> Apply field template
                </button>
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    setDocContentText(currentDocument.documentText || getDefaultDocContent(currentDocument.name, currentDocument.customMessage));
                    setIsEditingDocRichText(true);
                    setShowEditDocModal(true);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer"
                >
                  <FileText size={13} className="text-[#00a884]" /> Edit document (Word View)
                </button>
                <div className="border-t border-slate-800 my-1" />
                <button
                  onClick={() => { setShowActionsMenu(false); handleSaveDraft().catch(() => {}); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300"
                >
                  Save Draft
                </button>
                <button
                  onClick={async () => {
                    setShowActionsMenu(false);
                    await handleSaveDraft({ silent: true });
                    navigate(requestStatus === 'Draft' ? '/documents/sent/draft' : '/documents');
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300"
                >
                  Save and close
                </button>
                <button
                  onClick={() => { setShowActionsMenu(false); handleContinueToSend(); }}
                  className="sm:hidden w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300"
                >
                  Back to recipients
                </button>
                {requestStatus === 'Draft' && (
                  <button
                    onClick={() => { setShowActionsMenu(false); setShowDiscardModal(true); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-red-400"
                  >
                    Discard draft
                  </button>
                )}
                <button
                  onClick={() => { setShowActionsMenu(false); setFieldsOnDoc([]); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-red-400"
                >
                  Clear Fields
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleContinueToSend}
            className="hidden sm:flex px-3.5 py-1.5 border border-slate-700 text-slate-300 rounded text-xs font-semibold hover:bg-slate-800 items-center gap-1 transition"
          >
            <span>Back</span>
          </button>

          <div className="relative flex items-center">
            <button
              onClick={openSendConfirm}
              className="bg-[#007355] hover:bg-[#005c44] text-white px-3 sm:px-4 py-1.5 rounded-l text-xs font-extrabold flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <span>Send</span>
            </button>
            <button
              onClick={() => setShowSendMenu(!showSendMenu)}
              className="bg-[#005c44] hover:bg-[#004d39] text-white px-1.5 py-1.5 rounded-r border-l border-[#004d39] text-xs transition"
              title="More Send Options"
            >
              <ChevronDown size={14} />
            </button>

            {showSendMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-slate-900 border border-slate-800 rounded shadow-xl py-1 z-30 text-xs">
                <button
                  onClick={() => { setShowSendMenu(false); openSendConfirm(); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200"
                >
                  Send now
                </button>
                <button
                  onClick={() => { setShowSendMenu(false); setShowScheduleModal(true); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-1.5"
                >
                  <Clock size={13} className="text-[#00a884]" /> Send later (Schedule)
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setShowFieldsPanel((v) => !v);
              setShowDocsPanel(false);
            }}
            className="lg:hidden p-1.5 rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
            title="Recipients and fields"
            aria-label="Show recipients and fields"
          >
            <ListFilter size={16} />
          </button>
        </div>
      </header>

      {/* Editor Main Content: Left Thumbnails + Center Canvas + Right Fields (Page 5) */}
      <div className="flex-1 flex overflow-hidden relative">
        {(showDocsPanel || showFieldsPanel) && (
          <div
            className="lg:hidden absolute inset-0 bg-black/50 z-30"
            onClick={() => {
              setShowDocsPanel(false);
              setShowFieldsPanel(false);
            }}
          />
        )}
        {/* Left Sidebar: Documents (Listing all attached documents) */}
        <aside className={`${showDocsPanel ? 'absolute inset-y-0 left-0 z-40 flex shadow-2xl' : 'hidden'} lg:static lg:flex lg:shadow-none w-64 lg:w-52 bg-slate-950 border-r border-slate-800 p-4 flex-col gap-3 shrink-0 font-sans text-xs overflow-y-auto`}>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Documents</h2>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-emerald-400 font-bold font-mono">{documentsList.length}</span>
              <button
                type="button"
                onClick={() => handleAddNewDocFromEditor()}
                className="p-1 hover:bg-slate-800 text-emerald-400 rounded transition cursor-pointer"
                title="Add new document to envelope"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {documentsList.map((doc, idx) => {
              const isSelected = activeDocIndex === idx;
              const docFields = fieldsByDoc[idx] || [];
              const docPages = pagesForDoc(idx);

              return (
                <div
                  key={doc.id || idx}
                  onClick={() => {
                    if (idx !== activeDocIndex) switchToDocument(idx);
                    setShowDocsPanel(false);
                  }}
                  className={`w-full rounded-lg p-2.5 shadow-sm space-y-2 cursor-pointer transition ${
                    isSelected
                      ? 'border-2 border-[#00a884] bg-slate-900 ring-1 ring-emerald-900/50 shadow-md'
                      : 'border border-slate-800 bg-slate-950/60 hover:bg-slate-900/80 hover:border-slate-700'
                  }`}
                  title={`Click to edit fields on ${doc.name}`}
                >
                  <div className="flex items-center justify-between text-slate-300">
                    <span className={`text-xs font-bold truncate ${isSelected ? 'text-[#00a884]' : 'text-slate-200'}`}>
                      {doc.name || `Document ${idx + 1}`}
                    </span>
                    <div className="flex items-center gap-1">
                      {documentsList.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveDocFromEditor(idx);
                          }}
                          className="text-slate-500 hover:text-red-400 p-0.5 rounded transition"
                          title="Remove document"
                        >
                          <X size={12} />
                        </button>
                      )}
                      <ChevronDown size={14} className={isSelected ? 'text-[#00a884]' : 'text-slate-500'} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{docPages} page{docPages > 1 ? 's' : ''}</span>
                    {docFields.length > 0 && (
                      <span className="text-emerald-400 font-semibold font-mono">
                        {docFields.length} field{docFields.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                    {/* Miniature Page Thumbnail Preview(s) */}
                  <div className="space-y-2 mt-1">
                    {Array.from({ length: docPages }).map((_, pIdx) => {
                      const pNum = pIdx + 1;
                      const pFields = docFields.filter(f => (f.page || 1) === pNum);
                      return (
                        <div
                          key={pNum}
                          onClick={(e) => {
                            e.stopPropagation();
                            switchToDocument(idx, pNum);
                            setShowDocsPanel(false);
                          }}
                          className={`w-full h-28 bg-white rounded border p-2 text-[7px] text-slate-400 select-none overflow-hidden relative shadow-inner cursor-pointer transition hover:border-[#00a884] ${
                            isSelected && activePage === pNum ? 'ring-2 ring-[#00a884] border-[#00a884]' : 'border-slate-700'
                          }`}
                        >
                          <div className="flex justify-between items-center border-b border-slate-200 pb-1 mb-1">
                            <p className="font-bold text-slate-800 truncate text-[8px]">{doc.name}</p>
                            <span className="text-[7px] font-bold text-slate-500">P.{pNum}</span>
                          </div>
                          {pNum === 1 ? (
                            <p className="text-slate-500 line-clamp-2 leading-relaxed">
                              {(doc.documentText || getDefaultDocContent(doc.name, doc.customMessage)).replace(/<[^>]+>/g, ' ')}
                            </p>
                          ) : (
                            <p className="text-slate-500 italic">
                              Execution & Signatures Block
                            </p>
                          )}
                          <div className="mt-1 space-y-0.5">
                            {pFields.slice(0, 3).map((f, i) => {
                              const chipColor = recipientForField(f).color;
                              return (
                                <div
                                  key={f.id || i}
                                  style={{ borderColor: chipColor, color: chipColor, backgroundColor: `${chipColor}14` }}
                                  className="border text-[6px] px-1 py-0.5 rounded truncate font-mono font-bold"
                                >
                                  {f.label || f.type}
                                </div>
                              );
                            })}
                            {pFields.length > 3 && (
                              <div className="text-[6px] text-slate-400 font-mono pl-1">
                                +{pFields.length - 3} more fields
                              </div>
                            )}
                          </div>
                          <span className="absolute bottom-1 right-1 bg-slate-200 text-slate-600 text-[8px] px-1 rounded font-bold">
                            {pNum}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Manual Add Page Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newPage = docPages + 1;
                      setExtraPagesForDoc(idx, (extraPagesByDoc[idx] || 0) + 1);
                      switchToDocument(idx, newPage);
                    }}
                    className="w-full py-1.5 px-2 mt-2 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-dashed border-slate-700 hover:border-emerald-600 rounded text-[10px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                    title="Add extra page to this document"
                  >
                    <Plus size={11} />
                    <span>Add Page</span>
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Multi-Page PDF Canvas Preview with Mouse Drag-and-Drop & Direct Inline Editing */}
        <main
          ref={canvasScrollRef}
          className="flex-1 min-w-0 bg-slate-900 p-3 sm:p-8 overflow-auto flex flex-col items-center gap-8 cursor-default"
          onPointerMove={handleMouseMoveOnCanvas}
          onPointerUp={handleMouseUpCanvas}
        >
          {!hasDocuments ? (
            /* Request without documents: nothing is invented, the user adds documents first */
            <div className="my-auto w-full max-w-md bg-slate-950 border border-dashed border-slate-700 rounded-xl p-8 text-center font-sans">
              {initialLoadDone ? (
                <>
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 text-emerald-400 flex items-center justify-center mb-4">
                    <FileText size={26} />
                  </div>
                  <h2 className="text-sm font-bold text-slate-100">This request has no documents yet</h2>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Add the documents you want to send, then come back here to place fields for each recipient.
                  </p>
                  <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(id ? `/documents/${id}/send` : '/send-for-signatures')}
                      className="w-full sm:w-auto px-4 py-2 bg-[#007355] hover:bg-[#005c44] text-white text-xs font-bold rounded-md inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Upload size={14} /> Add documents
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddNewDocFromEditor()}
                      className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold rounded-md inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus size={14} /> Create blank document
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400 font-semibold">Loading documents...</p>
              )}
            </div>
          ) : Array.from({ length: totalPages }).map((_, pIdx) => {
            const pageNum = pIdx + 1;
            const fieldsForThisPage = fieldsOnDoc.filter(f => (f.page || 1) === pageNum);

            return (
              <div key={pageNum} className="flex flex-col items-center w-fit max-w-none mx-auto">
                {/* Visual Page Break Indicator between pages */}
                {pageNum > 1 && (
                  <div className="flex items-center gap-3 text-slate-400 text-xs font-mono select-none my-4">
                    <div className="h-[1px] w-24 bg-slate-700" />
                    <span className="bg-slate-800 text-slate-300 px-3.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 shadow-sm border border-slate-700">
                      <Layers size={13} className="text-[#00a884]" />
                      Page {pageNum} of {totalPages} • A4 (210 × 297 mm)
                    </span>
                    <div className="h-[1px] w-24 bg-slate-700" />
                  </div>
                )}

                {/* MS Word Top Horizontal Ruler above Page 1 (Standard A4: 210mm / 794px) */}
                {pageNum === 1 && (
                  <div
                    style={{ zoom: zoomScale }}
                    className="w-[794px] mb-2 bg-slate-800 border border-slate-700 rounded-t-xs shadow-2xs select-none text-[9px] text-slate-400 font-mono flex items-center justify-between px-1 h-5 relative overflow-hidden print:hidden"
                  >
                    {/* Left Margin Shading */}
                    <div className="absolute left-0 top-0 bottom-0 w-12 bg-slate-700/80 border-r border-slate-600 flex items-center justify-center text-[8px] text-slate-400 font-bold">
                      ◀ L
                    </div>
                    {/* Centered Numbers / Ticks across 210mm */}
                    <div className="flex-1 flex justify-between px-14 text-slate-400 font-medium">
                      <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span><span>11</span><span>12</span><span>13</span><span>14</span><span>15</span><span>16</span><span>17</span><span>18</span>
                    </div>
                    {/* Right Margin Shading */}
                    <div className="absolute right-0 top-0 bottom-0 w-12 bg-slate-700/80 border-l border-slate-600 flex items-center justify-center text-[8px] text-slate-400 font-bold">
                      R ▶
                    </div>
                  </div>
                )}

                {/* Page Sheet Canvas (Exact A4 Proportion: 210mm x 297mm = 794px x 1123px) */}
                <div
                  id={`doc-page-${pageNum}`}
                  ref={pageNum === 1 ? canvasRef : undefined}
                  style={{ zoom: zoomScale }}
                  className="relative w-[794px] min-h-[1123px] max-w-[794px] bg-white text-slate-900 p-12 sm:p-14 shadow-[0_4px_30px_rgba(0,0,0,0.25)] rounded-xs border border-slate-300 flex flex-col justify-between select-text"
                >
                  {/* Page Top Content */}
                  <div className="flex-1 flex flex-col">
                    {pageNum === 1 ? (
                      /* Page 1: Header + Document Clauses */
                      <div ref={docTextContentRef} data-doc-text="true" className="space-y-4 pb-6 border-b border-slate-200">
                        <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                          <div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tight">
                              {documentTitle}
                            </h1>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                              BexSign Document ID: {displayDocId}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setDocContentText(currentDocument.documentText || getDefaultDocContent(currentDocument.name, currentDocument.customMessage));
                              setIsEditingDocRichText(true);
                              setShowEditDocModal(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 flex items-center gap-1 transition cursor-pointer"
                            title="Edit document body content"
                          >
                            <Edit3 size={13} />
                            <span>Edit Content</span>
                          </button>
                        </div>

                        {/* Full Document Clauses & Text */}
                        <div className="text-xs text-slate-700 leading-relaxed font-sans select-text">
                          {/<[a-z][\s\S]*>/i.test(currentDocument.documentText || '') ? (
                            <div dangerouslySetInnerHTML={{ __html: currentDocument.documentText }} className="space-y-2" />
                          ) : (
                            <div className="whitespace-pre-line">
                              {currentDocument.documentText || getDefaultDocContent(currentDocument.name, currentDocument.customMessage)}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Page 2+: Execution & Signatures Block Header */
                      <div data-doc-text="true" className="border-b border-slate-200 pb-4 mb-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h2 className="text-lg font-black text-slate-900 tracking-tight">
                              {documentTitle}
                            </h2>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                              Execution & Signatures • Page {pageNum} of {totalPages}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded font-mono uppercase">
                              Signature Page
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setFieldsOnDoc((prev) => prev.map((f) => {
                                  const fieldPage = f.page || 1;
                                  if (fieldPage === pageNum) return { ...f, page: Math.max(1, pageNum - 1) };
                                  if (fieldPage > pageNum) return { ...f, page: fieldPage - 1 };
                                  return f;
                                }));
                                setExtraPagesForDoc(activeDocIndex, extraPagesCount - 1);
                                setActivePage(Math.max(1, pageNum - 1));
                              }}
                              className="px-2 py-1 text-[10px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded flex items-center gap-1 transition cursor-pointer"
                              title="Remove extra page"
                            >
                              <Trash2 size={11} /> Remove Page
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                          IN WITNESS WHEREOF, the parties hereto have executed this Agreement by affixing their digital signatures and requested verification fields below.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Page Footer */}
                  <div className="border-t border-slate-200 pt-3 mt-6 flex justify-between items-center text-[10px] text-slate-400 font-mono select-none">
                    <span>Page {pageNum} of {totalPages} • BexSign Legal Verification</span>
                    <span>A4 (210 × 297 mm) • SHA-256</span>
                  </div>

                  {/* Render Movable & Direct Inline Editable Canvas Fields for THIS Page */}
                  {fieldsForThisPage.map((field) => {
                    const rec = recipientForField(field);
                    const isSelected = activeField?.id === field.id;
                    const isDragging = draggingFieldId === field.id;
                    const fieldZIndex = isDragging ? 50 : (isSelected ? 40 : 25);

                    // 1. Split Text Character Cells (Pages 15, 17 PDF: Direct Alphanumeric Cell Writing)
                    if (field.type === 'Split text') {
                      const count = field.charCount || 10;
                      const charArray = field.gridValue || ['s','-','1'];

                      return (
                        <div
                          id={`doc-field-${field.id}`}
                          key={field.id}
                          onPointerDown={(e) => handleMouseDownOnField(e, field)}
                          style={{
                            top: `${field.y}px`,
                            left: `${field.x}px`,
                            zIndex: fieldZIndex,
                            borderColor: rec.color,
                            touchAction: 'none'
                          }}
                          className={`absolute cursor-move p-1.5 bg-white border-2 rounded-lg shadow-md transition ${
                            isSelected ? 'border-solid ring-2 ring-offset-1 shadow-xl' : 'border-dashed hover:border-solid hover:shadow-lg'
                          }`}
                        >
                          <div className="flex border bg-white text-xs font-mono font-bold" style={{ gap: `${field.charSpace || 0}px`, borderColor: rec.color, color: rec.color }}>
                            {Array.from({ length: count }).map((_, cIdx) => (
                              <input
                                key={cIdx}
                                type="text"
                                maxLength={1}
                                value={charArray[cIdx] || ''}
                                onChange={(e) => handleSplitCellChange(field.id, cIdx, e.target.value)}
                                onFocus={() => setActiveField(field)}
                                style={{ width: `${field.width || 16}px`, height: `${field.height || 20}px`, borderColor: rec.color, color: rec.color }}
                                className="border-r last:border-r-0 text-center bg-slate-50/60 text-[11px] font-bold focus:bg-slate-100 focus:outline-none"
                              />
                            ))}
                          </div>
                        </div>
                      );
                    }

                    // 2. Checkbox Field (Page 19 PDF)
                    if (field.type === 'Checkbox') {
                      return (
                        <div
                          id={`doc-field-${field.id}`}
                          key={field.id}
                          onPointerDown={(e) => handleMouseDownOnField(e, field)}
                          style={{
                            top: `${field.y}px`,
                            left: `${field.x}px`,
                            zIndex: fieldZIndex,
                            borderColor: rec.color,
                            touchAction: 'none'
                          }}
                          className={`absolute cursor-move p-1.5 bg-white border-2 rounded-lg shadow-md transition ${
                            isSelected ? 'border-solid ring-2 ring-offset-1 shadow-xl' : 'border-dashed hover:border-solid hover:shadow-lg'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (Date.now() - lastDragEndRef.current < 300) return; // the click that ends a drag is not a toggle
                              setFieldsOnDoc((prev) => prev.map((f) => (f.id === field.id ? { ...f, checked: field.checked === false } : f)));
                            }}
                            style={{ borderColor: rec.color, color: rec.color }}
                            className="h-6 w-6 border-2 bg-white flex items-center justify-center font-black text-sm"
                          >
                            {field.checked !== false ? '✓' : ''}
                          </button>
                        </div>
                      );
                    }

                    // 3. Stamp Field with Image & Shape Editing (Pages 9 & 10 PDF)
                    if (field.type === 'Stamp') {
                      return (
                        <div
                          id={`doc-field-${field.id}`}
                          key={field.id}
                          onPointerDown={(e) => handleMouseDownOnField(e, field)}
                          style={{
                            top: `${field.y}px`,
                            left: `${field.x}px`,
                            zIndex: fieldZIndex,
                            borderColor: rec.color,
                            color: rec.color,
                            touchAction: 'none'
                          }}
                          className={`absolute p-2 border-2 bg-white shadow-md cursor-move transition flex flex-col items-center justify-center font-bold text-xs overflow-hidden ${
                            field.stampShape === 'oval' ? 'rounded-full h-20 w-20' : 'rounded-lg h-20 w-28'
                          } ${isSelected ? 'border-solid ring-2 ring-offset-1 shadow-xl' : 'border-dashed hover:border-solid hover:shadow-lg'}`}
                        >
                          {field.stampImage ? (
                            <img
                              src={field.stampImage}
                              alt="Stamp"
                              style={{
                                transform: `scale(${(field.stampZoom || 100) / 100}) rotate(${field.stampRotation || 0}deg)`
                              }}
                              className="max-h-full max-w-full object-contain pointer-events-none"
                            />
                          ) : (
                            <div className="text-center">
                              <ImageIcon size={20} className="mx-auto mb-0.5" />
                              <span className="text-[10px] font-bold tracking-wider uppercase">{field.value || 'Stamp'}</span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // 4. Standard Text-Based Fields (Company, Full Name, Email, Date, Text, Job Title, Signature)
                    return (
                      <div
                        id={`doc-field-${field.id}`}
                        key={field.id}
                        onPointerDown={(e) => handleMouseDownOnField(e, field)}
                        style={{
                          top: `${field.y}px`,
                          left: `${field.x}px`,
                          borderColor: rec.color,
                          backgroundColor: '#ffffff',
                          zIndex: fieldZIndex,
                          touchAction: 'none'
                        }}
                        className={`absolute p-2 border-2 rounded-lg shadow-md cursor-move transition flex items-center gap-2 min-w-[150px] max-w-[260px] bg-white ${
                          isSelected ? 'ring-2 ring-offset-1 scale-105 border-solid shadow-xl' : 'border-dashed hover:border-solid hover:shadow-lg'
                        }`}
                      >
                        <Move size={12} className="opacity-60 shrink-0" style={{ color: rec.color }} />
                        
                        <input
                          type="text"
                          value={field.value !== undefined ? field.value : field.label}
                          onChange={(e) => handleInlineValueChange(field.id, e.target.value)}
                          onFocus={() => setActiveField(field)}
                          style={{
                            color: rec.color,
                            fontFamily: field.font || 'inherit',
                            fontSize: `${field.fontSize || 11}px`,
                            fontWeight: field.isBold ? 'bold' : 'bold',
                            fontStyle: field.isItalic ? 'italic' : 'normal'
                          }}
                          className="w-full min-w-0 bg-transparent focus:outline-none font-bold text-xs p-0 m-0 border-b border-transparent focus:border-current truncate"
                          placeholder={`Write ${field.type}...`}
                        />

                        {field.required && <span className="text-red-600 font-bold shrink-0">*</span>}
                        <Settings size={12} style={{ color: rec.color }} className="opacity-80 shrink-0 cursor-pointer" />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </main>

        {/* Right Sidebar: Field Palette OR Dedicated Field Property Configuration Sidebar Panel */}
        <aside className={`${showFieldsPanel ? 'absolute inset-y-0 right-0 z-40 flex shadow-2xl' : 'hidden'} lg:static lg:flex lg:shadow-none w-[85vw] max-w-sm lg:w-80 bg-slate-950 border-l border-slate-800 p-4 flex-col gap-6 overflow-y-auto shrink-0 font-sans text-xs`}>
          {activeField ? (
            /* Dedicated Property Panel for Active Field (Pages 9 to 19 PDF) */
            <div className="space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h3 className="font-extrabold text-slate-100 text-sm">{activeField.type} Property</h3>
                <button onClick={() => setActiveField(null)} className="text-slate-400 hover:text-slate-200">
                  <X size={18} />
                </button>
              </div>

              {/* Assigned recipient: every field belongs to exactly one recipient */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Assigned to</label>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: recipientForField(activeField)?.color }} />
                  <select
                    value={recipientForField(activeField)?.email || ''}
                    onChange={(e) => {
                      const rec = recipientList.find((r) => r.email === e.target.value);
                      if (!rec) return;
                      const fieldId = activeField.id;
                      setFieldsOnDoc((prev) => prev.map((f) => (f.id === fieldId
                        ? {
                          ...f,
                          assigneeId: rec.id,
                          assignee: rec.name,
                          assigneeEmail: rec.email,
                          recipientId: undefined,
                          ...(f.type === 'Full name' ? { value: rec.name } : {}),
                          ...(f.type === 'Email' ? { value: rec.email } : {})
                        }
                        : f)));
                    }}
                    className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-[#00a884]"
                  >
                    {recipientList.filter(canReceiveFields).map((rec) => (
                      <option key={rec.email || rec.id} value={rec.email}>
                        {rec.name} ({rec.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Position Coordinate & Live Value Editor */}
              <div className="space-y-2">
                <div className="p-2 bg-slate-900 border border-slate-800 rounded flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>X: {Math.round(activeField.x)}px</span>
                  <span>Y: {Math.round(activeField.y)}px</span>
                </div>

                {checkFieldOverlapsText(activeField.id, activeField.page || 1) && (
                  <div className="p-2.5 bg-amber-950/40 border border-amber-600/70 rounded-lg flex items-center justify-between text-xs text-amber-200 animate-in fade-in">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <AlertCircle size={15} className="text-amber-400 shrink-0" />
                      <span className="font-semibold text-[11px] truncate">Overlaps Text</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingOverlapField(activeField);
                        setShowOverlapModal(true);
                      }}
                      className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded text-[10px] cursor-pointer transition shadow-xs shrink-0"
                    >
                      Resolve Overlap
                    </button>
                  </div>
                )}

                {totalPages > 1 && (
                  <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-2 rounded text-xs">
                    <span className="text-slate-400 font-bold text-[11px] uppercase">Placed On</span>
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }).map((_, i) => {
                        const pNum = i + 1;
                        const isFieldOnPage = (activeField.page || 1) === pNum;
                        return (
                          <button
                            key={pNum}
                            type="button"
                            onClick={() => {
                              if (pNum === 1 && (activeField.page || 1) !== 1) {
                                const textHeight = docTextContentRef.current?.offsetHeight || 0;
                                const textBottom = (docTextContentRef.current?.offsetTop || 40) + textHeight;
                                if (activeField.y < textBottom) {
                                  setPendingOverlapField({ ...activeField, page: 1 });
                                  setShowOverlapModal(true);
                                  return;
                                }
                              }
                              updateActiveFieldProperty('page', pNum);
                              setActivePage(pNum);
                              const el = document.getElementById(`doc-page-${pNum}`);
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                              isFieldOnPage ? 'bg-[#00a884] text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            Page {pNum}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Direct Field Content Value</label>
                  <input
                    type="text"
                    value={activeField.value !== undefined ? activeField.value : activeField.label}
                    onChange={(e) => updateActiveFieldProperty('value', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-100 font-bold text-xs"
                    placeholder="Write content..."
                  />
                </div>
              </div>

              {/* Dedicated Stamp Property Panel & Controls (Pages 9 & 10 PDF) */}
              {activeField.type === 'Stamp' && (
                <div className="space-y-4 bg-slate-900 border border-slate-800 p-3 rounded-lg">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase">Stamp Image & Shape Options</label>
                  
                  {/* Edit / Select Stamp Image Button (Pages 9 & 10 PDF) */}
                  <button
                    type="button"
                    onClick={openStampCropModalForEditing}
                    className="w-full bg-[#00a884] hover:bg-[#008f70] text-white py-2 rounded text-xs font-bold flex items-center justify-center gap-1.5 shadow"
                  >
                    <Upload size={14} /> Upload / Edit Stamp Image
                  </button>

                  {/* Stamp Shape Selection Toggle (Pages 9 & 10 PDF) */}
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Change Shape</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateActiveFieldProperty('stampShape', 'square')}
                        className={`py-1.5 border rounded text-xs font-bold ${
                          activeField.stampShape === 'square' ? 'border-[#00a884] bg-emerald-950/60 text-[#00a884]' : 'border-slate-700 text-slate-300'
                        }`}
                      >
                        □ Square
                      </button>
                      <button
                        type="button"
                        onClick={() => updateActiveFieldProperty('stampShape', 'oval')}
                        className={`py-1.5 border rounded text-xs font-bold ${
                          activeField.stampShape === 'oval' ? 'border-[#00a884] bg-emerald-950/60 text-[#00a884]' : 'border-slate-700 text-slate-300'
                        }`}
                      >
                        ◯ Oval
                      </button>
                    </div>
                  </div>

                  {/* Stamp Rotation Button */}
                  <button
                    type="button"
                    onClick={() => updateActiveFieldProperty('stampRotation', ((activeField.stampRotation || 0) + 90) % 360)}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 rounded border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <RotateCw size={14} /> Rotate 90°
                  </button>
                </div>
              )}

              {/* 1. Full Name Field Panel (Page 11 PDF) */}
              {activeField.type === 'Full name' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Format</label>
                    <select
                      value={activeField.nameFormat || 'Full Name'}
                      onChange={(e) => updateActiveFieldProperty('nameFormat', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-semibold"
                    >
                      <option value="Full Name">Full Name</option>
                      <option value="First name">First name</option>
                      <option value="Last name">Last name</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 2. Sign Date Field Panel & Custom Format Builder (Pages 12 to 14 PDF) */}
              {activeField.type === 'Sign date' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Format</label>
                    <div className="flex items-center gap-2">
                      <select
                        value={activeField.dateFormat || 'MMM dd yyyy HH:mm z'}
                        onChange={(e) => updateActiveFieldProperty('dateFormat', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-mono text-[11px]"
                      >
                        {datePresets.map((fmt, idx) => (
                          <option key={idx} value={fmt}>{fmt}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowCustomDateInput(!showCustomDateInput)}
                        className="h-8 w-8 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded flex items-center justify-center text-[#00a884] font-bold shrink-0"
                        title="Add Custom Date Format"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Custom Date Format Input (Page 14 PDF Screenshot) */}
                  {showCustomDateInput && (
                    <div className="p-3 bg-slate-900 border border-[#00a884] rounded-lg space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">custom date format option:</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={customDateInput}
                          onChange={(e) => setCustomDateInput(e.target.value)}
                          placeholder="Enter Date format"
                          className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customDateInput) {
                              updateActiveFieldProperty('dateFormat', customDateInput);
                              setShowCustomDateInput(false);
                            }
                          }}
                          className="h-8 w-8 bg-[#00a884] text-white rounded flex items-center justify-center font-bold shrink-0"
                        >
                          <Check size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Split Textfield Panel (Pages 15 to 17 PDF) */}
              {activeField.type === 'Split text' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase">Split text dimension</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500">Width</span>
                        <input
                          type="number"
                          step="0.5"
                          value={activeField.width || 16}
                          onChange={(e) => updateActiveFieldProperty('width', parseFloat(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500">Height</span>
                        <input
                          type="number"
                          step="0.5"
                          value={activeField.height || 20}
                          onChange={(e) => updateActiveFieldProperty('height', parseFloat(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Character count</label>
                      <input
                        type="number"
                        min="1"
                        value={activeField.charCount || 10}
                        onChange={(e) => updateActiveFieldProperty('charCount', parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Character space</label>
                      <input
                        type="number"
                        step="0.1"
                        value={activeField.charSpace || 0}
                        onChange={(e) => updateActiveFieldProperty('charSpace', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Formatting Toolbar */}
              {['Company', 'Full name', 'Sign date', 'Text', 'Split text', 'Job title', 'Email'].includes(activeField.type) && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase">Formatting</label>
                  <select
                    value={activeField.font || 'Roboto'}
                    onChange={(e) => updateActiveFieldProperty('font', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-semibold"
                  >
                    <option value="Roboto">Roboto</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Inter">Inter</option>
                  </select>
                  <div className="flex items-center gap-2 pt-1">
                    <select
                      value={activeField.fontSize || '11'}
                      onChange={(e) => updateActiveFieldProperty('fontSize', e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200 font-semibold w-16"
                    >
                      <option value="11">11</option>
                      <option value="12">12</option>
                      <option value="14">14</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => updateActiveFieldProperty('isBold', !activeField.isBold)}
                      className={`p-2 border rounded ${activeField.isBold ? 'bg-[#00a884] border-[#00a884] text-white' : 'bg-slate-900 border-slate-700 text-slate-200'}`}
                    >
                      <Bold size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActiveFieldProperty('isItalic', !activeField.isItalic)}
                      className={`p-2 border rounded ${activeField.isItalic ? 'bg-[#00a884] border-[#00a884] text-white' : 'bg-slate-900 border-slate-700 text-slate-200'}`}
                    >
                      <Italic size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-6 border-t border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => alert('Field saved as custom reusable field!')}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded text-xs font-bold"
                >
                  Save as Custom field
                </button>
                <button
                  type="button"
                  onClick={deleteActiveField}
                  className="w-full py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 rounded text-xs font-bold"
                >
                  Delete field
                </button>
              </div>
            </div>
          ) : (
            /* Field Palette Sidebar (Default View) */
            <>
              {/* Recipients (Zoho Sign: select a recipient, then place that recipient's fields) */}
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Recipients</label>
                  <span className="text-[10px] font-bold text-slate-500">{recipientList.length} added</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-snug">
                  Select a recipient, then add their fields{documentsList.length > 1 ? ' on each document' : ''}.
                </p>
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                  {recipientList.map((rec, idx) => {
                    const allowed = canReceiveFields(rec);
                    const isActive = selectedRecipient?.id === rec.id;
                    const totalCount = documentFieldLists().flat().filter((f) => fieldBelongsTo(f, rec)).length;
                    const docCount = fieldsOnDoc.filter((f) => fieldBelongsTo(f, rec)).length;
                    return (
                      <button
                        key={rec.id || rec.email}
                        type="button"
                        onClick={() => allowed && setSelectedRecipient(rec)}
                        disabled={!allowed}
                        title={allowed ? `${docCount} field(s) on this document, ${totalCount} in total` : 'Receives a copy of the completed document - no fields needed'}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs transition flex items-center gap-2.5 ${
                          isActive ? `${rec.border} ${rec.bg} ${rec.text}` : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'
                        } ${allowed ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                      >
                        <span
                          className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black text-white"
                          style={{ backgroundColor: rec.color }}
                        >
                          {idx + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold leading-tight truncate">{rec.name}</span>
                          <span className={`block text-[10px] font-normal truncate mt-0.5 ${isActive ? 'text-slate-600' : 'text-slate-400'}`}>{rec.email}</span>
                          <span className="block text-[10px] font-semibold mt-0.5 text-slate-500">{rec.role}</span>
                        </span>
                        {allowed && (
                          <span className="shrink-0 flex flex-col items-end gap-0.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-white/80 text-slate-700' : 'bg-slate-800 text-slate-300'}`}>
                              {docCount} field{docCount === 1 ? '' : 's'}
                            </span>
                            {documentsList.length > 1 && (
                              <span className={`text-[9px] font-semibold ${isActive ? 'text-slate-600' : 'text-slate-500'}`}>{totalCount} in all docs</span>
                            )}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Standard fields vs Custom fields Tab Selector (PDF 1 p.5, PDF 3 p.3-4) */}
              <div>
                <div className="flex border-b border-slate-800 mb-3 text-xs font-extrabold">
                  <button
                    type="button"
                    onClick={() => setEditorTab('standard')}
                    className={`flex-1 pb-2 text-center transition border-b-2 ${
                      editorTab === 'standard'
                        ? 'border-[#00a884] text-[#00a884]'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Standard fields
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab('custom')}
                    className={`flex-1 pb-2 text-center transition border-b-2 ${
                      editorTab === 'custom'
                        ? 'border-[#00a884] text-[#00a884]'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Custom fields
                  </button>
                </div>

                {editorTab === 'standard' ? (
                  /* Standard Fields Grid */
                  <div className="grid grid-cols-2 gap-2">
                    {standardFields.map((field) => (
                      <button
                        key={field.type}
                        onClick={() => addFieldToCanvas(field.type)}
                        className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-lg flex items-center gap-2 text-xs font-medium text-slate-200 transition text-left"
                      >
                        <span style={{ color: selectedRecipient.color }}>{field.icon}</span>
                        <span className="truncate text-[11px]">{field.type}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Custom Fields Section (PDF 3 p.4) */
                  <div className="space-y-3">
                    {/* + Create Dashed Button */}
                    <button
                      type="button"
                      onClick={() => setShowCreateCustomFieldModal(true)}
                      className="w-full py-2 border-2 border-dashed border-[#00a884]/60 hover:border-[#00a884] text-[#00a884] hover:bg-emerald-950/30 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition"
                    >
                      <Plus size={14} /> Create
                    </button>

                    {/* Search Bar */}
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={customFieldSearch}
                        onChange={(e) => setCustomFieldSearch(e.target.value)}
                        placeholder="Search custom fields..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#00a884]"
                      />
                    </div>

                    {/* Custom Fields List */}
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {customFieldsList
                        .filter(cf => (cf.name || '').toLowerCase().includes(customFieldSearch.toLowerCase()))
                        .map((cf) => (
                          <div
                            key={cf.id}
                            onClick={() => {
                              const newField = {
                                id: Date.now(),
                                type: 'Text',
                                label: cf.name,
                                value: cf.name,
                                x: 200,
                                y: 350,
                                required: true,
                                assigneeId: selectedRecipient.id,
                                assignee: selectedRecipient.name,
                                assigneeEmail: selectedRecipient.email || '',
                                docIndex: activeDocIndex,
                                page: activePage,
                                isCustom: true,
                                font: cf.font || 'Roboto',
                                fontSize: '11'
                              };
                              setFieldsOnDoc((prev) => [...prev, newField]);
                              setActiveField(newField);
                            }}
                            className="p-2 bg-slate-900 border border-slate-800 hover:border-[#00a884] rounded-lg cursor-pointer flex items-center justify-between text-xs font-semibold text-slate-200 transition group"
                          >
                            <span className="truncate">{cf.name}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-[#00a884] font-bold border border-slate-700">
                              A
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Stamp Crop, Rotate & Shape Change Modal (Pages 9 & 10 PDF) */}
      {showStampCropModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Upload stamp</h3>
              <button onClick={() => setShowStampCropModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="border-2 border-dashed border-slate-300 p-6 text-center rounded-lg bg-slate-50 space-y-3">
              {/* Image Preview Canvas Box */}
              <div className="h-32 w-32 mx-auto bg-slate-200 rounded flex items-center justify-center overflow-hidden relative shadow-inner">
                {stampImageSrc ? (
                  <img
                    src={stampImageSrc}
                    alt="Stamp Preview"
                    style={{
                      transform: `scale(${stampZoom / 100}) rotate(${stampRotation}deg)`
                    }}
                    className={`max-h-full max-w-full object-contain ${stampShape === 'oval' ? 'rounded-full' : ''}`}
                  />
                ) : (
                  <div className="text-center text-slate-400">
                    <ImageIcon size={36} className="mx-auto mb-1 opacity-60" />
                    <span className="text-xs font-bold">No Image Selected</span>
                  </div>
                )}
              </div>

              {/* Upload Stamp File Input Button (Pages 9 & 10 PDF) */}
              <div>
                <input
                  ref={stampFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleStampImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => stampFileInputRef.current?.click()}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold text-slate-800 flex items-center gap-1.5 mx-auto"
                >
                  <Upload size={14} /> Change image
                </button>
              </div>

              {/* Zoom Slider (- / +) */}
              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-500 uppercase">Zoom</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">-</span>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={stampZoom}
                    onChange={(e) => setStampZoom(parseInt(e.target.value))}
                    className="w-full accent-[#00a884]"
                  />
                  <span className="text-xs font-bold text-slate-500">+</span>
                </div>
              </div>

              {/* Shape Selectors & Rotation */}
              <div className="flex justify-center gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStampShape('square')}
                  className={`px-3 py-1 border rounded text-xs font-bold ${stampShape === 'square' ? 'border-[#00a884] bg-emerald-50 text-[#00a884]' : 'border-slate-300'}`}
                >
                  □ Square
                </button>
                <button
                  type="button"
                  onClick={() => setStampShape('oval')}
                  className={`px-3 py-1 border rounded text-xs font-bold ${stampShape === 'oval' ? 'border-[#00a884] bg-emerald-50 text-[#00a884]' : 'border-slate-300'}`}
                >
                  ◯ Oval
                </button>
                <button
                  type="button"
                  onClick={() => setStampRotation((stampRotation + 90) % 360)}
                  className="p-1 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 flex items-center gap-1 text-xs font-bold"
                  title="Rotate"
                >
                  <RotateCw size={14} />
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setShowStampCropModal(false)} className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold">
                Close
              </button>
              <button onClick={applyStampCrop} className="bg-[#00a884] hover:bg-[#008f70] text-white px-5 py-1.5 rounded text-xs font-bold shadow">
                Crop & Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Create Custom Field Modal (Matching PDF 3 p.7) */}
      {showCreateCustomFieldModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <form onSubmit={handleCreateCustomField} className="bg-white text-slate-900 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs my-6">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Create custom field</h3>
              <button type="button" onClick={() => setShowCreateCustomFieldModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Custom field name *</label>
                <input
                  type="text"
                  value={customFieldName}
                  onChange={(e) => setCustomFieldName(e.target.value)}
                  placeholder="e.g. My custom field"
                  className="w-full border border-slate-300 rounded p-2 focus:outline-none focus:border-[#00a884]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Type</label>
                <select
                  value={customFieldType}
                  onChange={(e) => setCustomFieldType(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 font-semibold bg-white"
                >
                  <option value="Text">Text</option>
                  <option value="Number">Number</option>
                  <option value="Date">Date</option>
                  <option value="Email">Email</option>
                  <option value="Checkbox">Checkbox</option>
                  <option value="Dropdown">Dropdown</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 font-semibold text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customFieldRequired}
                    onChange={(e) => setCustomFieldRequired(e.target.checked)}
                    className="accent-[#00a884]"
                  /> Required
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customFieldReadOnly}
                    onChange={(e) => setCustomFieldReadOnly(e.target.checked)}
                    className="accent-[#00a884]"
                  /> Read only
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customFieldFixedWidth}
                    onChange={(e) => setCustomFieldFixedWidth(e.target.checked)}
                    className="accent-[#00a884]"
                  /> Fixed width
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customFieldFixedHeight}
                    onChange={(e) => setCustomFieldFixedHeight(e.target.checked)}
                    className="accent-[#00a884]"
                  /> Fixed height
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Default value</label>
                <input
                  type="text"
                  value={customFieldDefaultVal}
                  onChange={(e) => setCustomFieldDefaultVal(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Field name</label>
                <input
                  type="text"
                  value={customFieldInternalName}
                  onChange={(e) => setCustomFieldInternalName(e.target.value)}
                  placeholder="field_identifier"
                  className="w-full border border-slate-300 rounded p-2 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Character limit</label>
                  <input
                    type="number"
                    value={customFieldCharLimit}
                    onChange={(e) => setCustomFieldCharLimit(parseInt(e.target.value) || 2048)}
                    className="w-full border border-slate-300 rounded p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data label</label>
                  <input
                    type="text"
                    value={customFieldDataLabel}
                    onChange={(e) => setCustomFieldDataLabel(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Validation</label>
                <select
                  value={customFieldValidation}
                  onChange={(e) => setCustomFieldValidation(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 font-semibold bg-white"
                >
                  <option value="None">None</option>
                  <option value="Numbers only">Numbers only</option>
                  <option value="Letters only">Letters only</option>
                  <option value="Email format">Email format</option>
                  <option value="Date format">Date format</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Formatting</label>
                <div className="flex items-center gap-2">
                  <select
                    value={customFieldFont}
                    onChange={(e) => setCustomFieldFont(e.target.value)}
                    className="flex-1 border border-slate-300 rounded p-2 font-semibold bg-white"
                  >
                    <option value="Roboto">Roboto</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Arial">Arial</option>
                  </select>
                  <select
                    value={customFieldFontSize}
                    onChange={(e) => setCustomFieldFontSize(e.target.value)}
                    className="w-16 border border-slate-300 rounded p-2 font-semibold bg-white"
                  >
                    <option value="10">10</option>
                    <option value="11">11</option>
                    <option value="12">12</option>
                    <option value="14">14</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setCustomFieldBold(!customFieldBold)}
                    className={`p-2 border rounded font-bold ${customFieldBold ? 'bg-[#00a884] text-white border-[#00a884]' : 'border-slate-300 text-slate-700'}`}
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomFieldItalic(!customFieldItalic)}
                    className={`p-2 border rounded italic ${customFieldItalic ? 'bg-[#00a884] text-white border-[#00a884]' : 'border-slate-300 text-slate-700'}`}
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomFieldStrike(!customFieldStrike)}
                    className={`p-2 border rounded line-through ${customFieldStrike ? 'bg-[#00a884] text-white border-[#00a884]' : 'border-slate-300 text-slate-700'}`}
                  >
                    S
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  value={customFieldDesc}
                  onChange={(e) => setCustomFieldDesc(e.target.value)}
                  placeholder="Optional field instructions..."
                  rows={2}
                  className="w-full border border-slate-300 rounded p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setShowCreateCustomFieldModal(false)} className="px-4 py-1.5 border border-slate-300 rounded text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" className="bg-[#00a884] hover:bg-[#008f70] text-white px-5 py-1.5 rounded text-xs font-bold shadow">
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Apply Field Template Modal (PDF 3 p.6) */}
      {showFieldTemplateModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs font-sans">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Apply field template</h3>
              <button onClick={() => setShowFieldTemplateModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <p className="text-slate-600 font-medium">
              Fields of the chosen template will be added. Make sure there is no overlapping.
            </p>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Field templates</label>
              <select
                value={selectedFieldTemplate}
                onChange={(e) => setSelectedFieldTemplate(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 font-semibold bg-white"
              >
                <option value="">--select--</option>
                <option value="nda">Non-Disclosure Agreement Standard Fields</option>
                <option value="employment">Employee Onboarding & Signature Fields</option>
                <option value="vendor">Vendor Purchase Order Approval Form</option>
              </select>
            </div>

            <div className="flex justify-end items-center gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowFieldTemplateModal(false)}
                className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!selectedFieldTemplate) {
                    alert('Please select a template');
                    return;
                  }
                  // Append standard template fields
                  const templateFields = [
                    { id: Date.now() + 1, type: 'Signature', label: 'Signature', value: selectedRecipient.name, x: 200, y: 350, page: 1, docIndex: activeDocIndex, required: true, assigneeId: selectedRecipient.id, assignee: selectedRecipient.name, assigneeEmail: selectedRecipient.email || '' },
                    { id: Date.now() + 2, type: 'Sign date', label: 'Sign date', value: 'Sep 02 2026', x: 420, y: 350, page: 1, docIndex: activeDocIndex, required: true, assigneeId: selectedRecipient.id, assignee: selectedRecipient.name, assigneeEmail: selectedRecipient.email || '', dateFormat: 'MMM dd yyyy' }
                  ];
                  setFieldsOnDoc(prev => [...prev, ...templateFields]);
                  setShowFieldTemplateModal(false);
                  showPopupAlert('Fields of chosen template successfully added to document!', { title: 'Template Applied', type: 'success' });
                }}
                className="px-5 py-2 bg-[#00a884] hover:bg-[#008f70] text-white rounded text-xs font-bold transition shadow"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Full-View Microsoft Word-Style Document Editor Workspace */}
      {showEditDocModal && isEditingDocRichText && (
        <div className="fixed inset-0 z-50 bg-[#e2e8f0] flex flex-col font-sans select-none overflow-hidden text-slate-800 animate-in fade-in duration-150">
          {/* Top Word Window Title & Action Bar */}
          <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-xs shrink-0 z-30">
            {/* Left: Document Icon & Inline Rename */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#007355] text-white flex items-center justify-center shadow-xs shrink-0">
                <FileText size={18} />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    className="text-sm font-black text-slate-900 bg-transparent hover:bg-slate-100 focus:bg-white px-2 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-[#007355] outline-none transition max-w-sm truncate"
                    title="Click to rename document"
                    placeholder="Document Title"
                  />
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                    <Check size={11} /> Auto-saved
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono px-2 truncate">
                  <span>BexSign Document ID: {displayDocId}</span>
                  <span>•</span>
                  <span>{documentsList.length > 1 ? `Document ${activeDocIndex + 1} of ${documentsList.length}` : 'Primary Document'}</span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (documentsList.length > 1) {
                    setIsEditingDocRichText(false);
                  } else {
                    setIsEditingDocRichText(false);
                    setShowEditDocModal(false);
                  }
                }}
                className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Return to envelope document list"
              >
                <ArrowLeft size={14} />
                <span>Back to documents</span>
              </button>

              <button
                type="button"
                onClick={handleWordPreviewPdf}
                className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                title="Download PDF preview with current content and styling"
              >
                <Eye size={14} className="text-[#007355]" />
                <span>Preview as PDF</span>
              </button>

              <button
                type="button"
                onClick={handleWordSaveAndCreate}
                className="px-5 py-1.5 bg-[#007355] hover:bg-[#005c44] text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition shadow cursor-pointer"
                title="Save changes and apply to document editor canvas"
              >
                <Save size={14} />
                <span>Save & Create</span>
              </button>

              <div className="w-[1px] h-6 bg-slate-200 mx-1" />

              <button
                type="button"
                onClick={() => setIsEditorFullscreen(!isEditorFullscreen)}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                title={isEditorFullscreen ? "Exit full view" : "Enter full view"}
              >
                {isEditorFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsEditingDocRichText(false);
                  setShowEditDocModal(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                title="Close editor"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          {/* Microsoft Word-Style Ribbon Toolbar */}
          <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-1.5 flex-wrap shrink-0 z-20 shadow-2xs text-xs">
            {/* 1. History (Undo / Redo) */}
            <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleWordUndo}
                className="p-1.5 hover:bg-slate-100 text-slate-700 rounded transition cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <Undo size={14} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleWordRedo}
                className="p-1.5 hover:bg-slate-100 text-slate-700 rounded transition cursor-pointer"
                title="Redo (Ctrl+Y)"
              >
                <Redo size={14} />
              </button>
            </div>

            {/* 2. Font Family Selector (WordPad Style Categorized) */}
            <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
              <select
                value={wordFontFamily}
                onFocus={saveSelection}
                onChange={(e) => {
                  setWordFontFamily(e.target.value);
                  applyFontName(e.target.value);
                }}
                className="p-1 text-xs border border-slate-200 rounded bg-slate-50 hover:bg-white focus:border-[#007355] outline-none font-semibold text-slate-700 cursor-pointer max-w-[130px] truncate"
                title="Font Family"
              >
                <optgroup label="Standard Business & UI">
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="Calibri, sans-serif">Calibri</option>
                  <option value="'Segoe UI', sans-serif">Segoe UI</option>
                  <option value="Inter, sans-serif">Inter</option>
                  <option value="Roboto, sans-serif">Roboto</option>
                  <option value="Helvetica, sans-serif">Helvetica</option>
                  <option value="Verdana, sans-serif">Verdana</option>
                  <option value="Tahoma, sans-serif">Tahoma</option>
                  <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                  <option value="'Open Sans', sans-serif">Open Sans</option>
                  <option value="Lato, sans-serif">Lato</option>
                  <option value="Montserrat, sans-serif">Montserrat</option>
                  <option value="Poppins, sans-serif">Poppins</option>
                </optgroup>
                <optgroup label="Formal & Legal Serif">
                  <option value="'Times New Roman', Times, serif">Times New Roman</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="Garamond, serif">Garamond</option>
                  <option value="Cambria, serif">Cambria</option>
                  <option value="Palatino, serif">Palatino</option>
                  <option value="Merriweather, serif">Merriweather</option>
                  <option value="'Playfair Display', serif">Playfair Display</option>
                  <option value="Baskerville, serif">Baskerville</option>
                </optgroup>
                <optgroup label="Monospace & Code">
                  <option value="'Courier New', Courier, monospace">Courier New</option>
                  <option value="Consolas, monospace">Consolas</option>
                  <option value="Monaco, monospace">Monaco</option>
                  <option value="'Fira Code', monospace">Fira Code</option>
                  <option value="'Source Code Pro', monospace">Source Code Pro</option>
                </optgroup>
                <optgroup label="Handwriting & Script">
                  <option value="'Caveat', cursive">Caveat</option>
                  <option value="'Brush Script MT', cursive">Brush Script MT</option>
                  <option value="'Dancing Script', cursive">Dancing Script</option>
                  <option value="'Pacifico', cursive">Pacifico</option>
                  <option value="Impact, fantasy">Impact</option>
                </optgroup>
              </select>
            </div>

            {/* 3. Font Size Controls (px-based ComboBox + Stepper) */}
            <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2 relative">
              {/* Stepper Minus */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveSelection();
                }}
                onClick={() => {
                  const curr = parseInt(wordFontSizeInput || wordFontSize || '14', 10);
                  const next = Math.max(8, curr - 1);
                  applyFontSize(next);
                }}
                className="p-1 hover:bg-slate-100 text-slate-700 rounded font-bold transition cursor-pointer w-6 h-6 flex items-center justify-center border border-slate-200"
                title="Decrease Font Size (1px)"
              >
                <Minus size={11} />
              </button>

              {/* Editable input with unit indicator and dropdown trigger */}
              <div className="relative flex items-center border border-slate-200 rounded bg-slate-50 hover:bg-white focus-within:bg-white focus-within:border-[#007355] transition">
                <input
                  type="text"
                  value={wordFontSizeInput}
                  onChange={(e) => setWordFontSizeInput(e.target.value)}
                  onMouseDown={() => {
                    saveSelection();
                  }}
                  onFocus={() => {
                    saveSelection();
                    setShowFontSizeMenu(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applyFontSize(wordFontSizeInput);
                      e.target.blur();
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const curr = parseInt(wordFontSizeInput || wordFontSize || '14', 10);
                      const next = Math.min(96, curr + 1);
                      applyFontSize(next);
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const curr = parseInt(wordFontSizeInput || wordFontSize || '14', 10);
                      const next = Math.max(8, curr - 1);
                      applyFontSize(next);
                    }
                  }}
                  onBlur={() => {
                    const rawNum = parseInt(String(wordFontSizeInput).replace(/[^0-9]/g, ''), 10);
                    if (rawNum && !isNaN(rawNum)) {
                      applyFontSize(rawNum);
                    } else {
                      setWordFontSizeInput(wordFontSize);
                    }
                  }}
                  className="w-9 text-center text-xs font-bold text-slate-800 outline-none py-0.5"
                  title="Type any font size in px and press Enter"
                  placeholder="14"
                />
                <span className="text-[10px] text-slate-400 font-semibold pr-0.5 select-none">px</span>

                {/* Dropdown toggle arrow */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveSelection();
                  }}
                  onClick={() => {
                    saveSelection();
                    setShowFontSizeMenu(!showFontSizeMenu);
                    setShowColorPicker(false);
                    setShowHighlightPicker(false);
                    setShowTableMenu(false);
                    setShowStylesMenu(false);
                    setShowInsertMenu(false);
                    setShowClausesMenu(false);
                  }}
                  className="px-1 py-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border-l border-slate-200 transition cursor-pointer flex items-center justify-center"
                  title="Select Font Size from list"
                >
                  <ChevronDown size={11} />
                </button>

                {/* Font Size Preset Dropdown Menu */}
                {showFontSizeMenu && (
                  <div className="absolute top-full left-0 mt-1 w-28 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 text-xs animate-in fade-in">
                    <div className="px-2.5 py-1 text-[9px] uppercase font-bold text-slate-400 border-b border-slate-100">
                      Preset Sizes (px)
                    </div>
                    {[8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 48, 56, 64, 72].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          saveSelection();
                        }}
                        onClick={() => {
                          applyFontSize(sz);
                          setShowFontSizeMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-1 hover:bg-emerald-50 hover:text-[#007355] flex items-center justify-between transition cursor-pointer ${
                          String(wordFontSize) === String(sz) ? 'bg-emerald-100 text-[#007355] font-bold' : 'text-slate-700'
                        }`}
                      >
                        <span>{sz} px</span>
                        {String(wordFontSize) === String(sz) && <Check size={11} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Stepper Plus */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveSelection();
                }}
                onClick={() => {
                  const curr = parseInt(wordFontSizeInput || wordFontSize || '14', 10);
                  const next = Math.min(96, curr + 1);
                  applyFontSize(next);
                }}
                className="p-1 hover:bg-slate-100 text-slate-700 rounded font-bold transition cursor-pointer w-6 h-6 flex items-center justify-center border border-slate-200"
                title="Increase Font Size (1px)"
              >
                <Plus size={11} />
              </button>
            </div>

            {/* 4. Text Styles (Bold, Italic, Underline, Strike, Sub, Super, Clear) */}
            <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormat('bold')}
                className={`p-1.5 rounded transition cursor-pointer font-black ${
                  wordIsBold ? 'bg-emerald-100 text-[#007355] border border-emerald-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Bold (Ctrl+B)"
              >
                <Bold size={14} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormat('italic')}
                className={`p-1.5 rounded transition cursor-pointer italic ${
                  wordIsItalic ? 'bg-emerald-100 text-[#007355] border border-emerald-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Italic (Ctrl+I)"
              >
                <Italic size={14} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormat('underline')}
                className={`p-1.5 rounded transition cursor-pointer underline ${
                  wordIsUnderline ? 'bg-emerald-100 text-[#007355] border border-emerald-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Underline (Ctrl+U)"
              >
                <Underline size={14} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormat('strikeThrough')}
                className={`p-1.5 rounded transition cursor-pointer line-through ${
                  wordIsStrike ? 'bg-emerald-100 text-[#007355] border border-emerald-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Strikethrough"
              >
                <Strikethrough size={14} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormat('subscript')}
                className={`p-1.5 rounded transition cursor-pointer ${
                  wordIsSubscript ? 'bg-emerald-100 text-[#007355] border border-emerald-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Subscript (X₂)"
              >
                <Subscript size={14} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormat('superscript')}
                className={`p-1.5 rounded transition cursor-pointer ${
                  wordIsSuperscript ? 'bg-emerald-100 text-[#007355] border border-emerald-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Superscript (X²)"
              >
                <Superscript size={14} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormat('removeFormat')}
                className="p-1.5 hover:bg-slate-100 text-slate-700 rounded transition cursor-pointer"
                title="Clear All Formatting"
              >
                <Eraser size={14} />
              </button>
            </div>

            {/* 5. Colors (WordPad Text Color & Highlight Palette with Custom Picker) */}
            <div className="flex items-center gap-1.5 border-r border-slate-200 pr-2 relative">
              <div className="relative">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    saveSelection();
                    setShowColorPicker(!showColorPicker);
                    setShowHighlightPicker(false);
                    setShowTableMenu(false);
                    setShowStylesMenu(false);
                    setShowInsertMenu(false);
                    setShowClausesMenu(false);
                  }}
                  className="px-2 py-1 hover:bg-slate-100 text-slate-700 rounded border border-slate-200 flex items-center gap-1 transition cursor-pointer font-bold"
                  title="Text Color (WordPad Palette + Custom)"
                >
                  <span style={{ color: wordTextColor === 'transparent' ? '#0f172a' : wordTextColor }} className="text-sm font-black underline">A</span>
                  <div className="w-3 h-3 rounded-full border border-slate-300 shadow-xs" style={{ backgroundColor: wordTextColor }} />
                  <ChevronDown size={11} className="text-slate-400" />
                </button>
                {showColorPicker && (
                  <div className="absolute top-full left-0 mt-1 p-3 bg-white border border-slate-200 rounded-xl shadow-2xl z-40 w-64 animate-in fade-in space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 border-b border-slate-100 pb-1">
                      <span>Palette Colors</span>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyTextColor('#0f172a')}
                        className="text-[10px] text-emerald-700 hover:underline cursor-pointer"
                      >
                        Reset Default
                      </button>
                    </div>
                    {/* 7-column color grid */}
                    <div className="grid grid-cols-7 gap-1.5">
                      {WORDPAD_TEXT_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyTextColor(c)}
                          className="w-6 h-6 rounded-md border border-slate-300 hover:scale-120 hover:z-10 transition cursor-pointer shadow-2xs"
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>

                    {/* Custom Text Color Picker */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={customHexTextColor}
                          onChange={(e) => {
                            setCustomHexTextColor(e.target.value);
                            applyTextColor(e.target.value);
                          }}
                          className="w-7 h-7 p-0 border border-slate-300 rounded cursor-pointer"
                          title="Click to pick any custom color"
                        />
                        <span className="text-[11px] font-medium text-slate-700">Custom:</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={customHexTextColor}
                          onChange={(e) => setCustomHexTextColor(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') applyTextColor(customHexTextColor);
                          }}
                          className="w-16 px-1.5 py-0.5 border border-slate-200 rounded text-[11px] font-mono"
                          placeholder="#000000"
                        />
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyTextColor(customHexTextColor)}
                          className="px-2 py-0.5 bg-[#007355] text-white rounded text-[10px] font-bold hover:bg-[#005c44] cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    saveSelection();
                    setShowHighlightPicker(!showHighlightPicker);
                    setShowColorPicker(false);
                    setShowTableMenu(false);
                    setShowStylesMenu(false);
                    setShowInsertMenu(false);
                    setShowClausesMenu(false);
                  }}
                  className="px-2 py-1 hover:bg-slate-100 text-slate-700 rounded border border-slate-200 flex items-center gap-1 transition cursor-pointer"
                  title="Highlight Background Color"
                >
                  <Highlighter size={13} />
                  <div className="w-3 h-3 rounded border border-slate-300 shadow-xs" style={{ backgroundColor: wordHighlightColor === 'transparent' ? '#ffffff' : wordHighlightColor }} />
                  <ChevronDown size={11} className="text-slate-400" />
                </button>
                {showHighlightPicker && (
                  <div className="absolute top-full left-0 mt-1 p-3 bg-white border border-slate-200 rounded-xl shadow-2xl z-40 w-56 animate-in fade-in space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 border-b border-slate-100 pb-1">
                      <span>Highlight Color</span>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyHighlightColor('transparent')}
                        className="px-2 py-0.5 text-[10px] border border-slate-300 rounded hover:bg-slate-100 cursor-pointer font-medium"
                      >
                        No Color
                      </button>
                    </div>

                    {/* Highlight Grid */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {WORDPAD_HIGHLIGHT_COLORS.map(hc => (
                        <button
                          key={hc}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyHighlightColor(hc)}
                          className="w-7 h-6 rounded border border-slate-300 hover:scale-115 transition cursor-pointer"
                          style={{ backgroundColor: hc }}
                          title={hc}
                        />
                      ))}
                    </div>

                    {/* Custom Highlight Color Picker */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={customHexBgColor}
                          onChange={(e) => {
                            setCustomHexBgColor(e.target.value);
                            applyHighlightColor(e.target.value);
                          }}
                          className="w-7 h-7 p-0 border border-slate-300 rounded cursor-pointer"
                          title="Pick custom background highlight"
                        />
                        <span className="text-[11px] font-medium text-slate-700">Custom:</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={customHexBgColor}
                          onChange={(e) => setCustomHexBgColor(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') applyHighlightColor(customHexBgColor);
                          }}
                          className="w-16 px-1.5 py-0.5 border border-slate-200 rounded text-[11px] font-mono"
                          placeholder="#ffff00"
                        />
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyHighlightColor(customHexBgColor)}
                          className="px-2 py-0.5 bg-[#007355] text-white rounded text-[10px] font-bold hover:bg-[#005c44] cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 6. Text Alignment & Line Spacing */}
            <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyAlignment('left')}
                className={`p-1.5 rounded transition cursor-pointer ${
                  wordTextAlign === 'left' ? 'bg-emerald-100 text-[#007355] border border-emerald-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Align Left"
              >
                <AlignLeft size={14} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyAlignment('center')}
                className={`p-1.5 rounded transition cursor-pointer ${
                  wordTextAlign === 'center' ? 'bg-emerald-100 text-[#007355] border border-emerald-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Align Center"
              >
                <AlignCenter size={14} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyAlignment('right')}
                className={`p-1.5 rounded transition cursor-pointer ${
                  wordTextAlign === 'right' ? 'bg-emerald-100 text-[#007355] border border-emerald-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Align Right"
              >
                <AlignRight size={14} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyAlignment('justify')}
                className={`p-1.5 rounded transition cursor-pointer ${
                  wordTextAlign === 'justify' ? 'bg-emerald-100 text-[#007355] border border-emerald-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Justify"
              >
                <AlignJustify size={14} />
              </button>

              <select
                value={wordLineHeight}
                onFocus={saveSelection}
                onChange={(e) => {
                  applyLineHeight(e.target.value);
                }}
                className="ml-1 p-1 text-[11px] border border-slate-200 rounded bg-slate-50 hover:bg-white text-slate-700 font-semibold cursor-pointer"
                title="Line Spacing"
              >
                <option value="1.2">Single (1.2)</option>
                <option value="1.4">1.4 lines</option>
                <option value="1.6">1.6 (Standard)</option>
                <option value="1.8">1.8 lines</option>
                <option value="2.0">Double (2.0)</option>
              </select>
            </div>

            {/* 7. Lists & Indent */}
            <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormat('insertUnorderedList')}
                className={`p-1.5 rounded transition cursor-pointer ${
                  wordIsBulletedList ? 'bg-emerald-100 text-[#007355] border border-emerald-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Bulleted List (Dots)"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormat('insertOrderedList')}
                className={`p-1.5 rounded transition cursor-pointer ${
                  wordIsNumberedList ? 'bg-emerald-100 text-[#007355] border border-emerald-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Numbered List (1, 2, 3)"
              >
                <ListOrdered size={14} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormat('outdent')}
                className="p-1.5 hover:bg-slate-100 text-slate-700 rounded transition cursor-pointer"
                title="Decrease Indent"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormat('indent')}
                className="p-1.5 hover:bg-slate-100 text-slate-700 rounded transition cursor-pointer"
                title="Increase Indent"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* 8. Headings / Styles Menu */}
            <div className="relative border-r border-slate-200 pr-2">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  saveSelection();
                  setShowStylesMenu(!showStylesMenu);
                  setShowClausesMenu(false);
                  setShowInsertMenu(false);
                }}
                className="px-2.5 py-1 hover:bg-slate-100 text-slate-700 rounded border border-slate-200 flex items-center gap-1 font-semibold transition cursor-pointer"
                title="Text Styles & Headings"
              >
                <Type size={13} />
                <span>Styles</span>
                <ChevronDown size={12} />
              </button>
              {showStylesMenu && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-40 text-xs animate-in fade-in">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      insertHtmlAtCursor(`<h1 style="font-size: 22pt; font-weight: bold; margin: 16px 0; color: #0f172a; text-align: center;">${documentTitle.replace(/\.pdf$/i, '').toUpperCase()}</h1>`);
                      setShowStylesMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-black text-sm text-slate-900 cursor-pointer"
                  >
                    Document Title (Large)
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      applyFormat('formatBlock', '<h2>');
                      setShowStylesMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 font-bold text-slate-800 cursor-pointer"
                  >
                    Heading 1 (1. TITLE)
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      applyFormat('formatBlock', '<h3>');
                      setShowStylesMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer"
                  >
                    Heading 2 (1.1 Sub-term)
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      transformCase('upper');
                      setShowStylesMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 text-slate-600 font-mono cursor-pointer"
                  >
                    UPPERCASE Transform
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      transformCase('title');
                      setShowStylesMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 text-slate-600 font-sans cursor-pointer"
                  >
                    Title Case Transform
                  </button>
                </div>
              )}
            </div>

            {/* 9. Insert Tools Menu */}
            <div className="relative border-r border-slate-200 pr-2">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  saveSelection();
                  setShowInsertMenu(!showInsertMenu);
                  setShowStylesMenu(false);
                  setShowClausesMenu(false);
                }}
                className="px-2.5 py-1 hover:bg-slate-100 text-slate-700 rounded border border-slate-200 flex items-center gap-1 font-semibold transition cursor-pointer"
                title="Insert Elements"
              >
                <Plus size={13} />
                <span>Insert</span>
                <ChevronDown size={12} />
              </button>
              {showInsertMenu && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-40 text-xs animate-in fade-in">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      insertHtmlAtCursor('<hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;" />');
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                  >
                    <Minus size={14} /> Horizontal Divider Line
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      insertHtmlAtCursor(`<span>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>`);
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                  >
                    <Calendar size={14} /> Current Date Stamp
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      insertHtmlAtCursor('<p style="margin: 16px 0; font-family: monospace; color: #475569;">[SIGNATURE FIELD PLACEHOLDER: ______________________]&nbsp;&nbsp;&nbsp;[DATE: __________________]</p>');
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                  >
                    <PenTool size={14} /> Signature Line Marker
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const effDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      const sName = recipientList[0]?.name || 'Vimal Chavda';
                      const sEmail = recipientList[0]?.email || 'vimal@bexcodeservices.com';
                      insertHtmlAtCursor(`
                        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 10pt; border: 1px solid #cbd5e1;">
                          <thead>
                            <tr style="background: #f8fafc; border-bottom: 1px solid #cbd5e1;">
                              <th style="padding: 8px 12px; text-align: left; width: 50%; border-right: 1px solid #cbd5e1;">PARTY A: Disclosing Entity</th>
                              <th style="padding: 8px 12px; text-align: left; width: 50%;">PARTY B: Receiving Entity</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                              <td style="padding: 8px 12px; border-right: 1px solid #cbd5e1;"><strong>Entity:</strong> Bexcode Services<br/><strong>Title:</strong> Corporate Sponsor<br/><strong>Email:</strong> manu.yadav@oladigital.health</td>
                              <td style="padding: 8px 12px;"><strong>Signer:</strong> ${sName}<br/><strong>Title:</strong> Designated Signatory<br/><strong>Email:</strong> ${sEmail}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 12px; border-right: 1px solid #cbd5e1;"><strong>Effective Date:</strong> ${effDate}</td>
                              <td style="padding: 8px 12px;"><strong>Expiration:</strong> Forever / Evergreen</td>
                            </tr>
                          </tbody>
                        </table>
                      `);
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                  >
                    <Table size={14} /> 2-Column Parties Grid
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const todayStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                      const sName = recipientList[0]?.name || 'Vimal Chavda';
                      insertHtmlAtCursor(`
                        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #cbd5e1; font-size: 10pt;">
                          <p style="margin-bottom: 16px;"><strong>IN WITNESS WHEREOF</strong>, the parties hereto have duly executed this Agreement as of the Effective Date.</p>
                          <div style="display: flex; justify-content: space-between; gap: 32px; margin-top: 20px;">
                            <div style="flex: 1;">
                              <p style="font-weight: bold; margin-bottom: 8px; color: #0f172a;">COMPANY:</p>
                              <p>Bexcode Services</p>
                              <p style="margin-top: 24px;">By: _________________________________</p>
                              <p>Name: Manu Yadav</p>
                              <p>Title: Authorized Officer</p>
                              <p>Date: ${todayStr}</p>
                            </div>
                            <div style="flex: 1;">
                              <p style="font-weight: bold; margin-bottom: 8px; color: #0f172a;">RECIPIENT / SIGNER:</p>
                              <p style="color: transparent;">-</p>
                              <p style="margin-top: 24px;">By: _________________________________</p>
                              <p>Name: ${sName}</p>
                              <p>Title: Designated Signatory</p>
                              <p>Date: ${todayStr}</p>
                            </div>
                          </div>
                        </div>
                      `);
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-bold cursor-pointer"
                  >
                    <FileCheck size={14} className="text-[#007355]" /> Two-Party Execution Block
                  </button>
                </div>
              )}
            </div>

            {/* 10. Table Tools (WordPad / Word Style) */}
            <div className="relative border-r border-slate-200 pr-2">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  saveSelection();
                  setShowTableMenu(!showTableMenu);
                  setShowStylesMenu(false);
                  setShowInsertMenu(false);
                  setShowClausesMenu(false);
                  setShowColorPicker(false);
                  setShowHighlightPicker(false);
                }}
                className={`px-2.5 py-1 rounded border flex items-center gap-1 font-semibold transition cursor-pointer ${
                  showTableMenu ? 'bg-emerald-50 text-[#007355] border-emerald-300' : 'hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title="Table Tools & Management"
              >
                <Table size={13} />
                <span>Table</span>
                <ChevronDown size={12} />
              </button>
              {showTableMenu && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-40 text-xs animate-in fade-in">
                  <div className="px-3 py-1 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                    Insert Table
                  </div>
                  <div className="grid grid-cols-2 gap-1 p-2 border-b border-slate-100">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => insertTable(2, 2)}
                      className="px-2 py-1.5 text-center bg-slate-50 hover:bg-emerald-50 hover:text-[#007355] hover:border-emerald-300 border border-slate-200 rounded font-semibold transition cursor-pointer"
                    >
                      2 × 2 Table
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => insertTable(3, 3)}
                      className="px-2 py-1.5 text-center bg-slate-50 hover:bg-emerald-50 hover:text-[#007355] hover:border-emerald-300 border border-slate-200 rounded font-semibold transition cursor-pointer"
                    >
                      3 × 3 Table
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => insertTable(4, 3)}
                      className="px-2 py-1.5 text-center bg-slate-50 hover:bg-emerald-50 hover:text-[#007355] hover:border-emerald-300 border border-slate-200 rounded font-semibold transition cursor-pointer"
                    >
                      4 × 3 Table
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => insertTable(5, 4)}
                      className="px-2 py-1.5 text-center bg-slate-50 hover:bg-emerald-50 hover:text-[#007355] hover:border-emerald-300 border border-slate-200 rounded font-semibold transition cursor-pointer"
                    >
                      5 × 4 Table
                    </button>
                  </div>

                  <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 bg-slate-50 border-b border-slate-100">
                    Row & Column Operations (Active Cell)
                  </div>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { insertTableRow('above'); setShowTableMenu(false); }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                  >
                    <Plus size={12} className="text-emerald-600" /> Insert Row Above
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { insertTableRow('below'); setShowTableMenu(false); }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                  >
                    <Plus size={12} className="text-emerald-600" /> Insert Row Below
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { insertTableCol('left'); setShowTableMenu(false); }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                  >
                    <Plus size={12} className="text-blue-600" /> Insert Column Left
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { insertTableCol('right'); setShowTableMenu(false); }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                  >
                    <Plus size={12} className="text-blue-600" /> Insert Column Right
                  </button>

                  <div className="border-t border-slate-100 my-1" />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { deleteTableRow(); setShowTableMenu(false); }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 size={12} /> Delete Current Row
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { deleteTableCol(); setShowTableMenu(false); }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 size={12} /> Delete Current Column
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { deleteTable(); setShowTableMenu(false); }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-red-50 text-red-700 font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 size={12} /> Delete Entire Table
                  </button>
                </div>
              )}
            </div>

            {/* 11. Legal Clauses / Presets Dropdown */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  saveSelection();
                  setShowClausesMenu(!showClausesMenu);
                  setShowStylesMenu(false);
                  setShowInsertMenu(false);
                  setShowTableMenu(false);
                  setShowColorPicker(false);
                  setShowHighlightPicker(false);
                }}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#007355] border border-emerald-200 rounded flex items-center gap-1 font-bold transition cursor-pointer"
                title="Insert standard legal agreement clauses"
              >
                <Sparkles size={13} />
                <span>Legal Clauses</span>
                <ChevronDown size={12} />
              </button>
              {showClausesMenu && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-40 text-xs animate-in fade-in">
                  <div className="px-3 py-1 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                    Insert Clause at Cursor
                  </div>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      insertHtmlAtCursor('<p style="margin-bottom: 8px;"><strong>CONFIDENTIALITY AND NON-DISCLOSURE</strong></p><p style="margin-bottom: 12px; line-height: 1.6;">All proprietary, commercial, financial, and technical information disclosed under this Agreement shall remain strictly confidential. Neither party shall disclose or use confidential information without the prior written consent of the disclosing party.</p>');
                      setShowClausesMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 text-slate-800 font-medium cursor-pointer"
                  >
                    Confidentiality & Non-Disclosure
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      insertHtmlAtCursor('<p style="margin-bottom: 8px;"><strong>COMPENSATION AND INVOICING TERMS</strong></p><p style="margin-bottom: 12px; line-height: 1.6;">Compensation for all services rendered shall be invoiced on a monthly basis and payable within thirty (30) calendar days from receipt of invoice. Late payments shall bear interest at 1.5% per month or the highest statutory rate.</p>');
                      setShowClausesMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 text-slate-800 font-medium cursor-pointer"
                  >
                    Compensation & Payment
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      insertHtmlAtCursor('<p style="margin-bottom: 8px;"><strong>TERM AND TERMINATION</strong></p><p style="margin-bottom: 12px; line-height: 1.6;">This Agreement commences on the Effective Date and continues until terminated by either party upon thirty (30) days prior written notice, or immediately upon written notice in the event of an uncured material breach after fifteen (15) days.</p>');
                      setShowClausesMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 text-slate-800 font-medium cursor-pointer"
                  >
                    Term & Termination
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      insertHtmlAtCursor('<p style="margin-bottom: 8px;"><strong>GOVERNING LAW AND JURISDICTION</strong></p><p style="margin-bottom: 12px; line-height: 1.6;">This Agreement shall be governed by, and construed in accordance with, the laws of the State of Delaware, without giving effect to conflicts of law principles. Any legal action arising hereunder shall be filed exclusively in the courts of that jurisdiction.</p>');
                      setShowClausesMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 text-slate-800 font-medium cursor-pointer"
                  >
                    Governing Law & Jurisdiction
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      insertHtmlAtCursor('<p style="margin-bottom: 8px;"><strong>SEVERABILITY AND ENTIRE AGREEMENT</strong></p><p style="margin-bottom: 12px; line-height: 1.6;">If any provision of this Agreement is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect. This Agreement constitutes the complete understanding between the parties with respect to the subject matter hereof.</p>');
                      setShowClausesMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 text-slate-800 font-medium cursor-pointer"
                  >
                    Severability & Entire Agreement
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <div className="px-3 py-1 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                    Replace Entire Document
                  </div>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (window.confirm('Replace document content with Standard Employment Agreement?')) {
                        const h = convertPlainTextToHtml(DEFAULT_DOCUMENT_TEXTS.employment);
                        if (wordEditorRef.current) wordEditorRef.current.innerHTML = h;
                        setDocContentText(h);
                        setShowClausesMenu(false);
                      }
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 text-[#007355] font-semibold cursor-pointer"
                  >
                    Load Full Employment Template
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (window.confirm('Replace document content with Non-Disclosure Agreement (NDA)?')) {
                        const h = convertPlainTextToHtml(DEFAULT_DOCUMENT_TEXTS.nda);
                        if (wordEditorRef.current) wordEditorRef.current.innerHTML = h;
                        setDocContentText(h);
                        setShowClausesMenu(false);
                      }
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 text-[#007355] font-semibold cursor-pointer"
                  >
                    Load Full NDA Template
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (window.confirm('Replace document content with Master Services Agreement?')) {
                        const h = convertPlainTextToHtml(DEFAULT_DOCUMENT_TEXTS.service);
                        if (wordEditorRef.current) wordEditorRef.current.innerHTML = h;
                        setDocContentText(h);
                        setShowClausesMenu(false);
                      }
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 text-[#007355] font-semibold cursor-pointer"
                  >
                    Load Full Services Template
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Center Workspace (A4 Document Canvas) */}
          <main
            onClick={() => {
              setShowColorPicker(false);
              setShowHighlightPicker(false);
              setShowClausesMenu(false);
              setShowStylesMenu(false);
              setShowInsertMenu(false);
              setShowTableMenu(false);
              setShowFontSizeMenu(false);
            }}
            className="flex-1 bg-slate-200/90 overflow-y-auto p-4 sm:p-10 flex flex-col items-center print:p-0 print:bg-white"
          >
            {/* MS Word Top Horizontal Ruler (Standard A4: 210mm / 794px) */}
            <div
              style={{
                transform: `scale(${wordEditorZoom / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease'
              }}
              className="w-[794px] mb-2 bg-slate-100 border border-slate-300 rounded-t-xs shadow-2xs select-none text-[9px] text-slate-500 font-mono flex items-center justify-between px-1 h-5 relative overflow-hidden print:hidden"
            >
              {/* Left Margin Shading (1 inch / 25.4mm) */}
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-slate-200/90 border-r border-slate-300 flex items-center justify-center text-[8px] text-slate-400 font-bold">
                ◀ L
              </div>
              {/* Centered Numbers / Ticks across 210mm */}
              <div className="flex-1 flex justify-between px-14 text-slate-400 font-medium">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span><span>11</span><span>12</span><span>13</span><span>14</span><span>15</span><span>16</span><span>17</span><span>18</span>
              </div>
              {/* Right Margin Shading */}
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-slate-200/90 border-l border-slate-300 flex items-center justify-center text-[8px] text-slate-400 font-bold">
                R ▶
              </div>
            </div>

            {/* Authentic A4 Document Canvas */}
            <div
              style={{
                transform: `scale(${wordEditorZoom / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease'
              }}
              className="w-[794px] min-h-[1123px] max-w-[794px] bg-white rounded-xs border border-slate-300 shadow-[0_4px_30px_rgba(0,0,0,0.18)] p-12 sm:p-14 flex flex-col justify-between relative transition-all"
            >
              {/* Document Header Metadata Line */}
              <div className="border-b border-slate-200 pb-3 mb-6 flex justify-between items-center text-[10px] text-slate-400 font-mono select-none">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-600 uppercase tracking-wider">{documentTitle.replace(/\.pdf$/i, '')}</span>
                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 text-[9px] font-semibold">
                    A4 (210 × 297 mm)
                  </span>
                </div>
                <span>{displayDocId}</span>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col">
                <div
                  ref={wordEditorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={() => {
                    syncEditorContent();
                    updateActiveFormatting();
                  }}
                  onKeyUp={() => {
                    saveSelection();
                    updateActiveFormatting();
                  }}
                  onMouseUp={() => {
                    saveSelection();
                    updateActiveFormatting();
                  }}
                  onSelect={() => {
                    saveSelection();
                    updateActiveFormatting();
                  }}
                  onTouchEnd={() => {
                    saveSelection();
                    updateActiveFormatting();
                  }}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                      e.preventDefault();
                      applyFormat('bold');
                    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
                      e.preventDefault();
                      applyFormat('italic');
                    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
                      e.preventDefault();
                      applyFormat('underline');
                    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                      e.preventDefault();
                      if (e.shiftKey) handleWordRedo();
                      else handleWordUndo();
                    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                      e.preventDefault();
                      handleWordRedo();
                    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                      e.preventDefault();
                      handleWordSaveAndCreate();
                    } else if (e.key === 'Tab') {
                      e.preventDefault();
                      document.execCommand('insertText', false, '    ');
                      syncEditorContent();
                    }
                  }}
                  style={{
                    fontFamily: wordFontFamily,
                    fontSize: `${wordFontSize}px`,
                    textAlign: wordTextAlign,
                    lineHeight: wordLineHeight,
                    minHeight: '820px',
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    wordBreak: 'break-word'
                  }}
                  className="flex-1 w-full focus:outline-none selection:bg-emerald-200 leading-relaxed font-sans text-slate-800 cursor-text"
                />
              </div>

              {/* Document Page Footer */}
              <div className="border-t border-slate-200 pt-3 mt-6 flex justify-between items-center text-[10px] text-slate-400 font-mono select-none">
                <span>BexSign Legal Verification • Page 1 of {Math.max(1, Math.ceil((docContentText || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length / 380))}</span>
                <span>SHA-256 Digital Signature Standard</span>
              </div>
            </div>
          </main>

          {/* Bottom Word Status Bar */}
          <footer className="h-8 bg-white border-t border-slate-200 px-4 sm:px-6 flex items-center justify-between text-[11px] text-slate-500 font-medium shrink-0 z-20 select-none">
            {/* Left: Document Metrics */}
            {(() => {
              const plain = (docContentText || '').replace(/<[^>]+>/g, ' ');
              const words = plain.trim().split(/\s+/).filter(Boolean);
              const wordCount = words.length;
              const charCount = plain.length;
              const pages = Math.max(1, Math.ceil(wordCount / 380));
              const readTime = Math.max(1, Math.ceil(wordCount / 200));
              return (
                <div className="flex items-center gap-4">
                  <span>Page 1 of {pages}</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-700">{wordCount} words</span>
                  <span>•</span>
                  <span>{charCount} characters</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">~{readTime} min read</span>
                </div>
              );
            })()}

            {/* Right: Active Typography Info & Zoom */}
            <div className="flex items-center gap-3">
              <span className="hidden md:inline font-mono text-[10px] text-slate-400">
                {wordFontFamily.replace(/,.*$/, '')} • {wordFontSize}pt • Spacing {wordLineHeight}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setWordEditorZoom(prev => Math.max(60, prev - 10))}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setWordEditorZoom(100)}
                  className="px-1.5 py-0.5 hover:bg-slate-100 rounded text-[10px] font-mono font-bold text-slate-700 cursor-pointer"
                  title="Reset Zoom"
                >
                  {wordEditorZoom}%
                </button>
                <button
                  type="button"
                  onClick={() => setWordEditorZoom(prev => Math.min(160, prev + 10))}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn size={13} />
                </button>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* 2. Documents List Switcher Modal inside envelope */}
      {showEditDocModal && !isEditingDocRichText && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-6 text-xs font-sans">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Edit documents
              </h3>
              <button onClick={() => { setShowEditDocModal(false); setIsEditingDocRichText(false); }} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {documentsList.map((docItem, idx) => (
                  <div
                    key={docItem.id || idx}
                    className={`p-4 border rounded-xl flex items-start justify-between transition ${
                      activeDocIndex === idx ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-300' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-14 bg-white border border-slate-300 rounded shadow-xs p-1 flex flex-col justify-between text-[7px] text-slate-400 shrink-0">
                        <span className="font-bold text-slate-700 truncate">{docItem.name || `Document ${idx + 1}`}</span>
                        <span className="text-[6px] text-emerald-600 font-bold">{docItem.pages || 1} page</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 text-sm truncate">{docItem.name || `Document ${idx + 1}`}</h4>
                        <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-2 leading-relaxed">
                          {(docItem.documentText || getDefaultDocContent(docItem.name, docItem.customMessage)).replace(/<[^>]+>/g, ' ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          switchToDocument(idx);
                          setDocContentText(docItem.documentText || getDefaultDocContent(docItem.name, docItem.customMessage));
                          setIsEditingDocRichText(true);
                        }}
                        className="px-3 py-1.5 bg-[#007355] hover:bg-[#005c44] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                      >
                        <Edit3 size={13} />
                        <span>Open in Word Editor</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditDocModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule / Send Later Modal (PDF 3 p.4) */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs font-sans">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Schedule</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Date and time</label>
                <input
                  type="text"
                  value={scheduleDateTime}
                  onChange={(e) => setScheduleDateTime(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 font-bold font-mono text-xs focus:outline-none focus:border-[#00a884]"
                  placeholder="Sep 02, 2026 14:49"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Time zone</label>
                <select
                  value={scheduleTimeZone}
                  onChange={(e) => setScheduleTimeZone(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 font-semibold text-xs bg-white focus:outline-none focus:border-[#00a884]"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</option>
                  <option value="America/New_York">America/New_York (EST -05:00)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="Europe/London">Europe/London (BST +01:00)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end items-center gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowScheduleModal(false);
                  showPopupAlert(`Document scheduled for ${scheduleDateTime} (${scheduleTimeZone}) and will auto-dispatch.`, {
                    title: 'Scheduled',
                    type: 'success'
                  });
                  navigate('/documents');
                }}
                className="px-5 py-2 bg-[#00a884] hover:bg-[#008f70] text-white rounded-lg font-bold transition shadow"
              >
                Schedule & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlap On Text Confirmation Popup Modal */}
      {showOverlapModal && pendingOverlapField && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans text-slate-900">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <AlertCircle size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Overlap on Document Text?</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOverlapModal(false);
                      setPendingOverlapField(null);
                    }}
                    className="text-slate-400 hover:text-slate-700 p-1"
                  >
                    <X size={18} />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Field collision detected with document text</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
              <p className="text-xs text-slate-700 leading-relaxed">
                The field <strong className="text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-[11px]">{pendingOverlapField.label || pendingOverlapField.type || 'Field'}</strong> is placed over document text.
              </p>
              <p className="text-xs text-slate-600">
                Do you want to allow this field to overlap on the text, or move it to the blank space?
              </p>
            </div>

            <div className="flex justify-end items-center gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleRejectOverlap}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 transition cursor-pointer"
              >
                No, Move to Blank Space
              </button>
              <button
                type="button"
                onClick={handleConfirmOverlap}
                className="px-4 py-2 bg-[#007355] hover:bg-[#005c44] text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Yes, Place Over Text
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard Draft Confirmation */}
      {showDiscardModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans text-slate-900">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4" role="dialog" aria-modal="true">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Discard this draft?</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  The documents, recipients and fields of this request will be deleted. To keep working later, choose Save and close instead.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDiscardModal(false)}
                className="px-4 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Details Popup Modal (PDF 1 p.6) with SMTP Email Trigger */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans text-slate-900">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Confirm details</h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Please verify the number of fields added for each recipient and confirm
            </p>

            {sendPlan.isResend && (
              <div role="note" className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-900">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>This request was already sent{sendPlan.alreadySigned.length > 0 ? ` and signed by ${sendPlan.alreadySigned.map((r) => r.name || r.email).join(', ')}` : ''}.</strong>{' '}
                  Sending it again restarts signing: previous signatures are cleared and every recipient signs again, starting from the first step.
                </p>
              </div>
            )}

            {/* Recipient verification table */}
            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                    <th className="py-2.5 pl-4 pr-1 w-12" title={sendPlan.isParallel ? 'Everyone is emailed at once' : 'Signing order'}>Order</th>
                    <th className="py-2.5 px-4">Recipient</th>
                    <th className="py-2.5 px-4 text-center">Docs</th>
                    <th className="py-2.5 px-4 text-right">Fields</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recipientList.map((rec) => {
                    const recFields = documentFieldLists().flat().filter((f) => fieldBelongsTo(f, rec));
                    const docsWithFields = documentFieldLists().filter((list) => list.some((f) => fieldBelongsTo(f, rec))).length;
                    const isCopy = rec.role === 'Receives a copy';
                    const needsFields = ['Needs to sign', 'In-person signer'].includes(rec.role);
                    const emailedNow = sendPlan.now.some((r) => r.email === rec.email);
                    return (
                      <tr key={rec.id || rec.email} className="hover:bg-slate-50">
                        <td className="py-2.5 pl-4 pr-1">
                          {isCopy ? (
                            <span className="text-slate-400 font-semibold" title="Receives a copy when the document is completed">-</span>
                          ) : (
                            <span
                              className={`inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full text-[10px] font-bold ${emailedNow ? 'bg-[#007355] text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}
                              title={emailedNow ? 'Emailed as soon as you send' : 'Emailed after the previous step has signed'}
                            >
                              {sendPlan.isParallel ? 'All' : rec.signingOrder || 1}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: rec.color }} />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate">{rec.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{rec.email} - {rec.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold text-slate-600">
                          {isCopy ? '-' : `${docsWithFields}/${documentsList.length}`}
                        </td>
                        <td className={`py-2.5 px-4 text-right font-bold ${needsFields && recFields.length === 0 ? 'text-red-600' : 'text-[#007355]'}`}>
                          {isCopy ? '-' : recFields.length}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Who receives the email now, and who follows */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-3 text-xs text-slate-600">
              <div className="flex items-start gap-2 min-w-0">
                <Mail size={14} className="text-[#007355] shrink-0 mt-0.5" />
                <p className="leading-relaxed min-w-0">
                  {sendPlan.isParallel ? (
                    <>
                      <strong className="text-slate-800">Everyone at once:</strong> {sendPlan.now.map((r) => r.name || r.email).join(', ')}
                    </>
                  ) : (
                    <>
                      <strong className="text-slate-800">Emailed now:</strong> {sendPlan.now.map((r) => r.name || r.email).join(', ') || '-'}
                      {sendPlan.later.length > 0 && (
                        <>
                          <br />
                          <strong className="text-slate-800">Next, in order:</strong>{' '}
                          {sendPlan.later.map((r) => `${r.signingOrder || 1}. ${r.name || r.email}`).join(', ')}
                        </>
                      )}
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  handleContinueToSend();
                }}
                className="self-start shrink-0 text-xs font-bold text-[#007355] hover:underline cursor-pointer"
              >
                Change order
              </button>
            </div>

            <div className="flex justify-end items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={isSending}
                className="px-5 py-2 bg-[#007355] hover:bg-[#005c44] disabled:opacity-60 text-white rounded-lg text-xs font-bold transition shadow cursor-pointer flex items-center gap-1.5"
              >
                {isSending && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Confirm and send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

