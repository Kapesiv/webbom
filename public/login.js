import { clearAuthenticated, hasStoredAuth, markAuthenticated, redirectTo } from "./auth-state.js";

const LANGUAGE_STORAGE_KEY = "lumix-public-lang";
const searchParams = new URLSearchParams(window.location.search);
const requestedLang = searchParams.get("lang");
const currentLang = requestedLang === "fi" || requestedLang === "en"
  ? requestedLang
  : window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || "en";

const translations = {
  en: {
    pageTitle: "Log in | EasyOnlinePresence",
    backToSite: "Back to site",
    eyebrow: "Workspace access",
    title: "Step back into the studio.",
    copy: "Open your website previews, content direction, and SEO workflow from one place.",
    email: "Email",
    emailPlaceholder: "you@example.com",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    rowCopy: "Secure workspace login",
    forgot: "Forgot password?",
    submit: "Continue to dashboard",
    footCopy: "New here?",
    footLink: "Create an account",
    loggingIn: "Logging in...",
    requestFailed: "Request failed"
  },
  fi: {
    pageTitle: "Kirjaudu | EasyOnlinePresence",
    backToSite: "Takaisin sivulle",
    eyebrow: "Workspace access",
    title: "Palaa takaisin studioon.",
    copy: "Avaa verkkosivujen previewt, sisältösuunta ja SEO-workflow yhdestä paikasta.",
    email: "Sähköposti",
    emailPlaceholder: "sinä@esimerkki.com",
    password: "Salasana",
    passwordPlaceholder: "Syötä salasanasi",
    rowCopy: "Suojattu workspace-kirjautuminen",
    forgot: "Unohtuiko salasana?",
    submit: "Jatka dashboardiin",
    footCopy: "Uusi täällä?",
    footLink: "Luo tili",
    loggingIn: "Kirjaudutaan sisään...",
    requestFailed: "Pyyntö epäonnistui"
  }
};

function t() {
  return translations[currentLang] || translations.en;
}

function withLang(path) {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("lang", currentLang);
  return `${url.pathname}${url.search}${url.hash}`;
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = value;
}

function updateLangLinks() {
  document.querySelectorAll("[data-lang-button]").forEach((node) => {
    const buttonLang = node.dataset.langButton;
    const url = new URL(window.location.href);
    url.searchParams.set("lang", buttonLang);
    node.href = `${url.pathname}${url.search}${url.hash}`;
    node.classList.toggle("is-active", buttonLang === currentLang);
  });
}

function applyLanguage() {
  const strings = t();
  document.documentElement.lang = currentLang;
  document.title = strings.pageTitle;
  setText("login-back-link", strings.backToSite);
  setText("login-eyebrow", strings.eyebrow);
  setText("login-title", strings.title);
  setText("login-copy", strings.copy);
  setText("login-email-label", strings.email);
  setText("login-password-label", strings.password);
  setText("login-row-copy", strings.rowCopy);
  setText("login-forgot-link", strings.forgot);
  setText("login-submit", strings.submit);
  setText("login-foot-copy", strings.footCopy);
  setText("login-foot-link", strings.footLink);
  document.getElementById("email")?.setAttribute("placeholder", strings.emailPlaceholder);
  document.getElementById("password")?.setAttribute("placeholder", strings.passwordPlaceholder);
  document.getElementById("login-foot-link")?.setAttribute("href", withLang("/register"));
  updateLangLinks();
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLang);
}

if (hasStoredAuth() && window.location.pathname === "/login") {
  redirectTo(withLang("/dashboard"));
}

const statusBanner = document.getElementById("status-banner");

function getPostAuthPath(bootstrap) {
  const needsOnboarding = !bootstrap.user?.onboardingCompletedAt && !(bootstrap.clients || []).length;
  return needsOnboarding ? withLang("/welcome") : withLang("/dashboard");
}

function setStatus(message) {
  statusBanner.textContent = message;
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : t().requestFailed;
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
  if (!response.ok) throw new Error(data.error || t().requestFailed);
  return data;
}

function readForm(formElement) {
  return Object.fromEntries(new FormData(formElement).entries());
}

async function runAction(pendingMessage, action) {
  setStatus(pendingMessage);

  try {
    await action();
  } catch (error) {
    setStatus(getErrorMessage(error));
  }
}

async function refresh() {
  const bootstrap = await api("/api/bootstrap");

  if (bootstrap.authenticated) {
    markAuthenticated();
    redirectTo(getPostAuthPath(bootstrap));
    return;
  }

  clearAuthenticated();
  setStatus("");
}

document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  await runAction(t().loggingIn, async () => {
    await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(readForm(form))
    });
    const bootstrap = await api("/api/bootstrap");
    markAuthenticated();
    form.reset();
    redirectTo(getPostAuthPath(bootstrap));
  });
});

applyLanguage();

refresh().catch((error) => {
  setStatus(getErrorMessage(error));
});
