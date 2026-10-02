import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Copy, PenTool, CheckCircle2, Calendar, Check, Clock, X } from 'lucide-react';
import SignatureStamp from './SignatureStamp';
import DocumentPage, { PAGE_WIDTH } from './documents/DocumentPage';
import PlacedField from './documents/PlacedField';
import { generateBexsignId } from '../utils/documentId';
import { getStampImage, DEFAULT_COMPANY_NAME } from '../utils/documentFields';
import { fieldBelongsTo } from '../utils/recipientColors';
import { isAutoResizeField, autoResizeWidth, getFieldBox } from '../utils/fieldSizing';

/**
 * Canonical BexDocumentSheet Component
 *
 * Renders the document pages used across:
 * 1. Recipient signing
 * 2. Document View (In Progress, Completed, Draft)
 *
 * The pages are the same A4 pages the document editor shows (DocumentPage), and every placed field is drawn at
 * the position and size the sender gave it there, on the page it was put on. So a field the sender put beside a
 * line of text is beside that line for the signer, in the document view and in the signed PDF.
 *
 * Matches Zoho Sign standard and reference attachments:
 * - BexSign Document ID under the document name
 * - 3-Tier Signature Stamp (- Signed by: [Name], stroke, BEX-SIGN-VC-EMP001-2026, hash)
 * - Per-document placed fields without labels (the field name is only a hint inside the field)
 * - A stamp only when a Stamp field was placed; a signer never sees other recipients' fields
 *
 * Fields that carry no position (requests made outside the editor) are listed under the text, as before.
 */

const hasPosition = (field) => !field?.unplaced && Number.isFinite(Number(field?.x)) && Number.isFinite(Number(field?.y))
  && field?.x !== null && field?.y !== null && field?.x !== '' && field?.y !== '';

// Hint shown inside a field while signing (never rendered as a label above the field)
const fieldHint = (field) => field.label || field.type || 'Field';

function RequiredMark({ field, className = '' }) {
  if (!field.required) return null;
  return (
    <span
      aria-hidden="true"
      className={`text-red-500 font-black leading-none select-none pointer-events-none print:hidden ${className}`}
    >
      *
    </span>
  );
}

export default function BexDocumentSheet({
  docId = 1,
  bexsignDocId = '',
  documentName = "Document 1.pdf",
  documentText = "check the document for signature",
  signerName = "Vimal Chavda",
  signerEmail = "vimal@bexcodeservices.com",
  signatureImage = '',
  signatureStyle = 'font-signature-1',
  signaturePlaced = false,
  onOpenSignatureModal = null,
  isCompleted = false,
  showTooltips = true,
  // False while other fields of the signer are still empty (the "Click Finish" hint waits for them)
  allFieldsComplete = true,
  // Show a signature block when the document has no placed fields at all
  defaultSignature = true,
  // Sender view of a request in progress: fields a recipient has not completed yet show who they are waiting for
  showPending = false,
  // { email, id, name, color }: that recipient's fields are outlined in their colour, the other fields fade
  highlightRecipient = null,
  // Guided signing: the field being filled is outlined and carries a callout with Previous/Next
  guideFieldId = null,
  guideText = '',
  guidePosition = '',
  onGuidePrevious = null,
  onGuideNext = null,
  onGuideClose = null,
  copiedId = false,
  onCopyId = null,
  placedFields = null,
  onUpdateField = null,
  // Reader's zoom in percent: 100 fits the page to the width available
  zoom = 100,
  className = ''
}) {
  const displayDocId = bexsignDocId || (typeof docId === 'string' && docId.startsWith('BEX-') ? docId : generateBexsignId(docId));

  // While signing, a recipient sees their own fields. With "In order, showing completed fields" they also see what
  // the recipients before them filled in (field.completedByOther); completed documents show every field.
  const visibleFields = (placedFields || []).filter((field) => isCompleted || field.completedByOther || !(
    field.isAssignedToOther ||
    (field.assigneeEmail && signerEmail && field.assigneeEmail.toLowerCase() !== signerEmail.toLowerCase())
  ));

  // A field an earlier recipient completed is shown filled in and can never be edited by this signer
  const isLocked = (field) => Boolean(isCompleted || field?.completedByOther);

  // Placed fields sit on their page; fields without a position are listed under the text
  const positionedFields = visibleFields.filter(hasPosition);
  const flowFields = visibleFields.filter((field) => !hasPosition(field));
  const totalPages = positionedFields.reduce((max, field) => Math.max(max, parseInt(field.page, 10) || 1), 1);

  // The pages keep their A4 size and are scaled down to the width available (phones, narrow windows)
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [fit, setFit] = useState({ scale: 1, height: null, offset: 0 });
  const measureFit = () => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || !outer.clientWidth) return;
    // Fit to the width, then apply the zoom the reader chose (100 = fit)
    const scale = Math.min(1, outer.clientWidth / PAGE_WIDTH) * (Math.max(25, Number(zoom) || 100) / 100);
    const height = inner.offsetHeight * scale;
    const offset = Math.max(0, (outer.clientWidth - PAGE_WIDTH * scale) / 2);
    setFit((prev) => (
      Math.abs(prev.scale - scale) < 0.002 && prev.height !== null && Math.abs(prev.height - height) < 1 && Math.abs(prev.offset - offset) < 1
        ? prev
        : { scale, height, offset }
    ));
  };
  useLayoutEffect(measureFit);
  useEffect(() => {
    window.addEventListener('resize', measureFit);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measureFit) : null;
    if (observer && outerRef.current) observer.observe(outerRef.current);
    if (observer && innerRef.current) observer.observe(innerRef.current);
    return () => {
      window.removeEventListener('resize', measureFit);
      if (observer) observer.disconnect();
    };
  }, []);

  const inputClass = (paddingLeft = 'pl-3') => `w-full py-2.5 ${paddingLeft} pr-7 text-xs border border-dashed border-emerald-500 rounded-lg bg-emerald-50/40 hover:bg-emerald-50 focus:bg-white focus:border-solid focus:border-[#007355] focus:ring-2 focus:ring-emerald-100 outline-none font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-medium transition shadow-2xs`;
  const valueClass = 'text-xs font-semibold text-slate-800 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg min-h-[38px] break-words';

  // Auto-resize fields get an explicit pixel width (grown to fit their text, never below the configured width)
  // instead of the fixed "w-full sm:w-64" column so the box can actually widen past that column.
  const fieldBoxClass = (field) => (isAutoResizeField(field) ? 'relative' : 'w-full sm:w-64 relative');
  const fieldBoxStyle = (field) => (isAutoResizeField(field) ? { width: `${autoResizeWidth(field, { paddingPx: 52 })}px`, maxWidth: '100%' } : undefined);

  // Outlines the highlighted recipient's fields (their colour, soft tint) and fades everyone else's
  const withHighlight = (field, element) => {
    if (!element || !highlightRecipient) return element;
    const isTheirs = fieldBelongsTo(field, highlightRecipient);
    const color = highlightRecipient.color || '#00a884';
    // Full-row fields shrink to their content so the outline hugs the field
    const rawClass = String(element.props.className || '');
    const baseClass = rawClass.includes('col-span-2') ? rawClass.replace(/(^|\s)w-full(?=\s|$)/, '$1w-full sm:w-fit') : rawClass;
    return React.cloneElement(element, {
      'data-highlighted': isTheirs ? 'true' : undefined,
      className: `${baseClass} justify-self-start rounded-lg transition-all duration-300 ${isTheirs ? 'relative z-[1]' : 'opacity-30 saturate-50'}`,
      style: {
        ...element.props.style,
        ...(isTheirs ? { boxShadow: `0 0 0 3px #ffffff, 0 0 0 5px ${color}, 0 8px 22px -6px ${color}66`, backgroundColor: `${color}12` } : {})
      }
    });
  };

  // Outlines the field the signer is on and shows the callout that explains what to enter
  const withGuide = (field, element) => {
    if (!element || !guideFieldId || field?.id !== guideFieldId) return element;
    const callout = (
      <div key="bex-guide" className="absolute left-full top-0 z-30 ml-5 hidden w-60 sm:block print:hidden">
        <span className="absolute -left-5 top-5 h-px w-5 bg-[#007355]" aria-hidden="true" />
        <div className="relative rounded-md border border-[#007355] bg-emerald-50 p-3 shadow-lg">
          {onGuideClose && (
            <button
              type="button"
              onClick={onGuideClose}
              className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-sm bg-[#007355] text-white transition hover:bg-[#005c44]"
              aria-label="Hide this hint"
            >
              <X size={11} />
            </button>
          )}
          <p className="text-[11.5px] font-semibold text-slate-800">{guideText}</p>
          {guidePosition && <p className="mt-0.5 text-[10px] font-semibold text-emerald-700">{guidePosition}</p>}
          <div className="mt-2 flex items-center justify-end gap-3 text-[11px] font-bold">
            <button type="button" onClick={onGuidePrevious} className="text-slate-600 underline underline-offset-2 transition hover:text-slate-900">Previous</button>
            <button type="button" onClick={onGuideNext} className="text-[#007355] underline underline-offset-2 transition hover:text-[#005c44]">Next</button>
          </div>
        </div>
      </div>
    );
    // Full-row fields shrink to their content so the callout sits right next to the field
    const rawClass = String(element.props.className || '');
    const baseClass = rawClass.includes('col-span-2') ? rawClass.replace(/(^|s)w-full(?=s|$)/, '$1w-full sm:w-fit') : rawClass;
    return React.cloneElement(
      element,
      {
        className: `${baseClass} relative justify-self-start rounded-lg ring-2 ring-[#007355] ring-offset-2 ring-offset-white transition`
      },
      ...React.Children.toArray(element.props.children),
      callout
    );
  };

  const renderSignature = (field, { key, id, fieldSignature = '', fieldSigner = signerName, hint = 'Signature', required = true }) => {
    const locked = isLocked(field);
    // An earlier recipient's field shows their signature, never this signer's
    const shownSignature = fieldSignature || (field?.completedByOther ? '' : signatureImage);
    return (
    <div key={key} id={id} className="relative sm:col-span-2" title={field?.completedByOther ? `${hint} · signed by ${fieldSigner}` : hint}>
      {signaturePlaced || locked || shownSignature ? (
        <div className="relative inline-block">
          <div
            onClick={!locked && onOpenSignatureModal ? onOpenSignatureModal : undefined}
            className={`p-3 bg-white border border-slate-200 rounded-lg transition shadow-2xs w-fit ${
              !locked && onOpenSignatureModal ? 'cursor-pointer hover:border-[#1c4b82]' : ''
            }`}
          >
            <SignatureStamp
              signerName={fieldSigner}
              signatureImage={shownSignature}
              signatureStyle={signatureStyle}
              docId={displayDocId}
            />
            {!locked && onOpenSignatureModal && (
              <p className="text-[10px] text-emerald-700 font-bold mt-1.5 print:hidden">
                ✓ Signature Placed (Click to modify)
              </p>
            )}
            {locked && (
              <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold mt-1.5 print:hidden">
                <CheckCircle2 size={12} />
                <span>Digitally Certified & Verified</span>
              </div>
            )}
          </div>
          {showTooltips && !locked && allFieldsComplete && (
            <div className="absolute left-full top-2 ml-4 p-2.5 bg-slate-900 text-white rounded-lg shadow-xl text-xs font-semibold whitespace-nowrap hidden sm:flex items-center gap-2 z-20 print:hidden pointer-events-none">
              <span>You've successfully filled all fields. Click Finish to complete.</span>
            </div>
          )}
        </div>
      ) : (
        <div className="relative inline-block w-64 max-w-full">
          <button
            type="button"
            onClick={onOpenSignatureModal || undefined}
            aria-label={`${hint}${required ? ' (required)' : ''}`}
            className="w-full h-16 px-4 border-2 border-dashed border-emerald-600 bg-emerald-50 text-emerald-800 font-bold text-sm rounded-lg flex items-center justify-between cursor-pointer hover:bg-emerald-100 hover:border-solid transition shadow-2xs"
          >
            <span className="flex items-center gap-2">
              <PenTool size={16} />
              <span>{hint}</span>
            </span>
            {required && <span className="text-red-500 font-black">*</span>}
          </button>
          {showTooltips && (
            <div className="absolute left-full top-4 ml-4 p-2.5 bg-slate-900 text-white rounded-lg shadow-xl text-xs font-semibold whitespace-nowrap hidden sm:flex items-center gap-3 z-20 print:hidden pointer-events-none">
              <span>Enter your signature.</span>
            </div>
          )}
        </div>
      )}
    </div>
    );
  };

  // Fields without a position (listed under the text), or the signature block of a request without any fields
  const flowSection = flowFields.length > 0 ? (
          <div className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 items-start">
              {flowFields.map((field) => withGuide(field, withHighlight(field, (() => {
                const hint = fieldHint(field);
                const key = field.id;
                const id = `doc-field-${field.id}`;

                if (showPending && !field.signedAt && field.type !== 'Stamp') {
                  const isSignatureType = field.type === 'Signature' || field.type === 'Initial';
                  return (
                    <div key={key} id={id} className={isSignatureType ? 'sm:col-span-2' : 'w-full sm:w-64'} title={`${hint}: waiting for ${field.assignee || 'the recipient'}`}>
                      <div className={`flex items-center gap-2 px-3 border border-dashed border-slate-300 rounded-lg bg-slate-50 text-slate-500 ${isSignatureType ? 'h-16 w-64 max-w-full' : 'py-2.5 min-h-[38px]'}`}>
                        {isSignatureType ? <PenTool size={15} className="shrink-0 text-slate-400" /> : <Clock size={13} className="shrink-0 text-slate-400" />}
                        <span className="text-[11px] font-semibold truncate">
                          {isSignatureType ? 'Awaiting signature' : hint} · {field.assignee || 'recipient'}
                        </span>
                      </div>
                    </div>
                  );
                }

                if (field.type === 'Signature' || field.type === 'Initial') {
                  // Placeholder values from the editor ("Signature"/"Initial") are not signatures
                  const fieldSignature = field.signatureImage
                    || (field.value && field.value !== field.type && field.value !== field.label ? field.value : '');
                  return renderSignature(field, {
                    key,
                    id,
                    fieldSignature,
                    fieldSigner: field.signerName || signerName,
                    hint,
                    required: field.required !== false
                  });
                }

                if (field.type === 'Stamp') {
                  // A stamp is displayed only when one was placed (with its image) while creating the document
                  const stampSrc = getStampImage(field);
                  if (!stampSrc) return null;
                  return (
                    <div key={key} id={id} className="w-full sm:w-64" title="Stamp">
                      <img
                        src={stampSrc}
                        alt="Stamp"
                        className="max-h-28 max-w-[160px] object-contain"
                        style={{ transform: field.stampRotation ? `rotate(${field.stampRotation}deg)` : undefined }}
                      />
                    </div>
                  );
                }

                if (field.type === 'Email') {
                  const emailValue = field.value !== undefined && field.value !== 'Email' ? field.value : signerEmail;
                  return (
                    <div key={key} id={id} className={fieldBoxClass(field)} style={fieldBoxStyle(field)} title={hint}>
                      {!isLocked(field) ? (
                        <>
                          <input
                            type="email"
                            value={emailValue}
                            onChange={(e) => onUpdateField && onUpdateField(field.id, e.target.value)}
                            className={inputClass()}
                            placeholder={hint}
                            aria-label={hint}
                            aria-required={Boolean(field.required)}
                          />
                          <RequiredMark field={field} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm" />
                        </>
                      ) : (
                        <div className={valueClass}>{field.value && field.value !== 'Email' ? field.value : signerEmail}</div>
                      )}
                    </div>
                  );
                }

                if (field.type === 'Sign date') {
                  const dateVal = field.value || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  return (
                    <div key={key} id={id} className={fieldBoxClass(field)} style={fieldBoxStyle(field)} title={hint}>
                      {!isLocked(field) ? (
                        <>
                          <input
                            type="text"
                            value={field.value !== undefined ? field.value : dateVal}
                            onChange={(e) => onUpdateField && onUpdateField(field.id, e.target.value)}
                            className={inputClass('pl-8')}
                            placeholder={hint}
                            aria-label={hint}
                            aria-required={Boolean(field.required)}
                          />
                          <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-700/70 pointer-events-none" />
                          <RequiredMark field={field} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm" />
                        </>
                      ) : (
                        <div className={`${valueClass} flex items-center gap-2`}>
                          <Calendar size={14} className="text-slate-400 shrink-0" />
                          <span>{dateVal}</span>
                        </div>
                      )}
                    </div>
                  );
                }

                if (field.type === 'Split text') {
                  const count = field.charCount || 10;
                  const charArray = Array.isArray(field.gridValue) && field.gridValue.length > 0
                    ? field.gridValue
                    : (field.value !== undefined && field.value !== null && field.value !== field.type ? String(field.value).split('') : []);

                  return (
                    <div key={key} id={id} className="w-full sm:col-span-2" title={hint}>
                      {!isLocked(field) ? (
                        <div className="flex items-center gap-1.5">
                          <div
                            role="group"
                            aria-label={hint}
                            className="flex border border-dashed border-sky-400 bg-white text-xs font-mono font-bold text-sky-900 w-fit max-w-full overflow-x-auto rounded p-0.5 shadow-2xs"
                          >
                            {Array.from({ length: count }).map((_, cIdx) => (
                              <input
                                key={cIdx}
                                id={`split-cell-${field.id}-${cIdx}`}
                                type="text"
                                maxLength={1}
                                aria-label={`${hint} character ${cIdx + 1}`}
                                value={charArray[cIdx] !== undefined ? charArray[cIdx] : ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const newGrid = Array.from({ length: count }, (_, i) => charArray[i] !== undefined ? charArray[i] : '');
                                  newGrid[cIdx] = val;
                                  onUpdateField && onUpdateField(field.id, newGrid.join(''), newGrid);

                                  if (val && cIdx < count - 1) {
                                    const nextInput = document.getElementById(`split-cell-${field.id}-${cIdx + 1}`);
                                    if (nextInput) {
                                      nextInput.focus();
                                      nextInput.select();
                                    }
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Backspace' && (!charArray[cIdx] || charArray[cIdx] === '') && cIdx > 0) {
                                    const prevInput = document.getElementById(`split-cell-${field.id}-${cIdx - 1}`);
                                    if (prevInput) {
                                      prevInput.focus();
                                      prevInput.select();
                                    }
                                  } else if (e.key === 'ArrowRight' && cIdx < count - 1) {
                                    const nextInput = document.getElementById(`split-cell-${field.id}-${cIdx + 1}`);
                                    if (nextInput) nextInput.focus();
                                  } else if (e.key === 'ArrowLeft' && cIdx > 0) {
                                    const prevInput = document.getElementById(`split-cell-${field.id}-${cIdx - 1}`);
                                    if (prevInput) prevInput.focus();
                                  }
                                }}
                                onPaste={(e) => {
                                  e.preventDefault();
                                  const pasted = e.clipboardData.getData('text') || '';
                                  if (!pasted) return;
                                  const newGrid = Array.from({ length: count }, (_, i) => charArray[i] !== undefined ? charArray[i] : '');
                                  for (let p = 0; p < pasted.length && (cIdx + p) < count; p++) {
                                    newGrid[cIdx + p] = pasted[p];
                                  }
                                  onUpdateField && onUpdateField(field.id, newGrid.join(''), newGrid);
                                }}
                                style={{ width: `${field.width || 22}px`, height: `${field.height || 26}px` }}
                                className="shrink-0 border-r last:border-r-0 border-sky-300 text-center bg-sky-50/40 text-[11px] font-bold text-sky-900 focus:bg-sky-100 focus:outline-none transition selection:bg-sky-200"
                              />
                            ))}
                          </div>
                          <RequiredMark field={field} className="text-sm" />
                        </div>
                      ) : (
                        <div className="font-mono text-xs font-bold text-slate-800 px-3 py-2 bg-slate-50 border border-slate-200 rounded w-fit tracking-[0.2em]">
                          {Array.isArray(field.gridValue) && field.gridValue.some(Boolean) ? field.gridValue.join('') : (field.value && field.value !== field.type ? field.value : '-')}
                        </div>
                      )}
                    </div>
                  );
                }

                if (field.type === 'Checkbox') {
                  const checked = field.value === true || field.value === 'true';
                  return (
                    <div key={key} id={id} className="flex items-center gap-1.5 min-h-[38px]" title={hint}>
                      {!isLocked(field) ? (
                        <>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => onUpdateField && onUpdateField(field.id, e.target.checked)}
                            aria-label={hint}
                            aria-required={Boolean(field.required)}
                            className="w-5 h-5 rounded border-emerald-500 accent-[#007355] cursor-pointer"
                          />
                          <RequiredMark field={field} className="text-sm" />
                        </>
                      ) : (
                        <span
                          aria-label={`${hint}: ${checked ? 'checked' : 'not checked'}`}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${checked ? 'border-[#007355] bg-emerald-50 text-[#007355]' : 'border-slate-300 bg-white'}`}
                        >
                          {checked && <Check size={14} strokeWidth={3} />}
                        </span>
                      )}
                    </div>
                  );
                }

                // Default Text / Full name / Job title / Company
                return (
                  <div key={key} id={id} className={fieldBoxClass(field)} style={fieldBoxStyle(field)} title={hint}>
                    {!isLocked(field) ? (
                      <>
                        <input
                          type="text"
                          value={field.value !== undefined && field.value !== field.type ? field.value : (field.type === 'Full name' ? signerName : (field.type === 'Company' ? DEFAULT_COMPANY_NAME : ''))}
                          onChange={(e) => onUpdateField && onUpdateField(field.id, e.target.value)}
                          className={inputClass()}
                          placeholder={hint}
                          aria-label={hint}
                          aria-required={Boolean(field.required)}
                        />
                        <RequiredMark field={field} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm" />
                      </>
                    ) : (
                      <div className={valueClass}>
                        {field.value && field.value !== field.type
                          ? field.value
                          : (field.type === 'Company' ? DEFAULT_COMPANY_NAME : (field.type === 'Full name' ? (field.signerName || signerName) : '-'))}
                      </div>
                    )}
                  </div>
                );
              })())))}
            </div>
          </div>
  ) : (defaultSignature && visibleFields.length === 0) ? (
          <div className="pt-6 space-y-4">
            {/* Documents without placed fields: one signature and the signer's email (no default stamp) */}
            <div id="signature-field-container">
              {renderSignature(null, { key: 'default-signature', id: undefined, hint: 'Signature' })}
            </div>
            <div className="text-xs font-semibold text-slate-600">
              {signerEmail || "vimal@bexcodeservices.com"}
            </div>
          </div>
  ) : null;

  const highlightColor = highlightRecipient ? (highlightRecipient.color || '#00a884') : '';

  // Callout of the guided field: beside the field, on the side of the page that has room for it
  const guideCalloutFor = (field) => {
    const onLeft = Number(field.x) > PAGE_WIDTH - 420;
    // A small field (a checkbox, a short box in a line of text) often has its own label or other fields right
    // beside it: the callout keeps clear of them
    const gap = onLeft ? 20 : 20 + Math.max(0, 190 - getFieldBox(field).width);
    return (
      <div
        className={`absolute top-0 z-30 hidden w-60 sm:block print:hidden ${onLeft ? 'right-full' : 'left-full'}`}
        style={onLeft ? { marginRight: `${gap}px` } : { marginLeft: `${gap}px` }}
      >
        {/* The connecting line is drawn only when nothing sits between the field and the callout */}
        {gap === 20 && (
          <span className={`absolute top-3 h-px w-5 bg-[#007355] ${onLeft ? '-right-5' : '-left-5'}`} aria-hidden="true" />
        )}
        <div className="relative rounded-md border border-[#007355] bg-emerald-50 p-3 shadow-lg">
          {onGuideClose && (
            <button
              type="button"
              onClick={onGuideClose}
              className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-sm bg-[#007355] text-white transition hover:bg-[#005c44]"
              aria-label="Hide this hint"
            >
              <X size={11} />
            </button>
          )}
          <p className="text-[11.5px] font-semibold text-slate-800">{guideText}</p>
          {guidePosition && <p className="mt-0.5 text-[10px] font-semibold text-emerald-700">{guidePosition}</p>}
          <div className="mt-2 flex items-center justify-end gap-3 text-[11px] font-bold">
            <button type="button" onClick={onGuidePrevious} className="text-slate-600 underline underline-offset-2 transition hover:text-slate-900">Previous</button>
            <button type="button" onClick={onGuideNext} className="text-[#007355] underline underline-offset-2 transition hover:text-[#005c44]">Next</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={outerRef}
      id="printable-document-sheet"
      style={{ height: fit.height !== null && fit.scale !== 1 ? `${fit.height}px` : undefined }}
      className={`w-full max-w-[794px] text-slate-800 font-sans print:max-w-none print:!h-auto ${className}`}
    >
      <div
        ref={innerRef}
        style={{
          width: `${PAGE_WIDTH}px`,
          transform: fit.scale !== 1 ? `scale(${fit.scale})` : undefined,
          transformOrigin: 'top left',
          marginLeft: fit.offset ? `${fit.offset}px` : undefined
        }}
        className="flex flex-col gap-6 print:gap-0 print:!transform-none print:!ml-0"
      >
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNum) => (
          <DocumentPage
            key={pageNum}
            pageNum={pageNum}
            totalPages={totalPages}
            title={documentName || 'Document 1.pdf'}
            docIdText={displayDocId}
            documentText={documentText}
            className="shadow-lg rounded-xs print:shadow-none print:border-transparent"
            headerAction={pageNum === 1 && onCopyId ? (
              <button
                onClick={onCopyId}
                type="button"
                className="text-[11px] font-bold text-[#00a884] hover:underline flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 cursor-pointer"
                title="Copy full Document ID"
              >
                <Copy size={12} /> {copiedId ? 'Copied!' : 'Copy ID'}
              </button>
            ) : null}
            afterText={flowSection}
          >
            {positionedFields
              .filter((field) => (parseInt(field.page, 10) || 1) === pageNum)
              .map((field) => {
                const isTheirs = highlightRecipient ? fieldBelongsTo(field, highlightRecipient) : false;
                const guided = Boolean(guideFieldId) && field.id === guideFieldId;
                const locked = isLocked(field);
                const isSignatureType = field.type === 'Signature' || field.type === 'Initial';
                const unsigned = isSignatureType && !locked && !signaturePlaced && !signatureImage && !field.signatureImage;
                return (
                  <PlacedField
                    key={field.id}
                    field={field}
                    locked={locked}
                    pending={showPending && !field.signedAt}
                    signerName={signerName}
                    signerEmail={signerEmail}
                    signatureImage={signatureImage}
                    signatureStyle={signatureStyle}
                    signaturePlaced={signaturePlaced}
                    displayDocId={displayDocId}
                    onOpenSignatureModal={onOpenSignatureModal}
                    onUpdateField={onUpdateField}
                    highlightColor={isTheirs ? highlightColor : ''}
                    dimmed={Boolean(highlightRecipient) && !isTheirs}
                    guided={guided}
                  >
                    {guided && guideCalloutFor(field)}
                    {showTooltips && unsigned && !guided && (
                      <div className="absolute left-full top-1 ml-3 p-2 bg-slate-900 text-white rounded-lg shadow-xl text-xs font-semibold whitespace-nowrap hidden sm:block z-20 print:hidden pointer-events-none">
                        Enter your signature.
                      </div>
                    )}
                  </PlacedField>
                );
              })}
          </DocumentPage>
        ))}
      </div>
    </div>
  );
}
