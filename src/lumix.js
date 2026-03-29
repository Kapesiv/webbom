const lumixProfile = {
  name: "Lumix",
  role: "Ontology-driven growth agent",
  summary:
    "Lumix auttaa muuttamaan epäselvän briefin rakenteiseksi strategiaksi, sisällöksi ja julkaistavaksi markkinointipaketiksi."
};

const lumixOntologyModel = {
  objects: [
    {
      id: "client",
      label: "Client",
      summary: "Yritys tai asiakas, jolle markkinointijärjestelmä rakentaa kasvupolun.",
      properties: ["business_name", "description", "plan", "status"]
    },
    {
      id: "business_profile",
      label: "Business Profile",
      summary: "Rakenteinen liiketoimintaprofiili, joka kuvaa yritystyypin, yleisön, tavoitteen ja CTA:n.",
      properties: [
        "business_type",
        "offer_type",
        "audience_type",
        "goal_type",
        "tone_type",
        "geo_focus",
        "price_position",
        "main_cta"
      ]
    },
    {
      id: "strategy",
      label: "Strategy",
      summary: "Suositus siitä, miten yritys pitäisi asemoida, mitä pitää painottaa ja miten CTA-polku rakennetaan.",
      properties: ["positioning", "primary_offer", "primary_audience", "cta_strategy"]
    },
    {
      id: "content_pack",
      label: "Content Pack",
      summary: "Generoitu sivu, SEO-paketti ja blogit, jotka seuraavat hyväksyttyä strategiaa.",
      properties: ["website", "seo", "blogs"]
    },
    {
      id: "publish_target",
      label: "Publish Target",
      summary: "Ulkoinen järjestelmä, johon sisältö julkaistaan, kuten WordPress tai Webflow.",
      properties: ["platform", "config", "status"]
    },
    {
      id: "lead",
      label: "Lead",
      summary: "Sivulta tai CTA-polusta palaava kiinnostunut yhteydenotto.",
      properties: ["name", "email", "message", "source"]
    }
  ],
  links: [
    {
      id: "client_has_profile",
      from: "client",
      to: "business_profile",
      summary: "Client määrittelee business profilen."
    },
    {
      id: "profile_informs_strategy",
      from: "business_profile",
      to: "strategy",
      summary: "Business profile ohjaa strategy-objektin muodostumista."
    },
    {
      id: "strategy_drives_content",
      from: "strategy",
      to: "content_pack",
      summary: "Strategy määrää sivun, blogien ja SEO:n suunnan."
    },
    {
      id: "content_publishes_to_target",
      from: "content_pack",
      to: "publish_target",
      summary: "Content pack julkaistaan yhteen tai useampaan publish targetiin."
    },
    {
      id: "client_generates_leads",
      from: "client",
      to: "lead",
      summary: "Clientin sivu ja CTA-polku tuottavat liidejä."
    }
  ],
  actions: [
    {
      id: "save_intake",
      label: "Save Intake",
      summary: "Tallentaa business profilen ontologian mukaisesti."
    },
    {
      id: "recommend_strategy",
      label: "Recommend Strategy",
      summary: "Muodostaa strategian business profilen perusteella."
    },
    {
      id: "generate_pack",
      label: "Generate Pack",
      summary: "Luo sivun, blogit ja SEO:n hyväksytyn strategian pohjalta."
    },
    {
      id: "publish_pack",
      label: "Publish Pack",
      summary: "Julkaisee content packin ulkoiseen kohteeseen."
    },
    {
      id: "review_leads",
      label: "Review Leads",
      summary: "Tarkastelee palaavia liidejä ja ohjaa seuraavaa iteraatiota."
    }
  ]
};

const lumixOntology = {
  businessType: [
    {
      id: "local_service",
      label: "Paikallinen palvelu",
      summary: "Yritys myy palvelua tietyllä alueella ja tarvitsee selkeän tarjous- tai yhteydenottopolun."
    },
    {
      id: "b2b_service",
      label: "B2B-palvelu",
      summary: "Myynti perustuu luottamukseen, asiantuntijuuteen ja selkeään ongelma-ratkaisuviestiin."
    },
    {
      id: "creator_personal_brand",
      label: "Henkilöbrändi / creator",
      summary: "Kasvu rakentuu persoonan, asiantuntijuuden ja tunnistettavan äänen ympärille."
    },
    {
      id: "ecommerce",
      label: "Verkkokauppa",
      summary: "Konversio syntyy tuotteen, luottamuksen ja helpon ostopolun yhdistelmästä."
    },
    {
      id: "saas",
      label: "SaaS",
      summary: "Arvo pitää näyttää nopeasti, konkreettisesti ja kitkaa poistavasti."
    },
    {
      id: "wellness_beauty",
      label: "Hyvinvointi / beauty",
      summary: "Päätös syntyy luottamuksesta, fiiliksestä ja matalasta kynnyksestä varata."
    }
  ],
  offerType: [
    { id: "service", label: "Palvelu" },
    { id: "package", label: "Paketti" },
    { id: "consultation", label: "Konsultointi" },
    { id: "subscription", label: "Tilaukseen perustuva" },
    { id: "course", label: "Kurssi" },
    { id: "product", label: "Tuote" }
  ],
  audienceType: [
    { id: "consumers", label: "Kuluttajat" },
    { id: "small_businesses", label: "Pienyritykset" },
    { id: "enterprise", label: "Isot yritykset" },
    { id: "local_customers", label: "Paikalliset asiakkaat" }
  ],
  goalType: [
    { id: "lead_generation", label: "Liidit" },
    { id: "bookings", label: "Varaukset" },
    { id: "sales", label: "Myynti" },
    { id: "awareness", label: "Tunnettuus" }
  ],
  toneType: [
    { id: "trusted", label: "Luotettava" },
    { id: "premium", label: "Premium" },
    { id: "friendly", label: "Lämmin" },
    { id: "bold", label: "Suora" }
  ],
  pricePosition: [
    { id: "affordable", label: "Edullinen" },
    { id: "standard", label: "Perustaso" },
    { id: "premium", label: "Premium" }
  ]
};

const businessPlaybooks = {
  local_service: {
    positioning:
      "selkeä paikallinen valinta asiakkaille, jotka haluavat nopean ja luotettavan palvelun",
    contentAngles: [
      "yleisimmät ongelmat ja ratkaisut",
      "hinta ja ostoprosessi",
      "paikallinen luottamus ja referenssit"
    ],
    homepageStructure: ["hero", "services", "service-area", "proof", "cta"]
  },
  b2b_service: {
    positioning:
      "asiantuntijaratkaisu yrityksille, jotka haluavat vähemmän kitkaa ja enemmän selkeitä tuloksia",
    contentAngles: ["ongelma ja kustannus", "ratkaisun hyöty", "case-esimerkit"],
    homepageStructure: ["hero", "problem", "offer", "proof", "cta"]
  },
  creator_personal_brand: {
    positioning:
      "persoonallinen mutta selkeä asiantuntijabrändi, joka muuttaa huomion kysynnäksi",
    contentAngles: ["näkökulmat", "asiantuntijasisällöt", "yleisön kipupisteet"],
    homepageStructure: ["hero", "story", "offer", "proof", "cta"]
  },
  ecommerce: {
    positioning:
      "helppo tapa ostaa oikea tuote ilman epävarmuutta tai turhaa vertailuväsymystä",
    contentAngles: ["osto-oppaat", "tuotevertailut", "yleisimmät kysymykset"],
    homepageStructure: ["hero", "bestsellers", "benefits", "proof", "cta"]
  },
  saas: {
    positioning:
      "ratkaisu, joka poistaa kitkaa nopeasti ja näyttää arvon ennen kuin käyttäjä ehtii epäillä",
    contentAngles: ["use case -sisällöt", "ROI ja tehokkuus", "vertailut vanhaan tapaan"],
    homepageStructure: ["hero", "problem", "solution", "proof", "cta"]
  },
  wellness_beauty: {
    positioning:
      "hyvän fiiliksen ja selkeän palvelulupauksen yhdistelmä, joka tekee varaamisesta helppoa",
    contentAngles: ["hoitojen hyödyt", "kenelle palvelu sopii", "ennen-jälkeen ja luottamus"],
    homepageStructure: ["hero", "services", "benefits", "proof", "cta"]
  }
};

function titleCase(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .trim();
}

function getOptionLabel(group, id) {
  const option = lumixOntology[group]?.find((item) => item.id === id);
  return option?.label || titleCase(id) || "Ei määritelty";
}

function getPlaybook(type) {
  return businessPlaybooks[type] || businessPlaybooks.b2b_service;
}

function mapAnswers(intakeAnswers = []) {
  return Object.fromEntries(intakeAnswers.map((answer) => [answer.questionKey, answer.answerValue]));
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function createObject(type, key, label, properties = {}) {
  return {
    id: `${type}:${key}`,
    type,
    label,
    properties
  };
}

function createLink(type, from, to) {
  return {
    id: `${type}:${from}->${to}`,
    type,
    from,
    to
  };
}

function indexObjects(all) {
  return {
    all,
    byId: Object.fromEntries(all.map((item) => [item.id, item])),
    byType: Object.fromEntries(all.map((item) => [item.type, item]))
  };
}

function findOutgoingLink(links, fromId, type) {
  return links.find((link) => link.from === fromId && link.type === type) || null;
}

function resolveLinkedObject(objects, links, fromId, linkType) {
  const link = findOutgoingLink(links, fromId, linkType);
  if (!link) return null;
  return objects.byId[link.to] || null;
}

export function getLumixCatalog() {
  return Object.fromEntries(
    Object.entries(lumixOntology).map(([group, options]) => [
      group,
      options.map((option) => ({
        value: option.id,
        label: option.label,
        summary: option.summary || ""
      }))
    ])
  );
}

export function getLumixOntologyModel() {
  return lumixOntologyModel;
}

export function getLumixAgent() {
  return lumixProfile;
}

export function getLumixHumanCodex() {
  return {
    title: "Lumix mini-codex",
    intro:
      "Lumix auttaa silloin, kun asiakas tietää mitä myy mutta ei vielä tiedä miten se pitäisi paketoida sivuksi, strategiaksi, sisällöksi ja CTA-poluksi.",
    steps: [
      "1. Tunnista yritystyyppi: mikä yritys on ja missä markkinassa se toimii.",
      "2. Tunnista tavoite: halutaanko liidejä, varauksia, myyntiä vai tunnettuutta.",
      "3. Tunnista yleisö ja tarjous: kenelle myydään ja mitä pitää klikata seuraavaksi."
    ],
    principles: [
      "Ihminen täyttää vain olennaisen.",
      "Ontologia ohjaa agenttia pois geneerisestä sisällöstä.",
      "Sama rakenne ohjaa recommendationia, generointia ja julkaisemista.",
      "Objektit, linkit ja actionit mallintavat oikeaa liiketoimintaprosessia, eivät vain lomakekenttiä."
    ]
  };
}

export function resolveLumixObjects({
  client,
  businessProfile = null,
  intakeAnswers = [],
  strategyRecommendation = null
}) {
  const answerMap = mapAnswers(intakeAnswers);
  const resolvedProfile = {
    businessType: businessProfile?.businessType || answerMap.business_type || null,
    offerType: businessProfile?.offerType || answerMap.offer_type || null,
    audienceType: businessProfile?.audienceType || answerMap.audience_type || null,
    goalType: businessProfile?.goalType || answerMap.goal_type || null,
    toneType: businessProfile?.toneType || answerMap.tone_type || null,
    geoFocus: businessProfile?.geoFocus || answerMap.geo_focus || null,
    pricePosition: businessProfile?.pricePosition || answerMap.price_position || null,
    mainCta: businessProfile?.mainCta || answerMap.main_cta || null,
    notes: businessProfile?.rawNotes?.notes || null
  };

  const objects = [];
  const clientObject = createObject("client", client.id || client.businessName || "draft", client.businessName, {
    businessName: client.businessName,
    description: client.description,
    plan: client.plan || "starter",
    status: client.status || "active"
  });
  objects.push(clientObject);

  const businessProfileObject = createObject(
    "business_profile",
    client.id || client.businessName || "draft",
    `${client.businessName} profile`,
    resolvedProfile
  );
  objects.push(businessProfileObject);

  if (strategyRecommendation) {
    objects.push(
      createObject("strategy", client.id || client.businessName || "draft", `${client.businessName} strategy`, {
        positioning: strategyRecommendation.positioning,
        primaryOffer: strategyRecommendation.primaryOffer,
        primaryAudience: strategyRecommendation.primaryAudience,
        ctaStrategy: strategyRecommendation.ctaStrategy,
        contentAngles: ensureArray(strategyRecommendation.contentAngles),
        homepageStructure: ensureArray(strategyRecommendation.homepageStructure)
      })
    );
  }

  if (client.website || client.seo || client.blogs?.length) {
    objects.push(
      createObject("content_pack", client.id || client.businessName || "draft", `${client.businessName} content`, {
        hasWebsite: Boolean(client.website),
        hasSeo: Boolean(client.seo),
        blogCount: ensureArray(client.blogs).length
      })
    );
  }

  ensureArray(client.publishTargets).forEach((target) => {
    objects.push(
      createObject("publish_target", target.id, target.name || target.platform, {
        platform: target.platform,
        status: target.status,
        autoPublish: Boolean(target.autoPublish)
      })
    );
  });

  ensureArray(client.leads).forEach((lead) => {
    objects.push(
      createObject("lead", lead.id, lead.email || lead.name || "lead", {
        name: lead.name,
        email: lead.email,
        source: lead.source
      })
    );
  });

  const indexed = indexObjects(objects);
  return {
    ...indexed,
    answerMap
  };
}

export function resolveLumixLinks(objects) {
  const links = [];
  const clientObject = objects.byType.client;
  const businessProfileObject = objects.byType.business_profile;
  const strategyObject = objects.byType.strategy;
  const contentPackObject = objects.byType.content_pack;

  if (clientObject && businessProfileObject) {
    links.push(createLink("client_has_profile", clientObject.id, businessProfileObject.id));
  }

  if (businessProfileObject && strategyObject) {
    links.push(createLink("profile_informs_strategy", businessProfileObject.id, strategyObject.id));
  }

  if (strategyObject && contentPackObject) {
    links.push(createLink("strategy_drives_content", strategyObject.id, contentPackObject.id));
  }

  objects.all
    .filter((item) => item.type === "publish_target")
    .forEach((target) => {
      if (contentPackObject) {
        links.push(createLink("content_publishes_to_target", contentPackObject.id, target.id));
      }
    });

  objects.all
    .filter((item) => item.type === "lead")
    .forEach((lead) => {
      if (clientObject) {
        links.push(createLink("client_generates_leads", clientObject.id, lead.id));
      }
    });

  return links;
}

function recommendStrategyFromOntology({ objects, links }) {
  const clientObject = objects.byType.client;
  const businessProfileObject = resolveLinkedObject(
    objects,
    links,
    clientObject?.id,
    "client_has_profile"
  );

  if (!clientObject || !businessProfileObject) {
    throw new Error("Lumix needs linked client and business profile objects to recommend a strategy.");
  }

  const profile = businessProfileObject.properties;
  const businessType = profile.businessType || "b2b_service";
  const goalType = profile.goalType || "lead_generation";
  const audienceType = profile.audienceType || "small_businesses";
  const offerType = profile.offerType || "service";
  const mainCta = profile.mainCta || "Pyydä tarjous";
  const playbook = getPlaybook(businessType);

  let ctaStrategy = `${mainCta} toimii päätavoitteena sekä sivulla että blogeissa.`;
  if (goalType === "bookings") {
    ctaStrategy = `${mainCta || "Varaa aika"} toistetaan heti herossa, keskellä sivua ja lopussa.`;
  } else if (goalType === "sales") {
    ctaStrategy = `${mainCta || "Osta nyt"} pitää tehdä kitkattomaksi jokaisessa sisällössä.`;
  } else if (goalType === "awareness") {
    ctaStrategy = `${mainCta || "Tutustu lisää"} pitää siirtää huomio kiinnostuksesta seuraavaan selkeään askeleeseen.`;
  }

  return {
    recommendation: {
      positioning: `${clientObject.label} on ${playbook.positioning}.`,
      primaryOffer: `${clientObject.label} ${getOptionLabel("offerType", offerType).toLowerCase()}`,
      primaryAudience: getOptionLabel("audienceType", audienceType).toLowerCase(),
      contentAngles: playbook.contentAngles,
      ctaStrategy,
      homepageStructure: playbook.homepageStructure
    },
    explanation: {
      action: "recommend_strategy",
      usedObjectIds: [clientObject.id, businessProfileObject.id],
      usedLinkIds: links
        .filter(
          (link) =>
            link.type === "client_has_profile" &&
            link.from === clientObject.id &&
            link.to === businessProfileObject.id
        )
        .map((link) => link.id)
    }
  };
}

const lumixActionHandlers = {
  save_intake({ objects }) {
    return {
      businessProfileObject: objects.byType.business_profile
    };
  },
  recommend_strategy(context) {
    return recommendStrategyFromOntology(context);
  },
  generate_pack({ objects, links }) {
    const clientObject = objects.byType.client;
    const businessProfileObject = resolveLinkedObject(
      objects,
      links,
      clientObject?.id,
      "client_has_profile"
    );
    const strategyObject =
      businessProfileObject &&
      resolveLinkedObject(objects, links, businessProfileObject.id, "profile_informs_strategy");

    return {
      ready: Boolean(clientObject && businessProfileObject && strategyObject),
      explanation: {
        action: "generate_pack",
        usedObjectIds: [clientObject?.id, businessProfileObject?.id, strategyObject?.id].filter(Boolean),
        usedLinkIds: links
          .filter(
            (link) =>
              (clientObject &&
                businessProfileObject &&
                link.type === "client_has_profile" &&
                link.from === clientObject.id &&
                link.to === businessProfileObject.id) ||
              (businessProfileObject &&
                strategyObject &&
                link.type === "profile_informs_strategy" &&
                link.from === businessProfileObject.id &&
                link.to === strategyObject.id)
          )
          .map((link) => link.id)
      }
    };
  },
  publish_pack({ objects, links, targetId = null }) {
    const contentPackObject = objects.byType.content_pack;
    const publishTargets = objects.all.filter((item) => item.type === "publish_target");
    const selectedTargets = targetId
      ? publishTargets.filter((target) => String(target.properties?.targetId || target.id.split(":")[1]) === String(targetId))
      : publishTargets;

    return {
      targetCount: selectedTargets.length,
      ready: Boolean(contentPackObject && selectedTargets.length),
      explanation: {
        action: "publish_pack",
        usedObjectIds: [contentPackObject?.id, ...selectedTargets.map((target) => target.id)].filter(Boolean),
        usedLinkIds: links
          .filter(
            (link) =>
              link.type === "content_publishes_to_target" &&
              contentPackObject &&
              link.from === contentPackObject.id &&
              selectedTargets.some((target) => target.id === link.to)
          )
          .map((link) => link.id)
      }
    };
  },
  review_leads({ objects }) {
    return {
      action: "review_leads",
      leadCount: objects.all.filter((item) => item.type === "lead").length
    };
  }
};

export function runLumixAction(actionId, input) {
  const objects = input.objects || resolveLumixObjects(input);
  const links = input.links || resolveLumixLinks(objects);
  const handler = lumixActionHandlers[actionId];

  if (!handler) {
    throw new Error(`Unknown Lumix action: ${actionId}`);
  }

  return {
    action: actionId,
    objects,
    links,
    ...handler({ ...input, objects, links })
  };
}

export function buildLumixContext(client) {
  const lines = [
    `${lumixProfile.name} is the ontology-driven strategy agent inside Webbom.`,
    `${lumixProfile.name} should reason from the structured ontology before generating content.`
  ];

  if (client.businessProfile) {
    lines.push("Structured business profile:");
    lines.push(`- Business type: ${getOptionLabel("businessType", client.businessProfile.businessType)}`);
    lines.push(`- Offer type: ${getOptionLabel("offerType", client.businessProfile.offerType)}`);
    lines.push(`- Audience type: ${getOptionLabel("audienceType", client.businessProfile.audienceType)}`);
    lines.push(`- Goal type: ${getOptionLabel("goalType", client.businessProfile.goalType)}`);
    lines.push(`- Tone type: ${getOptionLabel("toneType", client.businessProfile.toneType)}`);
    lines.push(`- Geo focus: ${client.businessProfile.geoFocus || "Ei määritelty"}`);
    lines.push(`- Price position: ${getOptionLabel("pricePosition", client.businessProfile.pricePosition)}`);
    lines.push(`- Main CTA: ${client.businessProfile.mainCta || "Ei määritelty"}`);
    if (client.businessProfile.rawNotes?.notes) {
      lines.push(`- Notes: ${client.businessProfile.rawNotes.notes}`);
    }
  }

  if (client.strategyRecommendation) {
    lines.push("Approved Lumix strategy:");
    lines.push(`- Positioning: ${client.strategyRecommendation.positioning || "unknown"}`);
    lines.push(`- Primary offer: ${client.strategyRecommendation.primaryOffer || "unknown"}`);
    lines.push(`- Primary audience: ${client.strategyRecommendation.primaryAudience || "unknown"}`);
    lines.push(`- CTA strategy: ${client.strategyRecommendation.ctaStrategy || "unknown"}`);
    if (client.strategyRecommendation.contentAngles?.length) {
      lines.push(`- Content angles: ${client.strategyRecommendation.contentAngles.join(", ")}`);
    }
  }

  if (client.intakeAnswers?.length) {
    lines.push("Intake answers:");
    client.intakeAnswers.forEach((answer) => {
      lines.push(`- ${answer.questionKey}: ${answer.answerLabel || answer.answerValue || ""}`);
    });
  }

  return lines.join("\n");
}

export function buildLumixStrategyRecommendation(client, businessProfile, intakeAnswers = []) {
  return runLumixAction("recommend_strategy", {
    client,
    businessProfile,
    intakeAnswers,
    strategyRecommendation: client.strategyRecommendation || null
  }).recommendation;
}

export function buildLumixPromptHeader() {
  return [
    `You are ${lumixProfile.name}, the ontology-driven growth agent inside Webbom.`,
    "Your job is to turn a loose business brief into a clear, conversion-focused content package.",
    "Prefer strategic clarity, strong CTA logic, and concrete audience-language over generic marketing filler."
  ].join("\n");
}
