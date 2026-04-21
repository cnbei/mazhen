import OpenAI from "openai";

let cachedClient: OpenAI | null = null;

export function getOpenAIClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("缺少 OPENAI_API_KEY，请在 .env.local 中配置。");
  }

  const baseURL = process.env.OPENAI_BASE_URL;

  cachedClient = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
  return cachedClient;
}

export function getApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("缺少 OPENAI_API_KEY，请在 .env.local 中配置。");
  }

  return apiKey;
}

export function getBaseURL() {
  return process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
}

export function getModelName() {
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}

export function getWireApi() {
  return process.env.OPENAI_WIRE_API || "chat_completions";
}

export function getTimeoutMs() {
  const value = Number(process.env.OPENAI_TIMEOUT_MS ?? "25000");
  return Number.isFinite(value) && value > 0 ? value : 25000;
}
