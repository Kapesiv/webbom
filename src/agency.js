import OpenAI from "openai";
import { buildLumixContext, buildLumixPromptHeader } from "./lumix.js";
import { getOpenAiApiKey } from "./openai-config.js";

const generationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    website: {
      type: "object",
      additionalProperties: false,
      properties: {
        headline: { type: "string" },
        subheadline: { type: "string" },
        html: { type: "string" },
        cta: { type: "string" }
      },
      required: ["headline", "subheadline", "html", "cta"]
    },
    seo: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        metaDescription: { type: "string" },
        keywords: {
          type: "array",
          items: { type: "string" }
        },
        slug: { type: "string" },
        internalLinks: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["title", "metaDescription", "keywords", "slug", "internalLinks"]
    },
    blogs: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          keyword: { type: "string" },
          excerpt: { type: "string" },
          html: { type: "string" }
        },
        required: ["title", "keyword", "excerpt", "html"]
      }
    }
  },
  required: ["website", "seo", "blogs"]
};

const lumixAssistSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: { type: "string" },
    suggestedUpdates: {
      type: "object",
      additionalProperties: false,
      properties: {
        businessType: { type: "string" },
        offerType: { type: "string" },
        audienceType: { type: "string" },
        goalType: { type: "string" },
        toneType: { type: "string" },
        geoFocus: { type: "string" },
        pricePosition: { type: "string" },
        mainCta: { type: "string" },
        notes: { type: "string" },
        customPrompt: { type: "string" }
      },
      required: []
    }
  },
  required: ["reply", "suggestedUpdates"]
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function parseJsonOutput(outputText) {
  const text = String(outputText || "").trim();
  const parseWithRepairs = (value) =>
    JSON.parse(
      String(value)
        .replace(/,\s*([}\]])/g, "$1")
        .trim()
    );

  try {
    return JSON.parse(text);
  } catch {}

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return JSON.parse(fencedMatch[1].trim());
  }

  const objectStart = text.indexOf("{");
  const objectEnd = text.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    return parseWithRepairs(text.slice(objectStart, objectEnd + 1));
  }

  return parseWithRepairs(text);
}

function buildPrompt({ businessName, description, plan, customPrompt }) {
  const lines = [
    buildLumixPromptHeader(),
    "Generate a premium but compact monthly content package for a client.",
    "Keep the output specific, useful, and conversion-focused.",
    "Rules:",
    "- The landing page HTML must use semantic HTML inside one wrapper div.",
    "- No scripts, no styles, no markdown.",
    "- Include a hero, 3 benefit blocks, 1 proof section, and 1 CTA section.",
    "- The page should feel like a premium dark analytics dashboard instead of a generic startup landing page.",
    "- Keep the structure compact, high-contrast, and card-based.",
    "- Use meaningful class names when helpful, for example hero, feature-grid, proof-strip, metric-row, and cta-panel.",
    "- SEO title must be under 60 characters.",
    "- Meta description must be under 160 characters.",
    "- Blog posts should target commercial-intent organic search.",
    "",
    `Business name: ${businessName}`,
    `Business description: ${description}`,
    `Client plan: ${plan}`
  ];

  if (customPrompt) {
    lines.push(`Client-specific instructions: ${customPrompt}`);
  }

  return lines.join("\n");
}

function buildStrategyOverlay(strategyRecommendation) {
  if (!strategyRecommendation) return "";

  const strategy = strategyRecommendation.strategy || strategyRecommendation;
  const contentAngles = Array.isArray(strategy.contentAngles) ? strategy.contentAngles.join(", ") : "";
  const homepageStructure = Array.isArray(strategy.homepageStructure)
    ? strategy.homepageStructure.join(", ")
    : "";

  return [
    "Approved EasyOnlinePresence strategy to follow:",
    `- Positioning: ${strategy.positioning || ""}`,
    `- Primary offer: ${strategy.primaryOffer || ""}`,
    `- Primary audience: ${strategy.primaryAudience || ""}`,
    `- CTA strategy: ${strategy.ctaStrategy || ""}`,
    `- Content angles: ${contentAngles}`,
    `- Homepage structure: ${homepageStructure}`
  ]
    .filter(Boolean)
    .join("\n");
}

function buildLumixAssistPrompt({ client, message }) {
  return [
    buildLumixPromptHeader(),
    "You are answering inside the EasyOnlinePresence mini assistant in the EasyOnlinePresence app.",
    "Reply in Finnish.",
    "Be concise, practical, and helpful.",
    "If the user's idea implies better profile settings, return them in suggestedUpdates.",
    "Only include keys in suggestedUpdates that you can improve confidently from the user's message.",
    "Do not invent complex strategy. Keep this grounded in the existing client context.",
    "",
    "Current client context:",
    buildLumixContext(client),
    "",
    `User idea: ${message}`
  ].join("\n");
}

function buildOpenRouterJsonPrompt(prompt) {
  return `${prompt}\n\nReturn only valid JSON. Do not use markdown fences. Do not add any explanation before or after the JSON.`;
}

function buildDemoLumixAssistResponse({ client, message }) {
  const lower = String(message || "").toLowerCase();
  const suggestedUpdates = {};
  const notes = [];

  if (lower.includes("premium") || lower.includes("luksus") || lower.includes("luxury")) {
    suggestedUpdates.toneType = "premium";
    suggestedUpdates.pricePosition = "premium";
    notes.push("nostetaan sävyä premium-suunnan puolelle");
  }

  if (lower.includes("varaus") || lower.includes("book")) {
    suggestedUpdates.goalType = "bookings";
    suggestedUpdates.mainCta = "Varaa aika";
    notes.push("CTA voidaan ohjata varaukseen");
  } else if (lower.includes("liidi") || lower.includes("tarjous") || lower.includes("contact")) {
    suggestedUpdates.goalType = "lead_generation";
    suggestedUpdates.mainCta = "Pyydä tarjous";
    notes.push("CTA voidaan pitää tarjouspyynnössä");
  }

  if (lower.includes("hotelli") || lower.includes("b2b") || lower.includes("yritys")) {
    suggestedUpdates.businessType = "b2b_service";
    suggestedUpdates.audienceType = "small_businesses";
    notes.push("kohderyhmä näyttää enemmän B2B-puolelta");
  }

  if (lower.includes("verkossa") || lower.includes("online")) {
    suggestedUpdates.geoFocus = "verkossa";
  }

  suggestedUpdates.notes = message;
  suggestedUpdates.customPrompt = `EasyOnlinePresence-idea käyttäjältä: ${message}`;

  const summary =
    notes.length > 0
      ? `Muokkaan tätä ideaa tähän suuntaan: ${notes.join(", ")}.`
      : "Saan tästä ideasta hyvän luonnoksen yrityksen tietoihin ja agentin ohjeeseen.";

  return {
    mode: "demo",
    reply: `${summary} Tarkista ehdotetut muutokset ja paina tarvittaessa “Käytä ehdotusta”.`,
    suggestedUpdates
  };
}

function buildDemoResponse({ businessName, description }) {
  const safeName = escapeHtml(businessName);
  const safeDescription = escapeHtml(description);

  return {
    mode: "demo",
    notice: "OPENAI_API_KEY puuttuu. Sisalto generoitiin demo-tilassa.",
    website: {
      headline: `${businessName} kasvaa ilman raskasta markkinointitiimia`,
      subheadline: "Landing page, SEO ja blogi-ideat yhdesta agentista.",
      cta: "Varaa strategiapalaveri",
      html: sanitizeHtml(`
        <div class="generated-site">
          <section class="hero">
            <p class="eyebrow">EasyOnlinePresence</p>
            <h1>${safeName}</h1>
            <p>${safeDescription}</p>
            <a href="#contact">Varaa demo</a>
            <div class="feature-grid">
              <article>
                <h3>Primary offer</h3>
                <p>Selkea tarjous, nopea suunta ja yksi paakonversio.</p>
              </article>
              <article>
                <h3>SEO-ready</h3>
                <p>Hakukonenakyvyytta tukeva rakenne ilman ylimaarista kohinaa.</p>
              </article>
              <article>
                <h3>Lead path</h3>
                <p>Yhteydenotto johdetaan suoraan oikeaan seuraavaan askeleeseen.</p>
              </article>
            </div>
          </section>
          <section class="proof-strip">
            <h2>Mita asiakas saa joka kuukausi</h2>
            <div class="feature-grid">
              <article>
                <h3>Palvelusivu</h3>
                <p>Selkea viesti, vahva tarjous ja tarkka CTA.</p>
              </article>
              <article>
                <h3>SEO-runko</h3>
                <p>Metaotsikko, metakuvaus ja avainsanarakenne.</p>
              </article>
              <article>
                <h3>3 blogia</h3>
                <p>Hakuintentioon kirjoitetut artikkeliluonnokset.</p>
              </article>
            </div>
          </section>
          <section class="metric-row">
            <h2>Nopea tie liideihin</h2>
            <p>Yksi selkea sivu ja jatkuva julkaisutahti voittavat usein sekavan markkinointipinon.</p>
          </section>
          <section id="contact" class="cta-panel">
            <h2>Seuraava askel</h2>
            <p>Automatisoi sisalto, seuraa konversioita ja iteratoi kuukausittain.</p>
            <a href="#contact">Pyydä tarjous</a>
          </section>
        </div>
      `)
    },
    seo: {
      title: `${businessName} | Kasvuverkossa`,
      metaDescription: `${businessName}: landing page, SEO-rakenne ja jatkuva sisaltokone uusien asiakkaiden hankintaan.`,
      keywords: [
        `${businessName.toLowerCase()} palvelut`,
        `${businessName.toLowerCase()} verkkosivu`,
        "ai markkinointitoimisto",
        "seo palvelu",
        "sisaltokone"
      ],
      slug: businessName.toLowerCase().trim().replaceAll(/\s+/g, "-"),
      internalLinks: ["palvelut", "case-esimerkit", "blogi", "ota-yhteytta"]
    },
    blogs: [
      {
        title: `Miten ${businessName} rakentaa hakukonenakyvyytta 90 paivassa`,
        keyword: `${businessName.toLowerCase()} seo`,
        excerpt: "Kolmen kuukauden runko palvelusivun, sisallontuotannon ja CTA-optimoinnin yhdistamiseen.",
        html: "<p>Aloita yhdella tarkalla palvelusivulla, julkaise kolme relevanttia blogia kuukaudessa ja paivita CTA sen mukaan, mista liidit oikeasti tulevat.</p>"
      },
      {
        title: "Miksi pienen yrityksen kannattaa tuotteistaa markkinointi",
        keyword: "markkinoinnin tuotteistaminen",
        excerpt: "Kun palvelu, lupaus ja tarjous ovat selkeita, myynti nopeutuu huomattavasti.",
        html: "<p>Selkea positiointi ja toistettava sisaltorytmi tekevat markkinoinnista johtamista, eivat satunnaista tekemista.</p>"
      },
      {
        title: "AI-sisaltokone ilman kaaosta",
        keyword: "ai sisaltokone",
        excerpt: "AI toimii parhaiten, kun sille annetaan tarkka kulma, yleiso ja konversiotavoite.",
        html: "<p>Yksi kuukausittainen generointisykli riittaa jo siihen, etta sivu pysyy elavana ja orgaaninen liikenne alkaa kasvaa.</p>"
      }
    ]
  };
}

export function createAgencyService() {
  const baseURL = process.env.OPENAI_BASE_URL;
  const model = process.env.OPENAI_MODEL || "openai/gpt-4o-mini";
  const apiKey = getOpenAiApiKey();
  const client = apiKey ? new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) }) : null;
  const isOpenRouter = baseURL?.includes("openrouter.ai");

  async function generatePack({ businessName, description, plan = "starter", customPrompt = "" }) {
    if (!client) {
      return buildDemoResponse({ businessName, description });
    }

    const prompt = buildPrompt({ businessName, description, plan, customPrompt });
    const parsed = isOpenRouter
      ? parseJsonOutput(
          (
            await client.chat.completions.create({
              model,
              max_tokens: 400,
              messages: [{ role: "user", content: buildOpenRouterJsonPrompt(prompt) }]
            })
          ).choices[0]?.message?.content || ""
        )
      : parseJsonOutput(
          (
            await client.responses.create({
              model,
              max_output_tokens: 4000,
              input: prompt,
              text: {
                format: {
                  type: "json_schema",
                  name: "agency_pack",
                  strict: true,
                  schema: generationSchema
                }
              }
            })
          ).output_text
        );

    return {
      mode: "live",
      notice: `Sisalto generoitu mallilla ${model}.`,
      ...parsed,
      website: {
        ...parsed.website,
        html: sanitizeHtml(parsed.website.html)
      },
      blogs: parsed.blogs.map((blog) => ({
        ...blog,
        html: sanitizeHtml(blog.html)
      }))
    };
  }

  async function generateAllForClient({ client: currentClient }) {
    const customPrompt = [
      currentClient.customPrompt || "",
      buildStrategyOverlay(currentClient.strategyRecommendation),
      buildLumixContext(currentClient)
    ]
      .filter(Boolean)
      .join("\n\n");

    return generatePack({
      businessName: currentClient.businessName,
      description: currentClient.description,
      plan: currentClient.plan || "starter",
      customPrompt
    });
  }

  async function assistLumix({ client: currentClient, message }) {
    if (!client) {
      return buildDemoLumixAssistResponse({ client: currentClient, message });
    }

    const prompt = buildLumixAssistPrompt({ client: currentClient, message });
    const parsed = isOpenRouter
      ? parseJsonOutput(
          (
            await client.chat.completions.create({
              model,
              max_tokens: 250,
              messages: [{ role: "user", content: buildOpenRouterJsonPrompt(prompt) }]
            })
          ).choices[0]?.message?.content || ""
        )
      : parseJsonOutput(
          (
            await client.responses.create({
              model,
              max_output_tokens: 250,
              input: prompt,
              text: {
                format: {
                  type: "json_schema",
                  name: "lumix_assist",
                  strict: true,
                  schema: lumixAssistSchema
                }
              }
            })
          ).output_text
        );
    return {
      mode: "live",
      ...parsed
    };
  }

  return {
    model,
    live: Boolean(client),
    generatePack,
    generateAllForClient,
    assistLumix
  };
}
