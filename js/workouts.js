import { currentUserId, supabase } from "./supabase.js";

const TABLE = "workouts";

/** Number of most recent workouts listed. */
export const WORKOUT_LIST_LIMIT = 100;

/** Set fields that hold numbers. Which of them a set uses depends on the exercise metric. */
const NUMBER_FIELDS = ["reps", "weightKg", "addedKg", "holdS"];

/**
 * Reads one set. Fields without a value are left out, so the stored content stays short.
 * @param {Record<string, *>} set The stored set.
 * @returns {{progressionId?: string, reps?: number, weightKg?: number, addedKg?: number, band?: string,
 * holdS?: number, isMax: boolean}} The set.
 */
export function toSet(set) {
  const result = { isMax: set?.isMax === true };
  if (typeof set?.progressionId === "string" && set.progressionId !== "") {
    result.progressionId = set.progressionId;
  }
  for (const field of NUMBER_FIELDS) {
    if (typeof set?.[field] === "number" && Number.isFinite(set[field])) {
      result[field] = set[field];
    }
  }
  if (typeof set?.band === "string" && set.band.trim() !== "") {
    result.band = set.band.trim();
  }
  return result;
}

/**
 * Reads a workout from its id, start and content. Missing fields get defaults, so older content shapes still read.
 * @param {string} id Workout id.
 * @param {string} startedAt Start as an ISO timestamp.
 * @param {Record<string, *> | null} content The row content.
 * @returns {{id: string, startedAt: string, durationMin: number | null, notes: string,
 * items: Array<{exerciseId: string, notes: string, sets: Array<ReturnType<typeof toSet>>}>}} The workout.
 */
export function toWorkout(id, startedAt, content) {
  return {
    id,
    startedAt,
    durationMin: typeof content?.durationMin === "number" ? content.durationMin : null,
    notes: typeof content?.notes === "string" ? content.notes : "",
    items: (content?.items ?? []).filter((item) => typeof item?.exerciseId === "string").map((item) => ({
      exerciseId: item.exerciseId,
      notes: typeof item.notes === "string" ? item.notes : "",
      sets: (item.sets ?? []).map(toSet),
    })),
  };
}

/**
 * Builds the stored content of a workout.
 * @param {ReturnType<typeof toWorkout>} workout The workout.
 * @returns {Record<string, *>} The content.
 */
export function toContent(workout) {
  return {
    durationMin: workout.durationMin,
    notes: workout.notes,
    items: workout.items.map((item) => ({ exerciseId: item.exerciseId, notes: item.notes, sets: item.sets.map(toSet) })),
  };
}

/**
 * Reads the most recent workouts.
 * @returns {Promise<Array<ReturnType<typeof toWorkout>>>} Workouts, newest first.
 */
export async function fetchWorkouts() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, started_at, content")
    .order("started_at", { ascending: false })
    .limit(WORKOUT_LIST_LIMIT);
  if (error) {
    throw error;
  }
  return data.map((row) => toWorkout(row.id, row.started_at, row.content));
}

/** Rows read in one request when every matching workout is needed. */
const PAGE_SIZE = 500;

/**
 * Reads every workout with at least one set marked as a max, page by page.
 * The containment filter uses the GIN index on content.
 * @returns {Promise<Array<ReturnType<typeof toWorkout>>>} The workouts, oldest first.
 */
export async function fetchMaxWorkouts() {
  const workouts = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("id, started_at, content")
      .contains("content", { items: [{ sets: [{ isMax: true }] }] })
      .order("started_at")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw error;
    }
    workouts.push(...data.map((row) => toWorkout(row.id, row.started_at, row.content)));
    if (data.length < PAGE_SIZE) {
      return workouts;
    }
  }
}

/**
 * Creates or updates a whole workout in one write.
 * @param {ReturnType<typeof toWorkout> | {id?: string}} workout The workout; without an id a new one is created.
 * @returns {Promise<string>} The workout id.
 */
export async function saveWorkout(workout) {
  const id = workout.id ?? crypto.randomUUID();
  const { error } = await supabase
    .from(TABLE)
    .upsert({ id, user_id: await currentUserId(), started_at: workout.startedAt, content: toContent(workout) });
  if (error) {
    throw error;
  }
  return id;
}

/**
 * Deletes one workout.
 * @param {string} id Workout id.
 */
export async function deleteWorkout(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    throw error;
  }
}
