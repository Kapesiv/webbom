import OpenAI from "openai";

import { getOpenAiApiKey } from "../openai-config.js";
import { buildLumixContext, buildLumixPromptHeader, runLumixAction } from "../lumix.js";

const strategySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    positioning: { type: "string" },
    primaryOffer: { type: "string" },
    primaryAudience: { type: "string" },
    contentAngles: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: { type: "string" }
    },
    ctaStrategy: { type: "string" },
    homepageStructure: {
      type: "array",
      minItems: 3,
      items: { type: "string" }
    }
  },
  required: [
    "positioning",
    "primaryOffer",
    "primaryAudience",
    "contentAngles",
    "ctaStrategy",
    "homepageStructure"
  ]
};

function sanitizeText(value) {
  return String(value || "").trim();
}

function sanitizeStrategy(strategy) {
  return {
    version: "v1",
    status: sanitizeText(strategy.status) || "approved",
    positioning: sanitizeText(strategy.positioning),
    primaryOffer: sanitizeText(strategy.primaryOffer),
    primaryAudience: sanitizeText(strategy.primaryAudience),
    contentAngles: (Array.isArray(strategy.contentAngles) ? strategy.contentAngles : [])
      .map(sanitizeText)
      .filter(Boolean)
      .slice(0, 5),
    ctaStrategy: sanitizeText(strategy.ctaStrategy),
    homepageStructure: (Array.isArray(strategy.homepageStructure) ? strategy.homepageStructure : [])
      .map(sanitizeText)
      .filter(Boolean)
      .slice(0, 8),
    summary: sanitizeText(strategy.summary),
    source: strategy.source || null
  };
}

function summarizeStrategy(strategy) {
  return [strategy.positioning, strategy.ctaStrategy].filter(Boolean).join(" • ").slice(0, 280);
}

function validateStrategy(strategy) {
  const normalized = sanitizeStrategy(strategy);

  if (!normalized.positioning) {
    throw new Error("Strategy requires positioning.");
  }

  if (!normalized.primaryOffer) {
    throw new Error("Strategy requires primaryOffer.");
  }

  if (!normalized.primaryAudience) {
    throw new Error("Strategy requires primaryAudience.");
  }

  if (!normalized.ctaStrategy) {
    throw new Error("Strategy requires ctaStrategy.");
  }

  if (!normalized.contentAngles.length) {
    throw new Error("Strategy requires at least one content angle.");
  }

  if (!normalized.homepageStructure.length) {
    throw new Error("Strategy requires homepageStructure.");
  }

  if (!normalized.summary) {
    normalized.summary = summarizeStrategy(normalized);
  }

  return normalized;
}

function buildStrategyPrompt(client, suggestedRecommendation) {
  return [
    buildLumixPromptHeader(),
    "Generate a structured strategy object for this client.",
    "Reply in JSON only.",
    "Keep the strategy specific, compact, and conversion-focused.",
    "Do not invent new offers or audiences outside the client context.",
    "",
    "Current client context:",
    buildLumixContext(client),
    "",
    "Fallback recommendation to refine:",
    `- Positioning: ${suggestedRecommendation.positioning}`,
    `- Primary offer: ${suggestedRecommendation.primaryOffer}`,
    `- Primary audience: ${suggestedRecommendation.primaryAudience}`,
    `- CTA strategy: ${suggestedRecommendation.ctaStrategy}`,
    `- Content angles: ${(suggestedRecommendation.contentAngles || []).join(", ")}`,
    `- Homepage structure: ${(suggestedRecommendation.homepageStructure || []).join(", ")}`
  ].join("\n");
}

function buildDemoStrategy(recommendation) {
  return validateStrategy({
    ...recommendation,
    version: "v1",
    status: "approved",
    source: {
      mode: "demo",
      notice: "OPENAI_API_KEY puuttuu. Strategy generoitiin demo-tilassa."
    }
  });
}

export async function generateAndSaveStrategy(database, clientId) {
  const clientRow = database.getClientRecordByAnyId(clientId);
  if (!clientRow) {
    throw new Error("Client not found.");
  }

  const client = database.getClientById(clientRow.agency_id, clientId);
  const actionResult = runLumixAction("recommend_strategy", {
    client,
    businessProfile: client.businessProfile,
    intakeAnswers: client.intakeAnswers || [],
    strategyRecommendation: client.strategyRecommendation || null
  });

  if (!actionResult.ready || !actionResult.recommendation) {
    throw new Error(actionResult.explanation?.reason || "Strategy generation is not allowed yet.");
  }

  const apiKey = getOpenAiApiKey();
  const model = process.env.OPENAI_STRATEGY_MODEL || process.env.OPENAI_MODEL || "gpt-5-mini";
  let strategy;

  if (!apiKey) {
    strategy = buildDemoStrategy(actionResult.recommendation);
  } else {
    const openai = new OpenAI({ apiKey });
    const response = await openai.responses.create({
      model,
      input: buildStrategyPrompt(client, actionResult.recommendation),
      text: {
        format: {
          type: "json_schema",
          name: "lumix_strategy",
          strict: true,
          schema: strategySchema
        }
      }
    });

    const parsed = JSON.parse(response.output_text);
    strategy = validateStrategy({
      ...parsed,
      version: "v1",
      status: "approved",
      source: {
        mode: "live",
        model
      }
    });
  }

  database.saveClientStrategy(clientId, strategy);
  return database.getStrategyRecommendation(clientId);
}
