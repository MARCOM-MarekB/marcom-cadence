import { t } from "./i18n.js";
import {
  advanceTimer,
  createTimer,
  getRemainingSeconds,
  pauseTimer,
  resumeTimer,
  skipPhase,
  startTimer,
} from "./set-timer.js";

const STORAGE_KEY = "cadence.setTimer";
const TICK_MS = 200;
const WARNING_SECONDS = 3;
const DEFAULT_SETTINGS = { exercise: "", workSeconds: 0, restSeconds: 60, sets: 4 };

let timer = createTimer(DEFAULT_SETTINGS);
let tickId = null;
let audioContext = null;
let wakeLock = null;
let lastWarningSecond = null;

/**
 * Returns a form element.
 * @param {string} name The name after the `set-` prefix.
 * @returns {HTMLElement} The element.
 */
const element = (name) => document.getElementById(`set-${name}`);

/**
 * Reads saved settings.
 * @returns {{exercise: string, workSeconds: number, restSeconds: number, sets: number}} The settings.
 */
function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Reads settings from the form and saves them.
 * @returns {{exercise: string, workSeconds: number, restSeconds: number, sets: number}} The settings.
 */
function readSettings() {
  const settings = {
    exercise: element("exercise").value.trim(),
    workSeconds: Math.max(Number(element("work").value) || 0, 0),
    restSeconds: Math.max(Number(element("rest").value) || 0, 0),
    sets: Math.max(Math.round(Number(element("sets").value)) || 1, 1),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // The settings still apply to this session.
  }
  return settings;
}

/**
 * Plays a short tone.
 * @param {number} frequency Tone frequency in Hz.
 * @param {number} seconds Tone length in seconds.
 */
function beep(frequency, seconds) {
  if (!audioContext) {
    return;
  }
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.25;
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + seconds);
}

/** Signals a phase change with sound and, where supported, vibration. */
function signalPhaseChange() {
  beep(880, 0.35);
  navigator.vibrate?.(300);
}

/** Asks the device to keep the screen on, which also keeps the countdown running. */
async function keepScreenOn() {
  try {
    wakeLock = await navigator.wakeLock?.request("screen");
  } catch {
    wakeLock = null;
  }
}

/** Lets the screen turn off again. */
function releaseScreen() {
  wakeLock?.release();
  wakeLock = null;
}

/** Stops the regular update. */
function stopTicking() {
  clearInterval(tickId);
  tickId = null;
}

/** Applies due phase changes, signals them and updates the panel. */
function tick() {
  const now = Date.now();
  const next = advanceTimer(timer, now);
  const changed = next.phase !== timer.phase || next.set !== timer.set;
  timer = next;

  if (changed) {
    signalPhaseChange();
  }
  const remaining = getRemainingSeconds(timer, now);
  if (remaining !== null && remaining <= WARNING_SECONDS && remaining !== lastWarningSecond && timer.endsAt !== null) {
    beep(440, 0.12);
  }
  lastWarningSecond = remaining;

  if (timer.phase === "done") {
    stopTicking();
    releaseScreen();
  }
  renderSetTimer();
}

/** Starts regular updates. */
function startTicking() {
  stopTicking();
  tickId = setInterval(tick, TICK_MS);
}

/**
 * Formats seconds as a countdown.
 * @param {number} seconds Whole seconds.
 * @returns {string} A label such as "1:05".
 */
function formatSeconds(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Renders the timer panel and shows the buttons that apply now. */
export function renderSetTimer() {
  const now = Date.now();
  const { phase, config, remainingMs } = timer;
  const isPaused = remainingMs !== null;
  const isActive = phase === "work" || phase === "rest";
  const remaining = getRemainingSeconds(timer, now);

  element("panel").className = `set-panel is-${phase}`;
  element("name").textContent = config.exercise;
  element("phase").textContent = t(isPaused ? "setTimer.phase.paused" : `setTimer.phase.${phase}`);
  element("time").textContent = remaining === null ? "" : formatSeconds(remaining);
  element("time").hidden = remaining === null;
  element("count").textContent = t("setTimer.count", { set: String(timer.set), sets: String(config.sets) });
  element("settings").hidden = phase !== "idle";

  element("pause").hidden = !isActive || (remaining === null);
  element("pause").textContent = t(isPaused ? "setTimer.resume" : "setTimer.pause");
  element("complete").hidden = phase !== "work";
  element("skip").hidden = phase !== "rest";
  element("reset").hidden = phase === "idle";
}

/**
 * Handles the Start button.
 * @param {SubmitEvent} event The form submission.
 */
function start(event) {
  event.preventDefault();
  audioContext ??= new AudioContext();
  audioContext.resume();

  timer = startTimer(createTimer(readSettings()), Date.now());
  lastWarningSecond = null;
  signalPhaseChange();
  keepScreenOn();
  startTicking();
  renderSetTimer();
}

/** Pauses or resumes the countdown. */
function togglePause() {
  const now = Date.now();
  timer = timer.remainingMs === null ? pauseTimer(timer, now) : resumeTimer(timer, now);
  renderSetTimer();
}

/** Ends the current set or rest. */
function skip() {
  timer = skipPhase(timer, Date.now());
  lastWarningSecond = null;
  if (timer.phase === "done") {
    stopTicking();
    releaseScreen();
  }
  signalPhaseChange();
  renderSetTimer();
}

/** Stops the timer and returns to the settings. */
function reset() {
  stopTicking();
  releaseScreen();
  timer = createTimer(readSettings());
  renderSetTimer();
}

/** Prepares the form and buttons. */
export function initSetTimer() {
  const settings = loadSettings();
  element("exercise").value = settings.exercise;
  element("work").value = String(settings.workSeconds);
  element("rest").value = String(settings.restSeconds);
  element("sets").value = String(settings.sets);
  timer = createTimer(settings);

  element("settings").addEventListener("submit", start);
  element("pause").addEventListener("click", togglePause);
  element("complete").addEventListener("click", skip);
  element("skip").addEventListener("click", skip);
  element("reset").addEventListener("click", reset);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && tickId !== null) {
      keepScreenOn();
    }
  });
}
