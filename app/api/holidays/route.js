import { NextResponse } from 'next/server';
import { computeLocalHolidays } from '../../../lib/calendar/holidays/computeLocal.js';
import {
  formatZodError,
  holidaysQuerySchema,
} from '../../../lib/calendar/validation/schemas.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const parsed = holidaysQuerySchema.safeParse({
    country: searchParams.get('country'),
    year: searchParams.get('year') || new Date().getFullYear(),
  });

  if (!parsed.success) {
    return NextResponse.json(formatZodError(parsed.error), { status: 400 });
  }

  const { country, year } = parsed.data;

  try {
    const apiUrl = `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`;
    const response = await fetch(apiUrl, {
      next: { revalidate: 86400, tags: [`holidays-${country}-${year}`] },
    });

    if (!response.ok) {
      throw new Error(`Nager.Date antwortete mit ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Ungültige Antwort von der Feiertags-API');
    }

    const holidays = data.map((holiday) => {
      if (!holiday?.date || !/^\d{4}-\d{2}-\d{2}$/.test(holiday.date)) {
        throw new Error('Ungültiges Datumsformat in API-Antwort');
      }
      return {
        date: holiday.date,
        name: holiday.localName || holiday.name,
        countryCode: holiday.countryCode || country,
      };
    });

    return NextResponse.json(
      {
        holidays,
        source: 'nager.date',
        degraded: false,
        country,
        year,
      },
      {
        headers: {
          'Cache-Control': 's-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch (error) {
    console.error('Feiertags-API Fehler, nutze lokalen Fallback:', error.message);
    const holidays = computeLocalHolidays(country, year);
    return NextResponse.json(
      {
        holidays,
        source: 'local-fallback',
        degraded: true,
        country,
        year,
        message:
          'Externe Feiertags-API nicht verfügbar. Lokale, fachlich geprüfte Fallback-Liste wird verwendet.',
      },
      { status: 200 }
    );
  }
}
