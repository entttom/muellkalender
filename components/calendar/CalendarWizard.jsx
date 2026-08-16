'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { buildSchedule, getScheduleMeta } from '../../lib/calendar/buildSchedule.js';
import { toDateKey, createDate } from '../../lib/calendar/dateUtils.js';
import PickupStep from './PickupStep';
import OptionsStep from './OptionsStep';
import PreviewStep from './PreviewStep';

const STEPS = [
  { id: 1, title: 'Abholung' },
  { id: 2, title: 'Optionen' },
  { id: 3, title: 'Vorschau' },
];

function withWeekdays(list) {
  return list
    .map((holiday) => {
      try {
        const holidayDate = parseISO(holiday.date);
        return {
          ...holiday,
          weekday: format(holidayDate, 'EEEE', { locale: de }),
        };
      } catch {
        return holiday;
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export default function CalendarWizard() {
  const currentYear = new Date().getFullYear();
  const [step, setStep] = useState(1);

  const [holidayPolicy, setHolidayPolicy] = useState('ma48-vienna');
  const [country, setCountry] = useState('AT');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [pickupDay, setPickupDay] = useState('FR');
  const [eventName, setEventName] = useState('Restmüll');
  const [wasteType, setWasteType] = useState('');

  const [isBioWaste, setIsBioWaste] = useState(false);
  const [bioReferenceDate, setBioReferenceDate] = useState('');
  const [winterStartMonth, setWinterStartMonth] = useState(10);
  const [winterStartDay, setWinterStartDay] = useState(1);
  const [winterEndMonth, setWinterEndMonth] = useState(3);
  const [winterEndDay, setWinterEndDay] = useState(31);

  const [reminder, setReminder] = useState('');
  const [timeType, setTimeType] = useState('allday');
  const [specificTime, setSpecificTime] = useState('08:00');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [dateRangeMode, setDateRangeMode] = useState('future');

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useCustomIcs, setUseCustomIcs] = useState(false);
  const [customIcsUrl, setCustomIcsUrl] = useState('');
  const [customIcsFile, setCustomIcsFile] = useState(null);
  const [manualOverrides, setManualOverrides] = useState([]);

  const [holidays, setHolidays] = useState([]);
  const [holidaySource, setHolidaySource] = useState(null);
  const [holidayDegraded, setHolidayDegraded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [schedule, setSchedule] = useState([]);
  const [icsReady, setIcsReady] = useState(false);

  const policyMeta = useMemo(
    () => getScheduleMeta(selectedYear, holidayPolicy, manualOverrides.filter((o) => o.date)),
    [selectedYear, holidayPolicy, manualOverrides]
  );

  const fetchHolidays = useCallback(async () => {
    if (useCustomIcs || holidayPolicy === 'custom') {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const effectiveCountry =
        holidayPolicy === 'ma48-vienna' ? 'AT' : country;
      const response = await fetch(
        `/api/holidays?country=${effectiveCountry}&year=${selectedYear}`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Feiertage konnten nicht geladen werden');
      }
      const list = Array.isArray(data) ? data : data.holidays || [];
      setHolidays(withWeekdays(list));
      setHolidaySource(data.source || 'nager.date');
      setHolidayDegraded(Boolean(data.degraded));
    } catch (err) {
      setError(err.message || 'Fehler beim Laden der Feiertage');
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }, [country, holidayPolicy, selectedYear, useCustomIcs]);

  useEffect(() => {
    if (useCustomIcs || holidayPolicy === 'custom') {
      return undefined;
    }
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      await fetchHolidays();
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchHolidays, useCustomIcs, holidayPolicy]);

  useEffect(() => {
    if (!useCustomIcs || !customIcsFile) {
      return undefined;
    }
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      setError('');
      try {
        const text = await customIcsFile.text();
        const response = await fetch('/api/parse-ics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ icsText: text, year: selectedYear }),
        });
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          throw new Error(data.error || 'ICS-Datei konnte nicht gelesen werden');
        }
        setHolidays(withWeekdays(data.holidays || []));
        setHolidaySource('ics-file');
        setHolidayDegraded(false);
      } catch (err) {
        if (!cancelled) {
          setError('ICS-Datei konnte nicht gelesen werden: ' + err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [useCustomIcs, customIcsFile, selectedYear]);

  const loadIcsUrl = async () => {
    if (!customIcsUrl.trim()) {
      setError('Bitte eine ICS-URL angeben.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/fetch-ics?url=${encodeURIComponent(customIcsUrl)}&year=${selectedYear}`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'ICS-URL konnte nicht geladen werden');
      }
      setHolidays(withWeekdays(data.holidays || []));
      setHolidaySource('ics-url');
      setHolidayDegraded(false);
      if (!(data.holidays || []).length) {
        setError(`Keine Einträge für ${selectedYear} in der ICS-Datei gefunden.`);
      }
    } catch (err) {
      setError(
        err.message ||
          'ICS-URL konnte nicht geladen werden (CORS oder Netzwerk). Nutzen Sie den Server-Proxy oder eine Datei.'
      );
    } finally {
      setLoading(false);
    }
  };

  const computeDateRange = () => {
    const yearStart = toDateKey(createDate(selectedYear, 1, 1));
    const yearEnd = toDateKey(createDate(selectedYear, 12, 31));
    if (dateRangeMode === 'full-year' || selectedYear !== currentYear) {
      return { start: yearStart, end: yearEnd };
    }
    const today = new Date();
    const start = toDateKey(createDate(today.getFullYear(), today.getMonth() + 1, today.getDate()));
    return { start, end: yearEnd };
  };

  const buildPreview = () => {
    setError('');
    if (!eventName.trim()) {
      setError('Bitte einen Terminnamen angeben.');
      return false;
    }
    if (isBioWaste && !bioReferenceDate) {
      setError('Bitte ein bekanntes Winter-Abholtermin-Datum als Referenz angeben.');
      return false;
    }
    if (timeType === 'range' && startTime >= endTime) {
      setError('Die Startzeit muss vor der Endzeit liegen.');
      return false;
    }
    if (!useCustomIcs && holidays.length === 0 && holidayPolicy !== 'custom') {
      setError('Feiertage sind noch nicht geladen.');
      return false;
    }

    try {
      const range = computeDateRange();
      const overrides = manualOverrides.filter((o) => o.date && o.service);
      const result = buildSchedule({
        year: selectedYear,
        regularPickupDay: pickupDay,
        holidayPolicy: useCustomIcs ? 'custom' : holidayPolicy,
        holidays,
        serviceOverrides: overrides,
        bioWaste: isBioWaste
          ? { enabled: true, referenceDate: bioReferenceDate }
          : { enabled: false },
        winterSchedule: {
          startMonth: winterStartMonth,
          startDay: winterStartDay,
          endMonth: winterEndMonth,
          endDay: winterEndDay,
        },
        dateRange: range,
      });
      setSchedule(result);
      setIcsReady(false);
      return true;
    } catch (err) {
      setError(err.message || 'Vorschau konnte nicht erzeugt werden.');
      return false;
    }
  };

  const goNext = () => {
    if (step === 2) {
      if (!buildPreview()) return;
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const downloadIcs = async () => {
    setLoading(true);
    setError('');
    try {
      const range = computeDateRange();
      const response = await fetch('/api/generate-ics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupDay,
          eventName: wasteType ? `${eventName} (${wasteType})` : eventName,
          holidays,
          startDate: range.start,
          endDate: range.end,
          selectedYear,
          reminder: reminder ? Number(reminder) : 0,
          timeType,
          specificTime,
          startTime,
          endTime,
          holidayPolicy: useCustomIcs ? 'custom' : holidayPolicy,
          country,
          serviceOverrides: manualOverrides.filter((o) => o.date && o.service),
          isBioWaste,
          bioReferenceDate: bioReferenceDate || null,
          winterStartMonth,
          winterStartDay,
          winterEndMonth,
          winterEndDay,
          dateRangeMode,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'ICS-Generierung fehlgeschlagen');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'muellkalender.ics');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setIcsReady(true);
    } catch (err) {
      setError(err.message || 'Download fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const shared = {
    holidayPolicy,
    setHolidayPolicy,
    country,
    setCountry,
    selectedYear,
    setSelectedYear,
    pickupDay,
    setPickupDay,
    eventName,
    setEventName,
    wasteType,
    setWasteType,
    isBioWaste,
    setIsBioWaste,
    bioReferenceDate,
    setBioReferenceDate,
    winterStartMonth,
    setWinterStartMonth,
    winterStartDay,
    setWinterStartDay,
    winterEndMonth,
    setWinterEndMonth,
    winterEndDay,
    setWinterEndDay,
    reminder,
    setReminder,
    timeType,
    setTimeType,
    specificTime,
    setSpecificTime,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    dateRangeMode,
    setDateRangeMode,
    showAdvanced,
    setShowAdvanced,
    useCustomIcs,
    setUseCustomIcs,
    customIcsUrl,
    setCustomIcsUrl,
    customIcsFile,
    setCustomIcsFile,
    manualOverrides,
    setManualOverrides,
    holidays,
    holidaySource,
    holidayDegraded,
    loading,
    loadIcsUrl,
    policyMeta,
    currentYear,
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-3xl font-bold text-primary">Müllkalender</h2>
        <p className="text-lightText text-lg max-w-2xl">
          Wien → Wochentag wählen → Kalender erhalten. Feiertage und MA48-Sonderregeln
          werden automatisch berücksichtigt.
        </p>
      </div>

      <nav aria-label="Fortschritt" className="flex gap-2 flex-wrap">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              if (s.id < step) setStep(s.id);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              step === s.id
                ? 'bg-primary text-white'
                : step > s.id
                  ? 'bg-secondary/30 text-primary'
                  : 'bg-background text-lightText'
            }`}
            aria-current={step === s.id ? 'step' : undefined}
          >
            {s.id}. {s.title}
          </button>
        ))}
      </nav>

      <div
        className="card animate-fadeIn"
        role="region"
        aria-label={`Schritt ${step}: ${STEPS[step - 1].title}`}
      >
        {step === 1 && <PickupStep {...shared} />}
        {step === 2 && <OptionsStep {...shared} />}
        {step === 3 && (
          <PreviewStep
            {...shared}
            schedule={schedule}
            onDownload={downloadIcs}
            icsReady={icsReady}
            onRebuild={() => buildPreview()}
          />
        )}

        <div
          className="mt-6 min-h-[1.5rem]"
          aria-live="polite"
          aria-atomic="true"
        >
          {error && (
            <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3" role="alert">
              {error}
            </p>
          )}
          {loading && !error && (
            <p className="text-lightText flex items-center gap-2">
              <span
                className="inline-block h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
              Wird verarbeitet…
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3 justify-between">
          <button
            type="button"
            className="btn btn-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={goBack}
            disabled={step === 1}
          >
            Zurück
          </button>
          {step < 3 ? (
            <button
              type="button"
              className="btn btn-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={goNext}
            >
              Weiter
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={downloadIcs}
              disabled={loading}
            >
              ICS herunterladen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
