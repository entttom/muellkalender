'use client';

import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import RuleStatus from './RuleStatus';
import SchedulePreview from './SchedulePreview';

const DAY_LABELS = {
  MO: 'Montag',
  TU: 'Dienstag',
  WE: 'Mittwoch',
  TH: 'Donnerstag',
  FR: 'Freitag',
};

function formatShort(dateKey) {
  if (!dateKey) return '—';
  return format(parseISO(dateKey), 'EEE, dd.MM.yyyy', { locale: de });
}

export default function PreviewStep({
  schedule,
  eventName,
  wasteType,
  pickupDay,
  selectedYear,
  policyMeta,
  holidayPolicy,
  holidaySource,
  holidayDegraded,
  onDownload,
  icsReady,
  loading,
}) {
  const activeCount = schedule.filter((e) => !e.isSkipped).length;
  const title = wasteType ? `${eventName} (${wasteType})` : eventName;

  const stats = [
    { label: 'Termin', value: title },
    { label: 'Abholtag', value: DAY_LABELS[pickupDay] || pickupDay },
    { label: 'Jahr', value: String(selectedYear) },
    { label: 'Termine', value: String(activeCount) },
    {
      label: 'Regeln',
      value:
        holidayPolicy === 'ma48-vienna'
          ? policyMeta?.ma48Meta?.verified
            ? `MA48 geprüft`
            : `MA48 Standard`
          : holidayPolicy,
    },
  ];

  return (
    <div className="space-y-7">
      <div>
        <h3 className="font-display text-2xl font-bold tracking-tight text-ink">Vorschau</h3>
        <p className="text-muted text-sm mt-1">
          Prüfen Sie die Termine, dann ICS herunterladen.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((item) => (
          <div key={item.label} className="panel !p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted font-semibold">
              {item.label}
            </p>
            <p className="font-display font-semibold text-ink mt-1 truncate" title={item.value}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <RuleStatus policyMeta={policyMeta} holidayPolicy={holidayPolicy} />

      {(holidaySource || holidayDegraded) && (
        <p className="text-sm text-muted">
          Feiertagsquelle: {holidaySource || 'unbekannt'}
          {holidayDegraded ? ' · Degraded Mode / lokaler Fallback' : ''}
        </p>
      )}

      <SchedulePreview schedule={schedule} formatShort={formatShort} />

      <div className="flex flex-wrap gap-3 items-center">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onDownload}
          disabled={loading}
        >
          ICS-Datei herunterladen
        </button>
        {icsReady && (
          <p className="text-sm text-emerald-800" role="status">
            Download gestartet.
          </p>
        )}
      </div>
    </div>
  );
}
