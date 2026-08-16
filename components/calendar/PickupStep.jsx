'use client';

import RuleStatus from './RuleStatus';

const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + i - 1);

export default function PickupStep({
  holidayPolicy,
  setHolidayPolicy,
  selectedYear,
  setSelectedYear,
  pickupDay,
  setPickupDay,
  eventName,
  setEventName,
  wasteType,
  setWasteType,
  policyMeta,
}) {
  return (
    <div className="space-y-7">
      <div>
        <h3 className="font-display text-2xl font-bold tracking-tight text-ink">
          Abholung festlegen
        </h3>
        <p className="text-muted text-sm mt-1">
          Wenige Angaben reichen für den Standardfall Wien / MA48.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="holidayPolicy" className="block mb-2 text-sm font-semibold text-ink">
            Profil
          </label>
          <select
            id="holidayPolicy"
            className="input-field w-full"
            value={holidayPolicy}
            onChange={(e) => setHolidayPolicy(e.target.value)}
          >
            <option value="ma48-vienna">Wien / MA48</option>
            <option value="generic">Generisch (gesetzliche Feiertage)</option>
            <option value="custom">Benutzerdefiniert</option>
          </select>
        </div>

        <div>
          <label htmlFor="selectedYear" className="block mb-2 text-sm font-semibold text-ink">
            Jahr
          </label>
          <select
            id="selectedYear"
            className="input-field w-full"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="pickupDay" className="block mb-2 text-sm font-semibold text-ink">
            Regulärer Abholtag
          </label>
          <select
            id="pickupDay"
            className="input-field w-full"
            value={pickupDay}
            onChange={(e) => setPickupDay(e.target.value)}
          >
            <option value="MO">Montag</option>
            <option value="TU">Dienstag</option>
            <option value="WE">Mittwoch</option>
            <option value="TH">Donnerstag</option>
            <option value="FR">Freitag</option>
          </select>
        </div>

        <div>
          <label htmlFor="eventName" className="block mb-2 text-sm font-semibold text-ink">
            Terminname
          </label>
          <input
            id="eventName"
            className="input-field w-full"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="z. B. Restmüll"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="wasteType" className="block mb-2 text-sm font-semibold text-ink">
            Abfalltyp <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="wasteType"
            className="input-field w-full"
            value={wasteType}
            onChange={(e) => setWasteType(e.target.value)}
            placeholder="z. B. Biotonne, Altpapier"
          />
        </div>
      </div>

      <RuleStatus policyMeta={policyMeta} holidayPolicy={holidayPolicy} />
    </div>
  );
}
