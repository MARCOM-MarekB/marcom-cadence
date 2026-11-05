import {
  DAY_NAMES,
  FASTS,
  HOURS_PER_WEEK,
  TRAININGS,
  getNextTraining,
  getPeriods,
  getStatus,
  weekPosition,
} from "./schedule.js";

const REFRESH_INTERVAL_MS = 60_000;

/**
 * Formats a week position as a day and time.
 * @param {number} position Hours since Monday 00:00.
 * @returns {string} A label such as "Mon 19:30".
 */
function formatPosition(position) {
  const dayIndex = Math.floor(position / 24);
  const hourOfDay = position - dayIndex * 24;
  const hours = Math.floor(hourOfDay);
  const minutes = Math.round((hourOfDay - hours) * 60);
  return `${DAY_NAMES[dayIndex]} ${hours}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Formats a duration in hours and minutes.
 * @param {number} hours Duration in hours.
 * @returns {string} A label such as "5 h 20 min".
 */
function formatDuration(hours) {
  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${wholeHours} h ${minutes} min`;
}

/**
 * Creates a bar element placed by week position.
 * @param {string} className Element class names.
 * @param {number} start Start position in hours.
 * @param {number} end End position in hours.
 * @returns {HTMLDivElement} The positioned element.
 */
function createBarPart(className, start, end) {
  const part = document.createElement("div");
  part.className = `bar-part ${className}`;
  part.style.left = `${(start / HOURS_PER_WEEK) * 100}%`;
  part.style.width = `${((end - start) / HOURS_PER_WEEK) * 100}%`;
  return part;
}

/** Renders the parts of the page that do not change during the week. */
function renderWeek() {
  const labels = document.getElementById("day-labels");
  labels.replaceChildren(
    ...DAY_NAMES.map((name) => {
      const label = document.createElement("span");
      label.textContent = name;
      return label;
    }),
  );

  const bar = document.getElementById("week-bar");
  for (const fast of FASTS) {
    if (fast.start < fast.end) {
      bar.append(createBarPart("bar-fast", fast.start, fast.end));
    } else {
      bar.append(createBarPart("bar-fast", fast.start, HOURS_PER_WEEK));
      bar.append(createBarPart("bar-fast", 0, fast.end));
    }
  }
  for (const training of TRAININGS) {
    bar.append(createBarPart("bar-training", training.start, training.end));
  }

  const nowMarker = document.createElement("div");
  nowMarker.id = "now-marker";
  nowMarker.className = "bar-part bar-now";
  bar.append(nowMarker);

  const periods = document.getElementById("periods");
  periods.replaceChildren(...getPeriods().map(createPeriodRow));
}

/**
 * Creates one row of the period list.
 * @param {{isFast: boolean, start: number, end: number}} period The period to show.
 * @returns {HTMLLIElement} The list row.
 */
function createPeriodRow(period) {
  const row = document.createElement("li");
  row.className = period.isFast ? "period is-fast" : "period";

  const kind = document.createElement("span");
  kind.className = "period-kind";
  kind.textContent = period.isFast ? "Fast" : "Eat";

  const when = document.createElement("span");
  when.className = "period-when";
  when.textContent = `${formatPosition(period.start)} → ${formatPosition(period.end)}`;

  const note = document.createElement("span");
  note.className = "period-note";
  const training = TRAININGS.find(
    (session) => !period.isFast && session.start >= period.start && session.end <= period.end,
  );
  note.textContent = training ? `Training ${formatPosition(training.start)}` : "";

  row.append(kind, when, note);
  return row;
}

/** Updates the status panel and the current time marker. */
function renderNow() {
  const position = weekPosition(new Date());
  const status = getStatus(position);
  const training = getNextTraining(position);

  document.getElementById("status").classList.toggle("is-fasting", status.isFasting);
  document.getElementById("status-state").textContent = status.isFasting ? "Fasting" : "Eating window";
  document.getElementById("status-detail").textContent = status.isFasting
    ? `Ends in ${formatDuration(status.hoursToChange)}`
    : `Next fast in ${formatDuration(status.hoursToChange)}`;
  document.getElementById("status-training").textContent =
    `Next training: ${formatPosition(training.start)}`;
  document.getElementById("now-marker").style.left = `${(position / HOURS_PER_WEEK) * 100}%`;
}

renderWeek();
renderNow();
setInterval(renderNow, REFRESH_INTERVAL_MS);
