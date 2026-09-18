import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, Copy, Lock, Save, Undo2 } from 'lucide-react';
import { Button } from '../ui/kit';

/**
 * Pieces shared by the settings and developer pages: clipboard copy, code blocks, the unsaved-changes bar,
 * inline field errors and the read-only notice.
 */

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // Fallback for browsers without the async clipboard (e.g. plain http on another host)
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (err) {}
    area.remove();
    return ok;
  }
}

export function CopyButton({ text, label = 'Copy', copiedLabel = 'Copied', dark = false, iconOnly = false, className = '', ariaLabel }) {
  const [state, setState] = useState('idle');
  useEffect(() => {
    if (state === 'idle') return undefined;
    const timer = setTimeout(() => setState('idle'), 1800);
    return () => clearTimeout(timer);
  }, [state]);
  // `text` may be a function (e.g. loads a secret first)
  const onCopy = async () => {
    try {
      const value = typeof text === 'function' ? await text() : text;
      setState(value && (await copyText(value)) ? 'copied' : 'failed');
    } catch (e) {
      setState('failed');
    }
  };
  const Icon = state === 'copied' ? Check : Copy;
  const tone = dark
    ? 'text-slate-300 hover:text-white hover:bg-white/10'
    : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50';
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={ariaLabel || label}
      title={ariaLabel || label}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition cursor-pointer shrink-0 ${tone} ${className}`}
    >
      <Icon size={13} className={state === 'copied' ? 'text-emerald-500' : ''} />
      {!iconOnly && <span aria-live="polite">{state === 'copied' ? copiedLabel : state === 'failed' ? 'Copy failed' : label}</span>}
    </button>
  );
}

export function CodeBlock({ code, title, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900 overflow-hidden min-w-0 ${className}`}>
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-800">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 truncate">{title}</span>
        <CopyButton text={code} dark ariaLabel={`Copy ${title || 'code'}`} />
      </div>
      <pre className="p-3 text-[11px] leading-relaxed text-slate-100 overflow-x-auto max-h-96"><code>{code}</code></pre>
    </div>
  );
}

/** Sticky bar at the bottom of the scrolling page while a form has unsaved changes. */
export function SaveBar({ visible, saving, onSave, onDiscard, count = 0, blocked = false }) {
  if (!visible) return null;
  return (
    <div className="sticky bottom-3 z-20 pt-2">
      <div role="region" aria-label="Unsaved changes" className="mx-auto max-w-3xl bg-slate-900 text-white rounded-2xl shadow-2xl shadow-slate-900/20 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={15} className={blocked ? 'text-red-400 shrink-0' : 'text-amber-400 shrink-0'} />
          {blocked ? 'Fix the highlighted fields before saving.' : `You have ${count || 'some'} unsaved change${count === 1 ? '' : 's'}.`}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Undo2} onClick={onDiscard} disabled={saving} className="flex-1 sm:flex-none">Discard</Button>
          <Button icon={Save} busy={saving} onClick={onSave} className="flex-1 sm:flex-none">Save changes</Button>
        </div>
      </div>
    </div>
  );
}

export function FieldError({ message, id }) {
  if (!message) return null;
  return <span id={id} role="alert" className="block text-[11px] font-semibold text-red-600 mt-1">{message}</span>;
}

export function ReadOnlyNotice({ children }) {
  return (
    <div role="note" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
      <Lock size={15} className="shrink-0 mt-0.5" />
      <p className="font-semibold">{children}</p>
    </div>
  );
}

/** Title with an icon for <Card title>. */
export function SectionTitle({ icon: Icon, children }) {
  return (
    <span className="flex items-center gap-2">
      {Icon && <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#007355] flex items-center justify-center shrink-0"><Icon size={15} /></span>}
      {children}
    </span>
  );
}

/** Warns before the tab is closed or reloaded while there are unsaved changes. */
export function useUnsavedChangesPrompt(dirty) {
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);
}
