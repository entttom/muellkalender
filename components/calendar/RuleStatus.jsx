'use client';

export default function RuleStatus({ policyMeta, holidayPolicy }) {
  if (holidayPolicy !== 'ma48-vienna' || !policyMeta?.ma48Meta) {
    return null;
  }

  const meta = policyMeta.ma48Meta;

  return (
    <div
      className={`rounded-2xl px-4 py-3.5 text-sm border ${
        meta.verified
          ? 'bg-emerald-50/90 text-emerald-950 border-emerald-200/80'
          : 'bg-amber-50/90 text-amber-950 border-amber-200/80'
      }`}
      role="status"
    >
      {meta.verified ? (
        <>
          <p className="font-semibold">
            MA48-Regeln {meta.year}: geprüft
            {meta.verifiedAt ? ` · ${meta.verifiedAt}` : ''}
          </p>
          {meta.notes?.map((note) => (
            <p key={note} className="mt-1 text-emerald-900/80">
              {note}
            </p>
          ))}
        </>
      ) : (
        <p>
          Standard-Feiertagsregel wird verwendet. Spezielle MA48-Regelungen für dieses Jahr
          wurden noch nicht verifiziert.
        </p>
      )}
    </div>
  );
}
