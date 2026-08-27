import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PenTool, CheckCircle2, ShieldCheck, AlertCircle, X, Download, ArrowLeft, Lock, ArrowRight, FileCheck, CheckSquare, Printer, Mail } from 'lucide-react';

export default function PublicSigning() {
  const { token, id } = useParams();
  const docId = id || token || '1';
  const navigate = useNavigate();

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

  // Signature state
  const [signaturePlaced, setSignaturePlaced] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [sigType, setSigType] = useState('type'); // type, draw, upload
  const [typedName, setTypedName] = useState('Vimal Chavda');
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
          title: data.document.document_name || data.document.title || 'Document Sign 4',
          sender: 'Manu Yadav <manu.yadav@oladigital.health>',
          org: 'Dcode Health',
          recipient: data.document.recipient_email || 'vimal@bexcodeservices.com',
          status: data.document.status || 'In Progress',
          expiresIn: '15 days'
        });
      }
    } catch (e) {
      console.warn('Fetch doc fallback:', e);
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
    if (!agreedConsent) {
      setValidationError('⚠ Please confirm electronic record and signature disclosure consent.');
      return;
    }
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

  // 1. Document Info Landing Screen (Page 11 PDF)
  if (showLandingScreen) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="bg-white border border-slate-300 rounded-2xl max-w-lg w-full p-8 shadow-xl space-y-6">
          <div className="text-center pb-4 border-b border-slate-200">
            <h1 className="text-2xl font-bold text-slate-900">Document info</h1>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex justify-between border-b pb-2">
              <span className="font-bold text-slate-500">Document name</span>
              <span className="font-bold text-slate-900">{documentDetails.title}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-bold text-slate-500">Sender</span>
              <span className="font-semibold text-slate-800">{documentDetails.sender}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-bold text-slate-500">Organization</span>
              <span className="font-semibold text-slate-800">{documentDetails.org}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-bold text-slate-500">Sent on</span>
              <span className="font-semibold text-slate-800">Aug 27, 2026 &lt;Expires in {documentDetails.expiresIn}&gt;</span>
            </div>
          </div>

          <div className="pt-4 flex justify-center">
            <button
              onClick={() => setShowLandingScreen(false)}
              className="bg-[#00a884] hover:bg-[#008f70] text-white px-8 py-3 rounded-lg font-bold text-sm shadow-md transition"
            >
              Proceed to document
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Signer Completion Screen (Page 12 PDF)
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-6">
          <h1 className="text-3xl font-light text-slate-500 tracking-tight">
            You have signed this document.
          </h1>

          {/* Page 12 PDF Action Buttons: Email to me, Print, Download */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => alert('Signed document emailed to you!')}
              className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-800 shadow-xs flex items-center gap-2"
            >
              <Mail size={16} /> Email to me
            </button>

            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-800 shadow-xs flex items-center gap-2"
            >
              <Printer size={16} /> Print
            </button>

            <button
              onClick={() => alert('Downloading final signed document...')}
              className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-800 shadow-xs flex items-center gap-2"
            >
              <Download size={16} /> Download
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 text-slate-900 flex flex-col font-sans">
      {/* Top Disclosure Consent Header Bar (Page 11 PDF) */}
      <div className="bg-slate-800 text-white px-6 py-2.5 flex items-center justify-between text-xs sticky top-0 z-30 shadow-md">
        <label className="flex items-center gap-2 cursor-pointer font-medium">
          <input
            type="checkbox"
            checked={agreedConsent}
            onChange={(e) => setAgreedConsent(e.target.checked)}
            className="accent-[#00a884]"
          />
          <span>
            I confirm that I have read and understood the <strong className="underline">"Electronic Record and Signature Disclosure"</strong> and consent to use electronic records and signatures.
          </span>
        </label>
        <button
          onClick={() => setAgreedConsent(true)}
          className={`px-4 py-1.5 rounded font-bold text-xs transition ${
            agreedConsent ? 'bg-[#00a884] text-white' : 'bg-slate-700 text-slate-300'
          }`}
        >
          Agree & Continue
        </button>
      </div>

      {/* Guided Navigator Toolbar (Page 11 PDF) */}
      <header className="h-12 bg-white border-b border-slate-300 px-6 flex items-center justify-between sticky top-10 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="bg-[#00a884] text-white px-2 py-0.5 rounded font-black text-xs">BEXSIGN</span>
          <span className="text-slate-600 font-bold text-xs">Documents</span>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
            Fields remaining: {signaturePlaced ? 0 : 1}
          </span>
          <button
            onClick={handleFinishSigning}
            className="bg-[#00a884] hover:bg-[#008f70] text-white px-5 py-1.5 rounded font-bold transition"
          >
            Finish
          </button>
        </div>
      </header>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="bg-red-600 text-white p-3 text-center text-xs font-bold flex items-center justify-center gap-2 sticky top-22 z-20 shadow-md">
          <AlertCircle size={16} /> {validationError}
        </div>
      )}

      {/* Main Document Viewer Container (Page 11 PDF) */}
      <main className="flex-1 p-8 flex justify-center items-start overflow-y-auto">
        <div className="relative w-[700px] min-h-[900px] bg-white text-slate-900 p-12 shadow-xl rounded-sm border border-slate-300 my-4 space-y-6">
          <div className="border-b pb-3 flex justify-between items-center text-xs text-slate-400 font-mono">
            <span>Zoho Sign Document ID: 361682B4-ZERZWVA2U19FQKO...</span>
          </div>

          <div className="space-y-4 text-xs text-slate-700">
            <p className="text-xl font-black text-slate-900">My new Document 4 data</p>

            {/* Signature Box & Field Prompt Box (Page 11 PDF) */}
            <div className="pt-8 border-t border-slate-200 relative">
              <div className="w-64">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Signature</label>
                {signaturePlaced ? (
                  <div
                    onClick={() => setShowSignatureModal(true)}
                    className="p-3 bg-emerald-50 border-2 border-emerald-500 rounded cursor-pointer hover:bg-emerald-100 transition"
                  >
                    <p className={`text-xl text-slate-900 ${selectedStyle}`}>{typedName}</p>
                    <p className="text-[10px] text-emerald-700 font-bold mt-1">✓ Signature Placed</p>
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() => setShowSignatureModal(true)}
                      className="w-full p-4 border-2 border-emerald-600 bg-emerald-50 text-emerald-800 font-bold text-sm rounded text-left flex items-center justify-between"
                    >
                      <span>Signature</span>
                      <PenTool size={16} />
                    </button>

                    {/* Field Prompt Box (Page 11 PDF Screenshot) */}
                    <div className="absolute left-full top-0 ml-4 p-2 bg-slate-900 text-white rounded shadow-lg text-xs font-semibold whitespace-nowrap flex items-center gap-3 z-10">
                      <span>Enter your signature.</span>
                      <div className="flex gap-1 text-[10px]">
                        <span className="px-2 py-0.5 bg-slate-700 rounded cursor-pointer">Previous</span>
                        <span className="px-2 py-0.5 bg-[#00a884] rounded cursor-pointer font-bold">Next</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 text-xs font-semibold text-slate-500">
                vimal@bexcodeservices.com
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Signature Creation Popup Modal (Page 12 PDF) */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white text-slate-900 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create Signature</h3>
              <button onClick={() => setShowSignatureModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            {/* Signature Type Tabs (Page 12 PDF) */}
            <div className="flex border-b border-slate-200 my-4 text-xs font-bold">
              <button
                onClick={() => setSigType('type')}
                className={`py-2 px-4 border-b-2 transition ${
                  sigType === 'type' ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-slate-500'
                }`}
              >
                TYPE
              </button>
              <button
                onClick={() => setSigType('draw')}
                className={`py-2 px-4 border-b-2 transition ${
                  sigType === 'draw' ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-slate-500'
                }`}
              >
                DRAW
              </button>
              <button
                onClick={() => setSigType('upload')}
                className={`py-2 px-4 border-b-2 transition ${
                  sigType === 'upload' ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-slate-500'
                }`}
              >
                UPLOAD
              </button>
            </div>

            {/* Type Tab */}
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

                <div className="space-y-2">
                  <div
                    onClick={() => setSelectedStyle('font-signature-1')}
                    className={`p-3 border rounded-lg cursor-pointer text-xl font-signature-1 text-slate-900 ${
                      selectedStyle === 'font-signature-1' ? 'border-[#00a884] bg-emerald-50' : 'border-slate-200'
                    }`}
                  >
                    ✓ {typedName}
                  </div>
                  <div
                    onClick={() => setSelectedStyle('font-signature-2')}
                    className={`p-3 border rounded-lg cursor-pointer text-xl font-signature-2 text-slate-900 ${
                      selectedStyle === 'font-signature-2' ? 'border-[#00a884] bg-emerald-50' : 'border-slate-200'
                    }`}
                  >
                    {typedName}
                  </div>
                </div>

                <label className="flex items-center gap-2 font-semibold text-slate-600">
                  <input type="checkbox" className="accent-[#00a884]" defaultChecked /> Fills the signature in all places
                </label>
              </div>
            )}

            {/* Draw Tab */}
            {sigType === 'draw' && (
              <div className="space-y-2 text-xs">
                <div className="border border-slate-300 rounded bg-slate-50">
                  <canvas
                    ref={canvasRef}
                    width={440}
                    height={140}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="w-full cursor-crosshair"
                  />
                </div>
                <button onClick={clearCanvas} className="text-xs text-red-600 font-semibold hover:underline">
                  Clear
                </button>
              </div>
            )}

            {/* Upload Tab */}
            {sigType === 'upload' && (
              <div className="border-2 border-dashed border-slate-300 p-6 text-center rounded">
                <input type="file" accept="image/*" className="text-xs text-slate-500" />
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
                className="bg-[#00a884] hover:bg-[#008f70] text-white px-5 py-1.5 rounded text-xs font-bold"
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
