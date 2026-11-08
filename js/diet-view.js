import { DIET_FORMAT, DIET_VERSION, cleanDiet, setDiet, validateDiet } from "./diet.js";
import { fetchBuiltInDiet, fetchCurrentDiet, saveDiet } from "./diets.js";
import { localize, t } from "./i18n.js";
import { toIsoDate } from "./dates.js";

/** The clean diet in use, kept for the export. */
let current = null;

/** Start date of the diet in use, or null for the built-in diet. */
let validFrom = null;

/** Translation key of a problem met while reading the saved diet, shown next to the source. */
let loadProblem = "";

/** Called after the diet in use changes, so every view can be rebuilt. */
let dietListener = () => {};

/**
 * Shows a message next to the import and export buttons.
 * @param {string} key Translation key, or an empty string to clear the message.
 * @param {Record<string, string>} [params] Values for the message placeholders.
 */
function setStatus(key, params) {
  document.getElementById("diet-transfer-status").textContent = key ? t(key, params) : "";
}

/**
 * Makes a clean diet the one in use.
 * @param {ReturnType<typeof cleanDiet>} content The clean, valid diet.
 * @param {string | null} from Start date, or null for the built-in diet.
 */
function applyDiet(content, from) {
  current = content;
  validFrom = from;
  setDiet(content);
}

/**
 * Returns the clean diet in use.
 * @returns {ReturnType<typeof cleanDiet>} The diet.
 */
export function getCurrentDiet() {
  return current;
}

/**
 * Saves a clean, valid diet as valid from today and makes it the one in use.
 * @param {ReturnType<typeof cleanDiet>} content The diet.
 */
export async function saveAndApplyDiet(content) {
  const from = await saveDiet(content);
  loadProblem = "";
  applyDiet(content, from);
  renderDietSource();
  dietListener();
}

/** Renders which diet is in use. */
export function renderDietSource() {
  const name = current ? localize(current.name) : "";
  const source = validFrom
    ? t("dietData.saved", { name, date: new Date(`${validFrom}T00:00`).toLocaleDateString(document.documentElement.lang) })
    : t("dietData.builtIn", { name });
  document.getElementById("diet-source").textContent = [source, loadProblem ? t(loadProblem) : ""]
    .filter((part) => part !== "").join(" ");
}

/**
 * Loads the diet in use: the one saved in the database, or the built-in one when none is saved,
 * when it cannot be read, or when it is not usable. Called once before the first render.
 */
export async function loadDiet() {
  try {
    const saved = await fetchCurrentDiet();
    if (saved) {
      const content = cleanDiet(saved.content);
      if (validateDiet(content) === null) {
        applyDiet(content, saved.validFrom);
        return;
      }
      loadProblem = "dietData.savedInvalid";
    }
  } catch {
    loadProblem = "dietData.loadFailed";
  }
  applyDiet(cleanDiet(await fetchBuiltInDiet()), null);
}

/** Downloads the diet in use as a JSON file in the import format. */
function download() {
  const data = { format: DIET_FORMAT, version: DIET_VERSION, ...current };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `cadence-diet-${toIsoDate(new Date())}.json`;
  link.click();
  // Some mobile browsers start reading the file only after the click returns.
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/**
 * Saves a chosen diet file as the diet valid from today, after the user confirms it.
 * @param {HTMLInputElement} input The file input.
 */
async function upload(input) {
  const file = input.files[0];
  input.value = "";
  if (!file) {
    return;
  }

  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    setStatus("dietData.wrongFile");
    return;
  }
  if (data?.format !== DIET_FORMAT || data.version !== DIET_VERSION) {
    setStatus("dietData.wrongFile");
    return;
  }
  const content = cleanDiet(data);
  const problem = validateDiet(content);
  if (problem) {
    setStatus(problem);
    return;
  }

  const params = {
    name: localize(content.name),
    meals: String(content.meals.length),
    ingredients: String(content.ingredients.length),
  };
  if (!confirm(t("dietData.importConfirm", params))) {
    return;
  }

  setStatus("dietData.importing");
  try {
    await saveAndApplyDiet(content);
    setStatus("dietData.imported", params);
  } catch {
    setStatus("dietData.importFailed");
  }
}

/**
 * Connects the diet export and import buttons.
 * @param {function(): void} onChange Called after an imported diet becomes the one in use.
 */
export function initDietTransfer(onChange) {
  dietListener = onChange;
  const input = document.getElementById("diet-import-file");
  document.getElementById("diet-export").addEventListener("click", download);
  document.getElementById("diet-import").addEventListener("click", () => input.click());
  input.addEventListener("change", () => upload(input));
}
