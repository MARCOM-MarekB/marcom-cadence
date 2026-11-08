const STORAGE_KEY = "cadence.language";
const SUPPORTED_LANGUAGES = ["en", "pl"];

/** Languages of the interface and of user texts stored in every language. */
export const LANGUAGES = SUPPORTED_LANGUAGES;

let language = "en";
let messages = {};

/**
 * Reads the saved language.
 * @returns {string | null} The saved language, or null when storage is unavailable or empty.
 */
function readStoredLanguage() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Saves the chosen language for later visits.
 * @param {string} value The language to save.
 */
function storeLanguage(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // The choice still applies until the page is closed.
  }
}

/**
 * Loads a language file and makes it the current language.
 * @param {string} value The language to load.
 */
async function loadLanguage(value) {
  const response = await fetch(new URL(`../i18n/${value}.json`, import.meta.url));
  messages = await response.json();
  language = value;
  document.documentElement.lang = value;
}

/** Loads the saved language, or the browser language when none is saved. */
export async function initI18n() {
  const stored = readStoredLanguage();
  const preferred = SUPPORTED_LANGUAGES.includes(stored)
    ? stored
    : navigator.language.toLowerCase().startsWith("pl") ? "pl" : "en";
  await loadLanguage(preferred);
}

/** Switches between the supported languages and saves the choice. */
export async function toggleLanguage() {
  const next = language === "en" ? "pl" : "en";
  await loadLanguage(next);
  storeLanguage(next);
}

/**
 * Returns a translated value.
 * @param {string} key Translation key.
 * @param {Record<string, string>} [params] Values for {name} placeholders.
 * @returns {*} The translation, or the key when it is missing.
 */
export function t(key, params = {}) {
  const message = messages[key] ?? key;
  if (typeof message !== "string") {
    return message;
  }
  return message.replace(/\{(\w+)\}/g, (placeholder, name) => params[name] ?? placeholder);
}

/**
 * Reads user text that is stored in every supported language, such as {"en": "Pull-up", "pl": "Podciąganie"}.
 * A plain string counts as the same text in every language.
 * @param {*} value The stored text.
 * @returns {Record<string, string>} The text for each supported language, empty where missing.
 */
export function toLocalized(value) {
  return Object.fromEntries(SUPPORTED_LANGUAGES.map((code) => [
    code,
    typeof value === "string" ? value : typeof value?.[code] === "string" ? value[code] : "",
  ]));
}

/**
 * Picks user text in the current language, or in another language when it is missing there.
 * @param {*} value Text stored as {"en": "...", "pl": "..."} or as a plain string.
 * @returns {string} The text to show.
 */
export function localize(value) {
  const texts = toLocalized(value);
  return texts[language] || SUPPORTED_LANGUAGES.map((code) => texts[code]).find((text) => text !== "") || "";
}

/**
 * Tells whether user text is empty in every language.
 * @param {Record<string, string>} texts The text for each language.
 * @returns {boolean} True when no language has text.
 */
export function isLocalizedEmpty(texts) {
  return SUPPORTED_LANGUAGES.every((code) => !texts[code]);
}

/** Translates every element marked with a data-i18n attribute. */
export function applyTranslations() {
  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const element of document.querySelectorAll("[data-i18n-aria-label]")) {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  }
}
