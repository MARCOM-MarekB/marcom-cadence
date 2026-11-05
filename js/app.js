import { applyTranslations, initI18n, t, toggleLanguage } from "./i18n.js";
import {
  FASTS,
  HOURS_PER_WEEK,
  TRAININGS,
  getNextTraining,
  getPeriods,
  getStatus,
  weekPosition,
} from "./schedule.js";
import { getTheme, toggleTheme } from "./theme.js";

const REFRESH_INTERVAL_MS = 60_000;
const DEFAULT_VIEW = "today";

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
  return `${t("days")[dayIndex]} ${hours}:${String(minutes).padStart(2, "0")}`;
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

/** Draws the fasting and training parts of the week bar once. */
function renderBar() {
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
  kind.textContent = t(period.isFast ? "period.fast" : "period.eat");

  const when = document.createElement("span");
  when.className = "period-when";
  when.textContent = `${formatPosition(period.start)} → ${formatPosition(period.end)}`;

  const note = document.createElement("span");
  note.className = "period-note";
  const training = TRAININGS.find(
    (session) => !period.isFast && session.start >= period.start && session.end <= period.end,
  );
  note.textContent = training ? t("period.training", { time: formatPosition(training.start) }) : "";

  row.append(kind, when, note);
  return row;
}

/** Renders the translated day names and period list. */
function renderLabels() {
  document.getElementById("day-labels").replaceChildren(
    ...t("days").map((name) => {
      const label = document.createElement("span");
      label.textContent = name;
      return label;
    }),
  );
  document.getElementById("periods").replaceChildren(...getPeriods().map(createPeriodRow));
}

/** Updates the status panel and the current time marker. */
function renderNow() {
  const position = weekPosition(new Date());
  const status = getStatus(position);
  const training = getNextTraining(position);
  const duration = formatDuration(status.hoursToChange);

  document.getElementById("status").classList.toggle("is-fasting", status.isFasting);
  document.getElementById("status-state").textContent = t(status.isFasting ? "status.fasting" : "status.eating");
  document.getElementById("status-detail").textContent = t(status.isFasting ? "status.fastEnds" : "status.nextFast", { duration });
  document.getElementById("status-training").textContent = t("status.nextTraining", { time: formatPosition(training.start) });
  document.getElementById("now-marker").style.left = `${(position / HOURS_PER_WEEK) * 100}%`;
}

/** Updates the theme button to offer the other theme. */
function renderThemeToggle() {
  const isDark = getTheme() === "dark";
  const button = document.getElementById("theme-toggle");
  button.textContent = t(isDark ? "theme.toLight" : "theme.toDark");
  button.setAttribute("aria-label", t(isDark ? "theme.toLightLabel" : "theme.toDarkLabel"));
}

/** Renders everything that depends on the language. */
function renderTranslated() {
  applyTranslations();
  renderLabels();
  renderNow();
  renderThemeToggle();
}

/** Shows the view named in the address and marks its menu item. */
function showCurrentView() {
  const requested = location.hash.slice(1);
  const views = [...document.querySelectorAll("[data-view]")];
  const current = views.some((view) => view.dataset.view === requested) ? requested : DEFAULT_VIEW;

  for (const view of views) {
    view.hidden = view.dataset.view !== current;
  }
  for (const link of document.querySelectorAll("[data-view-link]")) {
    if (link.dataset.viewLink === current) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  }
}

await initI18n();
renderBar();
renderTranslated();
showCurrentView();

window.addEventListener("hashchange", showCurrentView);
document.getElementById("theme-toggle").addEventListener("click", () => {
  toggleTheme();
  renderThemeToggle();
});
document.getElementById("language-toggle").addEventListener("click", async () => {
  await toggleLanguage();
  renderTranslated();
});
setInterval(renderNow, REFRESH_INTERVAL_MS);
