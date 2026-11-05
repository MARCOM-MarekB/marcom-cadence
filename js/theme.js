const STORAGE_KEY = "cadence.theme";

/**
 * Returns the theme currently shown.
 * @returns {"light" | "dark"} The chosen theme, or the system theme when none was chosen.
 */
export function getTheme() {
  const chosen = document.documentElement.dataset.theme;
  if (chosen) {
    return chosen;
  }
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Switches to the other theme and saves the choice. */
export function toggleTheme() {
  const next = getTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // The choice still applies until the page is closed.
  }
}
