import { currentUserId, supabase } from "./supabase.js";
import { toContent, toWorkout } from "./workouts.js";
import { toExercise } from "./exercises.js";
import { toSessions } from "./training-schedule.js";

/** Identifies a training export file. */
const FORMAT = "marcom-cadence/training";

/** Version of the export file shape. */
const VERSION = 1;

/** Rows read or written in one request. */
const PAGE_SIZE = 500;

/**
 * Reads every row of a table, page by page.
 * @param {string} table Table name.
 * @param {string} columns Columns to read.
 * @param {string} orderColumn Column that gives a stable order.
 * @returns {Promise<Array<Record<string, *>>>} All rows of the signed-in user.
 */
async function fetchAll(table, columns, orderColumn) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(orderColumn)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw error;
    }
    rows.push(...data);
    if (data.length < PAGE_SIZE) {
      return rows;
    }
  }
}

/**
 * Writes rows in pages of PAGE_SIZE.
 * @param {string} table Table name.
 * @param {Array<Record<string, *>>} rows The rows.
 * @param {string} [onConflict] Unique columns that identify an existing row, when it is not the id.
 */
async function upsertAll(table, rows, onConflict) {
  for (let from = 0; from < rows.length; from += PAGE_SIZE) {
    const { error } = await supabase
      .from(table)
      .upsert(rows.slice(from, from + PAGE_SIZE), onConflict ? { onConflict } : undefined);
    if (error) {
      throw error;
    }
  }
}

/**
 * Builds the export of the whole training log: the exercise catalog, every workout and every schedule version.
 * @returns {Promise<Record<string, *>>} The export, ready to be written as JSON.
 */
export async function exportTraining() {
  const [exercises, workouts, schedules] = await Promise.all([
    fetchAll("exercises", "id, content", "created_at"),
    fetchAll("workouts", "id, started_at, content", "started_at"),
    fetchAll("training_schedules", "id, valid_from, content", "valid_from"),
  ]);
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    exercises: exercises.map((row) => toExercise(row.id, row.content)),
    workouts: workouts.map((row) => toWorkout(row.id, row.started_at, row.content)),
    trainingSchedules: schedules.map((row) => ({ validFrom: row.valid_from, sessions: toSessions(row.content) })),
  };
}

/** Error thrown when a file is not a training export. */
export class ImportFormatError extends Error {}

/**
 * Checks an export file and counts what it holds.
 * @param {*} data The parsed file.
 * @returns {{exercises: number, workouts: number, trainingSchedules: number}} The counts.
 */
export function inspectTraining(data) {
  if (data?.format !== FORMAT || data.version !== VERSION) {
    throw new ImportFormatError("Not a training export");
  }
  return {
    exercises: Array.isArray(data.exercises) ? data.exercises.length : 0,
    workouts: Array.isArray(data.workouts) ? data.workouts.length : 0,
    trainingSchedules: Array.isArray(data.trainingSchedules) ? data.trainingSchedules.length : 0,
  };
}

/**
 * Writes an export into the account. Exercises and workouts with the same id and schedules with the same start date
 * are replaced; everything else in the account stays. Each table is written separately, so a failure can leave
 * the tables written before it changed; importing the same file again completes it.
 * @param {*} data The parsed file, checked with inspectTraining.
 */
export async function importTraining(data) {
  inspectTraining(data);
  const userId = await currentUserId();
  const valid = (record) => typeof record?.id === "string" && record.id !== "";

  await upsertAll("exercises", (data.exercises ?? []).filter(valid).map((record) => {
    const { id, ...content } = toExercise(record.id, record);
    return { id, user_id: userId, content };
  }));
  await upsertAll("workouts", (data.workouts ?? [])
    .filter((record) => valid(record) && !Number.isNaN(Date.parse(record.startedAt)))
    .map((record) => {
      const workout = toWorkout(record.id, record.startedAt, record);
      return { id: workout.id, user_id: userId, started_at: workout.startedAt, content: toContent(workout) };
    }));
  await upsertAll("training_schedules", (data.trainingSchedules ?? [])
    .filter((record) => /^\d{4}-\d{2}-\d{2}$/.test(record?.validFrom ?? ""))
    .map((record) => ({ user_id: userId, valid_from: record.validFrom, content: { sessions: toSessions(record) } })),
  "user_id,valid_from");
}
