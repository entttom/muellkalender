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

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-primary">Schritt 3 – Vorschau</h3>

      <div className="bg-background rounded-xl p-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
        <div>
          <p className="text-lightText">Termin</p>
          <p className="font-semibold">{title}</p>
        </div>
        <div>
          <p className="text-lightText">Abholtag</p>
          <p className="font-semibold">{DAY_LABELS[pickupDay] || pickupDay}</p>
        </div>
        <div>
          <p className="text-lightText">Jahr</p>
          <p className="font-semibold">{selectedYear}</p>
        </div>
        <div>
          <p className="text-lightText">Termine</p>
          <p className="font-semibold">{activeCount}</p>
        </div>
        <div>
          <p className="text-lightText">Regeln</p>
          <p className="font-semibold">
            {holidayPolicy === 'ma48-vienna'
              ? policyMeta?.ma48Meta?.verified
                ? `MA48 ${selectedYear}: geprüft`
                : `MA48 ${selectedYear}: Standard`
              : holidayPolicy}
          </p>
        </div>
      </div>

      <RuleStatus policyMeta={policyMeta} holidayPolicy={holidayPolicy} />

      {(holidaySource || holidayDegraded) && (
        <p className="text-sm text-lightText">
          Feiertagsquelle: {holidaySource || 'unbekannt'}
          {holidayDegraded ? ' (Degraded Mode / lokaler Fallback)' : ''}
        </p>
      )}

      <SchedulePreview schedule={schedule} formatShort={formatShort} />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onDownload}
          disabled={loading}
        >
          ICS-Datei herunterladen
        </button>
        {icsReady && (
          <p className="text-sm text-emerald-800 self-center" role="status">
            Download gestartet.
          </p>
        )}
      </div>
    </div>
  );
}
