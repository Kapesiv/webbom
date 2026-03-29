import crypto from "crypto";

const SESSION_COOKIE_NAME = "autonomous_agency_session";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf("=");
        const key = separatorIndex >= 0 ? part.slice(0, separatorIndex) : part;
        const value = separatorIndex >= 0 ? part.slice(separatorIndex + 1) : "";
        return [key, decodeURIComponent(value)];
      })
  );
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    agencyId: user.agencyId,
    agencyName: user.agencyName,
    createdAt: user.createdAt
  };
}

export function createAuthService(database) {
  const sessionTtlDays = Math.max(1, Number(process.env.SESSION_TTL_DAYS || 30));
  const sessionMaxAgeSeconds = sessionTtlDays * 24 * 60 * 60;

  function buildSessionCookie(token) {
    const attributes = [
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${sessionMaxAgeSeconds}`
    ];

    if (process.env.NODE_ENV === "production") {
      attributes.push("Secure");
    }

    return attributes.join("; ");
  }

  function buildClearSessionCookie() {
    return [
      `${SESSION_COOKIE_NAME}=`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=0"
    ].join("; ");
  }

  function createSessionForUser(userId) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds * 1000).toISOString();

    database.createSession({
      userId,
      tokenHash,
      expiresAt
    });

    return {
      token,
      expiresAt
    };
  }

  function register({ email, password, agencyName }) {
    const normalizedEmail = normalizeEmail(email);
    const trimmedAgencyName = String(agencyName || "").trim();

    if (!normalizedEmail.includes("@")) {
      throw new Error("Enter a valid email address.");
    }

    if (String(password || "").length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    if (database.getUserRecordByEmail(normalizedEmail)) {
      throw new Error("User already exists.");
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = `${salt}:${hashPassword(password, salt)}`;

    const user = database.createOwnerUser({
      email: normalizedEmail,
      passwordHash,
      agencyName: trimmedAgencyName || "Autonomous Agency"
    });

    const session = createSessionForUser(user.id);

    return {
      user: sanitizeUser(user),
      session
    };
  }

  function createAgencyMember({ agencyId, email, password, role }) {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail.includes("@")) {
      throw new Error("Enter a valid email address.");
    }

    if (String(password || "").length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    if (!["admin", "member"].includes(role)) {
      throw new Error("Role must be admin or member.");
    }

    if (database.getUserRecordByEmail(normalizedEmail)) {
      throw new Error("User already exists.");
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = `${salt}:${hashPassword(password, salt)}`;

    return sanitizeUser(
      database.createAgencyMember({
        agencyId,
        email: normalizedEmail,
        passwordHash,
        role
      })
    );
  }

  function login({ email, password }) {
    const normalizedEmail = normalizeEmail(email);
    const record = database.getUserRecordByEmail(normalizedEmail);

    if (!record) {
      throw new Error("Invalid email or password.");
    }

    const [salt, storedHash] = String(record.password_hash || "").split(":");

    if (!storedHash) {
      throw new Error("Invalid email or password.");
    }

    const derivedHash = hashPassword(password, salt);
    const passwordMatches = crypto.timingSafeEqual(
      Buffer.from(storedHash, "hex"),
      Buffer.from(derivedHash, "hex")
    );

    if (!passwordMatches) {
      throw new Error("Invalid email or password.");
    }

    const session = createSessionForUser(record.id);

    return {
      user: sanitizeUser(database.findUserById(record.id)),
      session
    };
  }

  function getUserFromRequest(req) {
    const cookies = parseCookies(req.headers.cookie || "");
    const token = cookies[SESSION_COOKIE_NAME];

    if (!token) {
      return null;
    }

    return database.findUserBySessionTokenHash(hashToken(token));
  }

  function logout(req) {
    const cookies = parseCookies(req.headers.cookie || "");
    const token = cookies[SESSION_COOKIE_NAME];

    if (!token) {
      return;
    }

    database.deleteSessionByTokenHash(hashToken(token));
  }

  return {
    buildSessionCookie,
    buildClearSessionCookie,
    createAgencyMember,
    getUserFromRequest,
    login,
    logout,
    register
  };
}
