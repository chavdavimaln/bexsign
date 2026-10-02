import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, isPossiblePhoneNumber } from 'libphonenumber-js';
import 'flag-icons/css/flag-icons.min.css';

/**
 * Phone number with a country code picker (flag, short country name, dialling code) in front of the number.
 *
 * The value is one string in international form ("+919876543210"): the picker supplies the country code and the
 * input holds the rest of the number. India (+91) is selected until another country is chosen, or a number from
 * another country is loaded or pasted. An empty number gives an empty value.
 */

const DEFAULT_COUNTRY = 'IN';
// Dialling codes shared by several countries: the one a bare number is shown as
const MAIN_COUNTRY = { 1: 'US', 7: 'RU', 39: 'IT', 44: 'GB', 47: 'NO', 61: 'AU', 212: 'MA', 262: 'RE', 290: 'SH', 358: 'FI', 590: 'GP', 599: 'CW' };
// Flag files that are not named after the country code
const FLAG_FILES = { AC: 'sh-ac', TA: 'sh-ta' };

let regionNames = null;
try {
  regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
} catch (e) {}

/** Every country with a dialling code: { iso: 'IN', name: 'India', dial: '91' }, sorted by name. */
export const COUNTRIES = getCountries()
  .map((iso) => {
    let name = iso;
    try {
      name = regionNames?.of(iso) || iso;
    } catch (e) {}
    return { iso, name, dial: String(getCountryCallingCode(iso)) };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const COUNTRY_BY_ISO = new Map(COUNTRIES.map((c) => [c.iso, c]));

const digitsOf = (value) => String(value || '').replace(/\D/g, '');

/** The country an international number ("+91...") belongs to, or null when its code is not known. */
function countryOfNumber(value) {
  const text = String(value || '').trim();
  if (!text.startsWith('+')) return null;
  const parsed = parsePhoneNumberFromString(text);
  if (parsed?.country) return parsed.country;
  const digits = digitsOf(text);
  for (let length = 3; length >= 1; length -= 1) {
    const code = digits.slice(0, length);
    const matches = COUNTRIES.filter((c) => c.dial === code);
    if (matches.length > 0) return MAIN_COUNTRY[code] || matches[0].iso;
  }
  return null;
}

/** True for a number a text message can be sent to: country code first and a length that country uses. */
export function isUsablePhone(value) {
  const text = String(value || '').trim();
  return text.startsWith('+') && isPossiblePhoneNumber(text);
}

function Flag({ iso }) {
  return <span className={`fi fi-${FLAG_FILES[iso] || iso.toLowerCase()} rounded-[2px] shrink-0`} aria-hidden="true" />;
}

export default function PhoneInput({ value, onChange, invalid = false, placeholder = '98765 43210', ariaLabel = 'Phone number', className = '' }) {
  const [country, setCountry] = useState(() => countryOfNumber(value) || DEFAULT_COUNTRY);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  const selected = COUNTRY_BY_ISO.get(country) || COUNTRY_BY_ISO.get(DEFAULT_COUNTRY);
  const digits = digitsOf(value);
  const isInternational = String(value || '').trim().startsWith('+');

  useEffect(() => {
    if (!digits) return;
    if (!isInternational) {
      // A number saved without a country code gets the selected one
      onChange(`+${selected.dial}${digits}`);
      return;
    }
    // A number from another country was loaded or pasted: show that country
    if (!digits.startsWith(selected.dial)) {
      const detected = countryOfNumber(value);
      if (detected) setCountry(detected);
    }
  }, [value]);

  // Close the country list on a click outside it
  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    searchRef.current?.focus();
    // Start the list at the selected country
    const list = rootRef.current?.querySelector('[role="listbox"]');
    const current = list?.querySelector('[aria-selected="true"]');
    if (list && current) list.scrollTop = current.offsetTop - list.offsetTop - list.clientHeight / 2 + current.offsetHeight / 2;
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  // The part of the number after the country code
  const national = isInternational && digits.startsWith(selected.dial) ? digits.slice(selected.dial.length) : digits;

  const handleNumberChange = (e) => {
    const raw = e.target.value;
    // A full number typed or pasted with its "+": the country follows the number
    if (raw.trim().startsWith('+')) {
      const full = digitsOf(raw).slice(0, 15);
      const detected = countryOfNumber(`+${full}`);
      if (detected) setCountry(detected);
      onChange(full ? `+${full}` : '');
      return;
    }
    const next = digitsOf(raw).slice(0, 15 - selected.dial.length);
    onChange(next ? `+${selected.dial}${next}` : '');
  };

  const chooseCountry = (iso) => {
    const next = COUNTRY_BY_ISO.get(iso);
    setCountry(iso);
    setOpen(false);
    setQuery('');
    if (national) onChange(`+${next.dial}${national}`);
  };

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return COUNTRIES;
    const code = text.replace(/\D/g, '');
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(text) || c.iso.toLowerCase() === text || (code && c.dial.startsWith(code)));
  }, [query]);

  const borderClass = invalid ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white';

  return (
    <div ref={rootRef} className={`relative flex items-stretch text-xs ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Country code: ${selected.name} +${selected.dial}`}
        title={`${selected.name} (+${selected.dial})`}
        className={`flex items-center gap-1.5 pl-2 pr-1.5 border border-r-0 rounded-l font-medium text-slate-700 hover:bg-slate-50 outline-none focus:border-[#007355] focus:ring-1 focus:ring-[#007355] transition cursor-pointer shrink-0 ${borderClass}`}
      >
        <Flag iso={selected.iso} />
        <span className="font-semibold">{selected.iso}</span>
        <span className="text-slate-500">+{selected.dial}</span>
        <ChevronDown size={12} className="text-slate-400" />
      </button>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={placeholder}
        value={national}
        onChange={handleNumberChange}
        aria-label={ariaLabel}
        aria-invalid={invalid}
        className={`flex-1 min-w-0 p-2 border rounded-r outline-none focus:border-[#007355] focus:ring-1 focus:ring-[#007355] transition ${borderClass}`}
      />

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-72 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
          <div className="relative border-b border-slate-100">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false);
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filtered[0]) chooseCountry(filtered[0].iso);
                }
              }}
              placeholder="Search country or code"
              aria-label="Search country or code"
              className="w-full pl-8 pr-3 py-2 text-xs outline-none"
            />
          </div>
          <ul role="listbox" aria-label="Country code" className="max-h-56 overflow-y-auto py-1">
            {filtered.map((c) => (
              <li key={c.iso} role="option" aria-selected={c.iso === selected.iso}>
                <button
                  type="button"
                  onClick={() => chooseCountry(c.iso)}
                  className={`w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-slate-50 cursor-pointer ${c.iso === selected.iso ? 'bg-emerald-50 font-bold text-[#007355]' : 'text-slate-700'}`}
                >
                  <Flag iso={c.iso} />
                  <span className="flex-1 min-w-0 truncate">{c.name}</span>
                  <span className="text-slate-400 font-semibold">{c.iso}</span>
                  <span className="w-11 text-right tabular-nums text-slate-500">+{c.dial}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="px-3 py-3 text-center text-slate-400">No country matches "{query}"</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
