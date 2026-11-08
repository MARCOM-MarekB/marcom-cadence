import { InUseError, deleteExercise, fetchExercises, saveExercise } from "./exercises.js";
import { t } from "./i18n.js";

/** Exercise catalog as last read from Supabase. */
let exercises = [];

/** Exercise being edited, or null while adding a new one. */
let editedExercise = null;

/** Whether archived exercises are listed. */
let showArchived = false;

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
 * Shows a message under the form.
 * @param {string} key Translation key, or an empty string to clear the message.
 */
function setStatus(key) {
  document.getElementById("exercise-status").textContent = key ? t(key) : "";
}

/**
 * Creates one editable progression row.
 * @param {{id?: string, name: string}} progression The progression; without an id it is new.
 * @returns {HTMLLIElement} The row.
 */
function createProgressionRow(progression) {
  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 60;
  input.value = progression.name;
  input.placeholder = t("exercises.progressionPlaceholder");
  input.setAttribute("aria-label", t("exercises.progressionName"));

  const remove = createElement("button", "control progression-remove", "×");
  remove.type = "button";
  remove.setAttribute("aria-label", t("exercises.removeProgression"));
  remove.addEventListener("click", () => row.remove());

  const row = createElement("li", "progression-row");
  if (progression.id) {
    row.dataset.id = progression.id;
  }
  row.append(input, remove);
  return row;
}

/**
 * Fills the form with an exercise, or clears it for a new one.
 * @param {object | null} exercise The exercise to edit, or null for a new one.
 */
function fillForm(exercise) {
  editedExercise = exercise;
  const isEditing = exercise !== null;

  document.getElementById("exercise-form-title").textContent = t(isEditing ? "exercises.edit" : "exercises.new");
  document.getElementById("exercise-name").value = exercise?.name ?? "";
  document.getElementById("exercise-metric").value = exercise?.metric ?? "reps";
  document.getElementById("exercise-per-side").checked = exercise?.perSide ?? false;
  document.getElementById("exercise-notes").value = exercise?.notes ?? "";
  document.getElementById("exercise-archived").checked = exercise?.archived ?? false;
  document.getElementById("exercise-progressions").replaceChildren(
    ...(exercise?.progressions ?? []).filter((progression) => !progression.archived).map(createProgressionRow),
  );

  document.getElementById("exercise-archived-field").hidden = !isEditing;
  document.getElementById("exercise-cancel").hidden = !isEditing;
  document.getElementById("exercise-delete").hidden = !isEditing;
}

/**
 * Reads the progressions from the form. Progressions removed from the form are kept as archived.
 * @returns {Array<{id: string, name: string, archived: boolean}>} Progressions in form order, then archived ones.
 */
function readProgressions() {
  const shown = [...document.querySelectorAll("#exercise-progressions .progression-row")]
    .map((row) => ({ id: row.dataset.id ?? crypto.randomUUID(), name: row.querySelector("input").value.trim() }))
    .filter((progression) => progression.name !== "")
    .map((progression) => ({ ...progression, archived: false }));

  const shownIds = new Set(shown.map((progression) => progression.id));
  const archived = (editedExercise?.progressions ?? [])
    .filter((progression) => !shownIds.has(progression.id))
    .map((progression) => ({ ...progression, archived: true }));
  return [...shown, ...archived];
}

/**
 * Saves the form as a new or changed exercise.
 * @param {SubmitEvent} event The form submission.
 */
async function saveForm(event) {
  event.preventDefault();
  const save = document.getElementById("exercise-save");
  const exercise = {
    id: editedExercise?.id,
    name: document.getElementById("exercise-name").value.trim(),
    metric: document.getElementById("exercise-metric").value,
    perSide: document.getElementById("exercise-per-side").checked,
    notes: document.getElementById("exercise-notes").value.trim(),
    archived: editedExercise ? document.getElementById("exercise-archived").checked : false,
    progressions: readProgressions(),
  };
  if (exercise.name === "") {
    return;
  }

  save.disabled = true;
  setStatus("exercises.saving");
  try {
    await saveExercise(exercise);
    await loadExercises();
    fillForm(null);
    setStatus("exercises.saved");
  } catch {
    setStatus("exercises.saveFailed");
  } finally {
    save.disabled = false;
  }
}

/** Deletes the exercise being edited, when no workout uses it. */
async function deleteEdited() {
  if (!editedExercise || !confirm(t("exercises.deleteConfirm", { name: editedExercise.name }))) {
    return;
  }
  try {
    await deleteExercise(editedExercise.id);
    await loadExercises();
    fillForm(null);
    setStatus("");
  } catch (error) {
    setStatus(error instanceof InUseError ? "exercises.inUse" : "exercises.deleteFailed");
  }
}

/**
 * Describes an exercise in one line: how it is measured, per side and its progressions.
 * @param {object} exercise The exercise.
 * @returns {string} The description.
 */
function describe(exercise) {
  const progressions = exercise.progressions.filter((progression) => !progression.archived);
  return [
    t(`exercise.metric.${exercise.metric}`),
    exercise.perSide ? t("exercises.perSideShort") : "",
    progressions.map((progression) => progression.name).join(" → "),
    exercise.archived ? t("exercises.archivedShort") : "",
  ].filter((part) => part !== "").join(" · ");
}

/** Renders the exercise list from the catalog last read. */
export function renderExercises() {
  const visible = exercises.filter((exercise) => showArchived || !exercise.archived);
  document.getElementById("exercise-list").replaceChildren(...visible.map((exercise) => {
    const edit = createElement("button", "control", t("exercises.editButton"));
    edit.type = "button";
    edit.addEventListener("click", () => {
      fillForm(exercise);
      setStatus("");
      document.getElementById("exercise-name").focus();
    });

    const row = createElement("li", "measure-entry");
    row.classList.toggle("is-archived", exercise.archived);
    row.append(
      createElement("strong", "", exercise.name),
      createElement("span", "measure-values", describe(exercise)),
      edit,
    );
    return row;
  }));
  document.getElementById("exercise-empty").hidden = visible.length > 0;
  document.getElementById("exercise-form-title").textContent = t(editedExercise ? "exercises.edit" : "exercises.new");
}

/** Reads the catalog from Supabase and renders it. */
async function loadExercises() {
  exercises = await fetchExercises();
  renderExercises();
}

/** Prepares the form and starts reading the catalog. */
export function initExercises() {
  document.getElementById("exercise-form").addEventListener("submit", saveForm);
  document.getElementById("exercise-add-progression").addEventListener("click", () => {
    const row = createProgressionRow({ name: "" });
    document.getElementById("exercise-progressions").append(row);
    row.querySelector("input").focus();
  });
  document.getElementById("exercise-cancel").addEventListener("click", () => {
    fillForm(null);
    setStatus("");
  });
  document.getElementById("exercise-delete").addEventListener("click", deleteEdited);
  document.getElementById("exercise-show-archived").addEventListener("change", (event) => {
    showArchived = event.target.checked;
    renderExercises();
  });

  fillForm(null);
  loadExercises().catch(() => setStatus("exercises.loadFailed"));
}
