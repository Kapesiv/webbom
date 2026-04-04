const placeholderValues = new Set([
  "",
  "your_api_key_here",
  "replace_me",
  "changeme"
]);

export function getOpenAiApiKey() {
  const value = String(process.env.OPENAI_API_KEY || "").trim();

  if (!value) return null;
  if (placeholderValues.has(value.toLowerCase())) return null;
  return value;
}

export function hasOpenAiApiKey() {
  return Boolean(getOpenAiApiKey());
}
