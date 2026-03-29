const state = {
  bootstrap: null
};

const authView = document.getElementById("auth-view");
const dashboardView = document.getElementById("dashboard-view");
const summaryGrid = document.getElementById("summary-grid");
const clientsList = document.getElementById("clients-list");
const clientsCaption = document.getElementById("clients-caption");
const agencyTitle = document.getElementById("agency-title");
const statusBanner = document.getElementById("status-banner");
const teamList = document.getElementById("team-list");
const reportHistory = document.getElementById("report-history");
const jobsList = document.getElementById("jobs-list");

function setStatus(message) {
  statusBanner.textContent = message;
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
  if (!isoString) return "Not yet";
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
    ["Clients", summary.totalClients],
    ["Scheduled", summary.scheduledClients],
    ["Paid", summary.paidClients],
    ["Luotu", summary.generatedClients],
    ["Tiimi", summary.teamMembers],
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

function renderPublishTargets(client) {
  if (!client.publishTargets.length) return '<p class="body-copy">Ei julkaisukohteita vielä.</p>';
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

function renderLeads(client) {
  if (!client.leads.length) return '<p class="body-copy">Ei liidejä vielä.</p>';
  return client.leads
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

function renderClient(client) {
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

  return `
    <article class="client-card" data-client-id="${client.id}">
      <div class="client-card-header">
        <div>
          <h3>${escapeHtml(client.businessName)}</h3>
          <p>${escapeHtml(client.description)}</p>
          <p class="body-copy"><a href="/client/${client.id}" target="_blank" rel="noopener">Julkinen sivu</a></p>
        </div>
        <span class="client-status">${escapeHtml(client.billingStatus)}</span>
      </div>

      <div class="client-meta">
        <div class="meta-box">
          <strong>Paketti</strong>
          <p>${escapeHtml(client.plan)}</p>
        </div>
        <div class="meta-box">
          <strong>Rytmi</strong>
          <p>${client.generationIntervalDays} päivää</p>
        </div>
        <div class="meta-box">
          <strong>Näytöt / CTA</strong>
          <p>${client.analytics.pageViews} / ${client.analytics.ctaClicks}</p>
        </div>
        <div class="meta-box">
          <strong>Liidit</strong>
          <p>${client.analytics.leadSubmits}</p>
        </div>
      </div>

      <div class="client-actions">
        <button type="button" data-action="generate">Generoi</button>
        <button type="button" data-action="toggle-schedule" class="ghost-button">
          ${client.scheduleEnabled ? "Pysäytä ajastus" : "Jatka ajastusta"}
        </button>
        <button type="button" data-action="checkout" class="ghost-button">Avaa checkout</button>
        <button type="button" data-action="publish-all" class="ghost-button">Julkaise</button>
      </div>

      <div class="editor-frame">
        <h4>Asiakkaan prompti</h4>
        <textarea data-prompt-editor rows="4" placeholder="Asiakaskohtaiset ohjeet">${escapeHtml(client.customPrompt || "")}</textarea>
        <button type="button" data-action="save-prompt" class="ghost-button">Tallenna</button>
      </div>

      <div class="result-two-up">
        <div class="site-frame">
          <h4>Laskeutumissivu</h4>
          <div class="generated-site">${client.website?.html || '<p class="body-copy">Laskeutumissivua ei ole vielä luotu.</p>'}</div>
        </div>
        <div class="seo-frame">
          <h4>SEO-paketti</h4>
          ${renderSeo(client.seo)}
        </div>
      </div>

      <div class="blog-frame">
        <h4>Blogiluonnokset</h4>
        <div class="blog-grid">${renderBlogs(client.blogs)}</div>
      </div>

      <div class="result-two-up">
        <div class="publish-frame">
          <h4>Julkaisukohteet</h4>
          <div class="mini-list">${renderPublishTargets(client)}</div>
          <form class="stack-form target-form" data-target-form>
            <label>
              <span>Kohteen nimi</span>
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
              <label class="checkbox-row checkbox-row-inline">
                <input name="autoPublish" type="checkbox" />
                <span>Julkaise automaattisesti</span>
              </label>
            </div>
            <label>
              <span>Config JSON</span>
              <textarea name="configJson" rows="6" placeholder='{"baseUrl":"https://example.com","username":"api-user","applicationPassword":"...","status":"draft"}' required></textarea>
            </label>
            <button type="submit" class="ghost-button">Lisää kohde</button>
          </form>
        </div>

        <div class="history-frame">
          <h4>Tapahtumat</h4>
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

      <div class="analytics-frame">
        <h4>Liidit</h4>
        <div class="mini-list">${renderLeads(client)}</div>
      </div>
    </article>
  `;
}

function renderClients(clients) {
  clientsCaption.textContent = `${clients.length} asiakasta`;
  if (!clients.length) {
    clientsList.innerHTML = `
      <article class="panel">
        <div class="panel-head">
          <h2>Ei asiakkaita vielä</h2>
          <p>Luo ensimmäinen asiakas yllä olevalla lomakkeella.</p>
        </div>
      </article>
    `;
    return;
  }
  clientsList.innerHTML = clients.map(renderClient).join("");
}

function render() {
  if (!state.bootstrap) return;
  renderHealth(state.bootstrap.health);

  if (!state.bootstrap.authenticated) {
    authView.classList.remove("hidden");
    dashboardView.classList.add("hidden");
    setStatus("Register or login to open the agency dashboard.");
    return;
  }

  authView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  agencyTitle.textContent = `${escapeHtml(state.bootstrap.user.agencyName)} työpöytä`;
  document.getElementById("team-form").classList.toggle("hidden", state.bootstrap.user.role === "member");
  document.getElementById("report-form").classList.toggle("hidden", state.bootstrap.user.role === "member");
  document.getElementById("send-report-button").classList.toggle("hidden", state.bootstrap.user.role === "member");
  renderSummary(state.bootstrap.summary);
  renderJobs(state.bootstrap.jobs || []);
  renderTeam(state.bootstrap.members || []);
  renderReportForm(state.bootstrap.reportSettings);
  renderReportHistory(state.bootstrap.reportHistory || []);
  renderClients(state.bootstrap.clients);
  setStatus(`Kirjautunut: ${state.bootstrap.user.email} (${state.bootstrap.user.role})`);
}

async function refresh() {
  state.bootstrap = await api("/api/bootstrap");
  render();
}

document.getElementById("register-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  await runAction("Creating owner account...", async () => {
    await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(readForm(form))
    });
    form.reset();
    await refresh();
  });
});

document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  await runAction("Logging in...", async () => {
    await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(readForm(form))
    });
    form.reset();
    await refresh();
  });
});

document.getElementById("logout-button").addEventListener("click", async () => {
  await runAction("Logging out...", async () => {
    await api("/api/auth/logout", { method: "POST" });
    await refresh();
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
  await runAction(`Creating client ${payload.businessName}...`, async () => {
    const result = await api("/api/clients", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    form.reset();
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
  const form = event.currentTarget;
  const raw = readForm(form);

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

  await runAction(`Päivitetään käyttäjän roolia...`, async () => {
    await api(`/api/team-members/${button.dataset.memberId}`, {
      method: "PATCH",
      body: JSON.stringify({ role: button.dataset.role })
    });
    await refresh();
  });
});

clientsList.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-target-form]");
  if (!form) return;
  event.preventDefault();

  const clientId = Number(form.closest("[data-client-id]")?.dataset.clientId);
  const raw = readForm(form);
  let config;
  try {
    config = JSON.parse(raw.configJson);
  } catch {
    setStatus("Julkaisukohteen asetusten pitää olla validia JSONia.");
    return;
  }

  await runAction(`Lisätään julkaisukohde asiakkaalle #${clientId}...`, async () => {
    await api(`/api/clients/${clientId}/publish-targets`, {
      method: "POST",
      body: JSON.stringify({
        name: raw.name,
        platform: raw.platform,
        autoPublish: Boolean(raw.autoPublish),
        config
      })
    })
    await refresh();
  });
});

clientsList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const clientId = Number(event.target.closest("[data-client-id]")?.dataset.clientId);
  if (!clientId) return;

  const client = state.bootstrap.clients.find((item) => item.id === clientId);
  const action = button.dataset.action;

  if (action === "generate") {
    await runAction(`Generoidaan asiakkaalle ${client.businessName}...`, async () => {
      const result = await api(`/api/clients/${clientId}/generate`, { method: "POST" });
      setStatus(`Generointi lisätty jonoon (#${result.job.id}).`);
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
        setStatus(`${client.scheduleEnabled ? "Ajastus pysäytetty" : "Ajastus käynnistetty"} asiakkaalle ${client.businessName}.`);
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
    const textarea = event.target.closest("[data-client-id]").querySelector("[data-prompt-editor]");
    await runAction(`Tallennetaan prompti asiakkaalle ${client.businessName}...`, async () => {
      await api(`/api/clients/${clientId}`, {
        method: "PATCH",
        body: JSON.stringify({ customPrompt: textarea.value })
      });
      setStatus(`Prompti tallennettu asiakkaalle ${client.businessName}.`);
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
      setStatus(`Julkaisu lisätty jonoon (#${result.job.id}).`);
      await refresh();
    });
  }
});

refresh().catch((error) => {
  setStatus(getErrorMessage(error));
});
