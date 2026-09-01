import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

/**
 * Universal Modal Alert System
 * Intercepts window.alert and custom 'bexsign-alert' events
 * Displays a clean, modern popup modal on any device (Web, iPad, Mobile)
 */

export function showPopupAlert(message, options = {}) {
  const event = new CustomEvent('bexsign-alert', {
    detail: {
      message: typeof message === 'string' ? message : JSON.stringify(message),
      title: options.title || 'Notification',
      type: options.type || 'info', // 'info' | 'success' | 'warning' | 'error'
      confirmText: options.confirmText || 'OK',
      onConfirm: options.onConfirm || null
    }
  });
  window.dispatchEvent(event);
}

export default function GlobalAlertModal() {
  const [modalState, setModalState] = useState(null);

  useEffect(() => {
    // Override window.alert so all alert() calls throughout the app open this popup modal
    const originalAlert = window.alert;
    window.alert = (msg) => {
      showPopupAlert(msg, { title: 'BexSign Notification', type: 'info' });
    };

    const handleAlertEvent = (e) => {
      if (e.detail) {
        setModalState(e.detail);
      }
    };

    window.addEventListener('bexsign-alert', handleAlertEvent);

    return () => {
      window.alert = originalAlert;
      window.removeEventListener('bexsign-alert', handleAlertEvent);
    };
  }, []);

  if (!modalState) return null;

  const handleClose = () => {
    if (modalState.onConfirm) {
      try {
        modalState.onConfirm();
      } catch (err) {
        console.error(err);
      }
    }
    setModalState(null);
  };

  const getIcon = () => {
    switch (modalState.type) {
      case 'success':
        return <CheckCircle2 size={24} className="text-[#00a884]" />;
      case 'error':
      case 'warning':
        return <AlertCircle size={24} className="text-[#E71414]" />;
      default:
        return <Info size={24} className="text-[#1c4b82]" />;
    }
  };

  const getBorderColor = () => {
    switch (modalState.type) {
      case 'success':
        return 'border-[#00a884]/30';
      case 'error':
      case 'warning':
        return 'border-[#E71414]/30';
      default:
        return 'border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[10000] p-4 animate-in fade-in duration-150">
      <div 
        className={`bg-white text-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border ${getBorderColor()} space-y-4 font-sans text-xs animate-in zoom-in-95 duration-150`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
              {getIcon()}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                {modalState.title || 'Notification'}
              </h3>
              <span className="text-[10px] font-bold text-[#00a884] uppercase tracking-wider">
                BexSign Platform
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="py-2 text-slate-700 font-medium text-xs leading-relaxed break-words whitespace-pre-line">
          {modalState.message}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            onClick={handleClose}
            autoFocus
            className="bg-[#00a884] hover:bg-[#008f70] text-white px-6 py-2 rounded-xl text-xs font-bold shadow-md transition"
          >
            {modalState.confirmText || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
