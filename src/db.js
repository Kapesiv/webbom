import fs from "fs";
import path from "path";

import { DatabaseSync } from "node:sqlite";

function nowIso() {
  return new Date().toISOString();
}

function addDays(isoString, days) {
  const date = new Date(isoString);
  date.setUTCDate(date.getUTCDate() + Number(days));
  return date.toISOString();
}

function parseJson(value, fallback = null) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function serializeJson(value) {
  return JSON.stringify(value ?? null);
}

function summarizeStrategyPayload(strategy) {
  return [strategy?.positioning, strategy?.ctaStrategy].filter(Boolean).join(" • ").slice(0, 280);
}

function mapAgency(row) {
  return row
    ? {
        id: row.id,
        name: row.name,
        createdAt: row.created_at
      }
    : null;
}

function mapUser(row) {
  return row
    ? {
        id: row.id,
        email: row.email,
        role: row.role,
        agencyId: row.agency_id,
        agencyName: row.agency_name_joined || row.agency_name,
        onboardingCompletedAt: row.onboarding_completed_at || null,
        createdAt: row.created_at
      }
    : null;
}

function mapClient(row) {
  return row
    ? {
        id: row.id,
        agencyId: row.agency_id,
        userId: row.user_id,
        businessName: row.business_name,
        description: row.description,
        customPrompt: row.custom_prompt || "",
        plan: row.plan,
        status: row.status,
        billingStatus: row.billing_status,
        scheduleEnabled: Boolean(row.schedule_enabled),
        generationIntervalDays: row.generation_interval_days,
        nextGenerationAt: row.next_generation_at,
        lastGenerationAt: row.last_generation_at,
        website: parseJson(row.website_json),
        seo: parseJson(row.seo_json),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    : null;
}

function mapBlog(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    title: row.title,
    keyword: row.keyword,
    excerpt: row.excerpt,
    html: row.html,
    position: row.position,
    createdAt: row.created_at
  };
}

function mapSubscription(row) {
  return row
    ? {
        id: row.id,
        clientId: row.client_id,
        plan: row.plan,
        status: row.status,
        stripeCheckoutSessionId: row.stripe_checkout_session_id,
        stripeCustomerId: row.stripe_customer_id,
        stripeSubscriptionId: row.stripe_subscription_id,
        currentPeriodEnd: row.current_period_end,
        checkoutUrl: row.checkout_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    : null;
}

function mapGenerationRun(row) {
  return {
    id: row.id,
    mode: row.mode,
    status: row.status,
    message: row.message,
    createdAt: row.created_at
  };
}

function mapPublishTarget(row) {
  return row
    ? {
        id: row.id,
        clientId: row.client_id,
        platform: row.platform,
        name: row.name,
        autoPublish: Boolean(row.auto_publish),
        status: row.status,
        config: parseJson(row.config_json, {}),
        lastPublishedAt: row.last_published_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    : null;
}

function mapPublishRun(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    publishTargetId: row.publish_target_id,
    status: row.status,
    message: row.message,
    payload: parseJson(row.payload_json, {}),
    createdAt: row.created_at
  };
}

function mapPublishMapping(row) {
  return row
    ? {
        id: row.id,
        publishTargetId: row.publish_target_id,
        blogPostId: row.blog_post_id,
        externalItemId: row.external_item_id,
        externalUrl: row.external_url,
        contentHash: row.content_hash,
        publishedAt: row.published_at,
        updatedAt: row.updated_at
      }
    : null;
}

function mapReportSettings(row) {
  return row
    ? {
        id: row.id,
        agencyId: row.agency_id,
        smtpHost: row.smtp_host,
        smtpPort: row.smtp_port,
        smtpSecure: Boolean(row.smtp_secure),
        smtpUser: row.smtp_user,
        smtpPass: row.smtp_pass,
        fromEmail: row.from_email,
        recipients: parseJson(row.report_recipients_json, []),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    : null;
}

function mapReportRun(row) {
  return {
    id: row.id,
    agencyId: row.agency_id,
    status: row.status,
    message: row.message,
    recipientCount: row.recipient_count,
    createdAt: row.created_at
  };
}

function mapLead(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    email: row.email,
    message: row.message,
    source: row.source,
    createdAt: row.created_at
  };
}

function mapBusinessProfile(row) {
  return row
    ? {
        id: row.id,
        clientId: row.client_id,
        businessType: row.business_type,
        offerType: row.offer_type,
        audienceType: row.audience_type,
        goalType: row.goal_type,
        toneType: row.tone_type,
        geoFocus: row.geo_focus,
        pricePosition: row.price_position,
        mainCta: row.main_cta,
        rawNotes: parseJson(row.raw_notes_json, {}),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    : null;
}

function mapIntakeAnswer(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    questionKey: row.question_key,
    answerValue: row.answer_value,
    answerLabel: row.answer_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapStrategyRecommendation(row) {
  if (!row) return null;

  const strategy = parseJson(row.strategy_json, null) || {
    version: "v1",
    status: row.status || "approved",
    positioning: row.positioning,
    primaryOffer: row.primary_offer,
    primaryAudience: row.primary_audience,
    contentAngles: parseJson(row.content_angles_json, []),
    ctaStrategy: row.cta_strategy,
    homepageStructure: parseJson(row.homepage_structure_json, [])
  };

  return {
    id: row.id,
    clientId: row.client_id,
    status: strategy.status || "approved",
    positioning: strategy.positioning || null,
    primaryOffer: strategy.primaryOffer || null,
    primaryAudience: strategy.primaryAudience || null,
    contentAngles: Array.isArray(strategy.contentAngles) ? strategy.contentAngles : [],
    ctaStrategy: strategy.ctaStrategy || null,
    homepageStructure: Array.isArray(strategy.homepageStructure) ? strategy.homepageStructure : [],
    summary: row.strategy_summary || summarizeStrategyPayload(strategy),
    strategy,
    createdAt: row.created_at,
    updatedAt: row.strategy_updated_at || row.updated_at
  };
}

function mapJob(row) {
  return row
    ? {
        id: row.id,
        agencyId: row.agency_id,
        clientId: row.client_id,
        type: row.type,
        status: row.status,
        payload: parseJson(row.payload_json, {}),
        result: parseJson(row.result_json, null),
        error: row.error_message,
        runAt: row.run_at,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        createdAt: row.created_at
      }
    : null;
}

function mapAnalyticsSummary(row = {}) {
  return {
    pageViews: row.page_views || 0,
    ctaClicks: row.cta_clicks || 0,
    leadSubmits: row.lead_submits || 0,
    uniqueVisitors: row.unique_visitors || 0
  };
}

export function createDatabase() {
  const cwd = process.cwd();
  const configuredPath = process.env.SQLITE_PATH || "./data/autonomous-agency.sqlite";
  const dbPath = path.isAbsolute(configuredPath) ? configuredPath : path.join(cwd, configuredPath);
  const isoNowSql = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);

  function get(sql, ...params) {
    return db.prepare(sql).get(...params);
  }

  function all(sql, ...params) {
    return db.prepare(sql).all(...params);
  }

  function run(sql, ...params) {
    return db.prepare(sql).run(...params);
  }

  function getColumn(tableName, columnName) {
    return all(`PRAGMA table_info(${tableName})`).find((column) => column.name === columnName) || null;
  }

  function columnExists(tableName, columnName) {
    return Boolean(getColumn(tableName, columnName));
  }

  function normalizeSqlDefault(value) {
    return String(value || "")
      .replaceAll('"', "'")
      .replace(/\s+/g, "")
      .toLowerCase();
  }

  function ensureStrategyRecommendationTimestampDefaults() {
    const createdAtColumn = getColumn("strategy_recommendations", "created_at");
    const updatedAtColumn = getColumn("strategy_recommendations", "updated_at");
    const expectedDefault = normalizeSqlDefault(`(${isoNowSql})`);

    if (
      normalizeSqlDefault(createdAtColumn?.dflt_value) === expectedDefault &&
      normalizeSqlDefault(updatedAtColumn?.dflt_value) === expectedDefault
    ) {
      return;
    }

    const stamp = nowIso();
    const stampSql = `'${stamp}'`;

    db.exec("BEGIN");

    try {
      db.exec(`
        CREATE TABLE strategy_recommendations_v2 (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id INTEGER NOT NULL UNIQUE,
          status TEXT NOT NULL DEFAULT 'approved',
          strategy_json TEXT,
          strategy_summary TEXT,
          strategy_updated_at TEXT,
          positioning TEXT,
          primary_offer TEXT,
          primary_audience TEXT,
          content_angles_json TEXT,
          cta_strategy TEXT,
          homepage_structure_json TEXT,
          created_at TEXT NOT NULL DEFAULT (${isoNowSql}),
          updated_at TEXT NOT NULL DEFAULT (${isoNowSql}),
          FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
        );

        INSERT INTO strategy_recommendations_v2 (
          id,
          client_id,
          status,
          strategy_json,
          strategy_summary,
          strategy_updated_at,
          positioning,
          primary_offer,
          primary_audience,
          content_angles_json,
          cta_strategy,
          homepage_structure_json,
          created_at,
          updated_at
        )
        SELECT
          id,
          client_id,
          COALESCE(status, 'approved'),
          strategy_json,
          strategy_summary,
          strategy_updated_at,
          positioning,
          primary_offer,
          primary_audience,
          content_angles_json,
          cta_strategy,
          homepage_structure_json,
          COALESCE(created_at, ${stampSql}),
          COALESCE(updated_at, strategy_updated_at, created_at, ${stampSql})
        FROM strategy_recommendations;

        DROP TABLE strategy_recommendations;
        ALTER TABLE strategy_recommendations_v2 RENAME TO strategy_recommendations;
      `);

      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS agencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      agency_name TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      business_name TEXT NOT NULL,
      description TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'starter',
      status TEXT NOT NULL DEFAULT 'active',
      billing_status TEXT NOT NULL DEFAULT 'demo',
      schedule_enabled INTEGER NOT NULL DEFAULT 1,
      generation_interval_days INTEGER NOT NULL DEFAULT 30,
      next_generation_at TEXT,
      last_generation_at TEXT,
      website_json TEXT,
      seo_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS blog_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      keyword TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      html TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL UNIQUE,
      plan TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      stripe_checkout_session_id TEXT UNIQUE,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT UNIQUE,
      current_period_end TEXT,
      checkout_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS generation_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      mode TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS publish_targets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      name TEXT NOT NULL,
      auto_publish INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      config_json TEXT NOT NULL,
      last_published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS publish_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      publish_target_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      payload_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (publish_target_id) REFERENCES publish_targets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS report_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agency_id INTEGER NOT NULL UNIQUE,
      smtp_host TEXT,
      smtp_port INTEGER,
      smtp_secure INTEGER NOT NULL DEFAULT 0,
      smtp_user TEXT,
      smtp_pass TEXT,
      from_email TEXT,
      report_recipients_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS report_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agency_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      recipient_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS publish_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      publish_target_id INTEGER NOT NULL,
      blog_post_id INTEGER NOT NULL,
      external_item_id TEXT NOT NULL,
      external_url TEXT,
      content_hash TEXT NOT NULL,
      published_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (publish_target_id, blog_post_id),
      FOREIGN KEY (publish_target_id) REFERENCES publish_targets(id) ON DELETE CASCADE,
      FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      session_id TEXT,
      event_type TEXT NOT NULL,
      referrer TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      name TEXT,
      email TEXT,
      message TEXT,
      source TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agency_id INTEGER NOT NULL,
      client_id INTEGER,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      payload_json TEXT,
      result_json TEXT,
      error_message TEXT,
      run_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS business_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL UNIQUE,
      business_type TEXT,
      offer_type TEXT,
      audience_type TEXT,
      goal_type TEXT,
      tone_type TEXT,
      geo_focus TEXT,
      price_position TEXT,
      main_cta TEXT,
      raw_notes_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS intake_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS intake_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      question_key TEXT NOT NULL,
      answer_value TEXT,
      answer_label TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (session_id, question_key),
      FOREIGN KEY (session_id) REFERENCES intake_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS strategy_recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'approved',
      strategy_json TEXT,
      strategy_summary TEXT,
      strategy_updated_at TEXT,
      positioning TEXT,
      primary_offer TEXT,
      primary_audience TEXT,
      content_angles_json TEXT,
      cta_strategy TEXT,
      homepage_structure_json TEXT,
      created_at TEXT NOT NULL DEFAULT (${isoNowSql}),
      updated_at TEXT NOT NULL DEFAULT (${isoNowSql}),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );
  `);

  if (!columnExists("users", "agency_id")) db.exec("ALTER TABLE users ADD COLUMN agency_id INTEGER");
  if (!columnExists("users", "role")) db.exec("ALTER TABLE users ADD COLUMN role TEXT");
  if (!columnExists("users", "onboarding_completed_at")) {
    db.exec("ALTER TABLE users ADD COLUMN onboarding_completed_at TEXT");
  }
  if (!columnExists("clients", "agency_id")) db.exec("ALTER TABLE clients ADD COLUMN agency_id INTEGER");
  if (!columnExists("clients", "custom_prompt")) db.exec("ALTER TABLE clients ADD COLUMN custom_prompt TEXT");
  if (!columnExists("strategy_recommendations", "status")) {
    db.exec("ALTER TABLE strategy_recommendations ADD COLUMN status TEXT");
  }
  if (!columnExists("strategy_recommendations", "strategy_json")) {
    db.exec("ALTER TABLE strategy_recommendations ADD COLUMN strategy_json TEXT");
  }
  if (!columnExists("strategy_recommendations", "strategy_summary")) {
    db.exec("ALTER TABLE strategy_recommendations ADD COLUMN strategy_summary TEXT");
  }
  if (!columnExists("strategy_recommendations", "strategy_updated_at")) {
    db.exec("ALTER TABLE strategy_recommendations ADD COLUMN strategy_updated_at TEXT");
  }

  ensureStrategyRecommendationTimestampDefaults();

  run(
    `
      UPDATE strategy_recommendations
      SET status = 'approved'
      WHERE status IS NULL
         OR status = ''
    `
  );

  all(`SELECT * FROM strategy_recommendations WHERE strategy_json IS NULL OR strategy_json = ''`).forEach((row) => {
    const legacyStrategy = {
      version: "v1",
      status: row.status || "approved",
      positioning: row.positioning || null,
      primaryOffer: row.primary_offer || null,
      primaryAudience: row.primary_audience || null,
      contentAngles: parseJson(row.content_angles_json, []),
      ctaStrategy: row.cta_strategy || null,
      homepageStructure: parseJson(row.homepage_structure_json, [])
    };
    const strategyUpdatedAt = row.updated_at || row.created_at || nowIso();

    run(
      `
        UPDATE strategy_recommendations
        SET strategy_json = ?,
            strategy_summary = ?,
            strategy_updated_at = ?
        WHERE client_id = ?
      `,
      serializeJson(legacyStrategy),
      summarizeStrategyPayload(legacyStrategy),
      strategyUpdatedAt,
      row.client_id
    );
  });

  run(
    `
      UPDATE users
      SET role = 'owner'
      WHERE role IS NULL
         OR role = ''
    `
  );

  const unmigratedUsers = all(
    `
      SELECT id, agency_name
      FROM users
      WHERE agency_id IS NULL
      ORDER BY id ASC
    `
  );

  unmigratedUsers.forEach((user) => {
    const agencyName = String(user.agency_name || "Autonomous Agency").trim() || "Autonomous Agency";
    const agencyInsert = run(
      `
        INSERT INTO agencies (name, created_at)
        VALUES (?, ?)
      `,
      agencyName,
      nowIso()
    );

    run(
      `
        UPDATE users
        SET agency_id = ?,
            role = COALESCE(NULLIF(role, ''), 'owner')
        WHERE id = ?
      `,
      agencyInsert.lastInsertRowid,
      user.id
    );
  });

  run(
    `
      UPDATE clients
      SET agency_id = (
        SELECT users.agency_id
        FROM users
        WHERE users.id = clients.user_id
      )
      WHERE agency_id IS NULL
    `
  );

  function countUsers() {
    return get("SELECT COUNT(*) AS count FROM users").count;
  }

  function getAgencyById(agencyId) {
    return mapAgency(get(`SELECT * FROM agencies WHERE id = ?`, agencyId));
  }

  function createAgency(name) {
    const result = run(`INSERT INTO agencies (name, created_at) VALUES (?, ?)`, name, nowIso());
    return getAgencyById(result.lastInsertRowid);
  }

  function getUserRecordByEmail(email) {
    return get(
      `
        SELECT users.*, agencies.name AS agency_name_joined
        FROM users
        LEFT JOIN agencies ON agencies.id = users.agency_id
        WHERE users.email = ?
      `,
      email
    );
  }

  function findUserByEmail(email) {
    return mapUser(getUserRecordByEmail(email));
  }

  function getUserRecordById(userId) {
    return get(
      `
        SELECT users.*, agencies.name AS agency_name_joined
        FROM users
        LEFT JOIN agencies ON agencies.id = users.agency_id
        WHERE users.id = ?
      `,
      userId
    );
  }

  function findUserById(userId) {
    return mapUser(getUserRecordById(userId));
  }

  function createOwnerUser({ email, passwordHash, agencyName }) {
    const agency = createAgency(agencyName);
    const result = run(
      `
        INSERT INTO users (email, password_hash, agency_name, agency_id, role, created_at)
        VALUES (?, ?, ?, ?, 'owner', ?)
      `,
      email,
      passwordHash,
      agency.name,
      agency.id,
      nowIso()
    );
    return findUserById(result.lastInsertRowid);
  }

  function createAgencyMember({ agencyId, email, passwordHash, role }) {
    const agency = getAgencyById(agencyId);
    const result = run(
      `
        INSERT INTO users (email, password_hash, agency_name, agency_id, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      email,
      passwordHash,
      agency?.name || "Autonomous Agency",
      agencyId,
      role,
      nowIso()
    );
    return findUserById(result.lastInsertRowid);
  }

  function listAgencyMembers(agencyId) {
    return all(
      `
        SELECT users.*, agencies.name AS agency_name_joined
        FROM users
        LEFT JOIN agencies ON agencies.id = users.agency_id
        WHERE users.agency_id = ?
        ORDER BY users.created_at ASC, users.id ASC
      `,
      agencyId
    ).map(mapUser);
  }

  function updateAgencyMemberRole(agencyId, userId, role) {
    run(`UPDATE users SET role = ? WHERE id = ? AND agency_id = ?`, role, userId, agencyId);
    return findUserById(userId);
  }

  function markUserOnboardingComplete(userId) {
    const stamp = nowIso();
    run(`UPDATE users SET onboarding_completed_at = ? WHERE id = ?`, stamp, userId);
    return findUserById(userId);
  }

  function createSession({ userId, tokenHash, expiresAt }) {
    run(
      `
        INSERT INTO sessions (user_id, token_hash, expires_at, created_at)
        VALUES (?, ?, ?, ?)
      `,
      userId,
      tokenHash,
      expiresAt,
      nowIso()
    );
  }

  function deleteSessionByTokenHash(tokenHash) {
    run(`DELETE FROM sessions WHERE token_hash = ?`, tokenHash);
  }

  function cleanupExpiredSessions() {
    run(`DELETE FROM sessions WHERE expires_at <= ?`, nowIso());
  }

  function findUserBySessionTokenHash(tokenHash) {
    cleanupExpiredSessions();
    return mapUser(
      get(
        `
          SELECT users.*, agencies.name AS agency_name_joined
          FROM sessions
          JOIN users ON users.id = sessions.user_id
          LEFT JOIN agencies ON agencies.id = users.agency_id
          WHERE sessions.token_hash = ?
            AND sessions.expires_at > ?
        `,
        tokenHash,
        nowIso()
      )
    );
  }

  function getBlogsForClient(clientId) {
    return all(
      `
        SELECT *
        FROM blog_posts
        WHERE client_id = ?
        ORDER BY position ASC, id ASC
      `,
      clientId
    ).map(mapBlog);
  }

  function getGenerationHistory(clientId, limit = 8) {
    return all(
      `
        SELECT *
        FROM generation_runs
        WHERE client_id = ?
        ORDER BY id DESC
        LIMIT ?
      `,
      clientId,
      limit
    ).map(mapGenerationRun);
  }

  function listPublishTargetsForClient(clientId) {
    return all(
      `
        SELECT *
        FROM publish_targets
        WHERE client_id = ?
        ORDER BY id ASC
      `,
      clientId
    ).map(mapPublishTarget);
  }

  function listPublishRunsForClient(clientId, limit = 8) {
    return all(
      `
        SELECT *
        FROM publish_runs
        WHERE client_id = ?
        ORDER BY id DESC
        LIMIT ?
      `,
      clientId,
      limit
    ).map(mapPublishRun);
  }

  function getPublishMappingsForTarget(targetId) {
    return all(
      `
        SELECT *
        FROM publish_mappings
        WHERE publish_target_id = ?
      `,
      targetId
    ).map(mapPublishMapping);
  }

  function getPublishMapping(targetId, blogPostId) {
    return mapPublishMapping(
      get(
        `
          SELECT *
          FROM publish_mappings
          WHERE publish_target_id = ?
            AND blog_post_id = ?
        `,
        targetId,
        blogPostId
      )
    );
  }

  function upsertPublishMapping(targetId, blogPostId, mapping) {
    const existing = getPublishMapping(targetId, blogPostId);
    const stamp = nowIso();

    if (existing) {
      run(
        `
          UPDATE publish_mappings
          SET external_item_id = ?,
              external_url = ?,
              content_hash = ?,
              published_at = ?,
              updated_at = ?
          WHERE publish_target_id = ?
            AND blog_post_id = ?
        `,
        mapping.externalItemId,
        mapping.externalUrl || null,
        mapping.contentHash,
        stamp,
        stamp,
        targetId,
        blogPostId
      );
    } else {
      run(
        `
          INSERT INTO publish_mappings (
            publish_target_id,
            blog_post_id,
            external_item_id,
            external_url,
            content_hash,
            published_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        targetId,
        blogPostId,
        mapping.externalItemId,
        mapping.externalUrl || null,
        mapping.contentHash,
        stamp,
        stamp
      );
    }

    return getPublishMapping(targetId, blogPostId);
  }

  function getAnalyticsSummaryForClient(clientId) {
    return mapAnalyticsSummary(
      get(
        `
          SELECT
            COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views,
            COUNT(*) FILTER (WHERE event_type = 'cta_click') AS cta_clicks,
            COUNT(*) FILTER (WHERE event_type = 'lead_submit') AS lead_submits,
            COUNT(DISTINCT COALESCE(session_id, '')) AS unique_visitors
          FROM analytics_events
          WHERE client_id = ?
        `,
        clientId
      )
    );
  }

  function listRecentLeadsForClient(clientId, limit = 8) {
    return all(
      `
        SELECT *
        FROM leads
        WHERE client_id = ?
        ORDER BY id DESC
        LIMIT ?
      `,
      clientId,
      limit
    ).map(mapLead);
  }

  function getBusinessProfile(clientId) {
    return mapBusinessProfile(get(`SELECT * FROM business_profiles WHERE client_id = ?`, clientId));
  }

  function upsertBusinessProfile(clientId, input = {}) {
    const existing = get(`SELECT * FROM business_profiles WHERE client_id = ?`, clientId);
    const stamp = nowIso();
    const payload = {
      businessType: input.businessType || null,
      offerType: input.offerType || null,
      audienceType: input.audienceType || null,
      goalType: input.goalType || null,
      toneType: input.toneType || null,
      geoFocus: input.geoFocus || null,
      pricePosition: input.pricePosition || null,
      mainCta: input.mainCta || null,
      rawNotes: input.rawNotes || {}
    };

    if (existing) {
      run(
        `
          UPDATE business_profiles
          SET business_type = ?,
              offer_type = ?,
              audience_type = ?,
              goal_type = ?,
              tone_type = ?,
              geo_focus = ?,
              price_position = ?,
              main_cta = ?,
              raw_notes_json = ?,
              updated_at = ?
          WHERE client_id = ?
        `,
        payload.businessType,
        payload.offerType,
        payload.audienceType,
        payload.goalType,
        payload.toneType,
        payload.geoFocus,
        payload.pricePosition,
        payload.mainCta,
        serializeJson(payload.rawNotes),
        stamp,
        clientId
      );
    } else {
      run(
        `
          INSERT INTO business_profiles (
            client_id, business_type, offer_type, audience_type, goal_type, tone_type,
            geo_focus, price_position, main_cta, raw_notes_json, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        clientId,
        payload.businessType,
        payload.offerType,
        payload.audienceType,
        payload.goalType,
        payload.toneType,
        payload.geoFocus,
        payload.pricePosition,
        payload.mainCta,
        serializeJson(payload.rawNotes),
        stamp,
        stamp
      );
    }

    return getBusinessProfile(clientId);
  }

  function getLatestIntakeSession(clientId) {
    return get(
      `
        SELECT *
        FROM intake_sessions
        WHERE client_id = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      clientId
    );
  }

  function ensureIntakeSession(clientId) {
    const existing = getLatestIntakeSession(clientId);
    const stamp = nowIso();

    if (existing) {
      run(`UPDATE intake_sessions SET updated_at = ? WHERE id = ?`, stamp, existing.id);
      return getLatestIntakeSession(clientId);
    }

    const result = run(
      `
        INSERT INTO intake_sessions (client_id, status, completed_at, created_at, updated_at)
        VALUES (?, 'active', NULL, ?, ?)
      `,
      clientId,
      stamp,
      stamp
    );

    return get(`SELECT * FROM intake_sessions WHERE id = ?`, result.lastInsertRowid);
  }

  function listIntakeAnswersForClient(clientId) {
    const session = getLatestIntakeSession(clientId);
    if (!session) return [];

    return all(
      `
        SELECT *
        FROM intake_answers
        WHERE session_id = ?
        ORDER BY question_key ASC
      `,
      session.id
    ).map(mapIntakeAnswer);
  }

  function saveIntakeAnswers(clientId, answers = []) {
    const session = ensureIntakeSession(clientId);
    const stamp = nowIso();

    answers.forEach((answer) => {
      const existing = get(
        `
          SELECT *
          FROM intake_answers
          WHERE session_id = ?
            AND question_key = ?
        `,
        session.id,
        answer.questionKey
      );

      if (existing) {
        run(
          `
            UPDATE intake_answers
            SET answer_value = ?,
                answer_label = ?,
                updated_at = ?
            WHERE id = ?
          `,
          answer.answerValue || null,
          answer.answerLabel || null,
          stamp,
          existing.id
        );
      } else {
        run(
          `
            INSERT INTO intake_answers (
              session_id, question_key, answer_value, answer_label, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          session.id,
          answer.questionKey,
          answer.answerValue || null,
          answer.answerLabel || null,
          stamp,
          stamp
        );
      }
    });

    run(
      `
        UPDATE intake_sessions
        SET status = 'completed',
            completed_at = ?,
            updated_at = ?
        WHERE id = ?
      `,
      stamp,
      stamp,
      session.id
    );

    return listIntakeAnswersForClient(clientId);
  }

  function getStrategyRecommendation(clientId) {
    return mapStrategyRecommendation(get(`SELECT * FROM strategy_recommendations WHERE client_id = ?`, clientId));
  }

  function saveClientStrategy(clientId, strategy = {}) {
    const existing = get(`SELECT * FROM strategy_recommendations WHERE client_id = ?`, clientId);
    const stamp = nowIso();
    const status = strategy.status || "approved";
    const summary = strategy.summary || summarizeStrategyPayload(strategy);
    const strategyJson = serializeJson(strategy);

    if (existing) {
      run(
        `
          UPDATE strategy_recommendations
          SET status = ?,
              strategy_json = ?,
              strategy_summary = ?,
              strategy_updated_at = ?,
              positioning = NULL,
              primary_offer = NULL,
              primary_audience = NULL,
              content_angles_json = NULL,
              cta_strategy = NULL,
              homepage_structure_json = NULL,
              updated_at = ?
          WHERE client_id = ?
        `,
        status,
        strategyJson,
        summary,
        stamp,
        stamp,
        clientId
      );
    } else {
      run(
        `
          INSERT INTO strategy_recommendations (
            client_id, status, strategy_json, strategy_summary, strategy_updated_at,
            positioning, primary_offer, primary_audience, content_angles_json,
            cta_strategy, homepage_structure_json, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)
        `,
        clientId,
        status,
        strategyJson,
        summary,
        stamp,
        stamp,
        stamp
      );
    }

    return getStrategyRecommendation(clientId);
  }

  function upsertStrategyRecommendation(clientId, input = {}) {
    return saveClientStrategy(clientId, {
      version: "v1",
      status: input.status || "approved",
      positioning: input.positioning || null,
      primaryOffer: input.primaryOffer || null,
      primaryAudience: input.primaryAudience || null,
      contentAngles: input.contentAngles || [],
      ctaStrategy: input.ctaStrategy || null,
      homepageStructure: input.homepageStructure || []
    });
  }

  function hydrateClient(row) {
    const client = mapClient(row);
    if (!client) return null;

    client.blogs = getBlogsForClient(client.id);
    client.subscription = mapSubscription(get(`SELECT * FROM subscriptions WHERE client_id = ?`, client.id));
    client.generationHistory = getGenerationHistory(client.id);
    client.publishTargets = listPublishTargetsForClient(client.id);
    client.publishHistory = listPublishRunsForClient(client.id);
    client.analytics = getAnalyticsSummaryForClient(client.id);
    client.leads = listRecentLeadsForClient(client.id);
    client.businessProfile = getBusinessProfile(client.id);
    client.intakeAnswers = listIntakeAnswersForClient(client.id);
    client.strategyRecommendation = getStrategyRecommendation(client.id);
    return client;
  }

  function createClient(agencyId, userId, input) {
    const createdAt = nowIso();
    const generationIntervalDays = Math.max(1, Number(input.generationIntervalDays || 30));
    const scheduleEnabled = input.scheduleEnabled === false ? 0 : 1;
    const nextGenerationAt = scheduleEnabled ? createdAt : null;

    const result = run(
      `
        INSERT INTO clients (
          agency_id,
          user_id,
          business_name,
          description,
          custom_prompt,
          plan,
          status,
          billing_status,
          schedule_enabled,
          generation_interval_days,
          next_generation_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'active', 'demo', ?, ?, ?, ?, ?)
      `,
      agencyId,
      userId,
      input.businessName,
      input.description,
      input.customPrompt || "",
      input.plan || "starter",
      scheduleEnabled,
      generationIntervalDays,
      nextGenerationAt,
      createdAt,
      createdAt
    );

    return getClientById(agencyId, result.lastInsertRowid);
  }

  function getClientRecordById(agencyId, clientId) {
    return get(`SELECT * FROM clients WHERE id = ? AND agency_id = ?`, clientId, agencyId);
  }

  function getClientRecordByAnyId(clientId) {
    return get(`SELECT * FROM clients WHERE id = ?`, clientId);
  }

  function getClientById(agencyId, clientId) {
    return hydrateClient(getClientRecordById(agencyId, clientId));
  }

  function listClientsForAgency(agencyId) {
    return all(
      `
        SELECT *
        FROM clients
        WHERE agency_id = ?
        ORDER BY updated_at DESC, id DESC
      `,
      agencyId
    ).map(hydrateClient);
  }

  function getDashboardMetrics(agencyId) {
    const totalClients = get(`SELECT COUNT(*) AS count FROM clients WHERE agency_id = ?`, agencyId).count;
    const scheduledClients = get(
      `SELECT COUNT(*) AS count FROM clients WHERE agency_id = ? AND schedule_enabled = 1`,
      agencyId
    ).count;
    const paidClients = get(
      `SELECT COUNT(*) AS count FROM clients WHERE agency_id = ? AND billing_status IN ('active', 'trialing')`,
      agencyId
    ).count;
    const generatedClients = get(
      `SELECT COUNT(*) AS count FROM clients WHERE agency_id = ? AND last_generation_at IS NOT NULL`,
      agencyId
    ).count;
    const teamMembers = get(`SELECT COUNT(*) AS count FROM users WHERE agency_id = ?`, agencyId).count;
    const totalLeads = get(
      `
        SELECT COUNT(*) AS count
        FROM leads
        JOIN clients ON clients.id = leads.client_id
        WHERE clients.agency_id = ?
      `,
      agencyId
    ).count;

    return {
      totalClients,
      scheduledClients,
      paidClients,
      generatedClients,
      teamMembers,
      totalLeads
    };
  }

  function updateClient(agencyId, clientId, updates) {
    const existing = getClientRecordById(agencyId, clientId);
    if (!existing) return null;

    const updatedAt = nowIso();
    const generationIntervalDays =
      updates.generationIntervalDays !== undefined
        ? Math.max(1, Number(updates.generationIntervalDays))
        : existing.generation_interval_days;
    const scheduleEnabled =
      typeof updates.scheduleEnabled === "boolean"
        ? Number(updates.scheduleEnabled)
        : existing.schedule_enabled;

    let nextGenerationAt = existing.next_generation_at;
    if (scheduleEnabled) {
      const anchor = existing.last_generation_at || updatedAt;
      nextGenerationAt = addDays(anchor, generationIntervalDays);
    } else {
      nextGenerationAt = null;
    }

    run(
      `
        UPDATE clients
        SET business_name = ?,
            description = ?,
            custom_prompt = ?,
            plan = ?,
            status = ?,
            billing_status = ?,
            schedule_enabled = ?,
            generation_interval_days = ?,
            next_generation_at = ?,
            updated_at = ?
        WHERE id = ?
          AND agency_id = ?
      `,
      updates.businessName ?? existing.business_name,
      updates.description ?? existing.description,
      updates.customPrompt ?? existing.custom_prompt ?? "",
      updates.plan ?? existing.plan,
      updates.status ?? existing.status,
      updates.billingStatus ?? existing.billing_status,
      scheduleEnabled,
      generationIntervalDays,
      nextGenerationAt,
      updatedAt,
      clientId,
      agencyId
    );

    return getClientById(agencyId, clientId);
  }

  function recordGenerationRun(clientId, { mode, status, message = null }) {
    run(
      `INSERT INTO generation_runs (client_id, mode, status, message, created_at) VALUES (?, ?, ?, ?, ?)`,
      clientId,
      mode,
      status,
      message,
      nowIso()
    );
  }

  function saveGeneratedContent(clientId, pack, mode) {
    const row = getClientRecordByAnyId(clientId);
    if (!row) throw new Error("Client not found.");

    const generatedAt = nowIso();
    const nextGenerationAt = row.schedule_enabled ? addDays(generatedAt, row.generation_interval_days) : null;

    run(
      `
        UPDATE clients
        SET website_json = ?,
            seo_json = ?,
            last_generation_at = ?,
            next_generation_at = ?,
            updated_at = ?
        WHERE id = ?
      `,
      serializeJson(pack.website),
      serializeJson(pack.seo),
      generatedAt,
      nextGenerationAt,
      generatedAt,
      clientId
    );

    run(`DELETE FROM blog_posts WHERE client_id = ?`, clientId);

    pack.blogs.forEach((blog, index) => {
      run(
        `
          INSERT INTO blog_posts (client_id, title, keyword, excerpt, html, position, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        clientId,
        blog.title,
        blog.keyword,
        blog.excerpt,
        blog.html,
        index,
        generatedAt
      );
    });

    recordGenerationRun(clientId, {
      mode,
      status: "success",
      message: pack.notice || null
    });
  }

  function listDueClients(limit = 10) {
    return all(
      `
        SELECT *
        FROM clients
        WHERE schedule_enabled = 1
          AND status = 'active'
          AND next_generation_at IS NOT NULL
          AND next_generation_at <= ?
        ORDER BY next_generation_at ASC
        LIMIT ?
      `,
      nowIso(),
      limit
    );
  }

  function upsertSubscriptionForCheckout(clientId, details) {
    const existing = get(`SELECT * FROM subscriptions WHERE client_id = ?`, clientId);
    const stamp = nowIso();

    if (existing) {
      run(
        `
          UPDATE subscriptions
          SET plan = ?,
              status = ?,
              stripe_checkout_session_id = ?,
              stripe_customer_id = ?,
              stripe_subscription_id = COALESCE(?, stripe_subscription_id),
              current_period_end = COALESCE(?, current_period_end),
              checkout_url = ?,
              updated_at = ?
          WHERE client_id = ?
        `,
        details.plan || existing.plan,
        details.status || existing.status,
        details.stripeCheckoutSessionId || existing.stripe_checkout_session_id,
        details.stripeCustomerId || existing.stripe_customer_id,
        details.stripeSubscriptionId || null,
        details.currentPeriodEnd || null,
        details.checkoutUrl || existing.checkout_url,
        stamp,
        clientId
      );
    } else {
      run(
        `
          INSERT INTO subscriptions (
            client_id, plan, status, stripe_checkout_session_id, stripe_customer_id,
            stripe_subscription_id, current_period_end, checkout_url, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        clientId,
        details.plan || "starter",
        details.status || "pending",
        details.stripeCheckoutSessionId || null,
        details.stripeCustomerId || null,
        details.stripeSubscriptionId || null,
        details.currentPeriodEnd || null,
        details.checkoutUrl || null,
        stamp,
        stamp
      );
    }
  }

  function updateBillingStatus(clientId, billingStatus) {
    run(`UPDATE clients SET billing_status = ?, updated_at = ? WHERE id = ?`, billingStatus, nowIso(), clientId);
  }

  function getSubscriptionForClient(clientId) {
    return mapSubscription(get(`SELECT * FROM subscriptions WHERE client_id = ?`, clientId));
  }

  function updateSubscriptionByCheckoutSession(checkoutSessionId, details) {
    const existing = get(
      `SELECT * FROM subscriptions WHERE stripe_checkout_session_id = ?`,
      checkoutSessionId
    );
    if (!existing) return null;

    run(
      `
        UPDATE subscriptions
        SET status = ?,
            stripe_customer_id = COALESCE(?, stripe_customer_id),
            stripe_subscription_id = COALESCE(?, stripe_subscription_id),
            current_period_end = COALESCE(?, current_period_end),
            updated_at = ?
        WHERE stripe_checkout_session_id = ?
      `,
      details.status || existing.status,
      details.stripeCustomerId || null,
      details.stripeSubscriptionId || null,
      details.currentPeriodEnd || null,
      nowIso(),
      checkoutSessionId
    );

    return mapSubscription(get(`SELECT * FROM subscriptions WHERE stripe_checkout_session_id = ?`, checkoutSessionId));
  }

  function updateSubscriptionByStripeSubscription(stripeSubscriptionId, details) {
    const existing = get(`SELECT * FROM subscriptions WHERE stripe_subscription_id = ?`, stripeSubscriptionId);
    if (!existing) return null;

    run(
      `
        UPDATE subscriptions
        SET status = ?,
            current_period_end = COALESCE(?, current_period_end),
            updated_at = ?
        WHERE stripe_subscription_id = ?
      `,
      details.status || existing.status,
      details.currentPeriodEnd || null,
      nowIso(),
      stripeSubscriptionId
    );

    return mapSubscription(get(`SELECT * FROM subscriptions WHERE stripe_subscription_id = ?`, stripeSubscriptionId));
  }

  function createPublishTarget(agencyId, clientId, input) {
    const client = getClientRecordById(agencyId, clientId);
    if (!client) return null;

    const stamp = nowIso();
    const result = run(
      `
        INSERT INTO publish_targets (
          client_id, platform, name, auto_publish, status, config_json, last_published_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
      `,
      clientId,
      input.platform,
      input.name,
      input.autoPublish ? 1 : 0,
      input.status || "active",
      serializeJson(input.config || {}),
      stamp,
      stamp
    );

    return mapPublishTarget(get(`SELECT * FROM publish_targets WHERE id = ?`, result.lastInsertRowid));
  }

  function updatePublishTarget(agencyId, clientId, targetId, updates) {
    const client = getClientRecordById(agencyId, clientId);
    if (!client) return null;

    const existing = get(`SELECT * FROM publish_targets WHERE id = ? AND client_id = ?`, targetId, clientId);
    if (!existing) return null;

    run(
      `
        UPDATE publish_targets
        SET platform = ?,
            name = ?,
            auto_publish = ?,
            status = ?,
            config_json = ?,
            updated_at = ?
        WHERE id = ?
          AND client_id = ?
      `,
      updates.platform ?? existing.platform,
      updates.name ?? existing.name,
      typeof updates.autoPublish === "boolean" ? Number(updates.autoPublish) : existing.auto_publish,
      updates.status ?? existing.status,
      updates.config ? serializeJson(updates.config) : existing.config_json,
      nowIso(),
      targetId,
      clientId
    );

    return mapPublishTarget(get(`SELECT * FROM publish_targets WHERE id = ?`, targetId));
  }

  function getPublishTarget(agencyId, clientId, targetId) {
    const client = getClientRecordById(agencyId, clientId);
    if (!client) return null;
    return mapPublishTarget(get(`SELECT * FROM publish_targets WHERE id = ? AND client_id = ?`, targetId, clientId));
  }

  function listAutoPublishTargets(clientId) {
    return all(
      `
        SELECT *
        FROM publish_targets
        WHERE client_id = ?
          AND auto_publish = 1
          AND status = 'active'
        ORDER BY id ASC
      `,
      clientId
    ).map(mapPublishTarget);
  }

  function recordPublishRun(clientId, publishTargetId, { status, message = null, payload = null }) {
    run(
      `
        INSERT INTO publish_runs (client_id, publish_target_id, status, message, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      clientId,
      publishTargetId,
      status,
      message,
      serializeJson(payload),
      nowIso()
    );

    if (status === "success") {
      const stamp = nowIso();
      run(
        `
          UPDATE publish_targets
          SET last_published_at = ?,
              updated_at = ?
          WHERE id = ?
        `,
        stamp,
        stamp,
        publishTargetId
      );
    }
  }

  function getReportSettings(agencyId) {
    return mapReportSettings(get(`SELECT * FROM report_settings WHERE agency_id = ?`, agencyId));
  }

  function upsertReportSettings(agencyId, input) {
    const existing = getReportSettings(agencyId);
    const stamp = nowIso();
    const recipients = Array.isArray(input.recipients) ? input.recipients : existing?.recipients || [];

    if (existing) {
      run(
        `
          UPDATE report_settings
          SET smtp_host = ?,
              smtp_port = ?,
              smtp_secure = ?,
              smtp_user = ?,
              smtp_pass = ?,
              from_email = ?,
              report_recipients_json = ?,
              updated_at = ?
          WHERE agency_id = ?
        `,
        input.smtpHost ?? existing.smtpHost,
        input.smtpPort ?? existing.smtpPort,
        typeof input.smtpSecure === "boolean" ? Number(input.smtpSecure) : Number(existing.smtpSecure),
        input.smtpUser ?? existing.smtpUser,
        input.smtpPass ?? existing.smtpPass,
        input.fromEmail ?? existing.fromEmail,
        serializeJson(recipients),
        stamp,
        agencyId
      );
    } else {
      run(
        `
          INSERT INTO report_settings (
            agency_id, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass,
            from_email, report_recipients_json, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        agencyId,
        input.smtpHost || "",
        input.smtpPort || 587,
        input.smtpSecure ? 1 : 0,
        input.smtpUser || "",
        input.smtpPass || "",
        input.fromEmail || "",
        serializeJson(recipients),
        stamp,
        stamp
      );
    }

    return getReportSettings(agencyId);
  }

  function recordReportRun(agencyId, { status, message = null, recipientCount = 0 }) {
    run(
      `
        INSERT INTO report_runs (agency_id, status, message, recipient_count, created_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      agencyId,
      status,
      message,
      recipientCount,
      nowIso()
    );
  }

  function listReportRuns(agencyId, limit = 8) {
    return all(
      `
        SELECT *
        FROM report_runs
        WHERE agency_id = ?
        ORDER BY id DESC
        LIMIT ?
      `,
      agencyId,
      limit
    ).map(mapReportRun);
  }

  function recordAnalyticsEvent(clientId, input) {
    run(
      `
        INSERT INTO analytics_events (client_id, session_id, event_type, referrer, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      clientId,
      input.sessionId || null,
      input.eventType,
      input.referrer || null,
      serializeJson(input.metadata || {}),
      nowIso()
    );
  }

  function createLead(clientId, input) {
    const stamp = nowIso();
    const result = run(
      `
        INSERT INTO leads (client_id, name, email, message, source, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      clientId,
      input.name || null,
      input.email || null,
      input.message || null,
      input.source || "public_page",
      stamp
    );
    return mapLead(get(`SELECT * FROM leads WHERE id = ?`, result.lastInsertRowid));
  }

  function enqueueJob({ agencyId, clientId = null, type, payload = {}, runAt = null }) {
    const stamp = nowIso();
    const result = run(
      `
        INSERT INTO jobs (
          agency_id, client_id, type, status, payload_json, result_json, error_message,
          run_at, started_at, completed_at, created_at
        )
        VALUES (?, ?, ?, 'queued', ?, NULL, NULL, ?, NULL, NULL, ?)
      `,
      agencyId,
      clientId,
      type,
      serializeJson(payload),
      runAt || stamp,
      stamp
    );
    return mapJob(get(`SELECT * FROM jobs WHERE id = ?`, result.lastInsertRowid));
  }

  function getJob(jobId, agencyId = null) {
    const row = agencyId
      ? get(`SELECT * FROM jobs WHERE id = ? AND agency_id = ?`, jobId, agencyId)
      : get(`SELECT * FROM jobs WHERE id = ?`, jobId);
    return mapJob(row);
  }

  function listJobsForAgency(agencyId, limit = 20) {
    return all(
      `
        SELECT *
        FROM jobs
        WHERE agency_id = ?
        ORDER BY id DESC
        LIMIT ?
      `,
      agencyId,
      limit
    ).map(mapJob);
  }

  function fetchQueuedJobs(limit = 5) {
    return all(
      `
        SELECT *
        FROM jobs
        WHERE status = 'queued'
          AND run_at <= ?
        ORDER BY run_at ASC, id ASC
        LIMIT ?
      `,
      nowIso(),
      limit
    ).map(mapJob);
  }

  function markJobRunning(jobId) {
    const stamp = nowIso();
    run(
      `
        UPDATE jobs
        SET status = 'running',
            started_at = ?,
            error_message = NULL
        WHERE id = ?
          AND status = 'queued'
      `,
      stamp,
      jobId
    );
    return getJob(jobId);
  }

  function markJobCompleted(jobId, result) {
    run(
      `
        UPDATE jobs
        SET status = 'completed',
            result_json = ?,
            completed_at = ?
        WHERE id = ?
      `,
      serializeJson(result),
      nowIso(),
      jobId
    );
    return getJob(jobId);
  }

  function markJobFailed(jobId, errorMessage) {
    run(
      `
        UPDATE jobs
        SET status = 'failed',
            error_message = ?,
            completed_at = ?
        WHERE id = ?
      `,
      errorMessage,
      nowIso(),
      jobId
    );
    return getJob(jobId);
  }

  function countPendingJobs(agencyId) {
    return get(
      `
        SELECT COUNT(*) AS count
        FROM jobs
        WHERE agency_id = ?
          AND status IN ('queued', 'running')
      `,
      agencyId
    ).count;
  }

  function getAgencySnapshot(agencyId) {
    return {
      agency: getAgencyById(agencyId),
      summary: {
        ...getDashboardMetrics(agencyId),
        pendingJobs: countPendingJobs(agencyId)
      },
      members: listAgencyMembers(agencyId),
      clients: listClientsForAgency(agencyId),
      reportSettings: getReportSettings(agencyId),
      reportHistory: listReportRuns(agencyId),
      jobs: listJobsForAgency(agencyId)
    };
  }

  return {
    dbPath,
    countUsers,
    createOwnerUser,
    createAgencyMember,
    getAgencyById,
    getAgencySnapshot,
    getUserRecordByEmail,
    findUserByEmail,
    findUserById,
    markUserOnboardingComplete,
    listAgencyMembers,
    updateAgencyMemberRole,
    createSession,
    deleteSessionByTokenHash,
    findUserBySessionTokenHash,
    createClient,
    getClientById,
    getClientRecordById,
    getClientRecordByAnyId,
    listClientsForAgency,
    getDashboardMetrics,
    updateClient,
    recordGenerationRun,
    saveGeneratedContent,
    listDueClients,
    getSubscriptionForClient,
    upsertSubscriptionForCheckout,
    updateSubscriptionByCheckoutSession,
    updateSubscriptionByStripeSubscription,
    updateBillingStatus,
    createPublishTarget,
    updatePublishTarget,
    getPublishTarget,
    listAutoPublishTargets,
    recordPublishRun,
    getPublishMappingsForTarget,
    getPublishMapping,
    upsertPublishMapping,
    getReportSettings,
    upsertReportSettings,
    recordReportRun,
    listReportRuns,
    recordAnalyticsEvent,
    createLead,
    getAnalyticsSummaryForClient,
    listRecentLeadsForClient,
    getBusinessProfile,
    upsertBusinessProfile,
    listIntakeAnswersForClient,
    saveIntakeAnswers,
    getStrategyRecommendation,
    saveClientStrategy,
    upsertStrategyRecommendation,
    enqueueJob,
    getJob,
    listJobsForAgency,
    fetchQueuedJobs,
    markJobRunning,
    markJobCompleted,
    markJobFailed
  };
}
