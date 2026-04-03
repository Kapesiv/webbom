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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMetric(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value ?? "");
  return new Intl.NumberFormat("fi-FI").format(numeric);
}

function createSparkBars(values) {
  return `
    <div class="public-sparkbars" aria-hidden="true">
      ${values
        .map((value) => `<span style="height:${Math.max(24, value)}%"></span>`)
        .join("")}
    </div>
  `;
}

function ensureGeneratedSite() {
  const siteRoot = document.getElementById("public-site");
  let wrapper = siteRoot.querySelector(".generated-site");

  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.className = "generated-site";
    wrapper.innerHTML = siteRoot.innerHTML.trim()
      ? `<section><p>${siteRoot.innerHTML}</p></section>`
      : "<section><p>Landing page coming soon.</p></section>";
    siteRoot.innerHTML = "";
    siteRoot.append(wrapper);
  }

  return wrapper;
}

function getRenderedSections() {
  return Array.from(ensureGeneratedSite().querySelectorAll(":scope > section"));
}

function decorateGeneratedSite(client) {
  const wrapper = ensureGeneratedSite();
  const sections = getRenderedSections();
  const sectionMeta = [
    { kicker: "Overview", kind: "hero" },
    { kicker: "Offer", kind: "offer" },
    { kicker: "Proof", kind: "proof" },
    { kicker: "CTA", kind: "cta" }
  ];

  sections.forEach((section, index) => {
    const meta = sectionMeta[index] || { kicker: `Section ${index + 1}`, kind: "detail" };
    section.classList.add("public-site-section", `public-site-section-${meta.kind}`);

    if (!section.querySelector(".public-section-kicker")) {
      const kicker = document.createElement("span");
      kicker.className = "public-section-kicker";
      kicker.textContent = meta.kicker;
      section.prepend(kicker);
    }
  });

  const hero = sections[0];
  if (hero && !hero.querySelector(".public-hero-grid")) {
    const shell = document.createElement("div");
    shell.className = "public-hero-grid";

    const main = document.createElement("div");
    main.className = "public-hero-main";

    const side = document.createElement("aside");
    side.className = "public-hero-side";
    side.innerHTML = `
      <article class="public-hero-side-card">
        <span>Primary CTA</span>
        <strong>${escapeHtml(client.website?.cta || "Ota yhteytta")}</strong>
        <p>CTA toistuu hero-alueella ja loppublokissa.</p>
      </article>
      <article class="public-hero-side-card">
        <span>SEO slug</span>
        <strong>${escapeHtml(client.seo?.slug ? `/${client.seo.slug}` : "/coming-soon")}</strong>
        <p>Osoite tulee suoraan asiakkaan omasta datasta.</p>
      </article>
      <article class="public-hero-side-card">
        <span>Keyword count</span>
        <strong>${escapeHtml(formatMetric(client.seo?.keywords?.length || 0))}</strong>
        <p>${escapeHtml(client.seo?.keywords?.slice(0, 2).join(" • ") || "No keywords yet")}</p>
      </article>
    `;

    while (hero.firstChild) {
      main.append(hero.firstChild);
    }

    shell.append(main, side);
    hero.append(shell);
  }

  const ctaSection = sections[sections.length - 1];
  if (ctaSection && !ctaSection.querySelector(".public-cta-tail")) {
    const tail = document.createElement("div");
    tail.className = "public-cta-tail";
    tail.innerHTML = `
      <span class="public-cta-status">Ready to contact</span>
      <span class="public-cta-status public-cta-status-muted">${escapeHtml(client.website?.cta || "Ota yhteytta")}</span>
    `;
    ctaSection.append(tail);
  }
}

function renderMetricGrid(client) {
  const cards = [
    {
      label: "Primary CTA",
      value: client.website?.cta || "Ota yhteyttä",
      meta: "Päätoiminto näkyy koko sivun läpi",
      bars: [34, 58, 42, 76, 64, 88]
    },
    {
      label: "SEO slug",
      value: client.seo?.slug ? `/${client.seo.slug}` : "/coming-soon",
      meta: "Osoite pysyy asiakkaan omassa datassa",
      bars: [28, 42, 38, 52, 66, 74]
    },
    {
      label: "Keyword pack",
      value: formatMetric(client.seo?.keywords?.length || 0),
      meta: client.seo?.keywords?.slice(0, 2).join(" • ") || "Hakusanat puuttuvat",
      bars: [18, 36, 54, 46, 62, 78]
    },
    {
      label: "Content blocks",
      value: formatMetric(getRenderedSections().length || 0),
      meta: "Rakenne visualisoitu dashboard-chromen sisään",
      bars: [26, 48, 44, 60, 72, 90]
    }
  ];

  document.getElementById("public-metrics").innerHTML = cards
    .map(
      (card) => `
        <article class="public-metric-card">
          <div class="public-metric-head">
            <span>${escapeHtml(card.label)}</span>
            <small>Live</small>
          </div>
          <strong>${escapeHtml(card.value)}</strong>
          ${createSparkBars(card.bars)}
          <p>${escapeHtml(card.meta)}</p>
        </article>
      `
    )
    .join("");
}

function renderPageMap() {
  const sections = getRenderedSections();
  document.getElementById("public-nav").innerHTML = sections.length
    ? sections
        .map((section, index) => {
          const heading = section.querySelector("h1, h2, h3");
          const label = heading?.textContent?.trim() || `Section ${index + 1}`;
          const badge = index === 0 ? "Hero" : `${index + 1}`;
          return `
            <article class="public-nav-item">
              <span class="public-nav-index">${escapeHtml(badge)}</span>
              <div>
                <strong>${escapeHtml(label)}</strong>
                <p>${escapeHtml(index === 0 ? "Primary conversion block" : "Supporting content block")}</p>
              </div>
            </article>
          `;
        })
        .join("")
    : `
        <article class="mini-card">
          <strong>Ei rakennetta vielä</strong>
          <p>Generoi landing page, niin section map ilmestyy tähän.</p>
        </article>
      `;
}

function renderSeoSummary(client) {
  const items = [
    {
      title: "Title",
      text: client.seo?.title || client.businessName
    },
    {
      title: "Meta description",
      text: client.seo?.metaDescription || client.description
    },
    {
      title: "Keywords",
      text: client.seo?.keywords?.slice(0, 4).join(", ") || "Ei hakusanoja"
    }
  ];

  document.getElementById("public-seo-summary").innerHTML = items
    .map(
      (item) => `
        <article class="mini-card">
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.text)}</p>
        </article>
      `
    )
    .join("");
}

function renderInsights(client) {
  const cards = [
    {
      title: "Reference style",
      text: "Tumma analytics-dashboard chrome, mutta asiakkaan oma headline, CTA ja sisältö säilyvät."
    },
    {
      title: "Primary CTA",
      text: client.website?.cta || "Ota yhteyttä"
    },
    {
      title: "Current lead path",
      text: "Preview -> contact form -> lead submit"
    }
  ];

  document.getElementById("public-insights").innerHTML = cards
    .map(
      (card) => `
        <article class="mini-card">
          <strong>${escapeHtml(card.title)}</strong>
          <p>${escapeHtml(card.text)}</p>
        </article>
      `
    )
    .join("");
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
  decorateGeneratedSite(bootstrap.client);
  renderMetricGrid(bootstrap.client);
  renderPageMap();
  renderSeoSummary(bootstrap.client);
  renderInsights(bootstrap.client);

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
