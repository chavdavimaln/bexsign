import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, Copy, Monitor, Smartphone, Tablet, Terminal, HelpCircle } from 'lucide-react';

/**
 * Shared pieces of the Security & compliance pages (Failed access, Document validity, Activity history):
 * query strings, debounced search, copy buttons, device labels, date range inputs and two small SVG charts.
 */

/** '?a=1&b=x' from an object, leaving out empty values. */
export function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export const shortHash = (hash, size = 10) => (hash ? `${hash.slice(0, size)}…${hash.slice(-6)}` : '-');

export function formatDay(day, withWeekday = false) {
  const d = new Date(`${day}T00:00:00`);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString('en-US', withWeekday ? { weekday: 'short', month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric' });
}

export function CopyButton({ value, label = 'Copy', className = '' }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch (e) {
      // Clipboard blocked (http, old browser): select-and-copy fallback
      const area = document.createElement('textarea');
      area.value = value;
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
        setCopied(true);
      } catch (err) {}
      area.remove();
    }
  };
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? 'Copied' : label}
      aria-label={copied ? 'Copied' : label}
      className={`inline-flex items-center justify-center w-9 h-9 sm:w-7 sm:h-7 rounded-lg shrink-0 transition cursor-pointer ${copied ? 'bg-emerald-50 text-[#007355]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'} ${className}`}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

const DEVICE_ICONS = { desktop: Monitor, mobile: Smartphone, tablet: Tablet, script: Terminal };

export function DeviceLabel({ device, userAgent }) {
  if (!device) return <span className="text-slate-400">-</span>;
  const Icon = DEVICE_ICONS[device.type] || HelpCircle;
  return (
    <span className="flex items-center gap-1.5 min-w-0 max-w-full" title={userAgent || device.label}>
      <Icon size={14} className="text-slate-400 shrink-0" />
      <span className="truncate">{device.label}</span>
    </span>
  );
}

export function DateRangeInputs({ from, to, onChange, className = '' }) {
  const input = 'w-full min-w-0 px-2.5 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white text-slate-700 focus:outline-none focus:border-[#007355] focus:ring-2 focus:ring-emerald-100';
  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      <input type="date" value={from} max={to || undefined} onChange={(e) => onChange({ from: e.target.value, to })} aria-label="From date" title="From date" className={input} />
      <input type="date" value={to} min={from || undefined} onChange={(e) => onChange({ from, to: e.target.value })} aria-label="To date" title="To date" className={input} />
    </div>
  );
}

// The SVGs are absolutely positioned: their measured width never props up the container on resize
function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    const update = () => setWidth(ref.current ? ref.current.clientWidth : 0);
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

// Values of a chart as a table for screen readers
function ChartTable({ caption, data, valueLabel }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead><tr><th scope="col">Day</th><th scope="col">{valueLabel}</th></tr></thead>
      <tbody>{data.map((d) => <tr key={d.day}><td>{formatDay(d.day)}</td><td>{d.count}</td></tr>)}</tbody>
    </table>
  );
}

function Tooltip({ x, width, children }) {
  // Keep the centred, nowrap tooltip inside narrow (phone-width) charts
  const edge = width < 480 ? 84 : 60;
  const left = Math.min(Math.max(x, edge), Math.max(edge, width - edge));
  return (
    <div className="pointer-events-none absolute -top-1 -translate-y-full -translate-x-1/2 z-10 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg whitespace-nowrap" style={{ left }}>
      {children}
    </div>
  );
}

/** Single-series trend (line + wash) of daily counts, with a crosshair tooltip. data: [{ day, count }] */
export function TrendChart({ data, color = '#e11d48', height = 92, label = 'Count', caption }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const pad = { top: 10, right: 8, bottom: 20, left: 8 };
  const max = Math.max(1, ...data.map((d) => d.count));
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const x = (i) => pad.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v) => pad.top + innerH - (v / max) * innerH;
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.count).toFixed(1)}`).join(' ');
  const area = data.length ? `${line} L${x(data.length - 1).toFixed(1)},${pad.top + innerH} L${x(0).toFixed(1)},${pad.top + innerH} Z` : '';
  const peak = data.reduce((best, d, i) => (d.count > (data[best]?.count ?? -1) ? i : best), 0);
  const last = data.length - 1;

  const onMove = (event) => {
    if (!data.length || !innerW) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left - pad.left;
    setHover(Math.max(0, Math.min(last, Math.round((px / innerW) * last))));
  };
  const labelIndexes = [...new Set([0, last].concat(data[peak]?.count ? [peak] : []))];

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && data.length > 0 && (
        <svg width={width} height={height} role="img" aria-label={caption} onMouseMove={onMove} onClick={onMove} onMouseLeave={() => setHover(null)} className="absolute inset-0 block overflow-visible">
          <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="#e2e8f0" strokeWidth="1" />
          <path d={area} fill={color} opacity="0.1" />
          <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + innerH} stroke="#94a3b8" strokeWidth="1" />}
          {labelIndexes.map((i) => (
            <circle key={i} cx={x(i)} cy={y(data[i].count)} r="4" fill={color} stroke="#fff" strokeWidth="2" />
          ))}
          {hover !== null && <circle cx={x(hover)} cy={y(data[hover].count)} r="5" fill={color} stroke="#fff" strokeWidth="2" />}
          {[0, last].map((i) => (
            <text key={i} x={x(i)} y={height - 4} textAnchor={i === 0 ? 'start' : 'end'} className="fill-slate-400" fontSize="10" fontWeight="600">
              {i === last ? 'Today' : formatDay(data[i].day)}
            </text>
          ))}
          {data[peak]?.count > 0 && hover === null && (
            <text x={x(peak)} y={Math.max(9, y(data[peak].count) - 8)} textAnchor={peak === 0 ? 'start' : peak === last ? 'end' : 'middle'} className="fill-slate-600" fontSize="10" fontWeight="700">
              {data[peak].count}
            </text>
          )}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <Tooltip x={x(hover)} width={width}>
          {formatDay(data[hover].day, true)} · {data[hover].count} {label.toLowerCase()}
        </Tooltip>
      )}
      <ChartTable caption={caption} data={data} valueLabel={label} />
    </div>
  );
}

/** Daily columns (<= 24px, rounded data-end, 2px gaps) with a per-column tooltip. data: [{ day, count }] */
export function DayColumns({ data, color = '#007355', height = 88, label = 'Events', caption }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const pad = { top: 8, bottom: 18 };
  const max = Math.max(1, ...data.map((d) => d.count));
  const innerH = height - pad.top - pad.bottom;
  const band = data.length ? width / data.length : 0;
  const barW = Math.max(2, Math.min(24, band - 2));
  const r = Math.min(4, barW / 2);
  const every = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(width / 56))));

  const column = (d, i) => {
    const h = d.count ? Math.max(3, (d.count / max) * innerH) : 0;
    const x0 = i * band + (band - barW) / 2;
    const base = pad.top + innerH;
    if (!h) return null;
    const rr = Math.min(r, h);
    // Rounded at the data end, square at the baseline
    return (
      <path
        d={`M${x0},${base} L${x0},${base - h + rr} Q${x0},${base - h} ${x0 + rr},${base - h} L${x0 + barW - rr},${base - h} Q${x0 + barW},${base - h} ${x0 + barW},${base - h + rr} L${x0 + barW},${base} Z`}
        fill={color}
        opacity={hover === null || hover === i ? 1 : 0.45}
      />
    );
  };

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && data.length > 0 && (
        <svg width={width} height={height} role="img" aria-label={caption} onMouseLeave={() => setHover(null)} className="absolute inset-0 block">
          <line x1="0" x2={width} y1={pad.top + innerH} y2={pad.top + innerH} stroke="#e2e8f0" strokeWidth="1" />
          {data.map((d, i) => (
            <g key={d.day}>
              {column(d, i)}
              {/* Hit target: the whole band */}
              <rect x={i * band} y="0" width={band} height={pad.top + innerH} fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
              {(i % every === 0 || i === data.length - 1) && (i === data.length - 1 || data.length - 1 - i >= every) && (
                <text x={i * band + band / 2} y={height - 4} textAnchor="middle" className="fill-slate-400" fontSize="10" fontWeight="600">
                  {formatDay(d.day)}
                </text>
              )}
            </g>
          ))}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <Tooltip x={hover * band + band / 2} width={width}>
          {formatDay(data[hover].day, true)} · {data[hover].count} {label.toLowerCase()}
        </Tooltip>
      )}
      <ChartTable caption={caption} data={data} valueLabel={label} />
    </div>
  );
}
