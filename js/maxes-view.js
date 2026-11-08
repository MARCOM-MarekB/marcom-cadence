import { bodyweightAt, collectMaxes, maxKey, measureSet, percentOf, previousMax, toWeights } from "./maxes.js";
import { getExercises } from "./exercises-view.js";
import { localize, t } from "./i18n.js";
import { fetchEntries } from "./measurements.js";
import { fetchMaxWorkouts } from "./workouts.js";

/** Workouts with max sets, oldest first, as last read. */
let maxWorkouts = [];

/** Body weights from measurements, oldest first. */
let weights = [];

/** Maxes by exercise and progression key, oldest first. */
let maxes = new Map();

/** Called after the maxes are read again, so the workout form can show new percentages. */
let maxesListener = () => {};

/**
 * Registers the function called after the maxes are read again.
 * @param {function(): void} listener The function.
 */
export function onMaxesChanged(listener) {
  maxesListener = listener;
}

/**
 * Creates an element with a class and optional text.
 * @param {string} tag Element name.
 * @param {string} className Element class names.
 * @param {string} [text] Element text.
 * @returns {HTMLElement} The new element.
 */
function createElement(tag, className, text = "") {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

/**
 * Finds an exercise of the catalog.
 * @param {string} id Exercise id.
 * @returns {object | undefined} The exercise, also when it is archived.
 */
function findExercise(id) {
  return getExercises().find((exercise) => exercise.id === id);
}

/**
 * Formats a number for the current language.
 * @param {number} value The number.
 * @returns {string} The formatted number.
 */
function formatNumber(value) {
  return value.toLocaleString(document.documentElement.lang, { maximumFractionDigits: 1 });
}

/**
 * Formats a measured value with its unit.
 * @param {number} value The value.
 * @param {string} unit kg, s or reps.
 * @returns {string} A label such as "94 kg", "20 s" or "12 reps".
 */
function formatValue(value, unit) {
  return unit === "reps" ? t("maxes.reps", { count: formatNumber(value) }) : `${formatNumber(value)} ${unit}`;
}

/**
 * Formats a local moment as a date.
 * @param {string} at Local moment as YYYY-MM-DDTHH:MM.
 * @returns {string} The date in the current language.
 */
function formatDate(at) {
  return new Date(at).toLocaleDateString(document.documentElement.lang, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Describes a max: the load or count, how bodyweight load is made up, and the reps of a load max.
 * @param {{set: Record<string, *>, value: number, unit: string, bodyweight?: number}} max The max.
 * @returns {string} A label such as "94 kg × 1 (body 78 kg + 16 kg)".
 */
function describeMax(max) {
  const parts = [formatValue(max.value, max.unit)];
  if (max.unit === "kg" && max.set.reps !== undefined) {
    parts.push(`× ${max.set.reps}`);
  }
  if (max.bodyweight !== undefined) {
    parts.push(t("maxes.bodyweightLoad", {
      bodyweight: formatNumber(max.bodyweight),
      added: `${(max.set.addedKg ?? 0) >= 0 ? "+" : ""}${formatNumber(max.set.addedKg ?? 0)}`,
    }));
  }
  return parts.join(" ");
}

/**
 * Describes the change from one max to the next.
 * @param {{value: number, unit: string}} max The newer max.
 * @param {{value: number, unit: string} | null} previous The older max.
 * @returns {string} A label such as "+4 kg (+4%)", or an empty string without an older max.
 */
function describeChange(max, previous) {
  if (!previous) {
    return "";
  }
  const difference = max.value - previous.value;
  const sign = difference > 0 ? "+" : "";
  const percent = percentOf(max, previous);
  const unit = max.unit === "reps" ? "" : ` ${max.unit}`;
  return `${sign}${formatNumber(difference)}${unit}${percent === null ? "" : ` (${sign}${percent - 100}%)`}`;
}

/**
 * Describes the sets of one exercise in a max workout, each with its share of the max before that workout.
 * @param {{workoutId: string, at: string}} max The max whose workout is described.
 * @param {string} exerciseId Exercise id.
 * @returns {string} A line such as "8×40 kg 45% · 5×60 kg 65% · 1×94 kg 102% MAX".
 */
function describeRamp(max, exerciseId) {
  const workout = maxWorkouts.find((candidate) => candidate.id === max.workoutId);
  const exercise = findExercise(exerciseId);
  const bodyweight = bodyweightAt(weights, max.at);
  const sets = (workout?.items ?? []).filter((item) => item.exerciseId === exerciseId).flatMap((item) => item.sets);

  return sets.map((set) => {
    const measure = measureSet(set, exercise, bodyweight);
    let text;
    if (set.band !== undefined) {
      text = `${set.reps ?? "-"}× ${t("workouts.bandShort", { band: set.band })}`;
    } else if (measure?.unit === "kg") {
      text = `${set.reps ?? "-"}×${formatValue(measure.value, "kg")}`;
    } else {
      text = measure ? formatValue(measure.value, measure.unit) : "-";
    }
    const percent = percentOf(measure, previousMax(maxes.get(maxKey(exerciseId, set.progressionId)), max.at));
    return [text, percent === null ? "" : `${percent}%`, set.isMax ? "MAX" : ""].filter((part) => part !== "").join(" ");
  }).join(" · ");
}

/**
 * Names an exercise and progression.
 * @param {string} exerciseId Exercise id.
 * @param {string} progressionId Progression id, or an empty string.
 * @returns {{name: string, exerciseName: string, order: number}} The full name, the exercise name for sorting,
 * and the progression position (-1 without a progression).
 */
function describeKey(exerciseId, progressionId) {
  const exercise = findExercise(exerciseId);
  const progressionIndex = exercise?.progressions.findIndex((progression) => progression.id === progressionId) ?? -1;
  const exerciseName = exercise ? localize(exercise.name) : t("workouts.unknownExercise");
  const name = progressionIndex >= 0
    ? `${exerciseName}: ${localize(exercise.progressions[progressionIndex].name)}`
    : exerciseName;
  return { name, exerciseName, order: progressionIndex };
}

/**
 * Creates the card of one exercise and progression, with its latest and best max and the whole history.
 * @param {string} key The max key.
 * @param {Array<object>} history Maxes of the key, oldest first.
 * @param {string} name Exercise and progression name.
 * @returns {HTMLLIElement} The card.
 */
function createMaxCard(key, history, name) {
  const [exerciseId] = key.split(":");
  const latest = history.at(-1);
  const best = history.reduce((top, max) => (max.value > top.value ? max : top));

  const summary = document.createElement("summary");
  summary.className = "max-summary";
  summary.append(
    createElement("strong", "", name),
    createElement("span", "max-value", describeMax(latest)),
    createElement("span", "measure-values", [
      formatDate(latest.at),
      describeChange(latest, history.at(-2) ?? null),
      best !== latest ? t("maxes.best", { value: formatValue(best.value, best.unit), date: formatDate(best.at) }) : "",
    ].filter((part) => part !== "").join(" · ")),
  );

  const list = createElement("ol", "max-history");
  list.append(...[...history].reverse().map((max, index, newestFirst) => {
    const row = createElement("li", "max-entry");
    row.append(
      createElement("strong", "", formatDate(max.at)),
      createElement("span", "", [describeMax(max), describeChange(max, newestFirst[index + 1] ?? null)]
        .filter((part) => part !== "").join(" · ")),
      createElement("span", "measure-values", describeRamp(max, exerciseId)),
    );
    return row;
  }));

  const details = createElement("details", "max-details");
  details.append(summary, list);
  const card = createElement("li", "max-card");
  card.append(details);
  return card;
}

/** Renders the max cards, sorted by exercise name and then by progression order. */
export function renderMaxes() {
  const language = document.documentElement.lang;
  const cards = [...maxes.entries()]
    .map(([key, history]) => {
      const [exerciseId, progressionId] = key.split(":");
      return { key, history, ...describeKey(exerciseId, progressionId) };
    })
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName, language) || a.order - b.order);

  // Keep open cards open when the list is rebuilt.
  const open = new Set([...document.querySelectorAll("#maxes-list .max-details[open]")].map((details) => details.dataset.key));
  document.getElementById("maxes-list").replaceChildren(...cards.map(({ key, history, name }) => {
    const card = createMaxCard(key, history, name);
    const details = card.querySelector("details");
    details.dataset.key = key;
    details.open = open.has(key);
    return card;
  }));
  document.getElementById("maxes-empty").hidden = cards.length > 0;
}

/** Collects the maxes again from what was last read, for example after the exercise catalog changed. */
export function refreshMaxes() {
  maxes = collectMaxes(maxWorkouts, findExercise, weights);
  renderMaxes();
  maxesListener();
}

/** Reads the max workouts and body weights from Supabase and renders the maxes. */
export async function loadMaxes() {
  const [workouts, entries] = await Promise.all([fetchMaxWorkouts(), fetchEntries()]);
  maxWorkouts = workouts;
  weights = toWeights(entries);
  refreshMaxes();
}

/**
 * Finds the max to compare a set with: the last max of the same exercise and progression before a moment.
 * @param {string} exerciseId Exercise id.
 * @param {string | undefined} progressionId Progression id of the set.
 * @param {string} at Local moment as YYYY-MM-DDTHH:MM.
 * @returns {{value: number, unit: string} | null} The max, or null when there was none.
 */
export function getPreviousMax(exerciseId, progressionId, at) {
  return previousMax(maxes.get(maxKey(exerciseId, progressionId)), at);
}

/**
 * Finds the body weight for a moment from the measurements.
 * @param {string} at Local moment as YYYY-MM-DDTHH:MM.
 * @returns {number | null} The weight in kg, or null without measurements.
 */
export function getBodyweightAt(at) {
  return bodyweightAt(weights, at);
}

/** Starts reading the maxes. */
export function initMaxes() {
  loadMaxes().catch(() => {
    document.getElementById("maxes-status").textContent = t("maxes.loadFailed");
  });
}
