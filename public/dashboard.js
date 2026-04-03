const state = {
  bootstrap: null,
  activeClientId: null,
<<<<<<< HEAD
=======
  sidebarQuery: "",
  sidebarSection: "workspace",
  openPopover: null,
  previewTabs: {},
  previewDevices: {},
  setupModes: {},
  generatingClients: {},
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
  tourActive: false,
  tourStepIndex: 0,
  tourInitialized: false,
  lumixHidden: false
};

const summaryGrid = document.getElementById("summary-grid");
const clientsList = document.getElementById("clients-list");
const clientsCaption = document.getElementById("clients-caption");
const agencyTitle = document.getElementById("agency-title");
const agencySubtitle = document.getElementById("agency-subtitle");
const statusBanner = document.getElementById("status-banner");
const teamList = document.getElementById("team-list");
const reportHistory = document.getElementById("report-history");
const jobsList = document.getElementById("jobs-list");
const lumixCodex = document.getElementById("lumix-codex");
const lumixSummary = document.getElementById("lumix-summary");
const activeClientView = document.getElementById("active-client-view");
<<<<<<< HEAD
=======
const workspaceRail = document.getElementById("workspace-rail");
const clientAdvancedView = document.getElementById("client-advanced-view");
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
const lumixCoach = document.getElementById("lumix-coach");
const lumixButton = document.getElementById("lumix-button");
const activeClientSelect = document.getElementById("active-client-select");
const primaryGenerateButton = document.getElementById("primary-generate-button");
const lumixActionState = new Map();
const lumixAssistState = new Map();
const previewTabState = new Map();
let guideHighlightTimeout = null;
const lumixTourStorageKey = "lumix-tour-dismissed-v1";
const lumixHiddenStorageKey = "lumix-hidden-v1";
const workspaceSections = new Set(["dashboard", "client", "strategy", "generate", "preview", "publish"]);

function getIntakeCatalog() {
  return (
    state.bootstrap?.lumix?.catalog || {
      businessType: [],
      offerType: [],
      audienceType: [],
      goalType: [],
      toneType: [],
      pricePosition: []
    }
  );
}

function setStatus(message) {
  statusBanner.textContent = message || "";
  statusBanner.classList.toggle("is-visible", Boolean(message));
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Request failed";
}

async function runAction(pendingMessage, action) {
  setStatus(pendingMessage);

  try {
    await action();
  } catch (error) {
    setStatus(getErrorMessage(error));
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(isoString) {
  if (!isoString) return "Ei vielä";
  return new Date(isoString).toLocaleString();
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

function buildPublishConfig(raw) {
  const entries = Object.entries({
    baseUrl: String(raw.baseUrl || "").trim(),
    username: String(raw.username || "").trim(),
    applicationPassword: String(raw.applicationPassword || "").trim(),
    status: String(raw.status || "").trim(),
    apiToken: String(raw.apiToken || "").trim(),
    siteId: String(raw.siteId || "").trim(),
    collectionId: String(raw.collectionId || "").trim()
  }).filter(([, value]) => value);

  return Object.fromEntries(entries);
}

function formatClientCount(count) {
  return `${count} ${count === 1 ? "asiakas" : "asiakasta"}`;
}

<<<<<<< HEAD
=======
function getInitials(...parts) {
  return parts
    .join(" ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((value) => value[0]?.toUpperCase() || "")
    .join("");
}

function getDisplayName(value) {
  const raw = String(value || "").trim();
  if (!raw) return "EasyOnlinePresence user";
  if (!raw.includes("@")) return raw;
  return raw.split("@")[0];
}

function getFilteredClients(clients) {
  const query = state.sidebarQuery.trim().toLowerCase();
  if (!query) return clients;

  return clients.filter((client) => {
    const haystack = [
      client.businessName,
      client.description,
      client.billingStatus,
      getCurrentFlowStep(client)?.title || "",
      client.strategyRecommendation?.summary || ""
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

function syncSidebarActiveState() {
  document.querySelectorAll("[data-sidebar-target]").forEach((element) => {
    const target = element.dataset.sidebarTarget;
    const active = target === state.sidebarSection;
    if (element.classList.contains("sidebar-nav-item")) {
      element.classList.toggle("sidebar-nav-item-active", active);
    }
    if (element.id === "new-client-trigger") {
      element.classList.toggle("dashboard-sidebar-cta-active", active);
    }
  });
}

function getWorkspaceSectionLabel(section) {
  const labels = {
    dashboard: "Website",
    client: "Brief",
    strategy: "Direction",
    generate: "Generate",
    preview: "Website",
    publish: "Publish"
  };

  return labels[section] || "Dashboard";
}

function getCurrentWorkspaceSection(client) {
  if (workspaceSections.has(state.sidebarSection)) return state.sidebarSection;

  if (!client) return "dashboard";
  return "dashboard";
}

function getSectionFromGuideTarget(target) {
  if (!target) return null;
  if (target.includes("new-client")) return "new-client";
  if (target.includes("advanced")) return "advanced";
  if (target.includes("clients")) return "client";
  if (target.includes("intake")) return "strategy";
  if (target.includes("generate")) return "generate";
  if (target.includes("preview")) return "preview";
  if (target.includes("publish")) return "publish";
  if (target.includes("workflow") || target.includes("core-flow")) return "dashboard";
  if (target.includes("leads")) return "publish";
  return null;
}

function focusSidebarSection(section, options = {}) {
  if (!section) return;

  if (section === "new-client") {
    openDrawer("new-client");
    return;
  }

  if (section === "advanced") {
    openDrawer("advanced");
    return;
  }

  state.sidebarSection = section;
  syncSidebarActiveState();
  if (options.render !== false) {
    render();
  }
}

const magicLocationSignals = [
  "Finland",
  "Helsinki",
  "Espoo",
  "Tampere",
  "Turku",
  "Nordics",
  "Europe",
  "Remote",
  "Online"
];

const magicPageLabels = {
  hero: "Hero",
  services: "Services",
  "service-area": "Service area",
  proof: "Proof",
  cta: "CTA",
  problem: "Problem",
  offer: "Offer",
  story: "Story",
  bestsellers: "Best sellers",
  benefits: "Benefits",
  solution: "Solution",
  "how-it-works": "How it works",
  faq: "FAQ",
  process: "Process",
  insights: "Insights",
  reviews: "Reviews"
};

const magicStopWords = new Set([
  "a",
  "an",
  "and",
  "build",
  "business",
  "for",
  "from",
  "grow",
  "help",
  "helps",
  "in",
  "into",
  "of",
  "on",
  "our",
  "that",
  "the",
  "their",
  "to",
  "want",
  "we",
  "who",
  "with",
  "your"
]);

const magicTopicPatterns = [
  {
    pattern: /\b(kitchen|cabinet|remodel|renovat)/i,
    topic: "kitchen renovation",
    category: "Kitchen renovation services",
    name: "Kitchen Renovation"
  },
  {
    pattern: /\b(marketing|seo|content|landing page|ads|campaign)/i,
    topic: "marketing growth",
    category: "Marketing growth services",
    name: "Marketing Growth"
  },
  {
    pattern: /\b(saas|software|platform|app|workflow|automation)/i,
    topic: "workflow software",
    category: "Workflow software",
    name: "Workflow"
  },
  {
    pattern: /\b(shop|store|ecommerce|product|products|skincare|jewelry|fashion)/i,
    topic: "online store growth",
    category: "Ecommerce brand",
    name: "Growth Store"
  },
  {
    pattern: /\b(salon|spa|wellness|beauty|facial|clinic|hair|skin)/i,
    topic: "wellness services",
    category: "Wellness and beauty services",
    name: "Wellness"
  },
  {
    pattern: /\b(coach|consult|advisor|creator|personal brand|speaker|mentor)/i,
    topic: "expert consulting",
    category: "Expert-led service",
    name: "Expert Studio"
  }
];

function toTitleCase(value) {
  return String(value || "")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeBrief(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getCatalogLabel(group, value) {
  const option = getIntakeCatalog()[group]?.find((item) => item.value === value);
  return option?.label || toTitleCase(value) || "Not set";
}

function extractGeoFocus(brief) {
  const normalized = normalizeBrief(brief);
  const knownMatch = magicLocationSignals.find((location) =>
    normalized.toLowerCase().includes(location.toLowerCase())
  );

  if (knownMatch) return knownMatch;

  const locationMatch = normalized.match(
    /\b(?:in|across|throughout|serving)\s+([A-Z][A-Za-z-]+(?:\s+[A-Z][A-Za-z-]+){0,2})\b/
  );

  return locationMatch?.[1] || "";
}

function detectMagicProfile(brief) {
  const lower = normalizeBrief(brief).toLowerCase();
  let businessType = "b2b_service";
  let offerType = "service";
  let audienceType = "small_businesses";
  let goalType = "lead_generation";
  let toneType = "trusted";
  let pricePosition = "standard";

  if (/\b(saas|software|platform|app|workflow|automation)\b/.test(lower)) {
    businessType = "saas";
    offerType = "subscription";
    audienceType = /\b(enterprise|large team|large teams)\b/.test(lower) ? "enterprise" : "small_businesses";
    goalType = /\b(pricing|trial|signup|sign up|buy|purchase)\b/.test(lower) ? "sales" : "lead_generation";
    toneType = "trusted";
  } else if (/\b(shop|store|ecommerce|product|products|skincare|fashion|jewelry)\b/.test(lower)) {
    businessType = "ecommerce";
    offerType = "product";
    audienceType = "consumers";
    goalType = "sales";
    toneType = "friendly";
  } else if (/\b(salon|spa|wellness|beauty|clinic|facial|hair|skin)\b/.test(lower)) {
    businessType = "wellness_beauty";
    offerType = "service";
    audienceType = "local_customers";
    goalType = "bookings";
    toneType = "premium";
  } else if (/\b(coach|consult|advisor|creator|mentor|speaker|personal brand)\b/.test(lower)) {
    businessType = "creator_personal_brand";
    offerType = /\b(course|membership|cohort)\b/.test(lower) ? "course" : "consultation";
    audienceType = /\b(teams|companies|businesses|founders)\b/.test(lower) ? "small_businesses" : "consumers";
    goalType = "lead_generation";
    toneType = "trusted";
  } else if (
    /\b(homeowners|local|renovat|plumb|roof|electric|cleaning|landscap|contractor|kitchen)\b/.test(lower)
  ) {
    businessType = "local_service";
    offerType = "service";
    audienceType = /\b(homeowners|families|residents)\b/.test(lower) ? "local_customers" : "consumers";
    goalType = /\b(book|visit|appointment|consultation)\b/.test(lower) ? "bookings" : "lead_generation";
    toneType = "trusted";
  } else if (/\b(b2b|company|companies|businesses|teams|founders)\b/.test(lower)) {
    businessType = "b2b_service";
    offerType = /\b(platform|software|tool)\b/.test(lower) ? "subscription" : "service";
    audienceType = /\b(enterprise|large team|large teams)\b/.test(lower) ? "enterprise" : "small_businesses";
    goalType = "lead_generation";
    toneType = "trusted";
  }

  if (/\b(premium|luxury|high-end|exclusive)\b/.test(lower)) {
    pricePosition = "premium";
    toneType = businessType === "local_service" ? "premium" : toneType;
  } else if (/\b(affordable|budget|low-cost)\b/.test(lower)) {
    pricePosition = "affordable";
  }

  if (/\b(awareness|visibility|reach)\b/.test(lower)) {
    goalType = "awareness";
  } else if (/\b(book|appointment|reserve|consultation)\b/.test(lower)) {
    goalType = "bookings";
  } else if (/\b(shop|buy|order|sales|sell|checkout)\b/.test(lower)) {
    goalType = "sales";
  }

  if (/\b(enterprise|it teams|procurement)\b/.test(lower)) {
    audienceType = "enterprise";
  } else if (/\b(homeowners|families|residents|locals)\b/.test(lower)) {
    audienceType = businessType === "local_service" ? "local_customers" : "consumers";
  } else if (/\b(consumers|shoppers|customers)\b/.test(lower)) {
    audienceType = "consumers";
  }

  return {
    businessType,
    offerType,
    audienceType,
    goalType,
    toneType,
    pricePosition
  };
}

function getMagicTopicProfile(brief) {
  const normalized = normalizeBrief(brief);
  return magicTopicPatterns.find(({ pattern }) => pattern.test(normalized)) || null;
}

function deriveMagicBusinessName(brief, businessType, topicProfile) {
  if (topicProfile?.name) {
    const suffixByType = {
      local_service: "Studio",
      b2b_service: "Partners",
      creator_personal_brand: "Studio",
      ecommerce: "Store",
      saas: "Cloud",
      wellness_beauty: "Studio"
    };

    return `${topicProfile.name} ${suffixByType[businessType] || "Studio"}`.trim();
  }

  const cleaned = normalizeBrief(brief)
    .replace(/^we\s+(help|build|create|offer|provide|sell)\s+/i, "")
    .replace(/^i\s+(help|build|create|offer|provide)\s+/i, "");

  const seed = cleaned
    .split(/[^A-Za-z0-9]+/)
    .filter((part) => part && !magicStopWords.has(part.toLowerCase()))
    .slice(0, 3)
    .map((part) => toTitleCase(part))
    .join(" ");

  return seed || "New Business";
}

function buildMagicAudience(brief, audienceType, geoFocus) {
  const lower = normalizeBrief(brief).toLowerCase();

  if (/\bhomeowners\b/.test(lower)) {
    return geoFocus ? `Homeowners in ${geoFocus}` : "Homeowners planning a project";
  }
  if (/\bfounders\b/.test(lower)) {
    return "Founders and lean growth teams";
  }
  if (/\bmarketers\b|\bmarketing teams\b/.test(lower)) {
    return "Marketing teams looking for faster execution";
  }
  if (/\bsmall businesses\b|\bsmall business\b/.test(lower)) {
    return "Small businesses that need a clearer funnel";
  }
  if (/\benterprise\b|\benterprises\b/.test(lower)) {
    return "Enterprise teams with longer buying cycles";
  }
  if (/\bconsumers\b|\bshoppers\b/.test(lower)) {
    return geoFocus ? `Consumers in ${geoFocus}` : "Consumers ready to compare options";
  }

  const label = getCatalogLabel("audienceType", audienceType);
  return geoFocus ? `${label} in ${geoFocus}` : label;
}

function buildMagicCategory(brief, businessType, topicProfile) {
  if (topicProfile?.category) return topicProfile.category;

  const label = getCatalogLabel("businessType", businessType);
  const cleaned = normalizeBrief(brief)
    .replace(/^we\s+(help|build|create|offer|provide|sell)\s+/i, "")
    .replace(/^i\s+(help|build|create|offer|provide)\s+/i, "")
    .slice(0, 48);

  return cleaned ? `${label} for ${cleaned}` : label;
}

function buildMagicHeadlines({ businessType, topic, audience, geoFocus }) {
  const place = geoFocus ? ` in ${geoFocus}` : "";

  if (businessType === "saas") {
    return [
      `Run ${topic} from one calmer workspace`,
      `A faster way for ${audience.toLowerCase()} to go live`,
      `Show value early and keep growth moving${place}`
    ];
  }

  if (businessType === "ecommerce") {
    return [
      `A clearer way to shop ${topic}`,
      `Built for ${audience.toLowerCase()} who want confidence before they buy`,
      `Turn product discovery into steady sales${place}`
    ];
  }

  if (businessType === "wellness_beauty") {
    return [
      `${toTitleCase(topic)} with a calmer booking flow`,
      `Make it easy for ${audience.toLowerCase()} to choose and book`,
      `A warmer brand experience that converts${place}`
    ];
  }

  if (businessType === "creator_personal_brand") {
    return [
      `Turn expertise into a clear offer`,
      `Help ${audience.toLowerCase()} trust you faster`,
      `A simple path from first visit to booked call${place}`
    ];
  }

  return [
    `${toTitleCase(topic)} for ${audience.toLowerCase()}`,
    `A clearer way to grow with ${topic}${place}`,
    `Build trust early and make the next step obvious`
  ];
}

function buildMagicPageStructure(businessType) {
  const structures = {
    local_service: ["hero", "services", "process", "proof", "service-area", "cta"],
    b2b_service: ["hero", "problem", "offer", "proof", "faq", "cta"],
    creator_personal_brand: ["hero", "story", "offer", "proof", "insights", "cta"],
    ecommerce: ["hero", "bestsellers", "benefits", "reviews", "faq", "cta"],
    saas: ["hero", "problem", "solution", "how-it-works", "proof", "cta"],
    wellness_beauty: ["hero", "services", "benefits", "proof", "faq", "cta"]
  };

  return (structures[businessType] || structures.b2b_service).map(
    (section) => magicPageLabels[section] || toTitleCase(section)
  );
}

function buildMagicCta(goalType, businessType) {
  if (goalType === "bookings") return "Book a consultation";
  if (goalType === "sales") return businessType === "ecommerce" ? "Shop the collection" : "Start free trial";
  if (goalType === "awareness") return "See how it works";
  if (businessType === "local_service") return "Request a quote";
  if (businessType === "saas") return "Start free trial";
  return "Book a demo";
}

function buildMagicKeywords(topic, audience, geoFocus) {
  const geoSuffix = geoFocus ? ` ${geoFocus}` : "";
  const audienceSlug = audience.toLowerCase().replace(/\bin\s+[a-z\s-]+$/i, "").trim();
  const keywords = [
    `${topic}${geoSuffix}`.trim(),
    `${topic} for ${audienceSlug}`.trim(),
    `${topic} services`.trim(),
    `${topic} strategy`.trim()
  ];

  return [...new Set(keywords)].slice(0, 4);
}

function buildMagicSetup(brief, overrides = {}) {
  const normalizedBrief = normalizeBrief(brief);
  const detected = detectMagicProfile(normalizedBrief);
  const topicProfile = getMagicTopicProfile(normalizedBrief);
  const businessType = overrides.businessType || detected.businessType;
  const offerType = overrides.offerType || detected.offerType;
  const audienceType = overrides.audienceType || detected.audienceType;
  const goalType = overrides.goalType || detected.goalType;
  const toneType = overrides.toneType || detected.toneType;
  const pricePosition = overrides.pricePosition || detected.pricePosition;
  const geoFocus = overrides.geoFocus || extractGeoFocus(normalizedBrief);
  const topic = topicProfile?.topic || getCatalogLabel("businessType", businessType).toLowerCase();
  const targetAudience = buildMagicAudience(normalizedBrief, audienceType, geoFocus);
  const businessCategory = buildMagicCategory(normalizedBrief, businessType, topicProfile);
  const headlineIdeas = buildMagicHeadlines({
    businessType,
    topic,
    audience: targetAudience,
    geoFocus
  });
  const suggestedPageStructure = buildMagicPageStructure(businessType);
  const ctaSuggestion = overrides.mainCta || buildMagicCta(goalType, businessType);
  const starterSeoKeywords = buildMagicKeywords(topic, targetAudience, geoFocus);
  const businessName = deriveMagicBusinessName(normalizedBrief, businessType, topicProfile);
  const customPrompt = [
    `Position this business as ${businessCategory.toLowerCase()}.`,
    `Focus on ${targetAudience.toLowerCase()}.`,
    `Use a ${getCatalogLabel("toneType", toneType).toLowerCase()} voice.`,
    `Lead toward the CTA "${ctaSuggestion}".`,
    `Weave in keywords like ${starterSeoKeywords.join(", ")}.`
  ].join(" ");

  return {
    brief: normalizedBrief,
    businessName,
    businessType,
    businessCategory,
    offerType,
    audienceType,
    targetAudience,
    goalType,
    toneType,
    pricePosition,
    geoFocus,
    headlineIdeas,
    suggestedPageStructure,
    ctaSuggestion,
    starterSeoKeywords,
    customPrompt
  };
}

function buildMagicIntakePayload(setup) {
  return {
    businessType: setup.businessType,
    offerType: setup.offerType,
    audienceType: setup.audienceType,
    goalType: setup.goalType,
    toneType: setup.toneType,
    geoFocus: setup.geoFocus,
    pricePosition: setup.pricePosition,
    mainCta: setup.ctaSuggestion,
    notes: [
      `Original brief: ${setup.brief}`,
      "",
      "Suggested headlines:",
      ...setup.headlineIdeas.map((idea) => `- ${idea}`),
      "",
      `Suggested page structure: ${setup.suggestedPageStructure.join(", ")}`,
      `Starter SEO keywords: ${setup.starterSeoKeywords.join(", ")}`
    ].join("\n")
  };
}

>>>>>>> e87dc7e (Redesign dashboard around website reveal)
function getActiveClient() {
  return state.bootstrap?.clients?.find((client) => client.id === state.activeClientId) || null;
}

function syncActiveClientId(clients) {
  if (!clients.length) {
    state.activeClientId = null;
    return;
  }

  const exists = clients.some((client) => client.id === state.activeClientId);
  if (!exists) {
    state.activeClientId = clients[0].id;
  }
}

function hasProfile(client) {
  const profile = client.businessProfile || {};
  return Boolean(
    client.intakeAnswers?.length ||
      profile.businessType ||
      profile.offerType ||
      profile.audienceType ||
      profile.goalType ||
      profile.toneType ||
      profile.pricePosition ||
      profile.geoFocus ||
      profile.mainCta ||
      profile.rawNotes?.notes
  );
}

function hasContent(client) {
  return Boolean(client.website?.html || client.blogs?.length || client.seo);
}

function getDefaultPreviewTab(client) {
  if (client.website?.headline || client.website?.subheadline || client.website?.html) {
    return "landing";
  }

  if (client.blogs?.length) {
    return "blog-0";
  }

  return "seo";
}

function getPreviewTabs(client) {
  const tabs = [{ id: "landing", label: "Landing" }];
  ensureArray(client.blogs).forEach((_blog, index) => {
    tabs.push({ id: `blog-${index}`, label: `Blog ${index + 1}` });
  });
  tabs.push({ id: "seo", label: "SEO" });
  return tabs;
}

function getActivePreviewTab(client) {
  const tabs = getPreviewTabs(client);
  const savedTab = previewTabState.get(client.id);
  if (tabs.some((tab) => tab.id === savedTab)) {
    return savedTab;
  }
  return getDefaultPreviewTab(client);
}

function stripHtmlPreview(html, maxLength = 240) {
  const text = String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function getLumixRuntime(client) {
  return (
    client?.lumix || {
      objectSummary: {},
      states: {
        strategy: { exists: Boolean(client?.strategyRecommendation), status: client?.strategyRecommendation ? "approved" : "missing" },
        contentPack: { exists: hasContent(client), status: hasContent(client) ? "generated" : "empty" }
      },
      actions: {
        recommend_strategy: { ready: false, reason: "" },
        generate_pack: { ready: false, reason: "" },
        publish_pack: { ready: false, reason: "" },
        review_leads: { ready: false, reason: "" }
      },
      nextStep: null
    }
  );
}

function openAncestorDetails(element) {
  let current = element?.parentElement || null;

  while (current) {
    if (current.tagName === "DETAILS") {
      current.open = true;
    }
    current = current.parentElement;
  }
}

function clearGuideHighlights() {
  document.querySelectorAll(".guide-highlight").forEach((element) => {
    element.classList.remove("guide-highlight");
  });
}

function highlightGuideTarget(selector) {
  if (!selector) return;
  const section = getSectionFromGuideTarget(selector);
  if (section && section !== state.sidebarSection && section !== "new-client" && section !== "advanced") {
    focusSidebarSection(section);
  } else if (section === "new-client" || section === "advanced") {
    focusSidebarSection(section);
  }

  const target = document.querySelector(selector);
  if (!target) return;

  openAncestorDetails(target);
  clearGuideHighlights();
  target.classList.add("guide-highlight");
  target.scrollIntoView({ behavior: "smooth", block: "center" });

  window.clearTimeout(guideHighlightTimeout);
  guideHighlightTimeout = window.setTimeout(() => {
    target.classList.remove("guide-highlight");
  }, 2400);
}

function getNextStep(client) {
  const runtime = getLumixRuntime(client);
  if (runtime.nextStep) {
    return runtime.nextStep;
  }

  if (!hasProfile(client)) {
    return {
      title: "Tee tämä seuraavaksi",
      text: "Täytä intake ja tallenna yrityksen tiedot."
    };
  }

  if (!hasContent(client)) {
    return {
      title: "Tee tämä seuraavaksi",
<<<<<<< HEAD
      text: "Paina Generoi kaikki. Lumix tekee strategian ja sisällön samalla."
=======
      text: "Paina Generate all. Lumi tekee koko paketin."
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
    };
  }

  if (!client.publishHistory.length) {
    return {
      title: "Tee tämä seuraavaksi",
      text: client.publishTargets.length
        ? "Esikatsele sisältö ja julkaise valmis paketti."
        : "Lisää ensin yksi julkaisukanava ja julkaise sitten valmis paketti."
    };
  }

  return {
    title: "Tämän jälkeen",
    text: "Seuraa liidejä ja päivitä sisältöä tarpeen mukaan."
  };
}

<<<<<<< HEAD
=======
function countCompletedSteps(client) {
  return getPrimaryFlowSteps(client).filter((step) => step.status === "completed").length;
}

function isCurrentStep(client, key) {
  return getCurrentFlowStep(client)?.key === key;
}

function getPublishReadiness(client) {
  if (!hasContent(client)) {
    return {
      ready: false,
      tone: "blocked",
      title: "Publish is blocked",
      text: "Generate the landing page, blog drafts and SEO package first.",
      target: "[data-guide='generate']"
    };
  }

  if (!client.publishTargets.length) {
    return {
      ready: false,
      tone: "blocked",
      title: "Publish is almost ready",
      text: "Add one publish channel in Publish settings to unlock go live.",
      target: "[data-guide='advanced']"
    };
  }

  if (client.publishHistory.length) {
    return {
      ready: true,
      tone: "live",
      title: "Published",
      text: `Last publish ${formatDate(client.publishHistory[0].createdAt)}.`,
      target: "[data-guide='publish']"
    };
  }

  return {
    ready: true,
    tone: "ready",
    title: "Ready to publish",
    text: `${client.publishTargets.length} publish ${client.publishTargets.length === 1 ? "channel is" : "channels are"} connected.`,
    target: "[data-guide='publish']"
  };
}

function getStepStatus(client, key) {
  return getPrimaryFlowSteps(client).find((step) => step.key === key)?.status || "upcoming";
}

function getSetupMode(client) {
  if (state.setupModes[client.id]) return state.setupModes[client.id];
  return client.strategyRecommendation ? "review" : "edit";
}

function getPreviewTab(client) {
  const tab = state.previewTabs[client.id];
  if (tab === "landing") return "website";
  return tab || "website";
}

function getPreviewDevice(client) {
  return state.previewDevices[client.id] || "desktop";
}

function renderStageAction(action, className = "") {
  if (!action) return "";

  const classes = className ? ` ${className}` : "";

  if (action.kind === "action") {
    return `<button type="button" class="${action.ghost ? "ghost-button" : ""}${classes}" data-action="${escapeHtml(action.action)}">${escapeHtml(action.label)}</button>`;
  }

  if (action.kind === "link") {
    return `<a class="${action.ghost ? "ghost-link" : "cta-link"}${classes}" href="${escapeHtml(action.href)}" target="${action.targetBlank ? "_blank" : "_self"}"${action.targetBlank ? ' rel="noopener"' : ""}>${escapeHtml(action.label)}</a>`;
  }

  if (action.kind === "toggle-setup") {
    return `<button type="button" class="${action.ghost ? "ghost-button" : ""}${classes}" data-setup-mode="${escapeHtml(action.mode)}">${escapeHtml(action.label)}</button>`;
  }

  if (action.kind === "drawer") {
    return `<button type="button" class="${action.ghost ? "ghost-button" : ""}${classes}" data-open-drawer="${escapeHtml(action.drawer)}">${escapeHtml(action.label)}</button>`;
  }

  return `<button type="button" class="${action.ghost ? "ghost-button" : ""}${classes}" data-flow-target="${escapeHtml(action.target)}">${escapeHtml(action.label)}</button>`;
}

function renderStageGate({
  number,
  title,
  description,
  readyItems = [],
  blocker,
  primaryAction,
  secondaryAction,
  tone = "current"
}) {
  const summaryItems = [
    ...readyItems.map((item) => ({ tone: "ready", label: item })),
    blocker ? { tone: "blocked", label: blocker } : null
  ].filter(Boolean);

  return `
    <div class="stage-gate stage-gate-${escapeHtml(tone)}">
      <div class="stage-gate-head">
        <div>
          <span class="section-kicker">${escapeHtml(`${number} / 5`)}</span>
          <h4>${escapeHtml(title)}</h4>
        </div>
        <span class="stage-gate-state stage-gate-state-${escapeHtml(tone)}">${escapeHtml(
          tone === "completed" ? "Completed" : tone === "upcoming" ? "Upcoming" : "Current"
        )}</span>
      </div>

      <p class="body-copy stage-gate-description">${escapeHtml(description)}</p>

      ${
        summaryItems.length
          ? `
            <div class="stage-gate-summary-strip">
              ${summaryItems
                .map(
                  (item) => `<span class="stage-gate-summary-pill stage-gate-summary-pill-${escapeHtml(item.tone)}">${escapeHtml(item.label)}</span>`
                )
                .join("")}
            </div>
          `
          : ""
      }

      <div class="stage-gate-actions">
        ${renderStageAction(primaryAction)}
        ${secondaryAction ? renderStageAction(secondaryAction) : ""}
      </div>
    </div>
  `;
}

function renderStageSummary({
  number,
  title,
  summary,
  status,
  primaryAction,
  secondaryAction
}) {
  return `
    <div class="workflow-stage workflow-stage-${escapeHtml(status)}">
      <div class="workflow-stage-summary">
        <div class="workflow-stage-summary-main">
          <span class="section-kicker">${escapeHtml(`${number} / 5`)}</span>
          <strong>${escapeHtml(title)}</strong>
          <p>${escapeHtml(summary)}</p>
        </div>
        <div class="workflow-stage-summary-side">
          <span class="workflow-stage-summary-state workflow-stage-summary-state-${escapeHtml(status)}">${escapeHtml(
            status === "completed" ? "Completed" : "Upcoming"
          )}</span>
          <div class="workflow-stage-summary-actions">
            ${primaryAction ? renderStageAction(primaryAction, "workflow-stage-summary-button") : ""}
            ${secondaryAction ? renderStageAction(secondaryAction, "workflow-stage-summary-button") : ""}
          </div>
        </div>
      </div>
    </div>
  `;
}

function getWorkflowGuide(client) {
  const currentStep = getCurrentFlowStep(client);
  const completedSteps = countCompletedSteps(client);
  const publishReadiness = getPublishReadiness(client);

  if (!hasProfile(client)) {
    return {
      stateLabel: "Brief added",
      stateTone: "draft",
      heading: "Review setup",
      description: "Turn the brief into a usable setup so Lumi can build the strategy next.",
      helper: `Step ${currentStep.number} of 5. ${completedSteps}/5 completed.`,
      primaryAction: {
        kind: "focus",
        label: "Open setup",
        target: "[data-guide='intake']"
      },
      publishReadiness
    };
  }

  if (!hasSavedSetup(client)) {
    return {
      stateLabel: "Setup drafted",
      stateTone: "progress",
      heading: "Generate strategy",
      description: "Your business details are in place. Generate the Lumi setup before assets.",
      helper: `Step ${currentStep.number} of 5. ${completedSteps}/5 completed.`,
      primaryAction: {
        kind: "action",
        label: "Generate setup",
        action: "recommend"
      },
      publishReadiness
    };
  }

  if (!hasContent(client)) {
    return {
      stateLabel: "Strategy ready",
      stateTone: "ready",
      heading: "Generate assets",
      description: "Create the landing page, blog drafts and SEO package from the approved setup.",
      helper: `Step ${currentStep.number} of 5. ${completedSteps}/5 completed.`,
      primaryAction: {
        kind: "action",
        label: "Generate assets",
        action: "generate"
      },
      publishReadiness
    };
  }

  if (!client.publishHistory.length) {
    return {
      stateLabel: publishReadiness.ready ? "Publish ready" : "Assets generated",
      stateTone: publishReadiness.ready ? "ready" : "progress",
      heading: "Review preview",
      description: publishReadiness.ready
        ? "Assets are generated and publish is ready. Review the preview, then go live."
        : "Assets are generated. Review the preview and connect one publish channel next.",
      helper: publishReadiness.text,
      primaryAction: {
        kind: "link",
        label: "Review preview",
        href: `/client/${client.id}`
      },
      publishReadiness
    };
  }

  return {
    stateLabel: "Published",
    stateTone: "live",
    heading: "Review results",
    description: "The client is live. Track leads, review performance and refresh assets when needed.",
    helper: publishReadiness.text,
    primaryAction: {
      kind: "focus",
      label: "Open publish",
      target: "[data-guide='publish']"
    },
    publishReadiness
  };
}

function renderWorkflowFocusAction(client, guide) {
  const action = guide.primaryAction;

  if (!action) return "";

  if (action.kind === "action") {
    return `<button type="button" class="workflow-focus-button" data-action="${escapeHtml(action.action)}">${escapeHtml(action.label)}</button>`;
  }

  if (action.kind === "link") {
    return `<a class="cta-link workflow-focus-button" href="${escapeHtml(action.href)}" target="_blank" rel="noopener">${escapeHtml(action.label)}</a>`;
  }

  return `<button type="button" class="ghost-button workflow-focus-button" data-flow-target="${escapeHtml(action.target)}">${escapeHtml(action.label)}</button>`;
}

function renderStickyStageHeader(client) {
  const currentStep = getCurrentFlowStep(client);
  const guide = getWorkflowGuide(client);
  const nextStep = getNextStep(client);
  const completedSteps = countCompletedSteps(client);
  const publishReadiness = guide.publishReadiness;

  return `
    <section class="workflow-stage-header">
      <div class="workflow-stage-hero-top">
        <div class="workflow-stage-hero-copy">
          <span class="section-kicker">Aktiivinen asiakas</span>
          <h2>${escapeHtml(client.businessName)}</h2>
          <p class="body-copy workflow-stage-hero-description">${escapeHtml(client.description)}</p>
        </div>
        <div class="workflow-stage-hero-meta">
          <span class="client-status client-status-subtle">${escapeHtml(client.billingStatus)}</span>
          <span class="workflow-stage-badge">${escapeHtml(`Stage ${currentStep.number}/5`)}</span>
        </div>
      </div>

      <div class="workflow-stage-hero-body">
        <div class="workflow-status-card">
          <span>Current focus</span>
          <strong>${escapeHtml(guide.heading)}</strong>
          <p>${escapeHtml(guide.description)}</p>
        </div>

        <div class="workflow-hero-stat-grid">
          <article class="workflow-hero-stat">
            <span>Current step</span>
            <strong>${escapeHtml(currentStep.title)}</strong>
            <p>${escapeHtml(guide.stateLabel)}</p>
          </article>
          <article class="workflow-hero-stat">
            <span>Progress</span>
            <strong>${escapeHtml(`${completedSteps}/5`)}</strong>
            <p>${escapeHtml(`Completed steps in the workflow.`)}</p>
          </article>
          <article class="workflow-hero-stat">
            <span>Publish status</span>
            <strong>${escapeHtml(publishReadiness.title)}</strong>
            <p>${escapeHtml(truncateText(publishReadiness.text, 88))}</p>
          </article>
        </div>
      </div>

      <div class="workflow-stage-header-summary">
        <span class="workflow-header-pill workflow-header-pill-primary">${escapeHtml(`Now: ${guide.stateLabel}`)}</span>
        <span class="workflow-header-pill workflow-header-pill-muted">${escapeHtml(nextStep.text)}</span>
      </div>

      <div class="workflow-stage-header-actions">
        ${renderWorkflowFocusAction(client, guide)}
      </div>
    </section>
  `;
}

function getPrimaryFlowSteps(client) {
  if (!client) {
    return [
      {
        key: "brief",
        number: 1,
        title: "Lisää asiakas",
        status: "current",
        text: "Kirjoita yksi lyhyt business-kuvaus.",
        target: "[data-guide='new-client']"
      },
      {
        key: "setup",
        number: 2,
        title: "Setup",
        status: "upcoming",
        text: "Lumi ehdottaa rakennetta ja CTA:ta.",
        target: "[data-guide='intake']"
      },
      {
        key: "generate",
        number: 3,
        title: "Generate all",
        status: "upcoming",
        text: "Luo sivu, blogit ja SEO yhdellä klikillä.",
        target: "[data-guide='generate']"
      },
      {
        key: "preview",
        number: 4,
        title: "Näe lopputulos",
        status: "upcoming",
        text: "Tarkista valmis paketti ennen julkaisua.",
        target: "[data-guide='preview']"
      },
      {
        key: "publish",
        number: 5,
        title: "Publish",
        status: "upcoming",
        text: "Julkaise valmis sisältö ulos.",
        target: "[data-guide='publish']"
      }
    ];
  }

  const setupReady = hasSavedSetup(client);
  const contentReady = hasContent(client);
  const published = Boolean(client.publishHistory.length);
  const publishTarget = client.publishTargets.length ? "[data-guide='publish']" : "[data-guide='advanced']";

  const currentKey = !setupReady
    ? "setup"
    : !contentReady
      ? "generate"
      : !published && !client.publishTargets.length
        ? "preview"
        : "publish";

  const steps = [
    {
      key: "brief",
      number: 1,
      title: "Asiakas",
      text: `${client.businessName} on aktiivinen työtila.`,
      target: "[data-guide='clients']"
    },
    {
      key: "setup",
      number: 2,
      title: "Setup",
      text: setupReady
        ? "Setup tallennettu."
        : "Tarkista ja tallenna setup.",
      target: "[data-guide='intake']"
    },
    {
      key: "generate",
      number: 3,
      title: "Generate all",
      text: contentReady
        ? `Paketti valmis${client.lastGenerationAt ? ` ${formatDate(client.lastGenerationAt)}` : ""}.`
        : "Luo koko paketti yhdellä klikillä.",
      target: "[data-guide='generate']"
    },
    {
      key: "preview",
      number: 4,
      title: "Preview",
      text: contentReady
        ? published
          ? "Valmis paketti on jo julkaistu."
          : client.publishTargets.length
            ? "Preview tarkistettu. Siirry publishiin."
            : "Tarkista valmis paketti ennen julkaisua."
        : "Lopputulos näkyy tässä vasta generoinnin jälkeen.",
      target: "[data-guide='preview']"
    },
    {
      key: "publish",
      number: 5,
      title: "Publish",
      text: published
        ? `Julkaistu${client.publishHistory[0]?.createdAt ? ` ${formatDate(client.publishHistory[0].createdAt)}` : ""}.`
        : client.publishTargets.length
          ? "Julkaise valmis sisältö tästä vaiheesta."
          : "Lisää ensin yksi publish-kanava.",
      target: publishTarget
    }
  ];

  return steps.map((step) => ({
    ...step,
    status:
      step.key === "brief"
        ? "completed"
        : step.key === "setup" && setupReady
          ? "completed"
          : step.key === "generate" && contentReady
            ? "completed"
            : step.key === "preview" && (published || (contentReady && client.publishTargets.length))
              ? "completed"
              : step.key === "publish" && published
                ? "completed"
                : step.key === currentKey
                  ? "current"
                  : "upcoming"
  }));
}

function getCurrentFlowStep(client) {
  const steps = getPrimaryFlowSteps(client);
  return steps.find((step) => step.status === "current") || steps[0];
}

function renderFlowRail(client) {
  const steps = getPrimaryFlowSteps(client);
  const firstUpcomingIndex = steps.findIndex((step) => step.status === "upcoming");

  return `
    ${steps
      .map(
        (step, index) => `
          <button
            type="button"
            class="rail-flow-item rail-flow-item-${step.status}"
            data-flow-target="${escapeHtml(step.target)}"
          >
            <span class="rail-flow-line rail-flow-line-${index === steps.length - 1 ? "end" : "run"}" aria-hidden="true"></span>
            <span class="rail-flow-marker">${step.status === "completed" ? "✓" : step.number}</span>
            <span class="rail-flow-content">
              <span class="rail-flow-title-row">
                <strong>${escapeHtml(step.title)}</strong>
                <span class="rail-flow-state rail-flow-state-${step.status}">${escapeHtml(
                  step.status === "completed"
                    ? "Done"
                    : step.status === "current"
                      ? "Now"
                      : index === firstUpcomingIndex
                        ? "Next"
                        : "Later"
                )}</span>
              </span>
              <span class="rail-flow-copy">${escapeHtml(step.text)}</span>
            </span>
          </button>
        `
      )
      .join("")}
  `;
}

>>>>>>> e87dc7e (Redesign dashboard around website reveal)
function getTourSteps(client) {
  const steps = [
    {
      title: "Asiakkaat",
      text: "Täältä valitset aina yhden asiakkaan kerrallaan.",
      target: "[data-guide='clients']"
    },
    {
<<<<<<< HEAD
      title: "Uusi asiakas",
      text: "Tämä on aloituskohta. Lisää nimi ja kuvaus. Muut asetukset voi avata myöhemmin.",
=======
      title: "Tell us about your business",
      text: "Tämä on aloituskohta. Kirjoita yksi business-kuvaus ja Lumi muodostaa setupin.",
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
      target: "[data-guide='new-client']"
    }
  ];

  if (client) {
    steps.push(
      {
        title: "Yrityksen tiedot",
        text: "Tähän tallennat mitä myydään, kenelle ja mikä on tärkein tavoite.",
        target: "[data-guide='intake']"
      },
      {
<<<<<<< HEAD
        title: "Generoi kaikki",
        text: "Tämä on päätoiminto. Lumix tekee strategian, sivun, blogit ja SEO:n samalla.",
=======
        title: "Generate all",
        text: "Tämä on päätoiminto. Lumi tekee sivun, blogit ja SEO:n samalla.",
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
        target: "[data-guide='generate']"
      },
      {
        title: "Esikatsele sisältö",
        text: "Täältä tarkistat sivun, blogit ja SEO:n ennen julkaisua.",
        target: "[data-guide='preview']"
      },
      {
        title: "Julkaise",
        text: "Kun sisältö on valmis, julkaisu tehdään tästä.",
        target: "[data-guide='publish']"
      }
    );
  } else {
    steps.push({
      title: "Työalue",
      text: "Kun ensimmäinen asiakas on luotu, varsinainen flow näkyy tässä.",
      target: "[data-guide='workflow']"
    });
  }

  steps.push({
    title: "Muut asetukset",
    text: "Harvemmin tarvittavat asetukset ja tekninen puoli ovat täällä erillään pääflow’sta.",
    target: "[data-guide='more-settings']"
  });

  return steps.filter((step) => document.querySelector(step.target));
}

function finishTour() {
  state.tourActive = false;
  state.tourStepIndex = 0;
  window.localStorage.setItem(lumixTourStorageKey, "1");
  clearGuideHighlights();
}

function activateLumix() {
  state.lumixHidden = false;
  window.localStorage.setItem(lumixHiddenStorageKey, "0");
  const activeClient = getActiveClient();
  const coach = getCoachState(activeClient);

  if (state.tourActive) {
    const tourSteps = getTourSteps(activeClient);
    const step = tourSteps[Math.min(state.tourStepIndex, Math.max(tourSteps.length - 1, 0))];

    if (step?.target) {
      highlightGuideTarget(step.target);
      return;
    }
  }

  if (coach?.target) {
    renderCoach(activeClient);
    highlightGuideTarget(coach.target);
    return;
  }
}

function getCoachState(client) {
  if (!client) {
    return {
<<<<<<< HEAD
      title: "Lumix",
      text: "Lumix toimii tässä dashboardissa. Luo ensin yksi asiakas, niin ohjaan seuraavaan kohtaan.",
      target: "#client-form"
=======
      title: "Lumi",
      text: "Lumi toimii tässä dashboardissa. Luo ensin yksi asiakas, niin ohjaan seuraavaan kohtaan.",
      target: "[data-guide='new-client']"
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
    };
  }

  if (!hasProfile(client)) {
    return {
<<<<<<< HEAD
      title: "Lumix",
      text: "Täytä ensin yrityksen tiedot ja tallenna ne.",
=======
      title: "Lumi",
      text: "Täytä ensin tiedot ja tallenna ne.",
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
      target: "[data-guide='intake']"
    };
  }

  if (!client.strategyRecommendation) {
    return {
      title: "Lumix",
      text: "Seuraava klikki on ehdotukseen. Sillä saat hyvän suunnan ennen generointia.",
      target: "[data-guide='recommend']"
    };
  }

  if (!hasContent(client)) {
    return {
<<<<<<< HEAD
      title: "Lumix",
      text: "Nyt voit generoida sivun, blogit ja SEO:n yhdellä napilla.",
=======
      title: "Lumi",
      text: "Seuraava klikki on Generate all. Sillä syntyy koko paketti yhdellä kertaa.",
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
      target: "[data-guide='generate']"
    };
  }

  if (!client.publishTargets.length) {
    return {
<<<<<<< HEAD
      title: "Lumix",
      text: "Lisää ensin yksi julkaisukanava lisäasetuksista.",
      target: "[data-guide='publish-settings']"
=======
      title: "Lumi",
      text: "Näe lopputulos ja lisää sitten yksi publish-kanava lisäasetuksista.",
      target: "[data-guide='advanced']"
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
    };
  }

  if (!client.publishHistory.length) {
    return {
<<<<<<< HEAD
      title: "Lumix",
      text: "Sisältö on valmis. Seuraava klikki on julkaisu.",
=======
      title: "Lumi",
      text: "Lopputulos on valmis. Seuraava klikki on Publish.",
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
      target: "[data-guide='publish']"
    };
  }

  return {
    title: "Lumi",
    text: "Nyt seuraa liidejä ja katso mikä toimii parhaiten.",
    target: "[data-guide='leads']"
  };
}

function getLumixAssistState(clientId) {
  return (
    lumixAssistState.get(clientId) || {
      reply: "",
      suggestedUpdates: null
    }
  );
}

async function requestLumixAssist(clientId, message, pendingMessage = "Lumi miettii ideaa...") {
  const result = await api(`/api/clients/${clientId}/lumix-assist`, {
    method: "POST",
    body: JSON.stringify({ message })
  });

  lumixAssistState.set(clientId, {
    reply: result.assist?.reply || "",
    suggestedUpdates: result.assist?.suggestedUpdates || null
  });

  render();
  renderCoach(getActiveClient());
  return result;
}

function buildIntakePayloadFromClient(client, overrides = {}) {
  const profile = client.businessProfile || {};

  return {
    businessType: overrides.businessType ?? profile.businessType ?? "",
    offerType: overrides.offerType ?? profile.offerType ?? "",
    audienceType: overrides.audienceType ?? profile.audienceType ?? "",
    goalType: overrides.goalType ?? profile.goalType ?? "",
    toneType: overrides.toneType ?? profile.toneType ?? "",
    geoFocus: overrides.geoFocus ?? profile.geoFocus ?? "",
    pricePosition: overrides.pricePosition ?? profile.pricePosition ?? "",
    mainCta: overrides.mainCta ?? profile.mainCta ?? "",
    notes: overrides.notes ?? profile.rawNotes?.notes ?? ""
  };
}

function renderCoach(client) {
  if (state.lumixHidden) {
    lumixCoach.innerHTML = `
      <button type="button" class="lumix-coach-toggle" data-coach-action="expand">
        <span class="lumix-coach-avatar">L</span>
        <span>Lumi</span>
      </button>
    `;
    return;
  }

  const tourSteps = getTourSteps(client);
  if (state.tourActive && tourSteps.length) {
    const currentIndex = Math.min(state.tourStepIndex, tourSteps.length - 1);
    const step = tourSteps[currentIndex];

    lumixCoach.innerHTML = `
      <div class="lumix-coach-card">
        <div class="lumix-coach-head">
          <span class="lumix-coach-avatar">L</span>
          <div>
            <strong>Lumi opastus</strong>
            <p>Kohta ${currentIndex + 1} / ${tourSteps.length}</p>
          </div>
          <button type="button" class="ghost-button lumix-coach-hide" data-coach-action="collapse">Piilota</button>
        </div>
        <div class="lumix-coach-step">
          <strong>${escapeHtml(step.title)}</strong>
          <p class="lumix-coach-text">${escapeHtml(step.text)}</p>
        </div>
        <div class="lumix-coach-actions">
          <button
            type="button"
            class="ghost-button"
            data-coach-action="prev"
            ${currentIndex === 0 ? "disabled" : ""}
          >
            Edellinen
          </button>
          <button
            type="button"
            class="ghost-button"
            data-coach-action="focus"
            data-target="${escapeHtml(step.target)}"
          >
            Näytä kohta
          </button>
          <button type="button" data-coach-action="${currentIndex === tourSteps.length - 1 ? "finish" : "next"}">
            ${currentIndex === tourSteps.length - 1 ? "Valmis" : "Seuraava"}
          </button>
        </div>
        <button type="button" class="ghost-button lumix-coach-dismiss" data-coach-action="stop">
          Lopeta opastus
        </button>
      </div>
    `;
    return;
  }

  const coach = getCoachState(client);
  const assist = client ? getLumixAssistState(client.id) : { reply: "", suggestedUpdates: null };
  const hasAssistReply = Boolean(assist.reply);

  lumixCoach.innerHTML = `
    <div class="lumix-coach-card">
      <div class="lumix-coach-head">
        <span class="lumix-coach-avatar">L</span>
        <div>
          <strong>${escapeHtml(coach.title)}</strong>
          <p>Hiljainen apu seuraavaan kohtaan.</p>
        </div>
        <button type="button" class="ghost-button lumix-coach-hide" data-coach-action="collapse">Piilota</button>
      </div>
      <p class="lumix-coach-text">${escapeHtml(coach.text)}</p>
      ${
        client
          ? `
            <form class="lumix-coach-form" data-lumix-form data-client-id="${client.id}">
              <label>
                <span>Kirjoita idea Lumille</span>
                <textarea
                  name="message"
                  rows="3"
                  placeholder="Esim. tee tästä premiumimpi, kohdenna hotelleille ja tee CTA tarjouspyyntöön."
                  required
                ></textarea>
              </label>
              <button type="submit">Kysy Lumilta</button>
            </form>
          `
          : ""
      }
      ${
        hasAssistReply
          ? `
            <div class="lumix-coach-reply">
              <strong>Lumi</strong>
              <p>${escapeHtml(assist.reply)}</p>
              ${
                assist.suggestedUpdates && Object.keys(assist.suggestedUpdates).length
                  ? `
                    <div class="lumix-coach-mini-actions">
                      <button type="button" class="ghost-button" data-coach-action="apply-suggestion">
                        Käytä ehdotusta
                      </button>
                    </div>
                  `
                  : ""
              }
            </div>
          `
          : ""
      }
      <div class="lumix-coach-actions">
        <button type="button" class="ghost-button" data-coach-action="focus" data-target="${escapeHtml(coach.target)}">
          Näytä kohta
        </button>
        <button type="button" data-coach-action="start-tour">Aloita opastus</button>
      </div>
    </div>
  `;
}

function renderHealth(health) {
  document.getElementById("ai-chip").textContent = health.liveAi ? "AI: käytössä" : "AI: demo";
  document.getElementById("stripe-chip").textContent = health.stripeConfigured
    ? "Stripe: käytössä"
    : "Stripe: demo";
  document.getElementById("scheduler-chip").textContent = `Ajastus: ${Math.round(
    health.schedulerIntervalMs / 1000
  )}s / jono ${Math.round(health.queueIntervalMs / 1000)}s`;
}

function renderSummary(summary) {
  summaryGrid.innerHTML = [
    ["Asiakkaat", summary.totalClients],
    ["Luotu", summary.generatedClients],
    ["Liidit", summary.totalLeads],
    ["Jonossa", summary.pendingJobs]
  ]
    .map(
      ([label, value]) => `
        <article class="summary-card">
          <p>${label}</p>
          <strong>${value}</strong>
        </article>
      `
    )
    .join("");
}

function renderJobs(jobs) {
  if (!jobs.length) {
    jobsList.innerHTML = '<article class="mini-card"><p>Ei töitä jonossa.</p></article>';
    return;
  }

  jobsList.innerHTML = jobs
    .map(
      (job) => `
        <article class="mini-card">
          <strong>#${job.id} • ${escapeHtml(job.type)}</strong>
          <p>${escapeHtml(job.status)}${job.clientId ? ` • asiakas ${job.clientId}` : ""}</p>
          <p>Luotu ${formatDate(job.createdAt)}${job.completedAt ? ` • valmis ${formatDate(job.completedAt)}` : ""}</p>
          ${job.error ? `<p>${escapeHtml(job.error)}</p>` : ""}
        </article>
      `
    )
    .join("");
}

function renderTeam(members) {
  if (!members.length) {
    teamList.innerHTML = '<article class="mini-card"><p>Ei tiimin jäseniä.</p></article>';
    return;
  }

  teamList.innerHTML = members
    .map(
      (member) => `
        <article class="mini-card">
          <div>
            <strong>${escapeHtml(member.email)}</strong>
            <p>${escapeHtml(member.role)} • liittynyt ${formatDate(member.createdAt)}</p>
          </div>
          ${
            state.bootstrap.user.role === "owner" && member.id !== state.bootstrap.user.id
              ? `
                <div class="mini-actions">
                  <button class="ghost-button" data-action="set-role" data-member-id="${member.id}" data-role="admin" type="button">Tee admin</button>
                  <button class="ghost-button" data-action="set-role" data-member-id="${member.id}" data-role="member" type="button">Tee jäsen</button>
                </div>
              `
              : ""
          }
        </article>
      `
    )
    .join("");
}

function renderReportForm(settings) {
  const form = document.getElementById("report-form");
  form.smtpHost.value = settings?.smtpHost || "";
  form.smtpPort.value = settings?.smtpPort || "";
  form.smtpUser.value = settings?.smtpUser || "";
  form.smtpPass.value = settings?.smtpPass || "";
  form.fromEmail.value = settings?.fromEmail || "";
  form.recipients.value = (settings?.recipients || []).join(", ");
  form.smtpSecure.checked = Boolean(settings?.smtpSecure);
}

function renderReportHistory(history) {
  if (!history.length) {
    reportHistory.innerHTML = '<article class="mini-card"><p>Ei raporttihistoriaa.</p></article>';
    return;
  }

  reportHistory.innerHTML = history
    .map(
      (entry) => `
        <article class="mini-card">
          <strong>${escapeHtml(entry.status)}</strong>
          <p>${escapeHtml(entry.message || "Ei viestiä")}</p>
          <p>${formatDate(entry.createdAt)} • vastaanottajia ${entry.recipientCount}</p>
        </article>
      `
    )
    .join("");
}

function renderLumixPanel() {
  const agent = state.bootstrap?.lumix?.agent;
  const catalog = getIntakeCatalog();
  const model = state.bootstrap?.lumix?.model;
  const codex = state.bootstrap?.lumix?.codex;
  if (!agent) {
    lumixSummary.textContent = "Lumi-data latautuu...";
    lumixCodex.innerHTML = '<article class="mini-card"><p>Ei dataa vielä.</p></article>';
    return;
  }

  lumixSummary.textContent = `${agent.name} auttaa pitämään flow’n selkeänä.`;
  lumixCodex.innerHTML = `
    <article class="mini-card">
      <strong>${escapeHtml(agent.name)}</strong>
      <p>${escapeHtml(agent.summary)}</p>
    </article>
    <article class="mini-card">
      <strong>Miten Lumi auttaa</strong>
      <p>${escapeHtml(codex?.intro || "")}</p>
    </article>
    <article class="mini-card">
      <strong>Rakenne</strong>
      <p>
        objektit ${model?.objects?.length || 0},
        linkit ${model?.links?.length || 0},
        actionit ${model?.actions?.length || 0}
      </p>
    </article>
    <article class="mini-card">
      <strong>Ontologian runko</strong>
      <p>
        yritystyypit ${catalog.businessType.length},
        tarjoomat ${catalog.offerType.length},
        yleisöt ${catalog.audienceType.length},
        tavoitteet ${catalog.goalType.length}
      </p>
    </article>
  `;
}

function renderSeo(seo) {
  if (!seo) return '<p class="body-copy">SEO-pakettia ei ole vielä luotu.</p>';
  return `
    <div class="seo-grid">
      <div class="seo-item">
        <span>Otsikko</span>
        <strong>${escapeHtml(seo.title)}</strong>
      </div>
      <div class="seo-item">
        <span>Kuvaus</span>
        <strong>${escapeHtml(seo.metaDescription)}</strong>
      </div>
      <div class="seo-item">
        <span>Avainsanat</span>
        <strong>${escapeHtml(seo.keywords.join(", "))}</strong>
      </div>
      <div class="seo-item">
        <span>Slug</span>
        <strong>/${escapeHtml(seo.slug)}</strong>
      </div>
    </div>
  `;
}

<<<<<<< HEAD
=======
function truncateText(value, maxLength = 140) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function getStructureSections(client) {
  return client.strategyRecommendation?.homepageStructure?.length
    ? client.strategyRecommendation.homepageStructure
    : ["Hero", "Offer", "Proof", "CTA"];
}

function renderStructurePreview(structure, compact = false) {
  const sections = (structure || []).length ? structure : ["Hero", "Offer", "Proof", "CTA"];

  return `
    <div class="structure-preview${compact ? " structure-preview-compact" : ""}">
      ${sections
        .map(
          (section, index) => `
            <article class="structure-node structure-node-${(index % 4) + 1}">
              <span>${index + 1}</span>
              <strong>${escapeHtml(section)}</strong>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderWebsiteMockPreview(client, compact = false) {
  const website = client.website || {};
  const recommendation = client.strategyRecommendation || {};
  const sections = getStructureSections(client);
  const headline = website.headline || client.businessName;
  const subheadline = website.subheadline || recommendation.positioning || client.description;
  const cta = website.cta || recommendation.ctaStrategy || client.businessProfile?.mainCta || "Primary CTA";
  const highlightBlocks = sections.slice(1, 4).length ? sections.slice(1, 4) : ["Services", "Proof", "CTA"];
  const contentAngles = Array.isArray(recommendation.contentAngles) ? recommendation.contentAngles : [];
  const slug =
    client.seo?.slug || client.businessName.toLowerCase().trim().replace(/[^a-z0-9\s-]/gi, "").replace(/\s+/g, "-");

  if (!compact) {
    const proofQuote =
      client.blogs?.[0]?.excerpt ||
      recommendation.positioning ||
      "This preview turns strategy into a more credible and polished website direction.";

    return `
      <article class="website-mock website-mock-large">
        <div class="website-mock-chrome website-mock-chrome-large">
          <div class="website-mock-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="website-mock-url">${escapeHtml(`${window.location.hostname || "easyonlinepresence.com"}/${slug}`)}</div>
        </div>

        <div class="website-preview-viewport">
          <div class="website-preview-page">
            <section class="website-preview-hero">
              <div class="website-preview-hero-grid">
                <div class="website-preview-copy">
                  <div class="website-preview-eyebrow">
                    <i></i>
                    <span>${escapeHtml(client.businessName)} preview</span>
                  </div>
                  <h2>${escapeHtml(headline)}</h2>
                  <p>${escapeHtml(subheadline)}</p>
                  <div class="website-preview-actions">
                    <span class="website-preview-button website-preview-button-primary">${escapeHtml(cta)}</span>
                    <span class="website-preview-button website-preview-button-secondary">See full preview</span>
                  </div>
                </div>

                <div class="website-preview-stats">
                  <article class="website-preview-stat">
                    <span>Stage</span>
                    <strong>Live preview</strong>
                  </article>
                  <article class="website-preview-stat">
                    <span>Assets</span>
                    <strong>Landing + SEO</strong>
                  </article>
                  <article class="website-preview-stat">
                    <span>Workflow</span>
                    <strong>${escapeHtml(client.publishTargets.length ? "Ready to publish" : "Needs publish setup")}</strong>
                  </article>
                </div>
              </div>
            </section>

            <section class="website-preview-feature-grid">
              ${highlightBlocks
                .map(
                  (section, index) => `
                    <article class="website-preview-feature">
                      <span class="website-preview-kicker">Offer</span>
                      <h3>${escapeHtml(section)}</h3>
                      <p>${escapeHtml(
                        truncateText(
                          contentAngles[index] || `${section} block tuned to the current setup and CTA path.`,
                          120
                        )
                      )}</p>
                    </article>
                  `
                )
                .join("")}
            </section>

            <section class="website-preview-proof-grid">
              <article class="website-preview-proof">
                <span class="website-preview-kicker">Proof</span>
                <h3>Trusted by teams that want clarity, not content chaos.</h3>
                <blockquote class="website-preview-quote">
                  <p>${escapeHtml(`“${truncateText(proofQuote, 180)}”`)}</p>
                  <footer>
                    <strong>${escapeHtml(recommendation.primaryAudience || "Ideal audience")}</strong>
                    <span>${escapeHtml(recommendation.primaryOffer || "Primary offer")}</span>
                  </footer>
                </blockquote>
              </article>

              <aside class="website-preview-structure">
                <span class="website-preview-kicker">Website structure</span>
                <div class="website-preview-structure-list">
                  ${sections
                    .slice(0, 5)
                    .map(
                      (section) => `
                        <div class="website-preview-structure-item">
                          <strong>${escapeHtml(section)}</strong>
                          <span>Section</span>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              </aside>
            </section>

            <section class="website-preview-cta-section">
              <div>
                <span class="website-preview-kicker">Final CTA</span>
                <h3>Turn this preview into a live-ready website workflow.</h3>
                <p>Review the structure, refine the message, and publish when the package feels right.</p>
              </div>
              <div class="website-preview-cta-actions">
                <span class="website-preview-button website-preview-button-primary">Publish preview</span>
              </div>
            </section>

            <footer class="website-preview-footer">
              <div class="website-preview-footer-row">
                <div class="website-preview-footer-brand">
                  <strong>${escapeHtml(client.businessName)}</strong>
                  <span>Website preview inside the Lumix workspace.</span>
                </div>
                <nav class="website-preview-footer-links">
                  ${["Overview", "Offer", "Proof", "SEO", "Contact"]
                    .map((item) => `<span>${escapeHtml(item)}</span>`)
                    .join("")}
                </nav>
              </div>
            </footer>
          </div>
        </div>
      </article>
    `;
  }

  return `
    <article class="website-mock${compact ? " website-mock-compact" : ""}">
      <div class="website-mock-chrome">
        <div class="website-mock-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="website-mock-url">${escapeHtml(`${window.location.hostname || "easyonlinepresence.com"}/${client.businessName.toLowerCase().replace(/\s+/g, "-")}`)}</div>
      </div>
      <div class="website-mock-canvas">
        <section class="website-hero">
          <span class="website-tag">Hero</span>
          <h5>${escapeHtml(headline)}</h5>
          <p>${escapeHtml(truncateText(subheadline, compact ? 86 : 140))}</p>
          <div class="website-cta-row">
            <span class="website-cta-pill">${escapeHtml(truncateText(cta, compact ? 28 : 46))}</span>
            <span class="website-proof-pill">${client.seo ? "SEO connected" : "SEO ready"}</span>
          </div>
        </section>

        <div class="website-layout-strip">
          ${sections
            .slice(0, compact ? 4 : 6)
            .map((section) => `<span class="website-layout-pill">${escapeHtml(section)}</span>`)
            .join("")}
        </div>

        <div class="website-card-grid">
          ${highlightBlocks
            .map(
              (section, index) => `
                <article class="website-block-card">
                  <span>Section ${index + 1}</span>
                  <strong>${escapeHtml(section)}</strong>
                  <p>${escapeHtml(
                    truncateText(
                      recommendation.contentAngles?.[index] ||
                        `${section} block tuned to the current setup and CTA path.`,
                      compact ? 56 : 88
                    )
                  )}</p>
                </article>
              `
            )
            .join("")}
        </div>

        <div class="website-footer-band">
          <strong>${client.blogs?.length || 0} blog drafts</strong>
          <span>${client.seo?.slug ? `/${escapeHtml(client.seo.slug)}` : "Search snippet ready"}</span>
        </div>
      </div>
    </article>
  `;
}

function renderBlogAssetStack(blogs, compact = false) {
  if (!blogs.length) {
    return `
      <div class="blog-stack blog-stack-empty${compact ? " blog-stack-compact" : ""}">
        <article class="blog-stack-card blog-stack-placeholder">
          <span class="blog-stack-index">01</span>
          <strong>Blog draft</strong>
          <p>Generated articles will appear here.</p>
        </article>
      </div>
    `;
  }

  return `
    <div class="blog-stack${compact ? " blog-stack-compact" : ""}">
      ${blogs
        .slice(0, 3)
        .map(
          (blog, index) => `
            <article class="blog-stack-card">
              <span class="blog-stack-index">${String(index + 1).padStart(2, "0")}</span>
              <strong>${escapeHtml(truncateText(blog.title, compact ? 56 : 88))}</strong>
              <p class="blog-stack-keyword">${escapeHtml(blog.keyword)}</p>
              <p>${escapeHtml(truncateText(blog.excerpt, compact ? 72 : 108))}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSeoAssetPreview(seo, compact = false) {
  if (!seo) {
    return `
      <article class="seo-preview-card">
        <span class="section-kicker">SEO package</span>
        <p class="body-copy">Title, meta description and keyword set will appear here.</p>
      </article>
    `;
  }

  return `
    <article class="seo-preview-card${compact ? " seo-preview-card-compact" : ""}">
      <span class="section-kicker">SEO package</span>
      <div class="seo-snippet-card">
        <span class="seo-snippet-url">/${escapeHtml(seo.slug)}</span>
        <strong>${escapeHtml(truncateText(seo.title, compact ? 62 : 78))}</strong>
        <p>${escapeHtml(truncateText(seo.metaDescription, compact ? 98 : 144))}</p>
      </div>
      <div class="seo-chip-list">
        ${(seo.keywords || [])
          .slice(0, compact ? 3 : 5)
          .map((keyword) => `<span class="magic-chip">${escapeHtml(keyword)}</span>`)
          .join("")}
      </div>
    </article>
  `;
}

function getWebsiteHeadline(client) {
  return client.website?.headline || client.strategyRecommendation?.primaryOffer || client.businessName;
}

function getWebsiteSubheadline(client) {
  return client.website?.subheadline || client.strategyRecommendation?.positioning || client.description;
}

function getWebsiteCta(client) {
  return client.website?.cta || client.strategyRecommendation?.ctaStrategy || client.businessProfile?.mainCta || "Book a call";
}

function renderPreviewDeviceToggle(client) {
  const device = getPreviewDevice(client);
  return `
    <div class="reveal-device-toggle" role="tablist" aria-label="Preview device">
      <button
        type="button"
        class="reveal-device-button${device === "desktop" ? " reveal-device-button-active" : ""}"
        data-preview-device="desktop"
      >
        Desktop
      </button>
      <button
        type="button"
        class="reveal-device-button${device === "mobile" ? " reveal-device-button-active" : ""}"
        data-preview-device="mobile"
      >
        Mobile
      </button>
    </div>
  `;
}

function renderRevealWebsiteSurface(client, mode = "ready") {
  const previewUrl = `${window.location.hostname || "easyonlinepresence.com"}/${client.businessName.toLowerCase().replace(/\s+/g, "-")}`;

  if (mode === "generating") {
    const device = getPreviewDevice(client);
    return `
      <div class="reveal-browser${device === "mobile" ? " reveal-browser-mobile" : ""}">
        <div class="reveal-browser-chrome">
          <div class="reveal-browser-dots"><span></span><span></span><span></span></div>
          <div class="reveal-browser-url">${escapeHtml(previewUrl)}</div>
          ${renderPreviewDeviceToggle(client)}
        </div>
        <div class="reveal-browser-scroll">
          <div class="reveal-skeleton-page">
            <section class="reveal-skeleton-hero">
              <span class="reveal-skeleton-badge"></span>
              <span class="reveal-skeleton-line reveal-skeleton-line-xl"></span>
              <span class="reveal-skeleton-line reveal-skeleton-line-lg"></span>
              <div class="reveal-skeleton-actions">
                <span class="reveal-skeleton-pill"></span>
                <span class="reveal-skeleton-pill reveal-skeleton-pill-muted"></span>
              </div>
            </section>
            <section class="reveal-skeleton-grid">
              <article></article>
              <article></article>
              <article></article>
            </section>
            <section class="reveal-skeleton-band"></section>
            <section class="reveal-skeleton-cta"></section>
          </div>
        </div>
      </div>
    `;
  }

  if (mode === "empty") {
    return `
      <div class="reveal-empty-preview reveal-empty-preview-large">
        <div class="reveal-empty-copy">
          <span class="section-kicker">Website reveal</span>
          <h3>Your site appears here the moment you generate it.</h3>
          <p>See the hero, sections and CTA in one full-page preview before you publish anything.</p>
          <button type="button" data-action="generate">Generate website</button>
        </div>
        <div class="reveal-empty-site">
          ${renderWebsiteMockPreview(client)}
        </div>
      </div>
    `;
  }

  return `
    <div class="website-reveal-render website-reveal-render-large" data-preview-url="${escapeHtml(previewUrl)}">
      ${renderWebsiteMockPreview(client)}
    </div>
  `;
}

function renderRevealSecondaryPane(client, previewTab) {
  if (previewTab === "blogs") {
    return `
      <div class="reveal-secondary-pane">
        <div class="reveal-secondary-head">
          <div>
            <span class="section-kicker">Blog</span>
            <h4>Supporting articles</h4>
          </div>
          <span class="reveal-secondary-meta">${escapeHtml(String(client.blogs.length || 0))} drafts</span>
        </div>
        ${renderBlogAssetStack(client.blogs)}
      </div>
    `;
  }

  if (previewTab === "seo") {
    return `
      <div class="reveal-secondary-pane">
        <div class="reveal-secondary-head">
          <div>
            <span class="section-kicker">SEO</span>
            <h4>Search snippet</h4>
          </div>
          <span class="reveal-secondary-meta">${client.seo ? "Ready" : "Waiting"}</span>
        </div>
        ${renderSeoAssetPreview(client.seo)}
      </div>
    `;
  }

  return renderRevealWebsiteSurface(client, client.website?.html ? "ready" : "empty");
}

function renderWebsiteRevealStage(client, options = {}) {
  const workspaceMode = options.workspaceMode === true;
  const generating = Boolean(state.generatingClients[client.id]);
  const previewTab = getPreviewTab(client);
  const hasWebsite = Boolean(client.website?.html);
  const hasPreview = hasContent(client);
  const runtime = getLumixRuntime(client);
  const recommendation = client.strategyRecommendation;
  const headline = getWebsiteHeadline(client);
  const subheadline = getWebsiteSubheadline(client);
  const cta = getWebsiteCta(client);
  const previewTabs = [
    { key: "website", label: "Website" },
    { key: "blogs", label: "Blog" },
    { key: "seo", label: "SEO" }
  ];
  const mode = generating ? "generating" : hasWebsite ? "ready" : "empty";
  const description =
    mode === "ready"
      ? "Preview the page, inspect the sections and tweak the copy before you publish."
      : mode === "generating"
        ? "We are assembling the website preview now. Keep this page open."
        : "Generate once and this space becomes your live website preview.";

  const heroBadges = [
    runtime.actions.generate_pack.ready || hasPreview ? "Ready to generate" : "Needs direction",
    hasWebsite ? "Preview ready" : generating ? "Building preview" : "Awaiting website"
  ];

  const content = `
    <section class="workspace-main-card workspace-main-card-reveal" data-guide="preview" data-client-id="${client.id}">
      <div class="reveal-stage-head">
        <div class="reveal-stage-copy">
          <span class="section-kicker">Website reveal</span>
          <h3>${escapeHtml(headline)}</h3>
          <p>${escapeHtml(truncateText(subheadline || description, 140))}</p>
        </div>
        <div class="reveal-stage-meta">
          ${heroBadges.map((badge) => `<span class="reveal-stage-pill">${escapeHtml(badge)}</span>`).join("")}
        </div>
      </div>

      <div class="reveal-preview-tabs" role="tablist" aria-label="Generated assets">
        ${previewTabs
          .map(
            (tab) => `
              <button
                type="button"
                class="preview-tab${previewTab === tab.key ? " preview-tab-active" : ""}"
                data-preview-tab="${escapeHtml(tab.key)}"
              >
                ${escapeHtml(tab.label)}
              </button>
            `
          )
          .join("")}
      </div>

      ${previewTab === "website" ? renderRevealWebsiteSurface(client, mode) : renderRevealSecondaryPane(client, previewTab)}

      <div class="reveal-support-bar">
        <div class="reveal-support-card">
          <span class="section-kicker">Headline</span>
          <strong>${escapeHtml(headline)}</strong>
          <p>${escapeHtml(truncateText(subheadline, 120))}</p>
        </div>
        <div class="reveal-support-card reveal-support-card-compact">
          <span class="section-kicker">Primary CTA</span>
          <strong>${escapeHtml(cta)}</strong>
          <p>${escapeHtml(
            truncateText(
              recommendation?.primaryAudience || client.businessProfile?.audienceType || "Tailored to the current audience.",
              96
            )
          )}</p>
        </div>
      </div>

      ${renderRevealCopyLab(client)}
    </section>
  `;

  if (workspaceMode) {
    return `<section class="workspace-stage-panel workspace-stage-panel-reveal">${content}</section>`;
  }

  return `
    <section class="workflow-stage workflow-stage-active">
      ${content}
    </section>
  `;
}

function renderRevealCopyLab(client) {
  const assist = getLumixAssistState(client.id);
  const generating = Boolean(state.generatingClients[client.id]);
  const quickPrompts = [
    "Make the hero feel more premium.",
    "Make the copy shorter and sharper.",
    "Make the page more sales-focused.",
    "Rewrite the CTA for higher intent leads."
  ];

  return `
    <section class="reveal-copy-lab workspace-inline-copy-lab" data-client-id="${client.id}">
      <div class="rail-card-head reveal-copy-head">
        <div>
          <span class="section-kicker">Copy lab</span>
          <strong>Tweak inside the preview</strong>
        </div>
      </div>

      <div class="reveal-quick-prompts">
        ${quickPrompts
          .map(
            (prompt) => `
              <button type="button" class="ghost-button reveal-quick-prompt" data-copy-prompt="${escapeHtml(prompt)}">
                ${escapeHtml(prompt)}
              </button>
            `
          )
          .join("")}
      </div>

      <form class="reveal-copy-form" data-reveal-copy-form data-client-id="${client.id}">
        <label>
          <span>Ask Lumi to adjust the website</span>
          <textarea
            name="message"
            rows="4"
            placeholder="Make the hero feel more premium, shorten the subheadline and sharpen the CTA."
            required
          ></textarea>
        </label>
        <button type="submit"${generating ? " disabled" : ""}>Edit copy</button>
      </form>

      ${
        assist.reply
          ? `
            <div class="reveal-assist-response">
              <span class="section-kicker">Latest suggestion</span>
              <p>${escapeHtml(assist.reply)}</p>
            </div>
          `
          : `
            <div class="reveal-assist-response reveal-assist-response-muted">
              <span class="section-kicker">Live editing</span>
              <p>Ask Lumi for sharper headlines, shorter copy or a more premium angle.</p>
            </div>
          `
      }
    </section>
  `;
}

function getStageSurfaceClass(client, key) {
  const step = getPrimaryFlowSteps(client).find((item) => item.key === key);
  return step ? `stage-card-${step.status}` : "";
}

>>>>>>> e87dc7e (Redesign dashboard around website reveal)
function renderBlogs(blogs) {
  if (!blogs.length) return '<p class="body-copy">Ei blogiluonnoksia vielä.</p>';
  return blogs
    .map(
      (blog) => `
        <article class="blog-card">
          <strong>${escapeHtml(blog.title)}</strong>
          <p>${escapeHtml(blog.keyword)}</p>
          <p>${escapeHtml(blog.excerpt)}</p>
        </article>
      `
    )
    .join("");
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function renderSelectOptions(options, selectedValue, placeholder) {
  const rows = [];

  if (placeholder) {
    rows.push(`<option value="">${escapeHtml(placeholder)}</option>`);
  }

  return rows
    .concat(
      options.map(
        ({ value, label }) =>
          `<option value="${escapeHtml(value)}"${selectedValue === value ? " selected" : ""}>${escapeHtml(label)}</option>`
      )
    )
    .join("");
}

<<<<<<< HEAD
function renderIntake(client) {
  const publishState = client.publishHistory.length ? "Julkaistu" : "Kesken";
  const nextStep = getNextStep(client);
  const profile = client.businessProfile || {};
  const notes = profile.rawNotes?.notes || "";
  const intakeCatalog = getIntakeCatalog();

  return `
    <div class="stage-card client-stage-card" data-guide="intake">
      <div class="primary-card-top">
        <div>
          <span class="section-kicker">Client</span>
          <h4>${escapeHtml(client.businessName)}</h4>
          <p class="body-copy">${escapeHtml(client.description)}</p>
        </div>
        <div class="primary-card-meta">
          <span class="client-status">${escapeHtml(client.billingStatus)}</span>
          <span class="client-status">${escapeHtml(publishState)}</span>
        </div>
=======
function renderClientStage(client) {
  return renderStageSummary({
    number: 1,
    title: "Client",
    summary: `${client.businessName} on aktiivinen työtila.`,
    status: "completed",
    primaryAction: {
      kind: "focus",
      label: "Switch client",
      target: "[data-guide='clients']"
    },
    secondaryAction: {
      kind: "drawer",
      label: "Add new",
      drawer: "new-client",
      ghost: true
    }
  });
}

function renderIntake(client, options = {}) {
  const workspaceMode = options.workspaceMode === true;
  const profile = client.businessProfile || {};
  const notes = profile.rawNotes?.notes || "";
  const intakeCatalog = getIntakeCatalog();
  const recommendation = client.strategyRecommendation;
  const status = getStepStatus(client, "setup");
  const mode = getSetupMode(client);
  const readyItems = [
    profile.goalType ? `Goal: ${getCatalogLabel("goalType", profile.goalType)}` : "",
    profile.toneType ? `Tone: ${getCatalogLabel("toneType", profile.toneType)}` : "",
    recommendation ? "Strategy ready" : ""
  ].filter(Boolean);

  const reviewBody = recommendation
    ? `
        <div class="magic-results-panel">
          <div class="magic-results-head">
            <div>
              <span class="section-kicker">Business brief</span>
              <p class="body-copy stage-inline-note">${escapeHtml(client.description)}</p>
            </div>
            <div class="magic-results-badges">
              <span class="flow-pill">${escapeHtml(getCatalogLabel("goalType", profile.goalType || ""))}</span>
              <span class="flow-pill">${escapeHtml(getCatalogLabel("toneType", profile.toneType || ""))}</span>
            </div>
          </div>

          <div class="magic-results-grid">
            <article class="magic-result-card">
              <span>Positioning</span>
              <strong>${escapeHtml(recommendation.positioning || "Not set")}</strong>
            </article>
            <article class="magic-result-card">
              <span>Offer</span>
              <strong>${escapeHtml(recommendation.primaryOffer || "Not set")}</strong>
            </article>
            <article class="magic-result-card">
              <span>Audience</span>
              <strong>${escapeHtml(recommendation.primaryAudience || "Not set")}</strong>
            </article>
            <article class="magic-result-card">
              <span>CTA</span>
              <strong>${escapeHtml(recommendation.ctaStrategy || "Not set")}</strong>
            </article>
          </div>
        </div>
      `
    : `
        <article class="magic-preview-card">
          <span class="section-kicker">No saved setup yet</span>
          <p class="body-copy">Generate setup from this brief.</p>
        </article>
      `;

  const editBody = `
    <form class="stack-form intake-form" data-intake-form>
      <div class="inline-grid">
        <label>
          <span>Business type</span>
          <select name="businessType">
            ${renderSelectOptions(intakeCatalog.businessType, profile.businessType || "", "Select business type")}
          </select>
        </label>
        <label>
          <span>Target audience</span>
          <select name="audienceType">
            ${renderSelectOptions(intakeCatalog.audienceType, profile.audienceType || "", "Select audience")}
          </select>
        </label>
      </div>

      <div class="inline-grid">
        <label>
          <span>Primary goal</span>
          <select name="goalType">
            ${renderSelectOptions(intakeCatalog.goalType, profile.goalType || "", "Select goal")}
          </select>
        </label>
        <label>
          <span>Main CTA</span>
          <input
            name="mainCta"
            placeholder="Request a quote / Book a demo / Start free trial"
            value="${escapeHtml(profile.mainCta || "")}"
          />
        </label>
      </div>

      <div class="inline-grid">
        <label>
          <span>Offer type</span>
          <select name="offerType">
            ${renderSelectOptions(intakeCatalog.offerType, profile.offerType || "", "Select offer")}
          </select>
        </label>
        <label>
          <span>Tone</span>
          <select name="toneType">
            ${renderSelectOptions(intakeCatalog.toneType, profile.toneType || "", "Select tone")}
          </select>
        </label>
      </div>

      <div class="inline-grid">
        <label>
          <span>Price position</span>
          <select name="pricePosition">
            ${renderSelectOptions(intakeCatalog.pricePosition, profile.pricePosition || "", "Select price")}
          </select>
        </label>
        <label>
          <span>Geo focus</span>
          <input
            name="geoFocus"
            placeholder="Finland, Helsinki, online..."
            value="${escapeHtml(profile.geoFocus || "")}"
          />
        </label>
      </div>

      <label>
        <span>Notes</span>
        <textarea name="notes" rows="4" placeholder="Add any extra direction for Lumi.">${escapeHtml(notes)}</textarea>
      </label>

      <button type="submit" class="ghost-button">Save setup</button>
    </form>
  `;

  if (workspaceMode) {
    return `
      <section class="workspace-stage-panel" data-guide="intake">
        ${renderStageGate({
          number: 2,
          title: "Strategy",
          description: recommendation
            ? "Review or refine the saved setup before generating assets."
            : "Turn the client brief into a clear saved strategy.",
          readyItems,
          blocker: recommendation ? "" : "Generate setup to unlock asset generation.",
          primaryAction: {
            kind: "action",
            label: recommendation ? "Refresh setup" : "Generate setup",
            action: "recommend"
          },
          secondaryAction: recommendation
            ? {
                kind: "toggle-setup",
                label: mode === "review" ? "Edit setup" : "Review setup",
                mode: mode === "review" ? "edit" : "review",
                ghost: true
              }
            : null,
          tone: status === "completed" ? "completed" : recommendation ? "current" : "upcoming"
        })}
        <div class="intake-frame stage-card ${getStageSurfaceClass(client, "setup")}">
          ${mode === "review" ? reviewBody : editBody}
        </div>
      </section>
    `;
  }

  if (status === "completed") {
    return renderStageSummary({
      number: 2,
      title: "Setup",
      summary: recommendation
        ? `${recommendation.primaryOffer || "Strategy"} valmis kohteelle ${recommendation.primaryAudience || "selected audience"}.`
        : "Setup exists.",
      status,
      primaryAction: {
        kind: "focus",
        label: "Open generate",
        target: "[data-guide='generate']"
      },
      secondaryAction: {
        kind: "action",
        label: "Refresh setup",
        action: "recommend",
        ghost: true
      }
    });
  }

  if (status === "upcoming") {
    return renderStageSummary({
      number: 2,
      title: "Setup",
      summary: "This stage opens after a client brief exists.",
      status,
      primaryAction: {
        kind: "drawer",
        label: "Add client",
        drawer: "new-client"
      }
    });
  }

  return `
    <section class="workflow-stage workflow-stage-active">
      ${renderStageGate({
        number: 2,
        title: "Setup",
        description: recommendation
          ? "Review the saved strategy before you move into generation."
          : "Turn the brief into a usable setup for Lumi.",
        readyItems,
        blocker: recommendation ? "" : "Generate setup to unlock asset generation.",
        primaryAction: {
          kind: "action",
          label: recommendation ? "Refresh setup" : "Generate setup",
          action: "recommend"
        },
        secondaryAction: recommendation
          ? {
              kind: "toggle-setup",
              label: mode === "review" ? "Edit setup" : "Review setup",
              mode: mode === "review" ? "edit" : "review",
              ghost: true
            }
          : null,
        tone: "current"
      })}
      <div class="intake-frame stage-card ${getStageSurfaceClass(client, "setup")}" data-guide="intake">
        ${mode === "review" ? reviewBody : editBody}
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
      </div>

      <div class="flow-strip compact-stat-strip">
        <span class="flow-pill">Paketti ${escapeHtml(client.plan)}</span>
        <span class="flow-pill">Rytmi ${client.generationIntervalDays} pv</span>
        <span class="flow-pill">Liidit ${client.analytics.leadSubmits}</span>
      </div>

      <div class="next-step-card">
        <span class="section-kicker">${escapeHtml(nextStep.title)}</span>
        <strong>${escapeHtml(nextStep.text)}</strong>
      </div>

      <div class="section-head section-head-compact">
        <div>
          <span class="section-kicker">Asiakastiedot</span>
          <h5>Pidä perusrunko ajan tasalla</h5>
        </div>
        <p>Päivitä nämä ennen strategiaa ja generointia.</p>
      </div>

      <form class="stack-form intake-form intake-form-card" data-intake-form>
        <div class="inline-grid">
          <label>
            <span>Yritystyyppi</span>
            <select name="businessType">
              ${renderSelectOptions(
                intakeCatalog.businessType,
                profile.businessType || "",
                "Valitse yritystyyppi"
              )}
            </select>
          </label>
          <label>
            <span>Kohderyhmä</span>
            <select name="audienceType">
              ${renderSelectOptions(
                intakeCatalog.audienceType,
                profile.audienceType || "",
                "Valitse kohderyhmä"
              )}
            </select>
          </label>
        </div>

        <div class="inline-grid">
          <label>
            <span>Päätavoite</span>
            <select name="goalType">
              ${renderSelectOptions(intakeCatalog.goalType, profile.goalType || "", "Valitse tavoite")}
            </select>
          </label>
          <label>
            <span>Pää-CTA</span>
            <input
              name="mainCta"
              placeholder="Pyydä tarjous / Varaa aika / Ota yhteyttä"
              value="${escapeHtml(profile.mainCta || "")}"
            />
          </label>
        </div>

        <details class="stage-subdetails">
          <summary>Lisää tietoja</summary>

          <div class="inline-grid">
            <label>
              <span>Tarjooma</span>
              <select name="offerType">
                ${renderSelectOptions(intakeCatalog.offerType, profile.offerType || "", "Valitse tarjooma")}
              </select>
            </label>
            <label>
              <span>Sävy</span>
              <select name="toneType">
                ${renderSelectOptions(intakeCatalog.toneType, profile.toneType || "", "Valitse sävy")}
              </select>
            </label>
          </div>

          <div class="inline-grid">
            <label>
              <span>Hintataso</span>
              <select name="pricePosition">
                ${renderSelectOptions(
                  intakeCatalog.pricePosition,
                  profile.pricePosition || "",
                  "Valitse hintataso"
                )}
              </select>
            </label>
            <label>
              <span>Alue / markkina</span>
              <input
                name="geoFocus"
                placeholder="Helsinki, Suomi, verkossa..."
                value="${escapeHtml(profile.geoFocus || "")}"
              />
            </label>
          </div>

          <label>
            <span>Lisähuomiot</span>
            <textarea name="notes" rows="4" placeholder="Kirjoita tähän vapaasti, jos asiakas ei tiedä vielä kaikkea tarkasti.">${escapeHtml(notes)}</textarea>
          </label>
        </details>

        <button type="submit" class="ghost-button">Tallenna tiedot</button>
      </form>
    </div>
  `;
}

function renderRecommendation(client) {
  const recommendation = client.strategyRecommendation;
  const runtime = getLumixRuntime(client);
  const recommendationEligibility = runtime.actions.recommend_strategy;

  if (!hasProfile(client)) {
    return `
      <div class="stage-card stage-card-locked strategy-stage-card" data-guide="recommend">
        <div class="section-head">
          <div>
<<<<<<< HEAD
            <span class="section-kicker">Strategy</span>
            <h4>Suunta lukittuna</h4>
=======
            <span class="section-kicker">Vaihe 2</span>
            <h4>Lumin ehdotus</h4>
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
          </div>
          <p>Client-kortti kesken.</p>
        </div>
        <p class="body-copy">Täydennä ensin yrityksen tiedot, niin strategia voidaan muodostaa tähän kohtaan.</p>
      </div>
    `;
  }

  if (!recommendation) {
    return `
      <div class="stage-card strategy-stage-card" data-guide="recommend">
        <div class="section-head">
          <div>
<<<<<<< HEAD
            <span class="section-kicker">Strategy</span>
            <h4>Valitse suunta</h4>
=======
            <span class="section-kicker">Vaihe 2</span>
            <h4>Lumin ehdotus</h4>
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
          </div>
          <p>Lukitse viesti ennen generointia.</p>
        </div>
<<<<<<< HEAD

        <p class="body-copy">${escapeHtml(recommendationEligibility.reason || "Lumix ehdottaa viestin, CTA:n ja sisältökulmat.")}</p>
=======
        <p class="body-copy">${escapeHtml(recommendationEligibility.reason || "Lumi ehdottaa viestin, CTA:n ja sisältökulmat.")}</p>
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
        ${
          recommendationEligibility.ready
            ? `
              <div class="stage-actions stage-actions-inline">
                <button type="button" data-action="recommend" data-guide="recommend" class="ghost-button">Pyydä strategia</button>
              </div>
            `
            : ""
        }
      </div>
    `;
  }

  return `
    <div class="stage-card strategy-stage-card" data-guide="recommend">
      <div class="section-head">
        <div>
<<<<<<< HEAD
          <span class="section-kicker">Strategy</span>
          <h4>Ehdotus valmis</h4>
=======
          <span class="section-kicker">Vaihe 2</span>
          <h4>Lumin ehdotus</h4>
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
        </div>
        <p>Pidä tämä koko ajan näkyvissä generoinnin tukena.</p>
      </div>

      <div class="result-two-up strategy-core-grid">
        <div class="meta-box">
          <strong>Positioning</strong>
          <p>${escapeHtml(recommendation.positioning)}</p>
        </div>
        <div class="meta-box">
          <strong>Pääpalvelu</strong>
          <p>${escapeHtml(recommendation.primaryOffer)}</p>
        </div>
        <div class="meta-box">
          <strong>CTA</strong>
          <p>${escapeHtml(recommendation.ctaStrategy)}</p>
        </div>
      </div>

      <div class="strategy-list strategy-list-inline">
        <div class="seo-item">
          <span>Pääkohderyhmä</span>
          <strong>${escapeHtml(recommendation.primaryAudience)}</strong>
        </div>
        <div class="seo-item">
          <span>Sisältökulmat</span>
          <strong>${escapeHtml((recommendation.contentAngles || []).join(", "))}</strong>
        </div>
        <div class="seo-item">
          <span>Etusivun rakenne</span>
          <strong>${escapeHtml((recommendation.homepageStructure || []).join(" -> "))}</strong>
        </div>
      </div>

      <div class="stage-actions stage-actions-inline">
        <button type="button" data-action="recommend" class="ghost-button">Päivitä strategia</button>
      </div>
    </div>
  `;
}

function renderPublishTargets(client) {
  if (!client.publishTargets.length) return '<p class="body-copy">Ei julkaisukanavia vielä.</p>';
  return client.publishTargets
    .map(
      (target) => `
        <article class="mini-card">
          <div>
            <strong>${escapeHtml(target.name)}</strong>
            <p>${escapeHtml(target.platform)} • ${target.autoPublish ? "automaattinen julkaisu" : "vain manuaalinen julkaisu"}</p>
            <p>Viimeksi julkaistu: ${formatDate(target.lastPublishedAt)}</p>
          </div>
          <div class="mini-actions">
            <button class="ghost-button" data-action="publish-target" data-target-id="${target.id}" type="button">Julkaise</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderPublishHistory(client) {
  if (!client.publishHistory.length) return '<p class="body-copy">Ei julkaisuhistoriaa vielä.</p>';
  return `
    <ul class="history-list">
      ${client.publishHistory
        .map(
          (entry) => `
            <li>${escapeHtml(entry.status)} • target ${entry.publishTargetId} • ${formatDate(entry.createdAt)}${entry.message ? ` • ${escapeHtml(entry.message)}` : ""}</li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderLeads(leads) {
  if (!leads.length) return '<p class="body-copy">Ei liidejä vielä.</p>';
  return leads
    .map(
      (lead) => `
        <article class="mini-card">
          <strong>${escapeHtml(lead.email)}</strong>
          <p>${escapeHtml(lead.name || "Anonymous")} • ${formatDate(lead.createdAt)}</p>
          <p>${escapeHtml(lead.message || "")}</p>
        </article>
      `
    )
    .join("");
}

function renderLumixTimeline(client) {
  const action = lumixActionState.get(client.id);
  const runtime = getLumixRuntime(client);
  const stages = [
    {
      key: "recommend",
      label: "Suunta",
      status: runtime.states.strategy.exists ? "done" : "idle",
      meta: runtime.states.strategy.exists ? runtime.states.strategy.status : "odottaa"
    },
    {
      key: "generate",
      label: "Sisältö",
      status: runtime.states.contentPack.status !== "empty" ? "done" : "idle",
      meta: runtime.states.contentPack.status !== "empty"
        ? `${runtime.states.contentPack.status}${client.lastGenerationAt ? ` • ${formatDate(client.lastGenerationAt)}` : ""}`
        : "odottaa"
    },
    {
      key: "publish",
      label: "Julkaisu",
      status: client.publishHistory.length ? "done" : "idle",
      meta: client.publishTargets.length ? `${client.publishTargets.length} kanavaa` : "ei kanavaa"
    }
  ];

  if (action?.action === "recommend_strategy") {
    stages[0].status = "active";
    stages[0].meta = "Lumi päivitti suuntaa";
  } else if (action?.action === "generate_pack") {
    stages[1].status = "active";
    stages[1].meta = "Sisältö lisättiin jonoon";
  } else if (action?.action === "publish_pack") {
    stages[2].status = "active";
    stages[2].meta = "Julkaisu lisättiin jonoon";
  }

  return `
    <div class="lumix-timeline">
      ${stages
        .map(
          (stage, index) => `
            <article class="timeline-step timeline-step-${stage.status}">
              <span class="timeline-index">${index + 1}</span>
              <strong>${escapeHtml(stage.label)}</strong>
              <p>${escapeHtml(stage.meta)}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderOntologySummary(client) {
  const runtime = getLumixRuntime(client);
  const objects = runtime.objectSummary || {};

  return `
    <div class="flow-strip compact-stat-strip ontology-strip">
      <span class="flow-pill">Offer ${objects.offer ? "valmis" : "puuttuu"}</span>
      <span class="flow-pill">Audience ${objects.audience ? "valmis" : "puuttuu"}</span>
      <span class="flow-pill">Goal ${objects.goal ? "valmis" : "puuttuu"}</span>
      <span class="flow-pill">Voice ${objects.brandVoice ? "valmis" : "puuttuu"}</span>
    </div>
  `;
}

function renderGenerateStage(client, options = {}) {
  const workspaceMode = options.workspaceMode === true;
  const runtime = getLumixRuntime(client);
  const generateEligibility = runtime.actions.generate_pack;

<<<<<<< HEAD
  if (!generateEligibility.ready && !hasContent(client)) {
    return `
      <div class="stage-card stage-card-locked generate-stage-card" data-guide="generate">
        <div class="section-head">
          <div>
            <span class="section-kicker">Generate</span>
            <h4>Generointi lukittuna</h4>
          </div>
          <p>Strategy puuttuu.</p>
        </div>
        <p class="body-copy">Pyydä ensin strategia, jotta generointi tapahtuu oikeaan suuntaan.</p>
      </div>
    `;
=======
  if (workspaceMode) {
    return `
      <section class="workspace-stage-panel" data-guide="generate">
        ${renderStageGate({
          number: 3,
          title: "Generate",
          description: "Create the landing page, blog drafts and SEO package from the saved strategy.",
          readyItems: [
            hasSavedSetup(client) ? "Setup saved" : "",
            client.strategyRecommendation ? "Strategy ready" : ""
          ].filter(Boolean),
          blocker: generateEligibility.ready ? "" : generateEligibility.reason || "Setup is required before generation.",
          primaryAction: generateEligibility.ready
            ? {
                kind: "action",
                label: outputsReady ? "Generate again" : "Generate all",
                action: "generate"
              }
            : {
                kind: "focus",
                label: "Open strategy",
                target: "[data-guide='intake']"
              },
          secondaryAction: {
            kind: "focus",
            label: "Review setup",
            target: "[data-guide='intake']",
            ghost: true
          },
          tone: status === "completed" ? "completed" : generateEligibility.ready ? "current" : "upcoming"
        })}
        <div class="stage-card ${getStageSurfaceClass(client, "generate")}">
          <div class="generate-asset-grid">
            <article class="generate-asset-card">
              <div class="generate-asset-head">
                <strong>Landing page</strong>
                <span class="generate-asset-badge${outputsReady && client.website?.html ? " generate-asset-badge-ready" : ""}">
                  ${client.website?.html ? "Created" : "Queued"}
                </span>
              </div>
              ${renderWebsiteMockPreview(client, true)}
            </article>

            <article class="generate-asset-card">
              <div class="generate-asset-head">
                <strong>Blog pack</strong>
                <span class="generate-asset-badge${client.blogs.length ? " generate-asset-badge-ready" : ""}">
                  ${client.blogs.length ? `${client.blogs.length} drafts` : "3 drafts"}
                </span>
              </div>
              ${renderBlogAssetStack(client.blogs, true)}
            </article>

            <article class="generate-asset-card">
              <div class="generate-asset-head">
                <strong>SEO package</strong>
                <span class="generate-asset-badge${client.seo ? " generate-asset-badge-ready" : ""}">
                  ${client.seo ? "Created" : "Queued"}
                </span>
              </div>
              ${renderSeoAssetPreview(client.seo, true)}
            </article>
          </div>
        </div>
      </section>
    `;
  }

  if (status === "completed") {
    return renderStageSummary({
      number: 3,
      title: "Generate",
      summary: `Landing page, ${client.blogs.length} blog drafts and SEO package created.`,
      status,
      primaryAction: {
        kind: "focus",
        label: "Open preview",
        target: "[data-guide='preview']"
      },
      secondaryAction: {
        kind: "action",
        label: "Generate again",
        action: "generate",
        ghost: true
      }
    });
  }

  if (status === "upcoming") {
    return renderStageSummary({
      number: 3,
      title: "Generate",
      summary: generateEligibility.reason || "This stage unlocks after setup is ready.",
      status,
      primaryAction: {
        kind: "focus",
        label: "Open setup",
        target: "[data-guide='intake']"
      }
    });
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
  }

  return `
    <div class="stage-card generate-stage-card" data-guide="generate">
      <div class="section-head">
        <div>
          <span class="section-kicker">Generate</span>
          <h4>Generoi uusi paketti</h4>
        </div>
        <p>Päivitä sivu, blogit ja SEO samalla napilla.</p>
      </div>

      <div class="stage-actions stage-actions-inline">
        <button type="button" data-action="generate" data-guide="generate">Generoi sisältö</button>
        <a class="ghost-link compact-link" href="/client/${client.id}" target="_blank" rel="noopener">Avaa sivu</a>
      </div>

      <div class="flow-strip compact-stat-strip">
        <span class="flow-pill">Sivu ${client.website?.html ? "valmis" : "kesken"}</span>
        <span class="flow-pill">Blogit ${client.blogs.length}</span>
        <span class="flow-pill">SEO ${client.seo ? "valmis" : "kesken"}</span>
      </div>

      <p class="body-copy generate-stage-note">
        ${
          client.lastGenerationAt
            ? `Viimeisin generointi ${formatDate(client.lastGenerationAt)}.`
            : "Tähän syntyy ensimmäinen valmis sisältöpaketti generoinnin jälkeen."
        }
      </p>
    </div>
  `;
}

<<<<<<< HEAD
function renderPreviewStage(client) {
  if (!hasContent(client)) {
    return `
      <div class="stage-card stage-card-locked preview-stage-card">
        <div class="section-head">
          <div>
            <span class="section-kicker">Preview</span>
            <h4>Esikatselu odottaa</h4>
          </div>
          <p>Ei sisältöä vielä.</p>
        </div>
        <p class="body-copy">
          ${client.strategyRecommendation ? "Generoi ensin sisältö, niin preview aukeaa tähän suoraan." : "Tee ensin strategia ja generoi sitten sisältö."}
        </p>
      </div>
    `;
  }

  const visibleBlogs = client.blogs.slice(0, 2);

  return `
    <div class="stage-card preview-stage-card">
      <div class="section-head">
        <div>
          <span class="section-kicker">Preview</span>
          <h4>Näe mitä asiakkaalle syntyi</h4>
        </div>
        <p>Landing page, blogit ja SEO samassa kortissa.</p>
      </div>

      <div class="preview-main-panel">
        <span class="section-kicker">Landing page</span>
        <div class="site-frame stage-preview-frame">
          <div class="generated-site">${client.website?.html || '<p class="body-copy">Sivua ei ole vielä generoitu.</p>'}</div>
        </div>
      </div>

      <div class="preview-support-grid">
        <div class="preview-support-panel">
          <span class="section-kicker">Blogit</span>
          <div class="blog-grid">${renderBlogs(visibleBlogs)}</div>
        </div>
        <div class="preview-support-panel">
          <span class="section-kicker">SEO</span>
          ${renderSeo(client.seo)}
        </div>
      </div>
    </div>
  `;
=======
function renderPreviewStage(client, options = {}) {
  return renderWebsiteRevealStage(client, options);
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
}

function renderPublishStage(client, options = {}) {
  const workspaceMode = options.workspaceMode === true;
  const runtime = getLumixRuntime(client);
  const publishEligibility = runtime.actions.publish_pack;

<<<<<<< HEAD
  if (!publishEligibility.ready && !hasContent(client)) {
    return `
      <div class="stage-card stage-card-locked">
      <div class="section-head">
        <div>
          <span class="section-kicker">Vaihe 5</span>
          <h4>Julkaise</h4>
        </div>
        <p>Odottaa esikatselua.</p>
      </div>
      <p class="body-copy">${escapeHtml(publishEligibility.reason || "Generoi ensin sisältö.")}</p>
    </div>
    `;
=======
  if (workspaceMode) {
    return `
      <section class="workspace-stage-panel" data-guide="publish">
        ${renderStageGate({
          number: 5,
          title: "Publish",
          description: publishReadiness.ready
            ? "Go live when the preview looks right."
            : "Resolve the publish blocker before going live.",
          readyItems: [
            hasContent(client) ? "Content pack ready" : "",
            client.publishTargets.length ? `${client.publishTargets.length} channel connected` : "",
            client.publishHistory.length ? "Already published" : ""
          ].filter(Boolean),
          blocker: publishReadiness.ready ? "" : publishReadiness.text,
          primaryAction: publishEligibility.ready
            ? {
                kind: "action",
                label: "Publish",
                action: "publish-all"
              }
            : {
                kind: "focus",
                label: hasContent(client) ? "Resolve blocker" : "Open preview",
                target: hasContent(client) ? publishReadiness.target : "[data-guide='preview']"
              },
          secondaryAction: {
            kind: "focus",
            label: "Review preview",
            target: "[data-guide='preview']",
            ghost: true
          },
          tone: publishReadiness.ready ? (status === "completed" ? "completed" : "current") : "upcoming"
        })}
        <div class="stage-card ${getStageSurfaceClass(client, "publish")}">
          <div class="publish-readiness-card publish-readiness-card-${publishReadiness.tone}">
            <div class="publish-readiness-head">
              <strong>${escapeHtml(publishReadiness.title)}</strong>
              <span class="publish-readiness-badge">${escapeHtml(publishReadiness.ready ? "Ready" : "Blocked")}</span>
            </div>
            <p class="body-copy">${escapeHtml(publishReadiness.text)}</p>
            <div class="publish-check-list">
              <span class="publish-check-item ${hasContent(client) ? "publish-check-item-done" : ""}">Content pack</span>
              <span class="publish-check-item ${client.publishTargets.length ? "publish-check-item-done" : ""}">Publish channel</span>
              <span class="publish-check-item ${client.publishHistory.length ? "publish-check-item-done" : ""}">Go live</span>
            </div>
          </div>

          ${
            client.leads.length || client.analytics.leadSubmits
              ? `
                <details class="stage-subdetails">
                  <summary>Recent leads</summary>
                  <div class="mini-list">
                    ${renderLeads(client.leads.slice(0, 3))}
                  </div>
                </details>
              `
              : ""
          }
        </div>
      </section>
    `;
  }

  if (status === "upcoming" && !hasContent(client)) {
    return renderStageSummary({
      number: 5,
      title: "Publish",
      summary: publishEligibility.reason || "Publish opens after assets are ready.",
      status,
      primaryAction: {
        kind: "focus",
        label: "Open preview",
        target: "[data-guide='preview']"
      }
    });
  }

  if (status === "completed" && client.publishHistory.length) {
    return renderStageSummary({
      number: 5,
      title: "Publish",
      summary: `Published ${formatDate(client.publishHistory[0].createdAt)}.`,
      status,
      primaryAction: {
        kind: "focus",
        label: "View publish",
        target: "[data-guide='publish']"
      }
    });
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
  }

  return `
    <div class="stage-card">
      <div class="section-head">
        <div>
          <span class="section-kicker">Vaihe 5</span>
          <h4>Julkaise</h4>
        </div>
        <p>Vie valmis paketti ulos.</p>
      </div>
      <p class="body-copy stage-inline-note">
        ${
          client.publishTargets.length
            ? `Julkaisukanavia ${client.publishTargets.length}.`
            : "Julkaisukanavaa ei ole vielä lisätty."
        }
        ${client.publishHistory.length ? ` Viimeisin julkaisu ${formatDate(client.publishHistory[0].createdAt)}.` : ""}
      </p>
      <p class="body-copy">${escapeHtml(publishEligibility.reason || "")}</p>

      ${
        publishEligibility.ready
          ? `
            <div class="stage-actions">
              <button type="button" data-action="publish-all" data-guide="publish">Julkaise sisältö</button>
            </div>
          `
          : `
            <p class="body-copy">Lisää ensin yksi julkaisukanava lisäasetuksista. Sen jälkeen julkaisu onnistuu tästä.</p>
          `
      }

      ${
        client.leads.length || client.analytics.leadSubmits
          ? `
            <details class="stage-subdetails">
              <summary>Näytä liidit</summary>
              <div class="mini-list">
                ${renderLeads(client.leads.slice(0, 3))}
              </div>
            </details>
          `
          : ""
      }
    </div>
  `;
}

function renderLeadsStage(client) {
  const leadPreview = client.leads.slice(0, 3);

  return `
    <div class="stage-card">
      <div class="section-head">
        <div>
          <span class="section-kicker">Vaihe 5</span>
          <h4>Liidit</h4>
        </div>
        <p>Näe tulos yhdellä silmäyksellä.</p>
      </div>

      <div class="flow-strip compact-stat-strip">
        <span class="flow-pill">Näytöt ${client.analytics.pageViews}</span>
        <span class="flow-pill">CTA ${client.analytics.ctaClicks}</span>
        <span class="flow-pill">Liidit ${client.analytics.leadSubmits}</span>
      </div>

      <details class="stage-subdetails" open data-guide="leads">
        <summary>Viimeisimmät liidit</summary>
        <div class="mini-list">
          ${leadPreview.length ? renderLeads(leadPreview) : '<p class="body-copy">Kun sivulla tehdään yhteydenottoja, ne näkyvät täällä.</p>'}
        </div>
      </details>
    </div>
  `;
}

function renderClientExtras(client) {
  const history = client.generationHistory.length
    ? `
        <ul class="history-list">
          ${client.generationHistory
            .map(
              (entry) => `
                <li>${escapeHtml(entry.status)} • ${escapeHtml(entry.mode)} • ${formatDate(entry.createdAt)}${entry.message ? ` • ${escapeHtml(entry.message)}` : ""}</li>
              `
            )
            .join("")}
        </ul>
      `
    : '<p class="body-copy">Ei generointihistoriaa vielä.</p>';

  const lumixAction = lumixActionState.get(client.id);

  return `
    <details class="panel client-ops-panel">
      <summary>Lisäasetukset</summary>

      <div class="client-extra-stack" data-client-id="${client.id}">
        <div class="editor-frame ops-box">
          <h4>Ohje agentille</h4>
          <p class="body-copy">Tallenna tähän vain asiakaskohtaiset lisätoiveet.</p>
          <textarea data-prompt-editor rows="4" placeholder="Asiakaskohtaiset ohjeet">${escapeHtml(client.customPrompt || "")}</textarea>
          <button type="button" data-action="save-prompt" class="ghost-button">Tallenna ohje</button>
        </div>

        <div class="ops-compartment-grid">
          <div class="publish-frame ops-box" data-guide="publish-settings">
            <h4>Julkaisukanavat</h4>
            <p class="body-copy">Lisää yksi kanava kerrallaan. Tekninen config on piilotettu alemmas.</p>
            <div class="mini-list">${renderPublishTargets(client)}</div>
            <form class="stack-form target-form" data-target-form>
              <label>
                <span>Kanavan nimi</span>
                <input name="name" placeholder="Pääblogi" required />
              </label>
              <div class="inline-grid">
                <label>
                  <span>Alusta</span>
                  <select name="platform">
                    <option value="wordpress">WordPress</option>
                    <option value="webflow">Webflow</option>
                  </select>
                </label>
                <label>
                  <span>Osoite</span>
                  <input name="baseUrl" placeholder="https://example.com" />
                </label>
              </div>
              <label class="checkbox-row">
                <input name="autoPublish" type="checkbox" />
                <span>Julkaise automaattisesti</span>
              </label>

              <details class="stage-subdetails">
                <summary>Lisää tekniset tiedot</summary>

                <div class="inline-grid">
                  <label>
                    <span>Käyttäjä</span>
                    <input name="username" placeholder="api-user" />
                  </label>
                  <label>
                    <span>Salasana / app password</span>
                    <input name="applicationPassword" placeholder="application password" />
                  </label>
                </div>

                <div class="inline-grid">
                  <label>
                    <span>Status</span>
                    <input name="status" placeholder="draft / published" />
                  </label>
                  <label>
                    <span>API token</span>
                    <input name="apiToken" placeholder="Webflow token" />
                  </label>
                </div>

                <div class="inline-grid">
                  <label>
                    <span>Site ID</span>
                    <input name="siteId" placeholder="webflow-site-id" />
                  </label>
                  <label>
                    <span>Collection ID</span>
                    <input name="collectionId" placeholder="webflow-collection-id" />
                  </label>
                </div>
              </details>

              <button type="submit" class="ghost-button">Lisää kanava</button>
            </form>
          </div>

          <div class="history-frame ops-box">
            <h4>Historia ja tila</h4>
            <p class="body-copy">Täältä näet mitä järjestelmä on tehnyt ja mikä tila asiakkaalla on.</p>
            <div class="split-history">
              <div>
                <span class="section-kicker">Generointihistoria</span>
                ${history}
              </div>
              <div>
                <span class="section-kicker">Julkaisuhistoria</span>
                ${renderPublishHistory(client)}
              </div>
            </div>
            ${
              client.subscription
                ? `<p class="body-copy">Tilaus: ${escapeHtml(client.subscription.status)}${client.subscription.currentPeriodEnd ? ` asti ${formatDate(client.subscription.currentPeriodEnd)}` : ""}</p>`
                : '<p class="body-copy">Ei Stripe-tilausta tallennettuna.</p>'
            }
          </div>
        </div>

        <div class="ops-compartment-grid">
          <div class="meta-box extra-actions-box ops-box">
            <strong>Hallinta</strong>
            <p>Harvemmin käytettävät toiminnot ovat täällä.</p>
            <div class="stack-actions">
              <button type="button" data-action="toggle-schedule" class="ghost-button">
                ${client.scheduleEnabled ? "Pysäytä ajastus" : "Jatka ajastusta"}
              </button>
              <button type="button" data-action="checkout" class="ghost-button">Avaa checkout</button>
            </div>
          </div>

          <details class="meta-box extra-actions-box ops-box debug-box">
            <summary>Lumi debug</summary>
            ${
              lumixAction
                ? `
                  <div class="lumix-action-card">
                    <strong>${escapeHtml(lumixAction.action)}</strong>
                    <p>Objektit: ${lumixAction.objectCount} • Linkit: ${lumixAction.linkCount}</p>
                    ${lumixAction.explanation?.reason ? `<p>${escapeHtml(lumixAction.explanation.reason)}</p>` : ""}
                    ${
                      lumixAction.explanation?.missingObjects?.length
                        ? `<p>Puuttuu: ${escapeHtml(lumixAction.explanation.missingObjects.join(", "))}</p>`
                        : ""
                    }
                    ${
                      lumixAction.ready !== undefined
                        ? `<p>Valmis ajoon: ${lumixAction.ready ? "kyllä" : "ei"}</p>`
                        : ""
                    }
                    ${
                      lumixAction.targetCount !== undefined
                        ? `<p>Julkaisukohteet: ${lumixAction.targetCount}</p>`
                        : ""
                    }
                  </div>
                `
                : '<p class="body-copy">Ei viimeisintä Lumi-debugia vielä.</p>'
            }
          </details>
        </div>
      </div>
    </details>
  `;
}

function renderEmptyWorkspace() {
  activeClientView.innerHTML = `
    <article class="panel workflow-empty dashboard-empty-card">
      <div class="panel-head">
        <div>
          <span class="section-kicker">Lumix workspace</span>
          <h2>Create your first client</h2>
        </div>
        <p>When you add a client, this area becomes a focused review space for strategy, content and SEO.</p>
      </div>

<<<<<<< HEAD
      <div class="flow-strip">
        <span class="flow-pill">1. Client brief</span>
        <span class="flow-pill">2. Strategy</span>
        <span class="flow-pill">3. Generate</span>
        <span class="flow-pill">4. Preview</span>
        <span class="flow-pill">5. Publish</span>
      </div>

      <div class="next-step-card dashboard-empty-note">
        <span class="section-kicker">Lumix</span>
        <strong>Lumix turns the dashboard into one review flow instead of many disconnected admin panels.</strong>
        <div class="stage-actions stage-actions-inline">
          <button type="button" class="ghost-button" data-empty-action="lumix">Käynnistä Lumix</button>
=======
      <div class="next-step-card">
        <span class="section-kicker">Lumi</span>
        <strong>Lumi auttaa seuraavassa vaiheessa, mutta itse työ tehdään tässä workflow’ssa.</strong>
        <div class="stage-actions">
          <button type="button" class="ghost-button" data-open-drawer="new-client">+ New client</button>
          <button type="button" class="ghost-button" data-empty-action="lumix">Käynnistä Lumi</button>
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
        </div>
      </div>
    </article>
  `;

  if (workspaceRail) {
    workspaceRail.innerHTML = "";
  }
}

function renderClientSelector(clients) {
  clientsCaption.textContent = formatClientCount(clients.length);

  if (!clients.length) {
    clientsList.innerHTML = '<article class="mini-card"><p>Ei asiakkaita vielä.</p></article>';
    activeClientSelect.innerHTML = '<option value="">No clients yet</option>';
    activeClientSelect.disabled = true;
    renderEmptyWorkspace();
    return;
  }

  const activeId = state.activeClientId;
  activeClientSelect.disabled = false;
  activeClientSelect.innerHTML = clients
    .map(
      (client) => `
        <option value="${client.id}"${client.id === activeId ? " selected" : ""}>${escapeHtml(client.businessName)}</option>
      `
    )
    .join("");

<<<<<<< HEAD
  clientsList.innerHTML = clients
=======
  clientsList.innerHTML = filteredClients
    .slice(0, 6)
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
    .map(
      (client) => {
        const nextAction = getLumixRuntime(client).nextStep?.actionId;
        const statusLabel =
          nextAction === "recommend_strategy"
            ? "Generoi kaikki"
            : nextAction === "generate_pack"
              ? "Generoi kaikki"
              : nextAction === "publish_pack"
                ? "Julkaise"
                : nextAction === "review_leads"
                  ? "Valmis"
                  : "Aloita tiedoista";

        return `
        <button
          type="button"
          class="client-selector-button${client.id === activeId ? " client-selector-button-active" : ""}"
          data-client-select="${client.id}"
        >
          <div class="client-selector-row">
            <strong>${escapeHtml(client.businessName)}</strong>
            <span class="client-selector-status">${escapeHtml(statusLabel)}</span>
          </div>
        </button>
      `;
      }
    )
    .join("");
}

<<<<<<< HEAD
function getStatusHeroContent(client) {
  if (!hasProfile(client)) {
    return {
      eyebrow: "Client setup",
      title: "Client profile is still missing the basics.",
      text: "Fill the client brief first so Lumix can turn it into a usable strategy and content direction.",
      action: {
        label: "Open client brief",
        className: "ghost-button",
        guide: "intake",
        action: null
      }
    };
  }

  if (!client.strategyRecommendation) {
    return {
      eyebrow: "Lumix status",
      title: "Client ready. Next step: create the strategy.",
      text: "Lumix can now generate positioning, offer framing and content angles for this client.",
      action: {
        label: "Build strategy",
        className: "dashboard-cta-button",
        guide: "recommend",
        action: "recommend"
      }
    };
  }

  if (!hasContent(client)) {
    return {
      eyebrow: "Lumix status",
      title: "Strategy ready. Next step: generate your content.",
      text: "The positioning and content direction are ready. Generate the landing page, blogs and SEO package from the same flow.",
      action: {
        label: "Generate everything",
        className: "dashboard-cta-button",
        guide: "generate",
        action: "generate"
      }
    };
  }

  if (!client.publishHistory.length) {
    return {
      eyebrow: "Lumix status",
      title: "Content ready. Next step: review and publish.",
      text: "Landing page, blog content and SEO direction are ready for review. Publish when the package looks good.",
      action: {
        label: client.publishTargets.length ? "Publish now" : "Content ready",
        className: client.publishTargets.length ? "dashboard-cta-button" : "ghost-button",
        guide: client.publishTargets.length ? "publish" : "publish-settings",
        action: client.publishTargets.length ? "publish-all" : null
      }
    };
  }

  return {
    eyebrow: "Lumix status",
    title: "Published. Next step: track leads and iterate.",
    text: "The first package is live. Review leads, refresh content and continue improving the account from the same workspace.",
    action: {
      label: "Generate another round",
      className: "dashboard-cta-button",
      guide: "generate",
      action: "generate"
    }
  };
}

function renderPreviewPanel(client) {
  const activeTab = getActivePreviewTab(client);
  const tabs = getPreviewTabs(client);
  const activeBlogIndex = activeTab.startsWith("blog-") ? Number(activeTab.split("-")[1]) : -1;
  const activeBlog = activeBlogIndex >= 0 ? client.blogs[activeBlogIndex] : null;

  let previewContent = "";
  if (activeTab === "landing") {
    previewContent = `
      <div class="preview-window preview-window-landing">
        <div class="tag">Website preview</div>
        <h3>${escapeHtml(client.website?.headline || client.businessName)}</h3>
        <p>${escapeHtml(client.website?.subheadline || client.description)}</p>
        <div class="preview-actions">
          <button class="dashboard-cta-button" type="button">${escapeHtml(client.website?.cta || "Get in touch")}</button>
          <a class="ghost-link compact-link" href="/client/${client.id}" target="_blank" rel="noopener">Open public page</a>
        </div>
      </div>
    `;
  } else if (activeTab === "seo") {
    previewContent = `
      <div class="preview-window preview-window-article">
        <div class="tag">SEO preview</div>
        <h3>${escapeHtml(client.seo?.title || `${client.businessName} SEO package`)}</h3>
        <p>${escapeHtml(client.seo?.metaDescription || "SEO metadata appears here after generation.")}</p>
        <div class="preview-meta-stack">
          <div class="preview-meta-item">
            <span>Slug</span>
            <strong>/${escapeHtml(client.seo?.slug || client.businessName.toLowerCase().replaceAll(/\s+/g, "-"))}</strong>
          </div>
          <div class="preview-meta-item">
            <span>Keywords</span>
            <strong>${escapeHtml(ensureArray(client.seo?.keywords).join(", ") || "No keywords yet")}</strong>
          </div>
        </div>
      </div>
    `;
  } else {
    previewContent = `
      <div class="preview-window preview-window-article">
        <div class="tag">Blog preview</div>
        <h3>${escapeHtml(activeBlog?.title || "Blog draft")}</h3>
        <p>${escapeHtml(activeBlog?.excerpt || stripHtmlPreview(activeBlog?.html) || "Blog preview appears here after generation.")}</p>
        <div class="preview-meta-stack">
          <div class="preview-meta-item">
            <span>Keyword</span>
            <strong>${escapeHtml(activeBlog?.keyword || "No keyword yet")}</strong>
          </div>
          <div class="preview-meta-item">
            <span>Status</span>
            <strong>Draft preview</strong>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <section class="card dashboard-preview-card">
      <div class="tabs dashboard-preview-tabs">
        ${tabs
          .map(
            (tab) => `
              <button type="button" class="tab${tab.id === activeTab ? " active" : ""}" data-preview-tab="${tab.id}">
                ${escapeHtml(tab.label)}
              </button>
            `
          )
          .join("")}
      </div>

      <div class="preview">
        ${previewContent}
      </div>
    </section>
  `;
}

function renderClientSummaryCard(client) {
  const profile = client.businessProfile || {};
  return `
    <section class="card side-card dashboard-side-card">
      <div class="eyebrow">Client</div>
      <h4>${escapeHtml(client.businessName)}</h4>
      <div class="summary-list">
        <div><strong>Plan:</strong> ${escapeHtml(client.plan)}</div>
        <div><strong>Audience:</strong> ${escapeHtml(profile.audienceType || "Not defined yet")}</div>
        <div><strong>CTA:</strong> ${escapeHtml(profile.mainCta || client.website?.cta || "Not defined yet")}</div>
        <div><strong>Market:</strong> ${escapeHtml(profile.geoFocus || "Not defined yet")}</div>
      </div>
    </section>
  `;
}

function renderStrategySummaryCard(client) {
  const recommendation = client.strategyRecommendation;
  if (!recommendation) {
    return `
      <section class="card side-card dashboard-side-card">
        <div class="eyebrow">Strategy summary</div>
        <h4>Waiting for Lumix</h4>
        <p class="muted">Build the strategy first to populate audience, offer and content direction here.</p>
      </section>
    `;
  }

  return `
    <section class="card side-card dashboard-side-card">
      <div class="eyebrow">Strategy summary</div>
      <h4>What Lumix built</h4>
      <div class="summary-list">
        <div><strong>Audience:</strong> ${escapeHtml(recommendation.primaryAudience)}</div>
        <div><strong>Positioning:</strong> ${escapeHtml(recommendation.positioning)}</div>
        <div><strong>Offer:</strong> ${escapeHtml(recommendation.primaryOffer)}</div>
        <div><strong>Channels:</strong> ${escapeHtml(["Landing page", "Blog", "SEO"].join(", "))}</div>
      </div>
    </section>
  `;
}

function renderPerformanceCard(client) {
  return `
    <section class="card side-card dashboard-side-card">
      <div class="eyebrow">Performance</div>
      <h4>Quick overview</h4>
      <div class="metric">
        <span>Page views</span>
        <strong>${client.analytics.pageViews}</strong>
      </div>
      <div class="metric">
        <span>CTA clicks</span>
        <strong>${client.analytics.ctaClicks}</strong>
      </div>
      <div class="metric">
        <span>Leads</span>
        <strong>${client.analytics.leadSubmits}</strong>
      </div>
    </section>
  `;
}

function renderPublishCard(client) {
  const canPublish = hasContent(client) && client.publishTargets.length;
  return `
    <section class="card side-card dashboard-side-card">
      <div class="eyebrow">Publish</div>
      <h4>${canPublish ? "Ready to go live" : "Prepare publishing"}</h4>
      <div class="publish-box">
        <p class="muted">
          ${
            canPublish
              ? "Your content is ready for review. Publish when the landing page, blogs and SEO setup look good."
              : client.publishTargets.length
                ? "Generate the content first. Then you can publish it directly from here."
                : "Add at least one publish target in the settings panel before going live."
          }
        </p>
        ${
          canPublish
            ? `<button type="button" class="dashboard-cta-button" data-action="publish-all">Publish now</button>`
            : client.publishTargets.length
              ? `<button type="button" class="ghost-button" data-action="generate">Generate first</button>`
              : `<div class="dashboard-inline-note">Add a publish target from the settings below.</div>`
        }
      </div>
    </section>
  `;
}

function renderStatusHero(client) {
  const hero = getStatusHeroContent(client);

  return `
    <section class="card status-card dashboard-status-card">
      <div>
        <div class="eyebrow">${escapeHtml(hero.eyebrow)}</div>
        <h2>${escapeHtml(hero.title)}</h2>
        <p>${escapeHtml(hero.text)}</p>
      </div>
      <div>
        ${
          hero.action.action
            ? `<button type="button" class="${hero.action.className}" data-action="${hero.action.action}"${hero.action.guide ? ` data-guide="${hero.action.guide}"` : ""}>${escapeHtml(hero.action.label)}</button>`
            : `<button type="button" class="${hero.action.className}"${hero.action.guide ? ` data-guide="${hero.action.guide}"` : ""}>${escapeHtml(hero.action.label)}</button>`
        }
      </div>
    </section>
  `;
}

function renderActiveClient(client) {
  activeClientView.innerHTML = `
    <article class="dashboard-active-workspace" data-client-id="${client.id}">
      ${renderStatusHero(client)}

      <div class="layout dashboard-active-layout">
        <div>
          <div class="column dashboard-preview-column">
            ${renderPreviewPanel(client)}
          </div>
        </div>

        <aside class="right-column dashboard-active-side">
          ${renderClientSummaryCard(client)}
          ${renderStrategySummaryCard(client)}
          ${renderPerformanceCard(client)}
          ${renderPublishCard(client)}
        </aside>
      </div>

      <div class="dashboard-bottom-panels">
        ${renderIntake(client)}
        ${renderClientExtras(client)}
      </div>
=======
function renderDashboardWorkspace(client) {
  return renderWebsiteRevealStage(client, { workspaceMode: true });
}

function renderClientWorkspace(client) {
  const profile = client.businessProfile || {};

  return `
    <section class="workspace-main-card" data-guide="clients">
      <div class="workspace-card-head">
        <div>
          <span class="section-kicker">Client</span>
          <h3>${escapeHtml(client.businessName)}</h3>
        </div>
        <div class="workspace-card-actions">
          <button type="button" class="ghost-button" data-sidebar-target="strategy">Open strategy</button>
        </div>
      </div>

      <div class="workspace-client-grid">
        <article class="workspace-client-brief">
          <span class="section-kicker">Brief</span>
          <strong>${escapeHtml(client.description || "No client brief yet.")}</strong>
          <p class="body-copy">This is the core client context Lumi uses for setup, generation and publishing.</p>
        </article>

        <div class="workspace-client-facts">
          <article class="workspace-fact-card">
            <span>Business type</span>
            <strong>${escapeHtml(getCatalogLabel("businessType", profile.businessType || "") || "Not selected")}</strong>
          </article>
          <article class="workspace-fact-card">
            <span>Audience</span>
            <strong>${escapeHtml(getCatalogLabel("audienceType", profile.audienceType || "") || "Not selected")}</strong>
          </article>
          <article class="workspace-fact-card">
            <span>Goal</span>
            <strong>${escapeHtml(getCatalogLabel("goalType", profile.goalType || "") || "Not selected")}</strong>
          </article>
          <article class="workspace-fact-card">
            <span>Main CTA</span>
            <strong>${escapeHtml(profile.mainCta || "Not set")}</strong>
          </article>
        </div>
      </div>
    </section>
  `;
}

function renderMainWorkspaceCard(client, section) {
  if (section === "client") return renderClientWorkspace(client);
  if (section === "strategy") return renderIntake(client, { workspaceMode: true });
  if (section === "generate") return renderGenerateStage(client, { workspaceMode: true });
  if (section === "preview") return renderPreviewStage(client, { workspaceMode: true });
  if (section === "publish") return renderPublishStage(client, { workspaceMode: true });
  return renderDashboardWorkspace(client);
}

function renderWorkspaceRail(client, section) {
  const profile = client.businessProfile || {};
  const assist = getLumixAssistState(client.id);
  const runtime = getLumixRuntime(client);
  const generating = Boolean(state.generatingClients[client.id]);
  const hasWebsite = Boolean(client.website?.html);
  const canGenerate = Boolean(runtime.actions.generate_pack.ready) || hasWebsite;
  const canPublish = Boolean(runtime.actions.publish_pack.ready);
  const tone =
    getCatalogLabel("toneType", profile.toneType || "") ||
    client.strategyRecommendation?.positioning ||
    "Premium";
  const goal =
    getCatalogLabel("goalType", profile.goalType || "") ||
    client.strategyRecommendation?.ctaStrategy ||
    "Lead generation";
  const headline = getWebsiteHeadline(client);
  const cta = getWebsiteCta(client);
  const quickPrompts = [
    "Make the hero feel more premium.",
    "Make the copy shorter and sharper.",
    "Make the page more sales-focused.",
    "Rewrite the CTA for higher intent leads."
  ];

  return `
    <section class="rail-card rail-card-highlight reveal-control-card" data-client-id="${client.id}">
      <div class="rail-card-head reveal-control-head">
        <div>
          <span class="section-kicker">Controls</span>
          <strong>${escapeHtml(hasWebsite ? "Refine your website" : "Build your website")}</strong>
        </div>
        <span class="rail-badge rail-badge-ready">${escapeHtml(generating ? "Generating" : hasWebsite ? "Preview ready" : "Ready")}</span>
      </div>

      <div class="reveal-control-actions">
        <button type="button" data-action="generate"${!canGenerate || generating ? " disabled" : ""}>
          ${escapeHtml(hasWebsite ? "Regenerate" : "Generate website")}
        </button>
        <button type="button" class="ghost-button" data-copy-prompt="Rewrite the website copy to feel more premium."${generating ? " disabled" : ""}>
          Edit copy
        </button>
        <button type="button" class="ghost-button" data-action="publish-all"${!canPublish ? " disabled" : ""}>
          Publish
        </button>
      </div>

      <div class="reveal-control-facts">
        <article class="reveal-control-fact">
          <span>Tone</span>
          <strong>${escapeHtml(tone)}</strong>
        </article>
        <article class="reveal-control-fact">
          <span>Goal</span>
          <strong>${escapeHtml(goal)}</strong>
        </article>
        <article class="reveal-control-fact">
          <span>Headline</span>
          <strong>${escapeHtml(truncateText(headline, 72))}</strong>
        </article>
        <article class="reveal-control-fact">
          <span>CTA</span>
          <strong>${escapeHtml(truncateText(cta, 54))}</strong>
        </article>
      </div>
    </section>

    <section class="rail-card rail-card-compact reveal-copy-lab" data-client-id="${client.id}">
      <div class="rail-card-head reveal-copy-head">
        <div>
          <span class="section-kicker">Copy lab</span>
          <strong>Tweak without leaving the preview</strong>
        </div>
      </div>

      <div class="reveal-quick-prompts">
        ${quickPrompts
          .map(
            (prompt) => `
              <button type="button" class="ghost-button reveal-quick-prompt" data-copy-prompt="${escapeHtml(prompt)}">
                ${escapeHtml(prompt)}
              </button>
            `
          )
          .join("")}
      </div>

      <form class="reveal-copy-form" data-reveal-copy-form data-client-id="${client.id}">
        <label>
          <span>Ask Lumi to adjust the website</span>
          <textarea
            name="message"
            rows="4"
            placeholder="Make the hero feel more premium, shorten the subheadline and sharpen the CTA."
            required
          ></textarea>
        </label>
        <button type="submit"${generating ? " disabled" : ""}>Edit copy</button>
      </form>

      ${
        assist.reply
          ? `
            <div class="reveal-assist-response">
              <span class="section-kicker">Latest suggestion</span>
              <p>${escapeHtml(assist.reply)}</p>
            </div>
          `
          : `
            <div class="reveal-assist-response reveal-assist-response-muted">
              <span class="section-kicker">Live editing</span>
              <p>Ask Lumi for sharper headlines, shorter copy or a more premium angle. The suggestion appears here instantly.</p>
            </div>
          `
      }

      <div class="reveal-publish-note">
        <strong>${escapeHtml(hasWebsite ? "Preview first, publish when it feels right." : "Generate first, then inspect every section.")}</strong>
        <p>${escapeHtml(canPublish ? "Your publish action stays here in the same control panel." : "Publishing unlocks as soon as the generated site and one destination are ready.")}</p>
      </div>
    </section>
  `;
}

function renderActiveClient(client) {
  const section = getCurrentWorkspaceSection(client);
  const headline = getWebsiteHeadline(client);
  const subheadline = getWebsiteSubheadline(client);
  const generating = Boolean(state.generatingClients[client.id]);

  activeClientView.innerHTML = `
    <article class="workflow-card workspace-canvas" data-client-id="${client.id}">
      <section class="workspace-hero" data-guide="workspace">
        <div class="workspace-hero-copy">
          <span class="section-kicker">Website builder</span>
          <h2>${escapeHtml(client.businessName)}</h2>
          <p class="workspace-hero-status">${escapeHtml(
            generating
              ? "Your website is being assembled in the preview."
              : client.website?.html
                ? "Preview the site, tune the copy and publish from one place."
                : "Generate once and the preview becomes the product."
          )}</p>
          <p class="body-copy">${escapeHtml(truncateText(subheadline || headline, 120))}</p>
        </div>

        <div class="workspace-hero-meta">
          <span class="workspace-hero-chip">${escapeHtml(client.website?.html ? "Website preview ready" : "Website preview")}</span>
          <span class="workspace-hero-chip workspace-hero-chip-muted">${escapeHtml(
            client.website?.html ? "Preview before publish" : "Generate to reveal the site"
          )}</span>
        </div>

        <div class="workspace-hero-actions">
          <button type="button" class="workflow-focus-button" data-action="generate"${generating ? " disabled" : ""}>
            ${escapeHtml(client.website?.html ? "Regenerate" : "Generate website")}
          </button>
        </div>
      </section>

      ${renderMainWorkspaceCard(client, section)}
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
    </article>
  `;

  if (workspaceRail) {
    workspaceRail.innerHTML = "";
  }
}

function render() {
  if (!state.bootstrap) return;

  const clients = state.bootstrap.clients || [];
  syncActiveClientId(clients);

  renderHealth(state.bootstrap.health);
  renderSummary(state.bootstrap.summary);
  renderJobs(state.bootstrap.jobs || []);
  renderTeam(state.bootstrap.members || []);
  renderReportForm(state.bootstrap.reportSettings);
  renderReportHistory(state.bootstrap.reportHistory || []);
  renderLumixPanel();

  agencyTitle.textContent = `${state.bootstrap.user.agencyName}`;
<<<<<<< HEAD
  agencySubtitle.textContent = activeClientSelect.disabled
    ? "Build your website, content and SEO in one clear flow."
    : "Build your website, content and SEO in one clear flow.";
  document.getElementById("team-form").classList.toggle("hidden", state.bootstrap.user.role === "member");
  document.getElementById("report-form").classList.toggle("hidden", state.bootstrap.user.role === "member");
  document.getElementById("send-report-button").classList.toggle("hidden", state.bootstrap.user.role === "member");
=======
  const workspaceName = state.bootstrap.user.agencyName || "EasyOnlinePresence Workspace";
  const userName = getDisplayName(state.bootstrap.user.email || "") || "EasyOnlinePresence User";
  const roleLabel = state.bootstrap.user.role === "owner" ? "Workspace owner" : state.bootstrap.user.role;
  const activeClient = getActiveClient();
  const initials = getInitials(workspaceName, userName) || "LU";

  if (sidebarBrandTitle) sidebarBrandTitle.textContent = workspaceName;
  if (sidebarBrandSubtitle) {
    sidebarBrandSubtitle.textContent = activeClient ? `Active: ${activeClient.businessName}` : "Current workspace";
  }
  if (sidebarUserName) sidebarUserName.textContent = userName;
  if (sidebarUserRole) sidebarUserRole.textContent = roleLabel;
  if (sidebarUserAvatar) sidebarUserAvatar.textContent = initials;
  if (iconRailAvatarLabel) iconRailAvatarLabel.textContent = initials;
  if (workspacePopoverTitle) workspacePopoverTitle.textContent = workspaceName;
  if (workspacePopoverName) workspacePopoverName.textContent = workspaceName;
  if (workspacePopoverMeta) workspacePopoverMeta.textContent = `${clients.length} active client accounts`;
  if (profilePopoverName) profilePopoverName.textContent = userName;

  syncSidebarActiveState();
  document.getElementById("team-form")?.classList.toggle("hidden", state.bootstrap.user.role === "member");
  document.getElementById("report-form")?.classList.toggle("hidden", state.bootstrap.user.role === "member");
  document.getElementById("send-report-button")?.classList.toggle("hidden", state.bootstrap.user.role === "member");

  if (flowRailList) {
    flowRailList.innerHTML = renderFlowRail(activeClient);
  }
  if (flowRailCaption) {
    flowRailCaption.textContent = activeClient
      ? `Now: ${getCurrentFlowStep(activeClient).title}`
      : "Five steps from brief to publish.";
  }
>>>>>>> e87dc7e (Redesign dashboard around website reveal)

  renderClientSelector(clients);

  const activeClient = getActiveClient();
  if (activeClient) {
    agencySubtitle.textContent = `${activeClient.businessName} in review. Build your website, content and SEO in one clear flow.`;
    renderActiveClient(activeClient);
    primaryGenerateButton.disabled = false;
    primaryGenerateButton.textContent = hasContent(activeClient) ? "Generate another round" : "Generate everything";
  } else {
    renderEmptyWorkspace();
    primaryGenerateButton.disabled = true;
    primaryGenerateButton.textContent = "Generate everything";
  }

  if (!state.tourInitialized) {
    state.tourInitialized = true;
    state.tourActive = false;
    state.tourStepIndex = 0;
    state.lumixHidden = window.localStorage.getItem(lumixHiddenStorageKey) === "1";
  }

  renderCoach(activeClient);

  if (state.tourActive) {
    const tourSteps = getTourSteps(activeClient);
    const step = tourSteps[Math.min(state.tourStepIndex, Math.max(tourSteps.length - 1, 0))];
    if (step) {
      highlightGuideTarget(step.target);
    }
  }
}

async function refresh() {
  state.bootstrap = await api("/api/bootstrap");

  if (!state.bootstrap.authenticated) {
    window.location.href = "/login";
    return;
  }

  render();
}

document.getElementById("logout-button").addEventListener("click", async () => {
  await runAction("Kirjaudutaan ulos...", async () => {
    await api("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  });
});

document.getElementById("client-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const raw = readForm(form);
  const payload = {
    businessName: raw.businessName,
    description: raw.description,
    customPrompt: raw.customPrompt,
    plan: raw.plan,
    generationIntervalDays: Number(raw.generationIntervalDays),
    autoGenerate: Boolean(raw.autoGenerate),
    scheduleEnabled: Boolean(raw.scheduleEnabled)
  };

  await runAction(`Luodaan asiakasta ${payload.businessName}...`, async () => {
    const result = await api("/api/clients", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    form.reset();
    state.activeClientId = result.client?.id || state.activeClientId;
    setStatus(
      result.job
        ? `Asiakas luotu. Generointi lisätty jonoon (#${result.job.id}).`
        : result.generationDecision?.reason
          ? `Asiakas luotu. ${result.generationDecision.reason}`
          : "Asiakas luotu."
    );
    await refresh();
  });
});

document.getElementById("team-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const raw = readForm(form);

  await runAction(`Lisätään jäsentä ${raw.email}...`, async () => {
    await api("/api/team-members", {
      method: "POST",
      body: JSON.stringify(raw)
    });
    form.reset();
    await refresh();
  });
});

document.getElementById("report-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const raw = readForm(event.currentTarget);

  await runAction("Tallennetaan raporttiasetuksia...", async () => {
    await api("/api/reports/settings", {
      method: "PUT",
      body: JSON.stringify(raw)
    });
    await refresh();
  });
});

document.getElementById("send-report-button").addEventListener("click", async () => {
  await runAction("Lisätään raportti jonoon...", async () => {
    const result = await api("/api/reports/send", { method: "POST" });
    setStatus(`Raportti lisätty jonoon (#${result.job.id}).`);
    await refresh();
  });
});

document.getElementById("scheduler-button").addEventListener("click", async () => {
  await runAction("Ajetaan ajastettuja töitä...", async () => {
    const result = await api("/api/scheduler/run-now", { method: "POST" });
    setStatus(`Ajastus lisäsi ${result.results.length} työtä jonoon.`);
    await refresh();
  });
});

document.getElementById("worker-button").addEventListener("click", async () => {
  await runAction("Ajetaan jono nyt...", async () => {
    const result = await api("/api/worker/run-now", { method: "POST" });
    setStatus(`Jono käsitteli ${result.results.length} työtä.`);
    await refresh();
  });
});

teamList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action='set-role']");
  if (!button) return;

  await runAction("Päivitetään käyttäjän roolia...", async () => {
    await api(`/api/team-members/${button.dataset.memberId}`, {
      method: "PATCH",
      body: JSON.stringify({ role: button.dataset.role })
    });
    await refresh();
  });
});

clientsList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-client-select]");
  if (!button) return;
  state.activeClientId = Number(button.dataset.clientSelect);
  render();
});

activeClientSelect.addEventListener("change", (event) => {
  state.activeClientId = Number(event.currentTarget.value);
  render();
});

<<<<<<< HEAD
primaryGenerateButton.addEventListener("click", async () => {
  const client = getActiveClient();
  if (!client) return;

  await runAction(`Generoidaan asiakkaalle ${client.businessName}...`, async () => {
    const result = await api(`/api/clients/${client.id}/generate`, { method: "POST" });
    if (result.lumixAction) {
      lumixActionState.set(client.id, result.lumixAction);
    }
    setStatus(`Generointi lisätty jonoon (#${result.job.id}).`);
    await refresh();
  });
});

activeClientView.addEventListener("submit", async (event) => {
=======
async function handleClientAreaSubmit(event) {
  const copyForm = event.target.closest("form[data-reveal-copy-form]");
  if (copyForm) {
    event.preventDefault();

    const clientId = Number(copyForm.dataset.clientId || copyForm.closest("[data-client-id]")?.dataset.clientId);
    const raw = readForm(copyForm);

    await runAction("Lumi muokkaa sivun copya...", async () => {
      await requestLumixAssist(clientId, raw.message, "Lumi muokkaa sivun copya...");
      copyForm.reset();
      setStatus("Copy suggestion valmis. Tarkista ehdotus oikeasta paneelista.");
    });
    return true;
  }

>>>>>>> e87dc7e (Redesign dashboard around website reveal)
  const intakeForm = event.target.closest("form[data-intake-form]");
  if (intakeForm) {
    event.preventDefault();

    const clientId = Number(intakeForm.closest("[data-client-id]")?.dataset.clientId);
    const raw = readForm(intakeForm);

    await runAction("Tallennetaan yrityksen tietoja...", async () => {
      await api(`/api/clients/${clientId}/intake`, {
        method: "PUT",
        body: JSON.stringify(raw)
      });
      setStatus("Yrityksen tiedot tallennettu.");
      await refresh();
    });
    return;
  }

  const form = event.target.closest("form[data-target-form]");
  if (!form) return;
  event.preventDefault();

  const clientId = Number(form.closest("[data-client-id]")?.dataset.clientId);
  const raw = readForm(form);
  const config = buildPublishConfig(raw);

  await runAction(`Lisätään julkaisukanava asiakkaalle #${clientId}...`, async () => {
    await api(`/api/clients/${clientId}/publish-targets`, {
      method: "POST",
      body: JSON.stringify({
        name: raw.name,
        platform: raw.platform,
        autoPublish: Boolean(raw.autoPublish),
        config
      })
    });
    form.reset();
    await refresh();
  });
});

activeClientView.addEventListener("click", async (event) => {
  const emptyActionButton = event.target.closest("button[data-empty-action='lumix']");
  if (emptyActionButton) {
    activateLumix();
    return;
  }

  const guideOnlyButton = event.target.closest("button[data-guide]:not([data-action])");
  if (guideOnlyButton) {
    highlightGuideTarget(`[data-guide='${guideOnlyButton.dataset.guide}']`);
    return;
  }

  const previewTabButton = event.target.closest("button[data-preview-tab]");
  if (previewTabButton) {
    const client = getActiveClient();
    if (!client) return;
    previewTabState.set(client.id, previewTabButton.dataset.previewTab);
    render();
    return;
  }

  const previewDeviceButton = event.target.closest("button[data-preview-device]");
  if (previewDeviceButton) {
    const root = previewDeviceButton.closest("[data-client-id]");
    const clientId = Number(root?.dataset.clientId);
    if (!clientId) return;
    state.previewDevices[clientId] = previewDeviceButton.dataset.previewDevice;
    render();
    return true;
  }

  const quickPromptButton = event.target.closest("button[data-copy-prompt]");
  if (quickPromptButton) {
    const root = quickPromptButton.closest("[data-client-id]");
    const clientId = Number(root?.dataset.clientId);
    if (!clientId) return true;

    await runAction("Lumi muokkaa sivun copya...", async () => {
      await requestLumixAssist(clientId, quickPromptButton.dataset.copyPrompt || "");
      setStatus("Copy suggestion valmis. Tarkista ehdotus oikeasta paneelista.");
    });
    return true;
  }

  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const root = button.closest("[data-client-id]");
  const clientId = Number(root?.dataset.clientId);
  if (!clientId) return;

  const client = state.bootstrap.clients.find((item) => item.id === clientId);
  const action = button.dataset.action;

  if (action === "generate") {
    state.generatingClients[clientId] = true;
    render();
    await runAction(`Generoidaan asiakkaalle ${client.businessName}...`, async () => {
      const result = await api(`/api/clients/${clientId}/generate-all`, { method: "POST" });
      if (result.lumixAction) {
        lumixActionState.set(clientId, result.lumixAction);
      }
      setStatus(`Sisältö generoitu asiakkaalle ${client.businessName}.`);
      await refresh();
    });
<<<<<<< HEAD
    return;
=======
    delete state.generatingClients[clientId];
    render();
    return true;
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
  }

  if (action === "recommend") {
    await runAction(`Muodostetaan suunta asiakkaalle ${client.businessName}...`, async () => {
      const result = await api(`/api/clients/${clientId}/recommendation`, { method: "POST" });
      if (result.lumixAction) {
        lumixActionState.set(clientId, result.lumixAction);
      }
      setStatus(`Lumixin ehdotus päivitetty asiakkaalle ${client.businessName}.`);
      await refresh();
    });
    return;
  }

  if (action === "toggle-schedule") {
    await runAction(
      `${client.scheduleEnabled ? "Pysäytetään" : "Jatketaan"} ajastusta asiakkaalle ${client.businessName}...`,
      async () => {
        await api(`/api/clients/${clientId}`, {
          method: "PATCH",
          body: JSON.stringify({ scheduleEnabled: !client.scheduleEnabled })
        });
        setStatus(
          `${client.scheduleEnabled ? "Ajastus pysäytetty" : "Ajastus käynnistetty"} asiakkaalle ${client.businessName}.`
        );
        await refresh();
      }
    );
    return;
  }

  if (action === "checkout") {
    await runAction(`Avataan checkout asiakkaalle ${client.businessName}...`, async () => {
      const result = await api(`/api/clients/${clientId}/checkout`, {
        method: "POST",
        body: JSON.stringify({ plan: client.plan })
      });
      if (result.checkout.url) {
        window.open(result.checkout.url, "_blank", "noopener");
        setStatus("Stripe Checkout avattiin uuteen välilehteen.");
      } else {
        setStatus(result.checkout.message || "Stripe ei ole käytössä.");
      }
      await refresh();
    });
    return;
  }

  if (action === "save-prompt") {
    const textarea = root.querySelector("[data-prompt-editor]");
    await runAction(`Tallennetaan ohje asiakkaalle ${client.businessName}...`, async () => {
      await api(`/api/clients/${clientId}`, {
        method: "PATCH",
        body: JSON.stringify({ customPrompt: textarea.value })
      });
      setStatus(`Ohje tallennettu asiakkaalle ${client.businessName}.`);
      await refresh();
    });
    return;
  }

  if (action === "publish-all") {
    await runAction(`Julkaistaan asiakkaan ${client.businessName} sisältö...`, async () => {
      const result = await api(`/api/clients/${clientId}/publish`, {
        method: "POST",
        body: JSON.stringify({})
      });
      if (result.lumixAction) {
        lumixActionState.set(clientId, result.lumixAction);
      }
      setStatus(`Julkaisu lisätty jonoon (#${result.job.id}).`);
      await refresh();
    });
    return;
  }

  if (action === "publish-target") {
    await runAction(`Julkaistaan kohde asiakkaalle ${client.businessName}...`, async () => {
      const result = await api(`/api/clients/${clientId}/publish`, {
        method: "POST",
        body: JSON.stringify({ targetId: Number(button.dataset.targetId) })
      });
      if (result.lumixAction) {
        lumixActionState.set(clientId, result.lumixAction);
      }
      setStatus(`Julkaisu lisätty jonoon (#${result.job.id}).`);
      await refresh();
    });
  }
<<<<<<< HEAD
=======
  return true;
}

activeClientView.addEventListener("submit", (event) => {
  handleClientAreaSubmit(event);
});

workspaceRail?.addEventListener("submit", (event) => {
  handleClientAreaSubmit(event);
});

clientAdvancedView?.addEventListener("submit", (event) => {
  handleClientAreaSubmit(event);
});

activeClientView.addEventListener("click", (event) => {
  handleClientAreaClick(event);
});

workspaceRail?.addEventListener("click", (event) => {
  handleClientAreaClick(event);
});

clientAdvancedView?.addEventListener("click", (event) => {
  handleClientAreaClick(event);
>>>>>>> e87dc7e (Redesign dashboard around website reveal)
});

lumixButton.addEventListener("click", () => {
  activateLumix();
});

lumixCoach.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-lumix-form]");
  if (!form) return;
  event.preventDefault();

  const clientId = Number(form.dataset.clientId);
  const raw = readForm(form);

  await runAction("Lumi miettii ideaa...", async () => {
    await requestLumixAssist(clientId, raw.message);
    form.reset();
  });
});

lumixCoach.addEventListener("click", (event) => {
  const button = event.target.closest("[data-coach-action]");
  if (!button) return;
  const action = button.dataset.coachAction;
  const activeClient = getActiveClient();

  if (action === "focus") {
    highlightGuideTarget(button.dataset.target);
    return;
  }

  if (action === "collapse") {
    state.lumixHidden = true;
    window.localStorage.setItem(lumixHiddenStorageKey, "1");
    renderCoach(activeClient);
    return;
  }

  if (action === "expand") {
    state.lumixHidden = false;
    window.localStorage.setItem(lumixHiddenStorageKey, "0");
    renderCoach(activeClient);
    return;
  }

  if (action === "apply-suggestion") {
    const activeClient = getActiveClient();
    if (!activeClient) return;

    const assist = getLumixAssistState(activeClient.id);
    const updates = assist.suggestedUpdates || {};

    runAction("Lumi päivittää ehdotusta asiakkaalle...", async () => {
      const intakePayload = buildIntakePayloadFromClient(activeClient, updates);
      await api(`/api/clients/${activeClient.id}/intake`, {
        method: "PUT",
        body: JSON.stringify(intakePayload)
      });

      if (updates.customPrompt !== undefined) {
        await api(`/api/clients/${activeClient.id}`, {
          method: "PATCH",
          body: JSON.stringify({ customPrompt: updates.customPrompt })
        });
      }

      setStatus("Lumin ehdotus lisättiin asiakkaan tietoihin.");
      await refresh();
    });
    return;
  }

  if (action === "start-tour") {
    state.lumixHidden = false;
    window.localStorage.setItem(lumixHiddenStorageKey, "0");
    state.tourActive = true;
    state.tourStepIndex = 0;
    render();
    return;
  }

  if (action === "prev") {
    state.tourStepIndex = Math.max(0, state.tourStepIndex - 1);
    render();
    return;
  }

  if (action === "next") {
    const steps = getTourSteps(activeClient);
    state.tourStepIndex = Math.min(steps.length - 1, state.tourStepIndex + 1);
    render();
    return;
  }

  if (action === "finish" || action === "stop") {
    finishTour();
    renderCoach(activeClient);
  }
});

refresh().catch((error) => {
  setStatus(getErrorMessage(error));
});
