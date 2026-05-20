import { NextResponse } from 'next/server';
import axios from 'axios';
import { addDays, format } from 'date-fns';

const getEasterSunday = (year) => {
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

  return new Date(year, month - 1, day);
};

const formatHolidayDate = (date) => format(date, 'yyyy-MM-dd');

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country');
  const year = Number(searchParams.get('year') || new Date().getFullYear());
  
  console.log('Holidays API aufgerufen mit:', { country, year });
  
  if (!country) {
    return NextResponse.json({ error: 'Land muss angegeben werden' }, { status: 400 });
  }
  
  try {
    // URL für Österreich
    const apiUrl = `https://date.nager.at/api/v3/PublicHolidays/${year}/AT`;
    console.log('Fetching holidays from:', apiUrl);
    
    let response;
    try {
      response = await axios.get(apiUrl);
    } catch (apiError) {
      console.error('Fehler beim Abruf von der Nager.Date API:', apiError.message);
      throw new Error('Externe API nicht erreichbar');
    }
    
    // Prüfe, ob die Antwort gültig ist und Daten enthält
    if (!response.data || !Array.isArray(response.data)) {
      console.error('Ungültige Antwort von der Feiertags-API:', response.data);
      throw new Error('Ungültige Antwort von der Feiertags-API');
    }
    
    // Formatiere die Daten für die Frontend-Anwendung
    const formattedHolidays = response.data.map(holiday => ({
      date: holiday.date,
      name: holiday.localName,
      countryCode: holiday.countryCode
    }));
    
    return NextResponse.json(formattedHolidays);
  } catch (error) {
    console.error('Fehler beim Abrufen der Feiertage:', error.message);
    
    // Beispiel-Feiertage für Tests zurückgeben, wenn die API nicht verfügbar ist
    const easterSunday = getEasterSunday(year);
    const fixedHolidays = [
      { date: `${year}-01-01`, name: 'Neujahr', countryCode: 'AT' },
      { date: `${year}-01-06`, name: 'Heilige Drei Könige', countryCode: 'AT' },
      { date: `${year}-05-01`, name: 'Staatsfeiertag', countryCode: 'AT' },
      { date: `${year}-08-15`, name: 'Mariä Himmelfahrt', countryCode: 'AT' },
      { date: `${year}-10-26`, name: 'Nationalfeiertag', countryCode: 'AT' },
      { date: `${year}-11-01`, name: 'Allerheiligen', countryCode: 'AT' },
      { date: `${year}-12-08`, name: 'Mariä Empfängnis', countryCode: 'AT' },
      { date: `${year}-12-25`, name: 'Weihnachten', countryCode: 'AT' },
      { date: `${year}-12-26`, name: 'Stefanitag', countryCode: 'AT' }
    ];
    
    const variableHolidays = [
      { date: formatHolidayDate(addDays(easterSunday, -2)), name: 'Karfreitag', countryCode: 'AT' },
      { date: formatHolidayDate(addDays(easterSunday, 1)), name: 'Ostermontag', countryCode: 'AT' },
      { date: formatHolidayDate(addDays(easterSunday, 39)), name: 'Christi Himmelfahrt', countryCode: 'AT' },
      { date: formatHolidayDate(addDays(easterSunday, 50)), name: 'Pfingstmontag', countryCode: 'AT' },
      { date: formatHolidayDate(addDays(easterSunday, 60)), name: 'Fronleichnam', countryCode: 'AT' }
    ];
    
    return NextResponse.json([...fixedHolidays, ...variableHolidays]);
  }
}
