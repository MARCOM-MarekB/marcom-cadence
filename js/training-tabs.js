const STORAGE_KEY = "cadence.trainingTab";
const DEFAULT_TAB = "timer";

/**
 * Reads the remembered tab of the Training view.
 * @returns {string | null} The tab name, or null when storage is unavailable or empty.
 */
function readTab() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Shows one tab of the Training view and remembers it.
 * @param {string} name Tab name, matching data-training-tab and data-training-panel.
 */
function showTab(name) {
  const panels = [...document.querySelectorAll("[data-training-panel]")];
  const current = panels.some((panel) => panel.dataset.trainingPanel === name) ? name : DEFAULT_TAB;

  for (const panel of panels) {
    panel.hidden = panel.dataset.trainingPanel !== current;
  }
  for (const button of document.querySelectorAll("[data-training-tab]")) {
    button.setAttribute("aria-pressed", String(button.dataset.trainingTab === current));
  }
  try {
    localStorage.setItem(STORAGE_KEY, current);
  } catch {
    // The tab still applies until the page is closed.
  }
}

/** Connects the tab buttons of the Training view and opens the remembered tab. */
export function initTrainingTabs() {
  for (const button of document.querySelectorAll("[data-training-tab]")) {
    button.addEventListener("click", () => showTab(button.dataset.trainingTab));
  }
  showTab(readTab() ?? DEFAULT_TAB);
}
