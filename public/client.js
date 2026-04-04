const clientId = Number(window.location.pathname.split("/").pop());
const sessionStorageKey = `autonomous-client-session-${clientId}`;
let sessionId = window.localStorage.getItem(sessionStorageKey);
const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
let revealObserver = null;
let scrollShiftNodes = [];
let scrollMotionBound = false;

if (!sessionId) {
  sessionId = crypto.randomUUID();
  window.localStorage.setItem(sessionStorageKey, sessionId);
}

function getRevealObserver() {
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    return null;
  }

  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -10% 0px"
      }
    );
  }

  return revealObserver;
}

function observeReveal(node) {
  if (!(node instanceof HTMLElement)) return;

  const observer = getRevealObserver();
  if (!observer) {
    node.classList.add("is-visible");
    return;
  }

  observer.observe(node);
}

function updateScrollShift() {
  if (prefersReducedMotion || !scrollShiftNodes.length) {
    return;
  }

  const viewportHeight = window.innerHeight || 1;

  scrollShiftNodes.forEach(({ node, amount }) => {
    const rect = node.getBoundingClientRect();
    const distance = rect.top + rect.height / 2 - viewportHeight * 0.58;
    const progress = Math.max(-1, Math.min(1, distance / viewportHeight));
    node.style.setProperty("--scroll-shift", `${Math.round(progress * amount * -1)}px`);
  });
}

function bindScrollMotion() {
  if (prefersReducedMotion || scrollMotionBound) {
    return;
  }

  let ticking = false;

  const queueUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      updateScrollShift();
      ticking = false;
    });
  };

  window.addEventListener("scroll", queueUpdate, { passive: true });
  window.addEventListener("resize", queueUpdate);
  scrollMotionBound = true;
}

function setupPublicMotion() {
  const head = document.querySelector(".public-dashboard-head");
  if (head) {
    head.dataset.reveal = head.dataset.reveal || "soft";
    observeReveal(head);
  }

  const staticGroups = [
    [".public-nav-card", "panel", 0, 70],
    [".public-seo-card", "panel", 80, 70],
    [".public-preview-panel", "panel", 120, 70],
    [".public-contact-card", "panel", 160, 70],
    [".public-note-card", "panel", 220, 70]
  ];

  staticGroups.forEach(([selector, type, delay]) => {
    document.querySelectorAll(selector).forEach((node, index) => {
      if (!(node instanceof HTMLElement)) return;
      node.dataset.reveal = node.dataset.reveal || type;
      node.style.setProperty("--reveal-delay", `${Number(delay) + index * 70}ms`);
      observeReveal(node);
    });
  });

  const staggerGroups = [
    [".public-metric-card", "panel", 120, 70],
    [".public-nav-item", "panel", 160, 60],
    [".mini-card", "soft", 180, 60],
    [".public-hero-side-card", "soft", 220, 70],
    [".generated-site > section", "soft", 180, 90]
  ];

  staggerGroups.forEach(([selector, type, baseDelay, step]) => {
    document.querySelectorAll(selector).forEach((node, index) => {
      if (!(node instanceof HTMLElement)) return;
      node.dataset.reveal = node.dataset.reveal || type;
      node.style.setProperty("--reveal-delay", `${Number(baseDelay) + index * Number(step)}ms`);
      observeReveal(node);
    });
  });

  scrollShiftNodes = [];

  const motionTargets = [
    [".public-preview-panel", 18],
    [".public-contact-card", 8],
    [".public-note-card", 8],
    [".public-metric-card", 6]
  ];

  motionTargets.forEach(([selector, amount]) => {
    document.querySelectorAll(selector).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      node.dataset.scrollShift = String(amount);
      scrollShiftNodes.push({ node, amount: Number(amount) });
    });
  });

  bindScrollMotion();
  updateScrollShift();
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

  sections.forEach((section, index) => {
    section.dataset.reveal = section.dataset.reveal || "soft";
    section.style.setProperty("--reveal-delay", `${180 + index * 90}ms`);
  });

  const hasDesignFamily = Array.from(wrapper.classList).some((className) => className.startsWith("generated-site-family-"));
  if (hasDesignFamily) {
    return;
  }

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
      <article class="public-hero-side-card" data-reveal="soft">
        <span>Primary CTA</span>
        <strong>${escapeHtml(client.website?.cta || "Ota yhteytta")}</strong>
        <p>CTA toistuu hero-alueella ja loppublokissa.</p>
      </article>
      <article class="public-hero-side-card" data-reveal="soft">
        <span>SEO slug</span>
        <strong>${escapeHtml(client.seo?.slug ? `/${client.seo.slug}` : "/coming-soon")}</strong>
        <p>Osoite tulee suoraan asiakkaan omasta datasta.</p>
      </article>
      <article class="public-hero-side-card" data-reveal="soft">
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
      (card, index) => `
        <article class="public-metric-card" data-reveal="panel" style="--reveal-delay:${120 + index * 70}ms">
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
            <article class="public-nav-item" data-reveal="panel" style="--reveal-delay:${160 + index * 60}ms">
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
        <article class="mini-card" data-reveal="soft">
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
      (item, index) => `
        <article class="mini-card" data-reveal="soft" style="--reveal-delay:${180 + index * 60}ms">
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
      (card, index) => `
        <article class="mini-card" data-reveal="soft" style="--reveal-delay:${200 + index * 60}ms">
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
  setupPublicMotion();

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
