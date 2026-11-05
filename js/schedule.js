/** Hours in one week. */
export const HOURS_PER_WEEK = 168;

/** Short day names, starting on Monday. */
export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Converts a day and time to hours since Monday 00:00.
 * @param {number} dayIndex Day of the week, where 0 is Monday.
 * @param {number} hour Hour of the day, which may include a fraction.
 * @returns {number} Hours since Monday 00:00.
 */
const at = (dayIndex, hour) => dayIndex * 24 + hour;

/** Fasting periods in chronological order, starting from the one that ends on Monday. */
export const FASTS = [
  { start: at(6, 13), end: at(0, 13) },
  { start: at(2, 8), end: at(3, 8) },
  { start: at(4, 13), end: at(5, 13) },
];

/** Training sessions in chronological order. */
export const TRAININGS = [
  { start: at(0, 19.5), end: at(0, 21.5) },
  { start: at(3, 20), end: at(3, 22) },
];

/**
 * Returns the number of hours from one week position forward to another.
 * @param {number} from Starting position in hours since Monday 00:00.
 * @param {number} to Target position in hours since Monday 00:00.
 * @returns {number} Hours from 0 up to, but not including, one week.
 */
const hoursUntil = (from, to) => (to - from + HOURS_PER_WEEK) % HOURS_PER_WEEK;

/**
 * Converts a date to its position in the week.
 * @param {Date} date Date in the viewer's local time.
 * @returns {number} Hours since Monday 00:00.
 */
export function weekPosition(date) {
  const dayIndex = (date.getDay() + 6) % 7;
  return dayIndex * 24 + date.getHours() + date.getMinutes() / 60;
}

/**
 * Describes the fasting status at a position in the week.
 * @param {number} position Hours since Monday 00:00.
 * @returns {{isFasting: boolean, hoursToChange: number}} The current state and the hours until it changes.
 */
export function getStatus(position) {
  const activeFast = FASTS.find(
    (fast) => hoursUntil(fast.start, position) < hoursUntil(fast.start, fast.end),
  );

  if (activeFast) {
    return { isFasting: true, hoursToChange: hoursUntil(position, activeFast.end) };
  }

  const hoursToNextFast = Math.min(...FASTS.map((fast) => hoursUntil(position, fast.start)));
  return { isFasting: false, hoursToChange: hoursToNextFast };
}

/**
 * Finds the next training that has not ended.
 * @param {number} position Hours since Monday 00:00.
 * @returns {{start: number, end: number}} The current or next training.
 */
export function getNextTraining(position) {
  return (
    TRAININGS.find((training) => position < training.end) ?? TRAININGS[0]
  );
}

/**
 * Lists the fasting and eating periods of the week in order.
 * @returns {Array<{isFast: boolean, start: number, end: number}>} Alternating periods, starting with a fast.
 */
export function getPeriods() {
  return FASTS.flatMap((fast, index) => [
    { isFast: true, start: fast.start, end: fast.end },
    { isFast: false, start: fast.end, end: FASTS[(index + 1) % FASTS.length].start },
  ]);
}
