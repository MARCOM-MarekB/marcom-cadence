import { timeToHours } from "./dates.js";

/** Hours in one week. */
export const HOURS_PER_WEEK = 168;

/**
 * Converts a day and time to hours since Monday 00:00.
 * @param {number} dayIndex Day of the week, where 0 is Monday.
 * @param {number} hour Hour of the day, which may include a fraction.
 * @returns {number} Hours since Monday 00:00.
 */
const at = (dayIndex, hour) => dayIndex * 24 + hour;

/** Fasting periods in chronological order, starting from the one that ends on Monday. */
export const FASTS = [
  { start: at(6, 16), end: at(0, 12) },
  { start: at(2, 12), end: at(3, 8.5) },
  { start: at(4, 12), end: at(5, 8.5) },
];

/**
 * Training sessions of the week in chronological order, as week positions.
 * Replaced by setTrainings when the training schedule is read from Supabase.
 */
export let TRAININGS = [];

/**
 * Sets the training sessions of the week.
 * @param {Array<{day: number, start: string, durationMin: number}>} sessions Sessions with the day (0 is Monday),
 * start time as HH:MM and duration in minutes.
 */
export function setTrainings(sessions) {
  TRAININGS = sessions
    .map((session) => {
      const start = at(session.day, timeToHours(session.start));
      return { start, end: start + session.durationMin / 60 };
    })
    .sort((a, b) => a.start - b.start);
}

/**
 * Returns the number of hours from one week position forward to another.
 * @param {number} from Starting position in hours since Monday 00:00.
 * @param {number} to Target position in hours since Monday 00:00.
 * @returns {number} Hours from 0 up to, but not including, one week.
 */
export const hoursUntil = (from, to) => (to - from + HOURS_PER_WEEK) % HOURS_PER_WEEK;

/**
 * Converts a date to its position in the week.
 * @param {Date} date Date in the viewer's local time.
 * @returns {number} Hours since Monday 00:00.
 */
export function weekPosition(date) {
  const dayIndex = (date.getDay() + 6) % 7;
  return dayIndex * 24 + date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

/**
 * Describes the fasting status at a position in the week.
 * @param {number} position Hours since Monday 00:00.
 * @returns {{isFasting: boolean, hoursToChange: number, changeAt: number, progress: number}}
 * The current state, the hours until it changes, the week position of the change and the share of the state already passed.
 */
export function getStatus(position) {
  const activeFast = FASTS.find(
    (fast) => hoursUntil(fast.start, position) < hoursUntil(fast.start, fast.end),
  );

  if (activeFast) {
    return {
      isFasting: true,
      hoursToChange: hoursUntil(position, activeFast.end),
      changeAt: activeFast.end,
      progress: hoursUntil(activeFast.start, position) / hoursUntil(activeFast.start, activeFast.end),
    };
  }

  const nextFast = FASTS.reduce((next, fast) =>
    hoursUntil(position, fast.start) < hoursUntil(position, next.start) ? fast : next);
  const hoursToChange = hoursUntil(position, nextFast.start);
  const hoursSinceFast = Math.min(...FASTS.map((fast) => hoursUntil(fast.end, position)));
  return {
    isFasting: false,
    hoursToChange,
    changeAt: nextFast.start,
    progress: hoursSinceFast / (hoursSinceFast + hoursToChange),
  };
}

/**
 * Finds the next training that has not started.
 * @param {number} position Hours since Monday 00:00.
 * @returns {{start: number, end: number} | null} The next training, or null when none is planned.
 */
export function getNextTraining(position) {
  return TRAININGS.find((training) => position < training.start) ?? TRAININGS[0] ?? null;
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
