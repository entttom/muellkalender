import {
  addDays,
  getMonday,
  isSameDay,
  isSunday,
  isWeekday,
  parseDateKey,
  toDateKey,
} from './dateUtils.js';

/**
 * Baut Lookup-Maps für Feiertage und Overrides.
 */
export function buildServiceMaps(holidays = [], serviceOverrides = []) {
  const holidayByDate = new Map();
  for (const h of holidays) {
    holidayByDate.set(h.date, h);
  }

  const overrideByDate = new Map();
  for (const o of serviceOverrides) {
    overrideByDate.set(o.date, o);
  }

  return { holidayByDate, overrideByDate };
}

/**
 * Betrieblich gesperrt?
 * - open-Override: nie gesperrt
 * - closed-Override: immer gesperrt
 * - gesetzlicher Feiertag Mo–Fr: gesperrt (sofern kein open-Override)
 * - Feiertag Sa/So: zählt nicht als Werktags-Sperrtag für die Wochenverschiebung,
 *   blockiert aber einen Nachholtermin, wenn man darauf landet
 */
export function isOperationallyClosed(date, maps, { forLanding = false } = {}) {
  const key = toDateKey(date);
  const override = maps.overrideByDate.get(key);

  if (override?.service === 'open') {
    return false;
  }
  if (override?.service === 'closed') {
    return true;
  }

  const holiday = maps.holidayByDate.get(key);
  if (!holiday) {
    return false;
  }

  if (forLanding) {
    // Auf dem Landeplatz blockieren Feiertage an jedem Wochentag (außer open).
    return true;
  }

  // Für die Zählung der Sperrtage in der Woche: nur Mo–Fr.
  return isWeekday(date);
}

function collectBlockingReasons(date, maps) {
  const key = toDateKey(date);
  const override = maps.overrideByDate.get(key);
  if (override?.service === 'closed') {
    return override.reason || 'Betrieblich geschlossen';
  }
  if (override?.service === 'open') {
    return null;
  }
  const holiday = maps.holidayByDate.get(key);
  return holiday ? holiday.name : null;
}

/**
 * Zählt Sperrtage von Montag bis einschließlich originalDate
 * und verschiebt den Termin entsprechend.
 * Samstag ist erlaubter Nachholtag; Sonntag nicht.
 */
export function resolvePickupDate(originalDate, holidays = [], serviceOverrides = []) {
  const maps = buildServiceMaps(holidays, serviceOverrides);
  const monday = getMonday(originalDate);

  let shiftCount = 0;
  const blockingNames = [];

  for (let d = new Date(monday); d <= originalDate; d = addDays(d, 1)) {
    if (isOperationallyClosed(d, maps, { forLanding: false })) {
      shiftCount += 1;
      const reason = collectBlockingReasons(d, maps);
      if (reason) blockingNames.push(reason);
    }
  }

  let effectiveDate = addDays(originalDate, shiftCount);
  let safety = 0;

  while (
    (isSunday(effectiveDate) ||
      isOperationallyClosed(effectiveDate, maps, { forLanding: true })) &&
    safety < 14
  ) {
    if (isSunday(effectiveDate)) {
      blockingNames.push('Sonntag');
    } else {
      const reason = collectBlockingReasons(effectiveDate, maps);
      if (reason) blockingNames.push(reason);
    }
    effectiveDate = addDays(effectiveDate, 1);
    safety += 1;
  }

  const originalKey = toDateKey(originalDate);
  const effectiveKey = toDateKey(effectiveDate);
  const isShifted = originalKey !== effectiveKey;

  const openOverride = maps.overrideByDate.get(originalKey);
  const holidayOnOriginal = maps.holidayByDate.get(originalKey);

  let status = 'normal';
  let reason = null;
  let source = 'regular';

  if (openOverride?.service === 'open' && (holidayOnOriginal || openOverride)) {
    status = 'special';
    reason = openOverride.reason;
    source = 'service-override';
  } else if (isShifted) {
    status = 'shifted';
    const uniqueReasons = [...new Set(blockingNames.filter(Boolean))];
    reason = uniqueReasons.length
      ? `Verschoben wegen: ${uniqueReasons.join(', ')}`
      : 'Verschoben wegen Feiertag/Sperrtag';
    source = 'holiday-shift';
  } else if (holidayOnOriginal && !openOverride) {
    // Sollte nach Algorithmus nicht vorkommen; Fallback
    status = 'shifted';
    reason = `Feiertag: ${holidayOnOriginal.name}`;
    source = 'holiday-shift';
  }

  return {
    originalDate: originalKey,
    effectiveDate: effectiveKey,
    status,
    reason,
    source,
    isShifted,
    isSkipped: false,
  };
}

export function resolvePickupDateKey(originalDateKey, holidays, serviceOverrides) {
  return resolvePickupDate(parseDateKey(originalDateKey), holidays, serviceOverrides);
}

export function datesEqual(a, b) {
  return isSameDay(a, b);
}
