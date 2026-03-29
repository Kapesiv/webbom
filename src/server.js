import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

import cors from "cors";
import express from "express";

import { createAgencyService } from "./agency.js";
import { createAuthService } from "./auth.js";
import { createBillingService } from "./billing.js";
import { createDatabase } from "./db.js";
import { createPublishService } from "./publish.js";
import { createQueueService } from "./queue.js";
import { createReportService } from "./reports.js";
import { createScheduler } from "./scheduler.js";
import {
  buildLumixContext,
  buildLumixStrategyRecommendation,
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

const app = express();

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

async function generateAndPersistClient(clientId, mode) {
  const clientRow = database.getClientRecordByAnyId(clientId);
  if (!clientRow) throw new Error("Client not found.");
  const hydratedClient = database.getClientById(clientRow.agency_id, clientId);

  try {
    const pack = await agency.generatePack({
      businessName: hydratedClient.businessName,
      description: hydratedClient.description,
      plan: hydratedClient.plan,
      customPrompt: [hydratedClient.customPrompt || "", buildLumixContext(hydratedClient)]
        .filter(Boolean)
        .join("\n\n")
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

const scheduler = createScheduler(database, queue.enqueue);
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
    clients: snapshot.clients,
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

  let job = null;
  if (autoGenerate) {
    job = queue.enqueue({
      agencyId: user.agencyId,
      clientId: client.id,
      type: "generate_client",
      payload: { mode: "manual" }
    });
  }

  res.status(201).json({ client, job });
});

app.get("/api/clients/:id", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const client = database.getClientById(user.agencyId, Number(req.params.id));
  if (!client) return res.status(404).json({ error: "Client not found." });
  res.json({ client });
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
    client: database.getClientById(user.agencyId, clientId)
  });
});

app.post("/api/clients/:id/recommendation", (req, res) => {
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

  const recommendation = database.upsertStrategyRecommendation(clientId, actionResult.recommendation);

  res.json({
    recommendation,
    lumixAction: {
      action: actionResult.action,
      objectCount: actionResult.objects.all.length,
      linkCount: actionResult.links.length,
      explanation: actionResult.explanation || null
    },
    client: database.getClientById(user.agencyId, clientId)
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
      client: database.getClientById(user.agencyId, clientId)
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

  const job = queue.enqueue({
    agencyId: user.agencyId,
    clientId: client.id,
    type: "generate_client",
    payload: { mode: "manual" }
  });

  res.json({
    job,
    lumixAction: {
      action: actionResult.action,
      objectCount: actionResult.objects.all.length,
      linkCount: actionResult.links.length,
      explanation: actionResult.explanation || null,
      ready: Boolean(actionResult.ready)
    }
  });
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
    lumixAction: {
      action: actionResult.action,
      objectCount: actionResult.objects.all.length,
      linkCount: actionResult.links.length,
      explanation: actionResult.explanation || null,
      ready: Boolean(actionResult.ready),
      targetCount: actionResult.targetCount || 0
    }
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
  res.redirect("/webbom");
});

app.get("/webbom", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
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
  res.redirect("/webbom");
});

app.listen(port, host, () => {
  console.log(`Autonomous Agency running on ${appUrl}`);
});
