import React from 'react';
import { Copy, PenTool, CheckCircle2, Calendar, Check } from 'lucide-react';
import SignatureStamp from './SignatureStamp';
import { generateBexsignId } from '../utils/documentId';
import { getDefaultDocContent } from '../utils/documentDefaults';
import { getStampImage, DEFAULT_COMPANY_NAME } from '../utils/documentFields';

/**
 * Canonical BexDocumentSheet Component
 *
 * Renders the exact document sheet used across:
 * 1. Document View (In Progress, Completed, Draft)
 * 2. Print (via @media print and standalone print)
 * 3. Download PDF (1:1 visual reference)
 *
 * Matches Zoho Sign standard and reference attachments:
 * - BexSign Document ID header
 * - Document Name & Body Text ("check the document for signature" or custom message)
 * - 3-Tier Signature Stamp (- Signed by: [Name], stroke, BEX-SIGN-VC-EMP001-2026, hash)
 * - Per-document placed fields without labels (the field name is only a hint inside the field)
 * - A stamp only when a Stamp field was placed; a signer never sees other recipients' fields
 */

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
  copiedId = false,
  onCopyId = null,
  placedFields = null,
  onUpdateField = null,
  className = ''
}) {
  const displayDocId = bexsignDocId || (typeof docId === 'string' && docId.startsWith('BEX-') ? docId : generateBexsignId(docId));

  // While signing, only the viewer's own fields are shown (Zoho Sign privacy); completed documents show every field
  const visibleFields = (placedFields || []).filter((field) => isCompleted || !(
    field.isAssignedToOther ||
    (field.assigneeEmail && signerEmail && field.assigneeEmail.toLowerCase() !== signerEmail.toLowerCase())
  ));

  const inputClass = (paddingLeft = 'pl-3') => `w-full py-2.5 ${paddingLeft} pr-7 text-xs border border-dashed border-emerald-500 rounded-lg bg-emerald-50/40 hover:bg-emerald-50 focus:bg-white focus:border-solid focus:border-[#007355] focus:ring-2 focus:ring-emerald-100 outline-none font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-medium transition shadow-2xs`;
  const valueClass = 'text-xs font-semibold text-slate-800 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg min-h-[38px] break-words';

  const renderSignature = (field, { key, id, fieldSignature = '', fieldSigner = signerName, hint = 'Signature', required = true }) => (
    <div key={key} id={id} className="relative sm:col-span-2" title={hint}>
      {signaturePlaced || isCompleted || signatureImage || fieldSignature ? (
        <div className="relative inline-block">
          <div
            onClick={!isCompleted && onOpenSignatureModal ? onOpenSignatureModal : undefined}
            className={`p-3 bg-white border border-slate-200 rounded-lg transition shadow-2xs w-fit ${
              !isCompleted && onOpenSignatureModal ? 'cursor-pointer hover:border-[#1c4b82]' : ''
            }`}
          >
            <SignatureStamp
              signerName={fieldSigner}
              signatureImage={fieldSignature || signatureImage}
              signatureStyle={signatureStyle}
              docId={displayDocId}
            />
            {!isCompleted && onOpenSignatureModal && (
              <p className="text-[10px] text-emerald-700 font-bold mt-1.5 print:hidden">
                ✓ Signature Placed (Click to modify)
              </p>
            )}
            {isCompleted && (
              <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold mt-1.5 print:hidden">
                <CheckCircle2 size={12} />
                <span>Digitally Certified & Verified</span>
              </div>
            )}
          </div>
          {showTooltips && !isCompleted && allFieldsComplete && (
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

  return (
    <div
      id="printable-document-sheet"
      className={`bg-white border border-slate-300 rounded-xs w-full min-h-[1123px] max-w-[794px] p-5 sm:p-14 shadow-lg flex flex-col justify-between text-slate-800 font-sans print:border-none print:shadow-none print:p-8 print:max-w-none print:w-full print:min-h-0 print:m-0 select-text ${className}`}
    >
      <div className="space-y-6">
        {/* Top Header: BexSign Document ID */}
        <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 font-mono print:border-slate-300">
          <div className="break-all font-semibold select-all">
            BexSign Document ID: <strong className="text-slate-800">{displayDocId}</strong>
          </div>
          {onCopyId && (
            <button
              onClick={onCopyId}
              type="button"
              className="self-start sm:self-auto text-[11px] font-bold text-[#00a884] hover:underline flex items-center gap-1 shrink-0 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 print:hidden cursor-pointer"
              title="Copy full Document ID"
            >
              <Copy size={12} /> {copiedId ? 'Copied!' : 'Copy ID'}
            </button>
          )}
        </div>

        {/* Document Title & Body Content */}
        <div className="space-y-4 pt-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
            {documentName || "Document 1.pdf"}
          </h1>
          <div className="border-b border-slate-200 pb-5 font-sans select-text space-y-2.5">
            {(() => {
              const fullContent = (documentText && documentText.trim() && documentText !== "check the document for signature")
                ? documentText
                : getDefaultDocContent(documentName, documentText);

              if (/<[a-z][\s\S]*>/i.test(fullContent)) {
                return (
                  <div
                    className="text-xs text-slate-700 leading-relaxed font-sans space-y-2"
                    dangerouslySetInnerHTML={{ __html: fullContent }}
                  />
                );
              }

              const paragraphs = fullContent.split(/\n\n+/);
              return paragraphs.map((para, pIdx) => {
                const trimmed = para.trim();
                const isHeading = /^[0-9]+\.\s+[A-Z\s]+/.test(trimmed) || (/^[A-Z\s]{5,}$/.test(trimmed) && trimmed.length < 60);
                return (
                  <p
                    key={pIdx}
                    className={isHeading ? 'font-bold text-slate-900 text-xs tracking-tight mt-3 mb-1' : 'text-xs text-slate-700 leading-relaxed'}
                  >
                    {trimmed}
                  </p>
                );
              });
            })()}
          </div>
        </div>

        {/* ========================================================
            FIELDS SECTION (placed fields only, without labels)
        ======================================================== */}
        {visibleFields.length > 0 ? (
          <div className="pt-8 border-t border-slate-200 print:border-slate-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 items-start">
              {visibleFields.map((field) => {
                const hint = fieldHint(field);
                const key = field.id;
                const id = `doc-field-${field.id}`;

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
                    <div key={key} id={id} className="w-full sm:w-64 relative" title={hint}>
                      {!isCompleted ? (
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
                    <div key={key} id={id} className="w-full sm:w-64 relative" title={hint}>
                      {!isCompleted ? (
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
                      {!isCompleted ? (
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
                      {!isCompleted ? (
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
                  <div key={key} id={id} className="w-full sm:w-64 relative" title={hint}>
                    {!isCompleted ? (
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
              })}
            </div>
          </div>
        ) : defaultSignature ? (
          <div className="pt-8 border-t border-slate-200 space-y-4 print:border-slate-300">
            {/* Documents without placed fields: one signature and the signer's email (no default stamp) */}
            <div id="signature-field-container">
              {renderSignature(null, { key: 'default-signature', id: undefined, hint: 'Signature' })}
            </div>
            <div className="text-xs font-semibold text-slate-600">
              {signerEmail || "vimal@bexcodeservices.com"}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
