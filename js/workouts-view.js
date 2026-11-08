import { deleteWorkout, fetchWorkouts, saveWorkout, toSet } from "./workouts.js";
import { getBodyweightAt, getPreviousMax } from "./maxes-view.js";
import { measureSet, percentOf } from "./maxes.js";
import { getExercises } from "./exercises-view.js";
import { localize, t } from "./i18n.js";
import { sortExercises } from "./exercises.js";
import { toDateTimeInput } from "./dates.js";
import { TRAININGS } from "./schedule.js";

/** Minutes between suggested start times when no training is planned for today. */
const START_ROUNDING_MIN = 5;

/** Set inputs for each exercise metric, in display order. */
const SET_FIELDS = {
  reps: ["reps"],
  weight: ["reps", "weightKg"],
  bodyweight: ["reps", "addedKg", "band"],
  hold: ["holdS"],
};

/** Input settings of each set field. */
const FIELD_INPUTS = {
  reps: { type: "number", min: "0", step: "1" },
  weightKg: { type: "number", min: "0", step: "0.5" },
  addedKg: { type: "number", step: "0.5" },
  holdS: { type: "number", min: "0", step: "1" },
  band: { type: "text", maxLength: 30 },
};

/** Most recent workouts as last read from Supabase, newest first. */
let workouts = [];

/** Called after a workout is saved or deleted, so the maxes can be read again. */
let savedListener = () => {};

/**
 * Registers the function called after a workout is saved or deleted.
 * @param {function(): void} listener The function.
 */
export function onWorkoutSaved(listener) {
  savedListener = listener;
}

/**
 * Workout being edited, or null while the form is closed. startedAt is kept as a datetime-local value
 * and the object is changed directly by the form inputs.
 * @type {{id?: string, startedAt: string, durationMin: number | null, notes: string,
 * items: Array<{exerciseId: string, notes: string, sets: Array<Record<string, *>>}>} | null}
 */
let draft = null;

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
 * Creates a button.
 * @param {string} className Button class names.
 * @param {string} text Button text.
 * @param {function(): void} onClick Click handler.
 * @param {string} [label] Accessible label when the text is a symbol.
 * @returns {HTMLButtonElement} The button.
 */
function createButton(className, text, onClick, label) {
  const button = createElement("button", className, text);
  button.type = "button";
  button.addEventListener("click", onClick);
  if (label) {
    button.setAttribute("aria-label", label);
  }
  return button;
}

/**
 * Shows a message next to the workout buttons.
 * @param {string} key Translation key, or an empty string to clear the message.
 */
function setStatus(key) {
  document.getElementById("workout-status").textContent = key ? t(key) : "";
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
 * Suggests the start of a new workout: today's planned training, or the current time.
 * @returns {{startedAt: string, durationMin: number | null}} Start as a datetime-local value and duration.
 */
function suggestStart() {
  const now = new Date();
  const dayIndex = (now.getDay() + 6) % 7;
  const training = TRAININGS.find((session) => Math.floor(session.start / 24) === dayIndex);
  const start = new Date(now);
  start.setSeconds(0, 0);

  if (training) {
    const minutes = Math.round((training.start - dayIndex * 24) * 60);
    start.setHours(Math.floor(minutes / 60), minutes % 60);
    return { startedAt: toDateTimeInput(start), durationMin: Math.round((training.end - training.start) * 60) };
  }
  start.setMinutes(start.getMinutes() - (start.getMinutes() % START_ROUNDING_MIN));
  return { startedAt: toDateTimeInput(start), durationMin: null };
}

/**
 * Asks before an open form with possible changes is replaced.
 * @returns {boolean} True when the form may be replaced.
 */
function mayReplaceDraft() {
  return draft === null || confirm(t("workouts.discardConfirm"));
}

/**
 * Opens the form with a workout.
 * @param {NonNullable<typeof draft>} workout The workout to edit.
 */
function openForm(workout) {
  draft = workout;
  setStatus("");
  renderForm();
  document.getElementById("workout-form").scrollIntoView({ block: "start", behavior: "smooth" });
}

/** Opens the form for a new, empty workout. */
function openNew() {
  if (mayReplaceDraft()) {
    openForm({ ...suggestStart(), notes: "", items: [] });
  }
}

/**
 * Opens the form for a new workout with the exercises and sets of an earlier one.
 * The start is suggested again and max marks are cleared.
 * @param {object} source The workout to copy.
 */
function openCopy(source) {
  if (!mayReplaceDraft()) {
    return;
  }
  const suggested = suggestStart();
  openForm({
    startedAt: suggested.startedAt,
    durationMin: suggested.durationMin ?? source.durationMin,
    notes: "",
    items: source.items.map((item) => ({
      exerciseId: item.exerciseId,
      notes: "",
      sets: item.sets.map((set) => ({ ...set, isMax: false })),
    })),
  });
}

/**
 * Opens the form for an existing workout.
 * @param {object} workout The workout.
 */
function openEdit(workout) {
  if (mayReplaceDraft()) {
    openForm({
      id: workout.id,
      startedAt: toDateTimeInput(new Date(workout.startedAt)),
      durationMin: workout.durationMin,
      notes: workout.notes,
      items: structuredClone(workout.items),
    });
  }
}

/** Closes the form without saving. */
function closeForm() {
  draft = null;
  renderForm();
}

/**
 * Lists the progressions a set can choose: the active ones, plus an archived one the set already uses.
 * @param {object | undefined} exercise The exercise.
 * @param {string | undefined} selectedId Progression id of the set.
 * @returns {Array<{id: string, name: Record<string, string>}>} The progressions.
 */
function progressionChoices(exercise, selectedId) {
  return (exercise?.progressions ?? []).filter((progression) => !progression.archived || progression.id === selectedId);
}

/**
 * Creates the progression picker of a set.
 * @param {Record<string, *>} set The set, changed when the choice changes.
 * @param {Array<{id: string, name: Record<string, string>}>} choices The progressions.
 * @param {function(): void} onChange Called after the set changed.
 * @returns {HTMLLabelElement} The field.
 */
function createProgressionField(set, choices, onChange) {
  const select = document.createElement("select");
  select.append(new Option(t("workouts.noProgression"), ""));
  for (const progression of choices) {
    select.append(new Option(localize(progression.name), progression.id));
  }
  select.value = set.progressionId ?? "";
  select.addEventListener("change", () => {
    if (select.value) {
      set.progressionId = select.value;
    } else {
      delete set.progressionId;
    }
    onChange();
  });

  const field = createElement("label", "set-field set-field-progression");
  field.append(createElement("span", "set-field-name", t("workouts.progression")), select);
  return field;
}

/**
 * Creates one input of a set.
 * @param {Record<string, *>} set The set, changed when the input changes.
 * @param {string} name Field name, a key of FIELD_INPUTS.
 * @param {boolean} perSide Whether reps are counted per side.
 * @param {function(): void} onChange Called after the set changed.
 * @returns {HTMLLabelElement} The field.
 */
function createSetField(set, name, perSide, onChange) {
  const settings = FIELD_INPUTS[name];
  const input = document.createElement("input");
  Object.assign(input, settings);
  if (settings.type === "number") {
    input.inputMode = "decimal";
  }
  input.value = set[name] ?? "";
  input.addEventListener("input", () => {
    const value = settings.type === "number" ? input.valueAsNumber : input.value;
    if (value === "" || Number.isNaN(value)) {
      delete set[name];
    } else {
      set[name] = value;
    }
    onChange();
  });

  const labelKey = name === "reps" && perSide ? "workouts.field.repsPerSide" : `workouts.field.${name}`;
  const field = createElement("label", `set-field set-field-${name}`);
  field.append(createElement("span", "set-field-name", t(labelKey)), input);
  return field;
}

/**
 * Creates one set row.
 * @param {{sets: Array<Record<string, *>>}} item The exercise entry the set belongs to.
 * @param {object | undefined} exercise The exercise.
 * @param {Record<string, *>} set The set.
 * @param {number} index Position of the set in the entry.
 * @returns {HTMLLIElement} The row.
 */
function createSetRow(item, exercise, set, index) {
  const row = createElement("li", "set-row");
  row.append(createElement("span", "set-index", `${index + 1}.`));

  const percent = createElement("span", "set-percent");
  const updatePercent = () => {
    const max = getPreviousMax(item.exerciseId, set.progressionId, draft.startedAt);
    const value = percentOf(measureSet(set, exercise, getBodyweightAt(draft.startedAt)), max);
    percent.textContent = value === null ? "" : `${value}%`;
    percent.title = value === null ? "" : t("workouts.percentTitle", { max: `${max.value} ${max.unit}` });
  };
  updatePercent();

  const choices = progressionChoices(exercise, set.progressionId);
  if (choices.length > 0) {
    row.append(createProgressionField(set, choices, updatePercent));
  }
  for (const name of SET_FIELDS[exercise?.metric ?? "reps"]) {
    row.append(createSetField(set, name, exercise?.perSide === true, updatePercent));
  }
  row.append(percent);

  const max = document.createElement("input");
  max.type = "checkbox";
  max.checked = set.isMax === true;
  max.addEventListener("change", () => { set.isMax = max.checked; });
  const maxField = createElement("label", "check-field set-max");
  maxField.append(max, createElement("span", "", t("workouts.max")));

  row.append(
    maxField,
    createButton("control progression-remove", "×", () => {
      item.sets.splice(index, 1);
      renderItems();
    }, t("workouts.removeSet")),
  );
  return row;
}

/**
 * Creates the card of one exercise in the workout, with its sets.
 * @param {{exerciseId: string, notes: string, sets: Array<Record<string, *>>}} item The exercise entry.
 * @param {number} index Position of the entry in the workout.
 * @returns {HTMLLIElement} The card.
 */
function createItem(item, index) {
  const exercise = findExercise(item.exerciseId);
  const hint = exercise
    ? [t(`exercise.metric.${exercise.metric}`), exercise.perSide ? t("exercises.perSideShort") : ""]
      .filter((part) => part !== "").join(" · ")
    : "";

  const head = createElement("div", "workout-item-head");
  head.append(
    createElement("strong", "", exercise ? localize(exercise.name) : t("workouts.unknownExercise")),
    createElement("span", "measure-values", hint),
    createButton("control progression-remove", "×", () => {
      draft.items.splice(index, 1);
      renderItems();
    }, t("workouts.removeExercise")),
  );

  const sets = createElement("ol", "set-list");
  sets.append(...item.sets.map((set, setIndex) => createSetRow(item, exercise, set, setIndex)));

  const notes = document.createElement("input");
  notes.type = "text";
  notes.maxLength = 200;
  notes.value = item.notes;
  notes.placeholder = t("workouts.itemNotes");
  notes.setAttribute("aria-label", t("workouts.itemNotes"));
  notes.addEventListener("input", () => { item.notes = notes.value; });

  const addSet = createButton("control", t("workouts.addSet"), () => {
    const last = item.sets.at(-1);
    item.sets.push(last ? { ...last, isMax: false } : { isMax: false });
    renderItems();
  });

  const footer = createElement("div", "workout-item-footer measure-field");
  footer.append(addSet, notes);

  const card = createElement("li", "workout-item");
  card.append(head, sets, footer);
  return card;
}

/** Renders the exercises of the open workout. */
function renderItems() {
  document.getElementById("workout-items").replaceChildren(...draft.items.map(createItem));
}

/** Renders the exercise picker with the active exercises of the catalog. */
function renderPicker() {
  const picker = document.getElementById("workout-exercise-picker");
  const active = sortExercises(getExercises()).filter((exercise) => !exercise.archived);
  picker.replaceChildren(
    new Option(t("workouts.pickExercise"), ""),
    ...active.map((exercise) => new Option(localize(exercise.name), exercise.id)),
  );
  document.getElementById("workout-no-exercises").hidden = active.length > 0;
}

/** Shows the form for the open workout, or hides it when none is open. */
function renderForm() {
  const form = document.getElementById("workout-form");
  form.hidden = draft === null;
  if (draft === null) {
    return;
  }
  document.getElementById("workout-form-title").textContent = t(draft.id ? "workouts.editTitle" : "workouts.newTitle");
  document.getElementById("workout-started").value = draft.startedAt;
  document.getElementById("workout-duration").value = draft.durationMin ?? "";
  document.getElementById("workout-notes").value = draft.notes;
  document.getElementById("workout-delete").hidden = !draft.id;
  renderPicker();
  renderItems();
}

/**
 * Formats a number for the current language.
 * @param {number} value The number.
 * @returns {string} The formatted number.
 */
function formatNumber(value) {
  return value.toLocaleString(document.documentElement.lang, { maximumFractionDigits: 2 });
}

/**
 * Describes one set in three parts, so equal sets in a row can be counted: "Tuck 3×10 s", "3×8+8 @ 60 kg".
 * @param {Record<string, *>} set The set.
 * @param {object | undefined} exercise The exercise.
 * @returns {{prefix: string, core: string, suffix: string}} Progression, reps or hold time, and load with marks.
 */
function describeSet(set, exercise) {
  const progression = exercise?.progressions.find((candidate) => candidate.id === set.progressionId);
  let core = "";
  if (set.reps !== undefined) {
    core = exercise?.perSide ? `${set.reps}+${set.reps}` : String(set.reps);
  } else if (set.holdS !== undefined) {
    core = `${formatNumber(set.holdS)} s`;
  }

  const load = [];
  if (set.weightKg !== undefined) {
    load.push(`@ ${formatNumber(set.weightKg)} kg`);
  }
  if (set.addedKg !== undefined) {
    load.push(`@ ${set.addedKg >= 0 ? "+" : ""}${formatNumber(set.addedKg)} kg`);
  }
  if (set.band !== undefined) {
    load.push(t("workouts.bandShort", { band: set.band }));
  }
  if (set.isMax) {
    load.push("MAX");
  }
  return { prefix: progression ? localize(progression.name) : "", core: core || "-", suffix: load.join(" ") };
}

/**
 * Describes the sets of one exercise entry, counting equal sets that follow each other.
 * @param {{exerciseId: string, sets: Array<Record<string, *>>}} item The exercise entry.
 * @returns {string} A line such as "Back lever: Tuck 3×10 s, Advanced tuck 5 s".
 */
function describeItem(item) {
  const exercise = findExercise(item.exerciseId);
  const groups = [];
  for (const set of item.sets) {
    const parts = describeSet(set, exercise);
    const last = groups.at(-1);
    if (last && JSON.stringify(last.parts) === JSON.stringify(parts)) {
      last.count += 1;
    } else {
      groups.push({ parts, count: 1 });
    }
  }
  const sets = groups.map(({ parts, count }) => [
    parts.prefix,
    `${count > 1 ? `${count}×` : ""}${parts.core}`,
    parts.suffix,
  ].filter((part) => part !== "").join(" "));

  const name = exercise ? localize(exercise.name) : t("workouts.unknownExercise");
  return sets.length > 0 ? `${name}: ${sets.join(", ")}` : name;
}

/**
 * Formats the start of a workout.
 * @param {string} startedAt Start as an ISO timestamp.
 * @returns {string} A label such as "Mon, 9 Nov 2026, 19:30".
 */
function formatStart(startedAt) {
  return new Date(startedAt).toLocaleString(document.documentElement.lang, {
    weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** Renders the list of recent workouts. */
function renderList() {
  document.getElementById("workout-list").replaceChildren(...workouts.map((workout) => {
    const summary = [
      workout.durationMin ? t("workouts.durationShort", { minutes: String(workout.durationMin) }) : "",
      ...workout.items.map(describeItem),
      workout.notes,
    ].filter((part) => part !== "");

    const details = createElement("div", "workout-summary");
    details.append(...summary.map((line) => createElement("span", "measure-values", line)));

    const actions = createElement("span", "workout-entry-actions");
    actions.append(
      createButton("control", t("workouts.editButton"), () => openEdit(workout)),
      createButton("control", t("workouts.copyButton"), () => openCopy(workout)),
    );

    const row = createElement("li", "measure-entry workout-entry");
    row.append(createElement("strong", "", formatStart(workout.startedAt)), details, actions);
    return row;
  }));
  document.getElementById("workout-empty").hidden = workouts.length > 0;
  document.getElementById("workout-copy-last").disabled = workouts.length === 0;
}

/** Renders the list and the open form, for example after the language or the exercise catalog changed. */
export function renderWorkouts() {
  renderList();
  renderForm();
}

/** Reads the recent workouts from Supabase and renders them. */
export async function loadWorkouts() {
  workouts = await fetchWorkouts();
  renderList();
}

/**
 * Builds the workout to save from the open form. Sets without any value are left out.
 * @returns {object | null} The workout, or null when the start is missing.
 */
function readDraft() {
  if (!draft.startedAt) {
    return null;
  }
  return {
    id: draft.id,
    startedAt: new Date(draft.startedAt).toISOString(),
    durationMin: draft.durationMin,
    notes: draft.notes.trim(),
    items: draft.items.map((item) => ({
      exerciseId: item.exerciseId,
      notes: item.notes.trim(),
      sets: item.sets.map(toSet).filter((set) => set.isMax || Object.keys(set).length > 1),
    })),
  };
}

/**
 * Saves the open workout.
 * @param {SubmitEvent} event The form submission.
 */
async function saveForm(event) {
  event.preventDefault();
  const workout = readDraft();
  if (!workout) {
    return;
  }

  const save = document.getElementById("workout-save");
  save.disabled = true;
  setStatus("workouts.saving");
  try {
    await saveWorkout(workout);
    draft = null;
    renderForm();
    savedListener();
    await loadWorkouts();
    setStatus("workouts.saved");
  } catch {
    setStatus("workouts.saveFailed");
  } finally {
    save.disabled = false;
  }
}

/** Deletes the workout open in the form. */
async function deleteOpen() {
  if (!draft?.id || !confirm(t("workouts.deleteConfirm", { date: formatStart(new Date(draft.startedAt).toISOString()) }))) {
    return;
  }
  try {
    await deleteWorkout(draft.id);
    draft = null;
    renderForm();
    savedListener();
    await loadWorkouts();
    setStatus("");
  } catch {
    setStatus("workouts.deleteFailed");
  }
}

/** Adds the exercise chosen in the picker to the open workout, with one empty set. */
function addExercise() {
  const picker = document.getElementById("workout-exercise-picker");
  if (!picker.value) {
    return;
  }
  draft.items.push({ exerciseId: picker.value, notes: "", sets: [{ isMax: false }] });
  picker.value = "";
  renderItems();
}

/** Connects the workout log and starts reading the recent workouts. */
export function initWorkouts() {
  document.getElementById("workout-new").addEventListener("click", openNew);
  document.getElementById("workout-copy-last").addEventListener("click", () => {
    if (workouts.length > 0) {
      openCopy(workouts[0]);
    }
  });
  document.getElementById("workout-form").addEventListener("submit", saveForm);
  document.getElementById("workout-cancel").addEventListener("click", closeForm);
  document.getElementById("workout-delete").addEventListener("click", deleteOpen);
  document.getElementById("workout-add-exercise").addEventListener("click", addExercise);
  document.getElementById("workout-started").addEventListener("input", (event) => {
    draft.startedAt = event.target.value;
    // The previous max and the body weight depend on the start.
    renderItems();
  });
  document.getElementById("workout-duration").addEventListener("input", (event) => {
    const value = event.target.valueAsNumber;
    draft.durationMin = Number.isNaN(value) ? null : value;
  });
  document.getElementById("workout-notes").addEventListener("input", (event) => {
    draft.notes = event.target.value;
  });

  renderForm();
  loadWorkouts().catch(() => setStatus("workouts.loadFailed"));
}
