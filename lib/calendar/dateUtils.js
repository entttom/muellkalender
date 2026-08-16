/**
 * Reine Datums-Hilfsfunktionen ohne React/Next-Abhängigkeiten.
 * Arbeitet mit lokalen Kalenderdaten (yyyy-MM-dd), ohne UTC-Verschiebung.
 */

export const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
export const WEEKDAY_NAMES_DE = [
  'Sonntag',
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
];

export function parseDateKey(dateKey) {
  if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error(`Ungültiges Datumsformat: ${dateKey}`);
  }
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`Ungültiges Datum: ${dateKey}`);
  }
  return date;
}

export function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createDate(year, month, day) {
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`Ungültiges Datum: ${day}.${month}.${year}`);
  }
  return date;
}

export function isValidCalendarDate(year, month, day) {
  try {
    createDate(year, month, day);
    return true;
  } catch {
    return false;
  }
}

export function addDays(date, amount) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
  return next;
}

export function compareDates(a, b) {
  const ak = toDateKey(a);
  const bk = toDateKey(b);
  if (ak < bk) return -1;
  if (ak > bk) return 1;
  return 0;
}

export function isSameDay(a, b) {
  return toDateKey(a) === toDateKey(b);
}

export function isSunday(date) {
  return date.getDay() === 0;
}

export function isSaturday(date) {
  return date.getDay() === 6;
}

export function isWeekday(date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

/** Montag der Kalenderwoche (ISO-ähnlich: Woche startet Montag). */
export function getMonday(date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

export function dayCodeToIndex(code) {
  const index = DAY_CODES.indexOf(code);
  if (index === -1) {
    throw new Error(`Ungültiger Wochentag: ${code}`);
  }
  return index;
}

export function formatDisplayDate(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

export function daysBetween(a, b) {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / (1000 * 60 * 60 * 24));
}
