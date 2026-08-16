import { evaluateBioWastePickup, assertValidMonthDay } from './bioWaste.js';
import {
  addDays,
  createDate,
  dayCodeToIndex,
  parseDateKey,
  toDateKey,
} from './dateUtils.js';
import { resolveHolidayPolicy } from './rules/profiles.js';
import { resolvePickupDate } from './resolvePickup.js';

/**
 * Zentrale, pure Domain-Funktion für die Abfuhrtermin-Berechnung.
 * Keine React-/Next-/HTTP-/ICS-Abhängigkeiten.
 *
 * @param {object} options
 * @param {number} options.year
 * @param {string} options.regularPickupDay - SU|MO|TU|WE|TH|FR|SA
 * @param {string|object} [options.holidayPolicy='ma48-vienna']
 * @param {Array<{date: string, name: string}>} [options.holidays=[]]
 * @param {Array<{date: string, service: 'open'|'closed', reason?: string}>} [options.serviceOverrides=[]]
 * @param {{ enabled: boolean, referenceDate: string }} [options.bioWaste]
 * @param {{ startMonth: number, startDay: number, endMonth: number, endDay: number }} [options.winterSchedule]
 * @param {{ start: string, end: string, mode?: 'future'|'full-year' }} [options.dateRange]
 * @returns {Array<{
 *   originalDate: string,
 *   effectiveDate: string|null,
 *   status: 'normal'|'shifted'|'skipped'|'special',
 *   reason: string|null,
 *   source: string,
 *   isShifted: boolean,
 *   isSkipped: boolean
 * }>}
 */
export function buildSchedule({
  year,
  regularPickupDay,
  holidayPolicy = 'ma48-vienna',
  holidays = [],
  serviceOverrides = [],
  bioWaste = { enabled: false },
  winterSchedule = {
    startMonth: 10,
    startDay: 1,
    endMonth: 3,
    endDay: 31,
  },
  dateRange,
} = {}) {
  if (!year || !regularPickupDay) {
    throw new Error('year und regularPickupDay sind erforderlich');
  }

  const policy = resolveHolidayPolicy(holidayPolicy, year, serviceOverrides);
  const mergedOverrides = policy.serviceOverrides;
  const targetDayIndex = dayCodeToIndex(regularPickupDay);

  const rangeStart = dateRange?.start
    ? parseDateKey(dateRange.start)
    : createDate(year, 1, 1);
  const rangeEnd = dateRange?.end
    ? parseDateKey(dateRange.end)
    : createDate(year, 12, 31);

  if (bioWaste?.enabled) {
    assertValidMonthDay(winterSchedule.startMonth, winterSchedule.startDay, 'Winterbeginn');
    assertValidMonthDay(winterSchedule.endMonth, winterSchedule.endDay, 'Winterende');
  }

  // Ersten Abholtag im Zeitraum finden
  let current = new Date(rangeStart);
  while (current.getDay() !== targetDayIndex) {
    current = addDays(current, 1);
  }

  const results = [];

  while (current <= rangeEnd) {
    const originalKey = toDateKey(current);

    // Bio-Winterrhythmus
    let bioResult = { skip: false, inWinter: false };
    if (bioWaste?.enabled) {
      bioResult = evaluateBioWastePickup(current, bioWaste, winterSchedule, year);
    }

    if (bioResult.skip) {
      results.push({
        originalDate: originalKey,
        effectiveDate: null,
        status: 'skipped',
        reason: bioResult.reason || 'Entfällt – Winterrhythmus',
        source: 'bio-winter',
        isShifted: false,
        isSkipped: true,
      });
    } else {
      const resolved = resolvePickupDate(current, holidays, mergedOverrides);
      results.push(resolved);
    }

    current = addDays(current, 7);
  }

  return results;
}

/**
 * Filtert übersprungene Termine heraus (für ICS-Export).
 */
export function getActivePickups(schedule) {
  return schedule.filter((entry) => !entry.isSkipped && entry.effectiveDate);
}

export function getScheduleMeta(year, holidayPolicy = 'ma48-vienna', serviceOverrides = []) {
  return resolveHolidayPolicy(holidayPolicy, year, serviceOverrides);
}
