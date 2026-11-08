import { currentUserId, supabase } from "./supabase.js";

/** How an exercise is measured. Each key resolves to `exercise.metric.<key>` in the language files. */
export const METRICS = ["reps", "weight", "bodyweight", "hold"];

/** Error thrown when an exercise cannot be deleted because a workout uses it. */
export class InUseError extends Error {}

/**
 * Reads an exercise from a table row. Missing fields get defaults, so older content shapes still read.
 * @param {{id: string, content: Record<string, *>}} row The row.
 * @returns {{id: string, name: string, metric: string, perSide: boolean, notes: string, archived: boolean,
 * progressions: Array<{id: string, name: string, archived: boolean}>}} The exercise.
 */
function toExercise(row) {
  const content = row.content ?? {};
  return {
    id: row.id,
    name: content.name ?? "",
    metric: METRICS.includes(content.metric) ? content.metric : "reps",
    perSide: content.perSide === true,
    notes: content.notes ?? "",
    archived: content.archived === true,
    progressions: (content.progressions ?? []).map((progression) => ({
      id: progression.id,
      name: progression.name ?? "",
      archived: progression.archived === true,
    })),
  };
}

/**
 * Reads the whole exercise catalog. It is a short list the user fills by hand, so it is sorted here, not in the database.
 * @returns {Promise<Array<ReturnType<typeof toExercise>>>} Exercises sorted by name.
 */
export async function fetchExercises() {
  const { data, error } = await supabase.from("exercises").select("id, content");
  if (error) {
    throw error;
  }
  const language = document.documentElement.lang;
  return data.map(toExercise).sort((a, b) => a.name.localeCompare(b.name, language));
}

/**
 * Creates or updates an exercise in one write.
 * Progressions removed in the form stay in the content as archived, so sets that use them keep their name.
 * @param {ReturnType<typeof toExercise> | {id?: string}} exercise The exercise; without an id a new one is created.
 * @returns {Promise<string>} The exercise id.
 */
export async function saveExercise(exercise) {
  const id = exercise.id ?? crypto.randomUUID();
  const { id: _, ...content } = exercise;
  const { error } = await supabase.from("exercises").upsert({ id, user_id: await currentUserId(), content });
  if (error) {
    throw error;
  }
  return id;
}

/**
 * Deletes an exercise. Fails with InUseError when a workout uses it; such an exercise can only be archived.
 * @param {string} id Exercise id.
 */
export async function deleteExercise(id) {
  const { count, error: usageError } = await supabase
    .from("workouts")
    .select("id", { count: "exact", head: true })
    .contains("content", { items: [{ exerciseId: id }] });
  if (usageError) {
    throw usageError;
  }
  if (count > 0) {
    throw new InUseError(`Exercise ${id} is used in ${count} workouts`);
  }

  const { error } = await supabase.from("exercises").delete().eq("id", id);
  if (error) {
    throw error;
  }
}
