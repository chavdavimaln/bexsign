/**
 * Date formats of a "Sign date" field.
 *
 * The sender picks a pattern in the document editor (for example "MMM dd yyyy HH:mm z" or "dd/MM/yyyy"). The
 * signing page writes the date the recipient picks or types in that same pattern, so every copy of the document
 * shows the date the way the sender asked for it.
 *
 * Pattern letters: yyyy yy (year), MMMM MMM MM M (month), dd d (day), EEEE EEE (weekday), HH H (hour 0-23),
 * hh h (hour 1-12), mm (minute), ss (second), a (AM/PM), z (time zone). Text in 'single quotes' is kept as it is.
 */

export const DEFAULT_DATE_FORMAT = 'MMM dd yyyy';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TOKEN = /'[^']*'|yyyy|yy|MMMM|MMM|MM|M|dd|d|EEEE|EEE|HH|H|hh|h|mm|ss|a|z/g;

const pad = (value) => String(value).padStart(2, '0');

function timeZoneName(date) {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(date).find((p) => p.type === 'timeZoneName');
    if (part?.value) return part.value;
  } catch (e) {}
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  return `GMT${sign}${Math.floor(Math.abs(offset) / 60)}:${pad(Math.abs(offset) % 60)}`;
}

export function isValidDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

/** True when the pattern shows a time of day (the picker then offers hour and minute). */
export function patternHasTime(pattern) {
  return (String(pattern || '').replace(/'[^']*'/g, '').match(TOKEN) || []).some((token) => /^(HH|H|hh|h|mm|ss|a)$/.test(token));
}

/** Writes a date in the given pattern: formatDate(new Date(2026, 9, 2), 'dd MMMM yyyy') -> "02 October 2026". */
export function formatDate(date, pattern = DEFAULT_DATE_FORMAT) {
  if (!isValidDate(date)) return '';
  const hours12 = date.getHours() % 12 || 12;
  return String(pattern || DEFAULT_DATE_FORMAT).replace(TOKEN, (token) => {
    switch (token) {
      case 'yyyy': return String(date.getFullYear());
      case 'yy': return pad(date.getFullYear() % 100);
      case 'MMMM': return MONTHS[date.getMonth()];
      case 'MMM': return MONTHS[date.getMonth()].slice(0, 3);
      case 'MM': return pad(date.getMonth() + 1);
      case 'M': return String(date.getMonth() + 1);
      case 'dd': return pad(date.getDate());
      case 'd': return String(date.getDate());
      case 'EEEE': return WEEKDAYS[date.getDay()];
      case 'EEE': return WEEKDAYS[date.getDay()].slice(0, 3);
      case 'HH': return pad(date.getHours());
      case 'H': return String(date.getHours());
      case 'hh': return pad(hours12);
      case 'h': return String(hours12);
      case 'mm': return pad(date.getMinutes());
      case 'ss': return pad(date.getSeconds());
      case 'a': return date.getHours() < 12 ? 'AM' : 'PM';
      case 'z': return timeZoneName(date);
      default: return token.startsWith("'") ? token.slice(1, -1) : token;
    }
  });
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Reads a date typed in the given pattern; returns null when the text is not a date.
 * Text that does not follow the pattern is still accepted when it is a date written in a common way
 * ("2 Oct 2026", "2026-10-02", "10/02/2026").
 */
export function parseDate(text, pattern = DEFAULT_DATE_FORMAT) {
  const input = String(text || '').trim();
  if (!input) return null;

  const groups = [];
  let source = '';
  let last = 0;
  const format = String(pattern || DEFAULT_DATE_FORMAT);
  format.replace(TOKEN, (token, offset) => {
    source += escapeRegExp(format.slice(last, offset)).replace(/\s+/g, '\\s*').replace(/\\?,/g, ',?');
    last = offset + token.length;
    if (token.startsWith("'")) {
      source += escapeRegExp(token.slice(1, -1));
    } else if (token === 'z') {
      source += '(?:[A-Za-z]{2,5}|GMT[+-]\\d{1,2}(?::\\d{2})?|UTC[+-]?\\d*)?';
    } else if (token === 'EEEE' || token === 'EEE') {
      source += '[A-Za-z]+';
    } else {
      groups.push(token);
      source += { yyyy: '(\\d{4})', yy: '(\\d{2})', MMMM: '([A-Za-z]+)', MMM: '([A-Za-z]+)', a: '([AaPp]\\.?[Mm]\\.?)' }[token] || '(\\d{1,2})';
    }
    return token;
  });
  source += escapeRegExp(format.slice(last)).replace(/\s+/g, '\\s*');

  const match = new RegExp(`^\\s*${source}\\s*$`, 'i').exec(input);
  if (match) {
    const now = new Date();
    const parts = { year: now.getFullYear(), month: now.getMonth(), day: now.getDate(), hours: 0, minutes: 0, seconds: 0, meridiem: '' };
    let valid = true;
    groups.forEach((token, index) => {
      const raw = match[index + 1];
      switch (token) {
        case 'yyyy': parts.year = Number(raw); break;
        case 'yy': parts.year = 2000 + Number(raw); break;
        case 'MMMM':
        case 'MMM': {
          const month = MONTHS.findIndex((name) => name.toLowerCase().startsWith(raw.toLowerCase().slice(0, 3)));
          if (month < 0) valid = false;
          else parts.month = month;
          break;
        }
        case 'MM':
        case 'M': parts.month = Number(raw) - 1; break;
        case 'dd':
        case 'd': parts.day = Number(raw); break;
        case 'HH':
        case 'H':
        case 'hh':
        case 'h': parts.hours = Number(raw); break;
        case 'mm': parts.minutes = Number(raw); break;
        case 'ss': parts.seconds = Number(raw); break;
        case 'a': parts.meridiem = raw.toLowerCase().startsWith('p') ? 'pm' : 'am'; break;
        default: break;
      }
    });
    if (parts.meridiem === 'pm' && parts.hours < 12) parts.hours += 12;
    if (parts.meridiem === 'am' && parts.hours === 12) parts.hours = 0;
    const date = new Date(parts.year, parts.month, parts.day, parts.hours, parts.minutes, parts.seconds);
    // "31/02/2026" rolls over to March: not a date the signer typed
    if (valid && isValidDate(date) && date.getMonth() === parts.month && date.getDate() === parts.day && parts.hours < 24 && parts.minutes < 60) {
      return date;
    }
    return null;
  }

  const loose = new Date(input);
  return isValidDate(loose) && loose.getFullYear() > 1900 && loose.getFullYear() < 2200 ? loose : null;
}
