import React from 'react';
import { generateBexsignId, generateEmployeeSignatureId } from '../utils/documentId';

/**
 * SignatureStamp Component (Page 12 Format)
 * 
 * Implements the exact signature format requested:
 * a. Signed by: employee name
 * b. Sign (authentic handwritten cursive stroke / drawn / uploaded image)
 * c. Specific id – unique employee id with meaningful letters
 */
export default function SignatureStamp({
  signerName = 'Vimal Chavda',
  signatureImage = '',
  signatureStyle = 'font-signature-1',
  docId = 1,
  employeeId = 'EMP001',
  className = '',
  onClick = null,
  showBaseline = true
}) {
  const fullSignatureId = typeof docId === 'string' && (docId.startsWith('BEX-SIGN') || docId.startsWith('BEX-DOC'))
    ? (docId.startsWith('BEX-SIGN') ? docId : docId.replace('BEX-DOC', 'BEX-SIGN-VC-EMP001'))
    : generateEmployeeSignatureId(employeeId, signerName);

  // Split Doc ID cleanly into two visible lines without truncation
  let docIdLine1 = '';
  let docIdLine2 = '';

  if (fullSignatureId.length > 25) {
    const splitIndex = fullSignatureId.lastIndexOf('-', 28);
    if (splitIndex !== -1 && splitIndex > 15) {
      docIdLine1 = fullSignatureId.substring(0, splitIndex);
      docIdLine2 = fullSignatureId.substring(splitIndex + 1);
    } else {
      docIdLine1 = fullSignatureId.substring(0, 24);
      docIdLine2 = fullSignatureId.substring(24);
    }
  } else {
    docIdLine1 = fullSignatureId;
    docIdLine2 = 'SECURE-VERIFIED-BEXSIGN';
  }

  // Realistic handwritten stroke SVG fallback when no custom image or drawing is provided
  const defaultSignatureSvg = (
    <svg viewBox="0 0 200 65" className="h-12 w-48 stroke-slate-800 fill-none" xmlns="http://www.w3.org/2000/svg">
      <path 
        d="M 15 35 Q 25 10 35 30 Q 45 50 30 55 Q 20 52 35 25 Q 50 5 60 40 Q 65 52 75 35 Q 90 10 100 35 Q 115 50 130 38 Q 145 25 155 45 Q 165 55 185 28" 
        strokeWidth="1.8" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M 25 45 Q 60 42 110 40 Q 150 38 180 32" 
        strokeWidth="1.4" 
        strokeLinecap="round" 
        opacity="0.85" 
      />
    </svg>
  );

  return (
    <div 
      onClick={onClick}
      className={`inline-block select-none ${onClick ? 'cursor-pointer hover:opacity-95' : ''} ${className}`}
      title="Verified BexSign Electronic Signature"
    >
      <div className="relative py-1 pr-3">
        {/* Main Signature Block */}
        <div className="flex flex-col relative">
          
          {/* 1st: "Signed by:" with Top Blue Curved Bracket */}
          <div className="flex items-center">
            {/* Top-left blue curved bracket */}
            <div className="w-3.5 h-3 border-l-2 border-t-2 border-[#1c4b82] rounded-tl-md shrink-0" />
            <div className="w-1 border-t-2 border-[#1c4b82] shrink-0" />
            
            <span className="text-[11px] font-extrabold text-[#1c4b82] tracking-tight px-1 font-sans">
              Signed by:
            </span>

            {signerName && (
              <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[140px] font-sans">
                {signerName}
              </span>
            )}
          </div>

          {/* 2nd: Center Signature Image / Drawing */}
          <div className="relative pl-3.5 pr-2 py-0.5 flex items-center min-h-[50px] overflow-visible">
            {/* Left vertical continuous blue line */}
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#1c4b82]" />

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
                    {signerName}
                  </span>
                )
              ) : (
                /* Authentic handwritten signature stroke matching image */
                <div className="flex items-center">
                  {defaultSignatureSvg}
                </div>
              )}
            </div>
          </div>

          {/* 3rd: Bottom Baseline & Blue Bracket Curve Leading into Small Doc ID in Two Lines */}
          <div className="relative">
            {/* Horizontal baseline line extending across */}
            {showBaseline && (
              <div className="absolute left-0 right-0 top-0 border-b border-slate-700/60" />
            )}

            <div className="flex items-start">
              {/* Bottom-left blue curved bracket */}
              <div className="w-3.5 h-3 border-l-2 border-b-2 border-[#1c4b82] rounded-bl-md shrink-0" />
              <div className="w-1 border-b-2 border-[#1c4b82] shrink-0" />

              {/* Small Doc ID properly visible in two lines without 3 dots */}
              <div className="pl-1 text-[9px] font-mono font-bold text-slate-700 leading-[1.15] select-all break-all max-w-[260px]">
                <div className="tracking-tighter">{docIdLine1}</div>
                <div className="tracking-tighter">{docIdLine2}</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
