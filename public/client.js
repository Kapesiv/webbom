const clientId = Number(window.location.pathname.split("/").pop());
const sessionStorageKey = `autonomous-client-session-${clientId}`;
let sessionId = window.localStorage.getItem(sessionStorageKey);

if (!sessionId) {
  sessionId = crypto.randomUUID();
  window.localStorage.setItem(sessionStorageKey, sessionId);
}

function setStatus(message) {
  const element = document.getElementById("public-status");
  element.textContent = message;
  element.classList.remove("is-error", "is-success");
}

function setStatusError(message) {
  const element = document.getElementById("public-status");
  element.textContent = message;
  element.classList.remove("is-success");
  element.classList.add("is-error");
}

function setStatusSuccess(message) {
  const element = document.getElementById("public-status");
  element.textContent = message;
  element.classList.remove("is-error");
  element.classList.add("is-success");
}

function renderMetaChips(client) {
  const chips = [];

  if (client.seo?.slug) {
    chips.push(`/${client.seo.slug}`);
  }

  if (client.seo?.keywords?.length) {
    chips.push(...client.seo.keywords.slice(0, 2));
  }

  if (!chips.length) {
    chips.push("Yhteydenotto", "Selkeä suunta", "Nopea alku");
  }

  document.getElementById("public-meta").innerHTML = chips
    .map((chip) => `<span>${chip}</span>`)
    .join("");
}

async function postJson(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

const bootstrap = await fetch(`/api/public/clients/${clientId}`).then((response) => response.json());

if (!bootstrap.client) {
  document.getElementById("public-title").textContent = "Sivua ei löytynyt";
  document.getElementById("public-subtitle").textContent = "Tämä sivu ei ole enää käytettävissä.";
  setStatusError("Tätä sivua ei ole enää olemassa.");
} else {
  document.title = bootstrap.client.seo?.title || bootstrap.client.businessName;
  document.getElementById("public-title").textContent = bootstrap.client.businessName;
  document.getElementById("public-subtitle").textContent =
    bootstrap.client.website?.subheadline || bootstrap.client.description;
  renderMetaChips(bootstrap.client);
  document.getElementById("public-site").innerHTML =
    bootstrap.client.website?.html || `<p>${bootstrap.client.description}</p>`;

  await postJson(`/api/public/clients/${clientId}/track`, {
    eventType: "page_view",
    sessionId,
    referrer: document.referrer,
    metadata: {
      path: window.location.pathname
    }
  });

  document.getElementById("public-site").addEventListener("click", async (event) => {
    const link = event.target.closest("a");
    if (!link) return;

    await postJson(`/api/public/clients/${clientId}/track`, {
      eventType: "cta_click",
      sessionId,
      referrer: document.referrer,
      metadata: {
        href: link.getAttribute("href") || "",
        text: link.textContent?.trim() || ""
      }
    });
  });

  document.getElementById("lead-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector("button[type='submit']");
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    setStatus("Lähetetään viestiä...");
    submitButton.disabled = true;
    try {
      await postJson(`/api/public/clients/${clientId}/lead`, {
        ...payload,
        sessionId,
        source: "public_page"
      });
      form.reset();
      setStatusSuccess("Viesti lähetetty.");
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Lähetys epäonnistui.");
    } finally {
      submitButton.disabled = false;
    }
  });
}
