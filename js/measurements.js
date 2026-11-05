const STORAGE_KEY = "cadence.measurements";

/** Tracked body measurements. Each key resolves to `measure.<key>` in the language files. */
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
 * Reads saved measurements from this browser.
 * @returns {Array<{date: string, time?: string, values: Record<string, number>}>} Entries in time order.
 */
export function loadEntries() {
  try {
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

/**
 * Saves measurements in this browser.
 * @param {Array<{date: string, values: Record<string, number>}>} entries Entries to save.
 * @returns {boolean} True when the entries were saved.
 */
export function storeEntries(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

/**
 * Builds the identity and sort key of an entry. Entries saved before times were added have no time.
 * @param {{date: string, time?: string}} entry The entry.
 * @returns {string} The key.
 */
const entryKey = (entry) => `${entry.date} ${entry.time ?? ""}`;

/**
 * Adds values for a date and time, keeping other values already saved for that moment.
 * @param {Array<{date: string, time?: string, values: Record<string, number>}>} entries Existing entries.
 * @param {string} date Date as YYYY-MM-DD.
 * @param {string} time Time as HH:MM.
 * @param {Record<string, number>} values New values.
 * @returns {Array<{date: string, time?: string, values: Record<string, number>}>} Updated entries in time order.
 */
export function addEntry(entries, date, time, values) {
  const added = { date, time };
  const existing = entries.find((entry) => entryKey(entry) === entryKey(added));
  const others = entries.filter((entry) => entryKey(entry) !== entryKey(added));
  return [...others, { ...added, values: { ...existing?.values, ...values } }]
    .sort((a, b) => entryKey(a).localeCompare(entryKey(b)));
}

/**
 * Removes one entry.
 * @param {Array<{date: string, time?: string, values: Record<string, number>}>} entries Existing entries.
 * @param {{date: string, time?: string}} removed The entry to remove.
 * @returns {Array<{date: string, time?: string, values: Record<string, number>}>} Remaining entries.
 */
export function removeEntry(entries, removed) {
  return entries.filter((entry) => entryKey(entry) !== entryKey(removed));
}

/**
 * Summarises one measurement across all entries.
 * @param {Array<{date: string, values: Record<string, number>}>} entries Entries in date order.
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
