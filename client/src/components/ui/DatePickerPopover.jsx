import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { isValidDate } from '../../utils/dateFormat';

/**
 * Calendar for picking a date (and, when `withTime` is set, the time of day).
 *
 * It opens next to the element it belongs to (`anchorRect`, from getBoundingClientRect) and is drawn on top of the
 * page, so it keeps its size when the document behind it is zoomed. On phones it opens as a sheet at the bottom of
 * the screen. Picking a day reports it with `onSelect`; without a time the calendar closes straight away.
 */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const PANEL_WIDTH = 284;

const sameDay = (a, b) => isValidDate(a) && isValidDate(b)
  && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function DatePickerPopover({ anchorRect, anchorElement = null, value, withTime = false, onSelect, onClear, onClose }) {
  const selected = isValidDate(value) ? value : null;
  const selectedTime = selected ? selected.getTime() : null;
  const [view, setView] = useState(() => {
    const base = selected || new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const [time, setTime] = useState(() => {
    const base = selected || new Date();
    return { hours: base.getHours(), minutes: base.getMinutes() };
  });
  const panelRef = useRef(null);
  const [position, setPosition] = useState(null);
  const isPhone = typeof window !== 'undefined' && window.innerWidth < 480;

  // Next to the field: below it when there is room, above it otherwise, and never outside the window
  useLayoutEffect(() => {
    if (isPhone || !anchorRect || !panelRef.current) return;
    const height = panelRef.current.offsetHeight;
    const margin = 8;
    const below = anchorRect.bottom + 6;
    const top = below + height <= window.innerHeight - margin ? below : Math.max(margin, anchorRect.top - height - 6);
    const left = Math.max(margin, Math.min(anchorRect.left, window.innerWidth - PANEL_WIDTH - margin));
    setPosition({ top, left });
  }, [anchorRect, isPhone, view.month, view.year, withTime]);

  // A date typed into the field moves the calendar to that month
  useEffect(() => {
    if (selectedTime === null) return;
    const date = new Date(selectedTime);
    setView({ year: date.getFullYear(), month: date.getMonth() });
    setTime({ hours: date.getHours(), minutes: date.getMinutes() });
  }, [selectedTime]);

  useEffect(() => {
    const handlePointer = (e) => {
      // Clicks in the field the calendar belongs to keep it open (the signer may be typing the date)
      if (anchorElement && anchorElement.contains(e.target)) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose?.();
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    // Registered after the click that opened the calendar has finished
    const timer = setTimeout(() => document.addEventListener('mousedown', handlePointer), 0);
    document.addEventListener('keydown', handleKey);
    // On a phone the on-screen keyboard resizes the window; the sheet stays open there
    const handleResize = () => {
      if (!isPhone) onClose?.();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleResize);
    };
  }, [onClose, isPhone, anchorElement]);

  // Six weeks starting on the Sunday on or before the 1st of the month shown
  const days = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const start = new Date(view.year, view.month, 1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [view.year, view.month]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 131 }, (_, i) => current - 100 + i);
  }, []);

  const moveMonth = (delta) => setView((prev) => {
    const next = new Date(prev.year, prev.month + delta, 1);
    return { year: next.getFullYear(), month: next.getMonth() };
  });

  const withChosenTime = (day, chosen = time) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), withTime ? chosen.hours : 0, withTime ? chosen.minutes : 0, 0);

  const pickDay = (day) => {
    onSelect?.(withChosenTime(day));
    setView({ year: day.getFullYear(), month: day.getMonth() });
    if (!withTime) onClose?.();
  };

  const pickNow = () => {
    const now = new Date();
    setTime({ hours: now.getHours(), minutes: now.getMinutes() });
    setView({ year: now.getFullYear(), month: now.getMonth() });
    onSelect?.(withTime ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0) : withChosenTime(now));
    if (!withTime) onClose?.();
  };

  const changeTime = (key, raw, max) => {
    const number = Math.max(0, Math.min(max, parseInt(String(raw).replace(/\D/g, ''), 10) || 0));
    const next = { ...time, [key]: number };
    setTime(next);
    onSelect?.(withChosenTime(selected || new Date(), next));
  };

  const today = new Date();
  const selectClass = 'bg-transparent font-bold text-slate-800 text-[13px] rounded px-1 py-0.5 hover:bg-slate-100 focus:bg-slate-100 outline-none cursor-pointer';

  const panel = (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Choose a date"
      style={isPhone ? undefined : { top: position?.top ?? -9999, left: position?.left ?? -9999, width: PANEL_WIDTH }}
      className={`bg-white border border-slate-200 shadow-2xl font-sans text-slate-800 select-none ${
        isPhone ? 'w-full rounded-t-2xl p-4 pb-6' : 'fixed z-[70] rounded-xl p-3'
      }`}
    >
      {/* Month and year */}
      <div className="flex items-center justify-between gap-1 pb-2">
        <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month" className="h-7 w-7 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer">
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-0.5">
          <select aria-label="Month" value={view.month} onChange={(e) => setView((prev) => ({ ...prev, month: Number(e.target.value) }))} className={selectClass}>
            {MONTHS.map((name, index) => <option key={name} value={index}>{name}</option>)}
          </select>
          <select aria-label="Year" value={view.year} onChange={(e) => setView((prev) => ({ ...prev, year: Number(e.target.value) }))} className={selectClass}>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
        <button type="button" onClick={() => moveMonth(1)} aria-label="Next month" className="h-7 w-7 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400 pb-1">
        {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day) => {
          const inMonth = day.getMonth() === view.month;
          const isSelected = sameDay(day, selected);
          const isToday = sameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => pickDay(day)}
              aria-label={day.toDateString()}
              aria-pressed={isSelected}
              className={`mx-auto h-8 w-8 rounded-full text-xs font-semibold tabular-nums transition cursor-pointer ${
                isSelected
                  ? 'bg-[#007355] text-white shadow-sm'
                  : `${inMonth ? 'text-slate-700' : 'text-slate-300'} hover:bg-emerald-50 hover:text-[#007355] ${isToday ? 'ring-1 ring-inset ring-[#007355] text-[#007355]' : ''}`
              }`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      {withTime && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><Clock size={13} /> Time</span>
          <div className="flex items-center gap-1 text-sm font-bold tabular-nums">
            <input
              type="text"
              inputMode="numeric"
              aria-label="Hour"
              value={String(time.hours).padStart(2, '0')}
              onChange={(e) => changeTime('hours', e.target.value.slice(-2), 23)}
              className="w-10 text-center border border-slate-300 rounded-lg py-1 outline-none focus:border-[#007355] focus:ring-2 focus:ring-emerald-100"
            />
            <span className="text-slate-400">:</span>
            <input
              type="text"
              inputMode="numeric"
              aria-label="Minute"
              value={String(time.minutes).padStart(2, '0')}
              onChange={(e) => changeTime('minutes', e.target.value.slice(-2), 59)}
              className="w-10 text-center border border-slate-300 rounded-lg py-1 outline-none focus:border-[#007355] focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
        <button type="button" onClick={pickNow} className="px-2 py-1 rounded-lg text-[#007355] hover:bg-emerald-50 transition cursor-pointer">
          {withTime ? 'Now' : 'Today'}
        </button>
        <div className="flex items-center gap-1">
          {onClear && (
            <button type="button" onClick={() => { onClear(); onClose?.(); }} className="px-2 py-1 rounded-lg text-slate-500 hover:bg-slate-100 transition cursor-pointer">
              Clear
            </button>
          )}
          <button type="button" onClick={onClose} className="px-3 py-1 rounded-lg bg-[#007355] hover:bg-[#005c44] text-white transition cursor-pointer">
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(
    isPhone ? <div className="fixed inset-0 z-[70] bg-slate-900/40 flex items-end print:hidden">{panel}</div> : <div className="print:hidden">{panel}</div>,
    document.body
  );
}
