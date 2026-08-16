import { describe, expect, it } from 'vitest';
import { buildSchedule } from '../lib/calendar/buildSchedule.js';
import { resolvePickupDate } from '../lib/calendar/resolvePickup.js';
import { assertValidMonthDay, evaluateBioWastePickup } from '../lib/calendar/bioWaste.js';
import { createDate, parseDateKey } from '../lib/calendar/dateUtils.js';
import { getMa48RulesForYear } from '../lib/calendar/rules/ma48.js';
import { computeLocalHolidays } from '../lib/calendar/holidays/computeLocal.js';
import {
  generateIcsFromSchedule,
  reminderHoursToTriggerSeconds,
} from '../lib/calendar/ics/generateIcs.js';
import { parseIcsHolidays } from '../lib/calendar/ics/parseIcs.js';

const holidays2026 = computeLocalHolidays('AT', 2026);

describe('MA48 / generische Feiertagsverschiebung', () => {
  it('Neujahr 2026 (Do): Do→Fr, Fr→Sa', () => {
    const thu = resolvePickupDate(
      createDate(2026, 1, 1),
      holidays2026,
      []
    );
    expect(thu.effectiveDate).toBe('2026-01-02');
    expect(thu.isShifted).toBe(true);

    const fri = resolvePickupDate(
      createDate(2026, 1, 2),
      holidays2026,
      []
    );
    expect(fri.effectiveDate).toBe('2026-01-03');
    expect(fri.isShifted).toBe(true);
  });

  it('Heilige Drei Könige 2026 (Di): Di→Mi … Fr→Sa', () => {
    const cases = [
      ['2026-01-06', '2026-01-07'],
      ['2026-01-07', '2026-01-08'],
      ['2026-01-08', '2026-01-09'],
      ['2026-01-09', '2026-01-10'],
    ];
    for (const [original, expected] of cases) {
      const result = resolvePickupDate(parseDateKey(original), holidays2026, []);
      expect(result.effectiveDate).toBe(expected);
    }
  });

  it('Weihnachten 2026 MA48: Fr 25.12 bleibt', () => {
    const overrides = getMa48RulesForYear(2026).overrides;
    const result = resolvePickupDate(
      createDate(2026, 12, 25),
      holidays2026,
      overrides
    );
    expect(result.effectiveDate).toBe('2026-12-25');
    expect(result.isShifted).toBe(false);
    expect(result.status).toBe('special');
  });

  it('Weihnachten 2026 generisch: Fr 25.12 wird verschoben', () => {
    const result = resolvePickupDate(
      createDate(2026, 12, 25),
      holidays2026,
      []
    );
    expect(result.effectiveDate).not.toBe('2026-12-25');
    expect(result.isShifted).toBe(true);
  });

  it('mehrere Sperrtage in einer Woche', () => {
    // Simuliere Mo+Di geschlossen in KW mit Fr-Abholung
    const holidays = [
      { date: '2026-05-04', name: 'Testfeiertag Mo' }, // Mo
      { date: '2026-05-05', name: 'Testfeiertag Di' }, // Di
    ];
    // Freitag 08.05.2026
    const result = resolvePickupDate(createDate(2026, 5, 8), holidays, []);
    // 2 Sperrtage → +2 → Sonntag 10. → Montag 11.
    expect(result.effectiveDate).toBe('2026-05-11');
    expect(result.effectiveDate.endsWith('-10')).toBe(false); // nicht Sonntag
  });

  it('Nachholtermin landet nicht auf Sonntag', () => {
    // Do 01.01.2026 Feiertag, Fr-Abholung → Sa (nicht So)
    const fri = resolvePickupDate(createDate(2026, 1, 2), holidays2026, []);
    expect(parseDateKey(fri.effectiveDate).getDay()).not.toBe(0);
    expect(fri.effectiveDate).toBe('2026-01-03');
  });

  it('Jahreswechsel: Verschiebung Ende Dezember', () => {
    // Stefanitag 26.12.2026 ist Samstag – Fr 25.12 ohne Override verschieben
    const result = resolvePickupDate(createDate(2026, 12, 25), holidays2026, []);
    expect(result.isShifted).toBe(true);
    // Landet nicht auf Sonntag
    expect(parseDateKey(result.effectiveDate).getDay()).not.toBe(0);
  });
});

describe('buildSchedule Integration', () => {
  it('MA48-Profil wendet Weihnachts-Overrides an', () => {
    const schedule = buildSchedule({
      year: 2026,
      regularPickupDay: 'FR',
      holidayPolicy: 'ma48-vienna',
      holidays: holidays2026,
      dateRange: { start: '2026-12-25', end: '2026-12-25' },
    });
    expect(schedule).toHaveLength(1);
    expect(schedule[0].effectiveDate).toBe('2026-12-25');
  });

  it('unverifizierte MA48-Jahre markieren Meta', () => {
    const schedule = buildSchedule({
      year: 2099,
      regularPickupDay: 'MO',
      holidayPolicy: 'ma48-vienna',
      holidays: computeLocalHolidays('AT', 2099),
      dateRange: { start: '2099-01-05', end: '2099-01-05' },
    });
    expect(schedule.length).toBeGreaterThanOrEqual(1);
    const meta = getMa48RulesForYear(2099);
    expect(meta.verified).toBe(false);
  });
});

describe('Biotonne', () => {
  const winter = {
    startMonth: 10,
    startDay: 1,
    endMonth: 3,
    endDay: 31,
  };

  it('Referenzdatum wird entleert, danach +14/+28/+42', () => {
    const ref = '2026-10-12'; // Montag
    const bio = { enabled: true, referenceDate: ref };

    const picks = ['2026-10-12', '2026-10-26', '2026-11-09', '2026-11-23'];
    for (const d of picks) {
      const result = evaluateBioWastePickup(
        parseDateKey(d),
        bio,
        winter,
        2026
      );
      expect(result.skip).toBe(false);
    }

    const skipped = evaluateBioWastePickup(
      parseDateKey('2026-10-19'),
      bio,
      winter,
      2026
    );
    expect(skipped.skip).toBe(true);
    expect(skipped.reason).toMatch(/Winterrhythmus/);
  });

  it('Winter über Jahreswechsel', () => {
    const bio = { enabled: true, referenceDate: '2025-10-13' }; // Mo
    // Im Jan 2026 weiter im 14-Tage-Raster ab Referenz
    const onCadence = evaluateBioWastePickup(
      parseDateKey('2026-01-05'), // 12 Wochen = 84 Tage nach 13.10.2025
      bio,
      winter,
      2026
    );
    // 2025-10-13 + 84 Tage = 2026-01-05
    expect(onCadence.inWinter).toBe(true);
    expect(onCadence.skip).toBe(false);
  });

  it('weist 31.02 zurück', () => {
    expect(() => assertValidMonthDay(2, 31, 'Winterbeginn')).toThrow(/Ungültig/);
  });

  it('buildSchedule zeigt übersprungene Winterwochen', () => {
    const schedule = buildSchedule({
      year: 2026,
      regularPickupDay: 'MO',
      holidayPolicy: 'generic',
      holidays: holidays2026,
      bioWaste: { enabled: true, referenceDate: '2026-10-12' },
      winterSchedule: winter,
      dateRange: { start: '2026-10-12', end: '2026-10-26' },
    });
    const skipped = schedule.filter((e) => e.isSkipped);
    const active = schedule.filter((e) => !e.isSkipped);
    expect(skipped.length).toBe(1);
    expect(active.map((e) => e.originalDate)).toEqual(['2026-10-12', '2026-10-26']);
  });
});

describe('Reminder', () => {
  it('rechnet Stunden in Sekunden um', () => {
    expect(reminderHoursToTriggerSeconds(1)).toBe(3600);
    expect(reminderHoursToTriggerSeconds(3)).toBe(10800);
    expect(reminderHoursToTriggerSeconds(12)).toBe(43200);
    expect(reminderHoursToTriggerSeconds(24)).toBe(86400);
    expect(reminderHoursToTriggerSeconds(48)).toBe(172800);
  });

  it('schreibt korrekte VALARM-Trigger ins ICS', () => {
    const schedule = [
      {
        originalDate: '2026-03-02',
        effectiveDate: '2026-03-02',
        status: 'normal',
        reason: null,
        source: 'regular',
        isShifted: false,
        isSkipped: false,
      },
    ];

    const expectedTriggers = {
      1: /-PT1H/,
      3: /-PT3H/,
      12: /-PT12H/,
      24: /-P1D/, // ical-generator normalisiert 24h zu 1 Tag
      48: /-P2D/,
    };

    for (const hours of [1, 3, 12, 24, 48]) {
      const ics = generateIcsFromSchedule({
        schedule,
        eventName: 'Restmüll',
        pickupDay: 'MO',
        reminderHours: hours,
        timeType: 'specific',
        specificTime: '08:00',
      });
      expect(ics).toContain('BEGIN:VALARM');
      expect(ics).toMatch(expectedTriggers[hours]);
      expect(reminderHoursToTriggerSeconds(hours)).toBe(hours * 3600);
    }
  });
});

describe('Zeitzonen / Floating Times', () => {
  it('08:00 bleibt als lokale Floating-Zeit erhalten', () => {
    const schedule = [
      {
        originalDate: '2026-06-01',
        effectiveDate: '2026-06-01',
        status: 'normal',
        reason: null,
        source: 'regular',
        isShifted: false,
        isSkipped: false,
      },
    ];
    const ics = generateIcsFromSchedule({
      schedule,
      eventName: 'Restmüll',
      pickupDay: 'MO',
      timeType: 'specific',
      specificTime: '08:00',
      timezone: 'Europe/Vienna',
    });
    // Floating local: YYYYMMDDTHHMMSS ohne Z
    expect(ics).toMatch(/DTSTART:20260601T080000(?!Z)/);
    expect(ics).not.toMatch(/DTSTART:20260531/);
  });

  it('ganztägige Termine rutschen nicht auf Vortag', () => {
    const schedule = [
      {
        originalDate: '2026-06-01',
        effectiveDate: '2026-06-01',
        status: 'normal',
        reason: null,
        source: 'regular',
        isShifted: false,
        isSkipped: false,
      },
    ];
    const ics = generateIcsFromSchedule({
      schedule,
      eventName: 'Restmüll',
      pickupDay: 'MO',
      timeType: 'allday',
    });
    expect(ics).toMatch(/DTSTART;VALUE=DATE:20260601/);
    expect(ics).not.toMatch(/DTSTART;VALUE=DATE:20260531/);
  });
});

describe('ICS-Parser', () => {
  it('parst folded lines, SUMMARY mit Doppelpunkt, VALUE=DATE, TZID, CRLF', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'DTSTART;VALUE=DATE:20260101',
      'SUMMARY:Neujahr: Feiertag',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'DTSTART;TZID=Europe/Vienna:20260106T000000',
      'SUMMARY:Heilige Drei',
      '  Könige',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const holidays = parseIcsHolidays(ics, { year: 2026 });
    expect(holidays.length).toBeGreaterThanOrEqual(2);
    expect(holidays.some((h) => h.date === '2026-01-01')).toBe(true);
    expect(holidays.some((h) => h.name.includes('Neujahr'))).toBe(true);
    expect(holidays.some((h) => h.date === '2026-01-06')).toBe(true);
  });
});
