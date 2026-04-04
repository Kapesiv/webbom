import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

import cors from "cors";
import express from "express";

import { createAgencyService } from "./agency.js";
import { createAuthService } from "./auth.js";
import { createBillingService } from "./billing.js";
import { createDatabase } from "./db.js";
import { generateAndSaveStrategy } from "./lib/lumix-strategy.js";
import { createPublishService } from "./publish.js";
import { createQueueService } from "./queue.js";
import { createReportService } from "./reports.js";
import { createScheduler } from "./scheduler.js";
import {
  buildLumixContext,
  buildLumixRuntime,
  getLumixAgent,
  getLumixCatalog,
  getLumixHumanCodex,
  getLumixOntologyModel,
  runLumixAction
} from "./lumix.js";

const nodeEnv = String(process.env.NODE_ENV || "").trim();

if (!nodeEnv) {
  throw new Error("NODE_ENV is required. Set NODE_ENV=production for production.");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const appUrl = process.env.APP_URL || `http://${host}:${port}`;
const siteUrl = appUrl.replace(/\/$/, "");
const expectsProduction = appUrl.startsWith("https://");

if (expectsProduction && nodeEnv !== "production") {
  throw new Error("Production APP_URL requires NODE_ENV=production.");
}

const database = createDatabase();
const auth = createAuthService(database);
const agency = createAgencyService();
const billing = createBillingService(database, appUrl);
const publisher = createPublishService(database);
const reports = createReportService(database);

const app = express();

if (nodeEnv === "production") {
  app.set("trust proxy", 1);
}

app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const result = await billing.handleWebhookRequest(req);
    res.json(result);
  } catch (error) {
    console.error("Stripe webhook failed:", error);
    res.status(400).json({
      error: error instanceof Error ? error.message : "Webhook failed."
    });
  }
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(publicDir, { index: false }));

function requireAuth(req, res) {
  const user = auth.getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required." });
    return null;
  }
  return user;
}

function requireRole(user, res, allowedRoles) {
  if (!allowedRoles.includes(user.role)) {
    res.status(403).json({
      error: `This action requires one of: ${allowedRoles.join(", ")}.`
    });
    return false;
  }
  return true;
}

function hydrateLumixClient(client) {
  return {
    ...client,
    lumix: buildLumixRuntime(client)
  };
}

function lumixActionPayload(actionResult) {
  return {
    action: actionResult.action,
    objectCount: actionResult.objects.all.length,
    linkCount: actionResult.links.length,
    explanation: actionResult.explanation || null,
    ready: Boolean(actionResult.ready),
    targetCount: actionResult.targetCount || 0
  };
}

function getGenerateDecision(client) {
  const runtime = buildLumixRuntime(client);
  return {
    ready: runtime.actions.generate_pack.ready,
    reason: runtime.actions.generate_pack.reason
  };
}

function getOnboardingBusinessConfig(choice) {
  if (choice === "local_service") {
    return {
      businessType: "local_service",
      offerType: "service",
      audienceType: "local_customers"
    };
  }

  if (choice === "premium_studio") {
    return {
      businessType: "local_service",
      offerType: "service",
      audienceType: "consumers"
    };
  }

  if (choice === "expert_business") {
    return {
      businessType: "b2b_service",
      offerType: "service",
      audienceType: "small_businesses"
    };
  }

  return {
    businessType: "b2b_service",
    offerType: "service",
    audienceType: "consumers"
  };
}

function getOnboardingGoalConfig(choice) {
  if (choice === "bookings") {
    return {
      goalType: "bookings",
      mainCta: "Book now"
    };
  }

  if (choice === "trust") {
    return {
      goalType: "awareness",
      mainCta: "Learn more"
    };
  }

  return {
    goalType: "lead_generation",
    mainCta: "Request a quote"
  };
}

function getOnboardingToneConfig(choice) {
  if (choice === "premium_bold") {
    return {
      toneType: "premium",
      pricePosition: "premium"
    };
  }

  if (choice === "calm_elegant") {
    return {
      toneType: "friendly",
      pricePosition: "premium"
    };
  }

  return {
    toneType: "trusted",
    pricePosition: "standard"
  };
}

function sanitizeOtherValue(value) {
  return String(value || "").trim().slice(0, 240);
}

function buildOnboardingSummary(answers) {
  return [
    `Business direction: ${answers.businessTypeChoiceLabel}${answers.businessTypeOther ? ` (${answers.businessTypeOther})` : ""}.`,
    `Primary goal: ${answers.goalChoiceLabel}${answers.goalOther ? ` (${answers.goalOther})` : ""}.`,
    `Preferred feel: ${answers.toneChoiceLabel}${answers.toneOther ? ` (${answers.toneOther})` : ""}.`,
    `Privacy feel: ${answers.privacyChoiceLabel}${answers.privacyOther ? ` (${answers.privacyOther})` : ""}.`,
    `Visual direction: ${answers.visualChoiceLabel}${answers.visualOther ? ` (${answers.visualOther})` : ""}.`
  ].join(" ");
}

function getOnboardingAnswerLabel(group, choice) {
  const labels = {
    businessType: {
      local_service: "Local service",
      premium_studio: "Premium studio or brand",
      expert_business: "Business or expert company",
      other: "Other"
    },
    goal: {
      leads: "Get leads",
      bookings: "Get bookings",
      trust: "Build trust",
      other: "Other"
    },
    tone: {
      premium_bold: "Premium and bold",
      calm_elegant: "Calm and elegant",
      clear_trustworthy: "Clear and trustworthy",
      other: "Other"
    },
    privacy: {
      public_visible: "Public and visible",
      polished_restrained: "Polished but restrained",
      private_discreet: "Private and discreet",
      other: "Other"
    },
    visual: {
      minimal_clean: "Minimal and clean",
      rich_visual: "Rich and visual",
      product_ui: "Structured and product-like",
      other: "Other"
    }
  };

  return labels[group]?.[choice] || "Other";
}

async function generateAndPersistClient(clientId, mode) {
  const clientRow = database.getClientRecordByAnyId(clientId);
  if (!clientRow) throw new Error("Client not found.");
  const hydratedClient = database.getClientById(clientRow.agency_id, clientId);
  const generationDecision = getGenerateDecision(hydratedClient);

  if (!generationDecision.ready) {
    throw new Error(generationDecision.reason);
  }

  try {
    const pack = await agency.generateAllForClient({
      client: hydratedClient
    });

    database.saveGeneratedContent(clientId, pack, mode);

    const refreshedClient = database.getClientById(clientRow.agency_id, clientId);
    const autoPublishTargets = database.listAutoPublishTargets(clientId);

    if (autoPublishTargets.length) {
      await publisher.publishClient(refreshedClient, autoPublishTargets);
    }

    return database.getClientById(clientRow.agency_id, clientId);
  } catch (error) {
    database.recordGenerationRun(clientId, {
      mode,
      status: "failed",
      message: error instanceof Error ? error.message : "Unknown error"
    });
    throw error;
  }
}

async function publishClientTargets(clientId, targetId = null) {
  const clientRow = database.getClientRecordByAnyId(clientId);
  if (!clientRow) throw new Error("Client not found.");

  const client = database.getClientById(clientRow.agency_id, clientId);
  let targets = client.publishTargets;

  if (targetId) {
    const target = client.publishTargets.find((item) => item.id === targetId);
    if (!target) throw new Error("Publish target not found.");
    targets = [target];
  }

  return publisher.publishClient(client, targets);
}

const queue = createQueueService(database, {
  async generate_client(job) {
    const mode = String(job.payload?.mode || "manual");
    const client = await generateAndPersistClient(job.clientId, mode);
    return {
      clientId: client.id,
      businessName: client.businessName,
      mode
    };
  },
  async publish_client(job) {
    const results = await publishClientTargets(job.clientId, job.payload?.targetId || null);
    return {
      clientId: job.clientId,
      targetId: job.payload?.targetId || null,
      results
    };
  },
  async send_report(job) {
    return reports.sendAgencyReport(job.agencyId);
  }
});

const scheduler = createScheduler(database, queue.enqueue, getGenerateDecision);
queue.start();
scheduler.start();

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    liveAi: agency.live,
    stripeConfigured: billing.configured,
    schedulerIntervalMs: scheduler.intervalMs,
    queueIntervalMs: queue.intervalMs,
    queueConcurrency: queue.concurrency,
    databasePath: database.dbPath
  });
});

app.get("/api/bootstrap", (req, res) => {
  const user = auth.getUserFromRequest(req);
  if (!user) {
    return res.json({
      authenticated: false,
      health: {
        liveAi: agency.live,
        stripeConfigured: billing.configured,
        schedulerIntervalMs: scheduler.intervalMs,
        queueIntervalMs: queue.intervalMs
      }
    });
  }

  const snapshot = database.getAgencySnapshot(user.agencyId);
  return res.json({
    authenticated: true,
    user,
    lumix: {
      agent: getLumixAgent(),
      catalog: getLumixCatalog(),
      model: getLumixOntologyModel(),
      codex: getLumixHumanCodex()
    },
    summary: snapshot.summary,
    clients: snapshot.clients.map(hydrateLumixClient),
    members: snapshot.members,
    reportSettings: snapshot.reportSettings,
    reportHistory: snapshot.reportHistory,
    jobs: snapshot.jobs,
    health: {
      liveAi: agency.live,
      stripeConfigured: billing.configured,
      schedulerIntervalMs: scheduler.intervalMs,
      queueIntervalMs: queue.intervalMs
    }
  });
});

app.get("/api/lumix", (_req, res) => {
  res.json({
    agent: getLumixAgent(),
    catalog: getLumixCatalog(),
    model: getLumixOntologyModel(),
    codex: getLumixHumanCodex()
  });
});

app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send(`User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`);
});

app.get("/sitemap.xml", (_req, res) => {
  const now = new Date().toISOString();
  const urls = [
    { loc: `${siteUrl}/`, priority: "1.0" }
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  res.type("application/xml").send(xml);
});

app.post("/api/auth/register", (req, res) => {
  try {
    const result = auth.register(req.body || {});
    res.setHeader("Set-Cookie", auth.buildSessionCookie(result.session.token));
    res.status(201).json({ user: result.user });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Registration failed." });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const result = auth.login(req.body || {});
    res.setHeader("Set-Cookie", auth.buildSessionCookie(result.session.token));
    res.json({ user: result.user });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Login failed." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  auth.logout(req);
  res.setHeader("Set-Cookie", auth.buildClearSessionCookie());
  res.json({ ok: true });
});

app.post("/api/auth/onboarding", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const forceNewClient = Boolean(req.body.forceNewClient);

  const businessTypeChoice = String(req.body.businessTypeChoice || "").trim() || "other";
  const goalChoice = String(req.body.goalChoice || "").trim() || "leads";
  const toneChoice = String(req.body.toneChoice || "").trim() || "clear_trustworthy";
  const privacyChoice = String(req.body.privacyChoice || "").trim() || "polished_restrained";
  const visualChoice = String(req.body.visualChoice || "").trim() || "minimal_clean";

  const answers = {
    businessTypeChoice,
    businessTypeChoiceLabel: getOnboardingAnswerLabel("businessType", businessTypeChoice),
    businessTypeOther: sanitizeOtherValue(req.body.businessTypeOther),
    goalChoice,
    goalChoiceLabel: getOnboardingAnswerLabel("goal", goalChoice),
    goalOther: sanitizeOtherValue(req.body.goalOther),
    toneChoice,
    toneChoiceLabel: getOnboardingAnswerLabel("tone", toneChoice),
    toneOther: sanitizeOtherValue(req.body.toneOther),
    privacyChoice,
    privacyChoiceLabel: getOnboardingAnswerLabel("privacy", privacyChoice),
    privacyOther: sanitizeOtherValue(req.body.privacyOther),
    visualChoice,
    visualChoiceLabel: getOnboardingAnswerLabel("visual", visualChoice),
    visualOther: sanitizeOtherValue(req.body.visualOther)
  };

  const onboardingSummary = buildOnboardingSummary(answers);
  const businessConfig = getOnboardingBusinessConfig(businessTypeChoice);
  const goalConfig = getOnboardingGoalConfig(goalChoice);
  const toneConfig = getOnboardingToneConfig(toneChoice);
  const existingClients = database.listClientsForAgency(user.agencyId);
  const client =
    (!forceNewClient && existingClients[0]) ||
    database.createClient(user.agencyId, user.id, {
      businessName: forceNewClient ? `New Website ${existingClients.length + 1}` : user.agencyName || "New business",
      description: "",
      customPrompt: "",
      plan: "starter"
    });

  const businessProfile = database.upsertBusinessProfile(client.id, {
    ...businessConfig,
    ...goalConfig,
    ...toneConfig,
    rawNotes: {
      notes: onboardingSummary,
      onboardingSummary,
      privacyPreference: privacyChoice,
      visualIntensity: visualChoice,
      otherBusinessType: answers.businessTypeOther,
      otherGoal: answers.goalOther,
      otherTone: answers.toneOther,
      otherPrivacy: answers.privacyOther,
      otherVisual: answers.visualOther,
      businessTypeLabel: answers.businessTypeChoiceLabel,
      goalLabel: answers.goalChoiceLabel,
      toneLabel: answers.toneChoiceLabel,
      privacyLabel: answers.privacyChoiceLabel,
      visualLabel: answers.visualChoiceLabel
    }
  });

  const intakeAnswers = database.saveIntakeAnswers(client.id, [
    { questionKey: "business_type", answerValue: businessProfile.businessType, answerLabel: answers.businessTypeChoiceLabel },
    { questionKey: "offer_type", answerValue: businessProfile.offerType, answerLabel: businessProfile.offerType },
    { questionKey: "audience_type", answerValue: businessProfile.audienceType, answerLabel: businessProfile.audienceType },
    { questionKey: "goal_type", answerValue: businessProfile.goalType, answerLabel: answers.goalChoiceLabel },
    { questionKey: "tone_type", answerValue: businessProfile.toneType, answerLabel: answers.toneChoiceLabel },
    { questionKey: "price_position", answerValue: businessProfile.pricePosition, answerLabel: businessProfile.pricePosition },
    { questionKey: "main_cta", answerValue: businessProfile.mainCta, answerLabel: businessProfile.mainCta },
    { questionKey: "privacy_preference", answerValue: privacyChoice, answerLabel: answers.privacyChoiceLabel },
    { questionKey: "visual_intensity", answerValue: visualChoice, answerLabel: answers.visualChoiceLabel }
  ]);

  const refreshedUser = database.markUserOnboardingComplete(user.id);
  const refreshedClient = hydrateLumixClient(database.getClientById(user.agencyId, client.id));

  res.json({
    ok: true,
    user: refreshedUser,
    client: refreshedClient,
    businessProfile,
    intakeAnswers
  });
});

app.get("/api/jobs", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  res.json({ jobs: database.listJobsForAgency(user.agencyId) });
});

app.post("/api/worker/run-now", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user || !requireRole(user, res, ["owner", "admin"])) return;
  const results = await queue.processNextJobs();
  res.json({ results });
});

app.get("/api/team-members", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  res.json({ members: database.listAgencyMembers(user.agencyId) });
});

app.post("/api/team-members", (req, res) => {
  const user = requireAuth(req, res);
  if (!user || !requireRole(user, res, ["owner", "admin"])) return;

  try {
    const member = auth.createAgencyMember({
      agencyId: user.agencyId,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role || "member"
    });
    res.status(201).json({ member });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Team member creation failed." });
  }
});

app.patch("/api/team-members/:id", (req, res) => {
  const user = requireAuth(req, res);
  if (!user || !requireRole(user, res, ["owner"])) return;

  const role = String(req.body.role || "");
  if (!["admin", "member"].includes(role)) {
    return res.status(400).json({ error: "Role must be admin or member." });
  }

  const member = database.updateAgencyMemberRole(user.agencyId, Number(req.params.id), role);
  if (!member) return res.status(404).json({ error: "Member not found." });
  res.json({ member });
});

app.post("/api/clients", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const businessName = String(req.body.businessName || "").trim();
  const description = String(req.body.description || "").trim();
  const customPrompt = String(req.body.customPrompt || "").trim();
  const plan = String(req.body.plan || "starter").trim();
  const generationIntervalDays = Number(req.body.generationIntervalDays || 30);
  const autoGenerate = req.body.autoGenerate !== false;
  const scheduleEnabled = req.body.scheduleEnabled !== false;

  if (!businessName || !description) {
    return res.status(400).json({ error: "businessName and description are required." });
  }

  const client = database.createClient(user.agencyId, user.id, {
    businessName,
    description,
    customPrompt,
    plan,
    generationIntervalDays,
    scheduleEnabled
  });
  const generationDecision = getGenerateDecision(client);

  let job = null;
  if (autoGenerate && generationDecision.ready) {
    job = queue.enqueue({
      agencyId: user.agencyId,
      clientId: client.id,
      type: "generate_client",
      payload: { mode: "manual" }
    });
  }

  res.status(201).json({
    client: hydrateLumixClient(client),
    job,
    generationDecision
  });
});

app.get("/api/clients/:id", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const client = database.getClientById(user.agencyId, Number(req.params.id));
  if (!client) return res.status(404).json({ error: "Client not found." });
  res.json({ client: hydrateLumixClient(client) });
});

app.put("/api/clients/:id/intake", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const clientId = Number(req.params.id);
  const client = database.getClientById(user.agencyId, clientId);
  if (!client) return res.status(404).json({ error: "Client not found." });

  const businessProfile = database.upsertBusinessProfile(clientId, {
    businessType: String(req.body.businessType || "").trim(),
    offerType: String(req.body.offerType || "").trim(),
    audienceType: String(req.body.audienceType || "").trim(),
    goalType: String(req.body.goalType || "").trim(),
    toneType: String(req.body.toneType || "").trim(),
    geoFocus: String(req.body.geoFocus || "").trim(),
    pricePosition: String(req.body.pricePosition || "").trim(),
    mainCta: String(req.body.mainCta || "").trim(),
    rawNotes: {
      notes: String(req.body.notes || "").trim()
    }
  });

  const answers = database.saveIntakeAnswers(clientId, [
    { questionKey: "business_type", answerValue: businessProfile.businessType, answerLabel: businessProfile.businessType },
    { questionKey: "offer_type", answerValue: businessProfile.offerType, answerLabel: businessProfile.offerType },
    { questionKey: "audience_type", answerValue: businessProfile.audienceType, answerLabel: businessProfile.audienceType },
    { questionKey: "goal_type", answerValue: businessProfile.goalType, answerLabel: businessProfile.goalType },
    { questionKey: "tone_type", answerValue: businessProfile.toneType, answerLabel: businessProfile.toneType },
    { questionKey: "geo_focus", answerValue: businessProfile.geoFocus, answerLabel: businessProfile.geoFocus },
    { questionKey: "price_position", answerValue: businessProfile.pricePosition, answerLabel: businessProfile.pricePosition },
    { questionKey: "main_cta", answerValue: businessProfile.mainCta, answerLabel: businessProfile.mainCta }
  ]);

  res.json({
    businessProfile,
    intakeAnswers: answers,
    client: hydrateLumixClient(database.getClientById(user.agencyId, clientId))
  });
});

app.post("/api/clients/:id/recommendation", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const clientId = Number(req.params.id);
  const client = database.getClientById(user.agencyId, clientId);
  if (!client) return res.status(404).json({ error: "Client not found." });

  const actionResult = runLumixAction("recommend_strategy", {
    client,
    businessProfile: client.businessProfile,
    intakeAnswers: client.intakeAnswers || [],
    strategyRecommendation: client.strategyRecommendation || null
  });

  if (!actionResult.ready || !actionResult.recommendation) {
    return res.status(400).json({
      error: actionResult.explanation?.reason || "Recommendation is not allowed yet.",
      lumixAction: lumixActionPayload(actionResult)
    });
  }

  try {
    const recommendation = await generateAndSaveStrategy(database, clientId);

    res.json({
      recommendation,
      lumixAction: lumixActionPayload(actionResult),
      client: hydrateLumixClient(database.getClientById(user.agencyId, clientId))
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Strategy generation failed.",
      lumixAction: lumixActionPayload(actionResult)
    });
  }
});

app.patch("/api/clients/:id/strategy", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const clientId = Number(req.params.id);
  const client = database.getClientById(user.agencyId, clientId);
  if (!client) return res.status(404).json({ error: "Client not found." });

  const homepageStructure = Array.isArray(req.body.homepageStructure)
    ? req.body.homepageStructure.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  const recommendation = database.upsertStrategyRecommendation(clientId, {
    status: "approved",
    positioning: String(req.body.positioning || "").trim(),
    primaryOffer: String(req.body.primaryOffer || "").trim(),
    primaryAudience: String(req.body.primaryAudience || "").trim(),
    ctaStrategy: String(req.body.ctaStrategy || "").trim(),
    homepageStructure,
    contentAngles: client.strategyRecommendation?.contentAngles || []
  });

  res.json({
    recommendation,
    client: hydrateLumixClient(database.getClientById(user.agencyId, clientId))
  });
});

app.post("/api/clients/:id/lumix-assist", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const clientId = Number(req.params.id);
  const client = database.getClientById(user.agencyId, clientId);
  if (!client) return res.status(404).json({ error: "Client not found." });

  const message = String(req.body.message || "").trim();
  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    const assist = await agency.assistLumix({
      client,
      message
    });

    res.json({
      assist,
      client: hydrateLumixClient(database.getClientById(user.agencyId, clientId))
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "EasyOnlinePresence assist failed."
    });
  }
});

app.patch("/api/clients/:id", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const client = database.updateClient(user.agencyId, Number(req.params.id), {
    businessName: req.body.businessName ? String(req.body.businessName).trim() : undefined,
    description: req.body.description ? String(req.body.description).trim() : undefined,
    customPrompt: req.body.customPrompt !== undefined ? String(req.body.customPrompt).trim() : undefined,
    plan: req.body.plan ? String(req.body.plan).trim() : undefined,
    status: req.body.status ? String(req.body.status).trim() : undefined,
    billingStatus: req.body.billingStatus ? String(req.body.billingStatus).trim() : undefined,
    generationIntervalDays:
      req.body.generationIntervalDays !== undefined ? Number(req.body.generationIntervalDays) : undefined,
    scheduleEnabled:
      req.body.scheduleEnabled !== undefined ? Boolean(req.body.scheduleEnabled) : undefined
  });

  if (!client) return res.status(404).json({ error: "Client not found." });
  res.json({ client });
});

app.post("/api/clients/:id/generate", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const client = database.getClientById(user.agencyId, Number(req.params.id));
  if (!client) return res.status(404).json({ error: "Client not found." });

  const actionResult = runLumixAction("generate_pack", {
    client,
    businessProfile: client.businessProfile,
    intakeAnswers: client.intakeAnswers || [],
    strategyRecommendation: client.strategyRecommendation || null
  });

  if (!actionResult.ready) {
    return res.status(400).json({
      error: actionResult.explanation?.reason || "Generate is not allowed yet.",
      lumixAction: lumixActionPayload(actionResult)
    });
  }

  const job = queue.enqueue({
    agencyId: user.agencyId,
    clientId: client.id,
    type: "generate_client",
    payload: { mode: "manual" }
  });

  res.json({
    job,
    lumixAction: lumixActionPayload(actionResult)
  });
});

app.post("/api/clients/:id/generate-all", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const clientId = Number(req.params.id);
  let client = database.getClientById(user.agencyId, clientId);
  if (!client) return res.status(404).json({ error: "Client not found." });

  if (!client.strategyRecommendation) {
    const recommendationAction = runLumixAction("recommend_strategy", {
      client,
      businessProfile: client.businessProfile,
      intakeAnswers: client.intakeAnswers || [],
      strategyRecommendation: client.strategyRecommendation || null
    });

    if (!recommendationAction.ready || !recommendationAction.recommendation) {
      return res.status(400).json({
        error: recommendationAction.explanation?.reason || "Strategy generation is not allowed yet.",
        lumixAction: lumixActionPayload(recommendationAction)
      });
    }

    try {
      await generateAndSaveStrategy(database, clientId);
      client = database.getClientById(user.agencyId, clientId);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Strategy generation failed."
      });
    }
  }

  const actionResult = runLumixAction("generate_pack", {
    client,
    businessProfile: client.businessProfile,
    intakeAnswers: client.intakeAnswers || [],
    strategyRecommendation: client.strategyRecommendation || null
  });

  if (!actionResult.ready) {
    return res.status(400).json({
      error: actionResult.explanation?.reason || "Generate is not allowed yet.",
      lumixAction: lumixActionPayload(actionResult)
    });
  }

  try {
    const refreshedClient = await generateAndPersistClient(clientId, "manual");
    res.json({
      ok: true,
      clientId,
      strategySummary: refreshedClient.strategyRecommendation?.summary || "",
      strategy: refreshedClient.strategyRecommendation?.strategy || null,
      content: {
        landingPage: refreshedClient.website,
        seo: refreshedClient.seo,
        blogs: refreshedClient.blogs
      },
      updatedAt: refreshedClient.updatedAt,
      lumixAction: lumixActionPayload(actionResult),
      client: hydrateLumixClient(refreshedClient)
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Generate all failed.",
      lumixAction: lumixActionPayload(actionResult)
    });
  }
});

app.post("/api/clients/:id/checkout", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const client = database.getClientById(user.agencyId, Number(req.params.id));
  if (!client) return res.status(404).json({ error: "Client not found." });

  try {
    const checkout = await billing.createCheckoutSession({
      client,
      userEmail: user.email,
      requestedPlan: req.body.plan ? String(req.body.plan) : client.plan
    });
    res.json({ checkout });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Checkout failed." });
  }
});

app.post("/api/clients/:id/publish-targets", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const target = database.createPublishTarget(user.agencyId, Number(req.params.id), {
    platform: String(req.body.platform || "").trim(),
    name: String(req.body.name || "").trim(),
    autoPublish: Boolean(req.body.autoPublish),
    status: "active",
    config: req.body.config || {}
  });

  if (!target) return res.status(404).json({ error: "Client not found." });
  res.status(201).json({ target });
});

app.patch("/api/clients/:id/publish-targets/:targetId", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const target = database.updatePublishTarget(user.agencyId, Number(req.params.id), Number(req.params.targetId), {
    platform: req.body.platform ? String(req.body.platform).trim() : undefined,
    name: req.body.name ? String(req.body.name).trim() : undefined,
    autoPublish: req.body.autoPublish !== undefined ? Boolean(req.body.autoPublish) : undefined,
    status: req.body.status ? String(req.body.status).trim() : undefined,
    config: req.body.config || undefined
  });

  if (!target) return res.status(404).json({ error: "Publish target not found." });
  res.json({ target });
});

app.post("/api/clients/:id/publish", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const client = database.getClientById(user.agencyId, Number(req.params.id));
  if (!client) return res.status(404).json({ error: "Client not found." });

  const targetId = req.body.targetId ? Number(req.body.targetId) : null;
  const actionResult = runLumixAction("publish_pack", {
    client,
    businessProfile: client.businessProfile,
    intakeAnswers: client.intakeAnswers || [],
    strategyRecommendation: client.strategyRecommendation || null,
    targetId
  });

  if (!actionResult.ready) {
    return res.status(400).json({
      error: actionResult.explanation?.reason || "Publish is not allowed yet.",
      lumixAction: lumixActionPayload(actionResult)
    });
  }

  const job = queue.enqueue({
    agencyId: user.agencyId,
    clientId: client.id,
    type: "publish_client",
    payload: {
      targetId
    }
  });

  res.json({
    job,
    lumixAction: lumixActionPayload(actionResult)
  });
});

app.get("/api/reports/settings", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  res.json({
    settings: database.getReportSettings(user.agencyId),
    history: database.listReportRuns(user.agencyId)
  });
});

app.put("/api/reports/settings", (req, res) => {
  const user = requireAuth(req, res);
  if (!user || !requireRole(user, res, ["owner", "admin"])) return;

  const recipients = String(req.body.recipients || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const settings = database.upsertReportSettings(user.agencyId, {
    smtpHost: String(req.body.smtpHost || "").trim(),
    smtpPort: Number(req.body.smtpPort || 587),
    smtpSecure: Boolean(req.body.smtpSecure),
    smtpUser: String(req.body.smtpUser || "").trim(),
    smtpPass: String(req.body.smtpPass || "").trim(),
    fromEmail: String(req.body.fromEmail || "").trim(),
    recipients
  });

  res.json({ settings });
});

app.post("/api/reports/send", (req, res) => {
  const user = requireAuth(req, res);
  if (!user || !requireRole(user, res, ["owner", "admin"])) return;

  const job = queue.enqueue({
    agencyId: user.agencyId,
    type: "send_report",
    payload: {}
  });

  res.json({ job });
});

app.post("/api/scheduler/run-now", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const results = scheduler.ensureDueGenerationJobs();
  res.json({ results });
});

app.get("/api/public/clients/:id", (req, res) => {
  const clientRow = database.getClientRecordByAnyId(Number(req.params.id));
  if (!clientRow || clientRow.status !== "active") {
    return res.status(404).json({ error: "Client page not found." });
  }

  const client = database.getClientById(clientRow.agency_id, clientRow.id);
  res.json({
    client: {
      id: client.id,
      businessName: client.businessName,
      description: client.description,
      website: client.website,
      seo: client.seo
    }
  });
});

app.post("/api/public/clients/:id/track", (req, res) => {
  const clientRow = database.getClientRecordByAnyId(Number(req.params.id));
  if (!clientRow || clientRow.status !== "active") {
    return res.status(404).json({ error: "Client page not found." });
  }

  const eventType = String(req.body.eventType || "").trim();
  if (!["page_view", "cta_click", "lead_submit"].includes(eventType)) {
    return res.status(400).json({ error: "Unsupported event type." });
  }

  database.recordAnalyticsEvent(clientRow.id, {
    sessionId: String(req.body.sessionId || "").trim() || null,
    eventType,
    referrer: String(req.body.referrer || "").trim() || null,
    metadata: req.body.metadata || {}
  });

  res.json({
    ok: true,
    analytics: database.getAnalyticsSummaryForClient(clientRow.id)
  });
});

app.post("/api/public/clients/:id/lead", (req, res) => {
  const clientRow = database.getClientRecordByAnyId(Number(req.params.id));
  if (!clientRow || clientRow.status !== "active") {
    return res.status(404).json({ error: "Client page not found." });
  }

  const email = String(req.body.email || "").trim();
  const message = String(req.body.message || "").trim();

  if (!email || !message) {
    return res.status(400).json({ error: "email and message are required." });
  }

  const lead = database.createLead(clientRow.id, {
    name: String(req.body.name || "").trim(),
    email,
    message,
    source: String(req.body.source || "public_page")
  });

  database.recordAnalyticsEvent(clientRow.id, {
    sessionId: String(req.body.sessionId || "").trim() || null,
    eventType: "lead_submit",
    referrer: null,
    metadata: {
      email
    }
  });

  res.status(201).json({ lead });
});

app.get("/client/:id", (_req, res) => {
  res.sendFile(path.join(publicDir, "client.html"));
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.get("/lumix", (_req, res) => {
  res.redirect(301, "/");
});

app.get("/webbom", (_req, res) => {
  res.redirect("/");
});

app.get("/login", (_req, res) => {
  res.sendFile(path.join(publicDir, "login.html"));
});

app.get("/register", (_req, res) => {
  res.sendFile(path.join(publicDir, "register.html"));
});

app.get("/welcome", (_req, res) => {
  res.sendFile(path.join(publicDir, "welcome.html"));
});

app.get("/dashboard", (_req, res) => {
  res.sendFile(path.join(publicDir, "dashboard.html"));
});

app.get("/preview-large", (_req, res) => {
  res.sendFile(path.join(publicDir, "preview-large.html"));
});

app.get("/app", (_req, res) => {
  res.redirect("/login");
});

app.get("*", (_req, res) => {
  res.redirect("/");
});

app.listen(port, host, () => {
  console.log(`EasyOnlinePresence running on ${appUrl}`);
});
