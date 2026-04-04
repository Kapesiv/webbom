import { clearAuthenticated, markAuthenticated, redirectTo } from "./auth-state.js";

const LANGUAGE_STORAGE_KEY = "lumix-public-lang";
const searchParams = new URLSearchParams(window.location.search);
const requestedLang = searchParams.get("lang");
const currentLang = requestedLang === "fi" || requestedLang === "en"
  ? requestedLang
  : window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || "en";

const translations = {
  en: {
    pageTitle: "Create account | EasyOnlinePresence",
    backToSite: "Back to site",
    eyebrow: "Create workspace",
    title: "Open your first preview-ready studio.",
    copy: "Create an account, define the workspace, and start turning business input into a premium site direction.",
    agency: "Workspace name",
    agencyPlaceholder: "Northbound Growth",
    email: "Email",
    emailPlaceholder: "owner@example.com",
    password: "Password",
    passwordPlaceholder: "At least 8 characters",
    submit: "Create account",
    footCopy: "Already have an account?",
    footLink: "Log in",
    creating: "Creating account...",
    requestFailed: "Request failed"
  },
  fi: {
    pageTitle: "Luo tili | EasyOnlinePresence",
    backToSite: "Takaisin sivulle",
    eyebrow: "Luo workspace",
    title: "Avaa ensimmäinen preview-valmis studiosi.",
    copy: "Luo tili, määritä workspace ja ala muuttaa yritysinputtia premium-sivusuunnaksi.",
    agency: "Workspacen nimi",
    agencyPlaceholder: "Northbound Growth",
    email: "Sähköposti",
    emailPlaceholder: "owner@esimerkki.com",
    password: "Salasana",
    passwordPlaceholder: "Vähintään 8 merkkiä",
    submit: "Luo tili",
    footCopy: "Onko sinulla jo tili?",
    footLink: "Kirjaudu",
    creating: "Luodaan tiliä...",
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
  setText("register-back-link", strings.backToSite);
  setText("register-eyebrow", strings.eyebrow);
  setText("register-title", strings.title);
  setText("register-copy", strings.copy);
  setText("register-agency-label", strings.agency);
  setText("register-email-label", strings.email);
  setText("register-password-label", strings.password);
  setText("register-submit", strings.submit);
  setText("register-foot-copy", strings.footCopy);
  setText("register-foot-link", strings.footLink);
  document.getElementById("agencyName")?.setAttribute("placeholder", strings.agencyPlaceholder);
  document.getElementById("email")?.setAttribute("placeholder", strings.emailPlaceholder);
  document.getElementById("password")?.setAttribute("placeholder", strings.passwordPlaceholder);
  document.getElementById("register-foot-link")?.setAttribute("href", withLang("/login"));
  updateLangLinks();
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLang);
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

document.getElementById("register-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  await runAction(t().creating, async () => {
    await api("/api/auth/register", {
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
