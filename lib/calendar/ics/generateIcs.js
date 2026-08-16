import ical from 'ical-generator';

/**
 * Erinnerung: UI speichert Stunden, ical-generator erwartet Sekunden.
 */
export function reminderHoursToTriggerSeconds(reminderHours) {
  const hours = Number(reminderHours);
  if (!Number.isFinite(hours) || hours <= 0) {
    return null;
  }
  return hours * 60 * 60;
}

function parseTimeParts(timeStr) {
  const [hours, minutes] = String(timeStr).split(':').map(Number);
  return { hours, minutes };
}

/**
 * Erzeugt ICS aus einem Schedule (Ergebnis von buildSchedule).
 *
 * Zeitzonenentscheidung:
 * Timed Events nutzen floating local times (kein UTC-Z), damit eine Eingabe
 * „08:00“ in Apple/Google/Outlook als 08:00 erscheint – unabhängig vom Server.
 * Ganztägige Termine nutzen allDay mit lokalem Kalenderdatum.
 *
 * @see README – Abschnitt Zeitzonen
 */
export function generateIcsFromSchedule({
  schedule,
  eventName,
  pickupDay,
  reminderHours = 0,
  timeType = 'allday',
  specificTime = '08:00',
  startTime = '08:00',
  endTime = '09:00',
  timezone = 'Europe/Vienna',
  calendarName = 'Müllkalender',
}) {
  const calendar = ical({
    name: calendarName,
    timezone,
  });

  const uidName =
    String(eventName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '') || 'termin';

  const triggerSeconds = reminderHoursToTriggerSeconds(reminderHours);

  for (const entry of schedule) {
    if (entry.isSkipped || !entry.effectiveDate) {
      continue;
    }

    const [y, m, d] = entry.effectiveDate.split('-').map(Number);
    const uid = `muellkalender-${uidName}-${pickupDay}-${entry.originalDate.replace(/-/g, '')}-${entry.effectiveDate.replace(/-/g, '')}`;

    let description = `Müllabfuhr-Termin für ${eventName}`;
    if (entry.isShifted && entry.reason) {
      description += `\n${entry.reason} (Original: ${entry.originalDate})`;
    } else if (entry.status === 'special' && entry.reason) {
      description += `\n${entry.reason}`;
    }

    const eventOptions = {
      summary: eventName,
      description,
      uid,
      floating: true,
    };

    if (timeType === 'allday') {
      eventOptions.allDay = true;
      eventOptions.start = new Date(y, m - 1, d);
      eventOptions.end = new Date(y, m - 1, d + 1);
    } else if (timeType === 'specific') {
      const { hours, minutes } = parseTimeParts(specificTime);
      eventOptions.start = new Date(y, m - 1, d, hours, minutes, 0);
      eventOptions.end = new Date(y, m - 1, d, hours + 1, minutes, 0);
    } else if (timeType === 'range') {
      const start = parseTimeParts(startTime);
      const end = parseTimeParts(endTime);
      eventOptions.start = new Date(y, m - 1, d, start.hours, start.minutes, 0);
      eventOptions.end = new Date(y, m - 1, d, end.hours, end.minutes, 0);
    }

    const event = calendar.createEvent(eventOptions);

    if (triggerSeconds != null) {
      event.createAlarm({
        type: 'display',
        trigger: triggerSeconds,
        description: `Erinnerung: ${eventName}`,
      });
    }
  }

  return calendar.toString();
}
