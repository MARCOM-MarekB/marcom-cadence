const STORAGE_KEY = "cadence.language";
const SUPPORTED_LANGUAGES = ["en", "pl"];

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

/** Translates every element marked with a data-i18n attribute. */
export function applyTranslations() {
  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const element of document.querySelectorAll("[data-i18n-aria-label]")) {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  }
}
