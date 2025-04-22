'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, addYears, parseISO, addDays, addWeeks, isSunday } from 'date-fns';
import { de } from 'date-fns/locale';
import axios from 'axios';

export default function Home() {
  const [pickupDay, setPickupDay] = useState('MO');
  const [eventName, setEventName] = useState('Müllabfuhr');
  const [reminder, setReminder] = useState('');
  const [customIcsUrl, setCustomIcsUrl] = useState('');
  const [useCustomIcs, setUseCustomIcs] = useState(false);
  const [customIcsFile, setCustomIcsFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [previewEvents, setPreviewEvents] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [icsData, setIcsData] = useState(null);
  const [timeType, setTimeType] = useState('allday'); // allday, specific, range
  const [specificTime, setSpecificTime] = useState('08:00');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // Ausgewähltes Jahr für Kalender
  
  // Neue States für Biotonne
  const [isBioWaste, setIsBioWaste] = useState(false);
  const [winterStartMonth, setWinterStartMonth] = useState(10); // Oktober statt November
  const [winterStartDay, setWinterStartDay] = useState(1);
  const [winterEndMonth, setWinterEndMonth] = useState(3); // März statt Februar
  const [winterEndDay, setWinterEndDay] = useState(31);

  const currentYear = new Date().getFullYear();
  const startDate = format(new Date(selectedYear, 0, 1), 'yyyy-MM-dd'); // Start am 1.1. des gewählten Jahres
  const endDate = format(new Date(selectedYear, 11, 31), 'yyyy-MM-dd'); // Ende am 31.12. des gewählten Jahres

  // Zusätzliche Berechnung für Startdatum, wenn das ausgewählte Jahr das aktuelle Jahr ist
  const adjustedStartDate = useMemo(() => {
    if (selectedYear === currentYear) {
      // Aktuelle Kalenderwoche bestimmen
      const today = new Date();
      // Anfang der aktuellen Woche finden (Montag)
      const currentWeekStart = new Date(today);
      const dayOfWeek = today.getDay(); // 0 = Sonntag, 1 = Montag, ...
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Wenn Sonntag, gehe 6 Tage zurück, sonst finde den letzten Montag
      currentWeekStart.setDate(today.getDate() + diff);
      return format(currentWeekStart, 'yyyy-MM-dd');
    }
    return startDate;
  }, [selectedYear, currentYear, startDate]);

  useEffect(() => {
    if (!useCustomIcs) {
      console.log('Jahr geändert auf:', selectedYear, '- Lade Feiertage');
      // Erst zurücksetzen, dann laden
      setHolidays([]);
      fetchHolidays();
    } else {
      // Bei eigener ICS-Datei die API-Abfrage nicht durchführen
      console.log('Eigene ICS-Datei/URL wird verwendet, keine API-Abfrage');
    }
  }, [useCustomIcs, selectedYear]);

  // Effect für die Verarbeitung der ICS-Datei, wenn sie ausgewählt wird
  useEffect(() => {
    if (useCustomIcs && customIcsFile) {
      // Alte Werte zurücksetzen und neu parsen
      setHolidays([]);
      // Parse die ICS-Datei
      parseCustomIcs(customIcsFile);
    }
  }, [useCustomIcs, customIcsFile, selectedYear]); // Füge selectedYear hinzu, damit beim Ändern des Jahres ggf. neu gefiltert wird

  // Effect für die Verarbeitung der ICS-URL, wenn sie geändert wird
  useEffect(() => {
    if (useCustomIcs && customIcsUrl && customIcsUrl.trim() !== '') {
      // Hier nicht automatisch laden, sondern auf den Submit-Button warten
      console.log('ICS-URL bereit:', customIcsUrl);
    }
  }, [useCustomIcs, customIcsUrl, selectedYear]); // Füge selectedYear hinzu

  const fetchHolidays = async () => {
    setLoading(true);
    setError('');
    try {
      // Feiertage für das ausgewählte Jahr abrufen
      // Füge einen Timestamp hinzu, um Caching zu verhindern
      const timestamp = new Date().getTime();
      console.log('API-Anfrage an:', `/api/holidays?country=at&year=${selectedYear}&_=${timestamp}`);
      const response = await axios.get(`/api/holidays?country=at&year=${selectedYear}&_=${timestamp}`);
      console.log('API-Antwort erhalten:', response.data.length, 'Feiertage');
      
      // Füge den Wochentag zu jedem Feiertag hinzu
      const holidaysWithWeekday = response.data.map(holiday => {
        const holidayDate = parseISO(holiday.date);
        const weekday = format(holidayDate, 'EEEE', { locale: de });
        return {
          ...holiday,
          weekday
        };
      });
      
      // Sortiere die Feiertage nach Datum in aufsteigender Reihenfolge
      const sortedHolidays = holidaysWithWeekday.sort((a, b) => 
        parseISO(a.date).getTime() - parseISO(b.date).getTime()
      );
      
      console.log('Sortierte Feiertage:', sortedHolidays);
      
      // Direkt setzen ohne Timeout
      setHolidays(sortedHolidays);
    } catch (err) {
      console.error('Fehler beim Laden der Feiertage:', err);
      setError('Fehler beim Laden der Feiertage. Bitte versuchen Sie es später erneut.');
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = () => {
    if (!pickupDay || !eventName || holidays.length === 0) {
      setError('Bitte füllen Sie alle erforderlichen Felder aus.');
      return false;
    }

    // Validierung für Zeitangaben
    if (timeType === 'specific' && !specificTime) {
      setError('Bitte geben Sie eine Uhrzeit an.');
      return false;
    }

    if (timeType === 'range' && (!startTime || !endTime)) {
      setError('Bitte geben Sie Start- und Endzeit an.');
      return false;
    }

    if (timeType === 'range' && startTime >= endTime) {
      setError('Die Startzeit muss vor der Endzeit liegen.');
      return false;
    }

    try {
      // Konvertiere alle Feiertage zu Date-Objekten für einfacheren Vergleich
      const holidayDates = holidays.map(holiday => parseISO(holiday.date));
      
      // Definiere Wochentage
      const daysOfWeek = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      const weekdayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
      const targetDayIndex = daysOfWeek.indexOf(pickupDay);
      
      if (targetDayIndex === -1) {
        setError('Ungültiger Wochentag');
        return false;
      }
      
      // Erstelle Winter-Zeitraum Datumobjekte für Biomülltonne
      let winterStartAnfangJahr = null;
      let winterEndAnfangJahr = null;
      let winterStartEndeJahr = null;
      let winterEndEndeJahr = null;
      let firstPickupInWinterAnfangJahr = null;
      let firstPickupInWinterEndeJahr = null;
      
      if (isBioWaste) {
        // Für den Winter am Jahresanfang (z.B. Winter 2023/2024 für das Jahr 2024)
        winterStartAnfangJahr = new Date(selectedYear-1, winterStartMonth - 1, winterStartDay);
        winterEndAnfangJahr = new Date(selectedYear, winterEndMonth - 1, winterEndDay);
        
        // Für den Winter am Jahresende (z.B. Winter 2024/2025 für das Jahr 2024)
        winterStartEndeJahr = new Date(selectedYear, winterStartMonth - 1, winterStartDay);
        winterEndEndeJahr = new Date(selectedYear+1, winterEndMonth - 1, winterEndDay);
        
        // Bestimme den ersten Abholtag für beide Winterzeiträume
        firstPickupInWinterAnfangJahr = new Date(winterStartAnfangJahr);
        // Finde das erste Vorkommen des gewünschten Wochentags nach Winterbeginn
        while (firstPickupInWinterAnfangJahr.getDay() !== targetDayIndex) {
          firstPickupInWinterAnfangJahr.setDate(firstPickupInWinterAnfangJahr.getDate() + 1);
        }
        
        firstPickupInWinterEndeJahr = new Date(winterStartEndeJahr);
        while (firstPickupInWinterEndeJahr.getDay() !== targetDayIndex) {
          firstPickupInWinterEndeJahr.setDate(firstPickupInWinterEndeJahr.getDate() + 1);
        }
      }
      
      // Erstelle eine Liste von Terminen
      const events = [];
      
      // Startdatum für die Schleife - Verwende das angepasste Startdatum für das aktuelle Jahr
      let currentDate = parseISO(selectedYear === currentYear ? adjustedStartDate : startDate);
      const endDateTime = parseISO(endDate);

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
          let isModified = false;
          let reason = '';
          
          // Prüfe, ob der aktuelle Tag ein Feiertag ist
          const holiday = holidays.find(h => 
            format(parseISO(h.date), 'yyyy-MM-dd') === format(eventDate, 'yyyy-MM-dd'));
          
          let isHoliday = !!holiday;
          
          if (isHoliday) {
            isModified = true;
            reason = `Verschoben wegen Feiertag: ${holiday.name}`;
            
            // Spezielles Handling für die Weihnachtszeit (25.-27. Dezember)
            const monthDay = format(eventDate, 'MM-dd');
            if (monthDay === '12-25') {
              // Am 25. Dezember findet keine Abholung statt
              reason = `Keine Abholung am 25. Dezember (${holiday.name})`;
              eventDate = addDays(eventDate, 1); // Verschiebe auf den 26.
            }
            else if (monthDay === '12-26') {
              // Am 26. Dezember werden Mülltonnen einen Tag später als üblich entleert
              reason = `Verschoben wegen Weihnachtszeit: Ein Tag später als üblich`;
              
              // Wenn der 26. Dezember ein Sonntag ist, verschiebe auf Montag
              if (eventDate.getDay() === 0) { // 0 = Sonntag
                reason = `Verschoben wegen Weihnachtszeit (26. Dezember auf Sonntag): Abholung am Montag`;
                eventDate = addDays(eventDate, 1); // Verschiebe auf Montag (27.)
              } else {
                eventDate = addDays(eventDate, 1); // Normaler Fall: Verschiebe um einen Tag
              }
            }
            else if (monthDay === '12-27') {
              // Am 27. Dezember werden Mülltonnen einen Tag später als üblich entleert
              reason = `Verschoben wegen Weihnachtszeit: Ein Tag später als üblich`;
              eventDate = addDays(eventDate, 1);
            }
            else {
              // Normale Verschiebung: Feiertag unter der Woche -> Verschiebung um einen Tag
              const holidayWeekday = eventDate.getDay();
              
              // Nur verschieben, wenn der Feiertag ein Werktag (Mo-Fr, 1-5) ist
              if (holidayWeekday >= 1 && holidayWeekday <= 5) {
                eventDate = addDays(eventDate, 1);
                
                // Prüfe, ob der verschobene Tag auch ein Feiertag ist
                const nextDayHoliday = holidays.find(h => 
                  format(parseISO(h.date), 'yyyy-MM-dd') === format(eventDate, 'yyyy-MM-dd'));
                
                if (nextDayHoliday) {
                  reason += ` und ${nextDayHoliday.name}`;
                  eventDate = addDays(eventDate, 1);
                  
                  // Bei mehreren Feiertagen in Folge könnten wir auf einen Sonntag treffen
                  if (isSunday(eventDate)) {
                    eventDate = addDays(eventDate, 1); // Auf Montag verschieben
                    reason += ' (Sonntag übersprungen)';
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
            let holidayDate = null;
            let holidayName = "";
            
            for (let checkDate = new Date(monday); checkDate <= dayBeforeCurrent; checkDate.setDate(checkDate.getDate() + 1)) {
              // Überspringe Wochenenden
              const checkWeekday = checkDate.getDay();
              if (checkWeekday === 0 || checkWeekday === 6) continue; // Sonntag oder Samstag
              
              // Prüfe, ob dieser Tag ein Feiertag ist
              const dayHoliday = holidays.find(h => 
                format(parseISO(h.date), 'yyyy-MM-dd') === format(checkDate, 'yyyy-MM-dd'));
              
              if (dayHoliday) {
                foundHoliday = true;
                holidayDate = new Date(checkDate);
                holidayName = dayHoliday.name;
                
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
              isModified = true;
              reason = `Verschoben wegen Feiertag (${holidayName}) am ${format(holidayDate, 'dd.MM.yyyy')}`;
              eventDate = addDays(eventDate, 1);
              
              // Prüfe, ob der verschobene Tag ein Feiertag ist
              const shiftedDayHoliday = holidays.find(h => 
                format(parseISO(h.date), 'yyyy-MM-dd') === format(eventDate, 'yyyy-MM-dd'));
              
              if (shiftedDayHoliday) {
                reason += ` und ${shiftedDayHoliday.name} am verschobenen Tag`;
                eventDate = addDays(eventDate, 1);
                
                // Bei mehreren Feiertagen könnten wir auf einen Sonntag treffen
                if (isSunday(eventDate)) {
                  eventDate = addDays(eventDate, 1); // Auf Montag verschieben
                  reason += ' (Sonntag übersprungen)';
                }
              }
            }
          }
          
          // Füge Zeitinformationen hinzu
          let timeInfo = 'Ganztägig';
          if (timeType === 'specific') {
            timeInfo = specificTime + ' Uhr';
          } else if (timeType === 'range') {
            timeInfo = startTime + ' - ' + endTime + ' Uhr';
          }
          
          // Füge den Termin zur Liste hinzu
          events.push({
            originalDate: format(currentDate, 'dd.MM.yyyy'),
            originalWeekday: weekdayNames[currentDate.getDay()],
            eventDate: format(eventDate, 'dd.MM.yyyy'),
            eventWeekday: weekdayNames[eventDate.getDay()],
            timeInfo,
            isModified,
            reason,
            isBioWinterWeek: isBioWaste && skipDueToWinter
          });
        }
        
        // Gehe zur nächsten Woche
        currentDate = addWeeks(currentDate, 1);
      }
      
      setPreviewEvents(events);
      return true;
    } catch (error) {
      console.error('Fehler bei der Generierung der Vorschau:', error);
      setError('Fehler bei der Generierung der Vorschau.');
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setIcsData(null);

    try {
      if (useCustomIcs) {
        if (!customIcsUrl && !customIcsFile) {
          throw new Error('Bitte geben Sie eine ICS-URL ein oder laden Sie eine ICS-Datei hoch.');
        }

        // Verarbeite eigene ICS-Datei oder URL
        if (customIcsFile) {
          // Datei parsen
          await parseCustomIcs(customIcsFile);
        } else if (customIcsUrl) {
          // URL verarbeiten mit aktuellem Jahr
          await fetchCustomIcsFromUrl(customIcsUrl);
        }

        if (holidays.length === 0) {
          throw new Error('Keine Feiertage in der ICS-Datei gefunden. Möglicherweise enthält die Datei keine Einträge für das ausgewählte Jahr ' + selectedYear + '.');
        }
      }

      // Zeige Vorschau, wenn diese noch nicht angezeigt wird
      if (!showPreview) {
        const success = generatePreview();
        if (success) {
          setShowPreview(true);
          setLoading(false);
        } else {
          setLoading(false);
        }
        return;
      }

      // Generiere ICS mit unseren Parametern
      const response = await axios.post('/api/generate-ics', {
        pickupDay,
        eventName,
        holidays,
        startDate: selectedYear === currentYear ? adjustedStartDate : startDate,
        endDate,
        reminder: reminder ? parseInt(reminder) : 0,
        timeType,
        specificTime,
        startTime,
        endTime,
        // Neue Parameter für Biotonne
        isBioWaste,
        winterStartMonth,
        winterStartDay,
        winterEndMonth,
        winterEndDay
      }, {
        responseType: 'blob'
      });

      // Speichere die ICS-Datei für den Download
      setIcsData(new Blob([response.data]));
      
      // Erstelle einen Download-Link für die ICS-Datei
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'muellkalender.ics');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Fehler bei der Generierung des Kalenders: ' + err.message);
      console.error('Fehler bei der Generierung:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCustomIcsFile(e.target.files[0]);
      console.log('ICS-Datei ausgewählt:', e.target.files[0].name);
    }
  };

  // Funktion zum Parsen einer eigenen ICS-Datei
  const parseCustomIcs = async (file) => {
    console.log('Verarbeite ICS-Datei:', file.name);
    setLoading(true);
    try {
      // FileReader zum Lesen der Datei
      const reader = new FileReader();
      
      // Promise für das Lesen der Datei
      const fileContent = await new Promise((resolve, reject) => {
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
      });
      
      // Extrahiere die VEVENT-Einträge aus der ICS-Datei
      const events = [];
      const lines = fileContent.split('\n');
      let inEvent = false;
      let currentEvent = {};
      
      for (let line of lines) {
        line = line.trim();
        
        if (line.startsWith('BEGIN:VEVENT')) {
          inEvent = true;
          currentEvent = {};
        } else if (line.startsWith('END:VEVENT')) {
          inEvent = false;
          events.push(currentEvent);
        } else if (inEvent) {
          // Extrahiere die relevanten Informationen
          if (line.startsWith('DTSTART')) {
            const value = line.split(':')[1];
            if (value) {
              // Formatiere das Datum korrekt
              if (value.includes('T')) {
                // Datum mit Uhrzeit
                const dateStr = value.substr(0, 8);
                const year = dateStr.substr(0, 4);
                const month = dateStr.substr(4, 2);
                const day = dateStr.substr(6, 2);
                currentEvent.date = `${year}-${month}-${day}`;
                currentEvent.year = parseInt(year);
              } else {
                // Nur Datum
                const year = value.substr(0, 4);
                const month = value.substr(4, 2);
                const day = value.substr(6, 2);
                currentEvent.date = `${year}-${month}-${day}`;
                currentEvent.year = parseInt(year);
              }
            }
          } else if (line.startsWith('SUMMARY')) {
            currentEvent.name = line.split(':')[1];
          }
        }
      }
      
      // Filtere Ereignisse ohne Datum oder Name und nur für das ausgewählte Jahr
      const validEvents = events.filter(e => 
        e.date && e.name && e.year === selectedYear
      );
      
      console.log(`Gefundene Einträge gesamt: ${events.length}, für Jahr ${selectedYear}: ${validEvents.length}`);
      
      // Konvertiere zu unserem Format
      const formattedHolidays = validEvents.map(event => ({
        date: event.date,
        name: event.name,
        countryCode: 'CUSTOM'
      }));
      
      // Füge Wochentage hinzu
      const holidaysWithWeekday = formattedHolidays.map(holiday => {
        try {
          const holidayDate = parseISO(holiday.date);
          const weekday = format(holidayDate, 'EEEE', { locale: de });
          return {
            ...holiday,
            weekday
          };
        } catch (error) {
          console.warn('Fehler beim Parsen des Datums:', holiday.date, error);
          return holiday;
        }
      });
      
      // Sortiere nach Datum
      const sortedHolidays = holidaysWithWeekday.sort((a, b) => {
        try {
          return parseISO(a.date).getTime() - parseISO(b.date).getTime();
        } catch (error) {
          return 0;
        }
      });
      
      console.log(`${sortedHolidays.length} Feiertage aus ICS-Datei für ${selectedYear} extrahiert`);
      
      // Setze die Feiertage
      setHolidays(sortedHolidays);
      return sortedHolidays;
    } catch (error) {
      console.error('Fehler beim Parsen der ICS-Datei:', error);
      setError('Fehler beim Parsen der ICS-Datei: ' + error.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Funktion zum Verarbeiten einer ICS-URL
  const fetchCustomIcsFromUrl = async (url) => {
    console.log('Verarbeite ICS-URL:', url);
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(url);
      
      if (!response.data) {
        throw new Error('Keine Daten von der URL erhalten');
      }
      
      // Extrahiere die VEVENT-Einträge aus der ICS-Datei
      const events = [];
      const lines = response.data.split('\n');
      let inEvent = false;
      let currentEvent = {};
      
      for (let line of lines) {
        line = line.trim();
        
        if (line.startsWith('BEGIN:VEVENT')) {
          inEvent = true;
          currentEvent = {};
        } else if (line.startsWith('END:VEVENT')) {
          inEvent = false;
          events.push(currentEvent);
        } else if (inEvent) {
          // Extrahiere die relevanten Informationen
          if (line.startsWith('DTSTART')) {
            const value = line.split(':')[1];
            if (value) {
              // Formatiere das Datum korrekt
              if (value.includes('T')) {
                // Datum mit Uhrzeit
                const dateStr = value.substr(0, 8);
                const year = dateStr.substr(0, 4);
                const month = dateStr.substr(4, 2);
                const day = dateStr.substr(6, 2);
                currentEvent.date = `${year}-${month}-${day}`;
                currentEvent.year = parseInt(year);
              } else {
                // Nur Datum
                const year = value.substr(0, 4);
                const month = value.substr(4, 2);
                const day = value.substr(6, 2);
                currentEvent.date = `${year}-${month}-${day}`;
                currentEvent.year = parseInt(year);
              }
            }
          } else if (line.startsWith('SUMMARY')) {
            currentEvent.name = line.split(':')[1];
          }
        }
      }
      
      // Filtere Ereignisse ohne Datum oder Name und nur für das ausgewählte Jahr
      const validEvents = events.filter(e => 
        e.date && e.name && e.year === selectedYear
      );
      
      console.log(`Gefundene Einträge gesamt: ${events.length}, für Jahr ${selectedYear}: ${validEvents.length}`);
      
      // Konvertiere zu unserem Format
      const formattedHolidays = validEvents.map(event => ({
        date: event.date,
        name: event.name,
        countryCode: 'CUSTOM'
      }));
      
      // Füge Wochentage hinzu
      const holidaysWithWeekday = formattedHolidays.map(holiday => {
        try {
          const holidayDate = parseISO(holiday.date);
          const weekday = format(holidayDate, 'EEEE', { locale: de });
          return {
            ...holiday,
            weekday
          };
        } catch (error) {
          console.warn('Fehler beim Parsen des Datums:', holiday.date, error);
          return holiday;
        }
      });
      
      // Sortiere nach Datum
      const sortedHolidays = holidaysWithWeekday.sort((a, b) => {
        try {
          return parseISO(a.date).getTime() - parseISO(b.date).getTime();
        } catch (error) {
          return 0;
        }
      });
      
      console.log(`${sortedHolidays.length} Feiertage aus ICS-URL für ${selectedYear} extrahiert`);
      
      // Setze die Feiertage
      setHolidays(sortedHolidays);
      return sortedHolidays;
    } catch (error) {
      console.error('Fehler beim Laden der ICS-URL:', error);
      setError('Fehler beim Laden der ICS-URL: ' + error.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const resetPreview = () => {
    setShowPreview(false);
    setPreviewEvents([]);
  };

  const downloadIcs = () => {
    if (icsData) {
      const url = window.URL.createObjectURL(icsData);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'muellkalender.ics');
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 mb-6">
        <h2 className="text-3xl font-bold text-primary">Müllkalender Generator</h2>
        <p className="text-lightText text-lg">
          Erstellen Sie einen personalisierten Kalender für Ihre Müllabfuhrtermine. 
          Die Termine werden automatisch verschoben, wenn sie auf einen Feiertag fallen.
        </p>
        <p className="text-sm text-gray-600 italic flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-primary flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <span>
            Dieser Generator wurde speziell für die MA48 (Abfallwirtschaft der Stadt Wien) entwickelt, kann aber auch in anderen Städten und Gemeinden verwendet werden. Die Feiertags-Verschiebungsregeln basieren auf den österreichischen bzw. deutschen Feiertagsregelungen.
          </span>
        </p>
      </div>

      <div className="card animate-fadeIn">
        {!showPreview ? (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-primary flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                Feiertagsdaten
              </h3>
              
              <div className="space-y-4 p-4 bg-background rounded-xl">
                <div className="flex items-center mb-4">
                  <input
                    type="radio"
                    id="useApiHolidays"
                    name="holidaySource"
                    className="mr-3 h-5 w-5"
                    checked={!useCustomIcs}
                    onChange={() => {
                      setUseCustomIcs(false);
                      // Zurücksetzen der Feiertage, damit die API-Abfrage neu gestartet wird
                      setHolidays([]);
                    }}
                  />
                  <label htmlFor="useApiHolidays" className="text-lg font-medium">Feiertage über API abrufen</label>
                </div>
                
                {!useCustomIcs && (
                  <div className="ml-8 space-y-4">
                    <div>
                      <p className="block mb-2 font-medium">Feiertage für Österreich werden automatisch geladen.</p>
                    </div>
                    
                    {loading ? (
                      <div className="mt-4 flex items-center space-x-2 text-gray-600">
                        <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Feiertage werden geladen...</span>
                      </div>
                    ) : holidays.length > 0 ? (
                      <div className="mt-4">
                        <p className="mb-2 font-medium">Feiertage {selectedYear} ({holidays.length}):</p>
                        <div className="max-h-52 overflow-y-auto p-4 bg-surface rounded-lg border border-gray-100 shadow-sm">
                          {holidays.map((holiday, index) => (
                            <div key={index} className="text-sm mb-2 pb-2 border-b border-gray-50 last:border-0">
                              <span className="font-medium text-primary">{format(parseISO(holiday.date), 'dd.MM.yyyy')}</span> 
                              <span className="text-lightText"> ({holiday.weekday})</span> - {holiday.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 text-gray-600">
                        Keine Feiertage gefunden.
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="space-y-4 p-4 bg-background rounded-xl">
                <div className="flex items-center mb-4">
                  <input
                    type="radio"
                    id="useCustomIcs"
                    name="holidaySource"
                    className="mr-3 h-5 w-5"
                    checked={useCustomIcs}
                    onChange={() => {
                      setUseCustomIcs(true);
                      // Zurücksetzen der Feiertage, da wir jetzt eine eigene ICS-Datei verwenden werden
                      setHolidays([]);
                    }}
                  />
                  <label htmlFor="useCustomIcs" className="text-lg font-medium">Eigene ICS-Datei verwenden</label>
                </div>
                
                {useCustomIcs && (
                  <div className="ml-8 space-y-4">
                    <div>
                      <label htmlFor="customIcsUrl" className="block mb-2 font-medium">ICS-URL:</label>
                      <input
                        type="url"
                        id="customIcsUrl"
                        value={customIcsUrl}
                        onChange={(e) => setCustomIcsUrl(e.target.value)}
                        placeholder="https://example.com/calendar.ics"
                        className="input-field w-full"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        URL zu einer ICS-Datei (z.B. ein öffentlicher Kalender) eingeben.
                      </p>
                    </div>
                    
                    <div className="relative">
                      <label className="block mb-2 font-medium">Oder ICS-Datei hochladen:</label>
                      <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg text-center hover:border-primary transition-colors">
                        <input
                          type="file"
                          accept=".ics"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mx-auto text-lightText">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        <p className="mt-2">Datei hierher ziehen oder klicken zum Auswählen</p>
                        {customIcsFile && <p className="mt-2 text-primary font-medium">{customIcsFile.name}</p>}
                      </div>
                    </div>

                    {loading ? (
                      <div className="mt-4 flex items-center space-x-2 text-gray-600">
                        <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>ICS-Datei wird verarbeitet...</span>
                      </div>
                    ) : holidays.length > 0 ? (
                      <div className="mt-4">
                        <p className="mb-2 font-medium">Gefundene Termine ({holidays.length}):</p>
                        <div className="max-h-52 overflow-y-auto p-4 bg-surface rounded-lg border border-gray-100 shadow-sm">
                          {holidays.map((holiday, index) => (
                            <div key={index} className="text-sm mb-2 pb-2 border-b border-gray-50 last:border-0">
                              <span className="font-medium text-primary">{format(parseISO(holiday.date), 'dd.MM.yyyy')}</span> 
                              <span className="text-lightText"> ({holiday.weekday})</span> - {holiday.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-primary flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
                Müllabfuhr-Einstellungen
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="pickupDay" className="block mb-2 font-medium">Abholtag:</label>
                  <select
                    id="pickupDay"
                    value={pickupDay}
                    onChange={(e) => setPickupDay(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="MO">Montag</option>
                    <option value="TU">Dienstag</option>
                    <option value="WE">Mittwoch</option>
                    <option value="TH">Donnerstag</option>
                    <option value="FR">Freitag</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="eventName" className="block mb-2 font-medium">Terminbezeichnung:</label>
                  <input
                    type="text"
                    id="eventName"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="input-field w-full"
                    placeholder="z.B. Restmüll, Biomüll, etc."
                  />
                </div>
              </div>
              
              <div className="p-4 bg-background rounded-xl">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="isBioWaste"
                    checked={isBioWaste}
                    onChange={(e) => setIsBioWaste(e.target.checked)}
                    className="mr-3 h-5 w-5"
                  />
                  <label htmlFor="isBioWaste" className="text-lg font-medium">Biotonne (zweiwöchige Abholung im Winter)</label>
                </div>
                
                {isBioWaste && (
                  <div className="ml-8 space-y-4">
                    <p className="text-sm text-gray-600">Geben Sie den Zeitraum an, in dem die Biotonne nur alle zwei Wochen abgeholt wird:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="winterEnd" className="block mb-2 font-medium">Winterzeitraum Ende:</label>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            id="winterEndDay"
                            value={winterEndDay}
                            onChange={(e) => setWinterEndDay(parseInt(e.target.value))}
                            className="input-field"
                          >
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                              <option key={`end-day-${day}`} value={day}>{day}</option>
                            ))}
                          </select>
                          
                          <select
                            id="winterEndMonth"
                            value={winterEndMonth}
                            onChange={(e) => setWinterEndMonth(parseInt(e.target.value))}
                            className="input-field"
                          >
                            <option value="1">Januar</option>
                            <option value="2">Februar</option>
                            <option value="3">März</option>
                            <option value="4">April</option>
                            <option value="5">Mai</option>
                            <option value="6">Juni</option>
                            <option value="7">Juli</option>
                            <option value="8">August</option>
                            <option value="9">September</option>
                            <option value="10">Oktober</option>
                            <option value="11">November</option>
                            <option value="12">Dezember</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="winterStart" className="block mb-2 font-medium">Winterzeitraum Beginn:</label>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            id="winterStartDay"
                            value={winterStartDay}
                            onChange={(e) => setWinterStartDay(parseInt(e.target.value))}
                            className="input-field"
                          >
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                              <option key={`start-day-${day}`} value={day}>{day}</option>
                            ))}
                          </select>
                          
                          <select
                            id="winterStartMonth"
                            value={winterStartMonth}
                            onChange={(e) => setWinterStartMonth(parseInt(e.target.value))}
                            className="input-field"
                          >
                            <option value="1">Januar</option>
                            <option value="2">Februar</option>
                            <option value="3">März</option>
                            <option value="4">April</option>
                            <option value="5">Mai</option>
                            <option value="6">Juni</option>
                            <option value="7">Juli</option>
                            <option value="8">August</option>
                            <option value="9">September</option>
                            <option value="10">Oktober</option>
                            <option value="11">November</option>
                            <option value="12">Dezember</option>
                          </select>
                        </div>
                        <p className="mt-2 text-sm text-gray-500">Hinweis: Außerhalb dieses Zeitraums erfolgt die Abholung wöchentlich.</p>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-800">
                      <p className="text-sm flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                        <span>
                          <strong>Wichtig zur Winterperiode:</strong> Der Müllkalender berücksichtigt zwei Winterzeiträume - einen am Jahresanfang (vom Vorjahr über den Jahreswechsel) und einen am Jahresende (ins Folgejahr hinein). 
                          <br/><br/>
                          Beispiel für 2024:<br/>
                          - Winterzeitraum 01.10.2023 - 31.03.2024 (erste Jahreshälfte)<br/>
                          - Winterzeitraum 01.10.2024 - 31.03.2025 (zweite Jahreshälfte)
                          <br/><br/>
                          In beiden Zeiträumen wird der zweiwöchige Rhythmus korrekt berechnet, beginnend mit der ersten Abholung nach Winterbeginn.
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="selectedYear" className="block mb-2 font-medium">Jahr:</label>
                  <select
                    id="selectedYear"
                    value={selectedYear}
                    onChange={(e) => {
                      const newYear = parseInt(e.target.value);
                      console.log('Jahr geändert von', selectedYear, 'zu', newYear);
                      setSelectedYear(newYear);
                    }}
                    className="input-field w-full"
                  >
                    <option value={currentYear}>{currentYear}</option>
                    <option value={currentYear + 1}>{currentYear + 1}</option>
                    <option value={currentYear + 2}>{currentYear + 2}</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="reminder" className="block mb-2 font-medium">Erinnerung (Stunden vorher):</label>
                  <select
                    id="reminder"
                    value={reminder}
                    onChange={(e) => setReminder(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="">Keine Erinnerung</option>
                    <option value="1">1 Stunde</option>
                    <option value="3">3 Stunden</option>
                    <option value="12">12 Stunden</option>
                    <option value="24">24 Stunden</option>
                    <option value="48">2 Tage</option>
                  </select>
                </div>
              </div>
              
              <div className="p-4 bg-background rounded-xl">
                <label className="block mb-4 font-medium">Zeitangabe:</label>
                <div className="space-y-4">
                  <div className="flex items-center p-2 hover:bg-surface rounded-lg transition-colors">
                    <input
                      type="radio"
                      id="timeTypeAllDay"
                      name="timeType"
                      value="allday"
                      checked={timeType === 'allday'}
                      onChange={() => setTimeType('allday')}
                      className="mr-3 h-5 w-5"
                    />
                    <label htmlFor="timeTypeAllDay" className="text-lg">Ganztägig</label>
                  </div>
                  
                  <div className="flex items-center p-2 hover:bg-surface rounded-lg transition-colors">
                    <input
                      type="radio"
                      id="timeTypeSpecific"
                      name="timeType"
                      value="specific"
                      checked={timeType === 'specific'}
                      onChange={() => setTimeType('specific')}
                      className="mr-3 h-5 w-5"
                    />
                    <label htmlFor="timeTypeSpecific" className="text-lg">Bestimmte Uhrzeit:</label>
                    {timeType === 'specific' && (
                      <div className="ml-auto">
                        <input
                          type="time"
                          value={specificTime}
                          onChange={(e) => setSpecificTime(e.target.value)}
                          className="input-field"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center p-2 hover:bg-surface rounded-lg transition-colors">
                    <input
                      type="radio"
                      id="timeTypeRange"
                      name="timeType"
                      value="range"
                      checked={timeType === 'range'}
                      onChange={() => setTimeType('range')}
                      className="mr-3 h-5 w-5"
                    />
                    <label htmlFor="timeTypeRange" className="text-lg">Zeitspanne:</label>
                    {timeType === 'range' && (
                      <div className="flex items-center ml-auto">
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="input-field"
                        />
                        <span className="mx-2">bis</span>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="input-field"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              </div>
            )}
            
            <button
              type="submit"
              className="btn btn-primary w-full flex justify-center items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Wird generiert...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Terminvorschau anzeigen
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-primary flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm-3-3h.008v.008H9V12zm0 3h.008v.008H9V15z" />
              </svg>
              Terminvorschau für <span className="text-primary ml-2">"{eventName}"</span>
            </h3>
            
            <div className="bg-background p-6 rounded-xl border border-gray-100">
              <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
                <div className="flex items-center space-x-2 text-lightText">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  <span className="font-medium">{previewEvents.length} Termine</span> für das Jahr {selectedYear}
                </div>
                
                <div className="space-x-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary bg-opacity-10 text-primary font-medium text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 12h.008v.008H12V12zm0 3h.008v.008H12V15zm-3-3h.008v.008H9V12zm0 3h.008v.008H9V15z" />
                    </svg>
                    {({'MO': 'Montag', 'TU': 'Dienstag', 'WE': 'Mittwoch', 'TH': 'Donnerstag', 'FR': 'Freitag', 'SA': 'Samstag', 'SU': 'Sonntag'})[pickupDay]}
                  </span>
                  
                  {timeType !== 'allday' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary bg-opacity-10 text-secondary font-medium text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {timeType === 'specific' ? specificTime + ' Uhr' : startTime + ' - ' + endTime + ' Uhr'}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="bg-surface rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="p-4 text-left">Nr.</th>
                        <th className="p-4 text-left">Datum</th>
                        <th className="p-4 text-left">Wochentag</th>
                        <th className="p-4 text-left">Zeit</th>
                        <th className="p-4 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {previewEvents.map((event, index) => (
                        <tr key={index} className={event.isModified ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-gray-50"}>
                          <td className="p-4 font-medium">{index + 1}</td>
                          <td className="p-4">{event.eventDate}</td>
                          <td className="p-4">{event.eventWeekday}</td>
                          <td className="p-4">{event.timeInfo}</td>
                          <td className="p-4">
                            {event.isModified ? (
                              <div>
                                <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                  </svg>
                                  Verschoben
                                </span>
                                <div className="mt-1 text-xs text-lightText">{event.reason}</div>
                                <div className="mt-1 text-xs text-lightText">
                                  Ursprünglich: {event.originalDate} ({event.originalWeekday})
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Normal
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      
                      {/* Hinweis für übersprungene Termine wegen Winterzeitraum */}
                      {isBioWaste && (
                        <tr className="bg-blue-50">
                          <td colSpan="5" className="p-4 text-center italic text-blue-700">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 inline-block mr-1">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                            </svg>
                            Hinweis: Im Winterzeitraum ({winterStartDay}.{winterStartMonth}. bis {winterEndDay}.{winterEndMonth}.) wurde jede zweite Woche für die Biotonne übersprungen.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4">
              <button 
                type="button" 
                onClick={resetPreview} 
                className="btn btn-secondary md:flex-1 flex justify-center items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
                Zurück
              </button>
              
              <button 
                type="button" 
                onClick={handleSubmit} 
                className="btn btn-primary md:flex-1 flex justify-center items-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Wird generiert...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Kalender generieren (.ics)
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="card animate-fadeIn">
        <h2 className="text-2xl font-bold mb-6 text-primary flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
          Anleitung
        </h2>
        <div className="space-y-6 text-lightText">
          <div>
            <h3 className="font-medium text-text mb-2">Was ist dieser Dienst?</h3>
            <p>
              Dieser Generator erstellt einen Kalender für Ihre regelmäßigen Müllabfuhrtermine. 
              Der generierte Kalender berücksichtigt Feiertage, an denen üblicherweise keine Müllabfuhr stattfindet.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-text mb-2">Wie funktioniert es?</h3>
            <ol className="list-decimal ml-5 space-y-3">
              <li>Wählen Sie das Land für die Feiertage oder laden Sie eine eigene ICS-Datei hoch.</li>
              <li>Wählen Sie den Wochentag, an dem die Müllabfuhr normalerweise stattfindet.</li>
              <li>Geben Sie einen Namen für den Termin ein (z.B. "Restmüll").</li>
              <li>Falls es sich um eine Biotonne handelt, aktivieren Sie die entsprechende Option und geben Sie den Winterzeitraum an, in dem die Abholung nur alle zwei Wochen erfolgt.</li>
              <li>Wählen Sie das gewünschte Jahr für die Termine.</li>
              <li>Wählen Sie, ob der Termin ganztägig ist oder zu einer bestimmten Zeit/Zeitspanne stattfindet.</li>
              <li>Optional: Stellen Sie eine Erinnerung ein.</li>
              <li>Prüfen Sie die Terminvorschau, um die generierten Termine zu sehen.</li>
              <li>Klicken Sie auf "Kalender generieren" und speichern Sie die Datei.</li>
              <li>Importieren Sie die ICS-Datei in Ihre Kalender-App (Google Kalender, Apple Kalender, Outlook, etc.).</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
} 