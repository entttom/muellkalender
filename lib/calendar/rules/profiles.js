import { getMa48RulesForYear } from './ma48.js';

export const HOLIDAY_PROFILES = {
  'ma48-vienna': {
    id: 'ma48-vienna',
    label: 'Wien / MA48',
    country: 'AT',
    timezone: 'Europe/Vienna',
    description: 'Wiener Abfallwirtschaft mit betrieblichen Sonderregeln',
  },
  generic: {
    id: 'generic',
    label: 'Generisch (gesetzliche Feiertage)',
    country: 'AT',
    timezone: 'Europe/Vienna',
    description: 'Nur gesetzliche Feiertage, ohne betriebliche Sonderregeln',
  },
  custom: {
    id: 'custom',
    label: 'Benutzerdefiniert',
    country: null,
    timezone: 'Europe/Vienna',
    description: 'Eigene Feiertags-/Sperrtagsquelle (ICS oder manuell)',
  },
};

export function resolveHolidayPolicy(holidayPolicy = 'ma48-vienna', year, serviceOverrides = []) {
  const profileId =
    typeof holidayPolicy === 'string' ? holidayPolicy : holidayPolicy?.profile || 'ma48-vienna';
  const profile = HOLIDAY_PROFILES[profileId] || HOLIDAY_PROFILES.generic;

  let ma48Meta = null;
  let overrides = [...(serviceOverrides || [])];

  if (profileId === 'ma48-vienna') {
    ma48Meta = getMa48RulesForYear(year);
    overrides = [...ma48Meta.overrides, ...overrides];
  }

  const country =
    (typeof holidayPolicy === 'object' && holidayPolicy.country) ||
    profile.country ||
    'AT';

  const timezone =
    (typeof holidayPolicy === 'object' && holidayPolicy.timezone) ||
    (country === 'DE' ? 'Europe/Berlin' : profile.timezone);

  return {
    profileId,
    profile,
    country,
    timezone,
    ma48Meta,
    serviceOverrides: overrides,
    unverifiedMa48: profileId === 'ma48-vienna' && ma48Meta && !ma48Meta.verified,
  };
}
