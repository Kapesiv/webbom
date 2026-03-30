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
      summary: "Yhteensopivuusobjekti, joka kokoaa intake-vastaukset yhteen ennen kuin ne jaetaan erillisiksi päätösobjekteiksi.",
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
      id: "offer",
      label: "Offer",
      summary: "Mitä asiakas myy ja miten se kannattaa sanoittaa päätöksenteon pohjaksi.",
      properties: ["offer_type", "primary_offer"]
    },
    {
      id: "audience",
      label: "Audience",
      summary: "Kenelle asiakas myy ja missä markkinassa yleisöä palvellaan.",
      properties: ["audience_type", "market_scope"]
    },
    {
      id: "goal",
      label: "Goal",
      summary: "Mikä on tärkein konversiotavoite ja CTA-polku.",
      properties: ["goal_type", "main_cta", "conversion_type"]
    },
    {
      id: "brand_voice",
      label: "Brand Voice",
      summary: "Sävy, hintapositio ja muut viestilliset rajat.",
      properties: ["tone_type", "price_position", "notes"]
    },
    {
      id: "strategy",
      label: "Strategy",
      summary: "Suositus siitä, miten yritys pitäisi asemoida, mitä pitää painottaa ja miten CTA-polku rakennetaan.",
      properties: ["status", "positioning", "primary_offer", "primary_audience", "cta_strategy"]
    },
    {
      id: "content_pack",
      label: "Content Pack",
      summary: "Generoitu sivu, SEO-paketti ja blogit, jotka seuraavat hyväksyttyä strategiaa.",
      properties: ["status", "website", "seo", "blogs"]
    },
    {
      id: "publish_target",
      label: "Publish Target",
      summary: "Ulkoinen järjestelmä, johon sisältö julkaistaan, kuten WordPress tai Webflow.",
      properties: ["platform", "config", "status"]
    },
    {
      id: "publish_run",
      label: "Publish Run",
      summary: "Yksi toteutunut tai epäonnistunut julkaisuajo kohteeseen.",
      properties: ["status", "message", "created_at"]
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
      id: "profile_defines_offer",
      from: "business_profile",
      to: "offer",
      summary: "Business profile määrittää tarjottavan offer-objektin."
    },
    {
      id: "profile_defines_audience",
      from: "business_profile",
      to: "audience",
      summary: "Business profile määrittää yleisön."
    },
    {
      id: "profile_sets_goal",
      from: "business_profile",
      to: "goal",
      summary: "Business profile määrittää päätavoitteen ja CTA:n."
    },
    {
      id: "profile_sets_brand_voice",
      from: "business_profile",
      to: "brand_voice",
      summary: "Business profile määrittää sävyn ja hintaposition."
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
      id: "publish_target_has_run",
      from: "publish_target",
      to: "publish_run",
      summary: "Publish targetilla on toteutuneita publish run -ajoja."
    },
    {
      id: "content_pack_published_by_run",
      from: "content_pack",
      to: "publish_run",
      summary: "Content packin julkaisu dokumentoidaan publish run -objektina."
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

function hasValue(value) {
  return !(value === null || value === undefined || value === "");
}

function hasAnyValue(values) {
  return values.some(hasValue);
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
  const byType = {};
  const byTypeList = {};

  all.forEach((item) => {
    if (!byType[item.type]) {
      byType[item.type] = item;
    }

    if (!byTypeList[item.type]) {
      byTypeList[item.type] = [];
    }

    byTypeList[item.type].push(item);
  });

  return {
    all,
    byId: Object.fromEntries(all.map((item) => [item.id, item])),
    byType,
    byTypeList
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

  const strategyStatus = strategyRecommendation?.status || (strategyRecommendation ? "approved" : "missing");
  const hasGeneratedContent = Boolean(client.website || client.seo || client.blogs?.length);
  const hasSuccessfulPublish = ensureArray(client.publishHistory).some((run) => run.status === "success");
  const contentPackStatus = !hasGeneratedContent ? "empty" : hasSuccessfulPublish ? "published" : "generated";

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

  if (hasValue(resolvedProfile.offerType)) {
    objects.push(
      createObject("offer", client.id || client.businessName || "draft", `${client.businessName} offer`, {
        offerType: resolvedProfile.offerType,
        primaryOffer: strategyRecommendation?.primaryOffer || null
      })
    );
  }

  if (hasAnyValue([resolvedProfile.audienceType, resolvedProfile.geoFocus])) {
    objects.push(
      createObject("audience", client.id || client.businessName || "draft", `${client.businessName} audience`, {
        audienceType: resolvedProfile.audienceType,
        marketScope: resolvedProfile.geoFocus
      })
    );
  }

  if (hasAnyValue([resolvedProfile.goalType, resolvedProfile.mainCta])) {
    objects.push(
      createObject("goal", client.id || client.businessName || "draft", `${client.businessName} goal`, {
        goalType: resolvedProfile.goalType,
        mainCta: resolvedProfile.mainCta,
        conversionType: resolvedProfile.goalType
      })
    );
  }

  if (hasAnyValue([resolvedProfile.toneType, resolvedProfile.pricePosition, resolvedProfile.notes])) {
    objects.push(
      createObject("brand_voice", client.id || client.businessName || "draft", `${client.businessName} brand voice`, {
        toneType: resolvedProfile.toneType,
        pricePosition: resolvedProfile.pricePosition,
        notes: resolvedProfile.notes
      })
    );
  }

  if (strategyRecommendation) {
    objects.push(
      createObject("strategy", client.id || client.businessName || "draft", `${client.businessName} strategy`, {
        status: strategyStatus,
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
        status: contentPackStatus,
        hasWebsite: Boolean(client.website),
        hasSeo: Boolean(client.seo),
        blogCount: ensureArray(client.blogs).length
      })
    );
  }

  ensureArray(client.publishTargets).forEach((target) => {
    objects.push(
      createObject("publish_target", target.id, target.name || target.platform, {
        targetId: target.id,
        platform: target.platform,
        status: target.status,
        autoPublish: Boolean(target.autoPublish)
      })
    );
  });

  ensureArray(client.publishHistory).forEach((run) => {
    objects.push(
      createObject("publish_run", run.id, `publish run ${run.id}`, {
        publishTargetId: run.publishTargetId,
        status: run.status,
        message: run.message,
        createdAt: run.createdAt
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
  const offerObject = objects.byType.offer;
  const audienceObject = objects.byType.audience;
  const goalObject = objects.byType.goal;
  const brandVoiceObject = objects.byType.brand_voice;
  const strategyObject = objects.byType.strategy;
  const contentPackObject = objects.byType.content_pack;

  if (clientObject && businessProfileObject) {
    links.push(createLink("client_has_profile", clientObject.id, businessProfileObject.id));
  }

  if (businessProfileObject && offerObject) {
    links.push(createLink("profile_defines_offer", businessProfileObject.id, offerObject.id));
  }

  if (businessProfileObject && audienceObject) {
    links.push(createLink("profile_defines_audience", businessProfileObject.id, audienceObject.id));
  }

  if (businessProfileObject && goalObject) {
    links.push(createLink("profile_sets_goal", businessProfileObject.id, goalObject.id));
  }

  if (businessProfileObject && brandVoiceObject) {
    links.push(createLink("profile_sets_brand_voice", businessProfileObject.id, brandVoiceObject.id));
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
    .filter((item) => item.type === "publish_run")
    .forEach((run) => {
      const target = objects.all.find(
        (item) => item.type === "publish_target" && String(item.properties.targetId) === String(run.properties.publishTargetId)
      );

      if (target) {
        links.push(createLink("publish_target_has_run", target.id, run.id));
      }

      if (contentPackObject) {
        links.push(createLink("content_pack_published_by_run", contentPackObject.id, run.id));
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

function buildExplanation(action, ready, reason, usedObjectIds = [], usedLinkIds = [], missingObjects = []) {
  return {
    action,
    ready,
    reason,
    usedObjectIds,
    usedLinkIds,
    missingObjects
  };
}

function getObject(objects, type) {
  return objects.byType[type] || null;
}

function collectMissingObjects(objects, types) {
  return types.filter((type) => !getObject(objects, type));
}

function evaluateRecommendEligibility({ objects, links }) {
  const clientObject = objects.byType.client;
  const businessProfileObject = resolveLinkedObject(
    objects,
    links,
    clientObject?.id,
    "client_has_profile"
  );
  const offerObject = getObject(objects, "offer");
  const audienceObject = getObject(objects, "audience");
  const goalObject = getObject(objects, "goal");
  const missingObjects = [
    ...collectMissingObjects(objects, ["client"]),
    ...(!businessProfileObject ? ["business_profile"] : []),
    ...(!offerObject ? ["offer"] : []),
    ...(!audienceObject ? ["audience"] : []),
    ...(!goalObject ? ["goal"] : [])
  ];

  const ready = missingObjects.length === 0;
  const reason = ready
    ? "Lumixilla on riittävä intake-data strategian muodostamiseen."
    : `Täydennä ensin: ${missingObjects.join(", ")}.`;

  return {
    ready,
    reason,
    missingObjects,
    clientObject,
    businessProfileObject,
    offerObject,
    audienceObject,
    goalObject
  };
}

function recommendStrategyFromOntology({ objects, links }) {
  const eligibility = evaluateRecommendEligibility({ objects, links });
  if (!eligibility.ready) {
    return {
      ready: false,
      recommendation: null,
      explanation: buildExplanation(
        "recommend_strategy",
        false,
        eligibility.reason,
        [eligibility.clientObject?.id, eligibility.businessProfileObject?.id].filter(Boolean),
        links
          .filter(
            (link) =>
              eligibility.clientObject &&
              eligibility.businessProfileObject &&
              link.type === "client_has_profile" &&
              link.from === eligibility.clientObject.id &&
              link.to === eligibility.businessProfileObject.id
          )
          .map((link) => link.id),
        eligibility.missingObjects
      )
    };
  }

  const profile = eligibility.businessProfileObject.properties;
  const businessType = profile.businessType || "b2b_service";
  const goalType = eligibility.goalObject.properties.goalType || profile.goalType || "lead_generation";
  const audienceType = eligibility.audienceObject.properties.audienceType || profile.audienceType || "small_businesses";
  const offerType = eligibility.offerObject.properties.offerType || profile.offerType || "service";
  const mainCta = eligibility.goalObject.properties.mainCta || profile.mainCta || "Pyydä tarjous";
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
    ready: true,
    recommendation: {
      status: "approved",
      positioning: `${eligibility.clientObject.label} on ${playbook.positioning}.`,
      primaryOffer: `${eligibility.clientObject.label} ${getOptionLabel("offerType", offerType).toLowerCase()}`,
      primaryAudience: getOptionLabel("audienceType", audienceType).toLowerCase(),
      contentAngles: playbook.contentAngles,
      ctaStrategy,
      homepageStructure: playbook.homepageStructure
    },
    explanation: buildExplanation(
      "recommend_strategy",
      true,
      "Strategia voidaan muodostaa, koska offer, audience ja goal ovat olemassa.",
      [
        eligibility.clientObject.id,
        eligibility.businessProfileObject.id,
        eligibility.offerObject.id,
        eligibility.audienceObject.id,
        eligibility.goalObject.id
      ],
      links
        .filter((link) =>
          [
            "client_has_profile",
            "profile_defines_offer",
            "profile_defines_audience",
            "profile_sets_goal"
          ].includes(link.type)
        )
        .map((link) => link.id)
    )
  };
}

function evaluateGenerateEligibility({ objects, links }) {
  const clientObject = getObject(objects, "client");
  const strategyObject = getObject(objects, "strategy");
  const contentPackObject = getObject(objects, "content_pack");
  const businessProfileObject = resolveLinkedObject(objects, links, clientObject?.id, "client_has_profile");
  const missingObjects = [
    ...collectMissingObjects(objects, ["client"]),
    ...(!businessProfileObject ? ["business_profile"] : []),
    ...collectMissingObjects(objects, ["strategy"])
  ];
  const strategyApproved = strategyObject?.properties?.status === "approved";
  const ready = missingObjects.length === 0 && strategyApproved;
  const reason =
    missingObjects.length > 0
      ? `Generointi odottaa objekteja: ${missingObjects.join(", ")}.`
      : strategyApproved
        ? "Sisällön generointi on sallittu."
        : "Generointi odottaa hyväksyttyä strategiaa.";

  return {
    ready,
    reason,
    missingObjects,
    clientObject,
    businessProfileObject,
    strategyObject,
    contentPackObject
  };
}

function evaluatePublishEligibility({ objects, links, targetId = null }) {
  const contentPackObject = getObject(objects, "content_pack");
  const publishTargets = objects.byTypeList.publish_target || [];
  const activeTargets = publishTargets.filter((target) => target.properties.status === "active");
  const selectedTargets = targetId
    ? activeTargets.filter((target) => String(target.properties.targetId) === String(targetId))
    : activeTargets;
  const contentReady = contentPackObject?.properties?.status === "generated" || contentPackObject?.properties?.status === "published";
  const missingObjects = [
    ...(contentPackObject ? [] : ["content_pack"]),
    ...(selectedTargets.length ? [] : ["publish_target"])
  ];
  const ready = Boolean(contentReady && selectedTargets.length);
  const reason =
    !contentPackObject
      ? "Julkaisu odottaa generoituja sisältöjä."
      : !contentReady
        ? "Julkaisu odottaa valmista content packia."
        : !selectedTargets.length
          ? "Julkaisu odottaa aktiivista julkaisukanavaa."
          : "Julkaisu on sallittu.";

  return {
    ready,
    reason,
    missingObjects,
    contentPackObject,
    selectedTargets,
    links
  };
}

const lumixActionHandlers = {
  save_intake({ objects }) {
    return {
      ready: true,
      businessProfileObject: objects.byType.business_profile
    };
  },
  recommend_strategy(context) {
    return recommendStrategyFromOntology(context);
  },
  generate_pack({ objects, links }) {
    const eligibility = evaluateGenerateEligibility({ objects, links });

    return {
      ready: eligibility.ready,
      explanation: buildExplanation(
        "generate_pack",
        eligibility.ready,
        eligibility.reason,
        [eligibility.clientObject?.id, eligibility.businessProfileObject?.id, eligibility.strategyObject?.id].filter(Boolean),
        links
          .filter(
            (link) =>
              (eligibility.clientObject &&
                eligibility.businessProfileObject &&
                link.type === "client_has_profile" &&
                link.from === eligibility.clientObject.id &&
                link.to === eligibility.businessProfileObject.id) ||
              (eligibility.businessProfileObject &&
                eligibility.strategyObject &&
                link.type === "profile_informs_strategy" &&
                link.from === eligibility.businessProfileObject.id &&
                link.to === eligibility.strategyObject.id)
          )
          .map((link) => link.id),
        eligibility.missingObjects
      )
    };
  },
  publish_pack({ objects, links, targetId = null }) {
    const eligibility = evaluatePublishEligibility({ objects, links, targetId });

    return {
      targetCount: eligibility.selectedTargets.length,
      ready: eligibility.ready,
      explanation: buildExplanation(
        "publish_pack",
        eligibility.ready,
        eligibility.reason,
        [eligibility.contentPackObject?.id, ...eligibility.selectedTargets.map((target) => target.id)].filter(Boolean),
        links
          .filter(
            (link) =>
              link.type === "content_publishes_to_target" &&
              eligibility.contentPackObject &&
              link.from === eligibility.contentPackObject.id &&
              eligibility.selectedTargets.some((target) => target.id === link.to)
          )
          .map((link) => link.id),
        eligibility.missingObjects
      )
    };
  },
  review_leads({ objects }) {
    const leads = objects.byTypeList.lead || [];
    return {
      ready: leads.length > 0,
      action: "review_leads",
      leadCount: leads.length,
      explanation: buildExplanation(
        "review_leads",
        leads.length > 0,
        leads.length > 0 ? "Liidejä on riittävästi tarkasteluun." : "Lead review odottaa ensimmäisiä liidejä.",
        leads.map((lead) => lead.id),
        [],
        leads.length > 0 ? [] : ["lead"]
      )
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

function getNextLumixStep(runtime) {
  const actions = runtime.actions;

  if (actions.recommend_strategy.ready && !runtime.states.strategy.exists) {
    return {
      title: "Tee tämä seuraavaksi",
      text: "Pyydä Lumixilta ehdotus. Intake-objektit ovat valmiit.",
      target: "[data-guide='recommend']",
      actionId: "recommend_strategy"
    };
  }

  if (actions.generate_pack.ready && runtime.states.contentPack.status === "empty") {
    return {
      title: "Tee tämä seuraavaksi",
      text: "Generoi sisältö hyväksytyn strategian pohjalta.",
      target: "[data-guide='generate']",
      actionId: "generate_pack"
    };
  }

  if (actions.publish_pack.ready && runtime.states.contentPack.status !== "published") {
    return {
      title: "Tee tämä seuraavaksi",
      text: "Julkaise valmis sisältö aktiiviseen kanavaan.",
      target: "[data-guide='publish']",
      actionId: "publish_pack"
    };
  }

  if (actions.review_leads.ready) {
    return {
      title: "Tämän jälkeen",
      text: "Katso liidit ja päivitä strategiaa toimivan datan perusteella.",
      target: "[data-guide='leads']",
      actionId: "review_leads"
    };
  }

  return {
    title: "Tee tämä seuraavaksi",
    text: actions.recommend_strategy.reason,
    target: "[data-guide='intake']",
    actionId: "recommend_strategy"
  };
}

export function buildLumixRuntime(client) {
  const input = {
    client,
    businessProfile: client.businessProfile,
    intakeAnswers: client.intakeAnswers || [],
    strategyRecommendation: client.strategyRecommendation || null
  };

  const objects = resolveLumixObjects(input);
  const links = resolveLumixLinks(objects);
  const recommendStrategy = runLumixAction("recommend_strategy", { ...input, objects, links });
  const generatePack = runLumixAction("generate_pack", { ...input, objects, links });
  const publishPack = runLumixAction("publish_pack", { ...input, objects, links });
  const reviewLeads = runLumixAction("review_leads", { ...input, objects, links });
  const offerObject = getObject(objects, "offer");
  const audienceObject = getObject(objects, "audience");
  const goalObject = getObject(objects, "goal");
  const brandVoiceObject = getObject(objects, "brand_voice");
  const strategyObject = getObject(objects, "strategy");
  const contentPackObject = getObject(objects, "content_pack");
  const publishTargets = objects.byTypeList.publish_target || [];
  const publishRuns = objects.byTypeList.publish_run || [];
  const leads = objects.byTypeList.lead || [];

  const runtime = {
    objectSummary: {
      client: Boolean(getObject(objects, "client")),
      businessProfile: Boolean(getObject(objects, "business_profile")),
      offer: Boolean(offerObject),
      audience: Boolean(audienceObject),
      goal: Boolean(goalObject),
      brandVoice: Boolean(brandVoiceObject),
      publishTargets: publishTargets.length,
      publishRuns: publishRuns.length,
      leads: leads.length
    },
    states: {
      strategy: {
        exists: Boolean(strategyObject),
        status: strategyObject?.properties?.status || "missing"
      },
      contentPack: {
        exists: Boolean(contentPackObject),
        status: contentPackObject?.properties?.status || "empty"
      }
    },
    actions: {
      recommend_strategy: {
        ready: recommendStrategy.ready,
        reason: recommendStrategy.explanation?.reason || "",
        missingObjects: recommendStrategy.explanation?.missingObjects || []
      },
      generate_pack: {
        ready: generatePack.ready,
        reason: generatePack.explanation?.reason || "",
        missingObjects: generatePack.explanation?.missingObjects || []
      },
      publish_pack: {
        ready: publishPack.ready,
        reason: publishPack.explanation?.reason || "",
        missingObjects: publishPack.explanation?.missingObjects || []
      },
      review_leads: {
        ready: reviewLeads.ready,
        reason: reviewLeads.explanation?.reason || "",
        missingObjects: reviewLeads.explanation?.missingObjects || []
      }
    }
  };

  return {
    ...runtime,
    nextStep: getNextLumixStep(runtime)
  };
}

export function buildLumixContext(client) {
  const lines = [
    `${lumixProfile.name} is the ontology-driven strategy agent inside the Lumix app.`,
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
    `You are ${lumixProfile.name}, the ontology-driven growth agent inside the Lumix app.`,
    "Your job is to turn a loose business brief into a clear, conversion-focused content package.",
    "Prefer strategic clarity, strong CTA logic, and concrete audience-language over generic marketing filler."
  ].join("\n");
}
