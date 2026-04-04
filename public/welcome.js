import { clearAuthenticated, hasStoredAuth, markAuthenticated, redirectTo } from "./auth-state.js";

const ONBOARDING_STORAGE_KEY = "lumix-auth-onboarding-v1";
const LANGUAGE_STORAGE_KEY = "lumix-public-lang";
const searchParams = new URLSearchParams(window.location.search);
const requestedLang = searchParams.get("lang");
const currentLang = requestedLang === "fi" || requestedLang === "en"
  ? requestedLang
  : window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || "en";

const translations = {
  en: {
    pageTitle: "Welcome | EasyOnlinePresence",
    welcomeEyebrow: "Website Setup",
    welcomeTitle: "Shape the first direction before Lumix builds.",
    welcomeCopy: "Pick the closest options. Lumix uses these signals to lock the tone, hierarchy and website feel before it creates the first version.",
    welcomePill1: "5 quick choices",
    welcomePill2: "One clear direction",
    welcomePill3: "Website first",
    progressKicker: "Progress",
    progressIncomplete: "Choose the closest direction. Each answer narrows the final website feel.",
    progressComplete: "Good. Lumix now has a clearer signal for the website direction.",
    directionLabel: "Current direction",
    directionEmpty: "Choose the first signal",
    directionEmptyDescription: "Your latest selection appears here so the overall direction stays clear while you move through setup.",
    directionCustomPrefix: "Custom direction:",
    directionSelected: "Selected",
    directionUnselected: "Unselected",
    stepOf: (step, total) => `Step ${step} of ${total}`,
    stepShort: (step) => `Step ${step}`,
    otherLabel: "Tell Lumix the exact direction",
    back: "Back",
    next: "Next",
    openWorkspace: "Open workspace",
    saving: "Saving your setup...",
    requestFailed: "Request failed",
    steps: [
      {
        title: "What kind of site are we building?",
        otherPlaceholder: "Example: tattoo studio, aesthetics clinic, law firm, AI SaaS",
        options: [
          { label: "Local service", description: "Appointments, walk-ins, local trust and a clear booking path." },
          { label: "Premium studio / brand", description: "A more image-led, crafted site with a stronger aesthetic point of view." },
          { label: "Business / expert company", description: "A trust-first site for specialists, consultants or high-value services." },
          { label: "Other", description: "Write the exact niche if none of these fit." }
        ]
      },
      {
        title: "What should the site do first?",
        otherPlaceholder: "Example: sell products, get enquiries, build authority",
        options: [
          { label: "Get leads", description: "Make it easy to request a quote, enquire or start a conversation." },
          { label: "Get bookings", description: "Push visitors toward scheduling, reserving or picking a time." },
          { label: "Build trust", description: "Focus on credibility first, then move people toward action." },
          { label: "Other", description: "Write the real conversion goal if it is different." }
        ]
      },
      {
        title: "What should it feel like?",
        otherPlaceholder: "Example: darker, softer, more luxurious, more rebellious",
        options: [
          { label: "Premium and bold", description: "Sharper contrast, stronger typography and a more expensive first impression." },
          { label: "Calm and elegant", description: "A quieter, more polished and more restrained premium mood." },
          { label: "Clear and trustworthy", description: "Simple structure, credible signals and lower visual risk." },
          { label: "Other", description: "Write the exact vibe if you want something more specific." }
        ]
      },
      {
        title: "How open should it feel?",
        otherPlaceholder: "Example: discreet, intimate, exclusive, very public",
        options: [
          { label: "Public and visible", description: "More open, more promotional and more attention-grabbing." },
          { label: "Polished but restrained", description: "Professional, premium and controlled without feeling loud." },
          { label: "Private and discreet", description: "More exclusive, softer and less pushy in tone and presentation." },
          { label: "Other", description: "Write the exact public-private feel if needed." }
        ]
      },
      {
        title: "What kind of visual rhythm fits best?",
        otherPlaceholder: "Example: image-heavy, minimal black, product-like, magazine feel",
        options: [
          { label: "Minimal and clean", description: "More whitespace, fewer elements and tighter hierarchy." },
          { label: "Rich and visual", description: "More showcase energy, stronger image feel and more visual drama." },
          { label: "Structured and product-like", description: "A more precise, system-like rhythm with clearer block structure." },
          { label: "Other", description: "Write the exact visual direction if you have one." }
        ]
      }
    ]
  },
  fi: {
    pageTitle: "Tervetuloa | EasyOnlinePresence",
    welcomeEyebrow: "Sivuston aloitus",
    welcomeTitle: "Määritä ensimmäinen suunta ennen kuin Lumix rakentaa mitään.",
    welcomeCopy: "Valitse lähin vaihtoehto. Lumix käyttää näitä signaaleja sivun tunnelman, hierarkian ja yleisen suunnan lukitsemiseen ennen ensimmäistä versiota.",
    welcomePill1: "5 nopeaa valintaa",
    welcomePill2: "Yksi selkeä suunta",
    welcomePill3: "Sivusto ensin",
    progressKicker: "Eteneminen",
    progressIncomplete: "Valitse lähin suunta. Jokainen vastaus tarkentaa lopullista verkkosivun tuntua.",
    progressComplete: "Hyvä. Lumixilla on nyt selkeämpi signaali verkkosivun suunnasta.",
    directionLabel: "Nykyinen suunta",
    directionEmpty: "Valitse ensimmäinen signaali",
    directionEmptyDescription: "Viimeisin valintasi näkyy täällä, jotta kokonaisuus pysyy selkeänä koko setupin ajan.",
    directionCustomPrefix: "Oma suunta:",
    directionSelected: "Valittu",
    directionUnselected: "Ei valittu",
    stepOf: (step, total) => `Vaihe ${step}/${total}`,
    stepShort: (step) => `Vaihe ${step}`,
    otherLabel: "Kerro LumiXille tarkka suunta",
    back: "Takaisin",
    next: "Seuraava",
    openWorkspace: "Avaa workspace",
    saving: "Tallennetaan asetuksia...",
    requestFailed: "Pyyntö epäonnistui",
    steps: [
      {
        title: "Millainen sivusto rakennetaan?",
        otherPlaceholder: "Esim. tatuointistudio, estetiikkaklinikka, lakitoimisto, AI SaaS",
        options: [
          { label: "Paikallinen palvelu", description: "Ajanvaraus, walk-in-käynnit, paikallinen luottamus ja selkeä varauspolku." },
          { label: "Premium studio / brändi", description: "Visuaalisempi ja viimeistellympi sivu, jossa on vahvempi esteettinen näkökulma." },
          { label: "Yritys / asiantuntijayritys", description: "Luottamukseen nojaava sivu spesialisteille, konsulteille tai korkean arvon palveluille." },
          { label: "Muu", description: "Kirjoita tarkka niche, jos mikään näistä ei sovi." }
        ]
      },
      {
        title: "Mitä sivuston pitäisi tehdä ensin?",
        otherPlaceholder: "Esim. myydä tuotteita, kerätä yhteydenottoja, rakentaa auktoriteettia",
        options: [
          { label: "Hanki liidejä", description: "Tee tarjouspyynnöstä, yhteydenotosta tai keskustelun aloittamisesta helppoa." },
          { label: "Hanki varauksia", description: "Ohjaa kävijät ajan valintaan, varaukseen tai kalenteriin." },
          { label: "Rakenna luottamusta", description: "Aloita uskottavuudesta ja siirrä ihmiset vasta sitten toimintaan." },
          { label: "Muu", description: "Kirjoita oikea konversiotavoite, jos se on jokin muu." }
        ]
      },
      {
        title: "Miltä sen pitäisi tuntua?",
        otherPlaceholder: "Esim. tummempi, pehmeämpi, ylellisempi, kapinallisempi",
        options: [
          { label: "Premium ja rohkea", description: "Terävämpi kontrasti, vahvempi typografia ja kalliimpi ensivaikutelma." },
          { label: "Rauhallinen ja elegantti", description: "Hillitympi, viimeistellympi ja rauhallisempi premium-tunnelma." },
          { label: "Selkeä ja luotettava", description: "Yksinkertainen rakenne, uskottavat signaalit ja matalampi visuaalinen riski." },
          { label: "Muu", description: "Kirjoita tarkka tunnelma, jos haluat jotain erityisempää." }
        ]
      },
      {
        title: "Kuinka avoimelta sivuston pitäisi tuntua?",
        otherPlaceholder: "Esim. hillitty, intiimi, eksklusiivinen, hyvin julkinen",
        options: [
          { label: "Julkinen ja näkyvä", description: "Avoimempi, promompi ja huomiota herättävämpi." },
          { label: "Viimeistelty mutta hillitty", description: "Ammatillinen, premium ja hallittu ilman kovaa ääntä." },
          { label: "Yksityinen ja huomaamaton", description: "Eksklusiivisempi, pehmeämpi ja vähemmän päällekäyvä esitystapa." },
          { label: "Muu", description: "Kirjoita tarkka julkinen–yksityinen tunne tarvittaessa." }
        ]
      },
      {
        title: "Millainen visuaalinen rytmi sopii parhaiten?",
        otherPlaceholder: "Esim. kuvapitoinen, minimalistinen musta, tuotehenkinen, magazine-tyylinen",
        options: [
          { label: "Minimaalinen ja puhdas", description: "Enemmän whitespacea, vähemmän elementtejä ja tiukempi hierarkia." },
          { label: "Rikas ja visuaalinen", description: "Enemmän showcase-energiaa, vahvempi kuvatunnelma ja enemmän draamaa." },
          { label: "Rakenteinen ja product-tyylinen", description: "Tarkempi, järjestelmällisempi rytmi ja selkeämmät sisältöblokit." },
          { label: "Muu", description: "Kirjoita tarkka visuaalinen suunta, jos sinulla on sellainen." }
        ]
      }
    ]
  }
};

function t() {
  return translations[currentLang] || translations.en;
}

const steps = [
  {
    key: "businessTypeChoice",
    title: "What kind of site are we building?",
    otherKey: "businessTypeOther",
    otherPlaceholder: "Example: tattoo studio, aesthetics clinic, law firm, AI SaaS",
    options: [
      {
        value: "local_service",
        label: "Local service",
        description: "Appointments, walk-ins, local trust and a clear booking path."
      },
      {
        value: "premium_studio",
        label: "Premium studio / brand",
        description: "A more image-led, crafted site with a stronger aesthetic point of view."
      },
      {
        value: "expert_business",
        label: "Business / expert company",
        description: "A trust-first site for specialists, consultants or high-value services."
      },
      {
        value: "other",
        label: "Other",
        description: "Write the exact niche if none of these fit."
      }
    ]
  },
  {
    key: "goalChoice",
    title: "What should the site do first?",
    otherKey: "goalOther",
    otherPlaceholder: "Example: sell products, get enquiries, build authority",
    options: [
      {
        value: "leads",
        label: "Get leads",
        description: "Make it easy to request a quote, enquire or start a conversation."
      },
      {
        value: "bookings",
        label: "Get bookings",
        description: "Push visitors toward scheduling, reserving or picking a time."
      },
      {
        value: "trust",
        label: "Build trust",
        description: "Focus on credibility first, then move people toward action."
      },
      {
        value: "other",
        label: "Other",
        description: "Write the real conversion goal if it is different."
      }
    ]
  },
  {
    key: "toneChoice",
    title: "What should it feel like?",
    otherKey: "toneOther",
    otherPlaceholder: "Example: darker, softer, more luxurious, more rebellious",
    options: [
      {
        value: "premium_bold",
        label: "Premium and bold",
        description: "Sharper contrast, stronger typography and a more expensive first impression."
      },
      {
        value: "calm_elegant",
        label: "Calm and elegant",
        description: "A quieter, more polished and more restrained premium mood."
      },
      {
        value: "clear_trustworthy",
        label: "Clear and trustworthy",
        description: "Simple structure, credible signals and lower visual risk."
      },
      {
        value: "other",
        label: "Other",
        description: "Write the exact vibe if you want something more specific."
      }
    ]
  },
  {
    key: "privacyChoice",
    title: "How open should it feel?",
    otherKey: "privacyOther",
    otherPlaceholder: "Example: discreet, intimate, exclusive, very public",
    options: [
      {
        value: "public_visible",
        label: "Public and visible",
        description: "More open, more promotional and more attention-grabbing."
      },
      {
        value: "polished_restrained",
        label: "Polished but restrained",
        description: "Professional, premium and controlled without feeling loud."
      },
      {
        value: "private_discreet",
        label: "Private and discreet",
        description: "More exclusive, softer and less pushy in tone and presentation."
      },
      {
        value: "other",
        label: "Other",
        description: "Write the exact public-private feel if needed."
      }
    ]
  },
  {
    key: "visualChoice",
    title: "What kind of visual rhythm fits best?",
    otherKey: "visualOther",
    otherPlaceholder: "Example: image-heavy, minimal black, product-like, magazine feel",
    options: [
      {
        value: "minimal_clean",
        label: "Minimal and clean",
        description: "More whitespace, fewer elements and tighter hierarchy."
      },
      {
        value: "rich_visual",
        label: "Rich and visual",
        description: "More showcase energy, stronger image feel and more visual drama."
      },
      {
        value: "product_ui",
        label: "Structured and product-like",
        description: "A more precise, system-like rhythm with clearer block structure."
      },
      {
        value: "other",
        label: "Other",
        description: "Write the exact visual direction if you have one."
      }
    ]
  }
];

const state = {
  bootstrap: null,
  ...readStoredState()
};
const forceNewClient = searchParams.get("mode") === "new-client";

const stepDots = document.getElementById("step-dots");
const stepKicker = document.getElementById("step-kicker");
const stepTitle = document.getElementById("step-title");
const optionGrid = document.getElementById("option-grid");
const otherWrap = document.getElementById("other-wrap");
const otherInput = document.getElementById("other-input");
const nextButton = document.getElementById("next-button");
const backButton = document.getElementById("back-button");
const statusBanner = document.getElementById("status-banner");
const progressFraction = document.getElementById("progress-fraction");
const progressCopy = document.getElementById("progress-copy");
const selectedLabel = document.getElementById("selected-label");
const selectedDescription = document.getElementById("selected-description");
const selectedStepTag = document.getElementById("selected-step-tag");
const selectedModeTag = document.getElementById("selected-mode-tag");

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

function applyLanguageChrome() {
  const strings = t();
  document.documentElement.lang = currentLang;
  document.title = strings.pageTitle;
  setText("welcome-eyebrow", strings.welcomeEyebrow);
  setText("welcome-title", strings.welcomeTitle);
  setText("welcome-copy", strings.welcomeCopy);
  setText("welcome-pill-1", strings.welcomePill1);
  setText("welcome-pill-2", strings.welcomePill2);
  setText("welcome-pill-3", strings.welcomePill3);
  setText("progress-kicker", strings.progressKicker);
  setText("direction-card-label", strings.directionLabel);
  setText("other-label", strings.otherLabel);
  backButton.textContent = strings.back;
  nextButton.textContent = strings.next;
  updateLangLinks();
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLang);
}

if (!hasStoredAuth()) {
  redirectTo("/login");
}

function setStatus(message = "") {
  statusBanner.textContent = message;
}

function readStoredState() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(ONBOARDING_STORAGE_KEY) || "{}");
    return {
      index: Math.max(0, Math.min(steps.length - 1, Number(stored.index || 0))),
      answers: stored.answers && typeof stored.answers === "object" ? stored.answers : {}
    };
  } catch {
    return {
      index: 0,
      answers: {}
    };
  }
}

function writeStoredState() {
  window.localStorage.setItem(
    ONBOARDING_STORAGE_KEY,
    JSON.stringify({
      index: state.index,
      answers: state.answers
    })
  );
}

function clearStoredAnswers() {
  window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
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

function shouldShowOnboarding(bootstrap) {
  if (forceNewClient) return true;
  return !bootstrap.user?.onboardingCompletedAt && !(bootstrap.clients || []).length;
}

async function refreshBootstrap() {
  const bootstrap = await api("/api/bootstrap");

  if (!bootstrap.authenticated) {
    clearAuthenticated();
    redirectTo("/login");
    return null;
  }

  markAuthenticated();
  state.bootstrap = bootstrap;

  if (!shouldShowOnboarding(bootstrap)) {
    redirectTo("/dashboard");
    return null;
  }

  return bootstrap;
}

function getCurrentStep() {
  return steps[state.index];
}

function getStepAnswer(step) {
  return state.answers[step.key] || "";
}

function getOtherValue(step) {
  return state.answers[step.otherKey] || "";
}

function canContinue(step) {
  const selected = getStepAnswer(step);
  if (!selected) return false;
  if (selected !== "other") return true;
  return Boolean(getOtherValue(step).trim());
}

function renderStepDots() {
  stepDots.innerHTML = steps
    .map((_, index) => {
      const className = index === state.index ? "step-dot is-active" : index < state.index ? "step-dot is-done" : "step-dot";
      return `<span class="${className}" aria-hidden="true"></span>`;
    })
    .join("");
}

function renderOptions(step) {
  const localizedStep = t().steps[state.index];
  optionGrid.innerHTML = step.options
    .map((option, index) => {
      const localizedOption = localizedStep.options[index] || option;
      const selected = getStepAnswer(step) === option.value;
      return `
        <button type="button" class="option${selected ? " is-selected" : ""}" data-option-value="${option.value}">
          <div class="option-top">
            <span class="option-circle" aria-hidden="true"></span>
            <strong>${localizedOption.label}</strong>
          </div>
          <p>${localizedOption.description}</p>
        </button>
      `;
    })
    .join("");
}

function getSelectedOption(step) {
  return step.options.find((option) => option.value === getStepAnswer(step)) || null;
}

function renderDirectionSummary(step) {
  const selected = getSelectedOption(step);
  const otherValue = getOtherValue(step).trim();
  const hasSelection = Boolean(selected);
  const strings = t();
  const localizedStep = strings.steps[state.index];
  const selectedIndex = selected ? step.options.findIndex((option) => option.value === selected.value) : -1;
  const localizedSelected = selectedIndex >= 0 ? localizedStep.options[selectedIndex] || selected : null;

  if (progressFraction) {
    progressFraction.textContent = `${String(state.index + 1).padStart(2, "0")} / ${String(steps.length).padStart(2, "0")}`;
  }

  if (progressCopy) {
    progressCopy.textContent = hasSelection
      ? strings.progressComplete
      : strings.progressIncomplete;
  }

  if (selectedLabel) {
    selectedLabel.textContent = localizedSelected
      ? selected.value === "other" && otherValue
        ? otherValue
        : localizedSelected.label
      : strings.directionEmpty;
  }

  if (selectedDescription) {
    selectedDescription.textContent = localizedSelected
      ? selected.value === "other" && otherValue
        ? `${strings.directionCustomPrefix} ${otherValue}`
        : localizedSelected.description
      : strings.directionEmptyDescription;
  }

  if (selectedStepTag) {
    selectedStepTag.textContent = strings.stepShort(state.index + 1);
  }

  if (selectedModeTag) {
    selectedModeTag.textContent = selected ? strings.directionSelected : strings.directionUnselected;
  }
}

function renderCurrentStep() {
  const step = getCurrentStep();
  const strings = t();
  const localizedStep = strings.steps[state.index];
  stepKicker.textContent = strings.stepOf(state.index + 1, steps.length);
  stepTitle.textContent = localizedStep.title;
  renderStepDots();
  renderOptions(step);
  renderDirectionSummary(step);

  const isOther = getStepAnswer(step) === "other";
  otherWrap.classList.toggle("hidden", !isOther);
  otherInput.value = getOtherValue(step);
  otherInput.placeholder = localizedStep.otherPlaceholder;
  nextButton.disabled = !canContinue(step);
  nextButton.textContent = state.index === steps.length - 1 ? strings.openWorkspace : strings.next;
  backButton.classList.toggle("hidden", state.index === 0);
  setStatus("");
}

function saveCurrentOtherValue(value) {
  const step = getCurrentStep();
  state.answers[step.otherKey] = value;
  writeStoredState();
  nextButton.disabled = !canContinue(step);
}

async function submitOnboarding() {
  setStatus(t().saving);
  const result = await api("/api/auth/onboarding", {
    method: "POST",
    body: JSON.stringify({
      ...state.answers,
      forceNewClient
    })
  });
  clearStoredAnswers();
  const targetPath = result.client?.id ? `/dashboard?client=${result.client.id}` : "/dashboard";
  redirectTo(targetPath);
}

applyLanguageChrome();

optionGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-option-value]");
  if (!button) return;

  const step = getCurrentStep();
  state.answers[step.key] = button.dataset.optionValue;
  if (button.dataset.optionValue !== "other") {
    state.answers[step.otherKey] = "";
  }
  writeStoredState();
  renderCurrentStep();
});

otherInput.addEventListener("input", () => {
  saveCurrentOtherValue(otherInput.value);
});

backButton.addEventListener("click", () => {
  if (state.index === 0) return;
  state.index -= 1;
  writeStoredState();
  renderCurrentStep();
});

nextButton.addEventListener("click", async () => {
  const step = getCurrentStep();
  if (!canContinue(step)) return;

  if (state.index < steps.length - 1) {
    state.index += 1;
    writeStoredState();
    renderCurrentStep();
    return;
  }

  try {
    nextButton.disabled = true;
    await submitOnboarding();
  } catch (error) {
    nextButton.disabled = false;
    setStatus(getErrorMessage(error));
  }
});

refreshBootstrap()
  .then((bootstrap) => {
    if (!bootstrap) return;
    renderCurrentStep();
  })
  .catch((error) => {
    setStatus(getErrorMessage(error));
  });
