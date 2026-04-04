import OpenAI from "openai";
import { buildLumixContext, buildLumixPromptHeader } from "./lumix.js";
import { getOpenAiApiKey } from "./openai-config.js";

const generationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    website: {
      type: "object",
      additionalProperties: false,
      properties: {
        heroKicker: { type: "string" },
        headline: { type: "string" },
        subheadline: { type: "string" },
        cta: { type: "string" },
        secondaryCta: { type: "string" },
        servicesTitle: { type: "string" },
        servicesIntro: { type: "string" },
        services: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              body: { type: "string" }
            },
            required: ["title", "body"]
          }
        },
        proofTitle: { type: "string" },
        proofIntro: { type: "string" },
        testimonials: {
          type: "array",
          minItems: 2,
          maxItems: 2,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              quote: { type: "string" },
              name: { type: "string" },
              role: { type: "string" }
            },
            required: ["quote", "name", "role"]
          }
        },
        processTitle: { type: "string" },
        processIntro: { type: "string" },
        processSteps: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              body: { type: "string" }
            },
            required: ["title", "body"]
          }
        },
        ctaHeadline: { type: "string" },
        ctaBody: { type: "string" },
        footerNote: { type: "string" }
      },
      required: [
        "heroKicker",
        "headline",
        "subheadline",
        "cta",
        "secondaryCta",
        "servicesTitle",
        "servicesIntro",
        "services",
        "proofTitle",
        "proofIntro",
        "testimonials",
        "processTitle",
        "processIntro",
        "processSteps",
        "ctaHeadline",
        "ctaBody",
        "footerNote"
      ]
    },
    seo: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        metaDescription: { type: "string" },
        keywords: {
          type: "array",
          items: { type: "string" }
        },
        slug: { type: "string" },
        internalLinks: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["title", "metaDescription", "keywords", "slug", "internalLinks"]
    },
    blogs: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          keyword: { type: "string" },
          excerpt: { type: "string" },
          html: { type: "string" }
        },
        required: ["title", "keyword", "excerpt", "html"]
      }
    }
  },
  required: ["website", "seo", "blogs"]
};

const lumixAssistSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: { type: "string" },
    suggestedUpdates: {
      type: "object",
      additionalProperties: false,
      properties: {
        businessType: { type: "string" },
        offerType: { type: "string" },
        audienceType: { type: "string" },
        goalType: { type: "string" },
        toneType: { type: "string" },
        geoFocus: { type: "string" },
        pricePosition: { type: "string" },
        mainCta: { type: "string" },
        notes: { type: "string" },
        customPrompt: { type: "string" }
      },
      required: []
    }
  },
  required: ["reply", "suggestedUpdates"]
};

const FIXED_TEMPLATE_SECTIONS = ["Services", "Proof", "Process", "Contact"];

const designFamilies = [
  {
    id: "product-command",
    name: "Product Command",
    layout: "product",
    palette: "graphite, stone, steel blue, soft white",
    atmosphere: "sharp, premium, product-led, restrained",
    cues: ["product proof", "structured composition", "measured contrast", "strong CTA rhythm"],
    avoid: ["soft lifestyle look", "generic startup gradients", "futuristic glow overload", "obvious AI SaaS styling"],
    businessTypes: ["saas"],
    toneTypes: ["premium", "bold"],
    pricePositions: ["premium", "standard"],
    goalTypes: ["lead_generation", "sales"],
    keywords: ["saas", "software", "app", "platform", "ai", "tool", "automation", "dashboard", "analytics"]
  },
  {
    id: "editorial-luxury",
    name: "Editorial Luxury",
    layout: "editorial",
    palette: "near-black, bone white, brass, muted rose",
    atmosphere: "cinematic, polished, sparse, high-end",
    cues: ["controlled contrast", "cinematic restraint", "clear service blocks", "image-forward composition"],
    avoid: ["busy admin widgets", "cheap neon effects", "template-like feature rows"],
    businessTypes: ["creator_personal_brand", "wellness_beauty", "local_service"],
    toneTypes: ["premium", "bold"],
    pricePositions: ["premium"],
    goalTypes: ["bookings", "awareness", "sales"],
    keywords: ["tattoo", "studio", "luxury", "premium", "fashion", "beauty", "salon", "jewelry", "interior", "boutique"]
  },
  {
    id: "trust-executive",
    name: "Trust Executive",
    layout: "trust",
    palette: "deep navy, graphite, stone, soft blue",
    atmosphere: "credible, calm, authoritative, expensive",
    cues: ["clear hierarchy", "trust signals", "process blocks", "measured proof"],
    avoid: ["flashy trends", "youthful startup tone", "overly playful cards"],
    businessTypes: ["b2b_service"],
    toneTypes: ["trusted", "premium"],
    pricePositions: ["standard", "premium"],
    goalTypes: ["lead_generation"],
    keywords: ["law", "legal", "consulting", "finance", "accounting", "advisory", "agency", "b2b", "professional", "enterprise"]
  },
  {
    id: "local-craft",
    name: "Local Craft",
    layout: "service",
    palette: "charcoal, sand, clay, warm white",
    atmosphere: "grounded, tactile, reliable, modern local",
    cues: ["strong service cards", "easy booking path", "local proof", "warm surfaces"],
    avoid: ["sterile corporate mood", "cold tech framing", "too much copy"],
    businessTypes: ["local_service"],
    toneTypes: ["friendly", "trusted"],
    pricePositions: ["affordable", "standard", "premium"],
    goalTypes: ["bookings", "lead_generation"],
    keywords: ["local", "repair", "plumber", "electrician", "clinic", "dentist", "barber", "builder", "cleaning", "service"]
  },
  {
    id: "serene-wellness",
    name: "Serene Wellness",
    layout: "wellness",
    palette: "oat, sage, charcoal, mist",
    atmosphere: "restful, high-trust, soft but premium",
    cues: ["airy spacing", "calm typography", "gentle card rhythm", "low-friction booking"],
    avoid: ["hard sales aggression", "overly dark cyber look", "dense technical UI"],
    businessTypes: ["wellness_beauty"],
    toneTypes: ["friendly", "premium", "trusted"],
    pricePositions: ["standard", "premium"],
    goalTypes: ["bookings", "awareness"],
    keywords: ["wellness", "spa", "massage", "skin", "beauty", "therapy", "coach", "pilates", "yoga", "clinic"]
  },
  {
    id: "gallery-showcase",
    name: "Gallery Showcase",
    layout: "showcase",
    palette: "ink, ivory, steel, muted ultramarine",
    atmosphere: "visual, intentional, portfolio-led, memorable",
    cues: ["showcase blocks", "poster-like headings", "staggered rhythm", "high visual focus"],
    avoid: ["corporate sameness", "dense analytics framing", "long feature checklists", "AI-brand cliches"],
    businessTypes: ["creator_personal_brand"],
    toneTypes: ["bold", "premium"],
    pricePositions: ["standard", "premium"],
    goalTypes: ["awareness", "lead_generation", "sales"],
    keywords: ["portfolio", "creative", "designer", "photography", "artist", "agency", "branding", "video", "production", "creator"]
  },
  {
    id: "hospitality-story",
    name: "Hospitality Story",
    layout: "hospitality",
    palette: "espresso, linen, amber, olive",
    atmosphere: "immersive, tasteful, welcoming, premium",
    cues: ["experience-first hero", "storytelling blocks", "reservation CTA", "sensory language"],
    avoid: ["dashboard metaphors", "cold B2B structure", "too many metrics"],
    businessTypes: ["local_service", "wellness_beauty"],
    toneTypes: ["friendly", "premium"],
    pricePositions: ["standard", "premium"],
    goalTypes: ["bookings", "sales"],
    keywords: ["hotel", "restaurant", "cafe", "bar", "bnb", "travel", "menu", "reservation", "guest", "dining"]
  },
  {
    id: "industrial-precision",
    name: "Industrial Precision",
    layout: "industrial",
    palette: "slate, steel, off-white, signal orange",
    atmosphere: "precise, engineered, dependable, strong",
    cues: ["technical grids", "process clarity", "spec-like blocks", "durable tone"],
    avoid: ["soft editorial luxury", "playful brand voice", "vague marketing fluff"],
    businessTypes: ["b2b_service", "local_service"],
    toneTypes: ["trusted", "bold"],
    pricePositions: ["standard", "premium"],
    goalTypes: ["lead_generation"],
    keywords: ["construction", "manufacturing", "industrial", "logistics", "equipment", "machinery", "engineering", "factory", "warehouse", "contractor"]
  },
  {
    id: "commerce-performance",
    name: "Commerce Performance",
    layout: "commerce",
    palette: "charcoal, white, vivid red, sand",
    atmosphere: "high-conversion, modern, confident, fast",
    cues: ["offer focus", "buying confidence", "benefit stacks", "merchandising rhythm"],
    avoid: ["slow editorial pacing", "B2B bureaucracy", "empty aspirational copy"],
    businessTypes: ["ecommerce"],
    toneTypes: ["bold", "premium", "friendly"],
    pricePositions: ["affordable", "standard", "premium"],
    goalTypes: ["sales"],
    keywords: ["shop", "ecommerce", "store", "product", "collection", "shipping", "retail", "order", "cart", "sku"]
  },
  {
    id: "personal-authority",
    name: "Personal Authority",
    layout: "authority",
    palette: "midnight, parchment, teal, smoke",
    atmosphere: "expert, warm, intelligent, high-trust",
    cues: ["story-led hero", "clear offer framing", "proof through insight", "human CTA"],
    avoid: ["cold product chrome", "mass-market ecommerce feel", "empty luxury aesthetics"],
    businessTypes: ["creator_personal_brand", "b2b_service"],
    toneTypes: ["trusted", "friendly", "premium"],
    pricePositions: ["standard", "premium"],
    goalTypes: ["lead_generation", "awareness", "bookings"],
    keywords: ["coach", "consultant", "speaker", "mentor", "expert", "trainer", "founder", "personal brand", "freelance", "advisor"]
  }
];

const visualScenes = [
  {
    id: "tattoo-ink",
    prompt:
      "Use a dark, moody hero backdrop that feels like premium tattoo studio photography: blurred skin tones, ink contrast, metal, deep shadow, and selective warm highlights.",
    businessTypes: ["local_service"],
    keywords: ["tattoo", "tattooing", "ink", "piercing", "blackwork", "studio"],
    toneTypes: ["premium", "bold"]
  },
  {
    id: "serene-spa",
    prompt:
      "Use a soft image-led backdrop with stone, water, fabric, skin-safe neutrals and gentle shadow, like premium wellness photography rather than stock spa clichés.",
    businessTypes: ["wellness_beauty"],
    keywords: ["spa", "wellness", "massage", "skin", "beauty", "clinic", "therapy", "cosmetic"],
    toneTypes: ["premium", "friendly", "trusted"]
  },
  {
    id: "trust-studio",
    prompt:
      "Use a calm premium backdrop with glass, paper, stone, dark wood or architectural light so the site feels designed and credible instead of corporate stock-like.",
    businessTypes: ["b2b_service"],
    keywords: ["law", "legal", "consulting", "advisory", "finance", "accounting", "agency", "expert"],
    toneTypes: ["premium", "trusted"]
  },
  {
    id: "hospitality-light",
    prompt:
      "Use a warm hospitality-style image backdrop with interior light, material depth and atmosphere, avoiding generic travel stock imagery.",
    businessTypes: ["local_service", "wellness_beauty"],
    keywords: ["hotel", "restaurant", "cafe", "bar", "dining", "retreat", "bnb", "guest", "menu"],
    toneTypes: ["premium", "friendly"]
  },
  {
    id: "industrial-material",
    prompt:
      "Use a sharper, material-heavy backdrop with steel, machinery, structure, signal accents and directional light, like premium industrial brand photography.",
    businessTypes: ["b2b_service", "local_service"],
    keywords: ["industrial", "construction", "engineering", "factory", "machinery", "equipment", "warehouse", "contractor"],
    toneTypes: ["bold", "trusted"]
  },
  {
    id: "product-glass",
    prompt:
      "Use a polished product-style backdrop with glass, interfaces blurred into surface light, reflections and structured depth, not glowing AI dashboard clichés.",
    businessTypes: ["saas"],
    keywords: ["saas", "software", "app", "platform", "ai", "tool", "automation", "analytics"],
    toneTypes: ["premium", "bold"]
  },
  {
    id: "craft-warmth",
    prompt:
      "Use a warm tactile backdrop with wood, tools, material detail and studio/workshop mood, making the page feel handcrafted and local.",
    businessTypes: ["local_service"],
    keywords: ["barber", "salon", "repair", "craft", "atelier", "interior", "furniture", "builder"],
    toneTypes: ["friendly", "premium", "trusted"]
  },
  {
    id: "gallery-editorial",
    prompt:
      "Use an editorial image-led backdrop with layered posters, paper, textured surfaces or art-direction-like composition, never a plain gradient-only hero.",
    businessTypes: ["creator_personal_brand"],
    keywords: ["portfolio", "photography", "artist", "designer", "branding", "creator", "production", "studio"],
    toneTypes: ["premium", "bold", "trusted"]
  }
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function slugify(value) {
  return normalizeText(value)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function firstSentence(value) {
  return String(value || "")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .find(Boolean) || "";
}

function truncateText(value, maxLength = 160) {
  const text = String(value || "").trim();
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function stripTrailingPunctuation(value) {
  return String(value || "").trim().replace(/[.!?]+$/, "");
}

function buildOfferReference(strategy, description, fallback = "specialist services") {
  const primaryOffer = stripTrailingPunctuation(strategy?.primaryOffer || "");
  if (primaryOffer && primaryOffer.length <= 64) return primaryOffer;

  const sentence = stripTrailingPunctuation(firstSentence(description || ""));
  if (sentence && sentence.length <= 72) return sentence;

  return fallback;
}

function looksPlaceholderName(value) {
  const text = normalizeText(value);
  if (!text) return true;
  return /^(john|jane|james|name|client name|owner name|company name|business name|your name|lorem|ipsum)/.test(text);
}

function looksGenericBusinessCopy(value) {
  const text = normalizeText(value);
  if (!text) return true;

  const bannedPhrases = [
    "ai-generated",
    "ai powered",
    "ai-powered",
    "next-gen",
    "future-ready",
    "intelligent platform",
    "revolutionary",
    "preview",
    "mockup",
    "template",
    "design system",
    "visual hierarchy",
    "premium feel",
    "publishable website",
    "website direction",
    "concept",
    "new website",
    "placeholder",
    "spacious composition",
    "image-led",
    "editorial rhythm",
    "cinematic",
    "art direction"
  ];

  if (bannedPhrases.some((phrase) => text.includes(phrase))) return true;
  if (/^(lorem ipsum|coming soon|insert|tbd|n\/a)$/.test(text)) return true;

  return false;
}

function preferSpecificText(value, fallback) {
  const current = String(value || "").trim();
  if (!current) return fallback;
  return looksGenericBusinessCopy(current) ? fallback : current;
}

function sanitizeHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function findDesignFamily(input = {}) {
  const signalText = [
    input.businessName,
    input.description,
    input.customPrompt,
    input.context?.businessProfile?.rawNotes?.notes,
    input.context?.businessProfile?.rawNotes?.onboardingSummary,
    input.context?.businessProfile?.rawNotes?.otherBusinessType,
    input.context?.businessProfile?.rawNotes?.otherGoal,
    input.context?.businessProfile?.rawNotes?.otherTone,
    input.context?.businessProfile?.rawNotes?.otherPrivacy,
    input.context?.businessProfile?.rawNotes?.otherVisual,
    input.context?.strategyRecommendation?.positioning,
    input.context?.strategyRecommendation?.primaryOffer,
    input.context?.strategyRecommendation?.primaryAudience
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const businessType = input.context?.businessProfile?.businessType || "";
  const toneType = input.context?.businessProfile?.toneType || "";
  const pricePosition = input.context?.businessProfile?.pricePosition || "";
  const goalType = input.context?.businessProfile?.goalType || "";

  let best = designFamilies[0];
  let bestScore = -1;

  designFamilies.forEach((family) => {
    let score = 0;
    if (family.businessTypes.includes(businessType)) score += 6;
    if (family.toneTypes.includes(toneType)) score += 3;
    if (family.pricePositions.includes(pricePosition)) score += 2;
    if (family.goalTypes.includes(goalType)) score += 2;

    family.keywords.forEach((keyword) => {
      if (signalText.includes(keyword)) score += 2;
    });

    if (businessType === "local_service" && toneType === "premium" && family.id === "editorial-luxury") score += 4;
    if (businessType === "creator_personal_brand" && family.id === "gallery-showcase") score += 3;
    if (businessType === "creator_personal_brand" && toneType === "trusted" && family.id === "personal-authority") score += 4;
    if (businessType === "b2b_service" && family.id === "trust-executive") score += 3;
    if (businessType === "wellness_beauty" && pricePosition === "premium" && family.id === "editorial-luxury") score += 2;
    if (score > bestScore) {
      best = family;
      bestScore = score;
    }
  });

  return best;
}

function findVisualScene(input = {}) {
  const signalText = [
    input.businessName,
    input.description,
    input.customPrompt,
    input.context?.businessProfile?.rawNotes?.notes,
    input.context?.businessProfile?.rawNotes?.onboardingSummary,
    input.context?.strategyRecommendation?.positioning,
    input.context?.strategyRecommendation?.primaryOffer,
    input.context?.strategyRecommendation?.primaryAudience
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const businessType = input.context?.businessProfile?.businessType || "";
  const toneType = input.context?.businessProfile?.toneType || "";

  let best = visualScenes[0];
  let bestScore = -1;

  visualScenes.forEach((scene) => {
    let score = 0;
    if (scene.businessTypes.includes(businessType)) score += 4;
    if (scene.toneTypes.includes(toneType)) score += 2;
    scene.keywords.forEach((keyword) => {
      if (signalText.includes(keyword)) score += 3;
    });

    if (score > bestScore) {
      best = scene;
      bestScore = score;
    }
  });

  return best;
}

function inferWebsiteArchetype(input = {}) {
  const signalText = [
    input.businessName,
    input.description,
    input.customPrompt,
    input.context?.businessProfile?.rawNotes?.notes,
    input.context?.businessProfile?.rawNotes?.onboardingSummary,
    input.context?.strategyRecommendation?.positioning,
    input.context?.strategyRecommendation?.primaryOffer,
    input.context?.strategyRecommendation?.primaryAudience
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const businessType = input.context?.businessProfile?.businessType || "";

  if (/\bcleaning\b|\bcleaner\b|\bjanitorial\b|\bhousekeeping\b|\bdeep clean\b|\bhome clean(ing)?\b|\boffice clean(ing)?\b|\bmove-out clean(ing)?\b/.test(signalText)) {
    return "cleaning-service";
  }
  if (/\btattoo\b|\bblackwork\b|\bpiercing\b|\bink\b/.test(signalText)) return "tattoo-studio";
  if (/\bsauna\b|\bsteam\b|\bretreat cabin\b|\bspa install/.test(signalText)) return "sauna-studio";
  if (/\bwellness\b|\bspa\b|\bmassage\b|\bskin\b|\bbeauty\b|\btherapy\b|\bclinic\b/.test(signalText)) return "wellness";
  if (/\bhotel\b|\brestaurant\b|\bcafe\b|\bbar\b|\bguest\b|\bdining\b|\breservation\b/.test(signalText)) return "hospitality";
  if (/\bshop\b|\bstore\b|\bproduct\b|\bcollection\b|\bshipping\b|\bretail\b/.test(signalText)) return "commerce";
  if (/\bsaas\b|\bsoftware\b|\bapp\b|\bplatform\b|\bautomation\b|\banalytics\b/.test(signalText)) return "saas";
  if (/\bdesigner\b|\bphotography\b|\bartist\b|\bstudio\b|\bbranding\b|\bcreator\b|\bproduction\b|\bportfolio\b/.test(signalText)) {
    return "creative-studio";
  }
  if (/\blaw\b|\blegal\b|\bconsulting\b|\badvisory\b|\bfinance\b|\baccounting\b|\bagency\b|\bexpert\b/.test(signalText)) {
    return "professional-service";
  }
  if (businessType === "b2b_service") return "professional-service";
  if (businessType === "wellness_beauty") return "wellness";
  if (businessType === "ecommerce") return "commerce";
  if (businessType === "creator_personal_brand") return "creative-studio";
  return "local-service";
}

function buildArchetypePrompt(archetype) {
  const prompts = {
    "tattoo-studio":
      "Business-specific realism: write like a premium tattoo studio website. Focus on artists, tattoo styles, consultation, booking flow, hygiene, and aftercare. Avoid vague creative-studio filler.",
    "sauna-studio":
      "Business-specific realism: write like a sauna design and installation website. Focus on custom sauna design, materials, installation planning, gallery-worthy results, consultation, and project flow.",
    "cleaning-service":
      "Business-specific realism: write like a real cleaning service website. Focus on home or office cleaning services, recurring visits, deep cleans, trust, pricing clarity, insured staff, and a direct contact path.",
    wellness:
      "Business-specific realism: write like a premium wellness or beauty website. Focus on treatments, experience, safety, booking confidence, and return visits.",
    hospitality:
      "Business-specific realism: write like a real hospitality website. Focus on experience, atmosphere, reservation flow, key offerings, and trust-building details.",
    commerce:
      "Business-specific realism: write like a high-quality commerce landing page. Focus on product value, purchase confidence, proof, and a direct buying CTA.",
    saas:
      "Business-specific realism: write like a product website for a real software business. Focus on use case, product value, proof, workflow clarity, and one strong CTA.",
    "creative-studio":
      "Business-specific realism: write like a real creative or design studio website. Focus on work, services, fit, process, and project enquiries.",
    "professional-service":
      "Business-specific realism: write like a premium professional service website. Focus on offer clarity, trust, process, credibility, and enquiry conversion.",
    "local-service":
      "Business-specific realism: write like a local service business website. Focus on what the business does, who it serves, service area or fit, trust, process, and quote or booking CTA."
  };

  return prompts[archetype] || prompts["local-service"];
}

function buildFallbackWebsiteContent({ businessName, description, family, context = null }) {
  const archetype = inferWebsiteArchetype({ businessName, description, context });
  const strategy = context?.strategyRecommendation || {};
  const audience = String(strategy.primaryAudience || "").trim() || "the right clients";
  const offer = buildOfferReference(strategy, description);
  const cta = String(context?.businessProfile?.mainCta || "Book a consultation").trim();
  const base = {
    heroKicker: "Independent business",
    headline: buildFamilyHeadline(family, businessName, offer),
    subheadline: buildFamilySubheadline(family, { strategy, audience, cta, offer }),
    cta,
    secondaryCta: "See services",
    servicesTitle: "Services",
    servicesIntro: "A clearer service structure helps the right clients understand what you do and how to get started.",
    services: [
      {
        title: offer,
        body: `${offer} presented with a clearer structure, stronger confidence, and a more useful first impression.`
      },
      {
        title: "Project guidance",
        body: "A defined process makes the work easier to understand before the first enquiry or booking."
      },
      {
        title: `Built for ${audience}`,
        body: "The page, messaging, and CTA are shaped around the people most likely to take the next step."
      }
    ],
    proofTitle: "Client feedback",
    proofIntro: "Trust should feel earned, specific, and close to the buying decision.",
    testimonials: [
      {
        quote: "The new site finally explains what we do clearly and makes it much easier for the right people to contact us.",
        name: "Service client",
        role: "Completed project"
      },
      {
        quote: "We wanted something that felt more credible and more polished. The result finally feels like the business we run.",
        name: "Returning customer",
        role: "Repeat service client"
      }
    ],
    processTitle: "How it works",
    processIntro: "A simple process keeps the next step obvious and removes unnecessary friction.",
    processSteps: [
      {
        title: "Initial discussion",
        body: "We start with the goals, the service, and the people the business wants to reach."
      },
      {
        title: "Clear proposal",
        body: "You get a realistic plan, direction, and scope before the work moves forward."
      },
      {
        title: "Delivery and follow-through",
        body: `${cta} when you are ready, then the project moves forward with clear communication.`
      }
    ],
    ctaHeadline: `Ready to talk about ${businessName}?`,
    ctaBody: "Get in touch and we will come back with a clear next step for the project.",
    footerNote: truncateText(firstSentence(description) || `${businessName} is built around clarity, trust, and a stronger path from interest to enquiry.`, 140)
  };

  if (archetype === "tattoo-studio") {
    return {
      ...base,
      heroKicker: "Private tattoo studio",
      headline: `${businessName} tattoos built around artist fit, clean process, and confident booking.`,
      subheadline: "Custom tattoo work, consultation-led planning, and a calmer studio experience from the first message onward.",
      cta: "Book a consultation",
      secondaryCta: "View tattoo styles",
      servicesTitle: "Tattoo services",
      servicesIntro: "Make the work, the style, and the booking path obvious before people start comparing studios.",
      services: [
        {
          title: "Custom tattoo design",
          body: "Artist-led concept work shaped around placement, style, and the long-term result."
        },
        {
          title: "Consultation and booking",
          body: "A clearer process for discussing ideas, choosing the right artist, and moving into a booked session."
        },
        {
          title: "Aftercare and studio guidance",
          body: "Set expectations early with useful preparation details, hygiene confidence, and aftercare support."
        }
      ],
      proofTitle: "Why clients choose the studio",
      proofIntro: "People book when the work feels strong, the process feels safe, and the next step feels easy.",
      testimonials: [
        {
          quote: "The site made the style, the artists, and the booking process clear straight away. It finally feels like the studio in real life.",
          name: "Tattoo client",
          role: "Blackwork client"
        },
        {
          quote: "I knew what to expect before I booked. That made the decision much easier.",
          name: "Consultation client",
          role: "Custom piece client"
        }
      ],
      processTitle: "How booking works",
      processIntro: "The best tattoo websites reduce uncertainty before the first message.",
      processSteps: [
        { title: "Share your idea", body: "Tell us about the concept, placement, size, and preferred style." },
        { title: "Match and quote", body: "We review the fit, recommend the right artist, and confirm the next booking step." },
        { title: "Session and aftercare", body: "Arrive prepared, get the work done, and leave with clear aftercare guidance." }
      ],
      ctaHeadline: "Ready to plan your next piece?",
      ctaBody: "Send your idea, preferred style, and placement. We will come back with the right next step."
    };
  }

  if (archetype === "sauna-studio") {
    return {
      ...base,
      heroKicker: "Custom sauna studio",
      headline: `${businessName} designs sauna spaces that feel considered before the first installation starts.`,
      subheadline: "From concept and material direction to installation planning, the site should make the quality of the work feel obvious.",
      cta: "Book a consultation",
      secondaryCta: "View recent projects",
      servicesTitle: "Design and installation",
      servicesIntro: "Turn a specialist offer into a clear, trust-building sales surface for homeowners and project clients.",
      services: [
        { title: "Custom sauna design", body: "Layouts, materials, mood, and functional decisions shaped around the space." },
        { title: "Installation planning", body: "A clearer path from first discussion to installation timeline and delivery." },
        { title: "Project guidance", body: "Help clients understand options, costs, and what a finished result can look like." }
      ],
      proofTitle: "Built to earn trust early",
      proofIntro: "Clients need to see quality, process, and fit before they request a consultation.",
      testimonials: [
        {
          quote: "The new site makes the work feel high-end and practical at the same time. It finally looks like the projects we deliver.",
          name: "Residential client",
          role: "Residential client"
        },
        {
          quote: "It is much easier to show the difference in materials, process, and finish now.",
          name: "Project client",
          role: "Project client"
        }
      ],
      processTitle: "From idea to finished sauna",
      processIntro: "A strong process section gives people confidence before they enquire.",
      processSteps: [
        { title: "Consultation", body: "We review the space, goals, and the kind of sauna experience you want to build." },
        { title: "Design direction", body: "You receive a clear proposal covering layout, materials, and the overall scope." },
        { title: "Build and install", body: "Once approved, the project moves into delivery with practical communication throughout." }
      ],
      ctaHeadline: "Planning a sauna project?",
      ctaBody: "Start with a consultation and we will map out the right direction for your space."
    };
  }

  if (archetype === "cleaning-service") {
    return {
      ...base,
      heroKicker: "Cleaning service",
      headline: `${businessName} keeps homes and workspaces clean with clear service options and easy booking.`,
      subheadline: "Show what is included, who the service is for, and how to request a quote without digging through generic copy.",
      cta: "Request a cleaning quote",
      secondaryCta: "See cleaning services",
      servicesTitle: "Cleaning services",
      servicesIntro: "People contact cleaning companies faster when the service list, pricing approach, and trust signals are easy to understand.",
      services: [
        {
          title: "Recurring home cleaning",
          body: "Regular weekly or bi-weekly cleans that keep the home consistently tidy without extra back and forth."
        },
        {
          title: "Deep cleaning and move-out cleans",
          body: "One-off visits for seasonal cleaning, move-out handovers, and homes that need a more thorough reset."
        },
        {
          title: "Office and commercial cleaning",
          body: "Reliable cleaning plans for workspaces that need a professional standard and a clear contact person."
        }
      ],
      proofTitle: "Why clients stay with the service",
      proofIntro: "Cleaning websites work better when they show exactly what is offered, how trust is handled, and how quickly a quote can be requested.",
      testimonials: [
        {
          quote: "The service list was clear and the quote process was straightforward. We knew what was included before we even called.",
          name: "Home cleaning client",
          role: "Weekly service"
        },
        {
          quote: "It finally feels easy to explain the difference between recurring cleaning and one-off deep cleans.",
          name: "Office cleaning client",
          role: "Commercial contract"
        }
      ],
      processTitle: "How booking works",
      processIntro: "A simple cleaning-service process helps people understand the next step before they contact you.",
      processSteps: [
        { title: "Tell us what needs cleaning", body: "Share the property type, size, frequency, and whether you need recurring or one-off cleaning." },
        { title: "Receive a clear quote", body: "We confirm what is included, the expected visit scope, and the best next booking option." },
        { title: "Confirm the visit", body: "Choose the right time, approve the booking, and get practical details before the cleaning starts." }
      ],
      ctaHeadline: "Need a cleaner home or workspace?",
      ctaBody: "Request a quote and we will come back with the right service option for your property."
    };
  }

  if (archetype === "local-service") {
    return {
      ...base,
      heroKicker: "Local service business",
      headline: `${businessName} helps local clients get the right service without unnecessary back and forth.`,
      subheadline: "Clear service descriptions, a simple process, and one direct quote request help new enquiries move faster.",
      cta: "Request a quote",
      secondaryCta: "See services",
      servicesTitle: "What we help with",
      servicesIntro: "Clients get in touch faster when the service, fit, and next step are clear from the first screen.",
      processTitle: "How the service works",
      processIntro: "Show exactly what happens after the first message so people can move forward with confidence."
    };
  }

  if (archetype === "professional-service") {
    return {
      ...base,
      heroKicker: "Professional service",
      headline: `${businessName} gives clients clear expert guidance before the first call even starts.`,
      subheadline: "Explain the offer, build credibility early, and make the first conversation easier to begin.",
      cta: "Request a consultation",
      secondaryCta: "See how we work",
      servicesTitle: "Offer overview",
      servicesIntro: "Decision-makers move faster when the offer is specific, credible, and easy to understand.",
      proofTitle: "Built for credibility",
      proofIntro: "Trust comes from specificity, confidence, and a believable next step."
    };
  }

  if (archetype === "wellness") {
    return {
      ...base,
      heroKicker: "Wellness studio",
      headline: `${businessName} offers a calmer path from first visit to confident booking.`,
      subheadline: "Treatments, experience, and booking details should feel clear and reassuring before people need to ask for more information.",
      cta: "Book an appointment",
      secondaryCta: "View treatments",
      servicesTitle: "Treatments and experience",
      servicesIntro: "The best wellness websites make the service feel calm, specific, and easy to trust.",
      proofTitle: "Why clients return",
      proofIntro: "People book more confidently when the service, atmosphere, and next step feel considered.",
      processTitle: "Before your appointment",
      processIntro: "A simple process removes hesitation and makes the booking path easier to follow.",
      ctaHeadline: "Ready to book your visit?",
      ctaBody: "Choose the treatment that fits, book your time, and arrive knowing what to expect."
    };
  }

  if (archetype === "hospitality") {
    return {
      ...base,
      heroKicker: "Hospitality business",
      headline: `${businessName} gives guests a stronger first impression before they book.`,
      subheadline: "Atmosphere, offer, and reservation confidence should land quickly so the next step feels natural.",
      cta: "Book now",
      secondaryCta: "Explore the experience",
      servicesTitle: "Stay, spaces, and experience",
      servicesIntro: "A strong hospitality homepage should make the place feel real before the booking starts.",
      proofTitle: "Built around guest confidence",
      proofIntro: "People book faster when the mood is clear, the offer is specific, and the next step stays obvious.",
      processTitle: "From first visit to arrival",
      processIntro: "A booking path should feel simple, welcoming, and easy to trust."
    };
  }

  if (archetype === "saas") {
    return {
      ...base,
      heroKicker: "Software product",
      headline: `${businessName} helps teams understand the product, the value, and the next step faster.`,
      subheadline: "Show the use case clearly, explain who the product is for, and lead serious buyers into a demo or sales conversation.",
      cta: "Book a demo",
      secondaryCta: "See product overview",
      servicesTitle: "Product overview",
      servicesIntro: "Strong product pages explain what the software does, who it helps, and why it is worth a closer look.",
      proofTitle: "Proof that feels credible",
      proofIntro: "Decision-makers move faster when the message is sharp, the structure is useful, and the CTA is hard to miss.",
      processTitle: "From first look to live conversation",
      processIntro: "A tighter product story gives sales conversations a better starting point."
    };
  }

  if (archetype === "creative-studio") {
    return {
      ...base,
      heroKicker: "Creative studio",
      headline: `${businessName} helps clients understand the work, the service, and how to start a project.`,
      subheadline: "Show the standard of the work, the services behind it, and the right next step for project enquiries.",
      cta: "Start a project",
      secondaryCta: "See selected work",
      servicesTitle: "Services and selected work",
      servicesIntro: "Studios get better-fit enquiries when the offer is clear and the process feels easy to follow.",
      proofTitle: "Why clients reach out",
      proofIntro: "People enquire when the work looks strong, the offer is clear, and the process feels manageable.",
      processTitle: "How projects begin",
      processIntro: "A simple project flow helps good-fit clients understand how to start."
    };
  }

  if (archetype === "commerce") {
    return {
      ...base,
      heroKicker: "Commerce brand",
      headline: `${businessName} helps customers understand the offer quickly and move from interest to order.`,
      subheadline: "Show the product value early, reduce hesitation, and keep the buying path simple from the first visit.",
      cta: "Shop now",
      secondaryCta: "Browse collections",
      servicesTitle: "Collections and highlights",
      servicesIntro: "Clearer merchandising and better hierarchy help customers find what matters faster.",
      proofTitle: "Built for buying confidence",
      proofIntro: "The right product structure, proof, and CTA make the path to purchase feel easier."
    };
  }

  return base;
}

function normalizeWebsiteContent(website = {}, fallback) {
  const normalizeItems = (items, fallbackItems, minLength) => {
    const normalized = Array.isArray(items)
      ? items
          .map((item) => ({
            title: String(item?.title || "").trim(),
            body: String(item?.body || "").trim()
          }))
          .filter((item) => item.title && item.body && !looksGenericBusinessCopy(item.title) && !looksGenericBusinessCopy(item.body))
      : [];

    if (normalized.length >= minLength) return normalized.slice(0, minLength);
    return fallbackItems.slice(0, minLength);
  };

  const normalizeTestimonials = (items, fallbackItems) => {
    const normalized = Array.isArray(items)
      ? items
          .map((item) => ({
            quote: String(item?.quote || "").trim(),
            name: String(item?.name || "").trim(),
            role: String(item?.role || "").trim()
          }))
          .filter(
            (item) =>
              item.quote &&
              item.name &&
              item.role &&
              !looksGenericBusinessCopy(item.quote) &&
              !looksPlaceholderName(item.name) &&
              !looksGenericBusinessCopy(item.role)
          )
      : [];

    if (normalized.length >= 2) return normalized.slice(0, 2);
    return fallbackItems.slice(0, 2);
  };

  return {
    heroKicker: preferSpecificText(website.heroKicker, fallback.heroKicker),
    headline: preferSpecificText(website.headline, fallback.headline),
    subheadline: preferSpecificText(website.subheadline, fallback.subheadline),
    cta: preferSpecificText(website.cta, fallback.cta),
    secondaryCta: preferSpecificText(website.secondaryCta, fallback.secondaryCta),
    servicesTitle: preferSpecificText(website.servicesTitle, fallback.servicesTitle),
    servicesIntro: preferSpecificText(website.servicesIntro, fallback.servicesIntro),
    services: normalizeItems(website.services, fallback.services, 3),
    proofTitle: preferSpecificText(website.proofTitle, fallback.proofTitle),
    proofIntro: preferSpecificText(website.proofIntro, fallback.proofIntro),
    testimonials: normalizeTestimonials(website.testimonials, fallback.testimonials),
    processTitle: preferSpecificText(website.processTitle, fallback.processTitle),
    processIntro: preferSpecificText(website.processIntro, fallback.processIntro),
    processSteps: normalizeItems(website.processSteps, fallback.processSteps, 3),
    ctaHeadline: preferSpecificText(website.ctaHeadline, fallback.ctaHeadline),
    ctaBody: preferSpecificText(website.ctaBody, fallback.ctaBody),
    footerNote: preferSpecificText(website.footerNote, fallback.footerNote)
  };
}

function renderWebsiteTemplate({ businessName, family, scene, context = null, website }) {
  const navItems = FIXED_TEMPLATE_SECTIONS;
  const audience = String(context?.strategyRecommendation?.primaryAudience || "").trim() || "the right clients";
  const heroCards = [
    {
      label: "Featured service",
      value: website.services[0]?.title || String(context?.strategyRecommendation?.primaryOffer || "").trim() || "Core service",
      body: website.services[0]?.body || "Presented clearly enough that visitors understand the offer without extra explanation."
    },
    {
      label: "How clients start",
      value: website.processSteps[0]?.title || website.cta,
      body: website.processSteps[0]?.body || "A clear first step makes it easier to move from interest into action."
    },
    {
      label: "Best fit",
      value: audience,
      body: `Built to help ${audience.toLowerCase()} understand the next move quickly.`
    }
  ];
  const proofPoints = [
    {
      title: "Specialist focus",
      body: website.services[0]?.body || `${businessName} keeps the main offer clear from the first screen onward.`
    },
    {
      title: "Clear communication",
      body: website.processSteps[1]?.body || website.processSteps[0]?.body || "Clients can understand how the work moves forward without guessing."
    },
    {
      title: "Straightforward next step",
      body: `${website.cta} gives the page one strong direction instead of competing calls to action.`
    }
  ];

  return injectDesignFamilyWrapper(
    `
      <div>
        <header class="site-topbar" data-lumix-section="nav">
          <strong>${escapeHtml(businessName)}</strong>
          <nav class="site-topbar-nav" aria-label="Primary">
            ${navItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
          </nav>
        </header>

        <section class="site-hero" data-lumix-section="hero" data-lumix-editable="hero">
          <div class="site-hero-copy">
            <p class="eyebrow">${escapeHtml(website.heroKicker)}</p>
            <h1>${escapeHtml(website.headline)}</h1>
            <p>${escapeHtml(website.subheadline)}</p>
            <div class="site-action-row">
              <a href="#lumix-cta">${escapeHtml(website.cta)}</a>
              <a href="#lumix-services" class="site-action-secondary">${escapeHtml(website.secondaryCta)}</a>
            </div>
            <div class="site-trust-row" aria-label="Key offers">
              ${website.services
                .slice(0, 3)
                .map(
                  (service) => `
                    <article class="site-trust-chip">
                      <span>${escapeHtml(service.title)}</span>
                    </article>
                  `
                )
                .join("")}
            </div>
          </div>

          <aside class="site-hero-panel">
            <div class="hero-scene" aria-hidden="true"></div>
            <article class="site-hero-pane site-hero-pane-primary">
              <span>${escapeHtml(heroCards[0].label)}</span>
              <strong>${escapeHtml(heroCards[0].value)}</strong>
              <p>${escapeHtml(heroCards[0].body)}</p>
            </article>
            <article class="site-hero-pane site-hero-pane-secondary">
              <span>${escapeHtml(heroCards[1].label)}</span>
              <strong>${escapeHtml(heroCards[1].value)}</strong>
              <p>${escapeHtml(heroCards[1].body)}</p>
            </article>
            <article class="site-hero-pane site-hero-pane-footer">
              <span>${escapeHtml(heroCards[2].label)}</span>
              <strong>${escapeHtml(heroCards[2].value)}</strong>
              <p>${escapeHtml(heroCards[2].body)}</p>
            </article>
          </aside>
        </section>

        <section id="lumix-services" class="site-section" data-lumix-section="services" data-lumix-editable="services">
          <div class="site-section-head">
            <div>
              <span class="eyebrow">Services</span>
              <h2>${escapeHtml(website.servicesTitle)}</h2>
            </div>
            <p>${escapeHtml(website.servicesIntro)}</p>
          </div>
          <div class="site-card-grid">
            ${website.services
              .map(
                (service, index) => `
                  <article class="site-card">
                    <span class="site-card-index">${escapeHtml(String(index + 1).padStart(2, "0"))}</span>
                    <div class="site-card-copy">
                      <h3>${escapeHtml(service.title)}</h3>
                      <p>${escapeHtml(service.body)}</p>
                    </div>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>

        <section class="site-section site-section-proof" data-lumix-section="proof" data-lumix-editable="proof">
          <div class="site-section-head">
            <div>
              <span class="eyebrow">Proof</span>
              <h2>${escapeHtml(website.proofTitle)}</h2>
            </div>
            <p>${escapeHtml(website.proofIntro)}</p>
          </div>
          <div class="site-proof-layout">
            <article class="site-proof-summary">
              <span class="eyebrow">Why people move forward</span>
              <strong>${escapeHtml(`${businessName} makes the first decision easier to trust.`)}</strong>
              <ul class="site-proof-list">
                ${proofPoints
                  .map(
                    (point) => `
                      <li>
                        <strong>${escapeHtml(point.title)}</strong>
                        <p>${escapeHtml(point.body)}</p>
                      </li>
                    `
                  )
                  .join("")}
              </ul>
            </article>
            <div class="site-testimonial-grid">
              ${website.testimonials
                .map(
                  (item) => `
                    <article class="site-testimonial-card">
                      <p>${escapeHtml(`“${item.quote}”`)}</p>
                      <footer>
                        <strong>${escapeHtml(item.name)}</strong>
                        <span>${escapeHtml(item.role)}</span>
                      </footer>
                    </article>
                  `
                )
                .join("")}
            </div>
          </div>
        </section>

        <section class="site-section" data-lumix-section="process" data-lumix-editable="process">
          <div class="site-section-head">
            <div>
              <span class="eyebrow">Process</span>
              <h2>${escapeHtml(website.processTitle)}</h2>
            </div>
            <p>${escapeHtml(website.processIntro)}</p>
          </div>
          <div class="site-process-grid">
            ${website.processSteps
              .map(
                (step, index) => `
                  <article class="site-process-step">
                    <span>${escapeHtml(String(index + 1).padStart(2, "0"))}</span>
                    <h3>${escapeHtml(step.title)}</h3>
                    <p>${escapeHtml(step.body)}</p>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>

        <section id="lumix-cta" class="site-cta" data-lumix-section="cta" data-lumix-editable="cta">
          <div>
            <span class="eyebrow">Next step</span>
            <h2>${escapeHtml(website.ctaHeadline)}</h2>
            <p>${escapeHtml(website.ctaBody)}</p>
          </div>
          <a href="#lumix-cta">${escapeHtml(website.cta)}</a>
        </section>

        <footer class="site-footer" data-lumix-section="footer">
          <strong>${escapeHtml(businessName)}</strong>
          <p>${escapeHtml(website.footerNote)}</p>
        </footer>
      </div>
    `,
    family,
    scene
  );
}

function buildFallbackSeo({ businessName, description, context = null, website }) {
  const offer = String(context?.strategyRecommendation?.primaryOffer || "").trim() || firstSentence(description) || "services";
  const audience = String(context?.strategyRecommendation?.primaryAudience || "").trim() || "clients";
  const title = truncateText(`${businessName} | ${offer}`, 58);
  const metaDescription = truncateText(
    `${businessName} provides ${offer} for ${audience}. ${website.ctaHeadline} ${website.ctaBody}`,
    156
  );

  return {
    title,
    metaDescription,
    keywords: [
      businessName.toLowerCase(),
      offer.toLowerCase(),
      audience.toLowerCase(),
      `${businessName.toLowerCase()} services`
    ].filter(Boolean),
    slug: slugify(businessName),
    internalLinks: ["services", "client-feedback", "process", "contact"]
  };
}

function buildFallbackBlogs({ businessName, description, context = null }) {
  const archetype = inferWebsiteArchetype({ businessName, description, context });
  const topics = {
    "tattoo-studio": [
      {
        title: `How to prepare for a tattoo consultation at ${businessName}`,
        keyword: `${businessName.toLowerCase()} tattoo consultation`,
        excerpt: "A clearer guide to style fit, placement, references, and what to bring before the first session."
      },
      {
        title: "What makes a tattoo studio feel easier to trust before booking",
        keyword: "tattoo studio booking process",
        excerpt: "Clients usually decide faster when the work, hygiene standards, and booking path are visible early."
      },
      {
        title: "Aftercare basics that help a new tattoo heal well",
        keyword: "tattoo aftercare guide",
        excerpt: "Set better expectations by explaining healing, cleaning, and follow-up guidance in plain language."
      }
    ],
    "sauna-studio": [
      {
        title: `What to plan before starting a sauna project with ${businessName}`,
        keyword: `${businessName.toLowerCase()} sauna design`,
        excerpt: "A practical outline for layout, materials, heating, and the early decisions that shape the final result."
      },
      {
        title: "How custom sauna design improves both feel and function",
        keyword: "custom sauna design",
        excerpt: "The best projects balance atmosphere, material quality, and day-to-day usability from the beginning."
      },
      {
        title: "What clients want to know before booking a sauna consultation",
        keyword: "sauna consultation",
        excerpt: "Answer the common questions early and the project conversation becomes much easier to start."
      }
    ],
    "cleaning-service": [
      {
        title: `What to include before requesting a cleaning quote from ${businessName}`,
        keyword: `${businessName.toLowerCase()} cleaning quote`,
        excerpt: "Property size, visit frequency, and the type of clean make it much easier to recommend the right service."
      },
      {
        title: "How to compare recurring cleaning and one-off deep cleaning",
        keyword: "recurring cleaning vs deep cleaning",
        excerpt: "Different cleaning needs call for different visit structures, pricing logic, and preparation details."
      },
      {
        title: "What clients look for in a reliable cleaning service",
        keyword: "reliable cleaning service",
        excerpt: "Trust, clear service scope, and a simple contact path matter more than vague promises."
      }
    ],
    wellness: [
      {
        title: `What first-time clients want to know before booking with ${businessName}`,
        keyword: `${businessName.toLowerCase()} booking`,
        excerpt: "Confidence grows when treatments, fit, and the booking process are explained clearly."
      },
      {
        title: "How a premium wellness website reduces booking hesitation",
        keyword: "wellness website bookings",
        excerpt: "The right structure makes the service feel calmer, clearer, and easier to trust."
      },
      {
        title: "What strong treatment pages should explain before the first visit",
        keyword: "treatment page content",
        excerpt: "Good service pages cover fit, expected outcomes, and the next step without sounding overworked."
      }
    ],
    "professional-service": [
      {
        title: `How ${businessName} helps clients understand the offer faster`,
        keyword: `${businessName.toLowerCase()} services`,
        excerpt: "Clear positioning, stronger proof, and a simple CTA shorten the path from interest to enquiry."
      },
      {
        title: "Why professional service websites need clearer proof early",
        keyword: "professional service website trust",
        excerpt: "Decision-makers move faster when credibility appears before they have to ask for it."
      },
      {
        title: "What to include on a high-trust service website homepage",
        keyword: "service homepage structure",
        excerpt: "Offer, proof, process, and one clear next step usually outperform a long generic intro."
      }
    ],
    "local-service": [
      {
        title: `What makes ${businessName} easier to choose over other local options`,
        keyword: `${businessName.toLowerCase()} local service`,
        excerpt: "Local businesses win more enquiries when the service, fit, and next step are immediately clear."
      },
      {
        title: "How a better service page improves quote requests",
        keyword: "service page quote requests",
        excerpt: "A stronger homepage reduces hesitation by answering the important questions before clients need to ask."
      },
      {
        title: "Why process clarity matters on local business websites",
        keyword: "local business website process",
        excerpt: "People contact faster when they know what happens after they click the CTA."
      }
    ]
  };

  const selected = topics[archetype] || topics["local-service"];
  return selected.map((item) => ({
    ...item,
    html: `<p>${item.excerpt}</p>`
  }));
}

function buildFamilyPrompt(family, scene) {
  return [
    "Decide the visual style automatically from the business context.",
    "The Lumix renderer already uses one fixed landing page template. Do not make layout decisions, do not add sections, and do not change section order.",
    `Overall tone: ${family.atmosphere}.`,
    `Color direction: ${family.palette}.`,
    `Use these strengths: ${family.cues.join(", ")}.`,
    `Avoid these mistakes: ${family.avoid.join(", ")}.`,
    `Hero image direction: ${scene.prompt}`,
    "Make the result feel like a real company website that could be published today.",
    "Use clean hierarchy, restrained typography, clear spacing, believable proof, and one obvious CTA path.",
    "Do not make the page feel like a design exercise, startup pitch, dashboard, or AI demo.",
    "Favor real business clarity over decorative concepts."
  ].join("\n");
}

function injectDesignFamilyWrapper(html, family, scene) {
  const familyClass = `generated-site generated-site-family-${family.id} generated-site-scene-${scene.id}`;
  const markup = sanitizeHtml(String(html || "").trim());
  if (!markup) {
    return `<div class="${familyClass}"><section><p>Landing page coming soon.</p></section></div>`;
  }

  if (!/^<div\b/i.test(markup)) {
    return `<div class="${familyClass}">${markup}</div>`;
  }

  if (/\bclass\s*=\s*"([^"]*)"/i.test(markup)) {
    return markup.replace(/\bclass\s*=\s*"([^"]*)"/i, (_match, classes) => {
      const merged = Array.from(new Set(`${classes} ${familyClass}`.trim().split(/\s+/))).join(" ");
      return `class="${merged}"`;
    });
  }

  if (/\bclass\s*=\s*'([^']*)'/i.test(markup)) {
    return markup.replace(/\bclass\s*=\s*'([^']*)'/i, (_match, classes) => {
      const merged = Array.from(new Set(`${classes} ${familyClass}`.trim().split(/\s+/))).join(" ");
      return `class="${merged}"`;
    });
  }

  return markup.replace(/^<div\b/i, `<div class="${familyClass}"`);
}

function parseJsonOutput(outputText) {
  const text = String(outputText || "").trim();
  const parseWithRepairs = (value) =>
    JSON.parse(
      String(value)
        .replace(/,\s*([}\]])/g, "$1")
        .trim()
    );

  try {
    return JSON.parse(text);
  } catch {}

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return JSON.parse(fencedMatch[1].trim());
  }

  const objectStart = text.indexOf("{");
  const objectEnd = text.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    return parseWithRepairs(text.slice(objectStart, objectEnd + 1));
  }

  return parseWithRepairs(text);
}

function normalizeAssistPayload(parsed) {
  if (typeof parsed?.reply === "string" && parsed.reply.trim()) {
    return parsed;
  }

  const suggestedUpdates =
    parsed?.suggestedUpdates && typeof parsed.suggestedUpdates === "object"
      ? parsed.suggestedUpdates
      : {};
  const content = parsed?.content;
  if (!content || typeof content !== "object") {
    const suggestionSummary = Object.entries(suggestedUpdates)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");

    return {
      ...parsed,
      reply: suggestionSummary
        ? `Suosittelen näitä päivityksiä: ${suggestionSummary}.`
        : "Tässä on ehdotus seuraavaan parannukseen. Tarkista päivitykset ja sovella tarvittaessa.",
      suggestedUpdates
    };
  }

  const parts = [content.headline, content.subheadline, content.body].filter(Boolean);
  const ctaText =
    typeof content.cta === "string"
      ? content.cta
      : typeof content.cta?.text === "string"
        ? content.cta.text
        : "";

  if (ctaText) {
    parts.push(`CTA: ${ctaText}`);
  }

  return {
    ...parsed,
    reply: parts.join("\n\n"),
    suggestedUpdates
  };
}

async function requestStructuredJson(client, { isOpenRouter, model, prompt, schemaName, schema, maxTokens }) {
  if (isOpenRouter) {
    const completion = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: buildOpenRouterJsonPrompt(prompt) }]
    });

    return parseJsonOutput(completion.choices[0]?.message?.content || "");
  }

  const response = await client.responses.create({
    model,
    max_output_tokens: maxTokens,
    input: prompt,
    text: {
      format: {
        type: "json_schema",
        name: schemaName,
        strict: true,
        schema
      }
    }
  });

  return parseJsonOutput(response.output_text);
}

function buildPrompt({ businessName, description, plan, customPrompt, family, scene, archetype }) {
  const lines = [
    buildLumixPromptHeader(),
    "Generate a real, publishable business website content package.",
    "Keep the output specific, useful, grounded, and conversion-focused.",
    "Rules:",
    "- Do not return HTML for the website. Return structured website content only. The app will render the final landing page from your content.",
    "- No scripts, no styles, no markdown.",
    "- The website must fit the fixed Lumix landing page template.",
    "- Required structure and fixed section order: Hero, Services/Offer, Proof/Testimonials, Process, CTA section, Footer.",
    "- AI only fills the content fields. Do not invent alternative layouts, different section orders, extra sections, missing sections, sidebars, pricing tables, FAQ sections, galleries, or other structural changes.",
    "- H1 must be realistic and publishable, no more than roughly 2 to 3 lines when rendered.",
    "- Keep headline language concrete and believable. No slogan-only headlines, no concept-copy, and no dramatic oversized-art-direction language.",
    "- Subheadline must read like real business website copy: clear offer, clear fit, clear next step.",
    "- Do not use design-language words in customer-facing copy. Avoid words like minimal, cinematic, editorial, premium feel, hierarchy, composition, image-led, layout, surface, or showcase unless the business itself sells design services and the wording is still natural.",
    "- Section titles must read like real company website sections, not design showcase labels or AI concept headings.",
    "- Services must be concrete and business-specific. Testimonials must sound like real client feedback, not vague praise.",
    "- Do not invent placeholder personal names, fake agencies, fake cities, or fake performance numbers. If attribution is needed, use believable anonymous labels such as Residential client, Operations lead, or Returning customer.",
    "- Build an original website, not a clone of any known product or template.",
    "- The page must feel like a real company website, not a concept board, mockup, or internal demo.",
    "- Do not make the page look AI-generated, generic, or over-optimized for AI agency aesthetics.",
    "- Avoid filler buzzwords like next-gen, revolutionary, future-ready, intelligent platform, or similar empty startup language unless clearly justified.",
    "- Prefer believable business language, category-specific proof, and tasteful visual restraint.",
    "- Do not mention previews, mockups, templates, design systems, visual scenes, or anything that would reveal this was AI-generated.",
    "- Blog titles and excerpts must fit the actual business category and customer questions, not generic AI marketing topics.",
    "- SEO title must be under 60 characters.",
    "- Meta description must be under 160 characters.",
    "- Blog posts should target commercial-intent organic search.",
    "",
    buildFamilyPrompt(family, scene),
    buildArchetypePrompt(archetype),
    "",
    `Business name: ${businessName}`,
    `Business description: ${description}`,
    `Client plan: ${plan}`
  ];

  if (customPrompt) {
    lines.push(`Client-specific instructions: ${customPrompt}`);
  }

  return lines.join("\n");
}

function buildStrategyOverlay(strategyRecommendation) {
  if (!strategyRecommendation) return "";

  const strategy = strategyRecommendation.strategy || strategyRecommendation;
  const contentAngles = Array.isArray(strategy.contentAngles) ? strategy.contentAngles.join(", ") : "";
  const homepageStructure = Array.isArray(strategy.homepageStructure)
    ? strategy.homepageStructure.join(", ")
    : "";

  return [
    "Approved Lumi strategy to follow:",
    `- Positioning: ${strategy.positioning || ""}`,
    `- Primary offer: ${strategy.primaryOffer || ""}`,
    `- Primary audience: ${strategy.primaryAudience || ""}`,
    `- CTA strategy: ${strategy.ctaStrategy || ""}`,
    `- Content angles: ${contentAngles}`,
    `- Homepage structure: ${homepageStructure}`
  ]
    .filter(Boolean)
    .join("\n");
}

function buildLumixAssistPrompt({ client, message }) {
  return [
    buildLumixPromptHeader(),
    "You are answering inside the Lumi mini assistant in the EasyOnlinePresence app.",
    "Reply in Finnish.",
    "Be concise, practical, and helpful.",
    "If the user's idea implies better profile settings, return them in suggestedUpdates.",
    "Only include keys in suggestedUpdates that you can improve confidently from the user's message.",
    "Do not invent complex strategy. Keep this grounded in the existing client context.",
    "",
    "Current client context:",
    buildLumixContext(client),
    "",
    `User idea: ${message}`
  ].join("\n");
}

function buildOpenRouterJsonPrompt(prompt) {
  return `${prompt}\n\nReturn only valid JSON. Do not use markdown fences. Do not add any explanation before or after the JSON.`;
}

function buildDemoLumixAssistResponse({ client, message }) {
  const lower = String(message || "").toLowerCase();
  const suggestedUpdates = {};
  const notes = [];

  if (lower.includes("premium") || lower.includes("luksus") || lower.includes("luxury")) {
    suggestedUpdates.toneType = "premium";
    suggestedUpdates.pricePosition = "premium";
    notes.push("nostetaan sävyä premium-suunnan puolelle");
  }

  if (lower.includes("varaus") || lower.includes("book")) {
    suggestedUpdates.goalType = "bookings";
    suggestedUpdates.mainCta = "Varaa aika";
    notes.push("CTA voidaan ohjata varaukseen");
  } else if (lower.includes("liidi") || lower.includes("tarjous") || lower.includes("contact")) {
    suggestedUpdates.goalType = "lead_generation";
    suggestedUpdates.mainCta = "Pyydä tarjous";
    notes.push("CTA voidaan pitää tarjouspyynnössä");
  }

  if (lower.includes("hotelli") || lower.includes("b2b") || lower.includes("yritys")) {
    suggestedUpdates.businessType = "b2b_service";
    suggestedUpdates.audienceType = "small_businesses";
    notes.push("kohderyhmä näyttää enemmän B2B-puolelta");
  }

  if (lower.includes("verkossa") || lower.includes("online")) {
    suggestedUpdates.geoFocus = "verkossa";
  }

  suggestedUpdates.notes = message;
  suggestedUpdates.customPrompt = `Lumi-idea käyttäjältä: ${message}`;

  const summary =
    notes.length > 0
      ? `Muokkaan tätä ideaa tähän suuntaan: ${notes.join(", ")}.`
      : "Saan tästä ideasta hyvän luonnoksen yrityksen tietoihin ja agentin ohjeeseen.";

  return {
    mode: "demo",
    reply: `${summary} Tarkista ehdotetut muutokset ja paina tarvittaessa “Käytä ehdotusta”.`,
    suggestedUpdates
  };
}

function buildFamilyHeadline(family, businessName, offer) {
  const subject = stripTrailingPunctuation(offer || "specialist services").toLowerCase();
  const headlines = {
    "product-command": `${businessName} helps teams move faster with ${subject}.`,
    "editorial-luxury": `${businessName} delivers ${subject} with a more considered client experience.`,
    "trust-executive": `${businessName} offers ${subject} with clarity clients can trust.`,
    "local-craft": `${businessName} provides ${subject} with straightforward service and a clear next step.`,
    "serene-wellness": `${businessName} offers ${subject} in a calmer, more confident client experience.`,
    "gallery-showcase": `${businessName} presents ${subject} with a stronger first impression and clearer project fit.`,
    "hospitality-story": `${businessName} brings ${subject} together with a warmer first impression and easier booking path.`,
    "industrial-precision": `${businessName} handles ${subject} with reliable process and clear communication.`,
    "commerce-performance": `${businessName} makes ${subject} easier to discover and buy.`,
    "personal-authority": `${businessName} turns ${subject} into a clearer reason to get in touch.`
  };

  return headlines[family.id] || `${businessName} delivers ${subject} with clarity, trust, and a straightforward next step.`;
}

function buildFamilySubheadline(family, { strategy, audience, cta, offer }) {
  if (strategy?.positioning) return strategy.positioning;

  const subject = stripTrailingPunctuation(offer || "the service");
  return {
    "product-command": `Show what ${subject.toLowerCase()} actually does, who it helps, and why the next conversation is worth having.`,
    "editorial-luxury": `Present ${subject.toLowerCase()} with stronger atmosphere, clearer service framing, and a more confident path into ${cta.toLowerCase()}.`,
    "trust-executive": `Explain the offer, show credibility early, and help ${audience.toLowerCase()} understand why they should get in touch.`,
    "local-craft": "A better local service website should show what you do, who it is for, and how to get started in one clean pass.",
    "serene-wellness": "Treatments, trust, and booking details should feel calm, clear, and easy to follow before the first visit.",
    "gallery-showcase": "Make the standard of the work visible early and give better-fit clients a straightforward way to enquire.",
    "hospitality-story": "Let the experience, the offer, and the booking path land together without clutter or generic travel filler.",
    "industrial-precision": "Clients should be able to understand the capability, the process, and the next step without chasing more context.",
    "commerce-performance": "A stronger commerce page should make the value obvious quickly and reduce hesitation before the order starts.",
    "personal-authority": "Turn expertise into a clearer offer, stronger trust, and a more useful first conversation."
  }[family.id];
}

function buildDemoResponse({ businessName, description, family, context = null }) {
  const scene = findVisualScene({ businessName, description, context });
  const fallbackWebsite = normalizeWebsiteContent(
    {
      heroKicker: "",
      headline: "",
      subheadline: "",
      cta: "",
      secondaryCta: "",
      servicesTitle: "",
      servicesIntro: "",
      services: [],
      proofTitle: "",
      proofIntro: "",
      testimonials: [],
      processTitle: "",
      processIntro: "",
      processSteps: [],
      ctaHeadline: "",
      ctaBody: "",
      footerNote: ""
    },
    buildFallbackWebsiteContent({ businessName, description, family, context })
  );
  const slugBase = slugify(businessName);
  const fallbackSeo = buildFallbackSeo({
    businessName,
    description,
    context,
    website: fallbackWebsite
  });
  const fallbackBlogs = buildFallbackBlogs({ businessName, description, context });

  return {
    mode: "demo",
    notice: "OPENAI_API_KEY puuttuu. Sisalto generoitiin demo-tilassa.",
    website: {
      ...fallbackWebsite,
      html: renderWebsiteTemplate({
        businessName,
        family,
        scene,
        context,
        website: fallbackWebsite
      })
    },
    seo: {
      ...fallbackSeo,
      slug: fallbackSeo.slug || slugBase
    },
    blogs: fallbackBlogs
  };
}

function buildSavedPack({ businessName, description, parsed = null, source = null, family, context = null }) {
  const scene = findVisualScene({ businessName, description, context });
  const fallback = buildDemoResponse({ businessName, description, family, context });
  const website = parsed?.website && typeof parsed.website === "object" ? parsed.website : {};
  const seo = parsed?.seo && typeof parsed.seo === "object" ? parsed.seo : {};
  const blogs = Array.isArray(parsed?.blogs) ? parsed.blogs : [];
  const normalizedWebsite = normalizeWebsiteContent(website, fallback.website);

  return {
    mode: source?.mode || fallback.mode,
    notice: source?.notice || fallback.notice,
    website: {
      ...normalizedWebsite,
      html: renderWebsiteTemplate({
        businessName,
        family,
        scene,
        context,
        website: normalizedWebsite
      })
    },
    seo: {
      title: String(seo.title || fallback.seo.title || "").trim(),
      metaDescription: String(seo.metaDescription || fallback.seo.metaDescription || "").trim(),
      keywords: (Array.isArray(seo.keywords) && seo.keywords.length ? seo.keywords : fallback.seo.keywords)
        .map((item) => String(item || "").trim())
        .filter(Boolean),
      slug: String(seo.slug || fallback.seo.slug || "").trim(),
      internalLinks: (Array.isArray(seo.internalLinks) && seo.internalLinks.length ? seo.internalLinks : fallback.seo.internalLinks)
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    },
    blogs: (blogs.length ? blogs : fallback.blogs)
      .slice(0, 3)
      .map((blog, index) => {
        const fallbackBlog = fallback.blogs[index] || fallback.blogs[0];
        return {
          title: String(blog?.title || fallbackBlog.title || "").trim(),
          keyword: String(blog?.keyword || fallbackBlog.keyword || "").trim(),
          excerpt: String(blog?.excerpt || fallbackBlog.excerpt || "").trim(),
          html: sanitizeHtml(String(blog?.html || fallbackBlog.html || ""))
        };
      })
  };
}

export function createAgencyService() {
  const baseURL = process.env.OPENAI_BASE_URL;
  const model = process.env.OPENAI_MODEL || "openai/gpt-4o-mini";
  const apiKey = getOpenAiApiKey();
  const client = apiKey ? new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) }) : null;
  const isOpenRouter = baseURL?.includes("openrouter.ai");

  async function generatePack({ businessName, description, plan = "starter", customPrompt = "", context = null }) {
    const family = findDesignFamily({ businessName, description, customPrompt, context });
    const scene = findVisualScene({ businessName, description, customPrompt, context });
    const archetype = inferWebsiteArchetype({ businessName, description, customPrompt, context });
    if (!client) {
      return buildDemoResponse({ businessName, description, family, context });
    }

    const prompt = buildPrompt({ businessName, description, plan, customPrompt, family, scene, archetype });
    try {
      const parsed = await requestStructuredJson(client, {
        isOpenRouter,
        model,
        prompt,
        schemaName: "agency_pack",
        schema: generationSchema,
        maxTokens: isOpenRouter ? 400 : 4000
      });

      return buildSavedPack({
        businessName,
        description,
        parsed,
        family,
        context,
        source: {
          mode: "live",
          notice: `Sisalto generoitu mallilla ${model}.`
        }
      });
    } catch {
      return buildSavedPack({
        businessName,
        description,
        parsed: null,
        family,
        context,
        source: {
          mode: "fallback",
          notice: `Live content response was incomplete. Fallback pack created with ${model}.`
        }
      });
    }
  }

  async function generateAllForClient({ client: currentClient }) {
    const customPrompt = [
      currentClient.customPrompt || "",
      buildStrategyOverlay(currentClient.strategyRecommendation),
      buildLumixContext(currentClient)
    ]
      .filter(Boolean)
      .join("\n\n");

    return generatePack({
      businessName: currentClient.businessName,
      description: currentClient.description,
      plan: currentClient.plan || "starter",
      customPrompt,
      context: currentClient
    });
  }

  async function assistLumix({ client: currentClient, message }) {
    if (!client) {
      return buildDemoLumixAssistResponse({ client: currentClient, message });
    }

    const prompt = buildLumixAssistPrompt({ client: currentClient, message });
    const parsed = normalizeAssistPayload(await requestStructuredJson(client, {
      isOpenRouter,
      model,
      prompt,
      schemaName: "lumix_assist",
      schema: lumixAssistSchema,
      maxTokens: 250
    }));
    return {
      mode: "live",
      ...parsed
    };
  }

  return {
    model,
    live: Boolean(client),
    generatePack,
    generateAllForClient,
    assistLumix
  };
}
