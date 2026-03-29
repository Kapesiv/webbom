function normalizeOrigin(value) {
  if (!value) return null;

  try {
    return new URL(String(value)).origin;
  } catch {
    return null;
  }
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function pruneExpiredEntries(store, now) {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function getTrustedOrigins(appUrl) {
  const configuredOrigins = [appUrl, ...(process.env.TRUSTED_ORIGINS || "").split(",")]
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);

  return new Set(configuredOrigins);
}

export function getRequestOrigin(req) {
  const originHeader = normalizeOrigin(req.headers.origin);
  if (originHeader) {
    return originHeader;
  }

  return normalizeOrigin(req.headers.referer || req.headers.referrer || "");
}

export function getClientIp(req) {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();

  return forwardedFor || req.ip || req.socket?.remoteAddress || "unknown";
}

export function isValidEmail(email) {
  const value = String(email || "").trim();
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function limitString(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

export function parseEntityId(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export function createSecurityHeadersMiddleware({ appUrl }) {
  const appOrigin = normalizeOrigin(appUrl);
  const appProtocol = appOrigin ? new URL(appOrigin).protocol : "http:";

  return function securityHeaders(req, res, next) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' data: https:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    );

    const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
    const isHttps = req.secure || forwardedProto === "https" || appProtocol === "https:";

    if (isHttps) {
      res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
    }

    next();
  };
}

export function createTrustedOriginMiddleware({ trustedOrigins }) {
  return function requireTrustedOrigin(req, res, next) {
    const requestOrigin = getRequestOrigin(req);

    if (!requestOrigin || !trustedOrigins.has(requestOrigin)) {
      return res.status(403).json({
        error: "Blocked cross-origin request."
      });
    }

    next();
  };
}

export function createRateLimitMiddleware({
  windowMs,
  max,
  keyGenerator,
  message = "Too many requests. Try again later."
}) {
  const store = new Map();

  return function rateLimit(req, res, next) {
    const now = Date.now();
    pruneExpiredEntries(store, now);

    const key = keyGenerator(req);
    const existing = store.get(key);

    if (!existing || existing.resetAt <= now) {
      store.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
      return next();
    }

    existing.count += 1;
    if (existing.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ error: message });
    }

    next();
  };
}

export function getSecurityConfig() {
  return {
    authWindowMs: parsePositiveInteger(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    authMax: parsePositiveInteger(process.env.AUTH_RATE_LIMIT_MAX, 10),
    publicTrackWindowMs: parsePositiveInteger(process.env.PUBLIC_TRACK_RATE_LIMIT_WINDOW_MS, 60 * 1000),
    publicTrackMax: parsePositiveInteger(process.env.PUBLIC_TRACK_RATE_LIMIT_MAX, 120),
    publicLeadWindowMs: parsePositiveInteger(process.env.PUBLIC_LEAD_RATE_LIMIT_WINDOW_MS, 60 * 1000),
    publicLeadMax: parsePositiveInteger(process.env.PUBLIC_LEAD_RATE_LIMIT_MAX, 8)
  };
}
