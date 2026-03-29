const statusBanner = document.getElementById("status-banner");

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
  try {
    await action();
  } catch (error) {
    setStatus(getErrorMessage(error));
  }
}

async function refresh() {
  const bootstrap = await api("/api/bootstrap");

  if (bootstrap.authenticated) {
    window.location.href = "/dashboard";
    return;
  }

  setStatus("");
}

document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  await runAction("", async () => {
    await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(readForm(form))
    });
    form.reset();
    window.location.href = "/dashboard";
  });
});

refresh().catch((error) => {
  setStatus(getErrorMessage(error));
});
