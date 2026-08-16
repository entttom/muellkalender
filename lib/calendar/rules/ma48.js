/**
 * MA48-Sonderregeln (betriebliche Overrides) pro Jahr.
 * Struktur so gewählt, dass weitere Jahre ergänzt werden können.
 */

export const MA48_RULES_BY_YEAR = {
  2026: {
    year: 2026,
    verified: true,
    verifiedAt: '2026-08-16',
    sourceLabel: 'Stadt Wien / MA48',
    notes: [
      'Sonderregel Weihnachten 2026: 25. und 26. Dezember werden regulär entleert.',
    ],
    overrides: [
      {
        date: '2026-12-25',
        service: 'open',
        reason: 'MA48 Sonderregel Weihnachten 2026',
      },
      {
        date: '2026-12-26',
        service: 'open',
        reason: 'MA48 Sonderregel Weihnachten 2026',
      },
    ],
  },
};

/**
 * @param {number} year
 * @returns {{ year: number, verified: boolean, verifiedAt?: string, sourceLabel?: string, notes?: string[], overrides: Array<{date: string, service: 'open'|'closed', reason: string}> }}
 */
export function getMa48RulesForYear(year) {
  const entry = MA48_RULES_BY_YEAR[year];
  if (entry) {
    return entry;
  }
  return {
    year,
    verified: false,
    sourceLabel: 'Stadt Wien / MA48',
    notes: [
      'Standard-Feiertagsregel wird verwendet. Spezielle MA48-Regelungen für dieses Jahr wurden noch nicht verifiziert.',
    ],
    overrides: [],
  };
}

export function getMa48OverridesForYear(year) {
  return getMa48RulesForYear(year).overrides;
}
