import {
  addDays,
  createDate,
  daysBetween,
  isValidCalendarDate,
  parseDateKey,
  toDateKey,
} from './dateUtils.js';

/**
 * Validiert Winter-Monat/Tag-Kombinationen (kein 31.02. etc.).
 */
export function assertValidMonthDay(month, day, label = 'Datum') {
  // Schaltjahr-unabhängig: Februar mit 29 ist ok für Monat/Tag-Muster,
  // aber 30/31.02 sind ungültig. Wir prüfen gegen ein Schaltjahr.
  if (!isValidCalendarDate(2024, month, day)) {
    throw new Error(`Ungültiges ${label}: ${day}.${month}.`);
  }
}

/**
 * Winterzeiträume, die das Kalenderjahr schneiden (über Jahreswechsel möglich).
 * Winter z. B. 1.10.–31.3. → zwei Segmente im Jahr: 1.1.–31.3. und 1.10.–31.12.
 */
export function getWinterIntervalsForYear(year, winterSchedule) {
  const {
    startMonth,
    startDay,
    endMonth,
    endDay,
  } = winterSchedule;

  assertValidMonthDay(startMonth, startDay, 'Winterbeginn');
  assertValidMonthDay(endMonth, endDay, 'Winterende');

  const intervals = [];

  // Winter über Jahreswechsel (Start-Monat > End-Monat), z. B. Okt→März
  if (startMonth > endMonth || (startMonth === endMonth && startDay > endDay)) {
    intervals.push({
      start: createDate(year, 1, 1),
      end: createDate(year, endMonth, endDay),
      seasonStart: createDate(year - 1, startMonth, startDay),
      seasonEnd: createDate(year, endMonth, endDay),
    });
    intervals.push({
      start: createDate(year, startMonth, startDay),
      end: createDate(year, 12, 31),
      seasonStart: createDate(year, startMonth, startDay),
      seasonEnd: createDate(year + 1, endMonth, endDay),
    });
  } else {
    intervals.push({
      start: createDate(year, startMonth, startDay),
      end: createDate(year, endMonth, endDay),
      seasonStart: createDate(year, startMonth, startDay),
      seasonEnd: createDate(year, endMonth, endDay),
    });
  }

  return intervals;
}

export function findWinterInterval(date, intervals) {
  return intervals.find(
    (interval) => date >= interval.start && date <= interval.end
  ) || null;
}

/**
 * Prüft, ob ein regulärer Abholtermin im Winter-14-Tage-Rhythmus liegt.
 * Referenzdatum ist selbst eine Abholwoche und darf nicht übersprungen werden.
 */
export function evaluateBioWastePickup(originalDate, bioWaste, winterSchedule, year) {
  if (!bioWaste?.enabled) {
    return { skip: false, inWinter: false };
  }

  if (!bioWaste.referenceDate) {
    throw new Error('Biotonne erfordert ein Referenzdatum (bekannter Winter-Abholtermin).');
  }

  const reference = parseDateKey(bioWaste.referenceDate);
  const intervals = getWinterIntervalsForYear(year, winterSchedule);
  const interval = findWinterInterval(originalDate, intervals);

  if (!interval) {
    return { skip: false, inWinter: false };
  }

  // Nur Termine am gleichen Wochentag wie die Referenz zählen im 14-Tage-Raster.
  if (reference.getDay() !== originalDate.getDay()) {
    throw new Error(
      'Das Bio-Referenzdatum muss auf demselben Wochentag wie der reguläre Abholtag liegen.'
    );
  }

  const dayDiff = daysBetween(reference, originalDate);
  // Abholung genau an Referenz, +14, +28, … sowie vor der Referenz −14, −28, …
  const onBiweeklyCadence = dayDiff % 14 === 0;

  if (onBiweeklyCadence) {
    // Zusätzlich muss der Termin innerhalb der Wintersaison der Intervalle liegen
    // (bereits durch interval-Match gegeben für das Kalenderjahr-Segment).
    return {
      skip: false,
      inWinter: true,
      reason: null,
    };
  }

  return {
    skip: true,
    inWinter: true,
    reason: 'Entfällt – Winterrhythmus',
  };
}

export function toDateKeySafe(date) {
  return toDateKey(date);
}

export function addDaysSafe(date, n) {
  return addDays(date, n);
}
