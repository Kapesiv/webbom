import { clearAuthenticated, hasStoredAuth, redirectTo } from "./auth-state.js";

const WORKFLOW_STORAGE_KEY = "lumix-guided-workflow-v1";
const GENERATE_MESSAGES = [
  "Analyzing brief...",
  "Building strategy...",
  "Generating page...",
  "Writing blog drafts...",
  "Optimizing SEO..."
];
const STEP_ORDER = ["client", "strategy", "generate", "preview", "publish"];
const STEP_LABELS = {
  client: "Client",
  strategy: "Strategy",
  generate: "Generate",
  preview: "Preview",
  publish: "Publish"
};

const state = {
  bootstrap: null,
  activeClientId: null,
  storage: readStorage(),
  loadingGenerate: null,
  loadingTimer: null
};

const stepList = document.getElementById("guided-step-list");
const mainView = document.getElementById("guided-main");
const statusBanner = document.getElementById("guided-status");
const clientSwitcher = document.getElementById("guided-client-switcher");
const workspaceName = document.getElementById("guided-workspace-name");
const logoutButton = document.getElementById("guided-logout");
const newWebsiteButton = document.getElementById("guided-new-website");

if (!hasStoredAuth()) {
  redirectTo("/login");
}

function readStorage() {
  try {
    const value = JSON.parse(localStorage.getItem(WORKFLOW_STORAGE_KEY) || "{}");
    return {
      activeClientId: value.activeClientId ?? null,
      draftBrief: String(value.draftBrief || ""),
      clients: value.clients && typeof value.clients === "object" ? value.clients : {}
    };
  } catch {
    return {
      activeClientId: null,
      draftBrief: "",
      clients: {}
    };
  }
}

function writeStorage() {
  localStorage.setItem(
    WORKFLOW_STORAGE_KEY,
    JSON.stringify({
      activeClientId: state.storage.activeClientId,
      draftBrief: state.storage.draftBrief,
      clients: state.storage.clients
    })
  );
}

function getStorageKey(clientId) {
  return clientId ? String(clientId) : "draft";
}

function createDefaultClientUiState() {
  return {
    activeStep: "client",
    businessBrief: "",
    strategyDraft: null,
    strategyAccepted: false,
    strategyEditing: false,
    previewTab: "landing",
    generationComplete: false,
    previewApproved: false,
    publishReady: false,
    publishFormOpen: false,
    publishDraft: {
      platform: "wordpress",
      name: "Primary site",
      baseUrl: "",
      username: "",
      applicationPassword: "",
      siteUrl: "",
      token: "",
      collectionId: ""
    },
    published: false,
    publishedUrl: ""
  };
}

function getClientUiState(clientId) {
  const key = getStorageKey(clientId);
  if (!state.storage.clients[key]) {
    state.storage.clients[key] = createDefaultClientUiState();
  }
  return state.storage.clients[key];
}

function updateClientUiState(clientId, updates) {
  const key = getStorageKey(clientId);
  const current = getClientUiState(clientId);
  state.storage.clients[key] = {
    ...current,
    ...updates,
    publishDraft: {
      ...current.publishDraft,
      ...(updates.publishDraft || {})
    }
  };
  writeStorage();
}

function setStatus(message = "", tone = "") {
  statusBanner.textContent = message;
  statusBanner.className = `guided-status${message ? " is-visible" : ""}${tone ? ` is-${tone}` : ""}`;
}

function getFriendlyErrorMessage(error, fallbackMessage) {
  const message = error instanceof Error ? String(error.message || "").trim() : "";

  if (/Strategy requires/i.test(message) || /Strategy generation is not allowed yet/i.test(message)) {
    return "Lumix could not build a complete strategy yet. Add a slightly clearer business description and continue again.";
  }

  if (/Recommendation is not allowed yet/i.test(message)) {
    return "Lumix needs a clearer business brief before it can create your strategy.";
  }

  if (/Generate is not allowed yet/i.test(message)) {
    return "Approve the strategy first, then generate the content pack.";
  }

  if (/Expected ',' or ']'/i.test(message) || /JSON at position/i.test(message) || /Unexpected token/i.test(message)) {
    return "Lumix hit a formatting issue while generating the content pack. Please run generation again.";
  }

  if (/Publish is not allowed yet/i.test(message)) {
    return "Approve the preview and connect a publish channel before publishing.";
  }

  return message || fallbackMessage;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

async function refreshBootstrap() {
  const bootstrap = await api("/api/bootstrap");
  if (!bootstrap.authenticated) {
    clearAuthenticated();
    redirectTo("/login");
    return null;
  }

  state.bootstrap = bootstrap;
  syncActiveClientId();
  return bootstrap;
}

function getClients() {
  return state.bootstrap?.clients || [];
}

function getActiveClient() {
  return getClients().find((client) => client.id === state.activeClientId) || null;
}

function syncActiveClientId() {
  const clients = getClients();
  const storedId = Number(state.storage.activeClientId || 0) || null;
  const urlClientId = Number(new URLSearchParams(window.location.search).get("client") || 0) || null;

  if (urlClientId && clients.some((client) => client.id === urlClientId)) {
    state.activeClientId = urlClientId;
    state.storage.activeClientId = urlClientId;
    writeStorage();
    return;
  }

  if (storedId && clients.some((client) => client.id === storedId)) {
    state.activeClientId = storedId;
    return;
  }

  state.activeClientId = clients[0]?.id || null;
  state.storage.activeClientId = state.activeClientId;
  writeStorage();
}

function getCatalogItems(key) {
  return state.bootstrap?.lumix?.catalog?.[key] || [];
}

function getFirstCatalogValue(key, fallback = "") {
  return getCatalogItems(key)[0]?.value || fallback;
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function deriveBusinessNameFromBrief(brief) {
  const source = String(brief || "")
    .split(/[.!?\n]/)
    .find((item) => item.trim())
    || "New business";

  return source
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeStrategy(recommendation) {
  if (!recommendation) return null;
  return {
    positioning: recommendation.positioning || "",
    primaryOffer: recommendation.primaryOffer || "",
    primaryAudience: recommendation.primaryAudience || "",
    ctaStrategy: recommendation.ctaStrategy || "",
    homepageStructure: Array.isArray(recommendation.homepageStructure) ? recommendation.homepageStructure : []
  };
}

function hasGeneratedContent(client) {
  return Boolean(client?.website?.html || client?.blogs?.length || client?.seo);
}

function getDerivedStep(client, uiState) {
  if (!client) return "client";
  if (!String(client.description || "").trim()) return "client";
  if (!client.strategyRecommendation) return "strategy";
  if (!uiState.strategyAccepted) return "strategy";
  if (!hasGeneratedContent(client) || !uiState.generationComplete) return "generate";
  if (!uiState.previewApproved) return "preview";
  return "publish";
}

function getActiveStep(client, uiState) {
  const derived = getDerivedStep(client, uiState);
  const stored = uiState.activeStep || derived;
  return STEP_ORDER.indexOf(stored) <= STEP_ORDER.indexOf(derived) ? stored : derived;
}

function buildStepStates(client, activeStep) {
  const uiState = getClientUiState(client?.id || null);
  const derived = getDerivedStep(client, uiState);
  const highestDoneIndex = Math.max(0, STEP_ORDER.indexOf(derived) - 1);
  const currentIndex = STEP_ORDER.indexOf(activeStep);
  const reachableIndex = STEP_ORDER.indexOf(derived);

  return STEP_ORDER.map((key, index) => {
    let stateLabel = "upcoming";
    if (index < currentIndex || index <= highestDoneIndex) stateLabel = "done";
    if (index === currentIndex) stateLabel = "current";
    if (!client && key === "client") stateLabel = "current";
    return {
      key,
      label: STEP_LABELS[key],
      state: stateLabel,
      clickable: index <= Math.max(reachableIndex, currentIndex)
    };
  });
}

function renderStepRail(client, activeStep) {
  stepList.innerHTML = buildStepStates(client, activeStep)
    .map(
      (step, index) => `
        <button
          type="button"
          class="guided-step guided-step-${escapeHtml(step.state)}${step.clickable ? " is-clickable" : " is-disabled"}"
          data-step-nav="${escapeHtml(step.key)}"
          ${step.clickable ? "" : "disabled"}
          ${step.state === "current" ? 'aria-current="step"' : ""}
        >
          <span class="guided-step-index">${escapeHtml(String(index + 1).padStart(2, "0"))}</span>
          <span class="guided-step-label">${escapeHtml(step.label)}</span>
        </button>
      `
    )
    .join("");
}

function renderClientSwitcher() {
  const clients = getClients();
  const options = ['<option value="">New client</option>']
    .concat(
      clients.map(
        (client) =>
          `<option value="${client.id}"${client.id === state.activeClientId ? " selected" : ""}>${escapeHtml(client.businessName)}</option>`
      )
    )
    .join("");

  clientSwitcher.innerHTML = options;
}

function renderShellMeta() {
  const workspace = state.bootstrap?.user?.agencyName || "Lumix Workspace";
  workspaceName.textContent = workspace;
  renderClientSwitcher();
}

function renderBusinessStep(client, uiState) {
  const brief = uiState.businessBrief || client?.description || state.storage.draftBrief || "";
  const clientName = client ? `<p class="guided-step-context">Active client: ${escapeHtml(client.businessName)}</p>` : "";

  return `
    <article class="guided-card guided-card-main">
      <span class="guided-step-tag">Step 1</span>
      <h2>Tell us about your business</h2>
      <p class="guided-step-copy">Describe what you do, who you help, and what you want to grow.</p>
      ${clientName}

      <form class="guided-form" data-brief-form>
        <textarea name="brief" rows="8" placeholder="Describe your business in one sentence...">${escapeHtml(brief)}</textarea>
        <button type="submit" class="guided-primary-button">Continue</button>
      </form>
    </article>
  `;
}

function renderStrategyCards(strategy, editable = false) {
  const homepageStructure = Array.isArray(strategy?.homepageStructure) ? strategy.homepageStructure.join("\n") : "";

  if (editable) {
    return `
      <label class="guided-field-card">
        <span>Positioning</span>
        <textarea name="positioning" rows="3">${escapeHtml(strategy?.positioning || "")}</textarea>
      </label>
      <label class="guided-field-card">
        <span>Offer</span>
        <textarea name="primaryOffer" rows="3">${escapeHtml(strategy?.primaryOffer || "")}</textarea>
      </label>
      <label class="guided-field-card">
        <span>Audience</span>
        <textarea name="primaryAudience" rows="3">${escapeHtml(strategy?.primaryAudience || "")}</textarea>
      </label>
      <label class="guided-field-card">
        <span>CTA</span>
        <textarea name="ctaStrategy" rows="3">${escapeHtml(strategy?.ctaStrategy || "")}</textarea>
      </label>
      <label class="guided-field-card guided-field-card-wide">
        <span>Homepage structure</span>
        <textarea name="homepageStructure" rows="5">${escapeHtml(homepageStructure)}</textarea>
      </label>
    `;
  }

  return `
    <article class="guided-data-card">
      <span>Positioning</span>
      <strong>${escapeHtml(strategy?.positioning || "Not generated yet")}</strong>
    </article>
    <article class="guided-data-card">
      <span>Offer</span>
      <strong>${escapeHtml(strategy?.primaryOffer || "Not generated yet")}</strong>
    </article>
    <article class="guided-data-card">
      <span>Audience</span>
      <strong>${escapeHtml(strategy?.primaryAudience || "Not generated yet")}</strong>
    </article>
    <article class="guided-data-card">
      <span>CTA</span>
      <strong>${escapeHtml(strategy?.ctaStrategy || "Not generated yet")}</strong>
    </article>
    <article class="guided-data-card guided-data-card-wide">
      <span>Homepage structure</span>
      <strong>${escapeHtml((strategy?.homepageStructure || []).join(" → ") || "Not generated yet")}</strong>
    </article>
  `;
}

function renderStrategyStep(client, uiState) {
  const strategy = uiState.strategyDraft || normalizeStrategy(client?.strategyRecommendation);
  const editable = Boolean(uiState.strategyEditing);

  if (!strategy) {
    return `
      <article class="guided-card guided-card-main">
        <span class="guided-step-tag">Step 2</span>
        <h2>Review your strategy</h2>
        <p class="guided-step-copy">Generating a strategy from the saved business brief.</p>
      </article>
    `;
  }

  return `
    <article class="guided-card guided-card-main">
      <span class="guided-step-tag">Step 2</span>
      <h2>Review your strategy</h2>
      <p class="guided-step-copy">Lumix turned your brief into a positioning, offer, audience, CTA, and homepage direction.</p>

      ${
        editable
          ? `
              <form class="guided-form" data-strategy-form>
                <div class="guided-data-grid">
                  ${renderStrategyCards(strategy, true)}
                </div>
                <div class="guided-action-row">
                  <button type="submit" class="guided-primary-button">Save strategy</button>
                  <button type="button" class="guided-secondary-button" data-action="cancel-strategy-edit">Cancel</button>
                </div>
              </form>
            `
          : `
              <div class="guided-data-grid">
                ${renderStrategyCards(strategy, false)}
              </div>
              <div class="guided-action-row">
                <button type="button" class="guided-primary-button" data-action="accept-strategy">Accept strategy</button>
                <button type="button" class="guided-secondary-button" data-action="edit-strategy">Edit strategy</button>
              </div>
            `
      }
    </article>
  `;
}

function renderGenerateStep(uiState) {
  if (state.loadingGenerate) {
    return `
      <article class="guided-card guided-card-main guided-loading-card">
        <span class="guided-step-tag">Step 3</span>
        <h2>Generate your content pack</h2>
        <div class="guided-loading-orb" aria-hidden="true"></div>
        <strong>${escapeHtml(state.loadingGenerate.message)}</strong>
        <p class="guided-step-copy">Lumix is creating your landing page, blog pack, and SEO package.</p>
      </article>
    `;
  }

  return `
    <article class="guided-card guided-card-main">
      <span class="guided-step-tag">Step 3</span>
      <h2>Generate your content pack</h2>
      <p class="guided-step-copy">Create everything in one run, then move directly into review.</p>

      <div class="guided-output-list">
        <article class="guided-output-item">
          <strong>Landing page</strong>
          <p>A customer-facing website draft with clear CTA structure.</p>
        </article>
        <article class="guided-output-item">
          <strong>Blog pack</strong>
          <p>Supporting content drafts built from the same strategic direction.</p>
        </article>
        <article class="guided-output-item">
          <strong>SEO package</strong>
          <p>Metadata, keywords, and search support aligned with the page.</p>
        </article>
      </div>

      <div class="guided-action-row">
        <button type="button" class="guided-primary-button" data-action="generate-content">Generate content</button>
      </div>
    </article>
  `;
}

function firstSentence(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const sentence = text.split(/(?<=[.!?])\s+/)[0] || text;
  return sentence.trim();
}

function truncateText(value, maxLength = 160) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function getPreviewBusinessName(client) {
  return String(client?.businessName || "").trim() || "Northline Studio";
}

function getPreviewHeadline(client) {
  const websiteHeadline = String(client?.website?.headline || "").trim();
  const positioning = String(client?.strategyRecommendation?.positioning || "").trim();
  const offer = String(client?.strategyRecommendation?.primaryOffer || "").trim();
  const name = getPreviewBusinessName(client);

  return websiteHeadline || positioning || offer || `${name} helps clients move with confidence`;
}

function getPreviewSubheadline(client) {
  const websiteSubheadline = String(client?.website?.subheadline || "").trim();
  const recommendation = client?.strategyRecommendation || {};
  const description = firstSentence(client?.description || "");
  const offer = String(recommendation.primaryOffer || "").trim();
  const audience = String(recommendation.primaryAudience || "").trim();

  if (websiteSubheadline) return websiteSubheadline;
  if (description) return description;
  if (offer && audience) return `${offer} for ${audience}, delivered with a clear process and practical guidance.`;
  if (offer) return `${offer} built around clear communication, reliable delivery, and a simple next step for new enquiries.`;
  return "We help clients turn interest into conversations with a clear offer, a trustworthy website, and a strong call to action.";
}

function getPreviewCta(client) {
  return String(client?.website?.cta || client?.strategyRecommendation?.ctaStrategy || "").trim() || "Request a consultation";
}

function getPreviewAudience(client) {
  return String(client?.strategyRecommendation?.primaryAudience || "").trim() || "growing businesses";
}

function getPreviewOffer(client) {
  return String(client?.strategyRecommendation?.primaryOffer || "").trim() || firstSentence(client?.description || "") || "specialist business services";
}

function getPreviewServices(client) {
  const offer = getPreviewOffer(client);
  const audience = getPreviewAudience(client);
  const angles = Array.isArray(client?.strategyRecommendation?.contentAngles) ? client.strategyRecommendation.contentAngles : [];

  return [
    {
      title: offer,
      body: truncateText(angles[0] || `${offer} planned around your business goals, audience, and buying process.`, 130)
    },
    {
      title: "Project planning and guidance",
      body: truncateText(angles[1] || `Clear recommendations, practical next steps, and a delivery plan that keeps the work moving.`, 130)
    },
    {
      title: `Support for ${audience}`,
      body: truncateText(angles[2] || `Messaging, structure, and service presentation shaped for the people most likely to enquire.`, 130)
    }
  ];
}

function getPreviewAboutCopy(client) {
  const description = String(client?.description || "").trim();
  const audience = getPreviewAudience(client);
  const offer = getPreviewOffer(client);

  return (
    firstSentence(description) ||
    `${getPreviewBusinessName(client)} provides ${offer} for ${audience}, with a focus on clear communication, dependable delivery, and a smooth customer experience from the first enquiry onward.`
  );
}

function getPreviewTestimonial(client) {
  const offer = getPreviewOffer(client);
  const audience = getPreviewAudience(client);
  const blogExcerpt = firstSentence(client?.blogs?.[0]?.excerpt || "");

  return {
    quote:
      blogExcerpt ||
      `We needed a clearer way to explain our service and make it easy for the right clients to get in touch. The new site finally does that.`,
    name: "Mika Laakso",
    role: `${audience.charAt(0).toUpperCase() + audience.slice(1)} client`,
    context: offer
  };
}

function getPreviewProcess(client) {
  const cta = getPreviewCta(client);
  return [
    {
      step: "1",
      title: "Initial discussion",
      body: `We start by understanding your goals, offer, and what matters most to your customers.`
    },
    {
      step: "2",
      title: "Clear proposal",
      body: `You receive a practical plan covering the scope, timeline, and the best next move for the project.`
    },
    {
      step: "3",
      title: "Delivery and follow-through",
      body: `${cta} when you are ready, and we take the work forward with clear communication and steady progress.`
    }
  ];
}

function renderFallbackLandingPreview(client) {
  const name = getPreviewBusinessName(client);
  const headline = getPreviewHeadline(client);
  const subheadline = getPreviewSubheadline(client);
  const cta = getPreviewCta(client);
  const services = getPreviewServices(client);
  const aboutCopy = getPreviewAboutCopy(client);
  const testimonial = getPreviewTestimonial(client);
  const process = getPreviewProcess(client);
  const seoTitle = String(client?.seo?.title || "").trim();
  const footerDescription = truncateText(
    String(client?.seo?.metaDescription || client?.description || "").trim() || subheadline,
    120
  );

  return `
        <article class="guided-site-preview">
          <header class="guided-site-header">
            <strong>${escapeHtml(name)}</strong>
            <nav class="guided-site-nav" aria-label="Website sections">
              <span>Services</span>
              <span>About</span>
              <span>Process</span>
              <span>Contact</span>
            </nav>
          </header>

          <section class="guided-site-hero">
            <div class="guided-site-hero-copy">
              <span class="guided-site-kicker">Trusted business website</span>
              <h3>${escapeHtml(headline)}</h3>
              <p>${escapeHtml(subheadline)}</p>
              <div class="guided-site-action-row">
                <span class="guided-site-button guided-site-button-primary">${escapeHtml(cta)}</span>
                <span class="guided-site-button guided-site-button-secondary">See services</span>
              </div>
            </div>

            <aside class="guided-site-hero-aside">
              <div class="guided-site-info-card">
                <span>What we do</span>
                <strong>${escapeHtml(getPreviewOffer(client))}</strong>
              </div>
              <div class="guided-site-info-card">
                <span>Best fit for</span>
                <strong>${escapeHtml(getPreviewAudience(client))}</strong>
              </div>
              <div class="guided-site-info-card">
                <span>Next step</span>
                <strong>${escapeHtml(cta)}</strong>
              </div>
            </aside>
          </section>

          <section class="guided-site-section">
            <div class="guided-site-section-head">
              <span class="guided-site-kicker">Services</span>
              <h4>What clients come to us for</h4>
            </div>
            <div class="guided-site-service-grid">
              ${services
                .map(
                  (service) => `
                    <article class="guided-site-service-card">
                      <strong>${escapeHtml(service.title)}</strong>
                      <p>${escapeHtml(service.body)}</p>
                    </article>
                  `
                )
                .join("")}
            </div>
          </section>

          <section class="guided-site-section guided-site-section-split">
            <div>
              <span class="guided-site-kicker">About</span>
              <h4>Clear work, grounded communication, reliable delivery.</h4>
              <p>${escapeHtml(aboutCopy)}</p>
            </div>
            <div class="guided-site-credibility-card">
              <strong>${escapeHtml(seoTitle || `${name} | Professional service partner`)}</strong>
              <p>${escapeHtml(footerDescription)}</p>
            </div>
          </section>

          <section class="guided-site-section">
            <div class="guided-site-section-head">
              <span class="guided-site-kicker">Client feedback</span>
              <h4>What clients say after launch</h4>
            </div>
            <blockquote class="guided-site-testimonial">
              <p>${escapeHtml(`“${testimonial.quote}”`)}</p>
              <footer>
                <strong>${escapeHtml(testimonial.name)}</strong>
                <span>${escapeHtml(`${testimonial.role} • ${testimonial.context}`)}</span>
              </footer>
            </blockquote>
          </section>

          <section class="guided-site-section">
            <div class="guided-site-section-head">
              <span class="guided-site-kicker">Process</span>
              <h4>How the work moves forward</h4>
            </div>
            <div class="guided-site-process-grid">
              ${process
                .map(
                  (item) => `
                    <article class="guided-site-process-card">
                      <span>${escapeHtml(item.step)}</span>
                      <strong>${escapeHtml(item.title)}</strong>
                      <p>${escapeHtml(item.body)}</p>
                    </article>
                  `
                )
                .join("")}
            </div>
          </section>

          <section class="guided-site-final-cta">
            <div>
              <span class="guided-site-kicker">Get in touch</span>
              <h4>Ready to discuss your project?</h4>
              <p>Tell us what you need and we will come back with a clear next step.</p>
            </div>
            <span class="guided-site-button guided-site-button-primary">${escapeHtml(cta)}</span>
          </section>

          <footer class="guided-site-footer">
            <div>
              <strong>${escapeHtml(name)}</strong>
              <p>${escapeHtml(footerDescription)}</p>
            </div>
            <div class="guided-site-footer-links">
              <span>Services</span>
              <span>About</span>
              <span>Contact</span>
            </div>
          </footer>
        </article>
  `;
}

function renderLandingPreview(client) {
  const previewMarkup = String(client?.website?.html || "").trim() || renderFallbackLandingPreview(client);
  return `
    <div class="guided-preview-browser guided-preview-browser-landing">
      <div class="guided-preview-bar">
        <div class="guided-preview-dots" aria-hidden="true"><span></span><span></span><span></span></div>
        <span class="guided-preview-url">${escapeHtml(`${client.businessName}.preview`)}</span>
      </div>
      <div class="guided-preview-surface guided-preview-surface-landing">
        ${previewMarkup}
      </div>
    </div>
  `;
}

function renderBlogsPreview(client) {
  const blogs = client?.blogs || [];
  if (!blogs.length) {
    return `<div class="guided-preview-list"><article class="guided-preview-card"><strong>No blog drafts yet</strong><p>Generate content to create supporting articles for the website.</p></article></div>`;
  }

  return `
    <div class="guided-preview-list">
      ${blogs
        .slice(0, 3)
        .map(
          (blog) => `
            <article class="guided-preview-card">
              <span>${escapeHtml(blog.keyword || "Primary topic")}</span>
              <strong>${escapeHtml(blog.title)}</strong>
              <p>${escapeHtml(blog.excerpt || "A supporting article preview for this website.")}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSeoPreview(client) {
  const seo = client?.seo;
  const keywords = Array.isArray(seo?.keywords) ? seo.keywords : [];
  return `
    <div class="guided-preview-list">
      <article class="guided-preview-card">
        <span>Meta title</span>
        <strong>${escapeHtml(seo?.title || "No SEO title yet")}</strong>
      </article>
      <article class="guided-preview-card">
        <span>Meta description</span>
        <strong>${escapeHtml(seo?.metaDescription || seo?.description || "No SEO description yet")}</strong>
      </article>
      <article class="guided-preview-card">
        <span>Keywords</span>
        <strong>${escapeHtml(keywords.join(", ") || "No keywords yet")}</strong>
      </article>
    </div>
  `;
}

function renderPreviewStep(client, uiState) {
  const activeTab = uiState.previewTab || "landing";
  const previewContent =
    activeTab === "blogs" ? renderBlogsPreview(client) : activeTab === "seo" ? renderSeoPreview(client) : renderLandingPreview(client);

  return `
    <article class="guided-card guided-card-main guided-card-preview">
      <span class="guided-step-tag">Step 4</span>
      <h2>Review your generated package</h2>
      <p class="guided-step-copy">Check one view at a time before you move into publishing.</p>

      <div class="guided-tab-row" role="tablist" aria-label="Preview tabs">
        ${["landing", "blogs", "seo"]
          .map(
            (tab) => `
              <button
                type="button"
                class="guided-tab-button${activeTab === tab ? " is-active" : ""}"
                data-preview-tab="${tab}"
                role="tab"
                aria-selected="${String(activeTab === tab)}"
              >
                ${escapeHtml(tab.charAt(0).toUpperCase() + tab.slice(1))}
              </button>
            `
          )
          .join("")}
      </div>

      <div class="guided-preview-wrap">
        ${previewContent}
      </div>

      <div class="guided-action-row">
        <button type="button" class="guided-primary-button" data-action="approve-preview">Approve preview</button>
        <button type="button" class="guided-secondary-button" data-action="go-back-generate">Go back</button>
      </div>
    </article>
  `;
}

function renderPublishConnector(uiState, client) {
  const draft = uiState.publishDraft || createDefaultClientUiState().publishDraft;
  const platform = draft.platform || "wordpress";
  return `
    <form class="guided-form guided-publish-form" data-publish-target-form>
      <div class="guided-inline-grid">
        <label>
          <span>Platform</span>
          <select name="platform">
            <option value="wordpress"${platform === "wordpress" ? " selected" : ""}>WordPress</option>
            <option value="webflow"${platform === "webflow" ? " selected" : ""}>Webflow</option>
          </select>
        </label>
        <label>
          <span>Channel name</span>
          <input name="name" value="${escapeHtml(draft.name || `${client.businessName} site`)}" />
        </label>
      </div>

      ${
        platform === "wordpress"
          ? `
              <div class="guided-inline-grid">
                <label>
                  <span>Base URL</span>
                  <input name="baseUrl" placeholder="https://example.com" value="${escapeHtml(draft.baseUrl || "")}" />
                </label>
                <label>
                  <span>Username</span>
                  <input name="username" placeholder="api-user" value="${escapeHtml(draft.username || "")}" />
                </label>
              </div>
              <label>
                <span>Application password</span>
                <input name="applicationPassword" placeholder="xxxx xxxx xxxx xxxx" value="${escapeHtml(draft.applicationPassword || "")}" />
              </label>
            `
          : `
              <div class="guided-inline-grid">
                <label>
                  <span>Site URL</span>
                  <input name="siteUrl" placeholder="https://your-site.webflow.io" value="${escapeHtml(draft.siteUrl || "")}" />
                </label>
                <label>
                  <span>Collection ID</span>
                  <input name="collectionId" placeholder="collection_id" value="${escapeHtml(draft.collectionId || "")}" />
                </label>
              </div>
              <label>
                <span>API token</span>
                <input name="token" placeholder="wf_xxx" value="${escapeHtml(draft.token || "")}" />
              </label>
            `
      }

      <div class="guided-action-row">
        <button type="submit" class="guided-primary-button">Save channel</button>
      </div>
    </form>
  `;
}

function getPublishUrl(client, uiState) {
  if (uiState.publishedUrl) return uiState.publishedUrl;

  const target = client?.publishTargets?.[0];
  const targetUrl =
    target?.config?.siteUrl ||
    target?.config?.baseUrl ||
    (client?.id ? `${window.location.origin}/client/${client.id}` : "");

  if (targetUrl) return targetUrl;
  return client?.id ? `${window.location.origin}/client/${client.id}` : "";
}

function renderPublishStep(client, uiState) {
  const hasTarget = Boolean(client?.publishTargets?.length);
  const published = Boolean(uiState.published || client?.publishHistory?.length);
  const publishUrl = getPublishUrl(client, uiState);

  if (published) {
    return `
      <article class="guided-card guided-card-main">
        <span class="guided-step-tag">Step 5</span>
        <h2>Your site is live</h2>
        <p class="guided-step-copy">The publish flow completed and the site can now be reviewed at the live destination.</p>
        <div class="guided-success-card">
          <strong>${escapeHtml(publishUrl || "https://your-site-url.com")}</strong>
        </div>
      </article>
    `;
  }

  return `
    <article class="guided-card guided-card-main">
      <span class="guided-step-tag">Step 5</span>
      <h2>Publish your site</h2>
      <p class="guided-step-copy">Keep this step lightweight. Connect one channel if needed, then publish when ready.</p>

      <div class="guided-publish-card${hasTarget ? " is-ready" : " is-blocked"}">
        <span class="guided-publish-state">${hasTarget ? "Ready to publish" : "Publish channel missing"}</span>
        <strong>${hasTarget ? "Your content pack is ready for launch." : "Connect one publish channel to unlock go live."}</strong>
        <p>
          ${
            hasTarget
              ? escapeHtml(client.publishTargets[0].name || "Primary website")
              : "A single connected channel is enough to move forward."
          }
        </p>
      </div>

      ${
        !hasTarget && uiState.publishFormOpen
          ? renderPublishConnector(uiState, client)
          : ""
      }

      <div class="guided-action-row">
        ${
          hasTarget
            ? '<button type="button" class="guided-primary-button" data-action="publish-now">Publish now</button>'
            : '<button type="button" class="guided-primary-button" data-action="open-publish-form">Connect publish channel</button>'
        }
      </div>
    </article>
  `;
}

function renderCurrentStep() {
  const client = getActiveClient();
  const uiState = getClientUiState(client?.id || null);

  if (client?.strategyRecommendation && hasGeneratedContent(client)) {
    uiState.strategyAccepted = true;
    uiState.generationComplete = true;
  }

  if (client?.publishHistory?.length) {
    uiState.previewApproved = true;
    uiState.published = true;
  }

  const activeStep = getActiveStep(client, uiState);

  uiState.activeStep = activeStep;
  uiState.publishReady = Boolean(client?.publishTargets?.length);
  if (client?.publishHistory?.length) {
    uiState.published = true;
    uiState.publishedUrl = getPublishUrl(client, uiState);
  }
  writeStorage();

  renderStepRail(client, activeStep);

  if (activeStep === "client") {
    mainView.innerHTML = renderBusinessStep(client, uiState);
    return;
  }

  if (activeStep === "strategy") {
    mainView.innerHTML = renderStrategyStep(client, uiState);
    return;
  }

  if (activeStep === "generate") {
    mainView.innerHTML = renderGenerateStep(uiState);
    return;
  }

  if (activeStep === "preview") {
    mainView.innerHTML = renderPreviewStep(client, uiState);
    return;
  }

  mainView.innerHTML = renderPublishStep(client, uiState);
}

function render() {
  if (!state.bootstrap) return;
  renderShellMeta();
  renderCurrentStep();
}

function buildMinimalIntakePayload(client, brief) {
  const profile = client?.businessProfile || {};
  return {
    businessType: profile.businessType || getFirstCatalogValue("businessType", "b2b_service"),
    offerType: profile.offerType || getFirstCatalogValue("offerType", "service"),
    audienceType: profile.audienceType || getFirstCatalogValue("audienceType", "small_businesses"),
    goalType: profile.goalType || getFirstCatalogValue("goalType", "lead_generation"),
    toneType: profile.toneType || getFirstCatalogValue("toneType", "trusted"),
    geoFocus: profile.geoFocus || "",
    pricePosition: profile.pricePosition || getFirstCatalogValue("pricePosition", "standard"),
    mainCta: profile.mainCta || "Book a call",
    notes: brief
  };
}

async function submitBrief(brief) {
  const clients = getClients();
  const activeClient = getActiveClient();
  let clientId = activeClient?.id || null;

  if (!clientId) {
    const result = await api("/api/clients", {
      method: "POST",
      body: JSON.stringify({
        businessName: deriveBusinessNameFromBrief(brief),
        description: brief,
        autoGenerate: false
      })
    });
    clientId = result.client.id;
    state.activeClientId = clientId;
    state.storage.activeClientId = clientId;
  } else if (activeClient?.description !== brief) {
    await api(`/api/clients/${clientId}`, {
      method: "PATCH",
      body: JSON.stringify({ description: brief })
    });
  }

  const refreshed = clients.find((client) => client.id === clientId) || activeClient || null;
  await api(`/api/clients/${clientId}/intake`, {
    method: "PUT",
    body: JSON.stringify(buildMinimalIntakePayload(refreshed, brief))
  });

  const recommendationResult = await api(`/api/clients/${clientId}/recommendation`, { method: "POST" });

  updateClientUiState(clientId, {
    activeStep: "strategy",
    businessBrief: brief,
    strategyDraft: normalizeStrategy(recommendationResult.client?.strategyRecommendation || recommendationResult.recommendation),
    strategyAccepted: false,
    strategyEditing: false,
    generationComplete: false,
    previewApproved: false,
    published: false,
    publishedUrl: ""
  });

  state.storage.draftBrief = "";
  writeStorage();
  await refreshBootstrap();
  setStatus("Business brief saved and strategy created.", "success");
  render();
}

function readStrategyForm(form) {
  const raw = Object.fromEntries(new FormData(form).entries());
  return {
    positioning: String(raw.positioning || "").trim(),
    primaryOffer: String(raw.primaryOffer || "").trim(),
    primaryAudience: String(raw.primaryAudience || "").trim(),
    ctaStrategy: String(raw.ctaStrategy || "").trim(),
    homepageStructure: String(raw.homepageStructure || "")
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
  };
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function startGenerateLoading(clientId) {
  stopGenerateLoading();
  state.loadingGenerate = {
    clientId,
    message: GENERATE_MESSAGES[0],
    index: 0
  };
  state.loadingTimer = window.setInterval(() => {
    if (!state.loadingGenerate) return;
    const nextIndex = (state.loadingGenerate.index + 1) % GENERATE_MESSAGES.length;
    state.loadingGenerate = {
      ...state.loadingGenerate,
      index: nextIndex,
      message: GENERATE_MESSAGES[nextIndex]
    };
    renderCurrentStep();
  }, 700);
}

function stopGenerateLoading() {
  if (state.loadingTimer) {
    window.clearInterval(state.loadingTimer);
    state.loadingTimer = null;
  }
  state.loadingGenerate = null;
}

function updatePublishDraftFromForm(clientId, raw) {
  updateClientUiState(clientId, {
    publishDraft: {
      platform: String(raw.platform || "wordpress"),
      name: String(raw.name || "Primary site"),
      baseUrl: String(raw.baseUrl || ""),
      username: String(raw.username || ""),
      applicationPassword: String(raw.applicationPassword || ""),
      siteUrl: String(raw.siteUrl || ""),
      token: String(raw.token || ""),
      collectionId: String(raw.collectionId || "")
    }
  });
}

function buildPublishConfig(raw) {
  if (raw.platform === "webflow") {
    return {
      token: String(raw.token || "").trim(),
      collectionId: String(raw.collectionId || "").trim(),
      siteUrl: String(raw.siteUrl || "").trim(),
      titleField: "name",
      slugField: "slug",
      contentField: "post-body",
      excerptField: "summary",
      keywordField: "keyword"
    };
  }

  return {
    baseUrl: String(raw.baseUrl || "").trim(),
    username: String(raw.username || "").trim(),
    applicationPassword: String(raw.applicationPassword || "").trim(),
    status: "draft"
  };
}

function getCurrentUiState() {
  return getClientUiState(getActiveClient()?.id || null);
}

mainView.addEventListener("submit", async (event) => {
  const briefForm = event.target.closest("form[data-brief-form]");
  if (briefForm) {
    event.preventDefault();
    const brief = String(new FormData(briefForm).get("brief") || "").trim();
    if (!brief) {
      setStatus("Please describe your business before continuing.", "error");
      return;
    }

    state.storage.draftBrief = brief;
    writeStorage();

    try {
      setStatus("Saving your business brief...");
      await submitBrief(brief);
    } catch (error) {
      setStatus(getFriendlyErrorMessage(error, "Saving the business brief failed."), "error");
    }
    return;
  }

  const strategyForm = event.target.closest("form[data-strategy-form]");
  if (strategyForm) {
    event.preventDefault();
    const client = getActiveClient();
    if (!client) return;

    const strategyDraft = readStrategyForm(strategyForm);

    try {
      setStatus("Saving strategy...");
      const result = await api(`/api/clients/${client.id}/strategy`, {
        method: "PATCH",
        body: JSON.stringify(strategyDraft)
      });

      updateClientUiState(client.id, {
        strategyDraft: normalizeStrategy(result.client?.strategyRecommendation || strategyDraft),
        strategyAccepted: true,
        strategyEditing: false,
        activeStep: "generate"
      });

      await refreshBootstrap();
      setStatus("Strategy saved. Moving into content generation.", "success");
      render();
    } catch (error) {
      setStatus(getFriendlyErrorMessage(error, "Saving strategy failed."), "error");
    }
    return;
  }

  const publishForm = event.target.closest("form[data-publish-target-form]");
  if (publishForm) {
    event.preventDefault();
    const client = getActiveClient();
    if (!client) return;

    const raw = Object.fromEntries(new FormData(publishForm).entries());
    updatePublishDraftFromForm(client.id, raw);

    try {
      setStatus("Connecting publish channel...");
      await api(`/api/clients/${client.id}/publish-targets`, {
        method: "POST",
        body: JSON.stringify({
          name: String(raw.name || "").trim(),
          platform: String(raw.platform || "wordpress"),
          autoPublish: false,
          config: buildPublishConfig(raw)
        })
      });

      updateClientUiState(client.id, {
        publishFormOpen: false,
        publishReady: true,
        activeStep: "publish"
      });
      await refreshBootstrap();
      setStatus("Publish channel connected.", "success");
      render();
    } catch (error) {
      setStatus(getFriendlyErrorMessage(error, "Connecting publish channel failed."), "error");
    }
  }
});

mainView.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action], [data-preview-tab]");
  if (!button) return;

  const client = getActiveClient();
  const uiState = getCurrentUiState();

  if (button.dataset.previewTab) {
    updateClientUiState(client?.id || null, { previewTab: button.dataset.previewTab });
    render();
    return;
  }

  const action = button.dataset.action;

  if (action === "accept-strategy" && client) {
    updateClientUiState(client.id, {
      strategyAccepted: true,
      strategyEditing: false,
      activeStep: "generate"
    });
    render();
    return;
  }

  if (action === "edit-strategy" && client) {
    updateClientUiState(client.id, { strategyEditing: true });
    render();
    return;
  }

  if (action === "cancel-strategy-edit" && client) {
    updateClientUiState(client.id, {
      strategyEditing: false,
      strategyDraft: normalizeStrategy(client.strategyRecommendation)
    });
    render();
    return;
  }

  if (action === "generate-content" && client) {
    try {
      startGenerateLoading(client.id);
      render();
      const [result] = await Promise.all([
        api(`/api/clients/${client.id}/generate-all`, { method: "POST" }),
        wait(2800)
      ]);

      stopGenerateLoading();
      updateClientUiState(client.id, {
        generationComplete: true,
        previewApproved: false,
        previewTab: uiState.previewTab || "landing",
        activeStep: "preview"
      });

      state.bootstrap.clients = (state.bootstrap.clients || []).map((item) =>
        item.id === client.id ? result.client : item
      );
      await refreshBootstrap();
      setStatus("Content pack generated.", "success");
      render();
    } catch (error) {
      stopGenerateLoading();
      render();
      setStatus(getFriendlyErrorMessage(error, "Generating content failed."), "error");
    }
    return;
  }

  if (action === "approve-preview" && client) {
    updateClientUiState(client.id, {
      previewApproved: true,
      activeStep: "publish"
    });
    render();
    return;
  }

  if (action === "go-back-generate" && client) {
    updateClientUiState(client.id, { activeStep: "generate" });
    render();
    return;
  }

  if (action === "open-publish-form" && client) {
    updateClientUiState(client.id, { publishFormOpen: true });
    render();
    return;
  }

  if (action === "publish-now" && client) {
    try {
      setStatus("Publishing your site...");
      await api(`/api/clients/${client.id}/publish`, {
        method: "POST",
        body: JSON.stringify({})
      });

      const publishedUrl = getPublishUrl(client, uiState);
      updateClientUiState(client.id, {
        published: true,
        publishedUrl,
        activeStep: "publish"
      });
      await refreshBootstrap();
      setStatus("Your site is live.", "success");
      render();
    } catch (error) {
      setStatus(getFriendlyErrorMessage(error, "Publishing failed."), "error");
    }
  }
});

stepList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-step-nav]");
  if (!button || state.loadingGenerate) return;

  const targetStep = button.dataset.stepNav;
  const client = getActiveClient();
  const uiState = getCurrentUiState();
  const reachableIndex = STEP_ORDER.indexOf(getDerivedStep(client, uiState));
  const targetIndex = STEP_ORDER.indexOf(targetStep);

  if (targetIndex === -1 || targetIndex > Math.max(reachableIndex, STEP_ORDER.indexOf(uiState.activeStep || "client"))) {
    return;
  }

  updateClientUiState(client?.id || null, {
    activeStep: targetStep
  });
  render();
});

clientSwitcher.addEventListener("change", () => {
  const selectedId = Number(clientSwitcher.value || 0) || null;
  state.activeClientId = selectedId;
  state.storage.activeClientId = selectedId;
  writeStorage();
  render();
});

logoutButton.addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    // Ignore logout API failures and clear client state anyway.
  }

  stopGenerateLoading();
  clearAuthenticated();
  localStorage.removeItem(WORKFLOW_STORAGE_KEY);
  redirectTo("/login");
});

newWebsiteButton?.addEventListener("click", () => {
  redirectTo("/welcome?mode=new-client");
});

async function init() {
  try {
    setStatus("Loading workspace...");
    await refreshBootstrap();
    setStatus("");
    render();
  } catch (error) {
    setStatus(getFriendlyErrorMessage(error, "Loading workspace failed."), "error");
  }
}

init();
