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
    login.hidden = false;
    document.getElementById("login-email").focus();
    await waitForSignIn();
    login.hidden = true;
  }
  app.hidden = false;
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
      resolve();
    });
  });
}

/** Connects the sign-out button and returns to the login form when the session ends. */
export function initSignOut() {
  document.getElementById("sign-out").addEventListener("click", () => supabase.auth.signOut());
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      location.reload();
    }
  });
}
