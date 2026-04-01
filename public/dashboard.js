import { clearAuthenticated, hasStoredAuth, markAuthenticated, redirectTo } from "./auth-state.js";

const state = {
  bootstrap: null,
  activeClientId: null,
  tourActive: false,
  tourStepIndex: 0,
  tourInitialized: false,
  lumixHidden: false
};

const summaryGrid = document.getElementById("summary-grid");
const clientsList = document.getElementById("clients-list");
const clientsCaption = document.getElementById("clients-caption");
const flowRailList = document.getElementById("flow-rail-list");
const flowRailCaption = document.getElementById("flow-rail-caption");
const agencyTitle = document.getElementById("agency-title");
const statusBanner = document.getElementById("status-banner");
const teamList = document.getElementById("team-list");
const reportHistory = document.getElementById("report-history");
const jobsList = document.getElementById("jobs-list");
const lumixCodex = document.getElementById("lumix-codex");
const lumixSummary = document.getElementById("lumix-summary");
const activeClientView = document.getElementById("active-client-view");
const lumixCoach = document.getElementById("lumix-coach");
const lumixButton = document.getElementById("lumix-button");
const lumixActionState = new Map();
const lumixAssistState = new Map();
let guideHighlightTimeout = null;
const lumixTourStorageKey = "lumix-tour-dismissed-v1";
const lumixHiddenStorageKey = "lumix-hidden-v1";

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

function hasSavedSetup(client) {
  return Boolean(client.strategyRecommendation);
}

function hasContent(client) {
  return Boolean(client.website?.html || client.blogs?.length || client.seo);
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
  if (!hasProfile(client)) {
    return {
      title: "Tee tämä seuraavaksi",
      text: "Lisää asiakas yhdellä briefillä."
    };
  }

  if (!hasSavedSetup(client)) {
    return {
      title: "Tee tämä seuraavaksi",
      text: "Tarkista setup ennen generointia."
    };
  }

  if (!hasContent(client)) {
    return {
      title: "Tee tämä seuraavaksi",
      text: "Paina Generate all. Lumix tekee koko paketin."
    };
  }

  if (!client.publishHistory.length) {
    return {
      title: "Tee tämä seuraavaksi",
      text: client.publishTargets.length
        ? "Tarkista lopputulos ja julkaise."
        : "Tarkista lopputulos ja lisää yksi publish-kanava."
    };
  }

  return {
    title: "Flow valmis",
    text: "Publish on tehty. Seuraa nyt tuloksia ja päivitä sisältöä tarpeen mukaan."
  };
}

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
      target: "[data-guide='publish-settings']"
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

function getWorkflowGuide(client) {
  const currentStep = getCurrentFlowStep(client);
  const completedSteps = countCompletedSteps(client);
  const publishReadiness = getPublishReadiness(client);

  if (!hasProfile(client)) {
    return {
      stateLabel: "Brief added",
      stateTone: "draft",
      heading: "Review setup",
      description: "Turn the brief into a usable setup so Lumix can build the strategy next.",
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
      description: "Your business details are in place. Generate the Lumix setup before assets.",
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

function renderWorkflowFocus(client) {
  const currentStep = getCurrentFlowStep(client);
  const guide = getWorkflowGuide(client);

  return `
    <div class="workflow-focus-card">
      <div class="workflow-focus-copy">
        <div class="workflow-focus-meta">
          <span class="section-kicker">Next action</span>
          <span class="workflow-focus-step">Step ${escapeHtml(String(currentStep.number))} / 5</span>
          <span class="workflow-state-pill workflow-state-pill-${escapeHtml(guide.stateTone)}">${escapeHtml(guide.stateLabel)}</span>
        </div>
        <h3>${escapeHtml(guide.heading)}</h3>
        <p class="body-copy">${escapeHtml(guide.description)}</p>
        <p class="workflow-focus-helper">${escapeHtml(guide.helper)}</p>
      </div>

      <div class="workflow-focus-side">
        <div class="workflow-focus-grid">
          <article class="workflow-status-card">
            <span>Active client</span>
            <strong>${escapeHtml(client.businessName)}</strong>
          </article>
          <article class="workflow-status-card">
            <span>Current status</span>
            <strong>${escapeHtml(guide.stateLabel)}</strong>
          </article>
          <article class="workflow-status-card">
            <span>Publish</span>
            <strong>${escapeHtml(guide.publishReadiness.title)}</strong>
            <p>${escapeHtml(guide.publishReadiness.text)}</p>
          </article>
        </div>
        ${renderWorkflowFocusAction(client, guide)}
      </div>
    </div>
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
        text: "Lumix ehdottaa rakennetta ja CTA:ta.",
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
  const publishTarget = client.publishTargets.length ? "[data-guide='publish']" : "[data-guide='publish-settings']";

  const currentKey = !setupReady
    ? "setup"
    : !contentReady
      ? "generate"
      : !published
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
            : step.key === "preview" && published
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

function getTourSteps(client) {
  const steps = [
    {
      title: "Asiakkaat",
      text: "Täältä valitset aina yhden asiakkaan kerrallaan.",
      target: "[data-guide='clients']"
    },
    {
      title: "Tell us about your business",
      text: "Tämä on aloituskohta. Kirjoita yksi business-kuvaus ja Lumix muodostaa setupin.",
      target: "[data-guide='new-client']"
    }
  ];

  if (client) {
    steps.push(
      {
        title: "Suggested setup",
        text: "Tässä näet categoryn, audience:n, headline-ideat, rakenteen ja CTA:n yhdestä syötteestä.",
        target: "[data-guide='intake']"
      },
      {
        title: "Generate all",
        text: "Tämä on päätoiminto. Lumix tekee sivun, blogit ja SEO:n samalla.",
        target: "[data-guide='generate']"
      },
      {
        title: "Näe lopputulos",
        text: "Täältä tarkistat valmiin sivun, blogit ja SEO:n ennen Publish-vaihetta.",
        target: "[data-guide='preview']"
      },
      {
        title: "Publish",
        text: "Kun lopputulos näyttää oikealta, julkaisu tehdään tästä.",
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
      title: "Lumix",
      text: "Lumix toimii tässä dashboardissa. Luo ensin yksi asiakas, niin ohjaan seuraavaan kohtaan.",
      target: "#client-form"
    };
  }

  if (!hasProfile(client)) {
    return {
      title: "Lumix",
      text: "Täytä ensin tiedot ja tallenna ne.",
      target: "[data-guide='intake']"
    };
  }

  if (!hasContent(client)) {
    return {
      title: "Lumix",
      text: "Seuraava klikki on Generate all. Sillä syntyy koko paketti yhdellä kertaa.",
      target: "[data-guide='generate']"
    };
  }

  if (!client.publishTargets.length) {
    return {
      title: "Lumix",
      text: "Näe lopputulos ja lisää sitten yksi publish-kanava lisäasetuksista.",
      target: "[data-guide='publish-settings']"
    };
  }

  if (!client.publishHistory.length) {
    return {
      title: "Lumix",
      text: "Lopputulos on valmis. Seuraava klikki on Publish.",
      target: "[data-guide='publish']"
    };
  }

  return {
    title: "Lumix",
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
        <span>Lumix</span>
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
            <strong>Lumix opastus</strong>
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
                <span>Kirjoita idea Lumixille</span>
                <textarea
                  name="message"
                  rows="3"
                  placeholder="Esim. tee tästä premiumimpi, kohdenna hotelleille ja tee CTA tarjouspyyntöön."
                  required
                ></textarea>
              </label>
              <button type="submit">Kysy Lumixilta</button>
            </form>
          `
          : ""
      }
      ${
        hasAssistReply
          ? `
            <div class="lumix-coach-reply">
              <strong>Lumix</strong>
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
  const activeClient = getActiveClient();
  const guide = activeClient ? getWorkflowGuide(activeClient) : null;
  if (!agent) {
    lumixSummary.textContent = "Lumix-data latautuu...";
    lumixCodex.innerHTML = '<article class="mini-card"><p>Ei dataa vielä.</p></article>';
    return;
  }

  lumixSummary.textContent = guide
    ? `${agent.name}: ${guide.heading}. ${guide.publishReadiness.title}.`
    : `${agent.name} auttaa pitämään flow’n selkeänä.`;
  lumixCodex.innerHTML = `
    ${
      guide
        ? `
          <article class="mini-card">
            <strong>Now</strong>
            <p>${escapeHtml(guide.stateLabel)} • ${escapeHtml(guide.heading)}</p>
            <p>${escapeHtml(guide.publishReadiness.text)}</p>
          </article>
        `
        : ""
    }
    <article class="mini-card">
      <strong>${escapeHtml(agent.name)}</strong>
      <p>${escapeHtml(agent.summary)}</p>
    </article>
    <article class="mini-card">
      <strong>Miten Lumix auttaa</strong>
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

  return `
    <article class="website-mock${compact ? " website-mock-compact" : ""}">
      <div class="website-mock-chrome">
        <div class="website-mock-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="website-mock-url">${escapeHtml(client.businessName.toLowerCase().replace(/\s+/g, "-"))}.lumix.site</div>
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

function getStageSurfaceClass(client, key) {
  const step = getPrimaryFlowSteps(client).find((item) => item.key === key);
  return step ? `stage-card-${step.status}` : "";
}

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

function renderIntake(client) {
  const profile = client.businessProfile || {};
  const notes = profile.rawNotes?.notes || "";
  const intakeCatalog = getIntakeCatalog();
  const recommendation = client.strategyRecommendation;
  const setupDetailsOpen = recommendation ? "" : " open";
  const current = isCurrentStep(client, "setup");

  return `
    <div class="intake-frame stage-card ${getStageSurfaceClass(client, "setup")}" data-guide="intake">
      <div class="section-head">
        <div>
          <span class="section-kicker">2 / 5</span>
          <h4>Setup</h4>
        </div>
        <p>${recommendation ? "Ready" : "Review"}</p>
      </div>

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

        ${
          recommendation
            ? `
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

              <div class="strategy-visual-layout">
                <article class="magic-preview-card strategy-structure-card">
                  <span class="section-kicker">Homepage structure</span>
                  ${renderStructurePreview(recommendation.homepageStructure)}
                </article>

                <article class="magic-preview-card strategy-angles-card">
                  <span class="section-kicker">Content angles</span>
                  <div class="angle-card-grid">
                    ${(recommendation.contentAngles || [])
                      .map(
                        (angle, index) => `
                          <article class="angle-card">
                            <span>${index + 1}</span>
                            <strong>${escapeHtml(angle)}</strong>
                          </article>
                        `
                      )
                      .join("")}
                  </div>
                </article>

                <article class="magic-preview-card strategy-cta-card">
                  <span class="section-kicker">CTA focus</span>
                  <div class="cta-focus-pill">${escapeHtml(recommendation.ctaStrategy || "Not set")}</div>
                  <p class="body-copy">${escapeHtml(recommendation.summary || "No summary")}</p>
                  <p class="body-copy">Updated ${escapeHtml(formatDate(recommendation.updatedAt))}</p>
                </article>
              </div>
            `
            : `
              <article class="magic-preview-card">
                <span class="section-kicker">No saved setup yet</span>
                <p class="body-copy">Generate setup from this brief.</p>
              </article>
            `
        }

        <div class="stage-actions">
          <button type="button" class="${current ? "" : "ghost-button"}" data-action="recommend">
            ${recommendation ? "Refresh setup" : "Generate setup"}
          </button>
        </div>
      </div>

      <details class="stage-subdetails"${setupDetailsOpen}>
        <summary>Edit setup</summary>
        <form class="stack-form intake-form" data-intake-form>
          <div class="inline-grid">
            <label>
              <span>Business type</span>
              <select name="businessType">
                ${renderSelectOptions(
                  intakeCatalog.businessType,
                  profile.businessType || "",
                  "Select business type"
                )}
              </select>
            </label>
            <label>
              <span>Target audience</span>
              <select name="audienceType">
                ${renderSelectOptions(
                  intakeCatalog.audienceType,
                  profile.audienceType || "",
                  "Select audience"
                )}
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
            <textarea name="notes" rows="4" placeholder="Add any extra direction for Lumix.">${escapeHtml(notes)}</textarea>
          </label>

          <button type="submit" class="ghost-button">Save setup</button>
        </form>
      </details>
    </div>
  `;
}

function renderRecommendation(client) {
  const recommendation = client.strategyRecommendation;
  const runtime = getLumixRuntime(client);
  const recommendationEligibility = runtime.actions.recommend_strategy;

  if (!hasProfile(client)) {
    return `
      <div class="strategy-frame stage-card-locked">
        <div class="section-head">
          <div>
            <span class="section-kicker">Vaihe 2</span>
            <h4>Lumixin ehdotus</h4>
          </div>
          <p>Odottaa vaihetta 1.</p>
        </div>
        <p class="body-copy">Täydennä ensin yrityksen tiedot.</p>
      </div>
    `;
  }

  if (!recommendation) {
    return `
      <div class="strategy-frame">
        <div class="section-head">
          <div>
            <span class="section-kicker">Vaihe 2</span>
            <h4>Lumixin ehdotus</h4>
          </div>
          <p>Pyydä yksi suunta.</p>
        </div>
        <p class="body-copy">${escapeHtml(recommendationEligibility.reason || "Lumix ehdottaa viestin, CTA:n ja sisältökulmat.")}</p>
        ${
          recommendationEligibility.ready
            ? '<button type="button" data-action="recommend" data-guide="recommend" class="ghost-button">Pyydä ehdotus</button>'
            : ""
        }
      </div>
    `;
  }

  return `
    <div class="strategy-frame">
      <div class="section-head">
        <div>
          <span class="section-kicker">Vaihe 2</span>
          <h4>Lumixin ehdotus</h4>
        </div>
        <p>Hyväksy tämä suunta ja jatka.</p>
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

      <details class="stage-subdetails">
        <summary>Näytä koko ehdotus</summary>

        <div class="strategy-list">
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
      </details>

      <button type="button" data-action="recommend" data-guide="recommend" class="ghost-button">Päivitä ehdotus</button>
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
    stages[0].meta = "Lumix päivitti suuntaa";
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

function renderGenerateStage(client) {
  const runtime = getLumixRuntime(client);
  const generateEligibility = runtime.actions.generate_pack;
  const outputsReady = hasContent(client);
  const current = isCurrentStep(client, "generate");

  if (!generateEligibility.ready && !hasContent(client)) {
    return `
      <div class="stage-card stage-card-locked ${getStageSurfaceClass(client, "generate")}" data-guide="generate">
        <div class="section-head">
          <div>
            <span class="section-kicker">3 / 5</span>
            <h4>Generate all</h4>
          </div>
          <p>Waiting</p>
        </div>
        <div class="generate-asset-grid">
          <article class="generate-asset-card">
            <div class="generate-asset-head">
              <strong>Landing page</strong>
              <span class="generate-asset-badge">Queued</span>
            </div>
            ${renderWebsiteMockPreview(client, true)}
          </article>
          <article class="generate-asset-card">
            <div class="generate-asset-head">
              <strong>Blog pack</strong>
              <span class="generate-asset-badge">Queued</span>
            </div>
            ${renderBlogAssetStack([], true)}
          </article>
          <article class="generate-asset-card">
            <div class="generate-asset-head">
              <strong>SEO package</strong>
              <span class="generate-asset-badge">Queued</span>
            </div>
            ${renderSeoAssetPreview(null, true)}
          </article>
        </div>
        <p class="body-copy">${escapeHtml(generateEligibility.reason || "Täytä tiedot ensin.")}</p>
      </div>
    `;
  }

  return `
    <div class="stage-card ${getStageSurfaceClass(client, "generate")}" data-guide="generate">
      <div class="section-head">
        <div>
          <span class="section-kicker">3 / 5</span>
          <h4>Generate all</h4>
        </div>
        <p>Output inventory</p>
      </div>

      <div class="stage-actions">
        <button type="button" class="${current ? "" : "ghost-button"}" data-action="generate">${outputsReady ? "Generate again" : "Generate all"}</button>
      </div>

      <div class="generate-asset-grid">
        <article class="generate-asset-card">
          <div class="generate-asset-head">
            <strong>Landing page</strong>
            <span class="generate-asset-badge${outputsReady && client.website?.html ? " generate-asset-badge-ready" : ""}">
              ${client.website?.html ? "Created" : "Ready"}
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
              ${client.seo ? "Created" : "Ready"}
            </span>
          </div>
          ${renderSeoAssetPreview(client.seo, true)}
        </article>
      </div>

      <div class="flow-strip compact-stat-strip">
        <span class="flow-pill">Landing page ${client.website?.html ? "ready" : "pending"}</span>
        <span class="flow-pill">Blog posts ${client.blogs.length}</span>
        <span class="flow-pill">SEO ${client.seo ? "ready" : "pending"}</span>
      </div>
    </div>
  `;
}

function renderPreviewStage(client) {
  const current = isCurrentStep(client, "preview");

  if (!hasContent(client)) {
    return `
      <div class="stage-card stage-card-locked ${getStageSurfaceClass(client, "preview")}">
        <div class="section-head">
          <div>
            <span class="section-kicker">4 / 5</span>
            <h4>Näe lopputulos</h4>
          </div>
          <p>Waiting</p>
        </div>
        <p class="body-copy">The generated page, blogs and SEO will appear here.</p>
      </div>
    `;
  }

  const visibleBlogs = client.blogs.slice(0, 3);
  const recommendation = client.strategyRecommendation;

  return `
    <div class="stage-card ${getStageSurfaceClass(client, "preview")}" data-guide="preview">
      <div class="section-head">
        <div>
          <span class="section-kicker">4 / 5</span>
          <h4>Preview</h4>
        </div>
        <p>Review</p>
      </div>

      <div class="stage-actions">
        <a class="${current ? "cta-link" : "ghost-link"} compact-link" href="/client/${client.id}" target="_blank" rel="noopener">Review preview</a>
      </div>

      <div class="preview-visual-layout">
        <div class="preview-primary-panel">
          ${renderWebsiteMockPreview(client)}
        </div>

        <div class="preview-side-grid">
          <article class="preview-asset-card">
            <div class="generate-asset-head">
              <strong>Blog pack</strong>
              <span class="generate-asset-badge generate-asset-badge-ready">${visibleBlogs.length} visible</span>
            </div>
            ${renderBlogAssetStack(visibleBlogs)}
          </article>

          <article class="preview-asset-card">
            <div class="generate-asset-head">
              <strong>SEO package</strong>
              <span class="generate-asset-badge generate-asset-badge-ready">${client.seo?.slug ? "Live snippet" : "Ready"}</span>
            </div>
            ${renderSeoAssetPreview(client.seo)}
          </article>

          ${
            recommendation
              ? `
                <article class="preview-asset-card preview-strategy-card">
                  <span class="section-kicker">Strategy alignment</span>
                  <strong>${escapeHtml(recommendation.primaryOffer || client.businessName)}</strong>
                  <p>${escapeHtml(truncateText(recommendation.positioning || "", 118))}</p>
                  ${renderStructurePreview(recommendation.homepageStructure, true)}
                </article>
              `
              : ""
          }
        </div>
      </div>

      <details class="stage-subdetails">
        <summary>Inspect generated page markup</summary>
        <div class="site-frame stage-preview-frame">
          <div class="generated-site">${client.website?.html || '<p class="body-copy">Sivua ei ole vielä generoitu.</p>'}</div>
        </div>
      </details>

      <details class="stage-subdetails">
        <summary>Inspect blog drafts</summary>
        <div class="blog-frame stage-preview-frame">
          <div class="blog-grid">${renderBlogs(visibleBlogs)}</div>
        </div>
      </details>

      <details class="stage-subdetails">
        <summary>Inspect SEO fields</summary>
        <div class="seo-frame stage-preview-frame">
          ${renderSeo(client.seo)}
        </div>
      </details>
    </div>
  `;
}

function renderPublishStage(client) {
  const runtime = getLumixRuntime(client);
  const publishEligibility = runtime.actions.publish_pack;
  const publishReadiness = getPublishReadiness(client);
  const current = isCurrentStep(client, "publish");

  if (!publishEligibility.ready && !hasContent(client)) {
    return `
      <div class="stage-card stage-card-locked ${getStageSurfaceClass(client, "publish")}" data-guide="publish">
      <div class="section-head">
        <div>
          <span class="section-kicker">5 / 5</span>
          <h4>Publish</h4>
        </div>
        <p>Waiting</p>
      </div>
      <p class="body-copy">${escapeHtml(publishEligibility.reason || "Generoi ensin sisältö.")}</p>
    </div>
    `;
  }

  return `
    <div class="stage-card ${getStageSurfaceClass(client, "publish")}" data-guide="publish">
      <div class="section-head">
        <div>
          <span class="section-kicker">5 / 5</span>
          <h4>Publish</h4>
        </div>
        <p>${publishReadiness.ready ? "Ready" : "Blocked"}</p>
      </div>

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

      ${publishEligibility.reason && !publishReadiness.ready ? `<p class="body-copy">${escapeHtml(publishEligibility.reason)}</p>` : ""}

      ${
        publishEligibility.ready
          ? `
            <div class="stage-actions">
              <button type="button" class="${current ? "" : "ghost-button"}" data-action="publish-all">Publish</button>
            </div>
          `
          : `
            <div class="stage-actions">
              <button type="button" class="ghost-button" data-flow-target="${escapeHtml(publishReadiness.target)}">Resolve blocker</button>
            </div>
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
            <summary>Lumix debug</summary>
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
                : '<p class="body-copy">Ei viimeisintä Lumix-debugia vielä.</p>'
            }
          </details>
        </div>
      </div>
    </details>
  `;
}

function renderEmptyWorkspace() {
  activeClientView.innerHTML = `
    <article class="panel workflow-empty">
      <div class="panel-head">
        <div>
          <span class="section-kicker">Aloita tästä</span>
          <h2>Luo ensimmäinen asiakas</h2>
        </div>
        <p>Kun asiakas on luotu, varsinainen workflow avautuu tähän.</p>
      </div>

      <div class="next-step-card">
        <span class="section-kicker">Lumix</span>
        <strong>Lumix auttaa seuraavassa vaiheessa, mutta itse työ tehdään tässä workflow’ssa.</strong>
        <div class="stage-actions">
          <button type="button" class="ghost-button" data-empty-action="lumix">Käynnistä Lumix</button>
        </div>
      </div>
    </article>
  `;
}

function renderClientSelector(clients) {
  clientsCaption.textContent = formatClientCount(clients.length);

  if (!clients.length) {
    clientsList.innerHTML = '<article class="mini-card"><p>Ei asiakkaita vielä.</p></article>';
    renderEmptyWorkspace();
    return;
  }

  const activeId = state.activeClientId;

  clientsList.innerHTML = clients
    .map(
      (client) => {
        const statusLabel = getCurrentFlowStep(client)?.title || "Valmis";

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

function renderActiveClient(client) {
  const guide = getWorkflowGuide(client);

  activeClientView.innerHTML = `
    <article class="panel workflow-card" data-client-id="${client.id}">
      <div class="workflow-header">
        <div>
          <span class="section-kicker">Aktiivinen asiakas</span>
          <h2>${escapeHtml(client.businessName)}</h2>
          <p class="body-copy">${escapeHtml(client.description)}</p>
        </div>
        <div class="workflow-header-meta">
          <span class="client-status">${escapeHtml(client.billingStatus)}</span>
          <span class="workflow-header-pill">${escapeHtml(guide.stateLabel)}</span>
          <span class="workflow-header-pill workflow-header-pill-muted">${escapeHtml(guide.publishReadiness.title)}</span>
        </div>
      </div>

      ${renderWorkflowFocus(client)}

      <div class="workflow-stage-stack">
        ${renderIntake(client)}
        ${renderGenerateStage(client)}
        ${renderPreviewStage(client)}
        ${renderPublishStage(client)}
      </div>
    </article>

    ${renderClientExtras(client)}
  `;
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
  document.getElementById("team-form").classList.toggle("hidden", state.bootstrap.user.role === "member");
  document.getElementById("report-form").classList.toggle("hidden", state.bootstrap.user.role === "member");
  document.getElementById("send-report-button").classList.toggle("hidden", state.bootstrap.user.role === "member");

  const activeClient = getActiveClient();
  if (flowRailList) {
    flowRailList.innerHTML = renderFlowRail(activeClient);
  }
  if (flowRailCaption) {
    flowRailCaption.textContent = activeClient
      ? `Now: ${getWorkflowGuide(activeClient).heading}`
      : "Five steps from brief to publish.";
  }

  renderClientSelector(clients);

  if (activeClient) {
    renderActiveClient(activeClient);
  } else {
    renderEmptyWorkspace();
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
  if (!hasStoredAuth()) {
    const bootstrap = await api("/api/bootstrap");

    if (!bootstrap.authenticated) {
      clearAuthenticated();
      redirectTo("/login");
      return;
    }

    markAuthenticated();
    state.bootstrap = bootstrap;
    render();
    return;
  }

  state.bootstrap = await api("/api/bootstrap");

  if (!state.bootstrap.authenticated) {
    clearAuthenticated();
    redirectTo("/login");
    return;
  }

  markAuthenticated();
  render();
}

document.getElementById("logout-button").addEventListener("click", async () => {
  await runAction("Kirjaudutaan ulos...", async () => {
    await api("/api/auth/logout", { method: "POST" });
    clearAuthenticated();
    redirectTo("/login");
  });
});

document.getElementById("client-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const raw = readForm(form);
  const magicSetup = buildMagicSetup(raw.businessBrief);
  const payload = {
    businessName: magicSetup.businessName,
    description: magicSetup.brief,
    customPrompt: magicSetup.customPrompt,
    plan: "growth",
    generationIntervalDays: 30,
    autoGenerate: false,
    scheduleEnabled: true
  };

  await runAction(`Building setup for ${payload.businessName}...`, async () => {
    const result = await api("/api/clients", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (result.client?.id) {
      await api(`/api/clients/${result.client.id}/intake`, {
        method: "PUT",
        body: JSON.stringify(buildMagicIntakePayload(magicSetup))
      });

      const recommendationResult = await api(`/api/clients/${result.client.id}/recommendation`, {
        method: "POST"
      });

      if (recommendationResult.lumixAction) {
        lumixActionState.set(result.client.id, recommendationResult.lumixAction);
      }
    }

    form.reset();
    state.activeClientId = result.client?.id || state.activeClientId;
    setStatus(`Setup generated for ${payload.businessName}.`);
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

flowRailList?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-flow-target]");
  if (!button) return;
  highlightGuideTarget(button.dataset.flowTarget);
});

activeClientView.addEventListener("submit", async (event) => {
  const intakeForm = event.target.closest("form[data-intake-form]");
  if (intakeForm) {
    event.preventDefault();

    const clientId = Number(intakeForm.closest("[data-client-id]")?.dataset.clientId);
    const raw = readForm(intakeForm);

    await runAction("Tallennetaan yrityksen tietoja...", async () => {
      const intakeResult = await api(`/api/clients/${clientId}/intake`, {
        method: "PUT",
        body: JSON.stringify(raw)
      });

      const recommendReady = Boolean(intakeResult.client?.lumix?.actions?.recommend_strategy?.ready);

      if (recommendReady) {
        const recommendationResult = await api(`/api/clients/${clientId}/recommendation`, {
          method: "POST"
        });

        if (recommendationResult.lumixAction) {
          lumixActionState.set(clientId, recommendationResult.lumixAction);
        }

        setStatus("Tiedot tallennettu ja setup päivitetty.");
      } else {
        setStatus("Yrityksen tiedot tallennettu.");
      }

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

  const flowButton = event.target.closest("button[data-flow-target]");
  if (flowButton) {
    highlightGuideTarget(flowButton.dataset.flowTarget);
    return;
  }

  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const root = button.closest("[data-client-id]");
  const clientId = Number(root?.dataset.clientId);
  if (!clientId) return;

  const client = state.bootstrap.clients.find((item) => item.id === clientId);
  const action = button.dataset.action;

  if (action === "generate") {
    await runAction(`Generoidaan asiakkaalle ${client.businessName}...`, async () => {
      const result = await api(`/api/clients/${clientId}/generate-all`, { method: "POST" });
      if (result.lumixAction) {
        lumixActionState.set(clientId, result.lumixAction);
      }
      setStatus(`Sisältö generoitu asiakkaalle ${client.businessName}.`);
      await refresh();
    });
    return;
  }

  if (action === "recommend") {
    await runAction(`Muodostetaan suunta asiakkaalle ${client.businessName}...`, async () => {
      const result = await api(`/api/clients/${clientId}/recommendation`, { method: "POST" });
      if (result.lumixAction) {
        lumixActionState.set(clientId, result.lumixAction);
      }
      setStatus(`Saved setup updated for ${client.businessName}.`);
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

  await runAction("Lumix miettii ideaa...", async () => {
    const result = await api(`/api/clients/${clientId}/lumix-assist`, {
      method: "POST",
      body: JSON.stringify({ message: raw.message })
    });

    lumixAssistState.set(clientId, {
      reply: result.assist?.reply || "",
      suggestedUpdates: result.assist?.suggestedUpdates || null
    });

    form.reset();
    renderCoach(getActiveClient());
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

    runAction("Lumix päivittää ehdotusta asiakkaalle...", async () => {
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

      setStatus("Lumixin ehdotus lisättiin asiakkaan tietoihin.");
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
