import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PenTool, Calendar, Check, Clock } from 'lucide-react';
import SignatureStamp from '../SignatureStamp';
import StampImage from './StampImage';
import DatePickerPopover from '../ui/DatePickerPopover';
import { getStampImage, DEFAULT_COMPANY_NAME } from '../../utils/documentFields';
import {
  getFieldBox, fieldFontSize, isAutoResizeField, autoResizeWidth, radioLayout, optionValues,
  fieldLabelPosition, checkboxValuePosition, labelFontSize, fieldPlaceholder
} from '../../utils/fieldSizing';
import FieldLabel from './FieldLabel';
import { DEFAULT_DATE_FORMAT, formatDate, parseDate, patternHasTime } from '../../utils/dateFormat';

/**
 * A placed field drawn at its own position on a document page (signing page, document view, print).
 *
 * The box is the one the sender drew in the editor: same corner, same width and height. Inside it the signer gets
 * an input (text, date with a calendar, checkbox, signature button); a completed field shows only its value, so
 * the finished document reads like a normal document with the values written into it.
 */

// The signature stamp is scaled to fit its box, but never below this (it would be unreadable)
const MIN_STAMP_SCALE = 0.5;

/** Scales its content to fit a width x height box (used for the signature stamp, which has a natural size). */
function FitToBox({ width, height, children }) {
  const innerRef = useRef(null);
  const [scale, setScale] = useState(null);

  const measure = useCallback(() => {
    const el = innerRef.current;
    if (!el || !el.offsetWidth || !el.offsetHeight) return;
    const next = Math.max(MIN_STAMP_SCALE, Math.min(width / el.offsetWidth, height / el.offsetHeight, 1.5));
    setScale((prev) => (prev !== null && Math.abs(prev - next) < 0.005 ? prev : next));
  }, [width, height]);

  useLayoutEffect(() => {
    measure();
  });
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined' || !innerRef.current) return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(innerRef.current);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div style={{ width, height }} className="relative">
      <div
        ref={innerRef}
        style={{ transform: scale ? `scale(${scale})` : undefined, transformOrigin: 'top left', visibility: scale ? 'visible' : 'hidden' }}
        className="absolute left-0 top-0 w-max"
      >
        {children}
      </div>
    </div>
  );
}

/** Date input of a "Sign date" field: type the date or pick it from the calendar; shown in the field's format. */
function DateFieldInput({ field, hint, fontSize, inputClass, onChange }) {
  const pattern = field.dateFormat || DEFAULT_DATE_FORMAT;
  const boxRef = useRef(null);
  const [draft, setDraft] = useState(null); // the text while the signer is typing
  const [anchorRect, setAnchorRect] = useState(null);
  const value = field.value === undefined || field.value === null ? '' : String(field.value);
  const shown = draft !== null ? draft : value;
  const parsed = parseDate(shown, pattern);
  const invalid = Boolean(shown.trim()) && !parsed;

  const openCalendar = () => {
    if (boxRef.current) setAnchorRect(boxRef.current.getBoundingClientRect());
  };
  const closeCalendar = useCallback(() => setAnchorRect(null), []);

  // What was typed is rewritten in the field's format as soon as it is a date
  const commit = () => {
    if (draft === null) return;
    const date = parseDate(draft, pattern);
    onChange(date ? formatDate(date, pattern) : draft);
    setDraft(null);
  };

  return (
    <div ref={boxRef} className="relative w-full h-full">
      <input
        type="text"
        value={shown}
        onChange={(e) => {
          setDraft(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={openCalendar}
        onClick={openCalendar}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit();
            closeCalendar();
          }
        }}
        style={{ fontSize: `${fontSize}px`, fontFamily: field.font ? `${field.font}, Inter, sans-serif` : undefined, paddingRight: '18px' }}
        className={`${inputClass} ${invalid ? '!border-red-400 !bg-red-50' : ''}`}
        placeholder={fieldPlaceholder(field)}
        aria-label={`${hint} (${pattern})`}
        aria-invalid={invalid}
        aria-required={Boolean(field.required)}
        title={invalid ? `Enter the date as ${formatDate(new Date(), pattern)}` : `${hint}: type the date or pick it from the calendar`}
        autoComplete="off"
      />
      <button
        type="button"
        tabIndex={-1}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (anchorRect ? closeCalendar() : openCalendar())}
        className="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 text-emerald-700 hover:text-[#005c44] cursor-pointer print:hidden"
        aria-label="Open the calendar"
      >
        <Calendar size={Math.max(10, Math.min(14, fontSize + 2))} />
      </button>
      {anchorRect && (
        <DatePickerPopover
          anchorRect={anchorRect}
          anchorElement={boxRef.current}
          value={parsed}
          withTime={patternHasTime(pattern)}
          onSelect={(date) => {
            setDraft(null);
            onChange(formatDate(date, pattern));
          }}
          onClear={field.required ? null : () => {
            setDraft(null);
            onChange('');
          }}
          onClose={closeCalendar}
        />
      )}
    </div>
  );
}

const fieldHint = (field) => field.label || field.type || 'Field';

/**
 * Props mirror the document sheet: `locked` (value only, no input), `pending` (sender's view of a field nobody
 * filled yet), the signer's details for defaults, and the callbacks for editing.
 */
export default function PlacedField({
  field,
  locked = false,
  pending = false,
  signerName = '',
  signerEmail = '',
  signatureImage = '',
  signatureStyle = 'font-signature-1',
  signaturePlaced = false,
  displayDocId = '',
  onOpenSignatureModal = null,
  onUpdateField = null,
  highlightColor = '',
  dimmed = false,
  guided = false,
  children = null
}) {
  const name = fieldHint(field);
  // The description the sender wrote for this field is its help text
  const hint = field.description ? `${name}: ${field.description}` : name;
  // A read-only field shows the value the sender set; the signer cannot change it
  const fixed = locked || Boolean(field.isReadOnly);
  const box = getFieldBox(field);
  const width = isAutoResizeField(field) ? autoResizeWidth(field) : box.width;
  const height = box.height;
  const fontSize = fieldFontSize(field, height);
  const update = (value, gridValue) => onUpdateField && onUpdateField(field.id, value, gridValue);

  const textStyle = { fontSize: `${fontSize}px`, fontFamily: field.font ? `${field.font}, Inter, sans-serif` : undefined, fontStyle: field.isItalic ? 'italic' : undefined };
  // Fields cover the text under them (a field is often put on a placeholder or a dotted line in the text)
  const inputClass = 'w-full h-full min-w-0 px-1.5 py-0 leading-none border border-dashed border-emerald-500 rounded-[3px] bg-emerald-50 hover:bg-emerald-100 focus:bg-white focus:border-solid focus:border-[#007355] focus:ring-2 focus:ring-emerald-100 outline-none font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-medium transition';
  // A completed value is written without a frame; one longer than its box runs on rather than being cut off
  const valueClass = 'w-full h-full flex items-center px-1.5 leading-none font-semibold text-slate-900 whitespace-nowrap overflow-visible bg-white';
  // Sent back for correction: the field is marked until the recipient has signed again
  const needsCorrection = Boolean(field.correction) && !locked && !pending;
  const requiredMark = field.required && !fixed && !pending
    ? <span aria-hidden="true" className="absolute -top-2 -right-1.5 text-red-500 font-black text-[12px] leading-none select-none pointer-events-none print:hidden">*</span>
    : null;

  let content = null;
  let rounded = 'rounded-[3px]';

  if (pending && field.type !== 'Stamp') {
    // Sender's view of a request in progress: who this field is waiting for
    const isSignatureType = field.type === 'Signature' || field.type === 'Initial';
    content = (
      <div className="w-full h-full flex items-center gap-1 px-1.5 border border-dashed border-slate-300 rounded-[3px] bg-slate-50/90 text-slate-500 overflow-hidden" title={`${hint}: waiting for ${field.assignee || 'the recipient'}`}>
        {height >= 18 && (isSignatureType ? <PenTool size={Math.min(13, height - 6)} className="shrink-0 text-slate-400" /> : <Clock size={Math.min(12, height - 6)} className="shrink-0 text-slate-400" />)}
        <span className="font-semibold truncate leading-none" style={{ fontSize: `${Math.min(11, fontSize)}px` }}>
          {isSignatureType ? 'Awaiting signature' : hint} · {field.assignee || 'recipient'}
        </span>
      </div>
    );
  } else if (field.type === 'Signature' || field.type === 'Initial') {
    // Placeholder values from the editor ("Signature"/"Initial") are not signatures
    const ownSignature = field.signatureImage || (field.value && field.value !== field.type && field.value !== field.label ? field.value : '');
    // An earlier recipient's field shows their signature, never this signer's
    const shownSignature = ownSignature || (field.completedByOther ? '' : signatureImage);
    const signer = field.signerName || signerName;
    const editable = !locked && Boolean(onOpenSignatureModal);
    if (signaturePlaced || locked || shownSignature) {
      content = (
        <div
          onClick={editable ? onOpenSignatureModal : undefined}
          title={editable ? 'Signature placed. Click to change it.' : `${hint} · signed by ${signer}`}
          className={editable ? 'cursor-pointer rounded-[3px] hover:outline hover:outline-1 hover:outline-[#1c4b82]' : ''}
        >
          <FitToBox width={width} height={height}>
            <SignatureStamp signerName={signer} signatureImage={shownSignature} signatureStyle={signatureStyle} docId={displayDocId} />
          </FitToBox>
        </div>
      );
    } else {
      content = (
        <button
          type="button"
          onClick={onOpenSignatureModal || undefined}
          aria-label={`${hint}${field.required !== false ? ' (required)' : ''}`}
          title={`${hint}: click to sign`}
          style={{ fontSize: `${Math.min(13, fontSize + 2)}px` }}
          className="w-full h-full px-1.5 border border-dashed border-emerald-600 bg-emerald-50/80 text-emerald-800 font-bold rounded-[3px] flex items-center justify-center gap-1.5 cursor-pointer hover:bg-emerald-100 hover:border-solid transition overflow-hidden leading-none"
        >
          {(height >= 18 || !fieldPlaceholder(field)) && <PenTool size={Math.max(9, Math.min(15, height - 6))} className="shrink-0" />}
          {fieldPlaceholder(field) && <span className="truncate">{fieldPlaceholder(field)}</span>}
        </button>
      );
    }
  } else if (field.type === 'Stamp') {
    // A stamp is displayed only when one was placed (with its image) while creating the document
    const stampSrc = getStampImage(field);
    if (!stampSrc) return null;
    rounded = '';
    // The stamp in its shape, as the sender placed it
    content = (
      <StampImage src={stampSrc} width={width} height={height} shape={field.stampShape} zoom={field.stampZoom} rotation={field.stampRotation} />
    );
  } else if (field.type === 'Checkbox') {
    const checked = field.value === true || field.value === 'true';
    const iconSize = Math.max(8, Math.min(width, height) - 6);
    // The value the checkbox stands for, written on the side the sender chose
    const valueLabel = <FieldLabel text={field.optionValue} position={checkboxValuePosition(field)} fontSize={labelFontSize(field)} />;
    content = !fixed ? (
      <>
        <label className={`w-full h-full flex items-center justify-center border rounded-[3px] cursor-pointer transition ${checked ? 'border-[#007355] bg-emerald-50 text-[#007355]' : 'border-dashed border-emerald-500 bg-emerald-50 hover:bg-emerald-100'}`} title={hint}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => update(e.target.checked)}
            aria-label={field.optionValue ? `${hint} (${field.optionValue})` : hint}
            aria-required={Boolean(field.required)}
            className="sr-only"
          />
          {checked && <Check size={iconSize} strokeWidth={3} />}
        </label>
        {valueLabel}
      </>
    ) : (
      <>
        <span
          aria-label={`${hint}: ${checked ? 'checked' : 'not checked'}`}
          title={!locked ? `${hint} (read only)` : hint}
          className={`w-full h-full flex items-center justify-center border rounded-[3px] bg-white ${checked ? 'border-slate-700 text-slate-900' : 'border-slate-400'}`}
        >
          {checked && <Check size={iconSize} strokeWidth={3} />}
        </span>
        {valueLabel}
      </>
    );
  } else if (field.type === 'Radio') {
    // Radio group: the options share the box evenly and each value sits beside its button (see radioLayout)
    const items = radioLayout(field, { width, height });
    const hasLabels = items.some((item) => item.label);
    content = (
      <div
        role="radiogroup"
        aria-label={hint}
        aria-required={Boolean(field.required)}
        title={!locked && field.isReadOnly ? `${hint} (read only)` : hint}
        className={`relative w-full h-full rounded-[3px] ${fixed ? (hasLabels ? 'bg-white' : '') : 'outline outline-1 outline-dashed outline-emerald-500 bg-emerald-50'}`}
      >
        {items.map((item) => {
          const selected = Boolean(item.option.value) && field.value === item.option.value;
          const cellStyle = { left: `${item.cell.left}px`, top: `${item.cell.top}px`, width: `${item.cell.width}px`, height: `${item.cell.height}px` };
          const inner = (
            <>
              <span
                style={{ left: `${item.x - item.cell.left}px`, top: `${item.y - item.cell.top}px`, width: `${item.size}px`, height: `${item.size}px` }}
                className={`absolute rounded-full border flex items-center justify-center bg-white ${
                  fixed ? (selected ? 'border-slate-800' : 'border-slate-400') : (selected ? 'border-[#007355]' : 'border-emerald-600')
                }`}
              >
                {selected && <span className={`rounded-full ${fixed ? 'bg-slate-900' : 'bg-[#007355]'}`} style={{ width: '52%', height: '52%' }} />}
              </span>
              {item.label && (
                <span
                  style={{
                    left: `${item.label.x - item.cell.left}px`,
                    top: `${item.label.centerY - item.cell.top}px`,
                    width: `${item.label.width}px`,
                    textAlign: item.label.align,
                    fontSize: `${item.label.fontSize}px`,
                    lineHeight: 1.25
                  }}
                  className="absolute -translate-y-1/2 truncate font-semibold text-slate-800"
                >
                  {item.option.value}
                </span>
              )}
            </>
          );
          return fixed ? (
            <span key={item.option.id} role="radio" aria-checked={selected} aria-label={item.option.value} style={cellStyle} className="absolute">{inner}</span>
          ) : (
            <button
              key={item.option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={item.option.value}
              // A choice that is not required can be taken back by clicking it again
              onClick={() => update(selected && !field.required ? '' : item.option.value)}
              style={cellStyle}
              className="absolute cursor-pointer rounded-[3px] hover:bg-emerald-100/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007355]"
            >
              {inner}
            </button>
          );
        })}
      </div>
    );
  } else if (field.type === 'Dropdown') {
    const values = optionValues(field);
    const current = values.includes(String(field.value ?? '')) ? String(field.value) : '';
    content = !fixed ? (
      <select
        value={current}
        onChange={(e) => update(e.target.value)}
        style={textStyle}
        className={`${inputClass} cursor-pointer !pr-0`}
        aria-label={hint}
        aria-required={Boolean(field.required)}
        title={hint}
      >
        <option value="">{fieldPlaceholder(field)}</option>
        {values.map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
    ) : (
      <div className={valueClass} style={textStyle} title={!locked ? `${hint} (read only)` : hint}>{current}</div>
    );
  } else if (field.type === 'Split text') {
    const count = field.charCount || 10;
    const charArray = Array.isArray(field.gridValue) && field.gridValue.length > 0
      ? field.gridValue
      : (field.value !== undefined && field.value !== null && field.value !== field.type ? String(field.value).split('') : []);
    const cellStyle = { width: `${field.width || 16}px`, fontSize: `${Math.min(12, fontSize)}px` };
    const focusCell = (index) => {
      const input = document.getElementById(`split-cell-${field.id}-${index}`);
      if (input) {
        input.focus();
        input.select();
      }
    };
    content = (
      <div
        role="group"
        aria-label={hint}
        style={{ gap: `${field.charSpace || 0}px` }}
        className={`flex h-full font-mono font-bold border rounded-[2px] ${locked ? 'border-slate-400 text-slate-900 bg-white' : 'border-dashed border-emerald-500 bg-emerald-50 text-slate-800'}`}
      >
        {Array.from({ length: count }).map((_, cIdx) => (!locked ? (
          <input
            key={cIdx}
            id={`split-cell-${field.id}-${cIdx}`}
            type="text"
            maxLength={1}
            aria-label={`${hint} character ${cIdx + 1}`}
            value={charArray[cIdx] !== undefined ? charArray[cIdx] : ''}
            onChange={(e) => {
              const newGrid = Array.from({ length: count }, (_c, i) => (charArray[i] !== undefined ? charArray[i] : ''));
              newGrid[cIdx] = e.target.value;
              update(newGrid.join(''), newGrid);
              if (e.target.value && cIdx < count - 1) focusCell(cIdx + 1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !charArray[cIdx] && cIdx > 0) focusCell(cIdx - 1);
              else if (e.key === 'ArrowRight' && cIdx < count - 1) focusCell(cIdx + 1);
              else if (e.key === 'ArrowLeft' && cIdx > 0) focusCell(cIdx - 1);
            }}
            onPaste={(e) => {
              e.preventDefault();
              const pasted = e.clipboardData.getData('text') || '';
              if (!pasted) return;
              const newGrid = Array.from({ length: count }, (_c, i) => (charArray[i] !== undefined ? charArray[i] : ''));
              for (let p = 0; p < pasted.length && cIdx + p < count; p += 1) newGrid[cIdx + p] = pasted[p];
              update(newGrid.join(''), newGrid);
            }}
            style={cellStyle}
            className="h-full min-w-0 shrink-0 p-0 border-r last:border-r-0 border-emerald-300 text-center bg-transparent font-bold focus:bg-white focus:outline-none"
          />
        ) : (
          <span key={cIdx} style={cellStyle} className="h-full shrink-0 flex items-center justify-center border-r last:border-r-0 border-slate-300">
            {charArray[cIdx] || ''}
          </span>
        )))}
      </div>
    );
  } else if (field.type === 'Sign date') {
    content = !locked ? (
      <DateFieldInput field={field} hint={hint} fontSize={fontSize} inputClass={inputClass} onChange={update} />
    ) : (
      <div className={valueClass} style={textStyle}>
        {field.value || formatDate(new Date(), field.dateFormat || DEFAULT_DATE_FORMAT)}
      </div>
    );
  } else {
    // Text / Full name / Email / Job title / Company
    const isEmpty = field.value === undefined || field.value === null || field.value === field.type || (field.type === 'Email' && field.value === 'Email');
    let fallback = '';
    if (field.type === 'Full name') fallback = field.signerName || signerName;
    else if (field.type === 'Email') fallback = field.signerEmail || signerEmail;
    else if (field.type === 'Company') fallback = DEFAULT_COMPANY_NAME;
    content = !locked ? (
      <input
        type={field.type === 'Email' ? 'email' : 'text'}
        value={isEmpty ? fallback : field.value}
        onChange={(e) => update(e.target.value)}
        style={textStyle}
        className={inputClass}
        placeholder={fieldPlaceholder(field)}
        aria-label={hint}
        aria-required={Boolean(field.required)}
        title={hint}
      />
    ) : (
      <div className={valueClass} style={textStyle} title={hint}>
        {!isEmpty && String(field.value).trim() ? field.value : fallback}
      </div>
    );
  }

  return (
    <div
      id={`doc-field-${field.id}`}
      data-doc-field="true"
      data-highlighted={highlightColor ? 'true' : undefined}
      style={{
        left: `${field.x}px`,
        top: `${field.y}px`,
        width: `${width}px`,
        height: `${height}px`,
        ...(highlightColor ? { boxShadow: `0 0 0 2px ${highlightColor}, 0 6px 16px -6px ${highlightColor}`, backgroundColor: `${highlightColor}14` } : {})
      }}
      data-needs-correction={needsCorrection ? 'true' : undefined}
      title={needsCorrection ? `Please correct this field${field.correction.note ? `: ${field.correction.note}` : ''}` : undefined}
      className={`absolute box-border transition-all duration-300 ${rounded} ${dimmed ? 'opacity-30 saturate-50' : ''} ${
        guided ? 'z-30 ring-2 ring-[#007355] ring-offset-2 ring-offset-white' : (needsCorrection ? 'z-[2] ring-2 ring-amber-400 ring-offset-1 ring-offset-white' : (highlightColor ? 'z-[2]' : 'z-[1]'))
      }`}
    >
      {content}
      {needsCorrection && (
        <span
          aria-hidden="true"
          className="absolute -top-2 -left-2 h-4 w-4 rounded-full bg-amber-500 text-white text-[10px] font-black grid place-items-center shadow print:hidden pointer-events-none"
        >
          !
        </span>
      )}
      {/* The field's name, written beside the box when the sender asked for it */}
      {field.type !== 'Checkbox' && (
        <FieldLabel text={field.label} position={fieldLabelPosition(field)} fontSize={labelFontSize(field)} />
      )}
      {requiredMark}
      {children}
    </div>
  );
}
