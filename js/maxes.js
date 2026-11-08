import { toDateTimeInput } from "./dates.js";

/**
 * Identifies what a max is compared with: the exercise and, when the set has one, its progression.
 * A max in tuck and a max in full back lever are separate records.
 * @param {string} exerciseId Exercise id.
 * @param {string | undefined} progressionId Progression id of the set.
 * @returns {string} The key.
 */
export function maxKey(exerciseId, progressionId) {
  return `${exerciseId}:${progressionId ?? ""}`;
}

/**
 * Converts a workout start to local time, the form in which measurements and the workout form compare moments.
 * @param {string} startedAt Start as an ISO timestamp.
 * @returns {string} The moment as YYYY-MM-DDTHH:MM.
 */
export function toLocalMoment(startedAt) {
  return toDateTimeInput(new Date(startedAt));
}

/**
 * Lists body weights from measurements.
 * @param {Array<{date: string, time?: string, values: Record<string, number>}>} entries Measurement entries.
 * @returns {Array<{at: string, weight: number}>} Weights with their local moment, oldest first.
 */
export function toWeights(entries) {
  return entries
    .filter((entry) => typeof entry.values.weight === "number")
    .map((entry) => ({ at: `${entry.date}T${entry.time ?? "00:00"}`, weight: entry.values.weight }))
    .sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * Finds the body weight for a moment: the last weight measured before it, or the first one after it
 * when nothing was measured before.
 * @param {Array<{at: string, weight: number}>} weights Weights, oldest first.
 * @param {string} at Local moment as YYYY-MM-DDTHH:MM.
 * @returns {number | null} The weight in kg, or null without any weight.
 */
export function bodyweightAt(weights, at) {
  const before = weights.filter((entry) => entry.at <= at).at(-1);
  return (before ?? weights[0])?.weight ?? null;
}

/**
 * Measures one set, so sets of one exercise can be compared.
 * Weight and bodyweight exercises compare load in kg; bodyweight load is body weight plus added weight.
 * Sets with a band have no load in kg. Repetition exercises compare reps, hold exercises seconds.
 * @param {Record<string, *>} set The set.
 * @param {{metric: string} | undefined} exercise The exercise.
 * @param {number | null} bodyweight Body weight in kg at the time of the workout.
 * @returns {{value: number, unit: string, bodyweight?: number} | null} The measure, or null when the set cannot be measured.
 */
export function measureSet(set, exercise, bodyweight) {
  switch (exercise?.metric) {
    case "weight":
      return set.weightKg === undefined ? null : { value: set.weightKg, unit: "kg" };
    case "bodyweight":
      if (set.band !== undefined || bodyweight === null) {
        return null;
      }
      return { value: bodyweight + (set.addedKg ?? 0), unit: "kg", bodyweight };
    case "hold":
      return set.holdS === undefined ? null : { value: set.holdS, unit: "s" };
    default:
      return set.reps === undefined ? null : { value: set.reps, unit: "reps" };
  }
}

/**
 * Collects the maxes of every exercise and progression from workouts with sets marked as a max.
 * When one workout has several max sets for the same key, the highest counts.
 * @param {Array<{id: string, startedAt: string, items: Array<{exerciseId: string, sets: Array<Record<string, *>>}>}>} workouts
 * Workouts with max sets.
 * @param {function(string): object | undefined} findExercise Finds an exercise by id.
 * @param {Array<{at: string, weight: number}>} weights Body weights, oldest first.
 * @returns {Map<string, Array<{workoutId: string, at: string, set: Record<string, *>, value: number, unit: string,
 * bodyweight?: number}>>} Maxes by key, oldest first.
 */
export function collectMaxes(workouts, findExercise, weights) {
  const maxes = new Map();
  for (const workout of workouts) {
    const at = toLocalMoment(workout.startedAt);
    const bodyweight = bodyweightAt(weights, at);
    const best = new Map();
    for (const item of workout.items) {
      const exercise = findExercise(item.exerciseId);
      for (const set of item.sets.filter((candidate) => candidate.isMax)) {
        const measure = measureSet(set, exercise, bodyweight);
        const key = maxKey(item.exerciseId, set.progressionId);
        if (measure && !(best.get(key)?.value >= measure.value)) {
          best.set(key, { workoutId: workout.id, at, set, ...measure });
        }
      }
    }
    for (const [key, max] of best) {
      maxes.set(key, [...(maxes.get(key) ?? []), max]);
    }
  }
  for (const list of maxes.values()) {
    list.sort((a, b) => a.at.localeCompare(b.at));
  }
  return maxes;
}

/**
 * Finds the last max before a moment.
 * @param {Array<{at: string, value: number}> | undefined} history Maxes of one key, oldest first.
 * @param {string} at Local moment as YYYY-MM-DDTHH:MM.
 * @returns {{at: string, value: number, unit: string} | null} The max, or null when there was none before.
 */
export function previousMax(history, at) {
  return (history ?? []).filter((max) => max.at < at).at(-1) ?? null;
}

/**
 * Expresses a set as a share of a max.
 * @param {{value: number, unit: string} | null} measure The measured set.
 * @param {{value: number, unit: string} | null} max The max.
 * @returns {number | null} Whole percent, or null when they cannot be compared.
 */
export function percentOf(measure, max) {
  if (!measure || !max || max.value <= 0 || measure.unit !== max.unit) {
    return null;
  }
  return Math.round((measure.value / max.value) * 100);
}
