import React from 'react';
import { Copy, PenTool, CheckCircle2, Calendar, Lock } from 'lucide-react';
import SignatureStamp from './SignatureStamp';
import { generateBexsignId } from '../utils/documentId';
import { getDefaultDocContent } from '../utils/documentDefaults';

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
 * - Official Bex Corporate Stamp (Bex logo, Corporate Official Stamp, Verified)
 * - Recipient Email & Per-document Custom Placed Fields
 */
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
  copiedId = false,
  onCopyId = null,
  placedFields = null,
  onUpdateField = null,
  className = ''
}) {
  const displayDocId = bexsignDocId || (typeof docId === 'string' && docId.startsWith('BEX-') ? docId : generateBexsignId(docId));

  return (
    <div
      id="printable-document-sheet"
      className={`bg-white border border-slate-300 rounded-xs w-[794px] min-h-[1123px] max-w-[794px] p-10 sm:p-14 shadow-lg flex flex-col justify-between text-slate-800 font-sans print:border-none print:shadow-none print:p-8 print:max-w-none print:w-full print:min-h-0 print:m-0 select-text ${className}`}
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
            FIELDS SECTION (Render placed fields or standard fields)
        ======================================================== */}
        <div className="pt-8 border-t border-slate-200 space-y-6 print:border-slate-300">
          {placedFields && placedFields.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {placedFields.map((field) => {
                const isOtherSignerField = !isCompleted && Boolean(
                  field.isAssignedToOther ||
                  (field.assigneeEmail && signerEmail && field.assigneeEmail.toLowerCase() !== signerEmail.toLowerCase())
                );

                if (isOtherSignerField) {
                  if (field.type === 'Signature' || field.type === 'Initial') {
                    return (
                      <div key={field.id} id={`doc-field-${field.id}`} className="relative sm:col-span-2 p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl max-w-sm shadow-2xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            {field.label || field.type || 'Signature'}
                          </span>
                          <span className="text-[9px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded flex items-center gap-1">
                            <Lock size={10} /> Other Signer
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-600">
                          Assigned to: <strong className="text-slate-800">{field.assignee || 'Another Signer'}</strong>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          • Confidential • Masked until all signers complete
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div key={field.id} id={`doc-field-${field.id}`} className="w-full sm:w-64 p-3.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl shadow-2xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {field.label || field.type}
                        </span>
                        <span className="text-[9px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded flex items-center gap-1">
                          <Lock size={10} /> Other Signer
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-600">
                        Assigned to: <strong className="text-slate-800">{field.assignee || 'Another Signer'}</strong>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        • Confidential • Masked during signing
                      </p>
                    </div>
                  );
                }

                if (field.type === 'Signature' || field.type === 'Initial') {
                  return (
                    <div key={field.id} id={`doc-field-${field.id}`} className="relative sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 print:text-slate-600">
                        {field.label || field.type || 'Signature'}
                        {field.required && <span className="text-red-500 ml-1 font-bold">*</span>}
                      </label>
                      {signaturePlaced || isCompleted || signatureImage || field.value ? (
                        <div className="relative inline-block">
                          <div
                            onClick={!isCompleted && onOpenSignatureModal ? onOpenSignatureModal : undefined}
                            className={`p-3 bg-white border border-slate-200 rounded-lg transition shadow-2xs w-fit ${
                              !isCompleted && onOpenSignatureModal ? 'cursor-pointer hover:border-[#1c4b82]' : ''
                            }`}
                          >
                            <SignatureStamp
                              signerName={signerName}
                              signatureImage={field.value || signatureImage}
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
                          {showTooltips && !isCompleted && (
                            <div className="absolute left-full top-2 ml-4 p-2.5 bg-slate-900 text-white rounded-lg shadow-xl text-xs font-semibold whitespace-nowrap hidden sm:flex items-center gap-2 z-20 print:hidden pointer-events-none">
                              <span>You've successfully filled all fields. Click Finish to complete.</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative inline-block w-64">
                          <button
                            type="button"
                            onClick={onOpenSignatureModal || undefined}
                            className="w-full p-4 border-2 border-emerald-600 bg-emerald-50 text-emerald-800 font-bold text-sm rounded-lg text-left flex items-center justify-between cursor-pointer hover:bg-emerald-100 transition shadow-2xs"
                          >
                            <span className="flex items-center gap-1">
                              <span>{field.label || 'Signature'}</span>
                              <span className="text-red-500 font-bold">*</span>
                            </span>
                            <PenTool size={16} />
                          </button>
                          {showTooltips && (
                            <div className="absolute left-full top-1 ml-4 p-2.5 bg-slate-900 text-white rounded-lg shadow-xl text-xs font-semibold whitespace-nowrap hidden sm:flex items-center gap-3 z-20 print:hidden pointer-events-none">
                              <span>Enter your signature.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                if (field.type === 'Stamp') {
                  return (
                    <div key={field.id} id={`doc-field-${field.id}`} className="w-full sm:w-64">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 print:text-slate-600">
                        {field.label || 'Stamp'}
                      </label>
                      <div className="p-3 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 flex items-center justify-between text-xs text-slate-700 font-bold shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded bg-[#E71414] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                            Bex
                          </div>
                          <span>Corporate Official Stamp</span>
                        </div>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Verified
                        </span>
                      </div>
                    </div>
                  );
                }

                if (field.type === 'Email') {
                  return (
                    <div key={field.id} id={`doc-field-${field.id}`} className="w-full sm:w-64">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 print:text-slate-600">
                        {field.label || 'Email'}
                        {field.required && <span className="text-red-500 ml-1 font-bold">*</span>}
                      </label>
                      {!isCompleted ? (
                        <input
                          type="email"
                          value={field.value !== undefined && field.value !== 'Email' ? field.value : signerEmail}
                          onChange={(e) => onUpdateField && onUpdateField(field.id, e.target.value)}
                          className="w-full p-2.5 text-xs border border-slate-300 rounded-lg bg-white focus:border-[#007355] focus:ring-1 focus:ring-[#007355] outline-none font-semibold text-slate-800 shadow-2xs"
                          placeholder="Enter email address"
                        />
                      ) : (
                        <div className="text-xs font-semibold text-slate-800 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                          {field.value || signerEmail}
                        </div>
                      )}
                    </div>
                  );
                }

                if (field.type === 'Sign date') {
                  const dateVal = field.value || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  return (
                    <div key={field.id} id={`doc-field-${field.id}`} className="w-full sm:w-64">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 print:text-slate-600">
                        {field.label || 'Sign date'}
                        {field.required && <span className="text-red-500 ml-1 font-bold">*</span>}
                      </label>
                      {!isCompleted ? (
                        <div className="relative">
                          <input
                            type="text"
                            value={field.value !== undefined ? field.value : dateVal}
                            onChange={(e) => onUpdateField && onUpdateField(field.id, e.target.value)}
                            className="w-full pl-8 pr-3 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg focus:border-[#007355] focus:ring-1 focus:ring-[#007355] outline-none shadow-2xs"
                            placeholder="Enter or confirm date"
                          />
                          <Calendar size={14} className="absolute left-2.5 top-3 text-slate-400 pointer-events-none" />
                        </div>
                      ) : (
                        <div className="text-xs font-semibold text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400" />
                          <span>{field.value || dateVal}</span>
                        </div>
                      )}
                    </div>
                  );
                }

                if (field.type === 'Split text') {
                  const count = field.charCount || 10;
                  const charArray = Array.isArray(field.gridValue) && field.gridValue.length > 0
                    ? field.gridValue
                    : (field.value !== undefined && field.value !== null ? String(field.value).split('') : ['s','-','1']);

                  return (
                    <div key={field.id} id={`doc-field-${field.id}`} className="w-full sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 print:text-slate-600">
                        {field.label || 'Split text'}
                        {field.required && <span className="text-red-500 ml-1 font-bold">*</span>}
                      </label>
                      {!isCompleted ? (
                        <div className="flex border border-sky-400 bg-white text-xs font-mono font-bold text-sky-900 w-fit rounded p-0.5 shadow-2xs">
                          {Array.from({ length: count }).map((_, cIdx) => (
                            <input
                              key={cIdx}
                              id={`split-cell-${field.id}-${cIdx}`}
                              type="text"
                              maxLength={1}
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
                              className="border-r last:border-r-0 border-sky-300 text-center bg-sky-50/40 text-[11px] font-bold text-sky-900 focus:bg-sky-100 focus:outline-none transition selection:bg-sky-200"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="font-mono text-xs font-bold text-slate-800 p-2 bg-slate-50 border border-slate-200 rounded w-fit">
                          {field.value || charArray.join('')}
                        </div>
                      )}
                    </div>
                  );
                }

                if (field.type === 'Checkbox') {
                  return (
                    <div key={field.id} id={`doc-field-${field.id}`} className="flex items-center gap-2 pt-4">
                      <input
                        type="checkbox"
                        checked={field.value === true || field.value === 'true'}
                        onChange={(e) => onUpdateField && onUpdateField(field.id, e.target.checked)}
                        disabled={isCompleted}
                        className="w-4 h-4 rounded text-[#007355] focus:ring-[#007355] cursor-pointer"
                      />
                      <label className="text-xs font-semibold text-slate-700">
                        {field.label || 'I agree to the terms'}
                        {field.required && <span className="text-red-500 ml-1 font-bold">*</span>}
                      </label>
                    </div>
                  );
                }

                // Default Text / Full name / Job title / Company
                return (
                  <div key={field.id} id={`doc-field-${field.id}`} className="w-full sm:w-64">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 print:text-slate-600">
                      {field.label || field.type}
                      {field.required && <span className="text-red-500 ml-1 font-bold">*</span>}
                    </label>
                    {!isCompleted ? (
                      <input
                        type="text"
                        value={field.value !== undefined && field.value !== field.type ? field.value : (field.type === 'Full name' ? signerName : (field.type === 'Company' ? 'Bexcode Services' : ''))}
                        onChange={(e) => onUpdateField && onUpdateField(field.id, e.target.value)}
                        className="w-full p-2.5 text-xs border border-slate-300 rounded-lg bg-white focus:border-[#007355] focus:ring-1 focus:ring-[#007355] outline-none font-semibold text-slate-800 shadow-2xs"
                        placeholder={`Enter ${field.label || field.type.toLowerCase()}`}
                      />
                    ) : (
                      <div className="text-xs font-semibold text-slate-800 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                        {field.value || (field.type === 'Company' ? 'Bexcode Services' : (field.type === 'Full name' ? signerName : '-'))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              {/* Default Standard 3 Fields */}
              <div id="signature-field-container" className="relative">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 print:text-slate-600">
                  Signature
                </label>

                {signaturePlaced || isCompleted || signatureImage ? (
                  <div className="relative inline-block">
                    <div
                      onClick={!isCompleted && onOpenSignatureModal ? onOpenSignatureModal : undefined}
                      className={`p-3 bg-white border border-slate-200 rounded-lg transition shadow-2xs w-fit ${
                        !isCompleted && onOpenSignatureModal ? 'cursor-pointer hover:border-[#1c4b82]' : ''
                      }`}
                    >
                      <SignatureStamp
                        signerName={signerName}
                        signatureImage={signatureImage}
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

                    {showTooltips && !isCompleted && (
                      <div className="absolute left-full top-2 ml-4 p-2.5 bg-slate-900 text-white rounded-lg shadow-xl text-xs font-semibold whitespace-nowrap hidden sm:flex items-center gap-2 z-20 print:hidden pointer-events-none">
                        <span>You've successfully filled all fields. Click Finish to complete.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative inline-block w-64">
                    <button
                      type="button"
                      onClick={onOpenSignatureModal || undefined}
                      className="w-full p-4 border-2 border-emerald-600 bg-emerald-50 text-emerald-800 font-bold text-sm rounded-lg text-left flex items-center justify-between cursor-pointer hover:bg-emerald-100 transition shadow-2xs"
                    >
                      <span>Signature</span>
                      <PenTool size={16} />
                    </button>

                    {showTooltips && (
                      <div className="absolute left-full top-1 ml-4 p-2.5 bg-slate-900 text-white rounded-lg shadow-xl text-xs font-semibold whitespace-nowrap hidden sm:flex items-center gap-3 z-20 print:hidden pointer-events-none">
                        <span>Enter your signature.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* STAMP FIELD */}
              <div className="w-64">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 print:text-slate-600">
                  Stamp
                </label>
                <div className="p-3 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 flex items-center justify-between text-xs text-slate-700 font-bold shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded bg-[#E71414] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                      Bex
                    </div>
                    <span>Corporate Official Stamp</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Verified
                  </span>
                </div>
              </div>

              {/* RECIPIENT EMAIL */}
              <div className="text-xs font-semibold text-slate-600 pt-2">
                {signerEmail || "vimal@bexcodeservices.com"}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
