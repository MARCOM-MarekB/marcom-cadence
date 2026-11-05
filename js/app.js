import {
  CATEGORIES,
  DIET_DAYS,
  INGREDIENTS,
  MEALS,
  getDayTotals,
  getNextMeal,
  getShoppingList,
  getWeekTotals,
} from "./diet.js";
import { applyTranslations, initI18n, t, toggleLanguage } from "./i18n.js";
import { initMeasurements, renderMeasurements } from "./measurements-view.js";
import {
  FASTS,
  HOURS_PER_WEEK,
  TRAININGS,
  getNextTraining,
  getPeriods,
  getStatus,
  hoursUntil,
  weekPosition,
} from "./schedule.js";
import { getTheme, toggleTheme } from "./theme.js";

const REFRESH_INTERVAL_MS = 1000;
const DEFAULT_VIEW = "today";
const SHOPPING_DAY_OPTIONS = [1, 2, 3, 5, 7, 14];
const COPY_MESSAGE_MS = 2000;
const SHOW_ALL_HOURS_KEY = "cadence.showAllHours";

/** Number of days selected for the shopping list. */
let shoppingDays = 3;

/** Whether empty hours are listed one by one instead of being collapsed. */
let showAllHours = readShowAllHours();

/** Day shown in the Diet view, where 0 is Monday. */
let selectedDietDay = Math.floor(weekPosition(new Date()) / 24);

/** Day shown in the Today view; rebuilt only when it changes, so open recipes stay open. */
let renderedTodayIndex = null;

/**
 * Reads the saved hour display choice.
 * @returns {boolean} True when all hours should be shown.
 */
function readShowAllHours() {
  try {
    return localStorage.getItem(SHOW_ALL_HOURS_KEY) === "true";
  } catch {
    return false;
  }
}

/** Switches between all hours and hours with entries, and saves the choice. */
function toggleAllHours() {
  showAllHours = !showAllHours;
  try {
    localStorage.setItem(SHOW_ALL_HOURS_KEY, String(showAllHours));
  } catch {
    // The choice still applies until the page is closed.
  }
  renderDietDay();
  renderPeriods();
  renderedTodayIndex = null;
  renderHoursToggles();
  renderNow();
}

/** Updates the hour display buttons to offer the other mode. */
function renderHoursToggles() {
  for (const button of document.querySelectorAll("[data-hours-toggle]")) {
    button.textContent = t(showAllHours ? "hours.showEntries" : "hours.showAll");
  }
}

/**
 * Formats an hour of the day.
 * @param {number} hourOfDay Hour, which may include a fraction.
 * @returns {string} A label such as "19:30".
 */
function formatClock(hourOfDay) {
  const totalMinutes = Math.floor(hourOfDay * 60 + 1e-6);
  return `${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2, "0")}`;
}

/**
 * Formats an ingredient amount, using kg and l for large values.
 * @param {string} id Ingredient key.
 * @param {number} amount Amount in the ingredient's unit.
 * @returns {string} A label such as "1,2 kg" or "6 szt.".
 */
function formatAmount(id, amount) {
  const { unit } = INGREDIENTS[id];
  const language = document.documentElement.lang;

  if (unit === "pcs") {
    return `${amount} ${t("unit.pcs")}`;
  }
  if (unit === "rolls") {
    const forms = t("unit.rolls");
    const form = forms[new Intl.PluralRules(language).select(amount)] ?? forms.other;
    return `${amount.toLocaleString(language)} ${form}`;
  }
  if (amount >= 1000) {
    const largeUnit = unit === "g" ? "kg" : "l";
    return `${(amount / 1000).toLocaleString(language, { maximumFractionDigits: 2 })} ${largeUnit}`;
  }
  return `${amount} ${unit}`;
}

/**
 * Formats a week position as a day and time.
 * @param {number} position Hours since Monday 00:00.
 * @returns {string} A label such as "Mon 19:30".
 */
function formatPosition(position) {
  const dayIndex = Math.floor(position / 24);
  return `${t("days")[dayIndex]} ${formatClock(position - dayIndex * 24)}`;
}

/**
 * Formats a countdown.
 * @param {number} hours Remaining time in hours.
 * @returns {string} A label such as "05:20:09".
 */
function formatCountdown(hours) {
  const totalSeconds = Math.round(hours * 3600);
  const parts = [Math.floor(totalSeconds / 3600), Math.floor(totalSeconds / 60) % 60, totalSeconds % 60];
  return parts.map((part) => String(part).padStart(2, "0")).join(":");
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
 * Creates the bar showing fasting periods and trainings for the whole week.
 * @returns {HTMLDivElement} The bar without the current time marker.
 */
function createBar() {
  const bar = createElement("div", "bar");
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
  for (let midnight = 24; midnight < HOURS_PER_WEEK; midnight += 24) {
    bar.append(createBarPart("bar-day-line", midnight, midnight));
  }
  return bar;
}

/**
 * Creates one legend entry.
 * @param {string} swatchClass Class of the colour sample.
 * @param {string} labelKey Translation key of the label.
 * @returns {HTMLSpanElement} The legend entry.
 */
function createLegendEntry(swatchClass, labelKey) {
  const entry = createElement("span", "");
  entry.append(createElement("i", `swatch ${swatchClass}`), t(labelKey));
  return entry;
}

/**
 * Creates the whole week timeline: day names, bar, current time marker and legend.
 * @returns {HTMLDivElement} The timeline.
 */
function createWeekTimeline() {
  const labels = createElement("div", "day-labels");
  labels.append(...t("days").map((name) => createElement("span", "", name)));

  const track = createElement("div", "bar-track");
  track.append(
    createElement("span", "now-label", t("now")),
    createBar(),
    createElement("div", "now-line"),
  );

  const legend = createElement("div", "legend");
  legend.append(
    createLegendEntry("swatch-fast", "legend.fast"),
    createLegendEntry("swatch-eat", "legend.eat"),
    createLegendEntry("swatch-training", "legend.training"),
  );

  const timeline = createElement("div", "week");
  timeline.setAttribute("aria-hidden", "true");
  timeline.append(labels, track, legend);
  return timeline;
}

/**
 * Formats energy and macronutrient values.
 * @param {{kcal: number, protein: number, carbs: number, fat: number}} values The values to show.
 * @returns {string} The translated summary.
 */
function formatMacros(values) {
  return t("diet.macros", {
    kcal: String(values.kcal),
    protein: String(values.protein),
    carbs: String(values.carbs),
    fat: String(values.fat),
  });
}

/**
 * Creates a titled recipe section with one list.
 * @param {string} titleKey Translation key of the title.
 * @param {string} listTag List element name.
 * @param {string[]} items List entries.
 * @returns {HTMLElement} The section.
 */
function createRecipeSection(titleKey, listTag, items) {
  const list = createElement(listTag, "recipe-list");
  list.append(...items.map((text) => createElement("li", "", text)));

  const section = createElement("section", "recipe-section");
  section.append(createElement("h4", "", t(titleKey)), list);
  return section;
}

/**
 * Creates one event inside an hour row. Events that do not start on the full hour show their exact time.
 * @param {number} time Hour of the day, which may include a fraction.
 * @param {string} className Event class names.
 * @param {...(Node | string)} content Event content.
 * @returns {HTMLDivElement} The event.
 */
function createAgendaEvent(time, className, ...content) {
  const body = createElement("div", "agenda-body");
  body.append(...content);

  const event = createElement("div", `agenda-event ${className}`);
  if (time % 1 !== 0) {
    event.append(createElement("span", "agenda-minutes", formatClock(time)));
  }
  event.append(body);
  return event;
}

/**
 * Creates one meal with an expandable recipe.
 * @param {{time: number, key: string, sweet?: boolean}} meal The planned meal.
 * @param {number} dayIndex Day of the week, where 0 is Monday.
 * @returns {HTMLDivElement} The agenda event.
 */
function createMealItem(meal, dayIndex) {
  const values = MEALS[meal.key];
  const recipe = t("recipes")[meal.key];
  const ingredients = Object.entries(values.ingredients)
    .map(([id, amount]) => `${t(`ingredient.${id}`)}: ${formatAmount(id, amount)}`);

  const summary = document.createElement("summary");
  summary.append(
    createElement("span", "meal-name", t(`meal.${meal.key}`)),
    createElement("span", "meal-kcal", t("diet.mealKcal", { kcal: String(values.kcal) })),
  );

  const details = createElement("details", "meal-details");
  details.append(
    summary,
    createElement("p", "meal-macros", formatMacros(values)),
    createRecipeSection("diet.ingredients", "ul", recipe.seasoning ? [...ingredients, recipe.seasoning] : ingredients),
    createRecipeSection("diet.steps", "ol", recipe.steps),
  );

  const content = meal.sweet ? [details, createElement("span", "meal-sweet", t("diet.sweet"))] : [details];
  const item = createAgendaEvent(meal.time, "meal-item", ...content);
  item.dataset.position = String(dayIndex * 24 + meal.time);
  return item;
}

/**
 * Creates one day as a list of 24 hour rows, with meals, trainings, and fast starts and ends in their hours.
 * @param {number} dayIndex Day of the week, where 0 is Monday.
 * @param {number} [fromHour] First hour to show.
 * @param {number} [toHour] Last hour to show.
 * @returns {HTMLOListElement} The hour list.
 */
function createAgenda(dayIndex, fromHour = 0, toHour = 23) {
  const dayStart = dayIndex * 24;
  const isToday = (position) => position >= dayStart && position < dayStart + 24;

  const events = [
    ...FASTS.filter((fast) => isToday(fast.end)).map((fast) => ({
      time: fast.end - dayStart,
      order: 0,
      create: () => createAgendaEvent(fast.end - dayStart, "agenda-fast", t("agenda.fastEnd")),
    })),
    ...DIET_DAYS[dayIndex].meals.map((meal) => ({
      time: meal.time,
      order: 1,
      create: () => createMealItem(meal, dayIndex),
    })),
    ...TRAININGS.filter((training) => isToday(training.start)).map((training) => ({
      time: training.start - dayStart,
      order: 1,
      create: () => createAgendaEvent(
        training.start - dayStart,
        "agenda-training",
        t("agenda.training", { end: formatClock(training.end - dayStart) }),
      ),
    })),
    ...FASTS.filter((fast) => isToday(fast.start)).map((fast) => ({
      time: fast.start - dayStart,
      order: 2,
      create: () => createAgendaEvent(fast.start - dayStart, "agenda-fast", t("agenda.fastStart")),
    })),
  ].sort((a, b) => a.time - b.time || a.order - b.order);

  const hourDetails = Array.from({ length: 24 }, (_, hour) => {
    const position = dayStart + hour;
    const isTraining = TRAININGS.some((training) => training.start < position + 1 && training.end > position);
    const hourEvents = events.filter((event) => Math.floor(event.time) === hour);
    return {
      isTraining,
      hourEvents,
      isFast: getStatus(position + 0.5).isFasting,
      isEmpty: !isTraining && hourEvents.length === 0,
    };
  });

  const hours = createElement("ol", "hours");
  for (let hour = fromHour; hour <= toHour; hour += 1) {
    const details = hourDetails[hour];
    let lastHour = hour;
    while (
      !showAllHours
      && details.isEmpty
      && lastHour < toHour
      && hourDetails[lastHour + 1].isEmpty
      && hourDetails[lastHour + 1].isFast === details.isFast
    ) {
      lastHour += 1;
    }
    hours.append(createHourRow(dayStart, hour, lastHour, details));
    hour = lastHour;
  }
  return hours;
}

/**
 * Creates one hour row, or one shortened row for several empty hours.
 * @param {number} dayStart Week position of the start of the day.
 * @param {number} firstHour First hour of the row.
 * @param {number} lastHour Last hour of the row.
 * @param {{isFast: boolean, isTraining: boolean, hourEvents: Array<{create: function(): HTMLElement}>}} details Hour content.
 * @returns {HTMLLIElement} The row.
 */
function createHourRow(dayStart, firstHour, lastHour, details) {
  const isGap = lastHour > firstHour;

  const row = createElement("li", isGap ? "hour-row hour-gap" : "hour-row");
  row.dataset.firstPosition = String(dayStart + firstHour);
  row.dataset.lastPosition = String(dayStart + lastHour);
  row.classList.toggle("is-fast", details.isFast);
  row.classList.toggle("is-training", details.isTraining);

  const content = createElement("div", "hour-events");
  if (isGap) {
    content.textContent = `${firstHour}-${lastHour}`;
  } else {
    content.append(...details.hourEvents.map((event) => event.create()));
  }

  row.append(createElement("span", "hour-label", isGap ? "⋮" : String(firstHour)), content);
  return row;
}

/** Renders the day buttons of the Diet view and the selected day. */
function renderDietDay() {
  const picker = document.getElementById("diet-day-picker");
  picker.replaceChildren(...t("days").map((name, index) => {
    const button = createElement("button", "control", name);
    button.type = "button";
    button.setAttribute("aria-pressed", String(index === selectedDietDay));
    button.addEventListener("click", () => {
      selectedDietDay = index;
      renderDietDay();
    });
    return button;
  }));
  document.getElementById("diet-days").replaceChildren(createDietDay(selectedDietDay));
}

/**
 * Creates the meal plan card for one day.
 * @param {number} dayIndex Day of the week, where 0 is Monday.
 * @returns {HTMLElement} The day card.
 */
function createDietDay(dayIndex) {
  const day = DIET_DAYS[dayIndex];

  const head = createElement("div", "diet-day-head");
  head.append(
    createElement("h3", "", t("daysLong")[dayIndex]),
    createElement("span", "diet-day-kcal", formatMacros(getDayTotals(day))),
  );

  const card = createElement("article", "diet-day");
  card.append(head, createAgenda(dayIndex));
  return card;
}

/**
 * Creates one row of the period list.
 * @param {{isFast: boolean, start: number, end: number}} period The period to show.
 * @returns {HTMLLIElement} The list row.
 */
function createPeriodRow(period) {
  const row = createElement(period.isFast ? "div" : "summary", period.isFast ? "period is-fast" : "period period-summary");

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

  const item = createElement("li", "period-item");
  if (period.isFast) {
    item.append(row);
    return item;
  }

  row.append(createElement("span", "period-chevron", "▸"));
  const details = createElement("details", "period-details");
  details.append(row, createPeriodHours(period));
  item.append(details);
  return item;
}

/**
 * Creates the hour calendar of an eating period, one section for each day it touches.
 * The last hour is included, because the last meal is eaten when the next fast starts.
 * @param {{start: number, end: number}} period The eating period.
 * @returns {HTMLDivElement} The calendar.
 */
function createPeriodHours(period) {
  const firstDay = Math.floor(period.start / 24);
  const end = period.start + hoursUntil(period.start, period.end);
  const calendar = createElement("div", "period-hours");

  for (let day = firstDay; day * 24 < end; day += 1) {
    const dayIndex = day % 7;
    const fromHour = Math.max(Math.floor(period.start - day * 24), 0);
    const toHour = Math.min(Math.floor(end - day * 24), 23);
    calendar.append(
      createElement("h3", "period-day", t("daysLong")[dayIndex]),
      createAgenda(dayIndex, fromHour, toHour),
    );
  }
  return calendar;
}

/** Renders the fasting and eating periods of the week. */
function renderPeriods() {
  document.getElementById("periods").replaceChildren(...getPeriods().map(createPeriodRow));
}

/** Renders the day buttons of the shopping list. */
function renderShoppingOptions() {
  const options = document.getElementById("shopping-days");
  options.replaceChildren(...SHOPPING_DAY_OPTIONS.map((days) => {
    const label = days === 1 ? t("shopping.oneDayOption") : t("shopping.daysOption", { days: String(days) });
    const button = createElement("button", "control", label);
    button.type = "button";
    button.setAttribute("aria-pressed", String(days === shoppingDays));
    button.addEventListener("click", () => {
      shoppingDays = days;
      renderShoppingOptions();
      renderShoppingList();
    });
    return button;
  }));
}

/**
 * Groups shopping list amounts by category.
 * @param {Record<string, number>} amounts Total amount of each ingredient.
 * @returns {Array<{category: string, items: Array<{name: string, amount: string}>}>} Categories that have items.
 */
function groupShoppingItems(amounts) {
  return CATEGORIES
    .map((category) => ({
      category,
      items: Object.keys(INGREDIENTS)
        .filter((id) => INGREDIENTS[id].category === category && amounts[id])
        .map((id) => ({ name: t(`ingredient.${id}`), amount: formatAmount(id, amounts[id]) })),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * Creates one tickable shopping list row.
 * @param {{name: string, amount: string}} item The product and its amount.
 * @returns {HTMLLIElement} The list row.
 */
function createShoppingItem(item) {
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";

  const label = createElement("label", "shopping-item");
  label.append(
    checkbox,
    createElement("span", "shopping-name", item.name),
    createElement("span", "shopping-amount", item.amount),
  );

  const row = document.createElement("li");
  row.append(label);
  return row;
}

/** Renders the shopping list for the selected number of days, starting now. */
function renderShoppingList() {
  const position = weekPosition(new Date());
  const { mealCount, amounts } = getShoppingList(position, shoppingDays);
  const groups = groupShoppingItems(amounts);

  document.getElementById("shopping-summary").textContent = t("shopping.summary", {
    from: formatPosition(position),
    to: formatPosition((position + shoppingDays * 24) % HOURS_PER_WEEK),
    meals: String(mealCount),
  });

  document.getElementById("shopping-list").replaceChildren(...groups.map((group) => {
    const list = createElement("ul", "shopping-items");
    list.append(...group.items.map(createShoppingItem));

    const section = createElement("section", "shopping-group");
    section.append(createElement("h3", "", t(`category.${group.category}`)), list);
    return section;
  }));
}

/**
 * Ticks or unticks every item on the shopping list.
 * @param {boolean} checked The new state.
 */
function setAllShoppingItems(checked) {
  for (const checkbox of document.querySelectorAll("#shopping-list input[type='checkbox']")) {
    checkbox.checked = checked;
  }
}

/** Copies the shopping list as plain text. */
async function copyShoppingList() {
  const { amounts } = getShoppingList(weekPosition(new Date()), shoppingDays);
  const text = groupShoppingItems(amounts)
    .map((group) => [
      t(`category.${group.category}`),
      ...group.items.map((item) => `- ${item.name}: ${item.amount}`),
    ].join("\n"))
    .join("\n\n");

  const button = document.getElementById("shopping-copy");
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = t("shopping.copied");
  } catch {
    button.textContent = t("shopping.copyFailed");
  }
  setTimeout(() => { button.textContent = t("shopping.copy"); }, COPY_MESSAGE_MS);
}

/** Renders the timelines, period list and weekly meal plan. */
function renderContent() {
  for (const container of document.querySelectorAll("[data-week-bar]")) {
    container.replaceChildren(createWeekTimeline());
  }
  renderPeriods();
  renderDietDay();
  document.getElementById("diet-week-total").textContent = t("diet.weekTotal", { macros: formatMacros(getWeekTotals()) });
  renderedTodayIndex = null;
}

/**
 * Marks the current day and time on the timelines and in the meal plan.
 * @param {number} position Hours since Monday 00:00.
 * @param {number} nextMealPosition Week position of the next meal.
 */
function renderNowMarkers(position, nextMealPosition) {
  const dayIndex = Math.floor(position / 24);
  const percent = (position / HOURS_PER_WEEK) * 100;

  for (const line of document.querySelectorAll(".now-line")) {
    line.style.left = `${percent}%`;
  }
  for (const label of document.querySelectorAll(".now-label")) {
    label.style.left = `clamp(24px, ${percent}%, calc(100% - 24px))`;
  }
  for (const labels of document.querySelectorAll(".day-labels")) {
    [...labels.children].forEach((label, index) => label.classList.toggle("is-today", index === dayIndex));
  }
  if (dayIndex !== renderedTodayIndex) {
    document.getElementById("today-meals").replaceChildren(createDietDay(dayIndex));
    renderedTodayIndex = dayIndex;
  }
  for (const item of document.querySelectorAll("#today-meals .meal-item")) {
    const mealPosition = Number(item.dataset.position);
    item.classList.toggle("is-past", mealPosition <= position);
    item.classList.toggle("is-next", mealPosition === nextMealPosition);
  }
  for (const row of document.querySelectorAll(".hour-row")) {
    const currentHour = Math.floor(position);
    row.classList.toggle(
      "is-now",
      currentHour >= Number(row.dataset.firstPosition) && currentHour <= Number(row.dataset.lastPosition),
    );
  }
}

/**
 * Updates one countdown card.
 * @param {string} id Countdown name used in the element ids.
 * @param {string} labelKey Translation key of the label.
 * @param {number} hours Remaining time in hours.
 * @param {string} detail Text under the countdown.
 */
function renderTimer(id, labelKey, hours, detail) {
  document.getElementById(`timer-${id}-label`).textContent = t(labelKey);
  document.getElementById(`timer-${id}`).textContent = formatCountdown(hours);
  document.getElementById(`timer-${id}-detail`).textContent = detail;
}

/** Updates the status panel, countdowns and current time markers. */
function renderNow() {
  const position = weekPosition(new Date());
  const status = getStatus(position);
  const training = getNextTraining(position);
  const nextMeal = getNextMeal(position);

  document.getElementById("status").classList.toggle("is-fasting", status.isFasting);
  document.getElementById("status-state").textContent = t(status.isFasting ? "status.fasting" : "status.eating");
  document.getElementById("status-progress").style.width = `${status.progress * 100}%`;

  renderTimer(
    "fast",
    status.isFasting ? "timer.fastEnds" : "timer.nextFast",
    status.hoursToChange,
    formatPosition(status.changeAt),
  );
  renderTimer(
    "meal",
    "timer.nextMeal",
    hoursUntil(position, nextMeal.position),
    `${formatPosition(nextMeal.position)}: ${t(`meal.${nextMeal.key}`)}`,
  );
  renderTimer(
    "training",
    "timer.nextTraining",
    hoursUntil(position, training.start),
    formatPosition(training.start),
  );
  renderNowMarkers(position, nextMeal.position);
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
  renderContent();
  renderShoppingOptions();
  renderShoppingList();
  renderHoursToggles();
  renderMeasurements();
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
  if (current === "shopping") {
    renderShoppingList();
  }
}

await initI18n();
initMeasurements();
renderTranslated();
showCurrentView();

window.addEventListener("hashchange", showCurrentView);
document.getElementById("theme-toggle").addEventListener("click", () => {
  toggleTheme();
  renderThemeToggle();
});
document.getElementById("shopping-copy").addEventListener("click", copyShoppingList);
document.getElementById("shopping-check-all").addEventListener("click", () => setAllShoppingItems(true));
document.getElementById("shopping-uncheck-all").addEventListener("click", () => setAllShoppingItems(false));
document.getElementById("shopping-print").addEventListener("click", () => window.print());
for (const button of document.querySelectorAll("[data-hours-toggle]")) {
  button.addEventListener("click", toggleAllHours);
}
document.getElementById("language-toggle").addEventListener("click", async () => {
  await toggleLanguage();
  renderTranslated();
});
setInterval(renderNow, REFRESH_INTERVAL_MS);
