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
      endTime = '09:00',
      isBioWaste = false,
      winterStartMonth = 10,
      winterStartDay = 1,
      winterEndMonth = 3,
      winterEndDay = 31
    } = await request.json();

    if (!pickupDay || !eventName || !holidays || !startDate || !endDate) {
      return NextResponse.json({ error: 'Alle Felder müssen ausgefüllt sein' }, { status: 400 });
    }

    // Konvertiere alle Feiertage zu Date-Objekten für einfacheren Vergleich
    const holidayDates = holidays.map(holiday => parseISO(holiday.date));
    
    // Erstelle Winter-Zeitraum Datumobjekte für Biomülltonne
    let winterStartAnfangJahr = null;
    let winterEndAnfangJahr = null;
    let winterStartEndeJahr = null;
    let winterEndEndeJahr = null;
    let firstPickupInWinterAnfangJahr = null;
    let firstPickupInWinterEndeJahr = null;
    
    if (isBioWaste) {
      const selectedYear = new Date(parseISO(startDate)).getFullYear();
      
      // Für den Winter am Jahresanfang (z.B. Winter 2023/2024 für das Jahr 2024)
      winterStartAnfangJahr = new Date(selectedYear-1, winterStartMonth - 1, winterStartDay);
      winterEndAnfangJahr = new Date(selectedYear, winterEndMonth - 1, winterEndDay);
      
      // Für den Winter am Jahresende (z.B. Winter 2024/2025 für das Jahr 2024)
      winterStartEndeJahr = new Date(selectedYear, winterStartMonth - 1, winterStartDay);
      winterEndEndeJahr = new Date(selectedYear+1, winterEndMonth - 1, winterEndDay);
      
      // Bestimme den ersten Abholtag für beide Winterzeiträume
      firstPickupInWinterAnfangJahr = new Date(winterStartAnfangJahr);
      while (firstPickupInWinterAnfangJahr.getDay() !== daysOfWeek.indexOf(pickupDay)) {
        firstPickupInWinterAnfangJahr.setDate(firstPickupInWinterAnfangJahr.getDate() + 1);
      }
      
      firstPickupInWinterEndeJahr = new Date(winterStartEndeJahr);
      while (firstPickupInWinterEndeJahr.getDay() !== daysOfWeek.indexOf(pickupDay)) {
        firstPickupInWinterEndeJahr.setDate(firstPickupInWinterEndeJahr.getDate() + 1);
      }
    }

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
      // Für Biomüll: Prüfen, ob im Winterzeitraum und ob Abholtag (nur jede 2. Woche)
      let skipDueToWinter = false;
      
      if (isBioWaste) {
        // Prüfen, ob das aktuelle Datum in einem der Winterzeiträume liegt
        let isInWinterPeriod = false;
        let relevantFirstPickup = null;
        
        // Winter am Jahresanfang
        if (currentDate >= winterStartAnfangJahr && currentDate <= winterEndAnfangJahr) {
          isInWinterPeriod = true;
          relevantFirstPickup = firstPickupInWinterAnfangJahr;
        } 
        // Winter am Jahresende
        else if (currentDate >= winterStartEndeJahr && currentDate <= winterEndEndeJahr) {
          isInWinterPeriod = true;
          relevantFirstPickup = firstPickupInWinterEndeJahr;
        }
        
        // Wenn im Winterzeitraum, dann zweiwöchigen Rhythmus anwenden
        if (isInWinterPeriod && relevantFirstPickup) {
          // Berechne Anzahl der Wochen seit dem ersten Abholtermin im Winterzeitraum
          const daysDifference = Math.round((currentDate.getTime() - relevantFirstPickup.getTime()) / (1000 * 60 * 60 * 24));
          const weeksDifference = Math.floor(daysDifference / 7);
          
          // Überspringen jeder zweiten Woche, beginnend mit der ersten Abholung
          skipDueToWinter = weeksDifference % 2 === 0;
        }
      }
      
      if (!skipDueToWinter) {
        let eventDate = currentDate;
        
        // Prüfe, ob der aktuelle Tag ein Feiertag ist
        let isHoliday = holidayDates.some(holiday => 
          format(holiday, 'yyyy-MM-dd') === format(eventDate, 'yyyy-MM-dd'));
        
        // Wenn es ein Feiertag ist, verschiebe auf den nächsten Tag
        if (isHoliday) {
          // Spezielles Handling für die Weihnachtszeit (25.-27. Dezember)
          const monthDay = format(eventDate, 'MM-dd');
          if (monthDay === '12-25') {
            // Am 25. Dezember findet keine Abholung statt
            eventDate = addDays(eventDate, 1); // Verschiebe auf den 26.
          }
          else if (monthDay === '12-26') {
            // Am 26. Dezember werden Mülltonnen einen Tag später als üblich entleert
            
            // Wenn der 26. Dezember ein Sonntag ist, verschiebe auf Montag
            if (eventDate.getDay() === 0) { // 0 = Sonntag
              eventDate = addDays(eventDate, 1); // Verschiebe auf Montag (27.)
            } else {
              eventDate = addDays(eventDate, 1); // Normaler Fall: Verschiebe um einen Tag
            }
          }
          else if (monthDay === '12-27') {
            // Am 27. Dezember werden Mülltonnen einen Tag später als üblich entleert
            eventDate = addDays(eventDate, 1);
          }
          else {
            // Normale Verschiebung: Feiertag unter der Woche -> Verschiebung um einen Tag
            const holidayWeekday = eventDate.getDay();
            
            // Nur verschieben, wenn der Feiertag ein Werktag (Mo-Fr, 1-5) ist
            if (holidayWeekday >= 1 && holidayWeekday <= 5) {
              eventDate = addDays(eventDate, 1);
              
              // Prüfe, ob der verschobene Tag auch ein Feiertag ist
              const isNextDayHoliday = holidayDates.some(holiday => 
                format(holiday, 'yyyy-MM-dd') === format(eventDate, 'yyyy-MM-dd'));
              
              if (isNextDayHoliday) {
                eventDate = addDays(eventDate, 1);
                
                // Bei mehreren Feiertagen in Folge könnten wir auf einen Sonntag treffen
                if (isSunday(eventDate)) {
                  eventDate = addDays(eventDate, 1); // Auf Montag verschieben
                }
              }
            }
          }
        } else {
          // Kein Feiertag am aktuellen Tag, aber wir müssen prüfen,
          // ob ein früherer Tag in dieser Woche ein Feiertag war
          
          // Bestimme den aktuellen Wochentag (0=Sonntag, 1=Montag, ..., 6=Samstag)
          const currentWeekday = eventDate.getDay();
          
          // Bestimme den Montag dieser Woche
          const monday = new Date(eventDate);
          monday.setDate(monday.getDate() - (currentWeekday === 0 ? 6 : currentWeekday - 1));
          
          // Bestimme den Tag vor dem aktuellen Tag in dieser Woche
          const dayBeforeCurrent = new Date(eventDate);
          dayBeforeCurrent.setDate(dayBeforeCurrent.getDate() - 1);
          
          // Prüfe alle Tage von Montag bis zum Tag vor dem aktuellen Tag
          let foundHoliday = false;
          
          for (let checkDate = new Date(monday); checkDate <= dayBeforeCurrent; checkDate.setDate(checkDate.getDate() + 1)) {
            // Überspringe Wochenenden
            const checkWeekday = checkDate.getDay();
            if (checkWeekday === 0 || checkWeekday === 6) continue; // Sonntag oder Samstag
            
            // Prüfe, ob dieser Tag ein Feiertag ist
            const isCheckDayHoliday = holidayDates.some(holiday => 
              format(holiday, 'yyyy-MM-dd') === format(checkDate, 'yyyy-MM-dd'));
            
            if (isCheckDayHoliday) {
              foundHoliday = true;
              
              // Spezialfall für den 25. Dezember
              const holidayMonthDay = format(checkDate, 'MM-dd');
              if (holidayMonthDay === '12-25') {
                // 25. Dezember hat spezielle Regeln, wird anders behandelt
                foundHoliday = false;
                continue;
              }
            }
          }
          
          // Wenn ein Feiertag vor dem aktuellen Tag in dieser Woche gefunden wurde,
          // dann verschiebe den aktuellen Termin um einen Tag
          if (foundHoliday) {
            eventDate = addDays(eventDate, 1);
            
            // Prüfe, ob der verschobene Tag ein Feiertag ist
            const isShiftedDayHoliday = holidayDates.some(holiday => 
              format(holiday, 'yyyy-MM-dd') === format(eventDate, 'yyyy-MM-dd'));
            
            if (isShiftedDayHoliday) {
              eventDate = addDays(eventDate, 1);
              
              // Bei mehreren Feiertagen könnten wir auf einen Sonntag treffen
              if (isSunday(eventDate)) {
                eventDate = addDays(eventDate, 1); // Auf Montag verschieben
              }
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