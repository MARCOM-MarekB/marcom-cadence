import { ImportFormatError, exportTraining, importTraining, inspectTraining } from "./training-transfer.js";
import { t } from "./i18n.js";
import { toIsoDate } from "./dates.js";

/**
 * Shows a message next to the import and export buttons.
 * @param {string} key Translation key, or an empty string to clear the message.
 * @param {Record<string, string>} [params] Values for the message placeholders.
 */
function setStatus(key, params) {
  document.getElementById("training-transfer-status").textContent = key ? t(key, params) : "";
}

/** Downloads the whole training log as a JSON file. */
async function download() {
  setStatus("transfer.exporting");
  try {
    const data = await exportTraining();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cadence-training-${toIsoDate(new Date())}.json`;
    link.click();
    // Some mobile browsers start reading the file only after the click returns.
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    setStatus("");
  } catch {
    setStatus("transfer.exportFailed");
  }
}

/**
 * Imports a chosen JSON file after the user confirms what it holds.
 * @param {HTMLInputElement} input The file input.
 * @param {function(): Promise<void>} onImported Reloads the views after a successful import.
 */
async function upload(input, onImported) {
  const file = input.files[0];
  input.value = "";
  if (!file) {
    return;
  }

  let data;
  let counts;
  try {
    data = JSON.parse(await file.text());
    counts = inspectTraining(data);
  } catch (error) {
    setStatus(error instanceof ImportFormatError || error instanceof SyntaxError ? "transfer.wrongFile" : "transfer.importFailed");
    return;
  }

  const params = {
    exercises: String(counts.exercises),
    workouts: String(counts.workouts),
    schedules: String(counts.trainingSchedules),
  };
  if (!confirm(t("transfer.importConfirm", params))) {
    return;
  }

  setStatus("transfer.importing");
  try {
    await importTraining(data);
    await onImported();
    setStatus("transfer.imported", params);
  } catch {
    setStatus("transfer.importFailed");
  }
}

/**
 * Connects the training export and import buttons.
 * @param {function(): Promise<void>} onImported Reloads the views after a successful import.
 */
export function initTrainingTransfer(onImported) {
  const input = document.getElementById("training-import-file");
  document.getElementById("training-export").addEventListener("click", download);
  document.getElementById("training-import").addEventListener("click", () => input.click());
  input.addEventListener("change", () => upload(input, onImported));
}
