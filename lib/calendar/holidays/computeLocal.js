import { addDays, createDate, toDateKey } from '../dateUtils.js';

/**
 * Osterberechnung (Anonymous Gregorian algorithm).
 */
export function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return createDate(year, month, day);
}

function holiday(date, name, countryCode) {
  return { date: toDateKey(date), name, countryCode };
}

/**
 * Fachlich geprüfte lokale Feiertagsliste (ohne Karfreitag als AT-Feiertag).
 */
export function computeLocalHolidays(country, year) {
  const code = String(country || '').toUpperCase();
  if (code !== 'AT' && code !== 'DE') {
    throw new Error(`Nicht unterstütztes Land: ${country}`);
  }

  const easter = getEasterSunday(year);
  const fixedAt = [
    holiday(createDate(year, 1, 1), 'Neujahr', 'AT'),
    holiday(createDate(year, 1, 6), 'Heilige Drei Könige', 'AT'),
    holiday(createDate(year, 5, 1), 'Staatsfeiertag', 'AT'),
    holiday(createDate(year, 8, 15), 'Mariä Himmelfahrt', 'AT'),
    holiday(createDate(year, 10, 26), 'Nationalfeiertag', 'AT'),
    holiday(createDate(year, 11, 1), 'Allerheiligen', 'AT'),
    holiday(createDate(year, 12, 8), 'Mariä Empfängnis', 'AT'),
    holiday(createDate(year, 12, 25), 'Christtag', 'AT'),
    holiday(createDate(year, 12, 26), 'Stefanitag', 'AT'),
  ];

  const variableAt = [
    holiday(addDays(easter, 1), 'Ostermontag', 'AT'),
    holiday(addDays(easter, 39), 'Christi Himmelfahrt', 'AT'),
    holiday(addDays(easter, 50), 'Pfingstmontag', 'AT'),
    holiday(addDays(easter, 60), 'Fronleichnam', 'AT'),
  ];

  if (code === 'AT') {
    return [...fixedAt, ...variableAt].sort((a, b) => a.date.localeCompare(b.date));
  }

  // Deutschland (bundesweit typische gesetzliche Feiertage)
  const fixedDe = [
    holiday(createDate(year, 1, 1), 'Neujahr', 'DE'),
    holiday(createDate(year, 5, 1), 'Tag der Arbeit', 'DE'),
    holiday(createDate(year, 10, 3), 'Tag der Deutschen Einheit', 'DE'),
    holiday(createDate(year, 12, 25), '1. Weihnachtstag', 'DE'),
    holiday(createDate(year, 12, 26), '2. Weihnachtstag', 'DE'),
  ];

  const variableDe = [
    holiday(addDays(easter, -2), 'Karfreitag', 'DE'),
    holiday(addDays(easter, 1), 'Ostermontag', 'DE'),
    holiday(addDays(easter, 39), 'Christi Himmelfahrt', 'DE'),
    holiday(addDays(easter, 50), 'Pfingstmontag', 'DE'),
  ];

  return [...fixedDe, ...variableDe].sort((a, b) => a.date.localeCompare(b.date));
}
