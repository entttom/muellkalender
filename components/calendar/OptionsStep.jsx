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
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-primary">Schritt 2 – Optionen</h3>

      <BioWasteOptions {...props} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="reminder" className="block mb-2 font-medium">
            Erinnerung (Stunden vorher)
          </label>
          <select
            id="reminder"
            className="input-field w-full"
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
          >
            <option value="">Keine</option>
            <option value="1">1 Stunde</option>
            <option value="3">3 Stunden</option>
            <option value="12">12 Stunden</option>
            <option value="24">24 Stunden</option>
            <option value="48">48 Stunden</option>
          </select>
        </div>

        <div>
          <fieldset>
            <legend className="block mb-2 font-medium">Zeitraum der Termine</legend>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="dateRangeMode"
                  checked={dateRangeMode === 'future'}
                  onChange={() => setDateRangeMode('future')}
                />
                Nur zukünftige Termine
              </label>
              <label className="flex items-center gap-2">
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

      <fieldset className="space-y-3">
        <legend className="font-medium mb-2">Terminzeit</legend>
        <div className="flex flex-wrap gap-4">
          {[
            { id: 'allday', label: 'Ganztägig' },
            { id: 'specific', label: 'Uhrzeit' },
            { id: 'range', label: 'Zeitraum' },
          ].map((opt) => (
            <label key={opt.id} className="flex items-center gap-2">
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
            <label htmlFor="specificTime" className="block mb-1 text-sm">
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
              <label htmlFor="startTime" className="block mb-1 text-sm">
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
              <label htmlFor="endTime" className="block mb-1 text-sm">
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
          className="text-primary font-medium underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
        >
          {showAdvanced ? 'Erweiterte Einstellungen ausblenden' : 'Erweiterte Einstellungen'}
        </button>
        {showAdvanced && (
          <div className="mt-4 p-4 bg-background rounded-xl space-y-4">
            <HolidaySourceSelector {...props} />
          </div>
        )}
      </div>

      {isBioWaste && (
        <p className="text-sm text-lightText">
          Im Winter entfallen reguläre Wochen außerhalb des 14-Tage-Rhythmus – sie erscheinen
          in der Vorschau als „Entfällt“.
        </p>
      )}
    </div>
  );
}
