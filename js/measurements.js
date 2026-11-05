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
 * @returns {Array<{date: string, values: Record<string, number>}>} Entries in date order.
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
 * Adds values for a date, keeping other values already saved for that date.
 * @param {Array<{date: string, values: Record<string, number>}>} entries Existing entries.
 * @param {string} date Date as YYYY-MM-DD.
 * @param {Record<string, number>} values New values.
 * @returns {Array<{date: string, values: Record<string, number>}>} Updated entries in date order.
 */
export function addEntry(entries, date, values) {
  const existing = entries.find((entry) => entry.date === date);
  const others = entries.filter((entry) => entry.date !== date);
  return [...others, { date, values: { ...existing?.values, ...values } }]
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Removes the entry for a date.
 * @param {Array<{date: string, values: Record<string, number>}>} entries Existing entries.
 * @param {string} date Date as YYYY-MM-DD.
 * @returns {Array<{date: string, values: Record<string, number>}>} Remaining entries.
 */
export function removeEntry(entries, date) {
  return entries.filter((entry) => entry.date !== date);
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
