import { currentUserId, supabase } from "./supabase.js";
import { localize, toLocalized } from "./i18n.js";

/** How an exercise is measured. Each key resolves to `exercise.metric.<key>` in the language files. */
export const METRICS = ["reps", "weight", "bodyweight", "hold"];

/** Error thrown when an exercise cannot be deleted because a workout uses it. */
export class InUseError extends Error {}

/**
 * Reads an exercise from its id and content. Missing fields get defaults, so older content shapes still read;
 * names and notes stored as plain strings count as the same text in every language.
 * @param {string} id Exercise id.
 * @param {Record<string, *> | null} content The row content.
 * @returns {{id: string, name: Record<string, string>, metric: string, perSide: boolean, notes: Record<string, string>,
 * archived: boolean, progressions: Array<{id: string, name: Record<string, string>, archived: boolean}>}} The exercise.
 */
export function toExercise(id, content) {
  return {
    id,
    name: toLocalized(content?.name),
    metric: METRICS.includes(content?.metric) ? content.metric : "reps",
    perSide: content?.perSide === true,
    notes: toLocalized(content?.notes),
    archived: content?.archived === true,
    progressions: (content?.progressions ?? []).filter((progression) => progression?.id).map((progression) => ({
      id: progression.id,
      name: toLocalized(progression.name),
      archived: progression.archived === true,
    })),
  };
}

/**
 * Reads the whole exercise catalog. It is a short list the user fills by hand, so it is read whole and sorted in the browser.
 * @returns {Promise<Array<ReturnType<typeof toExercise>>>} Exercises in no particular order.
 */
export async function fetchExercises() {
  const { data, error } = await supabase.from("exercises").select("id, content");
  if (error) {
    throw error;
  }
  return data.map((row) => toExercise(row.id, row.content));
}

/**
 * Sorts exercises by their name in the current language.
 * @param {Array<{name: Record<string, string>}>} exercises The exercises.
 * @returns {Array<{name: Record<string, string>}>} A sorted copy.
 */
export function sortExercises(exercises) {
  const language = document.documentElement.lang;
  return [...exercises].sort((a, b) => localize(a.name).localeCompare(localize(b.name), language));
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
