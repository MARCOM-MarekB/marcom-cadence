import { t } from "./i18n.js";
import { supabase } from "./supabase.js";

/**
 * Shows the app when a login session exists, otherwise shows the login form
 * and waits until the user signs in.
 */
export async function ensureSignedIn() {
  const app = document.getElementById("app");
  const login = document.getElementById("login");
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    initPasswordToggle();
    login.hidden = false;
    document.getElementById("login-email").focus();
    await waitForSignIn();
    login.hidden = true;
  }
  app.hidden = false;
}

/** Connects the button that shows or hides the typed password. */
function initPasswordToggle() {
  const input = document.getElementById("login-password");
  const button = document.getElementById("login-password-toggle");

  const render = () => {
    const isShown = input.type === "text";
    button.setAttribute("aria-pressed", String(isShown));
    button.setAttribute("aria-label", t(isShown ? "login.hidePassword" : "login.showPassword"));
    button.querySelector(".password-icon-show").toggleAttribute("hidden", isShown);
    button.querySelector(".password-icon-hide").toggleAttribute("hidden", !isShown);
  };

  button.addEventListener("click", () => {
    input.type = input.type === "password" ? "text" : "password";
    render();
    input.focus();
  });
  render();
}

/**
 * Handles the login form until a sign-in succeeds.
 * @returns {Promise<void>} Resolves after a successful sign-in.
 */
function waitForSignIn() {
  const form = document.getElementById("login-form");
  const status = document.getElementById("login-status");
  const submit = document.getElementById("login-submit");

  return new Promise((resolve) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      submit.disabled = true;
      status.textContent = t("login.signingIn");

      const { error } = await supabase.auth.signInWithPassword({
        email: document.getElementById("login-email").value.trim(),
        password: document.getElementById("login-password").value,
      });

      submit.disabled = false;
      if (error) {
        status.textContent = t("login.failed");
        return;
      }
      status.textContent = "";
      form.reset();
      document.getElementById("login-password").type = "password";
      resolve();
    });
  });
}

/** Connects the sign-out button and returns to the login form when the session ends. */
export function initSignOut() {
  document.getElementById("sign-out").addEventListener("click", async () => {
    // A global sign-out ends the session on the server too. When that request fails, for example
    // because the phone was offline or the token expired while it slept, the session is still removed
    // from this browser, so the button always signs out.
    const { error } = await supabase.auth.signOut();
    if (error) {
      await supabase.auth.signOut({ scope: "local" });
    }
    location.reload();
  });
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      location.reload();
    }
  });
}
