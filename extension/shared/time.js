// @ts-check

/** @param {number} n */
const pad = (n) => String(n).padStart(2, '0');

/**
 * Formats a UTC offset such as "UTC-03:00".
 *
 * @param {number} offsetMinutes Minutes east of UTC (the opposite sign of `Date#getTimezoneOffset`).
 * @returns {string}
 */
export function formatUtcOffset(offsetMinutes) {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/**
 * Local wall-clock time with its UTC offset, e.g. "2026-11-24 14:03:22 UTC-03:00".
 *
 * @param {Date} date
 * @returns {string}
 */
export function formatLocalTimestamp(date) {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ` +
    formatUtcOffset(-date.getTimezoneOffset())
  );
}

/**
 * ISO 8601 UTC timestamp without milliseconds, e.g. "2026-11-24T17:03:22Z".
 *
 * @param {Date} date
 * @returns {string}
 */
export function formatUtcTimestamp(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Local timestamp safe for file names, e.g. "2026-11-24_140322".
 *
 * @param {Date} date
 * @returns {string}
 */
export function formatFileTimestamp(date) {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}
