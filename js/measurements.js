import { currentUserId, supabase } from "./supabase.js";

const TABLE = "measurements";

/** Browser storage key used before measurements moved to Supabase. */
const LEGACY_STORAGE_KEY = "cadence.measurements";

/** Tracked body measurements. Each key resolves to `measure.<key>` in the language files and is a key of the row content. */
export const MEASURES = [
  { key: "weight", unit: "kg" },
  { key: "neck", unit: "cm" },
  { key: "chest", unit: "cm" },
  { key: "biceps", unit: "cm" },
  { key: "waist", unit: "cm" },
  { key: "hips", unit: "cm" },
  { key: "thigh", unit: "cm" },
  { key: "calf", unit: "cm" },
];

/**
 * Picks the known measurements from row content. Unknown keys are ignored, so older or newer content shapes still read.
 * @param {Record<string, *> | null} content The row content.
 * @returns {Record<string, number>} Values by measurement key.
 */
function readValues(content) {
  const values = {};
  for (const { key } of MEASURES) {
    if (typeof content?.[key] === "number") {
      values[key] = content[key];
    }
  }
  return values;
}

/**
 * Converts a table row into an entry.
 * @param {{id: string, measured_on: string, measured_at: string | null, content: Record<string, *>}} row The row.
 * @returns {{id: string, date: string, time?: string, values: Record<string, number>}} The entry.
 */
function toEntry(row) {
  return { id: row.id, date: row.measured_on, time: row.measured_at?.slice(0, 5), values: readValues(row.content) };
}

/**
 * Reads the signed-in user's measurements.
 * @returns {Promise<Array<{id: string, date: string, time?: string, values: Record<string, number>}>>} Entries in time order.
 */
export async function fetchEntries() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, measured_on, measured_at, content")
    .order("measured_on")
    .order("measured_at", { nullsFirst: true });
  if (error) {
    throw error;
  }
  return data.map(toEntry);
}

/**
 * Saves values for a date and time. Values already saved for that moment and not given here are kept.
 * @param {string} date Date as YYYY-MM-DD.
 * @param {string | undefined} time Time as HH:MM, or nothing for entries without a time.
 * @param {Record<string, number>} values Values to save.
 */
export async function saveValues(date, time, values) {
  const moment = supabase.from(TABLE).select("content").eq("measured_on", date);
  const { data: existing, error: readError } = await (time ? moment.eq("measured_at", time) : moment.is("measured_at", null))
    .maybeSingle();
  if (readError) {
    throw readError;
  }

  const { error } = await supabase
    .from(TABLE)
    .upsert(
      {
        user_id: await currentUserId(),
        measured_on: date,
        measured_at: time || null,
        content: { ...readValues(existing?.content), ...values },
      },
      { onConflict: "user_id,measured_on,measured_at" },
    );
  if (error) {
    throw error;
  }
}

/**
 * Deletes one entry.
 * @param {string} id Entry id.
 */
export async function deleteEntry(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    throw error;
  }
}

/**
 * Moves measurements saved in this browser before the Supabase version into the account,
 * then removes them from the browser.
 * @returns {Promise<number>} Number of moved entries.
 */
export async function importLegacyEntries() {
  let entries;
  try {
    entries = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
  } catch {
    return 0;
  }
  if (!Array.isArray(entries) || entries.length === 0) {
    return 0;
  }

  // One request per entry, so each entry updates only the values it has.
  for (const entry of entries) {
    await saveValues(entry.date, entry.time, entry.values);
  }
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  return entries.length;
}

/**
 * Summarises one measurement across all entries.
 * @param {Array<{values: Record<string, number>}>} entries Entries in time order.
 * @param {string} key Measurement key.
 * @returns {{latest: number, sinceStart: number} | null} The latest value and its change since the first value, or null without values.
 */
export function getSummary(entries, key) {
  const values = entries.map((entry) => entry.values[key]).filter((value) => value !== undefined);
  if (values.length === 0) {
    return null;
  }
  const latest = values.at(-1);
  return { latest, sinceStart: Math.round((latest - values[0]) * 10) / 10 };
}
