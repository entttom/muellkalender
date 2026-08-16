'use client';

const STATUS_LABELS = {
  normal: 'Normal',
  shifted: 'Verschoben',
  skipped: 'Entfällt',
  special: 'Sonderregel',
};

const STATUS_STYLES = {
  normal: 'bg-gray-100 text-gray-800',
  shifted: 'bg-amber-100 text-amber-950',
  skipped: 'bg-slate-100 text-slate-700',
  special: 'bg-emerald-100 text-emerald-950',
};

export default function SchedulePreview({ schedule, formatShort }) {
  if (!schedule?.length) {
    return <p className="text-lightText">Keine Termine in der Vorschau.</p>;
  }

  return (
    <>
      {/* Desktop Tabelle */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-200">
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Original</th>
              <th className="py-2 pr-3">Effektiv</th>
              <th className="py-2">Grund</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((entry) => (
              <tr key={entry.originalDate} className="border-b border-gray-50">
                <td className="py-3 pr-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[entry.status]}`}
                  >
                    <StatusMark status={entry.status} />
                    {STATUS_LABELS[entry.status] || entry.status}
                  </span>
                </td>
                <td className="py-3 pr-3">{formatShort(entry.originalDate)}</td>
                <td className="py-3 pr-3">
                  {entry.isSkipped ? '—' : formatShort(entry.effectiveDate)}
                  {entry.isShifted && (
                    <span className="block text-xs text-lightText">
                      → verschoben
                    </span>
                  )}
                </td>
                <td className="py-3 text-lightText">{entry.reason || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {schedule.map((entry) => (
          <article
            key={entry.originalDate}
            className="border border-gray-100 rounded-xl p-4 bg-surface shadow-sm"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[entry.status]}`}
              >
                <StatusMark status={entry.status} />
                {STATUS_LABELS[entry.status] || entry.status}
              </span>
            </div>
            {entry.isShifted ? (
              <p className="font-medium">
                {formatShort(entry.originalDate)}
                <span className="block text-primary">
                  → {formatShort(entry.effectiveDate)}
                </span>
              </p>
            ) : (
              <p className="font-medium">
                {entry.isSkipped
                  ? formatShort(entry.originalDate)
                  : formatShort(entry.effectiveDate)}
              </p>
            )}
            {entry.reason && (
              <p className="text-sm text-lightText mt-2">{entry.reason}</p>
            )}
          </article>
        ))}
      </div>
    </>
  );
}

function StatusMark({ status }) {
  const symbol =
    status === 'shifted' ? '→' : status === 'skipped' ? '×' : status === 'special' ? '★' : '•';
  return (
    <span aria-hidden="true" className="font-bold">
      {symbol}
    </span>
  );
}
