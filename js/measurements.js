import { supabase } from "./supabase.js";

const TABLE = "measurements";

/** Browser storage key used before measurements moved to Supabase. */
const LEGACY_STORAGE_KEY = "cadence.measurements";

/** Tracked body measurements. Each key resolves to `measure.<key>` in the language files and is a column of the table. */
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
 * Converts a table row into an entry.
 * @param {Record<string, *>} row The row.
 * @returns {{id: string, date: string, time?: string, values: Record<string, number>}} The entry.
 */
function toEntry(row) {
  const values = {};
  for (const { key } of MEASURES) {
    if (row[key] !== null) {
      values[key] = Number(row[key]);
    }
  }
  return { id: row.id, date: row.measured_on, time: row.measured_at?.slice(0, 5), values };
}

/**
 * Reads the signed-in user's measurements.
 * @returns {Promise<Array<{id: string, date: string, time?: string, values: Record<string, number>}>>} Entries in time order.
 */
export async function fetchEntries() {
  const { data, error } = await supabase
    .from(TABLE)
    .select(["id", "measured_on", "measured_at", ...MEASURES.map((measure) => measure.key)].join(","))
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
  const { data } = await supabase.auth.getSession();
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { user_id: data.session.user.id, measured_on: date, measured_at: time || null, ...values },
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
