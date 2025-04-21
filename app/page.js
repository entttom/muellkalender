'use client';

import { useState, useEffect } from 'react';
import { format, addYears, parseISO, addDays, addWeeks, isSunday } from 'date-fns';
import { de } from 'date-fns/locale';
import axios from 'axios';

export default function Home() {
  const [country, setCountry] = useState('at');
  const [pickupDay, setPickupDay] = useState('MO');
  const [eventName, setEventName] = useState('Müllabfuhr');
  const [reminder, setReminder] = useState(12);
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
  const [region, setRegion] = useState('AT-9'); // Wien als Standard

  const currentYear = new Date().getFullYear();
  const startDate = format(new Date(), 'yyyy-MM-dd');
  const endDate = format(addYears(new Date(), 1), 'yyyy-MM-dd');

  useEffect(() => {
    if (country && !useCustomIcs) {
      fetchHolidays();
    }
  }, [country, region, useCustomIcs]);

  const fetchHolidays = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`/api/holidays?country=${country}&region=${region}&year=${currentYear}`);
      
      // Füge den Wochentag zu jedem Feiertag hinzu
      const holidaysWithWeekday = response.data.map(holiday => {
        const holidayDate = parseISO(holiday.date);
        const weekday = format(holidayDate, 'EEEE', { locale: de });
        return {
          ...holiday,
          weekday
        };
      });
      
      setHolidays(holidaysWithWeekday);
    } catch (err) {
      setError('Fehler beim Laden der Feiertage. Bitte versuchen Sie es später erneut.');
      console.error('Fehler beim Laden der Feiertage:', err);
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
      
      // Erstelle eine Liste von Terminen
      const events = [];
      
      // Startdatum für die Schleife
      let currentDate = parseISO(startDate);
      const endDateTime = parseISO(endDate);

      // Finde den ersten Tag des gewünschten Wochentags
      const daysOfWeek = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      const weekdayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
      const targetDayIndex = daysOfWeek.indexOf(pickupDay);
      
      if (targetDayIndex === -1) {
        setError('Ungültiger Wochentag');
        return false;
      }

      // Finde das erste Vorkommen des gewünschten Wochentags
      while (currentDate.getDay() !== targetDayIndex) {
        currentDate = addDays(currentDate, 1);
      }

      // Erstelle Termine für jeden Wochentag bis zum Enddatum
      while (currentDate <= endDateTime) {
        let eventDate = currentDate;
        let isModified = false;
        let reason = '';
        
        // Prüfe, ob der aktuelle Tag ein Feiertag ist
        const holiday = holidays.find(h => 
          format(parseISO(h.date), 'yyyy-MM-dd') === format(eventDate, 'yyyy-MM-dd'));
        
        let isHoliday = !!holiday;
        
        // Wenn es ein Feiertag ist, verschiebe auf den nächsten Tag
        if (isHoliday) {
          isModified = true;
          reason = `Verschoben wegen Feiertag: ${holiday.name}`;
          eventDate = addDays(eventDate, 1);
          
          // Prüfe, ob auch der nächste Tag ein Feiertag ist
          const nextDayHoliday = holidays.find(h => 
            format(parseISO(h.date), 'yyyy-MM-dd') === format(eventDate, 'yyyy-MM-dd'));
          
          isHoliday = !!nextDayHoliday;
          
          // Wenn auch der nächste Tag ein Feiertag ist, verschiebe weiter
          if (isHoliday) {
            reason += ` und ${nextDayHoliday.name}`;
            eventDate = addDays(eventDate, 1);
            
            // Wenn dieser Tag ein Sonntag ist, verschiebe um 3 Tage (vom ursprünglichen Datum)
            if (isSunday(eventDate)) {
              eventDate = addDays(currentDate, 3);
              reason += ' (Sonntag übersprungen)';
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
          reason
        });
        
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

        // Hier würde die Logik für benutzerdefinierte ICS-Dateien folgen
        // Dies würde eine komplexere Implementierung erfordern
        alert('Die Funktion für benutzerdefinierte ICS-Dateien ist noch in Entwicklung.');
        setLoading(false);
        return;
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
        startDate,
        endDate,
        reminder: reminder ? parseInt(reminder) : 0,
        timeType,
        specificTime,
        startTime,
        endTime
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
      setError('Fehler bei der Generierung des Kalenders. Bitte versuchen Sie es später erneut.');
      console.error('Fehler bei der Generierung:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCustomIcsFile(e.target.files[0]);
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
                    onChange={() => setUseCustomIcs(false)}
                  />
                  <label htmlFor="useApiHolidays" className="text-lg font-medium">Feiertage über API abrufen</label>
                </div>
                
                {!useCustomIcs && (
                  <div className="ml-8 space-y-4">
                    <div>
                      <label htmlFor="country" className="block mb-2 font-medium">Land auswählen:</label>
                      <select
                        id="country"
                        value={country}
                        onChange={(e) => {
                          setCountry(e.target.value);
                          // Setze Region auf einen Standardwert für das gewählte Land
                          if (e.target.value === 'at') {
                            setRegion('AT-9'); // Wien als Standard für Österreich
                          } else if (e.target.value === 'de') {
                            setRegion('DE-BE'); // Berlin als Standard für Deutschland
                          }
                        }}
                        className="input-field w-full"
                      >
                        <option value="at">Österreich</option>
                        <option value="de">Deutschland</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="region" className="block mb-2 font-medium">Bundesland auswählen:</label>
                      <select
                        id="region"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="input-field w-full"
                      >
                        {country === 'at' ? (
                          <>
                            <option value="AT-1">Burgenland</option>
                            <option value="AT-2">Kärnten</option>
                            <option value="AT-3">Niederösterreich</option>
                            <option value="AT-4">Oberösterreich</option>
                            <option value="AT-5">Salzburg</option>
                            <option value="AT-6">Steiermark</option>
                            <option value="AT-7">Tirol</option>
                            <option value="AT-8">Vorarlberg</option>
                            <option value="AT-9">Wien</option>
                          </>
                        ) : (
                          <>
                            <option value="DE-BW">Baden-Württemberg</option>
                            <option value="DE-BY">Bayern</option>
                            <option value="DE-BE">Berlin</option>
                            <option value="DE-BB">Brandenburg</option>
                            <option value="DE-HB">Bremen</option>
                            <option value="DE-HH">Hamburg</option>
                            <option value="DE-HE">Hessen</option>
                            <option value="DE-MV">Mecklenburg-Vorpommern</option>
                            <option value="DE-NI">Niedersachsen</option>
                            <option value="DE-NW">Nordrhein-Westfalen</option>
                            <option value="DE-RP">Rheinland-Pfalz</option>
                            <option value="DE-SL">Saarland</option>
                            <option value="DE-SN">Sachsen</option>
                            <option value="DE-ST">Sachsen-Anhalt</option>
                            <option value="DE-SH">Schleswig-Holstein</option>
                            <option value="DE-TH">Thüringen</option>
                          </>
                        )}
                      </select>
                    </div>
                    
                    {holidays.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 font-medium">Feiertage {currentYear} ({holidays.length}):</p>
                        <div className="max-h-52 overflow-y-auto p-4 bg-surface rounded-lg border border-gray-100 shadow-sm">
                          {holidays.map((holiday, index) => (
                            <div key={index} className="text-sm mb-2 pb-2 border-b border-gray-50 last:border-0">
                              <span className="font-medium text-primary">{holiday.date}</span> 
                              <span className="text-lightText"> ({holiday.weekday})</span> - {holiday.name}
                            </div>
                          ))}
                        </div>
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
                    onChange={() => setUseCustomIcs(true)}
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
                    <option value="SA">Samstag</option>
                    <option value="SU">Sonntag</option>
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
            
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
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
                  <span className="font-medium">{previewEvents.length} Termine</span> für das kommende Jahr
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