'use client';

import { format, parseISO } from 'date-fns';

export default function HolidaySourceSelector({
  country,
  setCountry,
  useCustomIcs,
  setUseCustomIcs,
  customIcsUrl,
  setCustomIcsUrl,
  customIcsFile,
  setCustomIcsFile,
  loadIcsUrl,
  holidays,
  holidaySource,
  holidayDegraded,
  loading,
  manualOverrides,
  setManualOverrides,
  holidayPolicy,
}) {
  const addOverride = () => {
    setManualOverrides([
      ...manualOverrides,
      { date: '', service: 'closed', reason: '' },
    ]);
  };

  const updateOverride = (index, patch) => {
    setManualOverrides(
      manualOverrides.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const removeOverride = (index) => {
    setManualOverrides(manualOverrides.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <h4 className="font-display font-semibold text-ink">Feiertagsquelle & Sondertage</h4>

      {holidayPolicy !== 'ma48-vienna' && (
        <div>
          <label htmlFor="country" className="block mb-2 text-sm font-semibold text-ink">
            Land
          </label>
          <select
            id="country"
            className="input-field"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={useCustomIcs}
          >
            <option value="AT">Österreich</option>
            <option value="DE">Deutschland</option>
          </select>
        </div>
      )}

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-ink">Quelle</legend>
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="radio"
            name="holidaySourceMode"
            checked={!useCustomIcs}
            onChange={() => setUseCustomIcs(false)}
          />
          Öffentliche Feiertags-API / lokaler Fallback
        </label>
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="radio"
            name="holidaySourceMode"
            checked={useCustomIcs}
            onChange={() => setUseCustomIcs(true)}
          />
          Eigene ICS-Datei oder ICS-URL
        </label>
      </fieldset>

      {useCustomIcs && (
        <div className="space-y-4 animate-rise">
          <div>
            <label htmlFor="customIcsUrl" className="block mb-2 text-sm font-semibold text-ink">
              ICS-URL
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                id="customIcsUrl"
                type="url"
                className="input-field flex-1 min-w-[12rem]"
                value={customIcsUrl}
                onChange={(e) => setCustomIcsUrl(e.target.value)}
                placeholder="https://…"
              />
              <button type="button" className="btn btn-secondary" onClick={loadIcsUrl}>
                Laden
              </button>
            </div>
            <p className="text-xs text-muted mt-1.5">
              Server-Proxy (HTTPS, SSRF-geschützt). Bei Problemen Datei hochladen.
            </p>
          </div>
          <div>
            <label htmlFor="customIcsFile" className="block mb-2 text-sm font-semibold text-ink">
              ICS-Datei
            </label>
            <input
              id="customIcsFile"
              type="file"
              accept=".ics,text/calendar"
              onChange={(e) => setCustomIcsFile(e.target.files?.[0] || null)}
            />
            {customIcsFile && (
              <p className="text-sm text-primary mt-1 font-medium">{customIcsFile.name}</p>
            )}
          </div>
        </div>
      )}

      <div aria-live="polite">
        {loading && <p className="text-sm text-muted">Feiertage werden geladen…</p>}
        {!loading && holidays.length > 0 && (
          <div>
            <p className="text-sm mb-2 text-muted">
              {holidays.length} Feiertage
              {holidaySource ? ` · ${holidaySource}` : ''}
              {holidayDegraded ? ' · eingeschränkt' : ''}
            </p>
            <div className="max-h-40 overflow-y-auto text-sm rounded-xl border border-line bg-white p-3">
              {holidays.map((h) => (
                <div
                  key={h.date + h.name}
                  className="py-1.5 border-b border-line/60 last:border-0"
                >
                  <span className="font-semibold text-primary">
                    {format(parseISO(h.date), 'dd.MM.yyyy')}
                  </span>
                  {h.weekday ? ` (${h.weekday})` : ''} – {h.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h5 className="text-sm font-semibold text-ink">Manuelle Sondertage</h5>
          <button type="button" className="btn btn-secondary !py-2 !px-3 text-xs" onClick={addOverride}>
            Hinzufügen
          </button>
        </div>
        {manualOverrides.length === 0 && (
          <p className="text-sm text-muted">Keine manuellen Overrides.</p>
        )}
        {manualOverrides.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end rounded-xl border border-line bg-white p-3"
          >
            <div>
              <label className="text-xs text-muted" htmlFor={`override-date-${index}`}>
                Datum
              </label>
              <input
                id={`override-date-${index}`}
                type="date"
                className="input-field w-full"
                value={item.date}
                onChange={(e) => updateOverride(index, { date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-muted" htmlFor={`override-service-${index}`}>
                Service
              </label>
              <select
                id={`override-service-${index}`}
                className="input-field w-full"
                value={item.service}
                onChange={(e) => updateOverride(index, { service: e.target.value })}
              >
                <option value="open">Offen</option>
                <option value="closed">Geschlossen</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted" htmlFor={`override-reason-${index}`}>
                Grund
              </label>
              <input
                id={`override-reason-${index}`}
                className="input-field w-full"
                value={item.reason || ''}
                onChange={(e) => updateOverride(index, { reason: e.target.value })}
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary !py-2 text-xs"
              onClick={() => removeOverride(index)}
            >
              Entfernen
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
