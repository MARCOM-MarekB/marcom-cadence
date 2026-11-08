/**
 * Formats a number with two digits.
 * @param {number} value The number.
 * @returns {string} The padded number.
 */
const pad = (value) => String(value).padStart(2, "0");

/**
 * Formats a date in local time for a date input and for date columns.
 * @param {Date} date The date.
 * @returns {string} The date as YYYY-MM-DD.
 */
export function toIsoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Formats a moment in local time for a datetime-local input.
 * @param {Date} date The moment.
 * @returns {string} The moment as YYYY-MM-DDTHH:MM.
 */
export function toDateTimeInput(date) {
  return `${toIsoDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Converts a time of day to hours.
 * @param {string} time Time as HH:MM.
 * @returns {number} Hours since midnight, with minutes as a fraction.
 */
export function timeToHours(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours + minutes / 60;
}
