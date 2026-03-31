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
  createRateLimitMiddleware,
  createSecurityHeadersMiddleware,
  createTrustedOriginMiddleware,
  getClientIp,
  getSecurityConfig,
  getTrustedOrigins,
  isPlainObject,
  isValidEmail,
  limitString,
  parseEntityId
} from "./security.js";
import {
  buildLumixContext,
  buildLumixRuntime,
  getLumixAgent,
  getLumixCatalog,
  getLumixHumanCodex,
  getLumixOntologyModel,
  runLumixAction
} from "./lumix.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const appUrl = process.env.APP_URL || `http://${host}:${port}`;

const database = createDatabase();
const auth = createAuthService(database);
const agency = createAgencyService();
const billing = createBillingService(database, appUrl);
const publisher = createPublishService(database);
const reports = createReportService(database);
const trustedOrigins = getTrustedOrigins(appUrl);
const securityConfig = getSecurityConfig();

const app = express();
app.disable("x-powered-by");

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
app.use(createSecurityHeadersMiddleware({ appUrl }));
app.use(express.static(publicDir, { index: false }));

const requireTrustedOrigin = createTrustedOriginMiddleware({ trustedOrigins });
const authRateLimit = createRateLimitMiddleware({
  windowMs: securityConfig.authWindowMs,
  max: securityConfig.authMax,
  keyGenerator: (req) => `${getClientIp(req)}:${limitString(req.body?.email, 254)}:${req.path}`,
  message: "Too many authentication attempts. Try again later."
});
const publicTrackRateLimit = createRateLimitMiddleware({
  windowMs: securityConfig.publicTrackWindowMs,
  max: securityConfig.publicTrackMax,
  keyGenerator: (req) => `${getClientIp(req)}:track:${req.params.id}`,
  message: "Tracking rate limit reached."
});
const publicLeadRateLimit = createRateLimitMiddleware({
  windowMs: securityConfig.publicLeadWindowMs,
  max: securityConfig.publicLeadMax,
  keyGenerator: (req) => `${getClientIp(req)}:lead:${req.params.id}`,
  message: "Lead form rate limit reached."
});

app.use("/api", (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  if (req.path === "/stripe/webhook" || req.path.startsWith("/public/")) {
    return next();
  }

  return requireTrustedOrigin(req, res, next);
});

function readEntityIdOrFail(req, res, name = "id") {
  const parsedId = parseEntityId(req.params[name]);
  if (!parsedId) {
    res.status(400).json({ error: `Invalid ${name}.` });
    return null;
  }
  return parsedId;
}

function readMetadata(input, maxLength = 2000) {
  if (input == null) {
    return {};
  }

  if (!isPlainObject(input)) {
    throw new Error("metadata must be an object.");
  }

  const serialized = JSON.stringify(input);
  if (serialized.length > maxLength) {
    throw new Error("metadata is too large.");
  }

  return input;
}

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
    queueConcurrency: queue.concurrency
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

app.post("/api/auth/register", authRateLimit, (req, res) => {
  try {
    const result = auth.register(req.body || {});
    res.setHeader("Set-Cookie", auth.buildSessionCookie(result.session.token));
    res.status(201).json({ user: result.user });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Registration failed." });
  }
});

app.post("/api/auth/login", authRateLimit, (req, res) => {
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
  const memberId = readEntityIdOrFail(req, res);
  if (!memberId) return;

  const role = String(req.body.role || "");
  if (!["admin", "member"].includes(role)) {
    return res.status(400).json({ error: "Role must be admin or member." });
  }

  const member = database.updateAgencyMemberRole(user.agencyId, memberId, role);
  if (!member) return res.status(404).json({ error: "Member not found." });
  res.json({ member });
});

app.post("/api/clients", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const businessName = String(req.body.businessName || "").trim();
  const description = String(req.body.description || "").trim();
  const customPrompt = limitString(req.body.customPrompt, 4000);
  const plan = String(req.body.plan || "starter").trim();
  const generationIntervalDays = Number(req.body.generationIntervalDays || 30);
  const autoGenerate = req.body.autoGenerate !== false;
  const scheduleEnabled = req.body.scheduleEnabled !== false;

  if (!businessName || !description) {
    return res.status(400).json({ error: "businessName and description are required." });
  }

  if (businessName.length > 120 || description.length > 3000 || !["starter", "growth", "scale"].includes(plan)) {
    return res.status(400).json({ error: "Invalid client payload." });
  }

  if (![7, 14, 30].includes(generationIntervalDays)) {
    return res.status(400).json({ error: "generationIntervalDays must be 7, 14 or 30." });
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
  const clientId = readEntityIdOrFail(req, res);
  if (!clientId) return;
  const client = database.getClientById(user.agencyId, clientId);
  if (!client) return res.status(404).json({ error: "Client not found." });
  res.json({ client: hydrateLumixClient(client) });
});

app.put("/api/clients/:id/intake", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const clientId = readEntityIdOrFail(req, res);
  if (!clientId) return;
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
      notes: limitString(req.body.notes, 4000)
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

  const clientId = readEntityIdOrFail(req, res);
  if (!clientId) return;
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

app.post("/api/clients/:id/lumix-assist", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const clientId = readEntityIdOrFail(req, res);
  if (!clientId) return;
  const client = database.getClientById(user.agencyId, clientId);
  if (!client) return res.status(404).json({ error: "Client not found." });

  const message = limitString(req.body.message, 2000);
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
      error: error instanceof Error ? error.message : "Lumix assist failed."
    });
  }
});

app.patch("/api/clients/:id", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const clientId = readEntityIdOrFail(req, res);
  if (!clientId) return;

  if (req.body.plan && !["starter", "growth", "scale"].includes(String(req.body.plan).trim())) {
    return res.status(400).json({ error: "Invalid plan." });
  }

  const client = database.updateClient(user.agencyId, clientId, {
    businessName: req.body.businessName ? String(req.body.businessName).trim() : undefined,
    description: req.body.description ? String(req.body.description).trim() : undefined,
    customPrompt: req.body.customPrompt !== undefined ? limitString(req.body.customPrompt, 4000) : undefined,
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
  const clientId = readEntityIdOrFail(req, res);
  if (!clientId) return;
  const client = database.getClientById(user.agencyId, clientId);
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
  const clientId = readEntityIdOrFail(req, res);
  if (!clientId) return;
  const client = database.getClientById(user.agencyId, clientId);
  if (!client) return res.status(404).json({ error: "Client not found." });

  const requestedPlan = req.body.plan ? String(req.body.plan).trim() : client.plan;
  if (!["starter", "growth", "scale"].includes(requestedPlan)) {
    return res.status(400).json({ error: "Invalid plan." });
  }

  try {
    const checkout = await billing.createCheckoutSession({
      client,
      userEmail: user.email,
      requestedPlan
    });
    res.json({ checkout });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Checkout failed." });
  }
});

app.post("/api/clients/:id/publish-targets", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const clientId = readEntityIdOrFail(req, res);
  if (!clientId) return;

  if (!isPlainObject(req.body.config || {})) {
    return res.status(400).json({ error: "config must be an object." });
  }

  const platform = String(req.body.platform || "").trim();
  if (!["wordpress", "webflow"].includes(platform)) {
    return res.status(400).json({ error: "Unsupported publish platform." });
  }

  const target = database.createPublishTarget(user.agencyId, clientId, {
    platform,
    name: limitString(req.body.name, 120),
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
  const clientId = readEntityIdOrFail(req, res);
  const targetId = readEntityIdOrFail(req, res, "targetId");
  if (!clientId || !targetId) return;

  if (req.body.config !== undefined && !isPlainObject(req.body.config)) {
    return res.status(400).json({ error: "config must be an object." });
  }

  if (req.body.platform && !["wordpress", "webflow"].includes(String(req.body.platform).trim())) {
    return res.status(400).json({ error: "Unsupported publish platform." });
  }

  const target = database.updatePublishTarget(user.agencyId, clientId, targetId, {
    platform: req.body.platform ? String(req.body.platform).trim() : undefined,
    name: req.body.name ? limitString(req.body.name, 120) : undefined,
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
  const clientId = readEntityIdOrFail(req, res);
  if (!clientId) return;
  const client = database.getClientById(user.agencyId, clientId);
  if (!client) return res.status(404).json({ error: "Client not found." });

  const targetId = req.body.targetId ? parseEntityId(req.body.targetId) : null;
  if (req.body.targetId && !targetId) {
    return res.status(400).json({ error: "Invalid targetId." });
  }
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

  if (recipients.some((recipient) => !isValidEmail(recipient))) {
    return res.status(400).json({ error: "Recipients must be valid email addresses." });
  }

  const smtpPort = Number(req.body.smtpPort || 587);
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    return res.status(400).json({ error: "SMTP port must be between 1 and 65535." });
  }

  const fromEmail = String(req.body.fromEmail || "").trim();
  if (fromEmail && !isValidEmail(fromEmail)) {
    return res.status(400).json({ error: "fromEmail must be a valid email address." });
  }

  const settings = database.upsertReportSettings(user.agencyId, {
    smtpHost: limitString(req.body.smtpHost, 255),
    smtpPort,
    smtpSecure: Boolean(req.body.smtpSecure),
    smtpUser: limitString(req.body.smtpUser, 255),
    smtpPass: limitString(req.body.smtpPass, 255),
    fromEmail,
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
  const clientId = readEntityIdOrFail(req, res);
  if (!clientId) return;
  const clientRow = database.getClientRecordByAnyId(clientId);
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

app.post("/api/public/clients/:id/track", publicTrackRateLimit, (req, res) => {
  const clientId = readEntityIdOrFail(req, res);
  if (!clientId) return;
  const clientRow = database.getClientRecordByAnyId(clientId);
  if (!clientRow || clientRow.status !== "active") {
    return res.status(404).json({ error: "Client page not found." });
  }

  const eventType = String(req.body.eventType || "").trim();
  if (!["page_view", "cta_click", "lead_submit"].includes(eventType)) {
    return res.status(400).json({ error: "Unsupported event type." });
  }

  let metadata;
  try {
    metadata = readMetadata(req.body.metadata, 2000);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid metadata." });
  }

  database.recordAnalyticsEvent(clientRow.id, {
    sessionId: limitString(req.body.sessionId, 120) || null,
    eventType,
    referrer: limitString(req.body.referrer, 2048) || null,
    metadata
  });

  res.json({
    ok: true,
    analytics: database.getAnalyticsSummaryForClient(clientRow.id)
  });
});

app.post("/api/public/clients/:id/lead", publicLeadRateLimit, (req, res) => {
  const clientId = readEntityIdOrFail(req, res);
  if (!clientId) return;
  const clientRow = database.getClientRecordByAnyId(clientId);
  if (!clientRow || clientRow.status !== "active") {
    return res.status(404).json({ error: "Client page not found." });
  }

  const email = String(req.body.email || "").trim();
  const message = limitString(req.body.message, 2000);

  if (!email || !message) {
    return res.status(400).json({ error: "email and message are required." });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }

  const lead = database.createLead(clientRow.id, {
    name: limitString(req.body.name, 120),
    email,
    message,
    source: limitString(req.body.source || "public_page", 120)
  });

  database.recordAnalyticsEvent(clientRow.id, {
    sessionId: limitString(req.body.sessionId, 120) || null,
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
  res.redirect("/lumix");
});

app.get("/lumix", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.get("/webbom", (_req, res) => {
  res.redirect("/lumix");
});

app.get("/login", (_req, res) => {
  res.sendFile(path.join(publicDir, "login.html"));
});

app.get("/register", (_req, res) => {
  res.sendFile(path.join(publicDir, "register.html"));
});

app.get("/dashboard", (_req, res) => {
  res.sendFile(path.join(publicDir, "dashboard.html"));
});

app.get("/app", (_req, res) => {
  res.redirect("/login");
});

app.get("*", (_req, res) => {
  res.redirect("/lumix");
});

app.listen(port, host, () => {
  console.log(`Lumix running on ${appUrl}`);
});
