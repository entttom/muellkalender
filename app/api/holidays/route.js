import { NextResponse } from 'next/server';
import axios from 'axios';
import { parseISO, format } from 'date-fns';
import { de } from 'date-fns/locale';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country');
  const year = searchParams.get('year') || new Date().getFullYear();
  
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
  }
} 