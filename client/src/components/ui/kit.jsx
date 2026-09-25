import React, { useCallback, useEffect, useState } from 'react';
import { Search, X, ChevronLeft, ChevronRight, Loader2, AlertCircle, CheckCircle2, Inbox, RefreshCw } from 'lucide-react';

/**
 * BexSign UI kit for the admin modules (Reports, Settings, Permissions, Notifications, security logs, developer).
 * Brand accents: emerald #007355 for actions, red #E71414 for the brand, slate for text and borders.
 */

const TONES = {
  emerald: { soft: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'bg-emerald-100 text-[#007355]', dot: 'bg-emerald-500' },
  sky: { soft: 'bg-sky-50 text-sky-700 border-sky-200', icon: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500' },
  amber: { soft: 'bg-amber-50 text-amber-800 border-amber-200', icon: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  rose: { soft: 'bg-rose-50 text-rose-700 border-rose-200', icon: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
  violet: { soft: 'bg-violet-50 text-violet-700 border-violet-200', icon: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  indigo: { soft: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  orange: { soft: 'bg-orange-50 text-orange-700 border-orange-200', icon: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  slate: { soft: 'bg-slate-100 text-slate-700 border-slate-200', icon: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  red: { soft: 'bg-red-50 text-[#c81010] border-red-200', icon: 'bg-red-100 text-[#E71414]', dot: 'bg-[#E71414]' }
};
export const tone = (name) => TONES[name] || TONES.slate;

export function PageHeader({ eyebrow, title, description, icon: Icon, actions, children }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-emerald-50/60 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          {Icon && (
            <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-[#007355] text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <Icon size={21} />
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="text-[11px] font-bold uppercase tracking-wider text-[#007355]">{eyebrow}</p>}
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 break-words">{title}</h1>
            {description && <p className="text-sm text-slate-500 mt-1 max-w-3xl">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </section>
  );
}

export function StatCard({ label, value, icon: Icon, tone: toneName = 'emerald', hint, onClick, active = false }) {
  const t = tone(toneName);
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`text-left bg-white border rounded-2xl p-4 flex items-start gap-3 transition ${onClick ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : ''} ${active ? 'border-[#007355] ring-2 ring-emerald-100' : 'border-slate-200'}`}
    >
      {Icon && (
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.icon}`}>
          <Icon size={19} />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
        <span className="block text-2xl font-black text-slate-900 leading-tight mt-0.5 tabular-nums">{value}</span>
        {hint && <span className="block text-[11px] text-slate-500 mt-0.5">{hint}</span>}
      </span>
    </Tag>
  );
}

export function Card({ title, description, actions, children, className = '', bodyClassName = 'p-4 sm:p-5' }) {
  return (
    <section className={`bg-white border border-slate-200 rounded-2xl shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-extrabold text-slate-900">{title}</h2>}
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function Badge({ tone: toneName = 'slate', children, dot = false, className = '' }) {
  const t = tone(toneName);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${t.soft} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />}
      {children}
    </span>
  );
}

export function Button({ variant = 'primary', icon: Icon, children, busy = false, className = '', ...props }) {
  const styles = {
    primary: 'bg-[#007355] hover:bg-[#005c44] text-white shadow-sm',
    secondary: 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    ghost: 'text-slate-600 hover:bg-slate-100',
    subtleDanger: 'bg-white border border-red-200 text-red-600 hover:bg-red-50'
  };
  return (
    <button
      type="button"
      {...props}
      disabled={busy || props.disabled}
      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${styles[variant]} ${className}`}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="py-14 px-4 text-center">
      <span className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
        <Icon size={26} />
      </span>
      <p className="text-sm font-bold text-slate-800">{title}</p>
      {description && <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
      <AlertCircle size={16} className="shrink-0 mt-0.5" />
      <p className="flex-1 font-semibold">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="flex items-center gap-1 font-bold hover:underline shrink-0">
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading...' }) {
  return (
    <p className="py-14 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
      <Loader2 size={16} className="animate-spin" /> {label}
    </p>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-[#007355] focus:ring-2 focus:ring-emerald-100"
      />
    </div>
  );
}

export function SelectInput({ value, onChange, options, label, className = '' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className={`px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white text-slate-700 cursor-pointer focus:outline-none focus:border-[#007355] ${className}`}
    >
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

export function Field({ label, hint, children, required = false }) {
  return (
    <label className="block text-xs">
      <span className="block font-bold text-slate-700 mb-1">{label}{required && <span className="text-red-500"> *</span>}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

export const inputClass = 'w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-[#007355] focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-500';

/**
 * A switch with its label beside it. In a table, where the column header already says what the switch is for,
 * pass `hideLabel` so the label stays available to screen readers without crowding the cell.
 */
export function Toggle({ checked, onChange, label, description, disabled = false, hideLabel = false }) {
  return (
    <label className={`flex items-start ${hideLabel ? 'justify-center' : 'justify-between'} gap-4 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      {hideLabel && label && <span className="sr-only">{label}</span>}
      {!hideLabel && (label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-semibold text-slate-800">{label}</span>}
          {description && <span className="block text-xs text-slate-500 mt-0.5">{description}</span>}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${checked ? 'bg-[#007355]' : 'bg-slate-300'} disabled:cursor-not-allowed`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </label>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto overflow-y-hidden pb-px border-b border-slate-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={`px-3.5 py-2.5 text-sm font-bold flex items-center gap-2 whitespace-nowrap border-b-2 -mb-px transition cursor-pointer ${
            active === t.id ? 'border-[#007355] text-[#007355]' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.icon && <t.icon size={15} />}
          {t.label}
          {t.count !== undefined && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active === t.id ? 'bg-emerald-100 text-[#007355]' : 'bg-slate-100 text-slate-500'}`}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function pageList(current, total) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

export function Pagination({ page, pageSize, total, onPage, onPageSize, pageSizes = [10, 25, 50, 100] }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  if (total === 0) return null;
  return (
    <div className="px-3 sm:px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
      <div className="flex items-center gap-3 flex-wrap">
        <span>
          Showing <strong>{(current - 1) * pageSize + 1}</strong>-<strong>{Math.min(current * pageSize, total)}</strong> of <strong>{total}</strong>
        </span>
        {onPageSize && (
          <label className="flex items-center gap-1.5">
            <span>Per page</span>
            <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} className="px-2 py-1 border border-slate-300 rounded-lg bg-white cursor-pointer">
              {pageSizes.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
      </div>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button type="button" disabled={current === 1} onClick={() => onPage(current - 1)} aria-label="Previous page" className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed">
          <ChevronLeft size={15} />
        </button>
        {pageList(current, totalPages).map((p) => (typeof p === 'string' ? (
          <span key={p} className="px-1 text-slate-400">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            aria-current={p === current ? 'page' : undefined}
            className={`min-w-8 h-8 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${p === current ? 'bg-[#007355] text-white' : 'border border-slate-200 hover:bg-slate-50'}`}
          >
            {p}
          </button>
        )))}
        <button type="button" disabled={current === totalPages} onClick={() => onPage(current + 1)} aria-label="Next page" className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed">
          <ChevronRight size={15} />
        </button>
      </nav>
    </div>
  );
}

export function Modal({ open, onClose, title, description, icon: Icon, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const width = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size] || 'max-w-xl';
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-stretch sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} onClick={(e) => e.stopPropagation()} className={`bg-white w-full ${width} sm:rounded-2xl shadow-2xl flex flex-col max-h-full sm:max-h-[90vh] overflow-hidden`}>
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {Icon && <span className="w-9 h-9 rounded-xl bg-emerald-50 text-[#007355] flex items-center justify-center shrink-0"><Icon size={18} /></span>}
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-slate-900">{title}</h2>
              {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={onCancel}>
      <div role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-3">
        <h2 className="text-sm font-extrabold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} busy={busy} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

/** const [toast, showToast] = useToast(); showToast('success' | 'error', 'Message'); render {toast} */
export function useToast() {
  const [state, setState] = useState(null);
  useEffect(() => {
    if (!state) return undefined;
    const timer = setTimeout(() => setState(null), 3800);
    return () => clearTimeout(timer);
  }, [state]);
  const show = useCallback((type, text) => setState({ type, text, key: Date.now() }), []);
  const element = state ? (
    <div role="status" key={state.key} className={`fixed bottom-5 right-5 left-5 sm:left-auto z-[60] max-w-sm px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-start gap-2 ${state.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
      {state.type === 'error' ? <AlertCircle size={16} className="shrink-0" /> : <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
      <span>{state.text}</span>
    </div>
  ) : null;
  return [element, show];
}

export const tableWrap = 'overflow-x-auto';
export const thClass = 'px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-50 whitespace-nowrap';
export const tdClass = 'px-4 py-3 align-middle text-xs text-slate-700';

export function formatDateTime(value, { withTime = true } = {}) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-US', withTime
    ? { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatRelative(value) {
  if (!value) return '';
  const d = new Date(value);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (Number.isNaN(diff)) return '';
  if (diff < 45) return 'just now';
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} h ago`;
  if (diff < 7 * 86400) return `${Math.round(diff / 86400)} d ago`;
  return formatDateTime(value, { withTime: false });
}
