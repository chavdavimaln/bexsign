import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

/**
 * SVG charts of the Reports page: daily activity (stacked bars), status donut, top senders, recipient funnel and
 * document types. Colors were checked for color-vision separation; every chart has a legend or direct labels and
 * the page offers a table view, so no value depends on color or hover alone.
 */

export const SERIES = [
  // Stack order bottom → top (keeps green and red apart)
  { key: 'completed', label: 'Completed', color: '#0f9a6a' },
  { key: 'sent', label: 'Sent', color: '#2a78d6' },
  { key: 'declined', label: 'Declined', color: '#e34948' }
];

export const STATUS_META = {
  completed: { label: 'Completed', color: '#0f9a6a', tone: 'emerald' },
  in_progress: { label: 'In progress', color: '#2a78d6', tone: 'sky' },
  declined: { label: 'Declined', color: '#e34948', tone: 'rose' },
  recalled: { label: 'Recalled', color: '#4a3aa7', tone: 'violet' },
  expired: { label: 'Expired', color: '#eda100', tone: 'amber' },
  draft: { label: 'Draft', color: '#94a3b8', tone: 'slate' }
};

const FUNNEL_COLORS = ['#86b6ef', '#2a78d6', '#184f95'];
const BAR_COLOR = '#2a78d6';
const GAP = 2;
const INK_MUTED = '#64748b';
const GRID = '#e2e8f0';
const BASELINE = '#cbd5e1';

const pad = (n) => String(n).padStart(2, '0');
export const parseYmd = (s) => {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fmtDay = (s, opts = { month: 'short', day: 'numeric' }) => parseYmd(s).toLocaleDateString('en-US', opts);
export const fmtNumber = (n) => Number(n || 0).toLocaleString('en-US');
const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

function useElementWidth(fallback = 640) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => {
      const w = el.clientWidth;
      if (w) setWidth(w);
    };
    update();
    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(update);
      observer.observe(el);
    }
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);
  return [ref, width];
}

// Integer axis with 3-5 clean steps
function niceScale(max) {
  if (max <= 0) return { max: 4, step: 1 };
  const rough = max / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, Math.ceil([1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough)));
  return { max: step * Math.ceil(max / step), step };
}

function roundedTop(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

/** Daily (or weekly, for long ranges) buckets of the overview series. */
export function bucketSeries(series = []) {
  if (series.length <= 62) {
    return series.map((d) => ({
      key: d.date,
      label: fmtDay(d.date),
      title: fmtDay(d.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
      sent: d.sent,
      completed: d.completed,
      declined: d.declined
    }));
  }
  const out = [];
  for (let i = 0; i < series.length; i += 7) {
    const chunk = series.slice(i, i + 7);
    const last = chunk[chunk.length - 1];
    out.push({
      key: chunk[0].date,
      label: fmtDay(chunk[0].date),
      title: `${fmtDay(chunk[0].date)} - ${fmtDay(last.date, { month: 'short', day: 'numeric', year: 'numeric' })}`,
      sent: chunk.reduce((a, d) => a + d.sent, 0),
      completed: chunk.reduce((a, d) => a + d.completed, 0),
      declined: chunk.reduce((a, d) => a + d.declined, 0)
    });
  }
  return out;
}

export function Legend({ items }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
          <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: item.color }} aria-hidden="true" />
          {item.label}
          {item.value !== undefined && <span className="font-black text-slate-900 tabular-nums">{fmtNumber(item.value)}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Stacked bars per day: completed, sent, declined. Hover or focus a day for its values. */
export function ActivityChart({ series }) {
  const [ref, width] = useElementWidth();
  const [hover, setHover] = useState(null);
  const buckets = useMemo(() => bucketSeries(series), [series]);
  const weekly = series.length > 62;

  const height = 268;
  const m = { top: 12, right: 6, bottom: 26, left: 30 };
  const plotW = Math.max(40, width - m.left - m.right);
  const plotH = height - m.top - m.bottom;
  const n = Math.max(1, buckets.length);
  const band = plotW / n;
  const barW = Math.max(2, Math.min(24, band * 0.62));
  const totals = buckets.map((b) => b.sent + b.completed + b.declined);
  const { max, step } = niceScale(Math.max(0, ...totals));
  const scale = plotH / max;
  const baseline = m.top + plotH;
  const ticks = [];
  for (let v = 0; v <= max; v += step) ticks.push(v);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 58))));
  const empty = totals.every((t) => t === 0);
  const sums = Object.fromEntries(SERIES.map((s) => [s.key, series.reduce((a, d) => a + d[s.key], 0)]));

  const hovered = hover !== null ? buckets[hover] : null;
  const tipX = hovered ? Math.min(Math.max(m.left + band * hover + band / 2, 84), width - 84) : 0;

  return (
    <div>
      <Legend items={[...SERIES].reverse().map((s) => ({ label: s.label, color: s.color, value: sums[s.key] }))} />
      <div ref={ref} className="relative mt-3 w-full min-w-0 overflow-hidden" onMouseLeave={() => setHover(null)}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${weekly ? 'Weekly' : 'Daily'} activity: ${sums.sent} sent, ${sums.completed} completed, ${sums.declined} declined`}
          className="block"
        >
          {ticks.map((v) => (
            <g key={v}>
              <line x1={m.left} x2={m.left + plotW} y1={baseline - v * scale} y2={baseline - v * scale} stroke={v === 0 ? BASELINE : GRID} strokeWidth="1" />
              <text x={m.left - 8} y={baseline - v * scale} dy="0.32em" textAnchor="end" fontSize="10" fill={INK_MUTED} className="tabular-nums">{v}</text>
            </g>
          ))}
          {hovered && <rect x={m.left + band * hover} y={m.top} width={band} height={plotH} fill="#f1f5f9" />}
          {buckets.map((b, i) => {
            const x = m.left + band * i + (band - barW) / 2;
            const segs = SERIES.filter((s) => b[s.key] > 0);
            let cursor = baseline;
            return (
              <g key={b.key}>
                {segs.map((s, j) => {
                  const h = b[s.key] * scale;
                  const top = cursor - h;
                  const isTop = j === segs.length - 1;
                  cursor = top;
                  // A 2px surface gap separates stacked segments
                  const drawTop = isTop ? top : top + GAP;
                  const drawH = Math.max(1.5, top + h - drawTop);
                  return isTop
                    ? <path key={s.key} d={roundedTop(x, drawTop, barW, drawH, 4)} fill={s.color} />
                    : <rect key={s.key} x={x} y={drawTop} width={barW} height={drawH} fill={s.color} />;
                })}
                {i % labelEvery === 0 && (
                  <text x={m.left + band * i + band / 2} y={baseline + 16} textAnchor="middle" fontSize="10" fill={INK_MUTED}>{b.label}</text>
                )}
              </g>
            );
          })}
          {/* Hit targets: the whole day column */}
          {buckets.map((b, i) => (
            <rect
              key={`hit-${b.key}`}
              x={m.left + band * i}
              y={m.top}
              width={band}
              height={plotH}
              fill="transparent"
              tabIndex={0}
              aria-label={`${b.title}: ${b.sent} sent, ${b.completed} completed, ${b.declined} declined`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="outline-none focus-visible:stroke-[#007355] focus-visible:stroke-2"
            />
          ))}
          {empty && (
            <text x={m.left + plotW / 2} y={m.top + plotH / 2} textAnchor="middle" fontSize="12" fontWeight="600" fill={INK_MUTED}>
              No documents sent, completed or declined in this period
            </text>
          )}
        </svg>
        {hovered && (
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg text-[11px] min-w-[150px]"
            style={{ left: tipX }}
          >
            <p className="font-bold text-slate-500 mb-1">{hovered.title}</p>
            {[...SERIES].reverse().map((s) => (
              <p key={s.key} className="flex items-center gap-2 py-0.5">
                <span className="w-3 h-0.5 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                <span className="font-black text-slate-900 tabular-nums">{hovered[s.key]}</span>
                <span className="text-slate-500">{s.label}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Status donut with a clickable legend (click filters the report by that status). */
export function StatusDonut({ breakdown = [], selected = '', onSelect }) {
  const [hover, setHover] = useState(null);
  const total = breakdown.reduce((a, s) => a + s.count, 0);
  const size = 168;
  const r = 62;
  const stroke = 20;
  const c = 2 * Math.PI * r;
  const visible = breakdown.filter((s) => s.count > 0);
  let offset = 0;
  const focus = hover || (selected && breakdown.find((s) => s.status === selected)?.count ? selected : null);
  const focused = focus ? breakdown.find((s) => s.status === focus) : null;

  return (
    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={`Status distribution of ${total} documents`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
          {visible.map((s) => {
            const len = (s.count / total) * c;
            const dash = Math.max(0.5, visible.length > 1 ? len - GAP : len);
            const el = (
              <circle
                key={s.status}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={STATUS_META[s.status]?.color || '#94a3b8'}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                opacity={focus && focus !== s.status ? 0.3 : 1}
                onMouseEnter={() => setHover(s.status)}
                onMouseLeave={() => setHover(null)}
                className="transition-opacity cursor-pointer"
                onClick={() => onSelect?.(s.status)}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-2xl font-black text-slate-900 tabular-nums leading-none">{fmtNumber(focused ? focused.count : total)}</span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-1">
            {focused ? `${STATUS_META[focused.status].label} · ${pct(focused.count, total)}%` : 'documents'}
          </span>
        </div>
      </div>
      <ul className="w-full space-y-1">
        {breakdown.map((s) => {
          const meta = STATUS_META[s.status];
          const active = selected === s.status;
          return (
            <li key={s.status}>
              <button
                type="button"
                onClick={() => onSelect?.(s.status)}
                onMouseEnter={() => setHover(s.count ? s.status : null)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(s.count ? s.status : null)}
                onBlur={() => setHover(null)}
                aria-pressed={active}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition cursor-pointer ${active ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'hover:bg-slate-50'} ${s.count ? '' : 'opacity-50'}`}
              >
                <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: meta.color }} aria-hidden="true" />
                <span className="font-semibold text-slate-700 flex-1 text-left">{meta.label}</span>
                <span className="font-black text-slate-900 tabular-nums">{fmtNumber(s.count)}</span>
                <span className="w-10 text-right text-slate-500 tabular-nums">{pct(s.count, total)}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function HBar({ value, max, color = BAR_COLOR, label }) {
  const w = max ? Math.max(value ? 2 : 0, (value / max) * 100) : 0;
  return (
    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden" role="img" aria-label={label}>
      <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, background: color }} />
    </div>
  );
}

export function TopSenders({ senders = [] }) {
  const max = Math.max(0, ...senders.map((s) => s.sent));
  return (
    <ol className="space-y-3.5">
      {senders.map((s, i) => (
        <li key={s.userId ?? i} className="min-w-0">
          <div className="flex items-baseline justify-between gap-3 mb-1.5">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{s.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{s.email}</p>
            </div>
            <p className="text-right shrink-0">
              <span className="text-sm font-black text-slate-900 tabular-nums">{fmtNumber(s.sent)}</span>
              <span className="text-[11px] text-slate-500"> sent</span>
            </p>
          </div>
          <HBar value={s.sent} max={max} label={`${s.name}: ${s.sent} sent`} />
          <p className="text-[11px] text-slate-500 mt-1">
            {fmtNumber(s.completed)} completed · {pct(s.completed, s.sent)}% completion
            {s.declined > 0 && ` · ${s.declined} declined`}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function RecipientFunnel({ funnel }) {
  const stages = [
    { key: 'sent', label: 'Request sent', value: funnel.sent },
    { key: 'viewed', label: 'Viewed', value: funnel.viewed },
    { key: 'signed', label: 'Signed', value: funnel.signed }
  ];
  return (
    <div>
      <ol className="space-y-3.5">
        {stages.map((stage, i) => (
          <li key={stage.key}>
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
              <span className="text-xs font-bold text-slate-700">{stage.label}</span>
              <span>
                <span className="text-sm font-black text-slate-900 tabular-nums">{fmtNumber(stage.value)}</span>
                <span className="text-[11px] text-slate-500 ml-1.5 tabular-nums">{pct(stage.value, funnel.sent)}%</span>
              </span>
            </div>
            <HBar value={stage.value} max={funnel.sent} color={FUNNEL_COLORS[i]} label={`${stage.label}: ${stage.value}`} />
            {i > 0 && (
              <p className="text-[11px] text-slate-500 mt-1">
                {pct(stage.value, stages[i - 1].value)}% of {stages[i - 1].label.toLowerCase()}
              </p>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
        Signers and approvers only. <strong className="text-slate-700">{fmtNumber(funnel.declined)}</strong> declined.
      </p>
    </div>
  );
}

export function DocumentTypes({ types = [] }) {
  const max = Math.max(0, ...types.map((t) => t.total));
  return (
    <ul className="space-y-3.5">
      {types.map((t) => (
        <li key={t.type}>
          <div className="flex items-baseline justify-between gap-3 mb-1.5">
            <span className="text-xs font-bold text-slate-700 truncate">{t.type}</span>
            <span className="shrink-0">
              <span className="text-sm font-black text-slate-900 tabular-nums">{fmtNumber(t.total)}</span>
              <span className="text-[11px] text-slate-500"> · {fmtNumber(t.completed)} completed</span>
            </span>
          </div>
          <HBar value={t.total} max={max} label={`${t.type}: ${t.total} documents`} />
        </li>
      ))}
    </ul>
  );
}
