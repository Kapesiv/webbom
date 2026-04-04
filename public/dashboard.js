import { clearAuthenticated, hasStoredAuth, redirectTo } from "./auth-state.js";

const WORKFLOW_STORAGE_KEY = "lumix-guided-workflow-v1";
const LANGUAGE_STORAGE_KEY = "lumix-public-lang";
const searchParams = new URLSearchParams(window.location.search);
const requestedLang = searchParams.get("lang");
const currentLang = requestedLang === "fi" || requestedLang === "en"
  ? requestedLang
  : window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || "en";
const STEP_ORDER = ["client", "strategy", "generate", "preview", "publish"];

const DASHBOARD_TRANSLATIONS = {
  en: {
    pageTitle: "Lumix Workflow",
    stepLabels: {
      client: "Client",
      strategy: "Strategy",
      generate: "Generate",
      preview: "Preview",
      publish: "Publish"
    },
    shell: {
      kicker: "Guided workflow",
      workspaceFallback: "Lumix Workspace",
      newWebsite: "New website",
      client: "Client",
      logout: "Log out",
      newClient: "New client"
    },
    messages: {
      requestFailed: "Request failed",
      loadingWorkspace: "Loading workspace...",
      loadingWorkspaceFailed: "Loading workspace failed.",
      savingBrief: "Saving your business brief...",
      businessSaved: "Business brief saved and strategy created.",
      savingStrategy: "Saving strategy...",
      strategySaved: "Strategy saved. Moving into content generation.",
      connectingPublish: "Connecting publish channel...",
      publishConnected: "Publish channel connected.",
      publishing: "Publishing your site...",
      siteLive: "Your site is live.",
      contentGenerated: "Content pack generated.",
      describeBusiness: "Please describe your business before continuing.",
      savingBriefFailed: "Saving the business brief failed.",
      savingStrategyFailed: "Saving strategy failed.",
      connectingPublishFailed: "Connecting publish channel failed.",
      generatingContentFailed: "Generating content failed.",
      publishingFailed: "Publishing failed."
    },
    friendlyErrors: {
      strategyBlocked: "Lumix could not build a complete strategy yet. Add a slightly clearer business description and continue again.",
      recommendationBlocked: "Lumix needs a clearer business brief before it can create your strategy.",
      generateBlocked: "Approve the strategy first, then generate the content pack.",
      formattingIssue: "Lumix hit a formatting issue while generating the content pack. Please run generation again.",
      publishBlocked: "Approve the preview and connect a publish channel before publishing."
    },
    business: {
      stepTag: "Step 1",
      activeClient: "Active client:",
      title: "Tell us about your business",
      copy: "Describe what you do, who you help, and what you want to grow.",
      placeholder: "Describe your business in one sentence...",
      continue: "Continue"
    },
    strategy: {
      stepTag: "Step 2",
      title: "Review your strategy",
      loadingCopy: "Generating a strategy from the saved business brief.",
      copy: "Lumix turned your brief into a positioning, offer, audience, CTA, and homepage direction.",
      positioning: "Positioning",
      offer: "Offer",
      audience: "Audience",
      cta: "CTA",
      homepageStructure: "Homepage structure",
      notGenerated: "Not generated yet",
      save: "Save strategy",
      cancel: "Cancel",
      accept: "Accept strategy",
      edit: "Edit strategy"
    },
    generate: {
      messages: [
        "Analyzing brief...",
        "Building strategy...",
        "Generating page...",
        "Writing blog drafts...",
        "Optimizing SEO..."
      ],
      stepTag: "Step 3",
      title: "Generate your content pack",
      loadingCopy: "Lumix is creating your landing page, blog pack, and SEO package.",
      copy: "Create everything in one run, then move directly into review.",
      landingTitle: "Landing page",
      landingCopy: "A customer-facing website draft with clear CTA structure.",
      blogTitle: "Blog pack",
      blogCopy: "Supporting content drafts built from the same strategic direction.",
      seoTitle: "SEO package",
      seoCopy: "Metadata, keywords, and search support aligned with the page.",
      action: "Generate content"
    },
    preview: {
      stepTag: "Step 4",
      title: "Review your generated package",
      copy: "Check one view at a time before you move into publishing.",
      tabs: {
        landing: "Website",
        blogs: "Blog",
        seo: "SEO"
      },
      approve: "Approve preview",
      back: "Go back",
      noBlogsTitle: "No blog drafts yet",
      noBlogsCopy: "Generate content to create supporting articles for the website.",
      primaryTopic: "Primary topic",
      blogExcerptFallback: "A supporting article preview for this website.",
      metaTitle: "Meta title",
      metaDescription: "Meta description",
      keywords: "Keywords",
      noSeoTitle: "No SEO title yet",
      noSeoDescription: "No SEO description yet",
      noKeywords: "No keywords yet"
    },
    publish: {
      stepTag: "Step 5",
      liveTitle: "Your site is live",
      liveCopy: "The publish flow completed and the site can now be reviewed at the live destination.",
      publishTitle: "Publish your site",
      publishCopy: "Keep this step lightweight. Connect one channel if needed, then publish when ready.",
      readyState: "Ready to publish",
      missingState: "Publish channel missing",
      readyStrong: "Your content pack is ready for launch.",
      missingStrong: "Connect one publish channel to unlock go live.",
      missingCopy: "A single connected channel is enough to move forward.",
      publishNow: "Publish now",
      connectChannel: "Connect publish channel",
      saveChannel: "Save channel",
      platform: "Platform",
      channelName: "Channel name",
      baseUrl: "Base URL",
      username: "Username",
      applicationPassword: "Application password",
      siteUrl: "Site URL",
      collectionId: "Collection ID",
      apiToken: "API token",
      wordpress: "WordPress",
      webflow: "Webflow",
      primarySite: "Primary site"
    },
    site: {
      defaultName: "Northline Studio",
      defaultHeadline: "helps clients move with confidence",
      defaultSubheadline: "We help clients turn interest into conversations with a clear offer, a trustworthy website, and a strong call to action.",
      offerAudience: "for",
      offerAudienceSuffix: "delivered with a clear process and practical guidance.",
      offerOnlySuffix: "built around clear communication, reliable delivery, and a simple next step for new enquiries.",
      requestConsultation: "Request a consultation",
      defaultAudience: "growing businesses",
      defaultOffer: "specialist business services",
      planningTitle: "Project planning and guidance",
      planningBody: "Clear recommendations, practical next steps, and a delivery plan that keeps the work moving.",
      supportPrefix: "Support for",
      supportBody: "Messaging, structure, and service presentation shaped for the people most likely to enquire.",
      aboutFallback: "provides",
      aboutFor: "for",
      aboutBody: "with a focus on clear communication, dependable delivery, and a smooth customer experience from the first enquiry onward.",
      testimonialQuote: "We needed a clearer way to explain our service and make it easy for the right clients to get in touch. The new site finally does that.",
      testimonialName: "Recent client",
      testimonialRoleSuffix: "project",
      process1Title: "Initial discussion",
      process1Body: "We start by understanding your goals, offer, and what matters most to your customers.",
      process2Title: "Clear proposal",
      process2Body: "You receive a practical plan covering the scope, timeline, and the best next move for the project.",
      process3Title: "Delivery and follow-through",
      process3BodyPrefix: "when you are ready, and we take the work forward with clear communication and steady progress.",
      navServices: "Services",
      navAbout: "About",
      navProcess: "Process",
      navContact: "Contact",
      kickerTrusted: "Trusted business website",
      seeServices: "See services",
      infoWhatWeDo: "What we do",
      infoBestFit: "Best fit for",
      infoNextStep: "Next step",
      servicesKicker: "Services",
      servicesTitle: "What clients come to us for",
      aboutKicker: "About",
      aboutTitle: "Clear work, grounded communication, reliable delivery.",
      seoFallbackTitleSuffix: "Professional service partner",
      testimonialKicker: "Client feedback",
      testimonialTitle: "What clients say after launch",
      processKicker: "Process",
      processTitle: "How the work moves forward",
      contactKicker: "Get in touch",
      contactTitle: "Ready to discuss your project?",
      contactCopy: "Tell us what you need and we will come back with a clear next step."
    }
  },
  fi: {
    pageTitle: "Lumix Workflow",
    stepLabels: {
      client: "Asiakas",
      strategy: "Strategia",
      generate: "Generoi",
      preview: "Preview",
      publish: "Julkaise"
    },
    shell: {
      kicker: "Ohjattu workflow",
      workspaceFallback: "Lumix Workspace",
      newWebsite: "Uusi sivu",
      client: "Asiakas",
      logout: "Kirjaudu ulos",
      newClient: "Uusi asiakas"
    },
    messages: {
      requestFailed: "Pyyntö epäonnistui",
      loadingWorkspace: "Ladataan workspacea...",
      loadingWorkspaceFailed: "Workspace lataus epäonnistui.",
      savingBrief: "Tallennetaan yritysbriefiä...",
      businessSaved: "Yritysbriefi tallennettu ja strategia luotu.",
      savingStrategy: "Tallennetaan strategiaa...",
      strategySaved: "Strategia tallennettu. Siirrytään sisällön generointiin.",
      connectingPublish: "Yhdistetään julkaisukanavaa...",
      publishConnected: "Julkaisukanava yhdistetty.",
      publishing: "Julkaistaan sivustoa...",
      siteLive: "Sivustosi on nyt live.",
      contentGenerated: "Sisältöpaketti generoitu.",
      describeBusiness: "Kuvaile yrityksesi ennen jatkamista.",
      savingBriefFailed: "Yritysbriefin tallennus epäonnistui.",
      savingStrategyFailed: "Strategian tallennus epäonnistui.",
      connectingPublishFailed: "Julkaisukanavan yhdistäminen epäonnistui.",
      generatingContentFailed: "Sisällön generointi epäonnistui.",
      publishingFailed: "Julkaisu epäonnistui."
    },
    friendlyErrors: {
      strategyBlocked: "Lumix ei voinut vielä rakentaa täydellistä strategiaa. Lisää hieman selkeämpi yrityskuvaus ja jatka uudelleen.",
      recommendationBlocked: "Lumix tarvitsee selkeämmän yritysbriefin ennen strategian luomista.",
      generateBlocked: "Hyväksy strategia ensin, sitten generoi sisältöpaketti.",
      formattingIssue: "Lumix törmäsi muotoiluongelmaan sisältöpakettia generoitaessa. Aja generointi uudelleen.",
      publishBlocked: "Hyväksy preview ja yhdistä julkaisukanava ennen julkaisua."
    },
    business: {
      stepTag: "Vaihe 1",
      activeClient: "Aktiivinen asiakas:",
      title: "Kerro yrityksestäsi",
      copy: "Kuvaile mitä teet, ketä autat ja mitä haluat kasvattaa.",
      placeholder: "Kuvaile yrityksesi yhdellä lauseella...",
      continue: "Jatka"
    },
    strategy: {
      stepTag: "Vaihe 2",
      title: "Tarkista strategiasi",
      loadingCopy: "Luodaan strategiaa tallennetun yritysbriefin pohjalta.",
      copy: "Lumix muutti briefisi positioinniksi, tarjoukseksi, yleisöksi, CTA:ksi ja etusivun suunnaksi.",
      positioning: "Positiointi",
      offer: "Tarjous",
      audience: "Yleisö",
      cta: "CTA",
      homepageStructure: "Etusivun rakenne",
      notGenerated: "Ei vielä generoitu",
      save: "Tallenna strategia",
      cancel: "Peruuta",
      accept: "Hyväksy strategia",
      edit: "Muokkaa strategiaa"
    },
    generate: {
      messages: [
        "Analysoidaan briefiä...",
        "Rakennetaan strategiaa...",
        "Generoidaan sivua...",
        "Kirjoitetaan blogiluonnoksia...",
        "Optimoidaan SEO:ta..."
      ],
      stepTag: "Vaihe 3",
      title: "Generoi sisältöpaketti",
      loadingCopy: "Lumix luo etusivua, blogipakettia ja SEO-pakettia.",
      copy: "Luo kaikki yhdellä ajolla ja siirry suoraan tarkistukseen.",
      landingTitle: "Etusivu",
      landingCopy: "Asiakaslähtöinen verkkosivuluonnos selkeällä CTA-rakenteella.",
      blogTitle: "Blogipaketti",
      blogCopy: "Tukevat sisältöluonnokset saman strategisen suunnan pohjalta.",
      seoTitle: "SEO-paketti",
      seoCopy: "Metadata, avainsanat ja hakutuki linjassa sivun kanssa.",
      action: "Generoi sisältö"
    },
    preview: {
      stepTag: "Vaihe 4",
      title: "Tarkista generoitu paketti",
      copy: "Katso yksi näkymä kerrallaan ennen kuin siirryt julkaisuun.",
      tabs: {
        landing: "Website",
        blogs: "Blogi",
        seo: "SEO"
      },
      approve: "Hyväksy preview",
      back: "Takaisin",
      noBlogsTitle: "Ei vielä blogiluonnoksia",
      noBlogsCopy: "Generoi sisältö, jotta sivulle syntyy tukevat artikkelit.",
      primaryTopic: "Pääaihe",
      blogExcerptFallback: "Tätä sivua tukeva artikkeliesikatselu.",
      metaTitle: "Metaotsikko",
      metaDescription: "Metakuvaus",
      keywords: "Avainsanat",
      noSeoTitle: "Ei vielä SEO-otsikkoa",
      noSeoDescription: "Ei vielä SEO-kuvausta",
      noKeywords: "Ei vielä avainsanoja"
    },
    publish: {
      stepTag: "Vaihe 5",
      liveTitle: "Sivustosi on live",
      liveCopy: "Julkaisupolku valmistui ja sivustoa voi nyt tarkastella oikeassa kohteessa.",
      publishTitle: "Julkaise sivustosi",
      publishCopy: "Pidä tämä vaihe kevyenä. Yhdistä yksi kanava tarvittaessa ja julkaise kun olet valmis.",
      readyState: "Valmis julkaistavaksi",
      missingState: "Julkaisukanava puuttuu",
      readyStrong: "Sisältöpaketti on valmis julkaisuun.",
      missingStrong: "Yhdistä yksi julkaisukanava avataksesi go live -vaiheen.",
      missingCopy: "Yksi yhdistetty kanava riittää etenemiseen.",
      publishNow: "Julkaise nyt",
      connectChannel: "Yhdistä julkaisukanava",
      saveChannel: "Tallenna kanava",
      platform: "Alusta",
      channelName: "Kanavan nimi",
      baseUrl: "Perus-URL",
      username: "Käyttäjänimi",
      applicationPassword: "Application password",
      siteUrl: "Sivuston URL",
      collectionId: "Collection ID",
      apiToken: "API token",
      wordpress: "WordPress",
      webflow: "Webflow",
      primarySite: "Pääsivu"
    },
    site: {
      defaultName: "Northline Studio",
      defaultHeadline: "auttaa asiakkaita etenemään varmemmin",
      defaultSubheadline: "Autamme muuttamaan kiinnostuksen keskusteluiksi selkeän tarjouksen, luotettavan verkkosivun ja vahvan CTA:n avulla.",
      offerAudience: "kohteelle",
      offerAudienceSuffix: "selkeällä prosessilla ja käytännöllisellä ohjauksella.",
      offerOnlySuffix: "selkeän viestinnän, luotettavan toimituksen ja yksinkertaisen seuraavan askeleen ympärille.",
      requestConsultation: "Pyydä konsultaatio",
      defaultAudience: "kasvaville yrityksille",
      defaultOffer: "asiantuntijapalveluita",
      planningTitle: "Projektin suunnittelu ja ohjaus",
      planningBody: "Selkeät suositukset, käytännölliset seuraavat askeleet ja toteutussuunnitelma, joka pitää työn liikkeessä.",
      supportPrefix: "Tuki kohteelle",
      supportBody: "Viestit, rakenne ja palvelun esitys muotoiltu ihmisille, jotka todennäköisimmin ottavat yhteyttä.",
      aboutFallback: "tarjoaa",
      aboutFor: "kohteelle",
      aboutBody: "keskittyen selkeään viestintään, luotettavaan toimitukseen ja sujuvaan asiakaskokemukseen ensimmäisestä yhteydenotosta alkaen.",
      testimonialQuote: "Tarvitsimme selkeämmän tavan kertoa palvelustamme ja tehdä oikeille asiakkaille yhteydenotosta helppoa. Uusi sivu tekee sen vihdoin.",
      testimonialName: "Asiakasprojekti",
      testimonialRoleSuffix: "projekti",
      process1Title: "Aloituskeskustelu",
      process1Body: "Aloitamme ymmärtämällä tavoitteesi, tarjouksesi ja sen mikä merkitsee eniten asiakkaillesi.",
      process2Title: "Selkeä ehdotus",
      process2Body: "Saat käytännöllisen suunnitelman, joka kattaa laajuuden, aikataulun ja projektin parhaan seuraavan askeleen.",
      process3Title: "Toimitus ja jatko",
      process3BodyPrefix: "kun olet valmis, ja viemme työn eteenpäin selkeällä viestinnällä ja tasaisella etenemisellä.",
      navServices: "Palvelut",
      navAbout: "Meistä",
      navProcess: "Prosessi",
      navContact: "Yhteys",
      kickerTrusted: "Luotettava yrityssivusto",
      seeServices: "Katso palvelut",
      infoWhatWeDo: "Mitä teemme",
      infoBestFit: "Paras kohde",
      infoNextStep: "Seuraava askel",
      servicesKicker: "Palvelut",
      servicesTitle: "Mitä asiakkaat tulevat hakemaan",
      aboutKicker: "Meistä",
      aboutTitle: "Selkeä työ, maanläheinen viestintä, luotettava toimitus.",
      seoFallbackTitleSuffix: "Ammatillinen palvelukumppani",
      testimonialKicker: "Asiakaspalaute",
      testimonialTitle: "Mitä asiakkaat sanovat julkaisun jälkeen",
      processKicker: "Prosessi",
      processTitle: "Miten työ etenee",
      contactKicker: "Ota yhteyttä",
      contactTitle: "Valmis keskustelemaan projektistasi?",
      contactCopy: "Kerro mitä tarvitset, niin palaamme sinulle selkeän seuraavan askeleen kanssa."
    }
  }
};

function dt() {
  return DASHBOARD_TRANSLATIONS[currentLang] || DASHBOARD_TRANSLATIONS.en;
}

function withLang(path) {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("lang", currentLang);
  return `${url.pathname}${url.search}${url.hash}`;
}

const state = {
  bootstrap: null,
  activeClientId: null,
  storage: readStorage(),
  loadingGenerate: null,
  loadingTimer: null
};

const stepList = document.getElementById("guided-step-list");
const mainView = document.getElementById("guided-main");
const statusBanner = document.getElementById("guided-status");
const clientSwitcher = document.getElementById("guided-client-switcher");
const workspaceName = document.getElementById("guided-workspace-name");
const logoutButton = document.getElementById("guided-logout");
const newWebsiteButton = document.getElementById("guided-new-website");

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
  const strings = dt();
  document.documentElement.lang = currentLang;
  document.title = strings.pageTitle;
  setText("guided-kicker", strings.shell.kicker);
  setText("guided-new-website", strings.shell.newWebsite);
  setText("guided-client-label", strings.shell.client);
  setText("guided-logout", strings.shell.logout);
  updateLangLinks();
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLang);
}

if (!hasStoredAuth()) {
  redirectTo(withLang("/login"));
}

function readStorage() {
  try {
    const value = JSON.parse(localStorage.getItem(WORKFLOW_STORAGE_KEY) || "{}");
    return {
      activeClientId: value.activeClientId ?? null,
      draftBrief: String(value.draftBrief || ""),
      clients: value.clients && typeof value.clients === "object" ? value.clients : {}
    };
  } catch {
    return {
      activeClientId: null,
      draftBrief: "",
      clients: {}
    };
  }
}

function writeStorage() {
  localStorage.setItem(
    WORKFLOW_STORAGE_KEY,
    JSON.stringify({
      activeClientId: state.storage.activeClientId,
      draftBrief: state.storage.draftBrief,
      clients: state.storage.clients
    })
  );
}

function getStorageKey(clientId) {
  return clientId ? String(clientId) : "draft";
}

function createDefaultClientUiState() {
  return {
    activeStep: "client",
    businessBrief: "",
    strategyDraft: null,
    strategyAccepted: false,
    strategyEditing: false,
    previewTab: "landing",
    generationComplete: false,
    previewApproved: false,
    publishReady: false,
    publishFormOpen: false,
    publishDraft: {
      platform: "wordpress",
      name: dt().publish.primarySite,
      baseUrl: "",
      username: "",
      applicationPassword: "",
      siteUrl: "",
      token: "",
      collectionId: ""
    },
    published: false,
    publishedUrl: ""
  };
}

function getClientUiState(clientId) {
  const key = getStorageKey(clientId);
  if (!state.storage.clients[key]) {
    state.storage.clients[key] = createDefaultClientUiState();
  }
  return state.storage.clients[key];
}

function updateClientUiState(clientId, updates) {
  const key = getStorageKey(clientId);
  const current = getClientUiState(clientId);
  state.storage.clients[key] = {
    ...current,
    ...updates,
    publishDraft: {
      ...current.publishDraft,
      ...(updates.publishDraft || {})
    }
  };
  writeStorage();
}

function setStatus(message = "", tone = "") {
  statusBanner.textContent = message;
  statusBanner.className = `guided-status${message ? " is-visible" : ""}${tone ? ` is-${tone}` : ""}`;
}

function getFriendlyErrorMessage(error, fallbackMessage) {
  const message = error instanceof Error ? String(error.message || "").trim() : "";
  const strings = dt();

  if (/Strategy requires/i.test(message) || /Strategy generation is not allowed yet/i.test(message)) {
    return strings.friendlyErrors.strategyBlocked;
  }

  if (/Recommendation is not allowed yet/i.test(message)) {
    return strings.friendlyErrors.recommendationBlocked;
  }

  if (/Generate is not allowed yet/i.test(message)) {
    return strings.friendlyErrors.generateBlocked;
  }

  if (/Expected ',' or ']'/i.test(message) || /JSON at position/i.test(message) || /Unexpected token/i.test(message)) {
    return strings.friendlyErrors.formattingIssue;
  }

  if (/Publish is not allowed yet/i.test(message)) {
    return strings.friendlyErrors.publishBlocked;
  }

  return message || fallbackMessage;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
  if (!response.ok) throw new Error(data.error || dt().messages.requestFailed);
  return data;
}

async function refreshBootstrap() {
  const bootstrap = await api("/api/bootstrap");
  if (!bootstrap.authenticated) {
    clearAuthenticated();
    redirectTo(withLang("/login"));
    return null;
  }

  state.bootstrap = bootstrap;
  syncActiveClientId();
  return bootstrap;
}

function getClients() {
  return state.bootstrap?.clients || [];
}

function getActiveClient() {
  return getClients().find((client) => client.id === state.activeClientId) || null;
}

function syncActiveClientId() {
  const clients = getClients();
  const storedId = Number(state.storage.activeClientId || 0) || null;
  const urlClientId = Number(new URLSearchParams(window.location.search).get("client") || 0) || null;

  if (urlClientId && clients.some((client) => client.id === urlClientId)) {
    state.activeClientId = urlClientId;
    state.storage.activeClientId = urlClientId;
    writeStorage();
    return;
  }

  if (storedId && clients.some((client) => client.id === storedId)) {
    state.activeClientId = storedId;
    return;
  }

  state.activeClientId = clients[0]?.id || null;
  state.storage.activeClientId = state.activeClientId;
  writeStorage();
}

function getCatalogItems(key) {
  return state.bootstrap?.lumix?.catalog?.[key] || [];
}

function getFirstCatalogValue(key, fallback = "") {
  return getCatalogItems(key)[0]?.value || fallback;
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function deriveBusinessNameFromBrief(brief) {
  const source = String(brief || "")
    .split(/[.!?\n]/)
    .find((item) => item.trim())
    || "New business";

  return source
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeStrategy(recommendation) {
  if (!recommendation) return null;
  return {
    positioning: recommendation.positioning || "",
    primaryOffer: recommendation.primaryOffer || "",
    primaryAudience: recommendation.primaryAudience || "",
    ctaStrategy: recommendation.ctaStrategy || "",
    homepageStructure: Array.isArray(recommendation.homepageStructure) ? recommendation.homepageStructure : []
  };
}

function hasGeneratedContent(client) {
  return Boolean(client?.website?.html || client?.blogs?.length || client?.seo);
}

function getDerivedStep(client, uiState) {
  if (!client) return "client";
  if (!String(client.description || "").trim()) return "client";
  if (!client.strategyRecommendation) return "strategy";
  if (!uiState.strategyAccepted) return "strategy";
  if (!hasGeneratedContent(client) || !uiState.generationComplete) return "generate";
  if (!uiState.previewApproved) return "preview";
  return "publish";
}

function getActiveStep(client, uiState) {
  const derived = getDerivedStep(client, uiState);
  const stored = uiState.activeStep || derived;
  return STEP_ORDER.indexOf(stored) <= STEP_ORDER.indexOf(derived) ? stored : derived;
}

function buildStepStates(client, activeStep) {
  const uiState = getClientUiState(client?.id || null);
  const derived = getDerivedStep(client, uiState);
  const highestDoneIndex = Math.max(0, STEP_ORDER.indexOf(derived) - 1);
  const currentIndex = STEP_ORDER.indexOf(activeStep);
  const reachableIndex = STEP_ORDER.indexOf(derived);
  const labels = dt().stepLabels;

  return STEP_ORDER.map((key, index) => {
    let stateLabel = "upcoming";
    if (index < currentIndex || index <= highestDoneIndex) stateLabel = "done";
    if (index === currentIndex) stateLabel = "current";
    if (!client && key === "client") stateLabel = "current";
    return {
      key,
      label: labels[key],
      state: stateLabel,
      clickable: index <= Math.max(reachableIndex, currentIndex)
    };
  });
}

function renderStepRail(client, activeStep) {
  stepList.innerHTML = buildStepStates(client, activeStep)
    .map(
      (step, index) => `
        <button
          type="button"
          class="guided-step guided-step-${escapeHtml(step.state)}${step.clickable ? " is-clickable" : " is-disabled"}"
          data-step-nav="${escapeHtml(step.key)}"
          ${step.clickable ? "" : "disabled"}
          ${step.state === "current" ? 'aria-current="step"' : ""}
        >
          <span class="guided-step-index">${escapeHtml(String(index + 1).padStart(2, "0"))}</span>
          <span class="guided-step-label">${escapeHtml(step.label)}</span>
        </button>
      `
    )
    .join("");
}

function renderClientSwitcher() {
  const clients = getClients();
  const options = [`<option value="">${escapeHtml(dt().shell.newClient)}</option>`]
    .concat(
      clients.map(
        (client) =>
          `<option value="${client.id}"${client.id === state.activeClientId ? " selected" : ""}>${escapeHtml(client.businessName)}</option>`
      )
    )
    .join("");

  clientSwitcher.innerHTML = options;
}

function renderShellMeta() {
  const workspace = state.bootstrap?.user?.agencyName || dt().shell.workspaceFallback;
  workspaceName.textContent = workspace;
  renderClientSwitcher();
}

function renderBusinessStep(client, uiState) {
  const strings = dt();
  const brief = uiState.businessBrief || client?.description || state.storage.draftBrief || "";
  const clientName = client ? `<p class="guided-step-context">${escapeHtml(strings.business.activeClient)} ${escapeHtml(client.businessName)}</p>` : "";

  return `
    <article class="guided-card guided-card-main">
      <span class="guided-step-tag">${escapeHtml(strings.business.stepTag)}</span>
      <h2>${escapeHtml(strings.business.title)}</h2>
      <p class="guided-step-copy">${escapeHtml(strings.business.copy)}</p>
      ${clientName}

      <form class="guided-form" data-brief-form>
        <textarea name="brief" rows="8" placeholder="${escapeHtml(strings.business.placeholder)}">${escapeHtml(brief)}</textarea>
        <button type="submit" class="guided-primary-button">${escapeHtml(strings.business.continue)}</button>
      </form>
    </article>
  `;
}

function renderStrategyCards(strategy, editable = false) {
  const strings = dt();
  const homepageStructure = Array.isArray(strategy?.homepageStructure) ? strategy.homepageStructure.join("\n") : "";

  if (editable) {
    return `
      <label class="guided-field-card">
        <span>${escapeHtml(strings.strategy.positioning)}</span>
        <textarea name="positioning" rows="3">${escapeHtml(strategy?.positioning || "")}</textarea>
      </label>
      <label class="guided-field-card">
        <span>${escapeHtml(strings.strategy.offer)}</span>
        <textarea name="primaryOffer" rows="3">${escapeHtml(strategy?.primaryOffer || "")}</textarea>
      </label>
      <label class="guided-field-card">
        <span>${escapeHtml(strings.strategy.audience)}</span>
        <textarea name="primaryAudience" rows="3">${escapeHtml(strategy?.primaryAudience || "")}</textarea>
      </label>
      <label class="guided-field-card">
        <span>${escapeHtml(strings.strategy.cta)}</span>
        <textarea name="ctaStrategy" rows="3">${escapeHtml(strategy?.ctaStrategy || "")}</textarea>
      </label>
      <label class="guided-field-card guided-field-card-wide">
        <span>${escapeHtml(strings.strategy.homepageStructure)}</span>
        <textarea name="homepageStructure" rows="5">${escapeHtml(homepageStructure)}</textarea>
      </label>
    `;
  }

  return `
    <article class="guided-data-card">
      <span>${escapeHtml(strings.strategy.positioning)}</span>
      <strong>${escapeHtml(strategy?.positioning || strings.strategy.notGenerated)}</strong>
    </article>
    <article class="guided-data-card">
      <span>${escapeHtml(strings.strategy.offer)}</span>
      <strong>${escapeHtml(strategy?.primaryOffer || strings.strategy.notGenerated)}</strong>
    </article>
    <article class="guided-data-card">
      <span>${escapeHtml(strings.strategy.audience)}</span>
      <strong>${escapeHtml(strategy?.primaryAudience || strings.strategy.notGenerated)}</strong>
    </article>
    <article class="guided-data-card">
      <span>${escapeHtml(strings.strategy.cta)}</span>
      <strong>${escapeHtml(strategy?.ctaStrategy || strings.strategy.notGenerated)}</strong>
    </article>
    <article class="guided-data-card guided-data-card-wide">
      <span>${escapeHtml(strings.strategy.homepageStructure)}</span>
      <strong>${escapeHtml((strategy?.homepageStructure || []).join(" → ") || strings.strategy.notGenerated)}</strong>
    </article>
  `;
}

function renderStrategyStep(client, uiState) {
  const strings = dt();
  const strategy = uiState.strategyDraft || normalizeStrategy(client?.strategyRecommendation);
  const editable = Boolean(uiState.strategyEditing);

  if (!strategy) {
    return `
      <article class="guided-card guided-card-main">
        <span class="guided-step-tag">${escapeHtml(strings.strategy.stepTag)}</span>
        <h2>${escapeHtml(strings.strategy.title)}</h2>
        <p class="guided-step-copy">${escapeHtml(strings.strategy.loadingCopy)}</p>
      </article>
    `;
  }

  return `
    <article class="guided-card guided-card-main">
      <span class="guided-step-tag">${escapeHtml(strings.strategy.stepTag)}</span>
      <h2>${escapeHtml(strings.strategy.title)}</h2>
      <p class="guided-step-copy">${escapeHtml(strings.strategy.copy)}</p>

      ${
        editable
          ? `
              <form class="guided-form" data-strategy-form>
                <div class="guided-data-grid">
                  ${renderStrategyCards(strategy, true)}
                </div>
                <div class="guided-action-row">
                  <button type="submit" class="guided-primary-button">${escapeHtml(strings.strategy.save)}</button>
                  <button type="button" class="guided-secondary-button" data-action="cancel-strategy-edit">${escapeHtml(strings.strategy.cancel)}</button>
                </div>
              </form>
            `
          : `
              <div class="guided-data-grid">
                ${renderStrategyCards(strategy, false)}
              </div>
              <div class="guided-action-row">
                <button type="button" class="guided-primary-button" data-action="accept-strategy">${escapeHtml(strings.strategy.accept)}</button>
                <button type="button" class="guided-secondary-button" data-action="edit-strategy">${escapeHtml(strings.strategy.edit)}</button>
              </div>
            `
      }
    </article>
  `;
}

function renderGenerateStep(uiState) {
  const strings = dt();
  if (state.loadingGenerate) {
    return `
      <article class="guided-card guided-card-main guided-loading-card">
        <span class="guided-step-tag">${escapeHtml(strings.generate.stepTag)}</span>
        <h2>${escapeHtml(strings.generate.title)}</h2>
        <div class="guided-loading-orb" aria-hidden="true"></div>
        <strong>${escapeHtml(state.loadingGenerate.message)}</strong>
        <p class="guided-step-copy">${escapeHtml(strings.generate.loadingCopy)}</p>
      </article>
    `;
  }

  return `
    <article class="guided-card guided-card-main">
      <span class="guided-step-tag">${escapeHtml(strings.generate.stepTag)}</span>
      <h2>${escapeHtml(strings.generate.title)}</h2>
      <p class="guided-step-copy">${escapeHtml(strings.generate.copy)}</p>

      <div class="guided-output-list">
        <article class="guided-output-item">
          <strong>${escapeHtml(strings.generate.landingTitle)}</strong>
          <p>${escapeHtml(strings.generate.landingCopy)}</p>
        </article>
        <article class="guided-output-item">
          <strong>${escapeHtml(strings.generate.blogTitle)}</strong>
          <p>${escapeHtml(strings.generate.blogCopy)}</p>
        </article>
        <article class="guided-output-item">
          <strong>${escapeHtml(strings.generate.seoTitle)}</strong>
          <p>${escapeHtml(strings.generate.seoCopy)}</p>
        </article>
      </div>

      <div class="guided-action-row">
        <button type="button" class="guided-primary-button" data-action="generate-content">${escapeHtml(strings.generate.action)}</button>
      </div>
    </article>
  `;
}

function firstSentence(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const sentence = text.split(/(?<=[.!?])\s+/)[0] || text;
  return sentence.trim();
}

function truncateText(value, maxLength = 160) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function getPreviewBusinessName(client) {
  return String(client?.businessName || "").trim() || dt().site.defaultName;
}

function getPreviewHeadline(client) {
  const websiteHeadline = String(client?.website?.headline || "").trim();
  const positioning = String(client?.strategyRecommendation?.positioning || "").trim();
  const offer = String(client?.strategyRecommendation?.primaryOffer || "").trim();
  const name = getPreviewBusinessName(client);

  return websiteHeadline || positioning || offer || `${name} ${dt().site.defaultHeadline}`;
}

function getPreviewSubheadline(client) {
  const websiteSubheadline = String(client?.website?.subheadline || "").trim();
  const recommendation = client?.strategyRecommendation || {};
  const description = firstSentence(client?.description || "");
  const offer = String(recommendation.primaryOffer || "").trim();
  const audience = String(recommendation.primaryAudience || "").trim();
  const strings = dt().site;

  if (websiteSubheadline) return websiteSubheadline;
  if (description) return description;
  if (offer && audience) return `${offer} ${strings.offerAudience} ${audience}, ${strings.offerAudienceSuffix}`;
  if (offer) return `${offer} ${strings.offerOnlySuffix}`;
  return strings.defaultSubheadline;
}

function getPreviewCta(client) {
  return String(client?.website?.cta || client?.strategyRecommendation?.ctaStrategy || "").trim() || dt().site.requestConsultation;
}

function getPreviewSecondaryCta(client) {
  return String(client?.website?.secondaryCta || "").trim() || dt().site.seeServices;
}

function getPreviewAudience(client) {
  return String(client?.strategyRecommendation?.primaryAudience || "").trim() || dt().site.defaultAudience;
}

function getPreviewOffer(client) {
  return String(client?.strategyRecommendation?.primaryOffer || "").trim() || firstSentence(client?.description || "") || dt().site.defaultOffer;
}

function getPreviewServices(client) {
  const websiteServices = Array.isArray(client?.website?.services) ? client.website.services : [];
  const offer = getPreviewOffer(client);
  const audience = getPreviewAudience(client);
  const angles = Array.isArray(client?.strategyRecommendation?.contentAngles) ? client.strategyRecommendation.contentAngles : [];

  if (websiteServices.length) {
    return websiteServices.slice(0, 3).map((service) => ({
      title: String(service?.title || "").trim() || offer,
      body: truncateText(String(service?.body || "").trim(), 130)
    }));
  }

  return [
    {
      title: offer,
      body: truncateText(angles[0] || `${offer} planned around your business goals, audience, and buying process.`, 130)
    },
    {
      title: dt().site.planningTitle,
      body: truncateText(angles[1] || dt().site.planningBody, 130)
    },
    {
      title: `${dt().site.supportPrefix} ${audience}`,
      body: truncateText(angles[2] || dt().site.supportBody, 130)
    }
  ];
}

function getPreviewTestimonial(client) {
  const websiteTestimonials = Array.isArray(client?.website?.testimonials) ? client.website.testimonials : [];
  const offer = getPreviewOffer(client);
  const audience = getPreviewAudience(client);
  const blogExcerpt = firstSentence(client?.blogs?.[0]?.excerpt || "");

  if (websiteTestimonials.length) {
    const item = websiteTestimonials[0];
    return {
      quote: String(item?.quote || "").trim() || blogExcerpt || dt().site.testimonialQuote,
      name: String(item?.name || "").trim() || dt().site.testimonialName,
      role: String(item?.role || "").trim() || `${audience.charAt(0).toUpperCase() + audience.slice(1)} ${dt().site.testimonialRoleSuffix}`,
      context: offer
    };
  }

  return {
    quote:
      blogExcerpt ||
      dt().site.testimonialQuote,
    name: dt().site.testimonialName,
    role: `${audience.charAt(0).toUpperCase() + audience.slice(1)} ${dt().site.testimonialRoleSuffix}`,
    context: offer
  };
}

function getPreviewProcess(client) {
  const websiteSteps = Array.isArray(client?.website?.processSteps) ? client.website.processSteps : [];
  const cta = getPreviewCta(client);

  if (websiteSteps.length) {
    return websiteSteps.slice(0, 3).map((item, index) => ({
      step: String(index + 1),
      title: String(item?.title || "").trim(),
      body: String(item?.body || "").trim()
    }));
  }

  return [
    {
      step: "1",
      title: dt().site.process1Title,
      body: dt().site.process1Body
    },
    {
      step: "2",
      title: dt().site.process2Title,
      body: dt().site.process2Body
    },
    {
      step: "3",
      title: dt().site.process3Title,
      body: `${cta} ${dt().site.process3BodyPrefix}`
    }
  ];
}

function renderFallbackLandingPreview(client) {
  const strings = dt().site;
  const name = getPreviewBusinessName(client);
  const headline = getPreviewHeadline(client);
  const subheadline = getPreviewSubheadline(client);
  const cta = getPreviewCta(client);
  const secondaryCta = getPreviewSecondaryCta(client);
  const services = getPreviewServices(client);
  const testimonial = getPreviewTestimonial(client);
  const process = getPreviewProcess(client);
  const website = client?.website || {};
  const seoTitle = String(client?.seo?.title || "").trim();
  const footerDescription = truncateText(
    String(website.footerNote || client?.seo?.metaDescription || client?.description || "").trim() || subheadline,
    120
  );

  return `
        <article class="guided-site-preview">
          <header class="guided-site-header">
            <strong>${escapeHtml(name)}</strong>
            <nav class="guided-site-nav" aria-label="Website sections">
              <span>${escapeHtml(strings.navServices)}</span>
              <span>${escapeHtml(strings.navAbout)}</span>
              <span>${escapeHtml(strings.navProcess)}</span>
              <span>${escapeHtml(strings.navContact)}</span>
            </nav>
          </header>

          <section class="guided-site-hero">
            <div class="guided-site-hero-copy">
              <span class="guided-site-kicker">${escapeHtml(String(website.heroKicker || strings.kickerTrusted))}</span>
              <h3>${escapeHtml(headline)}</h3>
              <p>${escapeHtml(subheadline)}</p>
              <div class="guided-site-action-row">
                <span class="guided-site-button guided-site-button-primary">${escapeHtml(cta)}</span>
                <span class="guided-site-button guided-site-button-secondary">${escapeHtml(secondaryCta)}</span>
              </div>
            </div>

            <aside class="guided-site-hero-aside">
              <div class="guided-site-info-card">
                <span>${escapeHtml(strings.infoWhatWeDo)}</span>
                <strong>${escapeHtml(getPreviewOffer(client))}</strong>
              </div>
              <div class="guided-site-info-card">
                <span>${escapeHtml(strings.infoBestFit)}</span>
                <strong>${escapeHtml(getPreviewAudience(client))}</strong>
              </div>
              <div class="guided-site-info-card">
                <span>${escapeHtml(strings.infoNextStep)}</span>
                <strong>${escapeHtml(cta)}</strong>
              </div>
            </aside>
          </section>

          <section class="guided-site-section">
            <div class="guided-site-section-head">
              <span class="guided-site-kicker">${escapeHtml(strings.servicesKicker)}</span>
              <h4>${escapeHtml(String(website.servicesTitle || strings.servicesTitle))}</h4>
            </div>
            ${website.servicesIntro ? `<p class="guided-site-section-intro">${escapeHtml(website.servicesIntro)}</p>` : ""}
            <div class="guided-site-service-grid">
              ${services
                .map(
                  (service) => `
                    <article class="guided-site-service-card">
                      <strong>${escapeHtml(service.title)}</strong>
                      <p>${escapeHtml(service.body)}</p>
                    </article>
                  `
                )
                .join("")}
            </div>
          </section>

          <section class="guided-site-section guided-site-section-split">
            <div>
              <div class="guided-site-section-head">
                <span class="guided-site-kicker">${escapeHtml(strings.aboutKicker)}</span>
                <h4>${escapeHtml(strings.aboutTitle)}</h4>
              </div>
              <div class="guided-site-proof-grid">
                <div class="guided-site-credibility-card">
                  <strong>${escapeHtml(seoTitle || `${name} | ${strings.seoFallbackTitleSuffix}`)}</strong>
                  <p>${escapeHtml(footerDescription)}</p>
                </div>
                <blockquote class="guided-site-testimonial">
                  <p>${escapeHtml(`“${testimonial.quote}”`)}</p>
                  <footer>
                    <strong>${escapeHtml(testimonial.name)}</strong>
                    <span>${escapeHtml(`${testimonial.role} • ${testimonial.context}`)}</span>
                  </footer>
                </blockquote>
              </div>
            </div>
          </section>

          <section class="guided-site-section">
            <div class="guided-site-section-head">
              <span class="guided-site-kicker">${escapeHtml(strings.processKicker)}</span>
              <h4>${escapeHtml(String(website.processTitle || strings.processTitle))}</h4>
            </div>
            ${website.processIntro ? `<p class="guided-site-section-intro">${escapeHtml(website.processIntro)}</p>` : ""}
            <div class="guided-site-process-grid">
              ${process
                .map(
                  (item) => `
                    <article class="guided-site-process-card">
                      <span>${escapeHtml(item.step)}</span>
                      <strong>${escapeHtml(item.title)}</strong>
                      <p>${escapeHtml(item.body)}</p>
                    </article>
                  `
                )
                .join("")}
            </div>
          </section>

          <section class="guided-site-final-cta">
            <div>
              <span class="guided-site-kicker">${escapeHtml(strings.contactKicker)}</span>
              <h4>${escapeHtml(String(website.ctaHeadline || strings.contactTitle))}</h4>
              <p>${escapeHtml(String(website.ctaBody || strings.contactCopy))}</p>
            </div>
            <span class="guided-site-button guided-site-button-primary">${escapeHtml(cta)}</span>
          </section>

          <footer class="guided-site-footer">
            <div>
              <strong>${escapeHtml(name)}</strong>
              <p>${escapeHtml(footerDescription)}</p>
            </div>
            <div class="guided-site-footer-links">
              <span>${escapeHtml(strings.navServices)}</span>
              <span>${escapeHtml(strings.navAbout)}</span>
              <span>${escapeHtml(strings.navContact)}</span>
            </div>
          </footer>
        </article>
  `;
}

function renderLandingPreview(client) {
  const previewMarkup = String(client?.website?.html || "").trim() || renderFallbackLandingPreview(client);
  return `
    <div class="guided-preview-browser guided-preview-browser-landing">
      <div class="guided-preview-bar">
        <div class="guided-preview-dots" aria-hidden="true"><span></span><span></span><span></span></div>
        <span class="guided-preview-url">${escapeHtml(`${client.businessName}.preview`)}</span>
      </div>
      <div class="guided-preview-surface guided-preview-surface-landing">
        ${previewMarkup}
      </div>
    </div>
  `;
}

function renderBlogsPreview(client) {
  const strings = dt().preview;
  const blogs = client?.blogs || [];
  if (!blogs.length) {
    return `<div class="guided-preview-list"><article class="guided-preview-card"><strong>${escapeHtml(strings.noBlogsTitle)}</strong><p>${escapeHtml(strings.noBlogsCopy)}</p></article></div>`;
  }

  return `
    <div class="guided-preview-list">
      ${blogs
        .slice(0, 3)
        .map(
          (blog) => `
            <article class="guided-preview-card">
              <span>${escapeHtml(blog.keyword || strings.primaryTopic)}</span>
              <strong>${escapeHtml(blog.title)}</strong>
              <p>${escapeHtml(blog.excerpt || strings.blogExcerptFallback)}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSeoPreview(client) {
  const strings = dt().preview;
  const seo = client?.seo;
  const keywords = Array.isArray(seo?.keywords) ? seo.keywords : [];
  return `
    <div class="guided-preview-list">
      <article class="guided-preview-card">
        <span>${escapeHtml(strings.metaTitle)}</span>
        <strong>${escapeHtml(seo?.title || strings.noSeoTitle)}</strong>
      </article>
      <article class="guided-preview-card">
        <span>${escapeHtml(strings.metaDescription)}</span>
        <strong>${escapeHtml(seo?.metaDescription || seo?.description || strings.noSeoDescription)}</strong>
      </article>
      <article class="guided-preview-card">
        <span>${escapeHtml(strings.keywords)}</span>
        <strong>${escapeHtml(keywords.join(", ") || strings.noKeywords)}</strong>
      </article>
    </div>
  `;
}

function renderPreviewStep(client, uiState) {
  const strings = dt().preview;
  const activeTab = uiState.previewTab || "landing";
  const previewContent =
    activeTab === "blogs" ? renderBlogsPreview(client) : activeTab === "seo" ? renderSeoPreview(client) : renderLandingPreview(client);

  return `
    <article class="guided-card guided-card-main guided-card-preview">
      <span class="guided-step-tag">${escapeHtml(strings.stepTag)}</span>
      <h2>${escapeHtml(strings.title)}</h2>
      <p class="guided-step-copy">${escapeHtml(strings.copy)}</p>

      <div class="guided-tab-row" role="tablist" aria-label="Preview tabs">
        ${["landing", "blogs", "seo"]
          .map(
            (tab) => `
              <button
                type="button"
                class="guided-tab-button${activeTab === tab ? " is-active" : ""}"
                data-preview-tab="${tab}"
                role="tab"
                aria-selected="${String(activeTab === tab)}"
              >
                ${escapeHtml(strings.tabs[tab])}
              </button>
            `
          )
          .join("")}
      </div>

      <div class="guided-preview-wrap">
        ${previewContent}
      </div>

      <div class="guided-action-row">
        <button type="button" class="guided-primary-button" data-action="approve-preview">${escapeHtml(strings.approve)}</button>
        <button type="button" class="guided-secondary-button" data-action="go-back-generate">${escapeHtml(strings.back)}</button>
      </div>
    </article>
  `;
}

function renderPublishConnector(uiState, client) {
  const strings = dt().publish;
  const draft = uiState.publishDraft || createDefaultClientUiState().publishDraft;
  const platform = draft.platform || "wordpress";
  return `
    <form class="guided-form guided-publish-form" data-publish-target-form>
      <div class="guided-inline-grid">
        <label>
          <span>${escapeHtml(strings.platform)}</span>
          <select name="platform">
            <option value="wordpress"${platform === "wordpress" ? " selected" : ""}>${escapeHtml(strings.wordpress)}</option>
            <option value="webflow"${platform === "webflow" ? " selected" : ""}>${escapeHtml(strings.webflow)}</option>
          </select>
        </label>
        <label>
          <span>${escapeHtml(strings.channelName)}</span>
          <input name="name" value="${escapeHtml(draft.name || `${client.businessName} ${strings.primarySite.toLowerCase()}`)}" />
        </label>
      </div>

      ${
        platform === "wordpress"
          ? `
              <div class="guided-inline-grid">
                <label>
                  <span>${escapeHtml(strings.baseUrl)}</span>
                  <input name="baseUrl" placeholder="https://example.com" value="${escapeHtml(draft.baseUrl || "")}" />
                </label>
                <label>
                  <span>${escapeHtml(strings.username)}</span>
                  <input name="username" placeholder="api-user" value="${escapeHtml(draft.username || "")}" />
                </label>
              </div>
              <label>
                <span>${escapeHtml(strings.applicationPassword)}</span>
                <input name="applicationPassword" placeholder="xxxx xxxx xxxx xxxx" value="${escapeHtml(draft.applicationPassword || "")}" />
              </label>
            `
          : `
              <div class="guided-inline-grid">
                <label>
                  <span>${escapeHtml(strings.siteUrl)}</span>
                  <input name="siteUrl" placeholder="https://your-site.webflow.io" value="${escapeHtml(draft.siteUrl || "")}" />
                </label>
                <label>
                  <span>${escapeHtml(strings.collectionId)}</span>
                  <input name="collectionId" placeholder="collection_id" value="${escapeHtml(draft.collectionId || "")}" />
                </label>
              </div>
              <label>
                <span>${escapeHtml(strings.apiToken)}</span>
                <input name="token" placeholder="wf_xxx" value="${escapeHtml(draft.token || "")}" />
              </label>
            `
      }

      <div class="guided-action-row">
        <button type="submit" class="guided-primary-button">${escapeHtml(strings.saveChannel)}</button>
      </div>
    </form>
  `;
}

function getPublishUrl(client, uiState) {
  if (uiState.publishedUrl) return uiState.publishedUrl;

  const target = client?.publishTargets?.[0];
  const targetUrl =
    target?.config?.siteUrl ||
    target?.config?.baseUrl ||
    (client?.id ? `${window.location.origin}/client/${client.id}` : "");

  if (targetUrl) return targetUrl;
  return client?.id ? `${window.location.origin}/client/${client.id}` : "";
}

function renderPublishStep(client, uiState) {
  const strings = dt().publish;
  const hasTarget = Boolean(client?.publishTargets?.length);
  const published = Boolean(uiState.published || client?.publishHistory?.length);
  const publishUrl = getPublishUrl(client, uiState);

  if (published) {
    return `
      <article class="guided-card guided-card-main">
        <span class="guided-step-tag">${escapeHtml(strings.stepTag)}</span>
        <h2>${escapeHtml(strings.liveTitle)}</h2>
        <p class="guided-step-copy">${escapeHtml(strings.liveCopy)}</p>
        <div class="guided-success-card">
          <strong>${escapeHtml(publishUrl || "https://your-site-url.com")}</strong>
        </div>
      </article>
    `;
  }

  return `
    <article class="guided-card guided-card-main">
      <span class="guided-step-tag">${escapeHtml(strings.stepTag)}</span>
      <h2>${escapeHtml(strings.publishTitle)}</h2>
      <p class="guided-step-copy">${escapeHtml(strings.publishCopy)}</p>

      <div class="guided-publish-card${hasTarget ? " is-ready" : " is-blocked"}">
        <span class="guided-publish-state">${hasTarget ? escapeHtml(strings.readyState) : escapeHtml(strings.missingState)}</span>
        <strong>${hasTarget ? escapeHtml(strings.readyStrong) : escapeHtml(strings.missingStrong)}</strong>
        <p>
          ${
            hasTarget
              ? escapeHtml(client.publishTargets[0].name || strings.primarySite)
              : escapeHtml(strings.missingCopy)
          }
        </p>
      </div>

      ${
        !hasTarget && uiState.publishFormOpen
          ? renderPublishConnector(uiState, client)
          : ""
      }

      <div class="guided-action-row">
        ${
          hasTarget
            ? `<button type="button" class="guided-primary-button" data-action="publish-now">${escapeHtml(strings.publishNow)}</button>`
            : `<button type="button" class="guided-primary-button" data-action="open-publish-form">${escapeHtml(strings.connectChannel)}</button>`
        }
      </div>
    </article>
  `;
}

function renderCurrentStep() {
  const client = getActiveClient();
  const uiState = getClientUiState(client?.id || null);

  if (client?.strategyRecommendation && hasGeneratedContent(client)) {
    uiState.strategyAccepted = true;
    uiState.generationComplete = true;
  }

  if (client?.publishHistory?.length) {
    uiState.previewApproved = true;
    uiState.published = true;
  }

  const activeStep = getActiveStep(client, uiState);

  uiState.activeStep = activeStep;
  uiState.publishReady = Boolean(client?.publishTargets?.length);
  if (client?.publishHistory?.length) {
    uiState.published = true;
    uiState.publishedUrl = getPublishUrl(client, uiState);
  }
  writeStorage();

  renderStepRail(client, activeStep);

  if (activeStep === "client") {
    mainView.innerHTML = renderBusinessStep(client, uiState);
    return;
  }

  if (activeStep === "strategy") {
    mainView.innerHTML = renderStrategyStep(client, uiState);
    return;
  }

  if (activeStep === "generate") {
    mainView.innerHTML = renderGenerateStep(uiState);
    return;
  }

  if (activeStep === "preview") {
    mainView.innerHTML = renderPreviewStep(client, uiState);
    return;
  }

  mainView.innerHTML = renderPublishStep(client, uiState);
}

function render() {
  if (!state.bootstrap) return;
  renderShellMeta();
  renderCurrentStep();
}

function buildMinimalIntakePayload(client, brief) {
  const profile = client?.businessProfile || {};
  return {
    businessType: profile.businessType || getFirstCatalogValue("businessType", "b2b_service"),
    offerType: profile.offerType || getFirstCatalogValue("offerType", "service"),
    audienceType: profile.audienceType || getFirstCatalogValue("audienceType", "small_businesses"),
    goalType: profile.goalType || getFirstCatalogValue("goalType", "lead_generation"),
    toneType: profile.toneType || getFirstCatalogValue("toneType", "trusted"),
    geoFocus: profile.geoFocus || "",
    pricePosition: profile.pricePosition || getFirstCatalogValue("pricePosition", "standard"),
    mainCta: profile.mainCta || dt().site.requestConsultation,
    notes: brief
  };
}

async function submitBrief(brief) {
  const clients = getClients();
  const activeClient = getActiveClient();
  let clientId = activeClient?.id || null;

  if (!clientId) {
    const result = await api("/api/clients", {
      method: "POST",
      body: JSON.stringify({
        businessName: deriveBusinessNameFromBrief(brief),
        description: brief,
        autoGenerate: false
      })
    });
    clientId = result.client.id;
    state.activeClientId = clientId;
    state.storage.activeClientId = clientId;
  } else if (activeClient?.description !== brief) {
    await api(`/api/clients/${clientId}`, {
      method: "PATCH",
      body: JSON.stringify({ description: brief })
    });
  }

  const refreshed = clients.find((client) => client.id === clientId) || activeClient || null;
  await api(`/api/clients/${clientId}/intake`, {
    method: "PUT",
    body: JSON.stringify(buildMinimalIntakePayload(refreshed, brief))
  });

  const recommendationResult = await api(`/api/clients/${clientId}/recommendation`, { method: "POST" });

  updateClientUiState(clientId, {
    activeStep: "strategy",
    businessBrief: brief,
    strategyDraft: normalizeStrategy(recommendationResult.client?.strategyRecommendation || recommendationResult.recommendation),
    strategyAccepted: false,
    strategyEditing: false,
    generationComplete: false,
    previewApproved: false,
    published: false,
    publishedUrl: ""
  });

  state.storage.draftBrief = "";
  writeStorage();
  await refreshBootstrap();
  setStatus(dt().messages.businessSaved, "success");
  render();
}

function readStrategyForm(form) {
  const raw = Object.fromEntries(new FormData(form).entries());
  return {
    positioning: String(raw.positioning || "").trim(),
    primaryOffer: String(raw.primaryOffer || "").trim(),
    primaryAudience: String(raw.primaryAudience || "").trim(),
    ctaStrategy: String(raw.ctaStrategy || "").trim(),
    homepageStructure: String(raw.homepageStructure || "")
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
  };
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function startGenerateLoading(clientId) {
  const messages = dt().generate.messages;
  stopGenerateLoading();
  state.loadingGenerate = {
    clientId,
    message: messages[0],
    index: 0
  };
  state.loadingTimer = window.setInterval(() => {
    if (!state.loadingGenerate) return;
    const nextIndex = (state.loadingGenerate.index + 1) % messages.length;
    state.loadingGenerate = {
      ...state.loadingGenerate,
      index: nextIndex,
      message: messages[nextIndex]
    };
    renderCurrentStep();
  }, 700);
}

function stopGenerateLoading() {
  if (state.loadingTimer) {
    window.clearInterval(state.loadingTimer);
    state.loadingTimer = null;
  }
  state.loadingGenerate = null;
}

function updatePublishDraftFromForm(clientId, raw) {
  updateClientUiState(clientId, {
    publishDraft: {
      platform: String(raw.platform || "wordpress"),
      name: String(raw.name || dt().publish.primarySite),
      baseUrl: String(raw.baseUrl || ""),
      username: String(raw.username || ""),
      applicationPassword: String(raw.applicationPassword || ""),
      siteUrl: String(raw.siteUrl || ""),
      token: String(raw.token || ""),
      collectionId: String(raw.collectionId || "")
    }
  });
}

function buildPublishConfig(raw) {
  if (raw.platform === "webflow") {
    return {
      token: String(raw.token || "").trim(),
      collectionId: String(raw.collectionId || "").trim(),
      siteUrl: String(raw.siteUrl || "").trim(),
      titleField: "name",
      slugField: "slug",
      contentField: "post-body",
      excerptField: "summary",
      keywordField: "keyword"
    };
  }

  return {
    baseUrl: String(raw.baseUrl || "").trim(),
    username: String(raw.username || "").trim(),
    applicationPassword: String(raw.applicationPassword || "").trim(),
    status: "draft"
  };
}

function getCurrentUiState() {
  return getClientUiState(getActiveClient()?.id || null);
}

mainView.addEventListener("submit", async (event) => {
  const briefForm = event.target.closest("form[data-brief-form]");
  if (briefForm) {
    event.preventDefault();
    const brief = String(new FormData(briefForm).get("brief") || "").trim();
    if (!brief) {
      setStatus(dt().messages.describeBusiness, "error");
      return;
    }

    state.storage.draftBrief = brief;
    writeStorage();

    try {
      setStatus(dt().messages.savingBrief);
      await submitBrief(brief);
    } catch (error) {
      setStatus(getFriendlyErrorMessage(error, dt().messages.savingBriefFailed), "error");
    }
    return;
  }

  const strategyForm = event.target.closest("form[data-strategy-form]");
  if (strategyForm) {
    event.preventDefault();
    const client = getActiveClient();
    if (!client) return;

    const strategyDraft = readStrategyForm(strategyForm);

    try {
      setStatus(dt().messages.savingStrategy);
      const result = await api(`/api/clients/${client.id}/strategy`, {
        method: "PATCH",
        body: JSON.stringify(strategyDraft)
      });

      updateClientUiState(client.id, {
        strategyDraft: normalizeStrategy(result.client?.strategyRecommendation || strategyDraft),
        strategyAccepted: true,
        strategyEditing: false,
        activeStep: "generate"
      });

      await refreshBootstrap();
      setStatus(dt().messages.strategySaved, "success");
      render();
    } catch (error) {
      setStatus(getFriendlyErrorMessage(error, dt().messages.savingStrategyFailed), "error");
    }
    return;
  }

  const publishForm = event.target.closest("form[data-publish-target-form]");
  if (publishForm) {
    event.preventDefault();
    const client = getActiveClient();
    if (!client) return;

    const raw = Object.fromEntries(new FormData(publishForm).entries());
    updatePublishDraftFromForm(client.id, raw);

    try {
      setStatus(dt().messages.connectingPublish);
      await api(`/api/clients/${client.id}/publish-targets`, {
        method: "POST",
        body: JSON.stringify({
          name: String(raw.name || "").trim(),
          platform: String(raw.platform || "wordpress"),
          autoPublish: false,
          config: buildPublishConfig(raw)
        })
      });

      updateClientUiState(client.id, {
        publishFormOpen: false,
        publishReady: true,
        activeStep: "publish"
      });
      await refreshBootstrap();
      setStatus(dt().messages.publishConnected, "success");
      render();
    } catch (error) {
      setStatus(getFriendlyErrorMessage(error, dt().messages.connectingPublishFailed), "error");
    }
  }
});

mainView.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action], [data-preview-tab]");
  if (!button) return;

  const client = getActiveClient();
  const uiState = getCurrentUiState();

  if (button.dataset.previewTab) {
    updateClientUiState(client?.id || null, { previewTab: button.dataset.previewTab });
    render();
    return;
  }

  const action = button.dataset.action;

  if (action === "accept-strategy" && client) {
    updateClientUiState(client.id, {
      strategyAccepted: true,
      strategyEditing: false,
      activeStep: "generate"
    });
    render();
    return;
  }

  if (action === "edit-strategy" && client) {
    updateClientUiState(client.id, { strategyEditing: true });
    render();
    return;
  }

  if (action === "cancel-strategy-edit" && client) {
    updateClientUiState(client.id, {
      strategyEditing: false,
      strategyDraft: normalizeStrategy(client.strategyRecommendation)
    });
    render();
    return;
  }

  if (action === "generate-content" && client) {
    try {
      startGenerateLoading(client.id);
      render();
      const [result] = await Promise.all([
        api(`/api/clients/${client.id}/generate-all`, { method: "POST" }),
        wait(2800)
      ]);

      stopGenerateLoading();
      updateClientUiState(client.id, {
        generationComplete: true,
        previewApproved: false,
        previewTab: uiState.previewTab || "landing",
        activeStep: "preview"
      });

      state.bootstrap.clients = (state.bootstrap.clients || []).map((item) =>
        item.id === client.id ? result.client : item
      );
      await refreshBootstrap();
      setStatus(dt().messages.contentGenerated, "success");
      render();
    } catch (error) {
      stopGenerateLoading();
      render();
      setStatus(getFriendlyErrorMessage(error, dt().messages.generatingContentFailed), "error");
    }
    return;
  }

  if (action === "approve-preview" && client) {
    updateClientUiState(client.id, {
      previewApproved: true,
      activeStep: "publish"
    });
    render();
    return;
  }

  if (action === "go-back-generate" && client) {
    updateClientUiState(client.id, { activeStep: "generate" });
    render();
    return;
  }

  if (action === "open-publish-form" && client) {
    updateClientUiState(client.id, { publishFormOpen: true });
    render();
    return;
  }

  if (action === "publish-now" && client) {
    try {
      setStatus(dt().messages.publishing);
      await api(`/api/clients/${client.id}/publish`, {
        method: "POST",
        body: JSON.stringify({})
      });

      const publishedUrl = getPublishUrl(client, uiState);
      updateClientUiState(client.id, {
        published: true,
        publishedUrl,
        activeStep: "publish"
      });
      await refreshBootstrap();
      setStatus(dt().messages.siteLive, "success");
      render();
    } catch (error) {
      setStatus(getFriendlyErrorMessage(error, dt().messages.publishingFailed), "error");
    }
  }
});

stepList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-step-nav]");
  if (!button || state.loadingGenerate) return;

  const targetStep = button.dataset.stepNav;
  const client = getActiveClient();
  const uiState = getCurrentUiState();
  const reachableIndex = STEP_ORDER.indexOf(getDerivedStep(client, uiState));
  const targetIndex = STEP_ORDER.indexOf(targetStep);

  if (targetIndex === -1 || targetIndex > Math.max(reachableIndex, STEP_ORDER.indexOf(uiState.activeStep || "client"))) {
    return;
  }

  updateClientUiState(client?.id || null, {
    activeStep: targetStep
  });
  render();
});

clientSwitcher.addEventListener("change", () => {
  const selectedId = Number(clientSwitcher.value || 0) || null;
  state.activeClientId = selectedId;
  state.storage.activeClientId = selectedId;
  writeStorage();
  render();
});

logoutButton.addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    // Ignore logout API failures and clear client state anyway.
  }

  stopGenerateLoading();
  clearAuthenticated();
  localStorage.removeItem(WORKFLOW_STORAGE_KEY);
  redirectTo(withLang("/login"));
});

newWebsiteButton?.addEventListener("click", () => {
  redirectTo(withLang("/welcome?mode=new-client"));
});

async function init() {
  try {
    applyLanguageChrome();
    setStatus(dt().messages.loadingWorkspace);
    await refreshBootstrap();
    setStatus("");
    render();
  } catch (error) {
    setStatus(getFriendlyErrorMessage(error, dt().messages.loadingWorkspaceFailed), "error");
  }
}

init();
