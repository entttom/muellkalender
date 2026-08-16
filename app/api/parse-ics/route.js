import { NextResponse } from 'next/server';
import { parseIcsHolidays } from '../../../lib/calendar/ics/parseIcs.js';
import { z } from 'zod';
import { formatZodError } from '../../../lib/calendar/validation/schemas.js';

const bodySchema = z.object({
  icsText: z.string().min(1).max(1_000_000),
  year: z.number().int().min(2000).max(2100).optional(),
});

export async function POST(request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 400 });
    }

    const holidays = parseIcsHolidays(parsed.data.icsText, {
      year: parsed.data.year,
    });

    return NextResponse.json({
      holidays,
      source: 'ics-file',
      count: holidays.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'ICS konnte nicht geparst werden' },
      { status: 400 }
    );
  }
}
