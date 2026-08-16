import { NextResponse } from 'next/server';
import { parseIcsHolidays } from '../../../lib/calendar/ics/parseIcs.js';
import { fetchSafeHttpsText } from '../../../lib/ssrf.js';
import {
  fetchIcsQuerySchema,
  formatZodError,
} from '../../../lib/calendar/validation/schemas.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const parsed = fetchIcsQuerySchema.safeParse({
    url: searchParams.get('url'),
    year: searchParams.get('year') || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(formatZodError(parsed.error), { status: 400 });
  }

  try {
    const text = await fetchSafeHttpsText(parsed.data.url);
    const holidays = parseIcsHolidays(text, { year: parsed.data.year });
    return NextResponse.json({ holidays, source: 'ics-url', count: holidays.length });
  } catch (error) {
    const message = error.message || 'ICS-URL konnte nicht geladen werden';
    const isCorsHint = /fetch|network|abort/i.test(message);
    return NextResponse.json(
      {
        error: message,
        hint: isCorsHint
          ? 'Die URL konnte serverseitig nicht geladen werden. Prüfen Sie HTTPS und Erreichbarkeit.'
          : undefined,
      },
      { status: 400 }
    );
  }
}
