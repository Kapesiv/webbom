import { clearAuthenticated, hasStoredAuth, markAuthenticated, redirectTo } from "./auth-state.js";

if (hasStoredAuth() && window.location.pathname === "/login") {
  redirectTo("/dashboard");
}

const statusBanner = document.getElementById("status-banner");

function getPostAuthPath(bootstrap) {
  const needsOnboarding = !bootstrap.user?.onboardingCompletedAt && !(bootstrap.clients || []).length;
  return needsOnboarding ? "/welcome" : "/dashboard";
}

function setStatus(message) {
  statusBanner.textContent = message;
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Request failed";
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function readForm(formElement) {
  return Object.fromEntries(new FormData(formElement).entries());
}

async function runAction(pendingMessage, action) {
  setStatus(pendingMessage);

  try {
    await action();
  } catch (error) {
    setStatus(getErrorMessage(error));
  }
}

async function refresh() {
  const bootstrap = await api("/api/bootstrap");

  if (bootstrap.authenticated) {
    markAuthenticated();
    redirectTo(getPostAuthPath(bootstrap));
    return;
  }

  clearAuthenticated();
  setStatus("");
}

document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  await runAction("Logging in...", async () => {
    await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(readForm(form))
    });
    const bootstrap = await api("/api/bootstrap");
    markAuthenticated();
    form.reset();
    redirectTo(getPostAuthPath(bootstrap));
  });
});

refresh().catch((error) => {
  setStatus(getErrorMessage(error));
});
