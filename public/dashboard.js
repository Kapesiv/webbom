const state = {
  bootstrap: null,
  activeClientId: null,
  tourActive: false,
  tourStepIndex: 0,
  tourInitialized: false
};

const summaryGrid = document.getElementById("summary-grid");
const clientsList = document.getElementById("clients-list");
const clientsCaption = document.getElementById("clients-caption");
const agencyTitle = document.getElementById("agency-title");
const statusBanner = document.getElementById("status-banner");
const teamList = document.getElementById("team-list");
const reportHistory = document.getElementById("report-history");
const jobsList = document.getElementById("jobs-list");
const lumixCodex = document.getElementById("lumix-codex");
const lumixSummary = document.getElementById("lumix-summary");
const activeClientView = document.getElementById("active-client-view");
const lumixCoach = document.getElementById("lumix-coach");
const lumixButton = document.getElementById("lumix-button");
const lumixActionState = new Map();
const lumixAssistState = new Map();
let guideHighlightTimeout = null;
const lumixTourStorageKey = "webbom-lumix-tour-dismissed-v1";

function getIntakeCatalog() {
  return (
    state.bootstrap?.lumix?.catalog || {
      businessType: [],
      offerType: [],
      audienceType: [],
      goalType: [],
      toneType: [],
      pricePosition: []
    }
  );
}

function setStatus(message) {
  statusBanner.textContent = message || "";
  statusBanner.classList.toggle("is-visible", Boolean(message));
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Request failed";
}

async function runAction(pendingMessage, action) {
  setStatus(pendingMessage);

  try {
    await action();
  } catch (error) {
    setStatus(getErrorMessage(error));
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(isoString) {
  if (!isoString) return "Ei vielä";
  return new Date(isoString).toLocaleString();
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
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function readForm(formElement) {
  return Object.fromEntries(new FormData(formElement).entries());
}

function buildPublishConfig(raw) {
  const entries = Object.entries({
    baseUrl: String(raw.baseUrl || "").trim(),
    username: String(raw.username || "").trim(),
    applicationPassword: String(raw.applicationPassword || "").trim(),
    status: String(raw.status || "").trim(),
    apiToken: String(raw.apiToken || "").trim(),
    siteId: String(raw.siteId || "").trim(),
    collectionId: String(raw.collectionId || "").trim()
  }).filter(([, value]) => value);

  return Object.fromEntries(entries);
}

function formatClientCount(count) {
  return `${count} ${count === 1 ? "asiakas" : "asiakasta"}`;
}

function getActiveClient() {
  return state.bootstrap?.clients?.find((client) => client.id === state.activeClientId) || null;
}

function syncActiveClientId(clients) {
  if (!clients.length) {
    state.activeClientId = null;
    return;
  }

  const exists = clients.some((client) => client.id === state.activeClientId);
  if (!exists) {
    state.activeClientId = clients[0].id;
  }
}

function hasProfile(client) {
  const profile = client.businessProfile || {};
  return Boolean(
    client.intakeAnswers?.length ||
      profile.businessType ||
      profile.offerType ||
      profile.audienceType ||
      profile.goalType ||
      profile.toneType ||
      profile.pricePosition ||
      profile.geoFocus ||
      profile.mainCta ||
      profile.rawNotes?.notes
  );
}

function hasContent(client) {
  return Boolean(client.website?.html || client.blogs?.length || client.seo);
}

function openAncestorDetails(element) {
  let current = element?.parentElement || null;

  while (current) {
    if (current.tagName === "DETAILS") {
      current.open = true;
    }
    current = current.parentElement;
  }
}

function clearGuideHighlights() {
  document.querySelectorAll(".guide-highlight").forEach((element) => {
    element.classList.remove("guide-highlight");
  });
}

function highlightGuideTarget(selector) {
  if (!selector) return;
  const target = document.querySelector(selector);
  if (!target) return;

  openAncestorDetails(target);
  clearGuideHighlights();
  target.classList.add("guide-highlight");
  target.scrollIntoView({ behavior: "smooth", block: "center" });

  window.clearTimeout(guideHighlightTimeout);
  guideHighlightTimeout = window.setTimeout(() => {
    target.classList.remove("guide-highlight");
  }, 2400);
}

function getNextStep(client) {
  if (!hasProfile(client)) {
    return {
      title: "Tee tämä seuraavaksi",
      text: "Täydennä yrityksen tiedot ja tallenna ne."
    };
  }

  if (!client.strategyRecommendation) {
    return {
      title: "Tee tämä seuraavaksi",
      text: "Pyydä Lumixilta ehdotus ennen generointia."
    };
  }

  if (!hasContent(client)) {
    return {
      title: "Tee tämä seuraavaksi",
      text: "Generoi sivu, blogit ja SEO."
    };
  }

  if (!client.publishHistory.length) {
    return {
      title: "Tee tämä seuraavaksi",
      text: client.publishTargets.length
        ? "Julkaise valmis sisältö."
        : "Lisää ensin yksi julkaisukanava lisäasetuksista."
    };
  }

  return {
    title: "Tämän jälkeen",
    text: "Seuraa liidejä ja päivitä sisältöä tarpeen mukaan."
  };
}

function getTourSteps(client) {
  const steps = [
    {
      title: "Asiakkaat",
      text: "Täältä valitset aina yhden asiakkaan kerrallaan.",
      target: "[data-guide='clients']"
    },
    {
      title: "Uusi asiakas",
      text: "Tämä on aloituskohta. Lisää nimi ja kuvaus. Muut asetukset voi avata myöhemmin.",
      target: "[data-guide='new-client']"
    }
  ];

  if (client) {
    steps.push(
      {
        title: "Yrityksen tiedot",
        text: "Tähän tallennat mitä myydään, kenelle ja mikä on tärkein tavoite.",
        target: "[data-guide='intake']"
      },
      {
        title: "Lumixin ehdotus",
        text: "Tässä Lumix ehdottaa viestin ja rungon ennen generointia.",
        target: "[data-guide='recommend']"
      },
      {
        title: "Luo sisältö",
        text: "Tällä kohdalla tehdään sivu, blogit ja SEO saman suunnan alle.",
        target: "[data-guide='generate']"
      },
      {
        title: "Julkaise",
        text: "Kun sisältö on valmis, julkaisu tehdään tästä.",
        target: "[data-guide='publish']"
      },
      {
        title: "Liidit",
        text: "Täältä näet mitä kiinnostusta sivu on kerännyt.",
        target: "[data-guide='leads']"
      }
    );
  } else {
    steps.push({
      title: "Työalue",
      text: "Kun ensimmäinen asiakas on luotu, varsinainen flow näkyy tässä.",
      target: "[data-guide='workflow']"
    });
  }

  steps.push({
    title: "Muut asetukset",
    text: "Harvemmin tarvittavat asetukset ja tekninen puoli ovat täällä erillään pääflow’sta.",
    target: "[data-guide='more-settings']"
  });

  return steps.filter((step) => document.querySelector(step.target));
}

function finishTour() {
  state.tourActive = false;
  state.tourStepIndex = 0;
  window.localStorage.setItem(lumixTourStorageKey, "1");
  clearGuideHighlights();
}

function activateLumix() {
  const activeClient = getActiveClient();
  const coach = getCoachState(activeClient);

  if (state.tourActive) {
    const tourSteps = getTourSteps(activeClient);
    const step = tourSteps[Math.min(state.tourStepIndex, Math.max(tourSteps.length - 1, 0))];

    if (step?.target) {
      highlightGuideTarget(step.target);
      return;
    }
  }

  if (coach?.target) {
    renderCoach(activeClient);
    highlightGuideTarget(coach.target);
    return;
  }
}

function getCoachState(client) {
  if (!client) {
    return {
      title: "Lumix",
      text: "Lumix toimii tässä dashboardissa. Luo ensin yksi asiakas, niin ohjaan seuraavaan kohtaan.",
      target: "#client-form"
    };
  }

  if (!hasProfile(client)) {
    return {
      title: "Lumix",
      text: "Täytä ensin yrityksen tiedot ja tallenna ne.",
      target: "[data-guide='intake']"
    };
  }

  if (!client.strategyRecommendation) {
    return {
      title: "Lumix",
      text: "Seuraava klikki on ehdotukseen. Sillä saat hyvän suunnan ennen generointia.",
      target: "[data-guide='recommend']"
    };
  }

  if (!hasContent(client)) {
    return {
      title: "Lumix",
      text: "Nyt voit generoida sivun, blogit ja SEO:n yhdellä napilla.",
      target: "[data-guide='generate']"
    };
  }

  if (!client.publishTargets.length) {
    return {
      title: "Lumix",
      text: "Lisää ensin yksi julkaisukanava lisäasetuksista.",
      target: "[data-guide='publish-settings']"
    };
  }

  if (!client.publishHistory.length) {
    return {
      title: "Lumix",
      text: "Sisältö on valmis. Seuraava klikki on julkaisu.",
      target: "[data-guide='publish']"
    };
  }

  return {
    title: "Lumix",
    text: "Nyt seuraa liidejä ja katso mikä toimii parhaiten.",
    target: "[data-guide='leads']"
  };
}

function getLumixAssistState(clientId) {
  return (
    lumixAssistState.get(clientId) || {
      reply: "",
      suggestedUpdates: null
    }
  );
}

function buildIntakePayloadFromClient(client, overrides = {}) {
  const profile = client.businessProfile || {};

  return {
    businessType: overrides.businessType ?? profile.businessType ?? "",
    offerType: overrides.offerType ?? profile.offerType ?? "",
    audienceType: overrides.audienceType ?? profile.audienceType ?? "",
    goalType: overrides.goalType ?? profile.goalType ?? "",
    toneType: overrides.toneType ?? profile.toneType ?? "",
    geoFocus: overrides.geoFocus ?? profile.geoFocus ?? "",
    pricePosition: overrides.pricePosition ?? profile.pricePosition ?? "",
    mainCta: overrides.mainCta ?? profile.mainCta ?? "",
    notes: overrides.notes ?? profile.rawNotes?.notes ?? ""
  };
}

function renderCoach(client) {
  const tourSteps = getTourSteps(client);
  if (state.tourActive && tourSteps.length) {
    const currentIndex = Math.min(state.tourStepIndex, tourSteps.length - 1);
    const step = tourSteps[currentIndex];

    lumixCoach.innerHTML = `
      <div class="lumix-coach-card">
        <div class="lumix-coach-head">
          <span class="lumix-coach-avatar">L</span>
          <div>
            <strong>Lumix opastus</strong>
            <p>Kohta ${currentIndex + 1} / ${tourSteps.length}</p>
          </div>
        </div>
        <div class="lumix-coach-step">
          <strong>${escapeHtml(step.title)}</strong>
          <p class="lumix-coach-text">${escapeHtml(step.text)}</p>
        </div>
        <div class="lumix-coach-actions">
          <button
            type="button"
            class="ghost-button"
            data-coach-action="prev"
            ${currentIndex === 0 ? "disabled" : ""}
          >
            Edellinen
          </button>
          <button
            type="button"
            class="ghost-button"
            data-coach-action="focus"
            data-target="${escapeHtml(step.target)}"
          >
            Näytä kohta
          </button>
          <button type="button" data-coach-action="${currentIndex === tourSteps.length - 1 ? "finish" : "next"}">
            ${currentIndex === tourSteps.length - 1 ? "Valmis" : "Seuraava"}
          </button>
        </div>
        <button type="button" class="ghost-button lumix-coach-dismiss" data-coach-action="stop">
          Lopeta opastus
        </button>
      </div>
    `;
    return;
  }

  const coach = getCoachState(client);
  const assist = client ? getLumixAssistState(client.id) : { reply: "", suggestedUpdates: null };
  const hasAssistReply = Boolean(assist.reply);

  lumixCoach.innerHTML = `
    <div class="lumix-coach-card">
      <div class="lumix-coach-head">
        <span class="lumix-coach-avatar">L</span>
        <div>
          <strong>${escapeHtml(coach.title)}</strong>
          <p>Hiljainen apu seuraavaan kohtaan.</p>
        </div>
      </div>
      <p class="lumix-coach-text">${escapeHtml(coach.text)}</p>
      ${
        client
          ? `
            <form class="lumix-coach-form" data-lumix-form data-client-id="${client.id}">
              <label>
                <span>Kirjoita idea Lumixille</span>
                <textarea
                  name="message"
                  rows="3"
                  placeholder="Esim. tee tästä premiumimpi, kohdenna hotelleille ja tee CTA tarjouspyyntöön."
                  required
                ></textarea>
              </label>
              <button type="submit">Kysy Lumixilta</button>
            </form>
          `
          : ""
      }
      ${
        hasAssistReply
          ? `
            <div class="lumix-coach-reply">
              <strong>Lumix</strong>
              <p>${escapeHtml(assist.reply)}</p>
              ${
                assist.suggestedUpdates && Object.keys(assist.suggestedUpdates).length
                  ? `
                    <div class="lumix-coach-mini-actions">
                      <button type="button" class="ghost-button" data-coach-action="apply-suggestion">
                        Käytä ehdotusta
                      </button>
                    </div>
                  `
                  : ""
              }
            </div>
          `
          : ""
      }
      <div class="lumix-coach-actions">
        <button type="button" class="ghost-button" data-coach-action="focus" data-target="${escapeHtml(coach.target)}">
          Näytä kohta
        </button>
        <button type="button" data-coach-action="start-tour">Aloita opastus</button>
      </div>
    </div>
  `;
}

function renderHealth(health) {
  document.getElementById("ai-chip").textContent = health.liveAi ? "AI: käytössä" : "AI: demo";
  document.getElementById("stripe-chip").textContent = health.stripeConfigured
    ? "Stripe: käytössä"
    : "Stripe: demo";
  document.getElementById("scheduler-chip").textContent = `Ajastus: ${Math.round(
    health.schedulerIntervalMs / 1000
  )}s / jono ${Math.round(health.queueIntervalMs / 1000)}s`;
}

function renderSummary(summary) {
  summaryGrid.innerHTML = [
    ["Asiakkaat", summary.totalClients],
    ["Luotu", summary.generatedClients],
    ["Liidit", summary.totalLeads],
    ["Jonossa", summary.pendingJobs]
  ]
    .map(
      ([label, value]) => `
        <article class="summary-card">
          <p>${label}</p>
          <strong>${value}</strong>
        </article>
      `
    )
    .join("");
}

function renderJobs(jobs) {
  if (!jobs.length) {
    jobsList.innerHTML = '<article class="mini-card"><p>Ei töitä jonossa.</p></article>';
    return;
  }

  jobsList.innerHTML = jobs
    .map(
      (job) => `
        <article class="mini-card">
          <strong>#${job.id} • ${escapeHtml(job.type)}</strong>
          <p>${escapeHtml(job.status)}${job.clientId ? ` • asiakas ${job.clientId}` : ""}</p>
          <p>Luotu ${formatDate(job.createdAt)}${job.completedAt ? ` • valmis ${formatDate(job.completedAt)}` : ""}</p>
          ${job.error ? `<p>${escapeHtml(job.error)}</p>` : ""}
        </article>
      `
    )
    .join("");
}

function renderTeam(members) {
  if (!members.length) {
    teamList.innerHTML = '<article class="mini-card"><p>Ei tiimin jäseniä.</p></article>';
    return;
  }

  teamList.innerHTML = members
    .map(
      (member) => `
        <article class="mini-card">
          <div>
            <strong>${escapeHtml(member.email)}</strong>
            <p>${escapeHtml(member.role)} • liittynyt ${formatDate(member.createdAt)}</p>
          </div>
          ${
            state.bootstrap.user.role === "owner" && member.id !== state.bootstrap.user.id
              ? `
                <div class="mini-actions">
                  <button class="ghost-button" data-action="set-role" data-member-id="${member.id}" data-role="admin" type="button">Tee admin</button>
                  <button class="ghost-button" data-action="set-role" data-member-id="${member.id}" data-role="member" type="button">Tee jäsen</button>
                </div>
              `
              : ""
          }
        </article>
      `
    )
    .join("");
}

function renderReportForm(settings) {
  const form = document.getElementById("report-form");
  form.smtpHost.value = settings?.smtpHost || "";
  form.smtpPort.value = settings?.smtpPort || "";
  form.smtpUser.value = settings?.smtpUser || "";
  form.smtpPass.value = settings?.smtpPass || "";
  form.fromEmail.value = settings?.fromEmail || "";
  form.recipients.value = (settings?.recipients || []).join(", ");
  form.smtpSecure.checked = Boolean(settings?.smtpSecure);
}

function renderReportHistory(history) {
  if (!history.length) {
    reportHistory.innerHTML = '<article class="mini-card"><p>Ei raporttihistoriaa.</p></article>';
    return;
  }

  reportHistory.innerHTML = history
    .map(
      (entry) => `
        <article class="mini-card">
          <strong>${escapeHtml(entry.status)}</strong>
          <p>${escapeHtml(entry.message || "Ei viestiä")}</p>
          <p>${formatDate(entry.createdAt)} • vastaanottajia ${entry.recipientCount}</p>
        </article>
      `
    )
    .join("");
}

function renderLumixPanel() {
  const agent = state.bootstrap?.lumix?.agent;
  const catalog = getIntakeCatalog();
  const model = state.bootstrap?.lumix?.model;
  const codex = state.bootstrap?.lumix?.codex;
  if (!agent) {
    lumixSummary.textContent = "Lumix-data latautuu...";
    lumixCodex.innerHTML = '<article class="mini-card"><p>Ei dataa vielä.</p></article>';
    return;
  }

  lumixSummary.textContent = `${agent.name} auttaa pitämään flow’n selkeänä.`;
  lumixCodex.innerHTML = `
    <article class="mini-card">
      <strong>${escapeHtml(agent.name)}</strong>
      <p>${escapeHtml(agent.summary)}</p>
    </article>
    <article class="mini-card">
      <strong>Miten Lumix auttaa</strong>
      <p>${escapeHtml(codex?.intro || "")}</p>
    </article>
    <article class="mini-card">
      <strong>Rakenne</strong>
      <p>
        objektit ${model?.objects?.length || 0},
        linkit ${model?.links?.length || 0},
        actionit ${model?.actions?.length || 0}
      </p>
    </article>
    <article class="mini-card">
      <strong>Ontologian runko</strong>
      <p>
        yritystyypit ${catalog.businessType.length},
        tarjoomat ${catalog.offerType.length},
        yleisöt ${catalog.audienceType.length},
        tavoitteet ${catalog.goalType.length}
      </p>
    </article>
  `;
}

function renderSeo(seo) {
  if (!seo) return '<p class="body-copy">SEO-pakettia ei ole vielä luotu.</p>';
  return `
    <div class="seo-grid">
      <div class="seo-item">
        <span>Otsikko</span>
        <strong>${escapeHtml(seo.title)}</strong>
      </div>
      <div class="seo-item">
        <span>Kuvaus</span>
        <strong>${escapeHtml(seo.metaDescription)}</strong>
      </div>
      <div class="seo-item">
        <span>Avainsanat</span>
        <strong>${escapeHtml(seo.keywords.join(", "))}</strong>
      </div>
      <div class="seo-item">
        <span>Slug</span>
        <strong>/${escapeHtml(seo.slug)}</strong>
      </div>
    </div>
  `;
}

function renderBlogs(blogs) {
  if (!blogs.length) return '<p class="body-copy">Ei blogiluonnoksia vielä.</p>';
  return blogs
    .map(
      (blog) => `
        <article class="blog-card">
          <strong>${escapeHtml(blog.title)}</strong>
          <p>${escapeHtml(blog.keyword)}</p>
          <p>${escapeHtml(blog.excerpt)}</p>
        </article>
      `
    )
    .join("");
}

function renderSelectOptions(options, selectedValue, placeholder) {
  const rows = [];

  if (placeholder) {
    rows.push(`<option value="">${escapeHtml(placeholder)}</option>`);
  }

  return rows
    .concat(
      options.map(
        ({ value, label }) =>
          `<option value="${escapeHtml(value)}"${selectedValue === value ? " selected" : ""}>${escapeHtml(label)}</option>`
      )
    )
    .join("");
}

function renderIntake(client) {
  const publishState = client.publishHistory.length ? "Julkaistu" : "Kesken";
  const nextStep = getNextStep(client);
  const profile = client.businessProfile || {};
  const notes = profile.rawNotes?.notes || "";
  const intakeCatalog = getIntakeCatalog();

  return `
    <div class="stage-card client-stage-card" data-guide="intake">
      <div class="primary-card-top">
        <div>
          <span class="section-kicker">Client</span>
          <h4>${escapeHtml(client.businessName)}</h4>
          <p class="body-copy">${escapeHtml(client.description)}</p>
        </div>
        <div class="primary-card-meta">
          <span class="client-status">${escapeHtml(client.billingStatus)}</span>
          <span class="client-status">${escapeHtml(publishState)}</span>
        </div>
      </div>

      <div class="flow-strip compact-stat-strip">
        <span class="flow-pill">Paketti ${escapeHtml(client.plan)}</span>
        <span class="flow-pill">Rytmi ${client.generationIntervalDays} pv</span>
        <span class="flow-pill">Liidit ${client.analytics.leadSubmits}</span>
      </div>

      <div class="next-step-card">
        <span class="section-kicker">${escapeHtml(nextStep.title)}</span>
        <strong>${escapeHtml(nextStep.text)}</strong>
      </div>

      <div class="section-head section-head-compact">
        <div>
          <span class="section-kicker">Asiakastiedot</span>
          <h5>Pidä perusrunko ajan tasalla</h5>
        </div>
        <p>Päivitä nämä ennen strategiaa ja generointia.</p>
      </div>

      <form class="stack-form intake-form intake-form-card" data-intake-form>
        <div class="inline-grid">
          <label>
            <span>Yritystyyppi</span>
            <select name="businessType">
              ${renderSelectOptions(
                intakeCatalog.businessType,
                profile.businessType || "",
                "Valitse yritystyyppi"
              )}
            </select>
          </label>
          <label>
            <span>Kohderyhmä</span>
            <select name="audienceType">
              ${renderSelectOptions(
                intakeCatalog.audienceType,
                profile.audienceType || "",
                "Valitse kohderyhmä"
              )}
            </select>
          </label>
        </div>

        <div class="inline-grid">
          <label>
            <span>Päätavoite</span>
            <select name="goalType">
              ${renderSelectOptions(intakeCatalog.goalType, profile.goalType || "", "Valitse tavoite")}
            </select>
          </label>
          <label>
            <span>Pää-CTA</span>
            <input
              name="mainCta"
              placeholder="Pyydä tarjous / Varaa aika / Ota yhteyttä"
              value="${escapeHtml(profile.mainCta || "")}"
            />
          </label>
        </div>

        <details class="stage-subdetails">
          <summary>Lisää tietoja</summary>

          <div class="inline-grid">
            <label>
              <span>Tarjooma</span>
              <select name="offerType">
                ${renderSelectOptions(intakeCatalog.offerType, profile.offerType || "", "Valitse tarjooma")}
              </select>
            </label>
            <label>
              <span>Sävy</span>
              <select name="toneType">
                ${renderSelectOptions(intakeCatalog.toneType, profile.toneType || "", "Valitse sävy")}
              </select>
            </label>
          </div>

          <div class="inline-grid">
            <label>
              <span>Hintataso</span>
              <select name="pricePosition">
                ${renderSelectOptions(
                  intakeCatalog.pricePosition,
                  profile.pricePosition || "",
                  "Valitse hintataso"
                )}
              </select>
            </label>
            <label>
              <span>Alue / markkina</span>
              <input
                name="geoFocus"
                placeholder="Helsinki, Suomi, verkossa..."
                value="${escapeHtml(profile.geoFocus || "")}"
              />
            </label>
          </div>

          <label>
            <span>Lisähuomiot</span>
            <textarea name="notes" rows="4" placeholder="Kirjoita tähän vapaasti, jos asiakas ei tiedä vielä kaikkea tarkasti.">${escapeHtml(notes)}</textarea>
          </label>
        </details>

        <button type="submit" class="ghost-button">Tallenna tiedot</button>
      </form>
    </div>
  `;
}

function renderRecommendation(client) {
  const recommendation = client.strategyRecommendation;

  if (!hasProfile(client)) {
    return `
      <div class="stage-card stage-card-locked strategy-stage-card" data-guide="recommend">
        <div class="section-head">
          <div>
            <span class="section-kicker">Strategy</span>
            <h4>Suunta lukittuna</h4>
          </div>
          <p>Client-kortti kesken.</p>
        </div>
        <p class="body-copy">Täydennä ensin yrityksen tiedot, niin strategia voidaan muodostaa tähän kohtaan.</p>
      </div>
    `;
  }

  if (!recommendation) {
    return `
      <div class="stage-card strategy-stage-card" data-guide="recommend">
        <div class="section-head">
          <div>
            <span class="section-kicker">Strategy</span>
            <h4>Valitse suunta</h4>
          </div>
          <p>Lukitse viesti ennen generointia.</p>
        </div>

        <p class="body-copy">Lumix ehdottaa positioningin, CTA:n ja sisältökulmat yhdellä pyynnöllä.</p>

        <div class="stage-actions stage-actions-inline">
          <button type="button" data-action="recommend" class="ghost-button">Pyydä strategia</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="stage-card strategy-stage-card" data-guide="recommend">
      <div class="section-head">
        <div>
          <span class="section-kicker">Strategy</span>
          <h4>Ehdotus valmis</h4>
        </div>
        <p>Pidä tämä koko ajan näkyvissä generoinnin tukena.</p>
      </div>

      <div class="result-two-up strategy-core-grid">
        <div class="meta-box">
          <strong>Positioning</strong>
          <p>${escapeHtml(recommendation.positioning)}</p>
        </div>
        <div class="meta-box">
          <strong>Pääpalvelu</strong>
          <p>${escapeHtml(recommendation.primaryOffer)}</p>
        </div>
        <div class="meta-box">
          <strong>CTA</strong>
          <p>${escapeHtml(recommendation.ctaStrategy)}</p>
        </div>
      </div>

      <div class="strategy-list strategy-list-inline">
        <div class="seo-item">
          <span>Pääkohderyhmä</span>
          <strong>${escapeHtml(recommendation.primaryAudience)}</strong>
        </div>
        <div class="seo-item">
          <span>Sisältökulmat</span>
          <strong>${escapeHtml((recommendation.contentAngles || []).join(", "))}</strong>
        </div>
        <div class="seo-item">
          <span>Etusivun rakenne</span>
          <strong>${escapeHtml((recommendation.homepageStructure || []).join(" -> "))}</strong>
        </div>
      </div>

      <div class="stage-actions stage-actions-inline">
        <button type="button" data-action="recommend" class="ghost-button">Päivitä strategia</button>
      </div>
    </div>
  `;
}

function renderPublishTargets(client) {
  if (!client.publishTargets.length) return '<p class="body-copy">Ei julkaisukanavia vielä.</p>';
  return client.publishTargets
    .map(
      (target) => `
        <article class="mini-card">
          <div>
            <strong>${escapeHtml(target.name)}</strong>
            <p>${escapeHtml(target.platform)} • ${target.autoPublish ? "automaattinen julkaisu" : "vain manuaalinen julkaisu"}</p>
            <p>Viimeksi julkaistu: ${formatDate(target.lastPublishedAt)}</p>
          </div>
          <div class="mini-actions">
            <button class="ghost-button" data-action="publish-target" data-target-id="${target.id}" type="button">Julkaise</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderPublishHistory(client) {
  if (!client.publishHistory.length) return '<p class="body-copy">Ei julkaisuhistoriaa vielä.</p>';
  return `
    <ul class="history-list">
      ${client.publishHistory
        .map(
          (entry) => `
            <li>${escapeHtml(entry.status)} • target ${entry.publishTargetId} • ${formatDate(entry.createdAt)}${entry.message ? ` • ${escapeHtml(entry.message)}` : ""}</li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderLeads(leads) {
  if (!leads.length) return '<p class="body-copy">Ei liidejä vielä.</p>';
  return leads
    .map(
      (lead) => `
        <article class="mini-card">
          <strong>${escapeHtml(lead.email)}</strong>
          <p>${escapeHtml(lead.name || "Anonymous")} • ${formatDate(lead.createdAt)}</p>
          <p>${escapeHtml(lead.message || "")}</p>
        </article>
      `
    )
    .join("");
}

function renderLumixTimeline(client) {
  const action = lumixActionState.get(client.id);
  const stages = [
    {
      key: "recommend",
      label: "Suunta",
      status: client.strategyRecommendation ? "done" : "idle",
      meta: client.strategyRecommendation ? "ehdotus valmis" : "odottaa"
    },
    {
      key: "generate",
      label: "Sisältö",
      status: hasContent(client) ? "done" : "idle",
      meta: client.lastGenerationAt ? `viimeksi ${formatDate(client.lastGenerationAt)}` : "odottaa"
    },
    {
      key: "publish",
      label: "Julkaisu",
      status: client.publishHistory.length ? "done" : "idle",
      meta: client.publishTargets.length ? `${client.publishTargets.length} kanavaa` : "ei kanavaa"
    }
  ];

  if (action?.action === "recommend_strategy") {
    stages[0].status = "active";
    stages[0].meta = "Lumix päivitti suuntaa";
  } else if (action?.action === "generate_pack") {
    stages[1].status = "active";
    stages[1].meta = "Sisältö lisättiin jonoon";
  } else if (action?.action === "publish_pack") {
    stages[2].status = "active";
    stages[2].meta = "Julkaisu lisättiin jonoon";
  }

  return `
    <div class="lumix-timeline">
      ${stages
        .map(
          (stage, index) => `
            <article class="timeline-step timeline-step-${stage.status}">
              <span class="timeline-index">${index + 1}</span>
              <strong>${escapeHtml(stage.label)}</strong>
              <p>${escapeHtml(stage.meta)}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderGenerateStage(client) {
  if (!client.strategyRecommendation) {
    return `
      <div class="stage-card stage-card-locked generate-stage-card" data-guide="generate">
        <div class="section-head">
          <div>
            <span class="section-kicker">Generate</span>
            <h4>Generointi lukittuna</h4>
          </div>
          <p>Strategy puuttuu.</p>
        </div>
        <p class="body-copy">Pyydä ensin strategia, jotta generointi tapahtuu oikeaan suuntaan.</p>
      </div>
    `;
  }

  return `
    <div class="stage-card generate-stage-card" data-guide="generate">
      <div class="section-head">
        <div>
          <span class="section-kicker">Generate</span>
          <h4>Generoi uusi paketti</h4>
        </div>
        <p>Päivitä sivu, blogit ja SEO samalla napilla.</p>
      </div>

      <div class="stage-actions stage-actions-inline">
        <button type="button" data-action="generate" data-guide="generate">Generoi sisältö</button>
        <a class="ghost-link compact-link" href="/client/${client.id}" target="_blank" rel="noopener">Avaa sivu</a>
      </div>

      <div class="flow-strip compact-stat-strip">
        <span class="flow-pill">Sivu ${client.website?.html ? "valmis" : "kesken"}</span>
        <span class="flow-pill">Blogit ${client.blogs.length}</span>
        <span class="flow-pill">SEO ${client.seo ? "valmis" : "kesken"}</span>
      </div>

      <p class="body-copy generate-stage-note">
        ${
          client.lastGenerationAt
            ? `Viimeisin generointi ${formatDate(client.lastGenerationAt)}.`
            : "Tähän syntyy ensimmäinen valmis sisältöpaketti generoinnin jälkeen."
        }
      </p>
    </div>
  `;
}

function renderPreviewStage(client) {
  if (!hasContent(client)) {
    return `
      <div class="stage-card stage-card-locked preview-stage-card">
        <div class="section-head">
          <div>
            <span class="section-kicker">Preview</span>
            <h4>Esikatselu odottaa</h4>
          </div>
          <p>Ei sisältöä vielä.</p>
        </div>
        <p class="body-copy">
          ${client.strategyRecommendation ? "Generoi ensin sisältö, niin preview aukeaa tähän suoraan." : "Tee ensin strategia ja generoi sitten sisältö."}
        </p>
      </div>
    `;
  }

  const visibleBlogs = client.blogs.slice(0, 2);

  return `
    <div class="stage-card preview-stage-card">
      <div class="section-head">
        <div>
          <span class="section-kicker">Preview</span>
          <h4>Näe mitä asiakkaalle syntyi</h4>
        </div>
        <p>Landing page, blogit ja SEO samassa kortissa.</p>
      </div>

      <div class="preview-main-panel">
        <span class="section-kicker">Landing page</span>
        <div class="site-frame stage-preview-frame">
          <div class="generated-site">${client.website?.html || '<p class="body-copy">Sivua ei ole vielä generoitu.</p>'}</div>
        </div>
      </div>

      <div class="preview-support-grid">
        <div class="preview-support-panel">
          <span class="section-kicker">Blogit</span>
          <div class="blog-grid">${renderBlogs(visibleBlogs)}</div>
          ${
            client.blogs.length > visibleBlogs.length
              ? `<p class="body-copy">Näytetään ${visibleBlogs.length}/${client.blogs.length} blogia.</p>`
              : ""
          }
        </div>
        <div class="preview-support-panel">
          <span class="section-kicker">SEO</span>
          ${renderSeo(client.seo)}
        </div>
      </div>
    </div>
  `;
}

function renderPublishStage(client) {
  if (!hasContent(client)) {
    return `
      <div class="stage-card stage-card-locked">
        <div class="section-head">
          <div>
            <span class="section-kicker">Vaihe 4</span>
            <h4>Julkaise</h4>
          </div>
          <p>Odottaa vaihetta 3.</p>
        </div>
        <p class="body-copy">Generoi ensin sisältö.</p>
      </div>
    `;
  }

  return `
    <div class="stage-card">
      <div class="section-head">
        <div>
          <span class="section-kicker">Vaihe 4</span>
          <h4>Julkaise</h4>
        </div>
        <p>Vie sisältö ulos.</p>
      </div>
      <p class="body-copy stage-inline-note">
        ${
          client.publishTargets.length
            ? `Julkaisukanavia ${client.publishTargets.length}.`
            : "Julkaisukanavaa ei ole vielä lisätty."
        }
        ${client.publishHistory.length ? ` Viimeisin julkaisu ${formatDate(client.publishHistory[0].createdAt)}.` : ""}
      </p>

      ${
        client.publishTargets.length
          ? `
            <div class="stage-actions">
              <button type="button" data-action="publish-all" data-guide="publish">Julkaise sisältö</button>
            </div>
          `
          : `
            <p class="body-copy">Lisää ensin yksi julkaisukanava lisäasetuksista. Sen jälkeen julkaisu onnistuu tästä.</p>
          `
      }

      ${
        client.publishHistory.length
          ? `
            <details class="stage-subdetails">
              <summary>Näytä julkaisuhistoria</summary>
              ${renderPublishHistory(client)}
            </details>
          `
          : ""
      }
    </div>
  `;
}

function renderLeadsStage(client) {
  const leadPreview = client.leads.slice(0, 3);

  return `
    <div class="stage-card">
      <div class="section-head">
        <div>
          <span class="section-kicker">Vaihe 5</span>
          <h4>Liidit</h4>
        </div>
        <p>Näe tulos yhdellä silmäyksellä.</p>
      </div>

      <div class="flow-strip compact-stat-strip">
        <span class="flow-pill">Näytöt ${client.analytics.pageViews}</span>
        <span class="flow-pill">CTA ${client.analytics.ctaClicks}</span>
        <span class="flow-pill">Liidit ${client.analytics.leadSubmits}</span>
      </div>

      <details class="stage-subdetails" open data-guide="leads">
        <summary>Viimeisimmät liidit</summary>
        <div class="mini-list">
          ${leadPreview.length ? renderLeads(leadPreview) : '<p class="body-copy">Kun sivulla tehdään yhteydenottoja, ne näkyvät täällä.</p>'}
        </div>
      </details>
    </div>
  `;
}

function renderClientExtras(client) {
  const history = client.generationHistory.length
    ? `
        <ul class="history-list">
          ${client.generationHistory
            .map(
              (entry) => `
                <li>${escapeHtml(entry.status)} • ${escapeHtml(entry.mode)} • ${formatDate(entry.createdAt)}${entry.message ? ` • ${escapeHtml(entry.message)}` : ""}</li>
              `
            )
            .join("")}
        </ul>
      `
    : '<p class="body-copy">Ei generointihistoriaa vielä.</p>';

  const lumixAction = lumixActionState.get(client.id);

  return `
    <details class="panel client-ops-panel">
      <summary>Lisäasetukset</summary>

      <div class="client-extra-stack" data-client-id="${client.id}">
        <div class="editor-frame ops-box">
          <h4>Ohje agentille</h4>
          <p class="body-copy">Tallenna tähän vain asiakaskohtaiset lisätoiveet.</p>
          <textarea data-prompt-editor rows="4" placeholder="Asiakaskohtaiset ohjeet">${escapeHtml(client.customPrompt || "")}</textarea>
          <button type="button" data-action="save-prompt" class="ghost-button">Tallenna ohje</button>
        </div>

        <div class="ops-compartment-grid">
          <div class="publish-frame ops-box" data-guide="publish-settings">
            <h4>Julkaisukanavat</h4>
            <p class="body-copy">Lisää yksi kanava kerrallaan. Tekninen config on piilotettu alemmas.</p>
            <div class="mini-list">${renderPublishTargets(client)}</div>
            <form class="stack-form target-form" data-target-form>
              <label>
                <span>Kanavan nimi</span>
                <input name="name" placeholder="Pääblogi" required />
              </label>
              <div class="inline-grid">
                <label>
                  <span>Alusta</span>
                  <select name="platform">
                    <option value="wordpress">WordPress</option>
                    <option value="webflow">Webflow</option>
                  </select>
                </label>
                <label>
                  <span>Osoite</span>
                  <input name="baseUrl" placeholder="https://example.com" />
                </label>
              </div>
              <label class="checkbox-row">
                <input name="autoPublish" type="checkbox" />
                <span>Julkaise automaattisesti</span>
              </label>

              <details class="stage-subdetails">
                <summary>Lisää tekniset tiedot</summary>

                <div class="inline-grid">
                  <label>
                    <span>Käyttäjä</span>
                    <input name="username" placeholder="api-user" />
                  </label>
                  <label>
                    <span>Salasana / app password</span>
                    <input name="applicationPassword" placeholder="application password" />
                  </label>
                </div>

                <div class="inline-grid">
                  <label>
                    <span>Status</span>
                    <input name="status" placeholder="draft / published" />
                  </label>
                  <label>
                    <span>API token</span>
                    <input name="apiToken" placeholder="Webflow token" />
                  </label>
                </div>

                <div class="inline-grid">
                  <label>
                    <span>Site ID</span>
                    <input name="siteId" placeholder="webflow-site-id" />
                  </label>
                  <label>
                    <span>Collection ID</span>
                    <input name="collectionId" placeholder="webflow-collection-id" />
                  </label>
                </div>
              </details>

              <button type="submit" class="ghost-button">Lisää kanava</button>
            </form>
          </div>

          <div class="history-frame ops-box">
            <h4>Historia ja tila</h4>
            <p class="body-copy">Täältä näet mitä järjestelmä on tehnyt ja mikä tila asiakkaalla on.</p>
            <div class="split-history">
              <div>
                <span class="section-kicker">Generointihistoria</span>
                ${history}
              </div>
              <div>
                <span class="section-kicker">Julkaisuhistoria</span>
                ${renderPublishHistory(client)}
              </div>
            </div>
            ${
              client.subscription
                ? `<p class="body-copy">Tilaus: ${escapeHtml(client.subscription.status)}${client.subscription.currentPeriodEnd ? ` asti ${formatDate(client.subscription.currentPeriodEnd)}` : ""}</p>`
                : '<p class="body-copy">Ei Stripe-tilausta tallennettuna.</p>'
            }
          </div>
        </div>

        <div class="ops-compartment-grid">
          <div class="meta-box extra-actions-box ops-box">
            <strong>Hallinta</strong>
            <p>Harvemmin käytettävät toiminnot ovat täällä.</p>
            <div class="stack-actions">
              <button type="button" data-action="toggle-schedule" class="ghost-button">
                ${client.scheduleEnabled ? "Pysäytä ajastus" : "Jatka ajastusta"}
              </button>
              <button type="button" data-action="checkout" class="ghost-button">Avaa checkout</button>
            </div>
          </div>

          <details class="meta-box extra-actions-box ops-box debug-box">
            <summary>Lumix debug</summary>
            ${
              lumixAction
                ? `
                  <div class="lumix-action-card">
                    <strong>${escapeHtml(lumixAction.action)}</strong>
                    <p>Objektit: ${lumixAction.objectCount} • Linkit: ${lumixAction.linkCount}</p>
                    ${
                      lumixAction.ready !== undefined
                        ? `<p>Valmis ajoon: ${lumixAction.ready ? "kyllä" : "ei"}</p>`
                        : ""
                    }
                    ${
                      lumixAction.targetCount !== undefined
                        ? `<p>Julkaisukohteet: ${lumixAction.targetCount}</p>`
                        : ""
                    }
                  </div>
                `
                : '<p class="body-copy">Ei viimeisintä Lumix-debugia vielä.</p>'
            }
          </details>
        </div>
      </div>
    </details>
  `;
}

function renderEmptyWorkspace() {
  activeClientView.innerHTML = `
    <article class="panel workflow-empty">
      <div class="panel-head">
        <div>
          <span class="section-kicker">Aloita tästä</span>
          <h2>Luo ensimmäinen asiakas</h2>
        </div>
        <p>Tähän avautuu yksi selkeä flow: tiedot, suunta, sisältö, julkaisu ja liidit.</p>
      </div>

      <div class="flow-strip">
        <span class="flow-pill">1. Yrityksen tiedot</span>
        <span class="flow-pill">2. Lumixin ehdotus</span>
        <span class="flow-pill">3. Luo sisältö</span>
        <span class="flow-pill">4. Julkaise</span>
        <span class="flow-pill">5. Liidit</span>
      </div>

      <div class="next-step-card">
        <span class="section-kicker">Lumix</span>
        <strong>Lumix ei ole erillinen chat. Se ohjaa tätä flow’ta vaihe vaiheelta.</strong>
        <div class="stage-actions">
          <button type="button" class="ghost-button" data-empty-action="lumix">Käynnistä Lumix</button>
        </div>
      </div>
    </article>
  `;
}

function renderClientSelector(clients) {
  clientsCaption.textContent = formatClientCount(clients.length);

  if (!clients.length) {
    clientsList.innerHTML = '<article class="mini-card"><p>Ei asiakkaita vielä.</p></article>';
    renderEmptyWorkspace();
    return;
  }

  const activeId = state.activeClientId;

  clientsList.innerHTML = clients
    .map(
      (client) => {
        const statusLabel = !hasProfile(client)
          ? "Aloita tiedoista"
          : !client.strategyRecommendation
            ? "Pyydä suunta"
            : !hasContent(client)
              ? "Generoi sisältö"
              : !client.publishHistory.length
                ? "Julkaise"
                : "Seuraa liidejä";

        return `
        <button
          type="button"
          class="client-selector-button${client.id === activeId ? " client-selector-button-active" : ""}"
          data-client-select="${client.id}"
        >
          <div class="client-selector-row">
            <strong>${escapeHtml(client.businessName)}</strong>
            <span class="client-selector-status">${escapeHtml(statusLabel)}</span>
          </div>
        </button>
      `;
      }
    )
    .join("");
}

function renderActiveClient(client) {
  activeClientView.innerHTML = `
    <article class="panel workflow-card" data-client-id="${client.id}">
      <div class="workflow-header workflow-header-compact">
        <div>
          <span class="section-kicker">Aktiivinen asiakas</span>
          <h2>Client, Strategy, Generate, Preview</h2>
          <p class="body-copy">Pidä tärkein työ näkyvissä yhdessä näkymässä. Publish ja liidit jäävät tämän alle.</p>
        </div>
      </div>

      <div class="dashboard-primary-grid">
        ${renderIntake(client)}
        ${renderRecommendation(client)}
        ${renderGenerateStage(client)}
        ${renderPreviewStage(client)}
      </div>

      <div class="dashboard-secondary-grid">
        ${renderPublishStage(client)}
        ${renderLeadsStage(client)}
      </div>
    </article>

    ${renderClientExtras(client)}
  `;
}

function render() {
  if (!state.bootstrap) return;

  const clients = state.bootstrap.clients || [];
  syncActiveClientId(clients);

  renderHealth(state.bootstrap.health);
  renderSummary(state.bootstrap.summary);
  renderJobs(state.bootstrap.jobs || []);
  renderTeam(state.bootstrap.members || []);
  renderReportForm(state.bootstrap.reportSettings);
  renderReportHistory(state.bootstrap.reportHistory || []);
  renderLumixPanel();

  agencyTitle.textContent = `${state.bootstrap.user.agencyName}`;
  document.getElementById("team-form").classList.toggle("hidden", state.bootstrap.user.role === "member");
  document.getElementById("report-form").classList.toggle("hidden", state.bootstrap.user.role === "member");
  document.getElementById("send-report-button").classList.toggle("hidden", state.bootstrap.user.role === "member");

  renderClientSelector(clients);

  const activeClient = getActiveClient();
  if (activeClient) {
    renderActiveClient(activeClient);
  } else {
    renderEmptyWorkspace();
  }

  if (!state.tourInitialized) {
    state.tourInitialized = true;
    state.tourActive = false;
    state.tourStepIndex = 0;
  }

  renderCoach(activeClient);

  if (state.tourActive) {
    const tourSteps = getTourSteps(activeClient);
    const step = tourSteps[Math.min(state.tourStepIndex, Math.max(tourSteps.length - 1, 0))];
    if (step) {
      highlightGuideTarget(step.target);
    }
  }
}

async function refresh() {
  state.bootstrap = await api("/api/bootstrap");

  if (!state.bootstrap.authenticated) {
    window.location.href = "/login";
    return;
  }

  render();
}

document.getElementById("logout-button").addEventListener("click", async () => {
  await runAction("Kirjaudutaan ulos...", async () => {
    await api("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  });
});

document.getElementById("client-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const raw = readForm(form);
  const payload = {
    businessName: raw.businessName,
    description: raw.description,
    customPrompt: raw.customPrompt,
    plan: raw.plan,
    generationIntervalDays: Number(raw.generationIntervalDays),
    autoGenerate: Boolean(raw.autoGenerate),
    scheduleEnabled: Boolean(raw.scheduleEnabled)
  };

  await runAction(`Luodaan asiakasta ${payload.businessName}...`, async () => {
    const result = await api("/api/clients", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    form.reset();
    state.activeClientId = result.client?.id || state.activeClientId;
    setStatus(result.job ? `Asiakas luotu. Generointi lisätty jonoon (#${result.job.id}).` : "Asiakas luotu.");
    await refresh();
  });
});

document.getElementById("team-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const raw = readForm(form);

  await runAction(`Lisätään jäsentä ${raw.email}...`, async () => {
    await api("/api/team-members", {
      method: "POST",
      body: JSON.stringify(raw)
    });
    form.reset();
    await refresh();
  });
});

document.getElementById("report-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const raw = readForm(event.currentTarget);

  await runAction("Tallennetaan raporttiasetuksia...", async () => {
    await api("/api/reports/settings", {
      method: "PUT",
      body: JSON.stringify(raw)
    });
    await refresh();
  });
});

document.getElementById("send-report-button").addEventListener("click", async () => {
  await runAction("Lisätään raportti jonoon...", async () => {
    const result = await api("/api/reports/send", { method: "POST" });
    setStatus(`Raportti lisätty jonoon (#${result.job.id}).`);
    await refresh();
  });
});

document.getElementById("scheduler-button").addEventListener("click", async () => {
  await runAction("Ajetaan ajastettuja töitä...", async () => {
    const result = await api("/api/scheduler/run-now", { method: "POST" });
    setStatus(`Ajastus lisäsi ${result.results.length} työtä jonoon.`);
    await refresh();
  });
});

document.getElementById("worker-button").addEventListener("click", async () => {
  await runAction("Ajetaan jono nyt...", async () => {
    const result = await api("/api/worker/run-now", { method: "POST" });
    setStatus(`Jono käsitteli ${result.results.length} työtä.`);
    await refresh();
  });
});

teamList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action='set-role']");
  if (!button) return;

  await runAction("Päivitetään käyttäjän roolia...", async () => {
    await api(`/api/team-members/${button.dataset.memberId}`, {
      method: "PATCH",
      body: JSON.stringify({ role: button.dataset.role })
    });
    await refresh();
  });
});

clientsList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-client-select]");
  if (!button) return;
  state.activeClientId = Number(button.dataset.clientSelect);
  render();
});

activeClientView.addEventListener("submit", async (event) => {
  const intakeForm = event.target.closest("form[data-intake-form]");
  if (intakeForm) {
    event.preventDefault();

    const clientId = Number(intakeForm.closest("[data-client-id]")?.dataset.clientId);
    const raw = readForm(intakeForm);

    await runAction("Tallennetaan yrityksen tietoja...", async () => {
      await api(`/api/clients/${clientId}/intake`, {
        method: "PUT",
        body: JSON.stringify(raw)
      });
      setStatus("Yrityksen tiedot tallennettu.");
      await refresh();
    });
    return;
  }

  const form = event.target.closest("form[data-target-form]");
  if (!form) return;
  event.preventDefault();

  const clientId = Number(form.closest("[data-client-id]")?.dataset.clientId);
  const raw = readForm(form);
  const config = buildPublishConfig(raw);

  await runAction(`Lisätään julkaisukanava asiakkaalle #${clientId}...`, async () => {
    await api(`/api/clients/${clientId}/publish-targets`, {
      method: "POST",
      body: JSON.stringify({
        name: raw.name,
        platform: raw.platform,
        autoPublish: Boolean(raw.autoPublish),
        config
      })
    });
    form.reset();
    await refresh();
  });
});

activeClientView.addEventListener("click", async (event) => {
  const emptyActionButton = event.target.closest("button[data-empty-action='lumix']");
  if (emptyActionButton) {
    activateLumix();
    return;
  }

  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const root = button.closest("[data-client-id]");
  const clientId = Number(root?.dataset.clientId);
  if (!clientId) return;

  const client = state.bootstrap.clients.find((item) => item.id === clientId);
  const action = button.dataset.action;

  if (action === "generate") {
    await runAction(`Generoidaan asiakkaalle ${client.businessName}...`, async () => {
      const result = await api(`/api/clients/${clientId}/generate`, { method: "POST" });
      if (result.lumixAction) {
        lumixActionState.set(clientId, result.lumixAction);
      }
      setStatus(`Generointi lisätty jonoon (#${result.job.id}).`);
      await refresh();
    });
    return;
  }

  if (action === "recommend") {
    await runAction(`Muodostetaan suunta asiakkaalle ${client.businessName}...`, async () => {
      const result = await api(`/api/clients/${clientId}/recommendation`, { method: "POST" });
      if (result.lumixAction) {
        lumixActionState.set(clientId, result.lumixAction);
      }
      setStatus(`Lumixin ehdotus päivitetty asiakkaalle ${client.businessName}.`);
      await refresh();
    });
    return;
  }

  if (action === "toggle-schedule") {
    await runAction(
      `${client.scheduleEnabled ? "Pysäytetään" : "Jatketaan"} ajastusta asiakkaalle ${client.businessName}...`,
      async () => {
        await api(`/api/clients/${clientId}`, {
          method: "PATCH",
          body: JSON.stringify({ scheduleEnabled: !client.scheduleEnabled })
        });
        setStatus(
          `${client.scheduleEnabled ? "Ajastus pysäytetty" : "Ajastus käynnistetty"} asiakkaalle ${client.businessName}.`
        );
        await refresh();
      }
    );
    return;
  }

  if (action === "checkout") {
    await runAction(`Avataan checkout asiakkaalle ${client.businessName}...`, async () => {
      const result = await api(`/api/clients/${clientId}/checkout`, {
        method: "POST",
        body: JSON.stringify({ plan: client.plan })
      });
      if (result.checkout.url) {
        window.open(result.checkout.url, "_blank", "noopener");
        setStatus("Stripe Checkout avattiin uuteen välilehteen.");
      } else {
        setStatus(result.checkout.message || "Stripe ei ole käytössä.");
      }
      await refresh();
    });
    return;
  }

  if (action === "save-prompt") {
    const textarea = root.querySelector("[data-prompt-editor]");
    await runAction(`Tallennetaan ohje asiakkaalle ${client.businessName}...`, async () => {
      await api(`/api/clients/${clientId}`, {
        method: "PATCH",
        body: JSON.stringify({ customPrompt: textarea.value })
      });
      setStatus(`Ohje tallennettu asiakkaalle ${client.businessName}.`);
      await refresh();
    });
    return;
  }

  if (action === "publish-all") {
    await runAction(`Julkaistaan asiakkaan ${client.businessName} sisältö...`, async () => {
      const result = await api(`/api/clients/${clientId}/publish`, {
        method: "POST",
        body: JSON.stringify({})
      });
      if (result.lumixAction) {
        lumixActionState.set(clientId, result.lumixAction);
      }
      setStatus(`Julkaisu lisätty jonoon (#${result.job.id}).`);
      await refresh();
    });
    return;
  }

  if (action === "publish-target") {
    await runAction(`Julkaistaan kohde asiakkaalle ${client.businessName}...`, async () => {
      const result = await api(`/api/clients/${clientId}/publish`, {
        method: "POST",
        body: JSON.stringify({ targetId: Number(button.dataset.targetId) })
      });
      if (result.lumixAction) {
        lumixActionState.set(clientId, result.lumixAction);
      }
      setStatus(`Julkaisu lisätty jonoon (#${result.job.id}).`);
      await refresh();
    });
  }
});

lumixButton.addEventListener("click", () => {
  activateLumix();
});

lumixCoach.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-lumix-form]");
  if (!form) return;
  event.preventDefault();

  const clientId = Number(form.dataset.clientId);
  const raw = readForm(form);

  await runAction("Lumix miettii ideaa...", async () => {
    const result = await api(`/api/clients/${clientId}/lumix-assist`, {
      method: "POST",
      body: JSON.stringify({ message: raw.message })
    });

    lumixAssistState.set(clientId, {
      reply: result.assist?.reply || "",
      suggestedUpdates: result.assist?.suggestedUpdates || null
    });

    form.reset();
    renderCoach(getActiveClient());
  });
});

lumixCoach.addEventListener("click", (event) => {
  const button = event.target.closest("[data-coach-action]");
  if (!button) return;
  const action = button.dataset.coachAction;
  const activeClient = getActiveClient();

  if (action === "focus") {
    highlightGuideTarget(button.dataset.target);
    return;
  }

  if (action === "apply-suggestion") {
    const activeClient = getActiveClient();
    if (!activeClient) return;

    const assist = getLumixAssistState(activeClient.id);
    const updates = assist.suggestedUpdates || {};

    runAction("Lumix päivittää ehdotusta asiakkaalle...", async () => {
      const intakePayload = buildIntakePayloadFromClient(activeClient, updates);
      await api(`/api/clients/${activeClient.id}/intake`, {
        method: "PUT",
        body: JSON.stringify(intakePayload)
      });

      if (updates.customPrompt !== undefined) {
        await api(`/api/clients/${activeClient.id}`, {
          method: "PATCH",
          body: JSON.stringify({ customPrompt: updates.customPrompt })
        });
      }

      setStatus("Lumixin ehdotus lisättiin asiakkaan tietoihin.");
      await refresh();
    });
    return;
  }

  if (action === "start-tour") {
    state.tourActive = true;
    state.tourStepIndex = 0;
    render();
    return;
  }

  if (action === "prev") {
    state.tourStepIndex = Math.max(0, state.tourStepIndex - 1);
    render();
    return;
  }

  if (action === "next") {
    const steps = getTourSteps(activeClient);
    state.tourStepIndex = Math.min(steps.length - 1, state.tourStepIndex + 1);
    render();
    return;
  }

  if (action === "finish" || action === "stop") {
    finishTour();
    renderCoach(activeClient);
  }
});

refresh().catch((error) => {
  setStatus(getErrorMessage(error));
});
