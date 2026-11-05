// Runs before the page is drawn, so a saved theme does not flash the other one first.
try {
  const savedTheme = localStorage.getItem("cadence.theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    document.documentElement.dataset.theme = savedTheme;
  }
} catch {
  // Without storage the page follows the system theme.
}
