'use client';

export default function RuleStatus({ policyMeta, holidayPolicy }) {
  if (holidayPolicy !== 'ma48-vienna' || !policyMeta?.ma48Meta) {
    return null;
  }

  const meta = policyMeta.ma48Meta;

  return (
    <div
      className={`rounded-xl px-4 py-3 text-sm ${
        meta.verified
          ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
          : 'bg-amber-50 text-amber-950 border border-amber-200'
      }`}
      role="status"
    >
      {meta.verified ? (
        <>
          <p className="font-medium">
            MA48-Regeln {meta.year}: geprüft
            {meta.verifiedAt ? ` (${meta.verifiedAt})` : ''}
          </p>
          {meta.notes?.map((note) => (
            <p key={note} className="mt-1">
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
