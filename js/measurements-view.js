import { t } from "./i18n.js";
import { MEASURES, addEntry, getSummary, loadEntries, removeEntry, storeEntries } from "./measurements.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const LABEL_LEFT_X = 4;
const LABEL_RIGHT_X = 356;
const LINE_LEFT_X = 62;
const LINE_RIGHT_X = 298;

/** Measuring points on the figure: x and y of the point, and the height of its label. */
const FIGURE_POINTS = {
  neck: { x: 190, y: 159, labelY: 130, side: "right" },
  chest: { x: 193, y: 184, labelY: 236, side: "left" },
  biceps: { x: 247, y: 205, labelY: 190, side: "right" },
  waist: { x: 188, y: 240, labelY: 250, side: "right" },
  hips: { x: 188, y: 272, labelY: 300, side: "left" },
  thigh: { x: 155, y: 360, labelY: 372, side: "left" },
  calf: { x: 240, y: 380, labelY: 396, side: "right" },
};

/**
 * Creates an HTML element with a class and optional text.
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
 * Creates an SVG element.
 * @param {string} tag Element name.
 * @param {Record<string, string | number>} attributes Element attributes.
 * @param {string} [text] Element text.
 * @returns {SVGElement} The new element.
 */
function createSvgElement(tag, attributes, text = "") {
  const element = document.createElementNS(SVG_NAMESPACE, tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }
  element.textContent = text;
  return element;
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
 * Formats a number with two digits.
 * @param {number} value The number.
 * @returns {string} The padded number.
 */
const pad = (value) => String(value).padStart(2, "0");

/** Moves the cursor to the field of a measurement. */
function focusField(key) {
  document.getElementById(`measure-${key}`).focus();
}

/**
 * Creates one measuring point with its line and label.
 * @param {string} key Measurement key.
 * @param {{x: number, y: number, labelY: number, side: string}} point Point position.
 * @param {string} unit Measurement unit.
 * @param {{latest: number} | null} summary The measurement summary.
 * @returns {SVGGElement} The point.
 */
function createFigurePoint(key, point, unit, summary) {
  const isLeft = point.side === "left";
  const textX = isLeft ? LABEL_LEFT_X : LABEL_RIGHT_X;
  const anchor = isLeft ? "start" : "end";
  const name = t(`measure.${key}`);
  const value = summary ? `${formatNumber(summary.latest)} ${unit}` : "-";

  const group = createSvgElement("g", { class: "figure-point", tabindex: 0, role: "button", "aria-label": `${name}: ${value}` });
  group.append(
    createSvgElement("path", {
      class: "figure-line",
      d: `M${point.x} ${point.y} L${isLeft ? LINE_LEFT_X : LINE_RIGHT_X} ${point.labelY - 4}`,
    }),
    createSvgElement("circle", { class: "figure-dot", cx: point.x, cy: point.y, r: 6 }),
    createSvgElement("text", { class: "figure-name", x: textX, y: point.labelY - 8, "text-anchor": anchor }, name),
    createSvgElement("text", { class: "figure-value", x: textX, y: point.labelY + 9, "text-anchor": anchor }, value),
  );
  group.addEventListener("click", () => focusField(key));
  group.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      focusField(key);
    }
  });
  return group;
}

/** Renders the measuring points on the figure. */
function renderFigure(entries) {
  const unitOf = (key) => MEASURES.find((measure) => measure.key === key).unit;
  document.getElementById("figure-points").replaceChildren(
    ...Object.entries(FIGURE_POINTS).map(([key, point]) =>
      createFigurePoint(key, point, unitOf(key), getSummary(entries, key))),
  );
}

/** Renders the form fields with the latest values as hints. */
function renderFields(entries) {
  document.getElementById("measure-fields").replaceChildren(...MEASURES.map((measure) => {
    const summary = getSummary(entries, measure.key);

    const input = document.createElement("input");
    input.id = `measure-${measure.key}`;
    input.type = "number";
    input.inputMode = "decimal";
    input.step = "0.1";
    input.min = "0";
    input.placeholder = summary ? formatNumber(summary.latest) : "";

    const label = createElement("label", "measure-field");
    label.htmlFor = input.id;
    label.append(createElement("span", "measure-name", `${t(`measure.${measure.key}`)} (${measure.unit})`), input);
    return label;
  }));
}

/** Renders each measurement's latest value and change since the first entry. */
function renderChanges(entries) {
  const rows = MEASURES.flatMap((measure) => {
    const summary = getSummary(entries, measure.key);
    if (!summary) {
      return [];
    }
    const change = summary.sinceStart;
    const row = createElement("li", "measure-change");
    row.append(
      createElement("span", "", t(`measure.${measure.key}`)),
      createElement("strong", "", `${formatNumber(summary.latest)} ${measure.unit}`),
      createElement("span", "measure-delta", `${change > 0 ? "+" : ""}${formatNumber(change)} ${measure.unit}`),
    );
    return [row];
  });
  document.getElementById("measure-changes").replaceChildren(...rows);
}

/** Renders saved entries, newest first. */
function renderHistory(entries) {
  const language = document.documentElement.lang;
  document.getElementById("measure-history").replaceChildren(...[...entries].reverse().map((entry) => {
    const values = MEASURES
      .filter((measure) => entry.values[measure.key] !== undefined)
      .map((measure) => `${t(`measure.${measure.key}`)} ${formatNumber(entry.values[measure.key])}`)
      .join(", ");

    const remove = createElement("button", "control", t("measurements.delete"));
    remove.type = "button";
    remove.addEventListener("click", () => {
      storeEntries(removeEntry(loadEntries(), entry));
      renderMeasurements();
    });

    const date = new Date(`${entry.date}T00:00`).toLocaleDateString(language);

    const row = createElement("li", "measure-entry");
    row.append(
      createElement("strong", "", entry.time ? `${date}, ${entry.time}` : date),
      createElement("span", "measure-values", values),
      remove,
    );
    return row;
  }));
}

/** Renders the whole Measurements view. */
export function renderMeasurements() {
  const entries = loadEntries();
  renderFigure(entries);
  renderFields(entries);
  renderChanges(entries);
  renderHistory(entries);
  document.getElementById("measure-empty").hidden = entries.length > 0;
}

/**
 * Saves the filled form fields for the chosen date.
 * @param {SubmitEvent} event The form submission.
 */
function saveForm(event) {
  event.preventDefault();

  const values = {};
  for (const { key } of MEASURES) {
    const input = document.getElementById(`measure-${key}`);
    if (input.value !== "") {
      values[key] = Number(input.value);
    }
  }

  const status = document.getElementById("measure-status");
  if (Object.keys(values).length === 0) {
    status.textContent = t("measurements.nothingToSave");
    return;
  }

  const date = document.getElementById("measure-date").value;
  const time = document.getElementById("measure-time").value;
  const saved = storeEntries(addEntry(loadEntries(), date, time, values));
  renderMeasurements();
  status.textContent = t(saved ? "measurements.saved" : "measurements.saveFailed");
}

/** Prepares the form. */
export function initMeasurements() {
  const now = new Date();
  document.getElementById("measure-date").value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  document.getElementById("measure-time").value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  document.getElementById("measure-form").addEventListener("submit", saveForm);
}
