// Every time the API sends is a UTC timestamp (createdAt, updatedAt). Resumify keeps no time zone
// per user (BACKEND.md "Data model"), so each one is shown in the browser's own time zone.

const dayShort = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const dayLong = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const dayTime = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** "3 Nov" (list rows). */
export function formatDayShort(timestamp) {
  return dayShort.format(new Date(timestamp));
}

/** "3 Nov 2026" (facts, the job view). */
export function formatDay(timestamp) {
  return dayLong.format(new Date(timestamp));
}

/** "3 Nov 2026, 11:08 pm" (the result header). */
export function formatDayTime(timestamp) {
  return dayTime.format(new Date(timestamp)).replace(' at ', ', ');
}
