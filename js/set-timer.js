/**
 * Creates a stopped set timer. A work time of 0 means the set ends when the user says so.
 * @param {{workSeconds: number, restSeconds: number, sets: number}} config Timer settings.
 * @returns {object} The timer.
 */
export function createTimer(config) {
  return { config, phase: "idle", set: 1, endsAt: null, remainingMs: null };
}

/**
 * Enters a phase.
 * @param {object} timer The timer.
 * @param {"work" | "rest"} phase The phase to enter.
 * @param {number} set The set number.
 * @param {number} startAt Start time in milliseconds.
 * @returns {object} The updated timer.
 */
function enterPhase(timer, phase, set, startAt) {
  const seconds = phase === "work" ? timer.config.workSeconds : timer.config.restSeconds;
  return {
    ...timer,
    phase,
    set,
    endsAt: seconds > 0 ? startAt + seconds * 1000 : null,
    remainingMs: null,
  };
}

/**
 * Moves to the phase after the current one.
 * @param {object} timer The timer.
 * @param {number} at Time of the change in milliseconds.
 * @returns {object} The updated timer.
 */
function nextPhase(timer, at) {
  if (timer.phase === "rest") {
    return enterPhase(timer, "work", timer.set + 1, at);
  }
  if (timer.set >= timer.config.sets) {
    return { ...timer, phase: "done", endsAt: null, remainingMs: null };
  }
  return timer.config.restSeconds > 0
    ? enterPhase(timer, "rest", timer.set, at)
    : enterPhase(timer, "work", timer.set + 1, at);
}

/**
 * Starts the first set.
 * @param {object} timer The timer.
 * @param {number} now Current time in milliseconds.
 * @returns {object} The updated timer.
 */
export function startTimer(timer, now) {
  return enterPhase(timer, "work", 1, now);
}

/**
 * Applies every phase change that is due, so time lost in the background is caught up.
 * @param {object} timer The timer.
 * @param {number} now Current time in milliseconds.
 * @returns {object} The updated timer.
 */
export function advanceTimer(timer, now) {
  let current = timer;
  while (current.endsAt !== null && current.endsAt <= now) {
    current = nextPhase(current, current.endsAt);
  }
  return current;
}

/**
 * Ends the current set or rest now.
 * @param {object} timer The timer.
 * @param {number} now Current time in milliseconds.
 * @returns {object} The updated timer.
 */
export function skipPhase(timer, now) {
  return nextPhase(timer, now);
}

/**
 * Pauses the countdown.
 * @param {object} timer The timer.
 * @param {number} now Current time in milliseconds.
 * @returns {object} The updated timer.
 */
export function pauseTimer(timer, now) {
  return timer.endsAt === null ? timer : { ...timer, endsAt: null, remainingMs: timer.endsAt - now };
}

/**
 * Resumes a paused countdown.
 * @param {object} timer The timer.
 * @param {number} now Current time in milliseconds.
 * @returns {object} The updated timer.
 */
export function resumeTimer(timer, now) {
  return timer.remainingMs === null ? timer : { ...timer, endsAt: now + timer.remainingMs, remainingMs: null };
}

/**
 * Returns the whole seconds left in the current phase.
 * @param {object} timer The timer.
 * @param {number} now Current time in milliseconds.
 * @returns {number | null} Seconds left, or null when the phase has no countdown.
 */
export function getRemainingSeconds(timer, now) {
  const remainingMs = timer.endsAt === null ? timer.remainingMs : timer.endsAt - now;
  return remainingMs === null ? null : Math.ceil(remainingMs / 1000);
}
