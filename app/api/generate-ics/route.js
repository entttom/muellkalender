import { NextResponse } from 'next/server';
import { addDays, isSunday, parseISO, format, addWeeks } from 'date-fns';
import ical from 'ical-generator';

export async function POST(request) {
  try {
    const { 
      pickupDay, 
      eventName, 
      holidays, 
      startDate, 
      endDate, 
      reminder,
      timeType = 'allday',
      specificTime = '08:00',
      startTime = '08:00',
      endTime = '09:00'
    } = await request.json();

    if (!pickupDay || !eventName || !holidays || !startDate || !endDate) {
      return NextResponse.json({ error: 'Alle Felder müssen ausgefüllt sein' }, { status: 400 });
    }

    // Konvertiere alle Feiertage zu Date-Objekten für einfacheren Vergleich
    const holidayDates = holidays.map(holiday => parseISO(holiday.date));

    // Erstelle einen neuen Kalender
    const calendar = ical({ name: 'Müllkalender' });

    // Startdatum für die Schleife
    let currentDate = parseISO(startDate);
    const endDateTime = parseISO(endDate);

    // Finde den ersten Tag des gewünschten Wochentags
    const daysOfWeek = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const targetDayIndex = daysOfWeek.indexOf(pickupDay);
    
    if (targetDayIndex === -1) {
      return NextResponse.json({ error: 'Ungültiger Wochentag' }, { status: 400 });
    }

    // Finde das erste Vorkommen des gewünschten Wochentags
    while (currentDate.getDay() !== targetDayIndex) {
      currentDate = addDays(currentDate, 1);
    }

    // Erstelle Termine für jeden Wochentag bis zum Enddatum
    while (currentDate <= endDateTime) {
      let eventDate = currentDate;
      
      // Prüfe, ob der aktuelle Tag ein Feiertag ist
      let isHoliday = holidayDates.some(holiday => 
        format(holiday, 'yyyy-MM-dd') === format(eventDate, 'yyyy-MM-dd'));
      
      // Wenn es ein Feiertag ist, verschiebe auf den nächsten Tag
      if (isHoliday) {
        eventDate = addDays(eventDate, 1);
        
        // Prüfe, ob auch der nächste Tag ein Feiertag ist
        isHoliday = holidayDates.some(holiday => 
          format(holiday, 'yyyy-MM-dd') === format(eventDate, 'yyyy-MM-dd'));
        
        // Wenn auch der nächste Tag ein Feiertag ist, verschiebe weiter
        if (isHoliday) {
          eventDate = addDays(eventDate, 1);
          
          // Wenn dieser Tag ein Sonntag ist, verschiebe um 3 Tage (vom ursprünglichen Datum)
          if (isSunday(eventDate)) {
            eventDate = addDays(currentDate, 3);
          }
        }
      }
      
      // Erstelle den Termin mit den entsprechenden Zeitangaben
      let eventOptions = {
        summary: eventName,
        description: `Müllabfuhr-Termin für ${eventName}`,
        uid: `muellkalender-${format(eventDate, 'yyyyMMdd')}`
      };
      
      // Setze die Zeit je nach ausgewähltem Typ
      if (timeType === 'allday') {
        // Ganztägiger Termin
        eventOptions.allDay = true;
        eventOptions.start = new Date(
          eventDate.getFullYear(),
          eventDate.getMonth(),
          eventDate.getDate()
        );
        eventOptions.end = new Date(
          eventDate.getFullYear(),
          eventDate.getMonth(),
          eventDate.getDate() + 1
        );
      } else if (timeType === 'specific') {
        // Bestimmte Uhrzeit
        const [hours, minutes] = specificTime.split(':').map(Number);
        eventOptions.start = new Date(
          eventDate.getFullYear(),
          eventDate.getMonth(),
          eventDate.getDate(),
          hours,
          minutes
        );
        // Ende ist 1 Stunde später als Start
        eventOptions.end = new Date(
          eventDate.getFullYear(),
          eventDate.getMonth(),
          eventDate.getDate(),
          hours + 1,
          minutes
        );
      } else if (timeType === 'range') {
        // Zeitspanne
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        
        eventOptions.start = new Date(
          eventDate.getFullYear(),
          eventDate.getMonth(),
          eventDate.getDate(),
          startHours,
          startMinutes
        );
        eventOptions.end = new Date(
          eventDate.getFullYear(),
          eventDate.getMonth(),
          eventDate.getDate(),
          endHours,
          endMinutes
        );
      }
      
      const event = calendar.createEvent(eventOptions);
      
      // Füge optional eine Erinnerung hinzu
      if (reminder && reminder > 0) {
        event.createAlarm({
          type: 'display',
          trigger: reminder * 60, // Umrechnung von Stunden in Minuten
          description: `Erinnerung: ${eventName}`
        });
      }
      
      // Gehe zur nächsten Woche
      currentDate = addWeeks(currentDate, 1);
    }

    // Generiere die ICS-Datei
    const icsData = calendar.toString();
    
    // Sende die ICS-Datei als Antwort
    return new NextResponse(icsData, {
      headers: {
        'Content-Type': 'text/calendar',
        'Content-Disposition': 'attachment; filename="muellkalender.ics"'
      }
    });
  } catch (error) {
    console.error('Fehler bei der Generierung der ICS-Datei:', error);
    return NextResponse.json({ error: 'Fehler bei der Generierung der ICS-Datei' }, { status: 500 });
  }
} 