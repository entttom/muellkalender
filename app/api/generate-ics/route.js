import { NextResponse } from 'next/server';
import { buildSchedule } from '../../../lib/calendar/buildSchedule.js';
import { generateIcsFromSchedule } from '../../../lib/calendar/ics/generateIcs.js';
import { resolveHolidayPolicy } from '../../../lib/calendar/rules/profiles.js';
import {
  formatZodError,
  generateIcsRequestSchema,
} from '../../../lib/calendar/validation/schemas.js';
import { assertValidMonthDay } from '../../../lib/calendar/bioWaste.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = generateIcsRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 400 });
    }

    const data = parsed.data;

    try {
      if (data.isBioWaste) {
        assertValidMonthDay(data.winterStartMonth, data.winterStartDay, 'Winterbeginn');
        assertValidMonthDay(data.winterEndMonth, data.winterEndDay, 'Winterende');
      }
    } catch (validationError) {
      return NextResponse.json(
        { error: 'Validierungsfehler', details: [{ message: validationError.message }] },
        { status: 400 }
      );
    }

    const policy = resolveHolidayPolicy(
      {
        profile: data.holidayPolicy,
        country: data.country,
        timezone: data.timezone,
      },
      data.selectedYear,
      data.serviceOverrides
    );

    const schedule = buildSchedule({
      year: data.selectedYear,
      regularPickupDay: data.pickupDay,
      holidayPolicy: data.holidayPolicy,
      holidays: data.holidays,
      serviceOverrides: data.serviceOverrides,
      bioWaste: data.isBioWaste
        ? { enabled: true, referenceDate: data.bioReferenceDate }
        : { enabled: false },
      winterSchedule: {
        startMonth: data.winterStartMonth,
        startDay: data.winterStartDay,
        endMonth: data.winterEndMonth,
        endDay: data.winterEndDay,
      },
      dateRange: {
        start: data.startDate,
        end: data.endDate,
        mode: data.dateRangeMode,
      },
    });

    const icsData = generateIcsFromSchedule({
      schedule,
      eventName: data.eventName,
      pickupDay: data.pickupDay,
      reminderHours: data.reminder,
      timeType: data.timeType,
      specificTime: data.specificTime,
      startTime: data.startTime,
      endTime: data.endTime,
      timezone: policy.timezone,
    });

    return new NextResponse(icsData, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="muellkalender.ics"',
      },
    });
  } catch (error) {
    console.error('Fehler bei der Generierung der ICS-Datei:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Generierung der ICS-Datei' },
      { status: 500 }
    );
  }
}
