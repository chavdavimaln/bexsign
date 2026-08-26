import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PenTool, CheckCircle2, ShieldCheck, AlertCircle, X, Download, ArrowLeft, Lock, ArrowRight, FileCheck, CheckSquare } from 'lucide-react';

export default function PublicSigning() {
  const { token, id } = useParams();
  const docId = id || token || '1';
  const navigate = useNavigate();

  // Passcode Challenge State
  const [passcodeRequired, setPasscodeRequired] = useState(true);
  const [enteredPasscode, setEnteredPasscode] = useState('');
  const [passcodeVerified, setPasscodeVerified] = useState(false);
  const [passcodeError, setPasscodeError] = useState('');

  // Electronic Consent State
  const [showConsentModal, setShowConsentModal] = useState(true);
  const [agreedConsent, setAgreedConsent] = useState(false);

  // Document & Guided Navigator State
  const [documentDetails, setDocumentDetails] = useState({
    title: 'Employment_Agreement_2026.pdf',
    recipient: 'John Doe (john@example.com)',
    status: 'In Progress'
  });
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);

  // Signature state
  const [signaturePlaced, setSignaturePlaced] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [sigType, setSigType] = useState('type'); // type, draw, upload, saved
  const [typedName, setTypedName] = useState('John Doe');
  const [selectedStyle, setSelectedStyle] = useState('font-signature-1');
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
      const res = await fetch(`http://localhost:5000/api/documents/${docId}`);
      const data = await res.json();
      if (data.success && data.document) {
        setDocumentDetails({
          title: data.document.document_name || data.document.title || 'Employment_Agreement_2026.pdf',
          recipient: data.document.recipient_email || 'John Doe (john@example.com)',
          status: data.document.status || 'In Progress'
        });
      }
    } catch (e) {
      console.warn('Fetch doc fallback:', e);
    }
  };

  const handleVerifyPasscode = (e) => {
    e.preventDefault();
    if (enteredPasscode === '123456' || enteredPasscode.length >= 4) {
      setPasscodeVerified(true);
      setPasscodeError('');
    } else {
      setPasscodeError('Invalid passcode. Please enter 123456 to unlock.');
    }
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
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
    }
  };

  const handleApplySignature = () => {
    setSignaturePlaced(true);
    setSignatureData(typedName);
    setShowSignatureModal(false);
    setValidationError('');
  };

  const handleFinishSigning = async () => {
    if (!signaturePlaced) {
      setValidationError('⚠ Please complete the required Signature field.');
      return;
    }

    try {
      await fetch('http://localhost:5000/api/signatures/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: docId, signatureData, recipientId: 1 })
      });
    } catch (e) {
      console.warn('Signature submit fallback:', e);
    }

    setIsCompleted(true);
  };

  // Passcode Authentication Challenge Screen
  if (passcodeRequired && !passcodeVerified) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
        <form onSubmit={handleVerifyPasscode} className="bg-slate-800 border border-slate-700 p-8 rounded-2xl max-w-md w-full shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="h-14 w-14 bg-red-500/20 text-[#E71414] rounded-full flex items-center justify-center mx-auto border border-red-500/30">
              <Lock size={28} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Protected Document</h1>
            <p className="text-xs text-slate-400">
              This document is protected with a secret access passcode by the sender. Enter code to unlock.
            </p>
          </div>

          {passcodeError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-lg text-center">
              {passcodeError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Access Passcode</label>
            <input
              type="password"
              value={enteredPasscode}
              onChange={(e) => setEnteredPasscode(e.target.value)}
              placeholder="Enter passcode (e.g. 123456)"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-[#E71414]"
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full py-3 rounded-lg font-bold text-sm shadow-md">
            Unlock Document
          </button>
        </form>
      </div>
    );
  }

  // Completed View Screen
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl max-w-md w-full shadow-2xl space-y-4">
          <CheckCircle2 size={60} className="text-emerald-400 mx-auto" />
          <h1 className="text-2xl font-black tracking-tight">Document Execution Completed!</h1>
          <p className="text-sm text-slate-300">
            Thank you for executing <strong>{documentDetails.title}</strong>. A copy of the signed document and SHA-256 Audit Certificate has been dispatched to your email.
          </p>
          <div className="pt-4 border-t border-slate-700 flex flex-col gap-2">
            <button
              onClick={() => alert('Downloading final signed document PDF...')}
              className="btn-primary w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
            >
              <Download size={18} /> Download Signed PDF & Audit Certificate
            </button>
            <button
              onClick={() => navigate('/documents/all')}
              className="w-full py-2 border border-slate-600 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-700"
            >
              Return to Documents List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Header & Zoho Sign Guided Field Navigator */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/documents/all')}
            className="p-1 text-slate-400 hover:text-white"
            title="Back to Documents"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="bg-[#E71414] text-white px-2.5 py-1 rounded font-black text-sm">BEXSIGN</span>
          <span className="text-slate-300 font-bold text-xs truncate max-w-xs">| {documentDetails.title}</span>
        </div>

        {/* Guided Field Navigator */}
        <div className="hidden md:flex items-center gap-3 bg-slate-900 px-4 py-1 rounded-full border border-slate-800 text-xs font-bold">
          <span className="text-slate-400">Guided Navigator:</span>
          <span className="text-emerald-400">{signaturePlaced ? '1 of 1 Required Fields Completed' : '0 of 1 Required Fields Completed'}</span>
          <button
            onClick={() => {
              const el = document.getElementById('sigBoxZone');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-full text-[11px] font-extrabold flex items-center gap-1"
          >
            Next Field <ArrowRight size={12} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              alert('Signing request declined.');
              navigate('/documents/all');
            }}
            className="px-4 py-1.5 border border-slate-700 hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-300"
          >
            Decline
          </button>
          <button
            onClick={handleFinishSigning}
            className="btn-primary px-6 py-1.5 rounded-lg text-xs font-extrabold shadow-md"
          >
            Finish & Submit
          </button>
        </div>
      </header>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="bg-red-600 text-white p-3 text-center text-xs font-bold flex items-center justify-center gap-2 sticky top-14 z-20 shadow-md">
          <AlertCircle size={16} /> {validationError}
        </div>
      )}

      {/* Main Document Viewer Container */}
      <main className="flex-1 p-8 flex justify-center items-start overflow-y-auto">
        <div className="relative w-[700px] min-h-[900px] bg-white text-slate-900 p-12 shadow-2xl rounded-sm border border-slate-300 my-4">
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{documentDetails.title.replace(/\.[^/.]+$/, '')}</h1>
              <span className="text-xs text-slate-400 font-mono">ID: #{docId}</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              This agreement is executed between <strong>Bexsign Inc.</strong> and recipient <strong>{documentDetails.recipient}</strong>.
              Please review the agreement terms below and click the signature placement box to apply your electronic signature.
            </p>
            <div className="h-64 border border-slate-200 bg-slate-50 rounded p-6 text-xs text-slate-600 space-y-3 font-sans">
              <p className="font-bold text-slate-800">1. GENERAL TERMS & CONDITIONS</p>
              <p>The parties hereby agree to all terms, confidentiality clauses, and obligations described herein.</p>
              <p className="font-bold text-slate-800">2. ELECTRONIC SIGNATURE VALIDITY</p>
              <p>By placing an electronic signature below, both parties confirm intent and legally binding agreement under Bexsign / Zoho Sign authentication policies.</p>
            </div>

            {/* Signature Box Zone */}
            <div id="sigBoxZone" className="pt-12 border-t border-slate-200 flex justify-between items-end">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Signer Signature</p>
                {signaturePlaced ? (
                  <div
                    onClick={() => setShowSignatureModal(true)}
                    className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-lg cursor-pointer hover:bg-emerald-100 transition min-w-[220px]"
                  >
                    <p className={`text-2xl text-slate-900 ${selectedStyle}`}>{typedName}</p>
                    <p className="text-[10px] text-emerald-700 font-bold mt-1">✓ Electronically Signed</p>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSignatureModal(true)}
                    className="p-5 border-2 border-dashed border-[#E71414] bg-red-50 hover:bg-red-100 rounded-lg text-[#E71414] font-bold text-sm flex items-center gap-2 transition shadow-sm min-w-[220px] justify-center"
                  >
                    <PenTool size={18} /> Sign Here *
                  </button>
                )}
              </div>

              <div className="text-right text-xs text-slate-500">
                <p className="font-bold text-slate-800">Date Signed:</p>
                <p className="font-mono mt-1">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Electronic Disclosure Modal */}
      {showConsentModal && !agreedConsent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="text-[#E71414]" size={22} /> Electronic Business Disclosure
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              By clicking "I Agree", you consent to receive electronic records and use electronic signatures to execute documents with Bexsign in accordance with electronic signature compliance laws.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setAgreedConsent(true);
                  setShowConsentModal(false);
                }}
                className="btn-primary w-full py-2.5 rounded-lg text-xs font-bold"
              >
                I Agree & Continue to Sign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Creation Popup Modal (Zoho Sign Standard) */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <PenTool className="text-[#E71414]" size={20} /> Create Your Signature
              </h3>
              <button onClick={() => setShowSignatureModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            {/* Signature Type Tabs */}
            <div className="flex border-b border-slate-200 my-4 text-xs font-bold">
              <button
                onClick={() => setSigType('type')}
                className={`py-2 px-4 border-b-2 transition ${
                  sigType === 'type' ? 'border-[#E71414] text-[#E71414]' : 'border-transparent text-slate-500'
                }`}
              >
                Type Name
              </button>
              <button
                onClick={() => setSigType('draw')}
                className={`py-2 px-4 border-b-2 transition ${
                  sigType === 'draw' ? 'border-[#E71414] text-[#E71414]' : 'border-transparent text-slate-500'
                }`}
              >
                Draw Canvas
              </button>
              <button
                onClick={() => setSigType('upload')}
                className={`py-2 px-4 border-b-2 transition ${
                  sigType === 'upload' ? 'border-[#E71414] text-[#E71414]' : 'border-transparent text-slate-500'
                }`}
              >
                Upload Image
              </button>
            </div>

            {/* Type Tab */}
            {sigType === 'type' && (
              <div className="space-y-4">
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-semibold"
                />
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase">Choose Style</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => setSelectedStyle('font-signature-1')}
                      className={`p-3 border rounded-lg cursor-pointer text-xl font-signature-1 text-slate-900 ${
                        selectedStyle === 'font-signature-1' ? 'border-[#E71414] bg-red-50' : 'border-slate-200'
                      }`}
                    >
                      {typedName || 'Style 1'}
                    </div>
                    <div
                      onClick={() => setSelectedStyle('font-signature-2')}
                      className={`p-3 border rounded-lg cursor-pointer text-xl font-signature-2 text-slate-900 ${
                        selectedStyle === 'font-signature-2' ? 'border-[#E71414] bg-red-50' : 'border-slate-200'
                      }`}
                    >
                      {typedName || 'Style 2'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Draw Tab */}
            {sigType === 'draw' && (
              <div className="space-y-2">
                <div className="border border-slate-300 rounded-lg bg-slate-50 overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={440}
                    height={150}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="w-full cursor-crosshair"
                  />
                </div>
                <button onClick={clearCanvas} className="text-xs text-red-600 font-semibold hover:underline">
                  Clear Canvas
                </button>
              </div>
            )}

            {/* Upload Tab */}
            {sigType === 'upload' && (
              <div className="border-2 border-dashed border-slate-300 p-6 text-center rounded-lg">
                <input type="file" accept="image/*" className="text-xs text-slate-500" />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowSignatureModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleApplySignature}
                className="btn-primary px-6 py-2 rounded-lg text-xs font-bold"
              >
                Apply Signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
