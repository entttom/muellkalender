'use client';

import { isValidCalendarDate } from '../../lib/calendar/dateUtils.js';

const MONTHS = [
  { value: 1, label: 'Januar' },
  { value: 2, label: 'Februar' },
  { value: 3, label: 'März' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Dezember' },
];

function MonthDaySelect({ idPrefix, label, day, month, onDay, onMonth }) {
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  const invalid = !isValidCalendarDate(2024, month, day);

  return (
    <div>
      <span className="block mb-2 text-sm font-semibold text-ink" id={`${idPrefix}-label`}>
        {label}
      </span>
      <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby={`${idPrefix}-label`}>
        <select
          id={`${idPrefix}-day`}
          className="input-field"
          value={day}
          onChange={(e) => onDay(Number(e.target.value))}
          aria-invalid={invalid}
        >
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d} disabled={!isValidCalendarDate(2024, month, d)}>
              {d}
            </option>
          ))}
        </select>
        <select
          id={`${idPrefix}-month`}
          className="input-field"
          value={month}
          onChange={(e) => {
            const nextMonth = Number(e.target.value);
            onMonth(nextMonth);
            const maxDay = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][nextMonth - 1];
            if (day > maxDay) onDay(maxDay);
          }}
        >
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      {invalid && (
        <p className="text-sm text-red-700 mt-1" role="alert">
          Ungültiges Datum (z. B. 31. Februar ist nicht möglich).
        </p>
      )}
    </div>
  );
}

export default function BioWasteOptions({
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
}) {
  return (
    <div className="panel space-y-4">
      <label className="flex items-center gap-3 font-semibold text-ink">
        <input
          type="checkbox"
          checked={isBioWaste}
          onChange={(e) => setIsBioWaste(e.target.checked)}
          className="h-5 w-5 rounded border-line"
        />
        Biotonne (14-tägig im Winter)
      </label>

      {isBioWaste && (
        <div className="space-y-4 animate-rise">
          <div>
            <label htmlFor="bioReferenceDate" className="block mb-2 text-sm font-semibold text-ink">
              Bekannter Winter-Abholtermin
            </label>
            <input
              id="bioReferenceDate"
              type="date"
              className="input-field"
              value={bioReferenceDate}
              onChange={(e) => setBioReferenceDate(e.target.value)}
              required={isBioWaste}
            />
            <p className="text-sm text-muted mt-1.5">
              Referenz, dann +14 / +28 / +42 … innerhalb des Winterzeitraums.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MonthDaySelect
              idPrefix="winter-start"
              label="Winterbeginn"
              day={winterStartDay}
              month={winterStartMonth}
              onDay={setWinterStartDay}
              onMonth={setWinterStartMonth}
            />
            <MonthDaySelect
              idPrefix="winter-end"
              label="Winterende"
              day={winterEndDay}
              month={winterEndMonth}
              onDay={setWinterEndDay}
              onMonth={setWinterEndMonth}
            />
          </div>
        </div>
      )}
    </div>
  );
}
