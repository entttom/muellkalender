'use client';

const STATUS_LABELS = {
  normal: 'Normal',
  shifted: 'Verschoben',
  skipped: 'Entfällt',
  special: 'Sonderregel',
};

const STATUS_STYLES = {
  normal: 'bg-slate-100 text-slate-800 border-slate-200',
  shifted: 'bg-amber-50 text-amber-950 border-amber-200',
  skipped: 'bg-slate-50 text-slate-600 border-slate-200',
  special: 'bg-emerald-50 text-emerald-950 border-emerald-200',
};

export default function SchedulePreview({ schedule, formatShort }) {
  if (!schedule?.length) {
    return <p className="text-muted">Keine Termine in der Vorschau.</p>;
  }

  return (
    <>
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-line/80">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/90">
            <tr className="text-left">
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Original</th>
              <th className="py-3 px-4">Effektiv</th>
              <th className="py-3 px-4">Grund</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((entry) => (
              <tr key={entry.originalDate} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${STATUS_STYLES[entry.status]}`}
                  >
                    <StatusMark status={entry.status} />
                    {STATUS_LABELS[entry.status] || entry.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-ink">{formatShort(entry.originalDate)}</td>
                <td className="py-3 px-4 text-ink">
                  {entry.isSkipped ? '—' : formatShort(entry.effectiveDate)}
                  {entry.isShifted && (
                    <span className="block text-xs text-muted mt-0.5">verschoben</span>
                  )}
                </td>
                <td className="py-3 px-4 text-muted">{entry.reason || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {schedule.map((entry) => (
          <article
            key={entry.originalDate}
            className="rounded-2xl border border-line/80 bg-white p-4"
          >
            <div className="mb-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${STATUS_STYLES[entry.status]}`}
              >
                <StatusMark status={entry.status} />
                {STATUS_LABELS[entry.status] || entry.status}
              </span>
            </div>
            {entry.isShifted ? (
              <p className="font-display font-semibold text-ink">
                {formatShort(entry.originalDate)}
                <span className="block text-primary mt-1">
                  → {formatShort(entry.effectiveDate)}
                </span>
              </p>
            ) : (
              <p className="font-display font-semibold text-ink">
                {entry.isSkipped
                  ? formatShort(entry.originalDate)
                  : formatShort(entry.effectiveDate)}
              </p>
            )}
            {entry.reason && <p className="text-sm text-muted mt-2">{entry.reason}</p>}
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
