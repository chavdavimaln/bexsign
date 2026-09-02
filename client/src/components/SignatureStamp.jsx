import React from 'react';
import { generateEmployeeSignatureId } from '../utils/documentId';

/**
 * SignatureStamp Component (Authentic 3-Tier Electronic Signature Stamp)
 * 
 * Matches reference image format:
 * 1st: "Signed by: [employee name]"
 * 2nd: Employee signature (handwritten stroke, uploaded image, or cursive style)
 * 3rd: Sign ID (unique generated ID e.g. 413E5DE0947C46B... / BEX-SIGN-VC-EMP001-2026-361682B4)
 * Bracket: Distinct left blue bracket with rounded corners connecting the top "Signed by:" and bottom Sign ID.
 */
export default function SignatureStamp({
  signerName = 'Vimal Chavda',
  signatureImage = '',
  signatureStyle = 'font-signature-1',
  signId = '',
  docId = 1,
  employeeId = 'EMP001',
  className = '',
  onClick = null,
  showBaseline = true,
  showByPrefix = false,
  compact = false
}) {
  // Determine unique signature ID
  const effectiveSignId = signId 
    ? signId 
    : (typeof docId === 'string' && (docId.startsWith('BEX-SIGN') || docId.startsWith('BEX-DOC'))
        ? (docId.startsWith('BEX-SIGN') ? docId : docId.replace('BEX-DOC', 'BEX-SIGN-VC-EMP001'))
        : generateEmployeeSignatureId(employeeId, signerName));

  // Display ID cleanly (if very long, split into 2 neat lines)
  let idLine1 = effectiveSignId;
  let idLine2 = '';
  if (effectiveSignId.length > 26) {
    const dashIdx = effectiveSignId.lastIndexOf('-', 28);
    if (dashIdx > 14) {
      idLine1 = effectiveSignId.substring(0, dashIdx);
      idLine2 = effectiveSignId.substring(dashIdx + 1);
    } else {
      idLine1 = effectiveSignId.substring(0, 24);
      idLine2 = effectiveSignId.substring(24);
    }
  }

  // Authentic handwritten signature stroke matching reference image
  const defaultSignatureSvg = (
    <svg viewBox="0 0 220 70" className="h-12 w-48 stroke-[#1c2434] fill-none" xmlns="http://www.w3.org/2000/svg">
      <path 
        d="M 18 42 Q 28 12 40 32 Q 52 52 38 56 Q 25 54 42 24 Q 60 4 72 42 Q 78 54 90 34 Q 106 12 118 36 Q 134 52 152 38 Q 168 24 180 44 Q 192 56 210 26" 
        strokeWidth="2.2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M 28 48 Q 70 44 125 42 Q 170 39 205 32" 
        strokeWidth="1.6" 
        strokeLinecap="round" 
        opacity="0.85" 
      />
    </svg>
  );

  return (
    <div 
      onClick={onClick}
      className={`inline-flex items-end select-none ${onClick ? 'cursor-pointer hover:opacity-95' : ''} ${className}`}
      title="Verified BexSign Electronic Signature"
    >
      {/* Optional "By: " prefix with baseline on the left matching image */}
      {showByPrefix && (
        <div className="flex items-baseline pr-1 font-serif text-lg text-slate-900 pb-2">
          <span>By:</span>
        </div>
      )}

      <div className="relative py-1 pr-2">
        {/* Main 3-Part Signature Frame */}
        <div className="flex flex-col relative min-w-[210px]">
          
          {/* 1st: Top Blue Bracket & "Signed by: [employee name]" */}
          <div className="flex items-center">
            {/* Top-left rounded blue bracket */}
            <div className="w-3.5 h-3 border-l-[2.5px] border-t-[2.5px] border-[#1c4b82] rounded-tl-[6px] shrink-0" />
            <div className="w-1 border-t-[2.5px] border-[#1c4b82] shrink-0" />
            
            <span className="text-[11px] font-black text-[#1c4b82] tracking-tight px-1 font-sans">
              Signed by:
            </span>

            {signerName && (
              <span className="text-[11px] font-bold text-slate-800 truncate max-w-[140px] font-sans">
                {signerName}
              </span>
            )}
          </div>

          {/* 2nd: Center Employee Signature */}
          <div className="relative pl-3.5 pr-2 py-0.5 flex items-center min-h-[48px] overflow-visible">
            {/* Left vertical continuous blue bracket line */}
            <div className="absolute left-0 top-0 bottom-0 w-[2.5px] bg-[#1c4b82]" />

            {/* Signature rendering */}
            <div className="py-1">
              {signatureImage ? (
                signatureImage.startsWith('data:') || signatureImage.startsWith('http') || signatureImage.startsWith('/') ? (
                  <img 
                    src={signatureImage} 
                    alt="Signature" 
                    className="max-h-12 max-w-[210px] object-contain block mix-blend-multiply select-none pointer-events-none" 
                    draggable={false}
                  />
                ) : (
                  <span className={`text-2xl text-slate-900 leading-none select-none ${signatureStyle}`}>
                    {signatureImage}
                  </span>
                )
              ) : signerName ? (
                <span className={`text-2xl text-slate-900 leading-none select-none ${signatureStyle}`}>
                  {signerName}
                </span>
              ) : (
                /* Authentic handwritten stroke */
                <div className="flex items-center">
                  {defaultSignatureSvg}
                </div>
              )}
            </div>
          </div>

          {/* 3rd: Bottom Baseline & Blue Bracket Curve Leading into Sign ID */}
          <div className="relative">
            {/* Horizontal baseline line extending under signature */}
            {showBaseline && (
              <div className="absolute -left-3 right-0 top-0 border-b border-slate-700/60" />
            )}

            <div className="flex items-start pt-[1px]">
              {/* Bottom-left rounded blue bracket */}
              <div className="w-3.5 h-3 border-l-[2.5px] border-b-[2.5px] border-[#1c4b82] rounded-bl-[6px] shrink-0" />
              <div className="w-1 border-b-[2.5px] border-[#1c4b82] shrink-0" />

              {/* Unique Sign ID in monospace font */}
              <div className="pl-1 text-[9px] font-mono font-bold text-slate-700 leading-[1.15] select-all break-all max-w-[260px]">
                <div className="tracking-tight text-slate-800">{idLine1}</div>
                {idLine2 && <div className="tracking-tight text-slate-800">{idLine2}</div>}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
