import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle, Pencil, Trash2, X } from 'lucide-react';

/**
 * Universal confirmation and prompt modal (the companion of GlobalAlertModal).
 *
 * Replaces the browser's own window.confirm() and window.prompt() boxes - which cannot be styled,
 * carry a "localhost:3003 says" header and look different on every device - with the same popup
 * modal the rest of BexSign uses. Awaiting them reads like the native calls they replace:
 *
 *   if (await showConfirmModal('Move this document to trash?')) { ...go ahead... }
 *   if (!await confirmDelete('Invoice 2026.pdf')) return;
 *   const url = await showPromptModal('Image address', { placeholder: 'https://...' });
 *
 * Callable from anywhere - components, plain helpers, event handlers: the call dispatches a
 * 'bexsign-confirm' event that <GlobalConfirmModal />, mounted once in App.jsx, answers. If the
 * host is not mounted (very early boot), the native box answers instead so no flow dead-ends.
 *
 * Options: title, message, tone ('danger' | 'warning' | 'info'), confirmText, cancelText,
 *          details (string[] shown as a list, e.g. the names being deleted),
 *          note (small line under the message), onConfirm (async; the modal shows a spinner
 *          and stays open until it settles).
 */

const CONFIRM_EVENT = 'bexsign-confirm';

// Raised while a host is on screen. Zero means "fall back to the native box" instead of hanging.
let hostCount = 0;

export function showConfirmModal(message, options = {}) {
  const detail = {
    kind: 'confirm',
    message: typeof message === 'string' ? message : String(message ?? ''),
    title: options.title || 'Please confirm',
    tone: options.tone || 'warning',
    confirmText: options.confirmText || 'Confirm',
    cancelText: options.cancelText || 'Cancel',
    details: Array.isArray(options.details) ? options.details.filter(Boolean) : [],
    note: options.note || '',
    onConfirm: typeof options.onConfirm === 'function' ? options.onConfirm : null
  };
  if (hostCount === 0) {
    return Promise.resolve(window.confirm(detail.message));
  }
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent(CONFIRM_EVENT, { detail: { ...detail, resolve } }));
  });
}

/**
 * Asks for one value and resolves with the text typed, or null when cancelled - the modal
 * stand-in for window.prompt(). `required` (the default) keeps the button disabled while empty.
 */
export function showPromptModal(message, options = {}) {
  const detail = {
    kind: 'prompt',
    message: typeof message === 'string' ? message : String(message ?? ''),
    title: options.title || 'Enter a value',
    tone: options.tone || 'info',
    confirmText: options.confirmText || 'OK',
    cancelText: options.cancelText || 'Cancel',
    details: [],
    note: options.note || '',
    onConfirm: null,
    inputLabel: options.inputLabel || '',
    inputType: options.inputType || 'text',
    placeholder: options.placeholder || '',
    defaultValue: options.defaultValue || '',
    required: options.required !== false
  };
  if (hostCount === 0) {
    const typed = window.prompt(detail.message, detail.defaultValue);
    return Promise.resolve(typed === null ? null : typed);
  }
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent(CONFIRM_EVENT, { detail: { ...detail, resolve } }));
  });
}

/** Delete wording and the red button in one call: await confirmDelete('Invoice.pdf') */
export function confirmDelete(what, options = {}) {
  const name = typeof what === 'string' ? what : (what && (what.name || what.title)) || 'this item';
  const { message, ...rest } = options;
  return showConfirmModal(
    message || `Are you sure you want to delete "${name}"? This action cannot be undone.`,
    { title: 'Delete', tone: 'danger', confirmText: 'Delete', ...rest }
  );
}

const TONES = {
  danger: {
    icon: Trash2,
    iconClass: 'text-[#E71414] bg-rose-50 border-rose-100',
    titleClass: 'text-rose-600',
    confirmClass: 'bg-[#E71414] hover:bg-red-700'
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-600 bg-amber-50 border-amber-100',
    titleClass: 'text-slate-900',
    confirmClass: 'bg-[#00a884] hover:bg-[#008f70]'
  },
  info: {
    icon: HelpCircle,
    iconClass: 'text-[#1c4b82] bg-blue-50 border-blue-100',
    titleClass: 'text-slate-900',
    confirmClass: 'bg-[#00a884] hover:bg-[#008f70]'
  }
};

export default function GlobalConfirmModal() {
  const [queue, setQueue] = useState([]);
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState('');
  const queueRef = useRef(queue);
  const busyRef = useRef(false);
  const valueRef = useRef('');
  const confirmButtonRef = useRef(null);
  const inputRef = useRef(null);

  queueRef.current = queue;
  busyRef.current = busy;
  valueRef.current = value;

  const current = queue[0] || null;
  const isPrompt = current?.kind === 'prompt';
  const blockedByEmptyInput = Boolean(isPrompt && current.required && !value.trim());

  useEffect(() => {
    hostCount += 1;
    const onConfirmRequest = (e) => {
      if (e.detail) setQueue((prev) => [...prev, e.detail]);
    };
    window.addEventListener(CONFIRM_EVENT, onConfirmRequest);
    return () => {
      hostCount = Math.max(0, hostCount - 1);
      window.removeEventListener(CONFIRM_EVENT, onConfirmRequest);
    };
  }, []);

  // Answers the question at the head of the queue, then moves on to the next one
  const settle = useCallback(async (answer) => {
    if (busyRef.current) return;
    const head = queueRef.current[0];
    if (!head) return;
    if (head.kind === 'prompt') {
      const typed = valueRef.current;
      if (answer && head.required && !typed.trim()) return;
      try {
        head.resolve(answer ? typed : null);
      } catch (err) {
        console.error(err);
      }
      setQueue((prev) => prev.slice(1));
      return;
    }
    if (answer && head.onConfirm) {
      setBusy(true);
      try {
        await head.onConfirm();
      } catch (err) {
        console.error(err);
      } finally {
        setBusy(false);
      }
    }
    try {
      head.resolve(answer);
    } catch (err) {
      console.error(err);
    }
    setQueue((prev) => prev.slice(1));
  }, []);

  // Enter answers yes and Escape answers no - the same keys the native box uses
  useEffect(() => {
    if (!current) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        settle(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        settle(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, settle]);

  // A fresh question starts from its own default value, with the cursor where the answer goes
  useEffect(() => {
    if (!current) return;
    setValue(current.kind === 'prompt' ? current.defaultValue || '' : '');
    if (current.kind === 'prompt') {
      const id = requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
      return () => cancelAnimationFrame(id);
    }
    confirmButtonRef.current?.focus();
    return undefined;
  }, [current]);

  if (!current) return null;

  const tone = TONES[current.tone] || TONES.warning;
  const ToneIcon = isPrompt ? Pencil : tone.icon;

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[10001] p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={() => settle(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={current.title}
        onClick={(e) => e.stopPropagation()}
        className="bg-white text-slate-900 rounded-xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 text-xs my-auto animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`p-1.5 rounded-lg border shrink-0 ${tone.iconClass}`}>
              <ToneIcon size={18} />
            </span>
            <h3 className={`text-sm sm:text-base font-bold leading-tight break-words ${tone.titleClass}`}>
              {current.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => settle(false)}
            aria-label="Cancel"
            disabled={busy}
            className="text-slate-400 hover:text-slate-700 disabled:opacity-40 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-slate-700 font-medium leading-relaxed break-words whitespace-pre-line">
          {current.message}
        </p>

        {isPrompt && (
          <label className="block space-y-1">
            {current.inputLabel && (
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">{current.inputLabel}</span>
            )}
            <input
              ref={inputRef}
              type={current.inputType}
              value={value}
              placeholder={current.placeholder}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-[#00a884] focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        )}

        {current.details.length > 0 && (
          <ul className="max-h-32 overflow-y-auto rounded-lg bg-slate-50 border border-slate-100 p-2.5 space-y-1">
            {current.details.map((item, index) => (
              <li key={`${item}-${index}`} className="text-slate-600 font-semibold truncate" title={item}>
                {item}
              </li>
            ))}
          </ul>
        )}

        {current.note && <p className="text-[11px] text-slate-500 leading-relaxed">{current.note}</p>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => settle(false)}
            disabled={busy}
            className="px-4 py-1.5 border border-slate-300 rounded text-xs font-semibold hover:bg-slate-50 disabled:opacity-40"
          >
            {current.cancelText}
          </button>
          <button
            type="button"
            ref={confirmButtonRef}
            onClick={() => settle(true)}
            disabled={busy || blockedByEmptyInput}
            className={`${tone.confirmClass} text-white px-5 py-1.5 rounded text-xs font-extrabold shadow transition disabled:opacity-60 flex items-center justify-center gap-2`}
          >
            {busy && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {current.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
