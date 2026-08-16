import ical from 'node-ical';

/**
 * Robuster ICS-Parser (eine gemeinsame Implementierung für Datei- und URL-Import).
 * Unterstützt CRLF/LF, folded lines, Escapes, VALUE=DATE, TZID, UTC, SUMMARY mit ':'.
 */
export function parseIcsHolidays(icsText, { year } = {}) {
  if (!icsText || typeof icsText !== 'string') {
    throw new Error('ICS-Inhalt fehlt oder ist ungültig');
  }

  const parsed = ical.sync.parseICS(icsText);
  const holidays = [];

  for (const key of Object.keys(parsed)) {
    const item = parsed[key];
    if (!item || item.type !== 'VEVENT') {
      continue;
    }

    const start = item.start;
    if (!start) {
      continue;
    }

    let dateKey;
    if (start instanceof Date) {
      // node-ical materialisiert VALUE=DATE als lokale Mitternacht.
      // Daher lokale Kalenderkomponenten verwenden (UTC-Getter würden in
      // Zeitzonen östlich von UTC den Vortag liefern).
      dateKey = [
        start.getFullYear(),
        String(start.getMonth() + 1).padStart(2, '0'),
        String(start.getDate()).padStart(2, '0'),
      ].join('-');
    } else {
      continue;
    }

    const eventYear = Number(dateKey.slice(0, 4));
    if (year != null && eventYear !== Number(year)) {
      continue;
    }

    const name = unescapeIcsText(item.summary || 'Feiertag');

    // RRULE: einfache Expansion für jährliche Wiederholungen im Zieljahr
    if (item.rrule && year != null) {
      try {
        const dates = item.rrule.between(
          new Date(year, 0, 1),
          new Date(year, 11, 31, 23, 59, 59),
          true
        );
        for (const occurrence of dates) {
          const occKey = [
            occurrence.getFullYear(),
            String(occurrence.getMonth() + 1).padStart(2, '0'),
            String(occurrence.getDate()).padStart(2, '0'),
          ].join('-');
          holidays.push({
            date: occKey,
            name,
            countryCode: 'CUSTOM',
          });
        }
        continue;
      } catch {
        // Fallback: einzelnes Event
      }
    }

    holidays.push({
      date: dateKey,
      name,
      countryCode: 'CUSTOM',
    });
  }

  holidays.sort((a, b) => a.date.localeCompare(b.date));
  return holidays;
}

function unescapeIcsText(value) {
  return String(value)
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}
