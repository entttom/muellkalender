'use client';

import BioWasteOptions from './BioWasteOptions';
import HolidaySourceSelector from './HolidaySourceSelector';

export default function OptionsStep(props) {
  const {
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
    isBioWaste,
  } = props;

  return (
    <div className="space-y-7">
      <div>
        <h3 className="font-display text-2xl font-bold tracking-tight text-ink">Optionen</h3>
        <p className="text-muted text-sm mt-1">
          Erinnerung, Zeitraum und optionale Biotonne.
        </p>
      </div>

      <BioWasteOptions {...props} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="reminder" className="block mb-2 text-sm font-semibold text-ink">
            Erinnerung
          </label>
          <select
            id="reminder"
            className="input-field w-full"
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
          >
            <option value="">Keine</option>
            <option value="1">1 Stunde vorher</option>
            <option value="3">3 Stunden vorher</option>
            <option value="12">12 Stunden vorher</option>
            <option value="24">24 Stunden vorher</option>
            <option value="48">48 Stunden vorher</option>
          </select>
        </div>

        <div className="panel">
          <fieldset>
            <legend className="text-sm font-semibold text-ink mb-3">Zeitraum der Termine</legend>
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="radio"
                  name="dateRangeMode"
                  checked={dateRangeMode === 'future'}
                  onChange={() => setDateRangeMode('future')}
                />
                Nur zukünftige Termine
              </label>
              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="radio"
                  name="dateRangeMode"
                  checked={dateRangeMode === 'full-year'}
                  onChange={() => setDateRangeMode('full-year')}
                />
                Ganzes Jahr
              </label>
            </div>
          </fieldset>
        </div>
      </div>

      <fieldset className="panel space-y-3">
        <legend className="text-sm font-semibold text-ink px-1">Terminzeit</legend>
        <div className="flex flex-wrap gap-4">
          {[
            { id: 'allday', label: 'Ganztägig' },
            { id: 'specific', label: 'Uhrzeit' },
            { id: 'range', label: 'Zeitraum' },
          ].map((opt) => (
            <label key={opt.id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="timeType"
                checked={timeType === opt.id}
                onChange={() => setTimeType(opt.id)}
              />
              {opt.label}
            </label>
          ))}
        </div>
        {timeType === 'specific' && (
          <div>
            <label htmlFor="specificTime" className="block mb-1 text-sm text-muted">
              Uhrzeit
            </label>
            <input
              id="specificTime"
              type="time"
              className="input-field"
              value={specificTime}
              onChange={(e) => setSpecificTime(e.target.value)}
            />
          </div>
        )}
        {timeType === 'range' && (
          <div className="flex flex-wrap gap-4">
            <div>
              <label htmlFor="startTime" className="block mb-1 text-sm text-muted">
                Von
              </label>
              <input
                id="startTime"
                type="time"
                className="input-field"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="endTime" className="block mb-1 text-sm text-muted">
                Bis
              </label>
              <input
                id="endTime"
                type="time"
                className="input-field"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
        )}
      </fieldset>

      <div>
        <button
          type="button"
          className="text-sm font-semibold text-primary hover:text-accent transition-colors underline-offset-4 hover:underline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
        >
          {showAdvanced ? 'Erweiterte Einstellungen ausblenden' : 'Erweiterte Einstellungen'}
        </button>
        {showAdvanced && (
          <div className="mt-4 panel space-y-4 animate-rise">
            <HolidaySourceSelector {...props} />
          </div>
        )}
      </div>

      {isBioWaste && (
        <p className="text-sm text-muted">
          Im Winter erscheinen übersprungene Wochen in der Vorschau als „Entfällt“.
        </p>
      )}
    </div>
  );
}
