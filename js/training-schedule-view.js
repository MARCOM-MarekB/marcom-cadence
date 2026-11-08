import { DEFAULT_SESSIONS, fetchCurrentSchedule, saveSchedule, toSessions } from "./training-schedule.js";
import { setTrainings } from "./schedule.js";
import { t } from "./i18n.js";

/** Session added by the add button. */
const NEW_SESSION = { day: 0, start: "18:00", durationMin: 120 };

/** Start date of the schedule in use, or null while the built-in schedule is used. */
let validFrom = null;

/** Sessions shown in the form before it is first rendered. */
let loadedSessions = DEFAULT_SESSIONS;

/** Called after the schedule in use changes, so the timelines and countdowns can be rebuilt. */
let scheduleListener = () => {};

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
  document.getElementById("schedule-status").textContent = key ? t(key) : "";
}

/**
 * Creates a labelled field.
 * @param {string} labelKey Translation key of the label.
 * @param {HTMLElement} control The input or select.
 * @returns {HTMLLabelElement} The field.
 */
function createField(labelKey, control) {
  const field = createElement("label", "set-field");
  field.append(createElement("span", "set-field-name", t(labelKey)), control);
  return field;
}

/**
 * Creates one editable session row.
 * @param {{day: number, start: string, durationMin: number}} session The session.
 * @returns {HTMLLIElement} The row.
 */
function createSessionRow(session) {
  const day = document.createElement("select");
  day.className = "schedule-day";
  t("daysLong").forEach((name, index) => day.append(new Option(name, String(index))));
  day.value = String(session.day);

  const start = document.createElement("input");
  start.className = "schedule-start";
  start.type = "time";
  start.required = true;
  start.value = session.start;

  const duration = document.createElement("input");
  duration.className = "schedule-duration";
  duration.type = "number";
  duration.inputMode = "numeric";
  duration.min = "1";
  duration.step = "5";
  duration.required = true;
  duration.value = String(session.durationMin);

  const remove = createElement("button", "control progression-remove", "×");
  remove.type = "button";
  remove.setAttribute("aria-label", t("schedule.remove"));

  const row = createElement("li", "set-row");
  remove.addEventListener("click", () => row.remove());
  row.append(
    createField("schedule.day", day),
    createField("schedule.start", start),
    createField("schedule.duration", duration),
    remove,
  );
  return row;
}

/**
 * Reads the sessions from the form.
 * @returns {Array<{day: number, start: string, durationMin: number}>} Valid sessions in week order.
 */
function readSessions() {
  return toSessions({
    sessions: [...document.querySelectorAll("#schedule-sessions .set-row")].map((row) => ({
      day: Number(row.querySelector(".schedule-day").value),
      start: row.querySelector(".schedule-start").value,
      durationMin: row.querySelector(".schedule-duration").valueAsNumber,
    })),
  });
}

/**
 * Shows sessions in the form.
 * @param {Array<{day: number, start: string, durationMin: number}>} sessions The sessions.
 */
function fillSessions(sessions) {
  document.getElementById("schedule-sessions").replaceChildren(...sessions.map(createSessionRow));
}

/** Renders the form again, keeping what is typed, for example after the language changed. */
export function renderTrainingSchedule() {
  const list = document.getElementById("schedule-sessions");
  fillSessions(list.children.length > 0 ? readSessions() : loadedSessions);
  document.getElementById("schedule-valid-from").textContent = validFrom
    ? t("schedule.validFrom", { date: new Date(`${validFrom}T00:00`).toLocaleDateString(document.documentElement.lang) })
    : t("schedule.default");
}

/**
 * Applies a schedule to the whole app and shows it in the form.
 * @param {Array<{day: number, start: string, durationMin: number}>} sessions The sessions.
 * @param {string | null} from Start date of the schedule, or null for the built-in one.
 */
function applySchedule(sessions, from) {
  loadedSessions = sessions;
  validFrom = from;
  setTrainings(sessions);
  fillSessions(sessions);
  renderTrainingSchedule();
  scheduleListener();
}

/** Reads the schedule in use from Supabase and applies it. Without a saved schedule the built-in one stays. */
export async function loadTrainingSchedule() {
  const schedule = await fetchCurrentSchedule();
  if (schedule) {
    applySchedule(schedule.sessions, schedule.validFrom);
  }
}

/**
 * Saves the form as the schedule valid from today.
 * @param {SubmitEvent} event The form submission.
 */
async function saveForm(event) {
  event.preventDefault();
  const sessions = readSessions();
  const save = document.getElementById("schedule-save");
  save.disabled = true;
  setStatus("schedule.saving");
  try {
    applySchedule(sessions, await saveSchedule(sessions));
    setStatus("schedule.saved");
  } catch {
    setStatus("schedule.saveFailed");
  } finally {
    save.disabled = false;
  }
}

/**
 * Applies the built-in schedule, connects the form and starts reading the saved schedule.
 * @param {function(): void} onChange Called after the schedule in use changes.
 */
export function initTrainingSchedule(onChange) {
  setTrainings(DEFAULT_SESSIONS);
  scheduleListener = onChange;
  document.getElementById("schedule-form").addEventListener("submit", saveForm);
  document.getElementById("schedule-add").addEventListener("click", () => {
    const row = createSessionRow(NEW_SESSION);
    document.getElementById("schedule-sessions").append(row);
    row.querySelector("select").focus();
  });
  loadTrainingSchedule().catch(() => setStatus("schedule.loadFailed"));
}
