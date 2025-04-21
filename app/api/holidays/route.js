import { NextResponse } from 'next/server';
import axios from 'axios';
import { parseISO, format } from 'date-fns';
import { de } from 'date-fns/locale';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country');
  const region = searchParams.get('region');
  const year = searchParams.get('year') || new Date().getFullYear();
  
  if (!country) {
    return NextResponse.json({ error: 'Land muss angegeben werden' }, { status: 400 });
  }
  
  try {
    // Regionsbasierte URL erstellen
    let apiRegion = region || '';
    
    // Fallback-Werte, wenn keine Region angegeben wurde
    if (!region) {
      if (country === 'at') {
        apiRegion = 'AT-9'; // Wien als Standard
      } else if (country === 'de') {
        apiRegion = 'DE'; // Bundesweit als Standard
      }
    }
    
    const apiUrl = `https://date.nager.at/api/v3/PublicHolidays/${year}/${apiRegion}`;
    console.log('Fetching holidays from:', apiUrl);
    
    const response = await axios.get(apiUrl);
    
    // Prüfe, ob die Antwort gültig ist und Daten enthält
    if (!response.data || !Array.isArray(response.data)) {
      console.error('Ungültige Antwort von der Feiertags-API:', response.data);
      return NextResponse.json({ error: 'Ungültige Antwort von der Feiertags-API' }, { status: 500 });
    }
    
    // Formatiere die Daten für die Frontend-Anwendung
    const holidays = response.data.map(holiday => ({
      date: holiday.date,
      name: holiday.localName,
      countryCode: holiday.countryCode
    }));
    
    return NextResponse.json(holidays);
  } catch (error) {
    console.error('Fehler beim Abrufen der Feiertage:', error.message);
    
    // Beispiel-Feiertage für Tests zurückgeben, wenn die API nicht verfügbar ist
    if (country === 'at') {
      // Feste Feiertage in Österreich für das angegebene Jahr
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
      
      // Diese sind nur Approximationen für ein normales Jahr
      const variableHolidays = [
        { date: `${year}-04-10`, name: 'Karfreitag', countryCode: 'AT' },
        { date: `${year}-04-13`, name: 'Ostermontag', countryCode: 'AT' },
        { date: `${year}-05-21`, name: 'Christi Himmelfahrt', countryCode: 'AT' },
        { date: `${year}-06-01`, name: 'Pfingstmontag', countryCode: 'AT' },
        { date: `${year}-06-11`, name: 'Fronleichnam', countryCode: 'AT' }
      ];
      
      return NextResponse.json([...fixedHolidays, ...variableHolidays]);
    } else if (country === 'de') {
      // Feste Feiertage in Deutschland für das angegebene Jahr
      const fixedHolidays = [
        { date: `${year}-01-01`, name: 'Neujahr', countryCode: 'DE' },
        { date: `${year}-05-01`, name: 'Tag der Arbeit', countryCode: 'DE' },
        { date: `${year}-10-03`, name: 'Tag der Deutschen Einheit', countryCode: 'DE' },
        { date: `${year}-12-25`, name: 'Weihnachten', countryCode: 'DE' },
        { date: `${year}-12-26`, name: 'Zweiter Weihnachtsfeiertag', countryCode: 'DE' }
      ];
      
      // Diese sind nur Approximationen für ein normales Jahr
      const variableHolidays = [
        { date: `${year}-04-10`, name: 'Karfreitag', countryCode: 'DE' },
        { date: `${year}-04-13`, name: 'Ostermontag', countryCode: 'DE' },
        { date: `${year}-05-21`, name: 'Christi Himmelfahrt', countryCode: 'DE' },
        { date: `${year}-06-01`, name: 'Pfingstmontag', countryCode: 'DE' }
      ];
      
      return NextResponse.json([...fixedHolidays, ...variableHolidays]);
    }
    
    return NextResponse.json({ error: 'Fehler beim Abrufen der Feiertage' }, { status: 500 });
  }
} 