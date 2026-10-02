import React, { useState } from 'react';
import { Plus, Minus, ListPlus, TextCursorInput, PenTool, Calendar, ChevronDown, RotateCcw } from 'lucide-react';
import {
  makeOption, optionValues, fieldLabelPosition, checkboxValuePosition, radioValuesPosition,
  fieldPlaceholder, defaultPlaceholder
} from '../../utils/fieldSizing';

/**
 * Property sections of a placed field in the document editor's side panel (dark theme):
 *
 *  - FieldFlags: Required, Read only and (checkbox) Checked.
 *  - FieldIdentity: Field name, Data label and Description. The description is the help text the signer sees
 *    on the field.
 *  - CheckboxSettings: the value a checkbox stands for and where it is written beside the box.
 *  - OptionListEditor: the values of a radio group or dropdown (add, remove, default, add in bulk).
 *  - PlaceholderSettings: whether the empty field shows a placeholder at signing, and which text.
 *  - PositionPicker: where a label is shown beside a field (hidden, left, right, above, below), used for the
 *    field name, the checkbox value and the radio button values.
 *
 * Every section edits the field through `onChange(changes)`, an object of the properties to set.
 */

const labelClass = 'block text-[11px] font-bold text-slate-400 uppercase mb-1';
const inputClass = 'w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-100 text-xs outline-none focus:border-[#00a884]';
const READ_ONLY_TYPES = ['Checkbox', 'Dropdown', 'Radio'];

function Flag({ label, hint, checked, onChange }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded accent-[#00a884] cursor-pointer"
      />
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-slate-200">{label}</span>
        {hint && <span className="block text-[10px] text-slate-500 leading-snug">{hint}</span>}
      </span>
    </label>
  );
}

const POSITION_CHOICES = [
  ['none', 'Hidden'],
  ['left', 'Left'],
  ['top', 'Above'],
  ['right', 'Right'],
  ['bottom', 'Below']
];

const POSITION_TITLES = {
  none: 'Not shown on the document',
  left: 'Shown to the left of the field',
  top: 'Shown above the field',
  right: 'Shown to the right of the field',
  bottom: 'Shown below the field'
};

/** Small drawing of a field (box, checkbox or radio button) with its label on one side. */
function PositionGlyph({ position, shape }) {
  const small = shape !== 'box';
  // The field: a wide box, or a small square / circle for checkboxes and radio buttons
  const fieldAt = (x, y) => (shape === 'radio'
    ? <circle cx={x + 5} cy={y + 5} r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    : <rect x={x} y={y} width={small ? 10 : 18} height={small ? 10 : 11} rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />);
  const bar = (x, y, width = 11) => <rect x={x} y={y} width={width} height="3.5" rx="1.75" fill="currentColor" />;
  const fieldWidth = small ? 10 : 18;
  const fieldHeight = small ? 10 : 11;
  let field;
  let label = null;
  if (position === 'left') {
    field = fieldAt(36 - fieldWidth - 2, (26 - fieldHeight) / 2);
    label = bar(3, 11.25, 36 - fieldWidth - 9);
  } else if (position === 'right') {
    field = fieldAt(2, (26 - fieldHeight) / 2);
    label = bar(fieldWidth + 6, 11.25, 36 - fieldWidth - 9);
  } else if (position === 'top') {
    field = fieldAt(8, 26 - fieldHeight - 3);
    label = bar(8, 4, 14);
  } else if (position === 'bottom') {
    field = fieldAt(8, 3);
    label = bar(8, 26 - 7.5, 14);
  } else {
    field = fieldAt((36 - fieldWidth) / 2, (26 - fieldHeight) / 2);
  }
  return (
    <svg viewBox="0 0 36 26" className="h-[26px] w-9" aria-hidden="true">
      {field}
      {label}
    </svg>
  );
}

/**
 * Where a label is shown beside a field: five tiles, each drawing the field with its label on that side.
 * `shape` draws the field as a wide box, a checkbox ("check") or a radio button ("radio").
 */
export function PositionPicker({ label, hint, value, onChange, shape = 'box' }) {
  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1.5">
        {POSITION_CHOICES.map(([position, text]) => {
          const active = value === position;
          return (
            <button
              key={position}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(position)}
              title={POSITION_TITLES[position]}
              className={`flex flex-col items-center gap-0.5 rounded-lg border px-1 pt-1.5 pb-1 transition cursor-pointer ${
                active
                  ? 'border-[#00a884] bg-emerald-950/60 text-[#00a884] shadow-[0_0_0_1px_#00a884]'
                  : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              <PositionGlyph position={position} shape={shape} />
              <span className="text-[9.5px] font-bold leading-none">{text}</span>
            </button>
          );
        })}
      </div>
      {hint && <p className="text-[10px] text-slate-500 mt-1 leading-snug">{hint}</p>}
    </div>
  );
}

export function FieldFlags({ field, onChange }) {
  const isCheckbox = field.type === 'Checkbox';
  return (
    <div className="space-y-2.5 bg-slate-900/60 border border-slate-800 rounded-lg p-3">
      <Flag
        label="Required"
        hint={isCheckbox ? 'The signer must tick the box to finish.' : 'The signer must complete this field to finish.'}
        checked={field.required !== false && !field.isReadOnly}
        onChange={(required) => onChange({ required, ...(required ? { isReadOnly: false } : {}) })}
      />
      {READ_ONLY_TYPES.includes(field.type) && (
        <Flag
          label="Read only"
          hint="The signer sees the value you set here and cannot change it."
          checked={field.isReadOnly}
          onChange={(isReadOnly) => onChange({ isReadOnly, ...(isReadOnly ? { required: false } : {}) })}
        />
      )}
      {isCheckbox && (
        <Flag
          label="Checked"
          hint="The box is already ticked when the signer opens the document."
          checked={field.checked !== false}
          onChange={(checked) => onChange({ checked, value: checked ? 'true' : 'false' })}
        />
      )}
    </div>
  );
}

export function FieldIdentity({ field, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass} htmlFor="field-name-input">Field name</label>
        <input
          id="field-name-input"
          type="text"
          value={field.label || ''}
          onChange={(e) => onChange({ label: e.target.value })}
          maxLength={100}
          className={`${inputClass} font-bold`}
          placeholder={field.type}
        />
      </div>
      {/* A checkbox shows its value instead (see CheckboxSettings) */}
      {field.type !== 'Checkbox' && (
        <PositionPicker
          label="Show the field name"
          hint="Written on the document beside the field: at signing, in the document view and in the signed PDF."
          value={fieldLabelPosition(field)}
          onChange={(labelPosition) => onChange({ labelPosition })}
        />
      )}
      <div>
        <label className={labelClass} htmlFor="field-data-label-input">Data label</label>
        <input
          id="field-data-label-input"
          type="text"
          value={field.dataLabel || ''}
          onChange={(e) => onChange({ dataLabel: e.target.value })}
          maxLength={100}
          className={inputClass}
          placeholder={`${field.type} - 1`}
        />
        <p className="text-[10px] text-slate-500 mt-1 leading-snug">The name this field has in the form data of the completed document.</p>
      </div>
      <div>
        <label className={labelClass} htmlFor="field-description-input">Description</label>
        <textarea
          id="field-description-input"
          rows={2}
          value={field.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          maxLength={255}
          className={`${inputClass} resize-none`}
          placeholder="Help text shown to the signer on this field"
        />
      </div>
    </div>
  );
}

/**
 * Placeholder of a field: the grey hint inside the empty field while signing. A switch turns it on or off; when
 * it is on the sender can write their own text (the field name, the date format or "--select--" otherwise). The
 * preview shows the empty field as the signer will see it.
 */
export function PlaceholderSettings({ field, onChange }) {
  const shown = field.showPlaceholder !== false;
  const own = String(field.placeholder ?? '');
  const fallback = defaultPlaceholder(field);
  const text = fieldPlaceholder(field);
  const isSignature = field.type === 'Signature' || field.type === 'Initial';

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`h-7 w-7 shrink-0 rounded-md grid place-items-center transition ${shown ? 'bg-emerald-950/70 text-[#00a884]' : 'bg-slate-800 text-slate-500'}`}>
            <TextCursorInput size={15} />
          </span>
          <div className="min-w-0">
            <span className="block text-xs font-bold text-slate-200">Placeholder</span>
            <span className="block text-[10px] text-slate-500 leading-snug">
              {shown ? 'Shown inside the empty field at signing' : 'The empty field shows no text'}
            </span>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={shown}
          aria-label="Show a placeholder inside the field"
          onClick={() => onChange({ showPlaceholder: !shown })}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition cursor-pointer ${shown ? 'bg-[#00a884]' : 'bg-slate-700'}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${shown ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {shown && (
        <div className="px-3 pt-2.5 pb-1 border-t border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase" htmlFor="field-placeholder-input">Placeholder text</label>
            {own.trim() && (
              <button
                type="button"
                onClick={() => onChange({ placeholder: '' })}
                className="flex items-center gap-1 text-[10px] font-bold text-[#00a884] hover:underline cursor-pointer"
                title={`Use the standard text: ${fallback}`}
              >
                <RotateCcw size={10} /> Reset
              </button>
            )}
          </div>
          <input
            id="field-placeholder-input"
            type="text"
            value={own}
            onChange={(e) => onChange({ placeholder: e.target.value })}
            maxLength={120}
            className={inputClass}
            placeholder={fallback}
          />
        </div>
      )}

      {/* The empty field as the signer sees it */}
      <div className="px-3 pt-2 pb-3">
        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Signer sees</span>
        <div className="rounded-md bg-white p-2">
          <div
            className={`h-8 rounded-[3px] border border-dashed bg-emerald-50 flex items-center gap-1.5 px-2 text-[11px] overflow-hidden ${
              isSignature ? 'border-emerald-600 justify-center font-bold text-emerald-800' : 'border-emerald-500 font-medium text-slate-400'
            }`}
          >
            {isSignature && <PenTool size={13} className="shrink-0" />}
            {field.type === 'Sign date' && <Calendar size={12} className="shrink-0 text-emerald-700 order-last ml-auto" />}
            {field.type === 'Dropdown' && <ChevronDown size={13} className="shrink-0 text-slate-500 order-last ml-auto" />}
            <span className="truncate">{text}</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">A placeholder is only a hint while signing. It is never printed on the document.</p>
      </div>
    </div>
  );
}

export function CheckboxSettings({ field, onChange }) {
  return (
    <div className="space-y-2.5">
      <div>
        <label className={labelClass} htmlFor="checkbox-value-input">Checkbox value</label>
        <input
          id="checkbox-value-input"
          type="text"
          value={field.optionValue || ''}
          onChange={(e) => onChange({ optionValue: e.target.value })}
          maxLength={120}
          className={inputClass}
          placeholder="What ticking this box means, e.g. I accept the terms"
        />
        <p className="text-[10px] text-slate-500 mt-1 leading-snug">Reported in the form data when the box is ticked.</p>
      </div>
      <PositionPicker
        label="Show the value"
        hint="Written on the document beside the checkbox: at signing, in the document view and in the signed PDF."
        shape="check"
        value={checkboxValuePosition(field)}
        onChange={(valuePosition) => onChange({ valuePosition, showLabel: valuePosition !== 'none' })}
      />
    </div>
  );
}

/**
 * Values of a radio group ("Radio button values") or a dropdown ("Options").
 * The circle in front of a value makes it the one selected when the signer opens the document.
 */
export function OptionListEditor({ field, onChange }) {
  const isRadio = field.type === 'Radio';
  const options = Array.isArray(field.options) ? field.options : [];
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const minimum = isRadio ? 2 : 1;

  const setOptions = (next, extra = {}) => {
    const values = next.map((option) => option.value);
    // The default must stay one of the values
    const keepDefault = field.value && values.includes(field.value);
    onChange({ options: next, ...(keepDefault ? {} : { value: '' }), ...extra });
  };

  const rename = (id, value) => {
    const previous = options.find((option) => option.id === id);
    const next = options.map((option) => (option.id === id ? { ...option, value } : option));
    // Renaming the default keeps it the default
    if (previous && field.value && previous.value === field.value) onChange({ options: next, value });
    else onChange({ options: next });
  };

  const addAfter = (index) => {
    const next = [...options];
    next.splice(index + 1, 0, makeOption(`Option ${options.length + 1}`));
    // A taller radio group keeps the same space per button
    const grow = isRadio && field.direction !== 'horizontal' && Number(field.height) > 0
      ? { height: Math.round((Number(field.height) / Math.max(1, options.length)) * next.length), sized: true }
      : {};
    setOptions(next, grow);
  };

  const remove = (id) => {
    if (options.length <= minimum) return;
    const next = options.filter((option) => option.id !== id);
    const shrink = isRadio && field.direction !== 'horizontal' && Number(field.height) > 0
      ? { height: Math.max(14, Math.round((Number(field.height) / options.length) * next.length)), sized: true }
      : {};
    setOptions(next, shrink);
  };

  const addBulk = () => {
    const existing = new Set(optionValues(field).map((value) => value.toLowerCase()));
    const added = [];
    bulkText.split(/\r?\n|,/).map((line) => line.trim()).filter(Boolean).forEach((value) => {
      if (existing.has(value.toLowerCase())) return;
      existing.add(value.toLowerCase());
      added.push(makeOption(value.slice(0, 120)));
    });
    if (added.length > 0) setOptions([...options, ...added]);
    setBulkText('');
    setBulkOpen(false);
  };

  const duplicates = new Set(
    optionValues(field).map((value) => value.toLowerCase()).filter((value, index, all) => all.indexOf(value) !== index)
  );

  return (
    <div className="space-y-2">
      <label className={labelClass}>{isRadio ? 'Radio button values' : 'Options'}</label>
      <div className="space-y-1.5">
        {options.map((option, index) => {
          const isDefault = Boolean(option.value) && field.value === option.value;
          const invalid = !String(option.value || '').trim() || duplicates.has(String(option.value).trim().toLowerCase());
          return (
            <div key={option.id} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onChange({ value: isDefault ? '' : option.value })}
                title={isDefault ? 'Selected by default. Click to clear.' : 'Select this value by default'}
                aria-label={`${isDefault ? 'Clear the default' : 'Make this the default'}: ${option.value || `value ${index + 1}`}`}
                aria-pressed={isDefault}
                className={`h-4 w-4 shrink-0 rounded-full border flex items-center justify-center cursor-pointer transition ${isDefault ? 'border-[#00a884]' : 'border-slate-500 hover:border-slate-300'}`}
              >
                {isDefault && <span className="h-2 w-2 rounded-full bg-[#00a884]" />}
              </button>
              <input
                type="text"
                value={option.value}
                onChange={(e) => rename(option.id, e.target.value)}
                maxLength={120}
                aria-label={`${isRadio ? 'Radio button' : 'Option'} value ${index + 1}`}
                aria-invalid={invalid}
                className={`flex-1 min-w-0 bg-slate-900 border rounded px-2 py-1.5 text-slate-100 text-xs outline-none focus:border-[#00a884] ${invalid ? 'border-rose-500' : 'border-slate-700'}`}
                placeholder={`Value ${index + 1}`}
              />
              <button
                type="button"
                onClick={() => remove(option.id)}
                disabled={options.length <= minimum}
                title="Remove this value"
                aria-label={`Remove ${option.value || `value ${index + 1}`}`}
                className="h-7 w-7 shrink-0 grid place-items-center rounded border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <Minus size={13} />
              </button>
              <button
                type="button"
                onClick={() => addAfter(index)}
                title="Add a value below"
                aria-label="Add a value below"
                className="h-7 w-7 shrink-0 grid place-items-center rounded border border-slate-700 text-[#00a884] hover:bg-slate-800 cursor-pointer"
              >
                <Plus size={13} />
              </button>
            </div>
          );
        })}
      </div>
      {duplicates.size > 0 && <p className="text-[10px] text-rose-400">Two values are the same. Give every value its own name.</p>}
      <p className="text-[10px] text-slate-500 leading-snug">
        The circle in front of a value selects it by default{isRadio ? '' : ' (the signer otherwise starts at "--select--")'}.
      </p>

      {!bulkOpen ? (
        <button
          type="button"
          onClick={() => setBulkOpen(true)}
          className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ListPlus size={13} /> Add {isRadio ? 'values' : 'options'} in bulk
        </button>
      ) : (
        <div className="space-y-1.5 bg-slate-900 border border-[#00a884]/60 rounded-lg p-2.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase" htmlFor="bulk-options-input">One value per line</label>
          <textarea
            id="bulk-options-input"
            rows={4}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className={`${inputClass} resize-none`}
            placeholder={'Monthly\nQuarterly\nYearly'}
          />
          <div className="flex justify-end gap-1.5">
            <button type="button" onClick={() => { setBulkOpen(false); setBulkText(''); }} className="px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white cursor-pointer">Cancel</button>
            <button type="button" onClick={addBulk} disabled={!bulkText.trim()} className="px-3 py-1 text-[11px] font-bold text-white bg-[#00a884] hover:bg-[#00997a] rounded disabled:opacity-40 cursor-pointer">Add</button>
          </div>
        </div>
      )}

      {isRadio && (
        <div className="space-y-2.5 pt-1">
          <div>
            <label className={labelClass}>Layout</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[['vertical', 'One below the other'], ['horizontal', 'Side by side']].map(([direction, text]) => {
                const active = (field.direction || 'vertical') === direction;
                return (
                  <button
                    key={direction}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      if (active) return;
                      // Turning the group keeps the room each button has
                      const width = Number(field.width) || 130;
                      const height = Number(field.height) || 46;
                      const count = Math.max(1, options.length);
                      onChange(direction === 'horizontal'
                        ? { direction, width: Math.round(Math.max(width, 110) * count * 0.8), height: Math.max(14, Math.round(height / count)), sized: true }
                        : { direction, width: Math.max(60, Math.round(width / count / 0.8)), height: Math.round(height * count), sized: true });
                    }}
                    className={`py-1.5 rounded text-[11px] font-bold border transition cursor-pointer ${active ? 'bg-[#00a884] border-[#00a884] text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'}`}
                  >
                    {text}
                  </button>
                );
              })}
            </div>
          </div>
          <PositionPicker
            label="Show the values"
            hint="Where each value is written beside its button. Choose Hidden when the document text already names each choice."
            shape="radio"
            value={radioValuesPosition(field)}
            onChange={(valuesPosition) => {
              // A value above or below its button needs a taller row
              const stacked = valuesPosition === 'top' || valuesPosition === 'bottom';
              const rows = field.direction === 'horizontal' ? 1 : Math.max(1, options.length);
              const height = Number(field.height) || 46;
              onChange({
                valuesPosition,
                showLabels: valuesPosition !== 'none',
                ...(stacked && height < rows * 38 ? { height: rows * 38, sized: true } : {})
              });
            }}
          />
        </div>
      )}
    </div>
  );
}
