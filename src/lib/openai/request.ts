import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { ZodTypeAny } from "zod";

import { getApiKey, getBaseURL, getModelName, getTimeoutMs, getWireApi } from "@/lib/openai/client";
import { markServerFailure, markServerHealthy } from "@/lib/server-status";

const execFileAsync = promisify(execFile);

export class ModelOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelOutputError";
  }
}

export async function runStructuredRequest<TSchema extends ZodTypeAny>({
  schema,
  systemPrompt,
  userPrompt,
  performanceProfile = "default",
  model,
}: {
  schema: TSchema;
  schemaName: string;
  systemPrompt: string;
  userPrompt: string;
  performanceProfile?: "default" | "fast";
  model?: string;
}) {
  const requestBody = {
    model: model || getModelName(),
    systemPrompt,
    userPrompt,
    performanceProfile,
  };

  const payload = await runViaCurl(requestBody);
  const content = extractTextContent(payload);

  if (!content) {
    throw new ModelOutputError("模型返回了空的结构化输出。");
  }

  return schema.parse(extractAndParseJson(content)) as ReturnType<TSchema["parse"]>;
}

async function runViaCurl(requestBody: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  performanceProfile: "default" | "fast";
}) {
  const wireApi = normalizeWireApi(getWireApi());
  const apiUrl =
    wireApi === "responses"
      ? `${getBaseURL().replace(/\/$/, "")}/responses`
      : `${getBaseURL().replace(/\/$/, "")}/chat/completions`;
  const timeoutSec = Math.max(15, Math.ceil(getTimeoutMs() / 1000));
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const payloadFile = join(tmpdir(), `mx-payload-${randomUUID()}.json`);
    try {
      const payload = buildProviderPayload(requestBody, wireApi);
      await fs.writeFile(payloadFile, JSON.stringify(payload), "utf8");

      const { stdout } = await execFileAsync("curl", [
        "-sS",
        "--max-time",
        String(timeoutSec),
        "--connect-timeout",
        "10",
        "-X",
        "POST",
        apiUrl,
        "-H",
        "Content-Type: application/json",
        "-H",
        "Accept: application/json",
        "-H",
        `Authorization: Bearer ${getApiKey()}`,
        "-H",
        "User-Agent: curl/8.7.1",
        "--data-binary",
        `@${payloadFile}`,
      ]);

      if (!stdout) {
        throw new Error("模型服务返回了空响应。");
      }

      if (isHtmlResponseBody(stdout)) {
        throw new Error("模型服务返回了 HTML 拦截页（可能触发风控或网关拦截）。");
      }

      const parsed = JSON.parse(stdout) as {
        output_text?: string;
        output?: Array<{
          content?: Array<{ type?: string; text?: string }>;
        }>;
        choices?: Array<{ message?: { content?: string | null } }>;
        error?: { message?: string };
        message?: string;
      };

      const providerError = parsed.error?.message || parsed.message;
      if (providerError) {
        throw new Error(providerError);
      }

      markServerHealthy();
      return parsed;
    } catch (error) {
      const withStderr = error as { stderr?: string; message?: string };
      const stderr = (withStderr.stderr || "").trim();
      const rawMessage = stderr ? `模型服务请求失败：${stderr}` : withStderr.message || "模型服务请求失败。";
      const message = humanizeProviderError(rawMessage, attempt, 4, timeoutSec);
      lastError = new Error(message);
      markServerFailure(message);

      if (!isRetryableProviderError(rawMessage) || attempt === 4) {
        throw lastError;
      }

      await sleep(900 * attempt);
    } finally {
      await fs.unlink(payloadFile).catch(() => undefined);
    }
  }

  throw lastError || new Error("模型服务请求失败。");
}

function buildProviderPayload(
  requestBody: {
    model: string;
    systemPrompt: string;
    userPrompt: string;
    performanceProfile: "default" | "fast";
  },
  wireApi: "responses" | "chat_completions",
) {
  if (wireApi === "responses") {
    return {
      model: requestBody.model,
      input: [
        { role: "system", content: requestBody.systemPrompt },
        { role: "user", content: requestBody.userPrompt },
      ],
      reasoning: { effort: requestBody.performanceProfile === "fast" ? "minimal" : "medium" },
      text: { verbosity: requestBody.performanceProfile === "fast" ? "low" : "medium" },
    };
  }

  return {
    model: requestBody.model,
    messages: [
      { role: "system", content: requestBody.systemPrompt },
      { role: "user", content: requestBody.userPrompt },
    ],
    temperature: requestBody.performanceProfile === "fast" ? 0 : 0.2,
  };
}

function normalizeWireApi(value: string): "responses" | "chat_completions" {
  const normalized = value.trim().toLowerCase();
  if (normalized === "responses") {
    return "responses";
  }
  return "chat_completions";
}

function extractTextContent(payload: {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  choices?: Array<{ message?: { content?: string | null } }>;
}) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  const outputText = payload.output
    ?.flatMap((item) => item.content || [])
    .find((part) => part.type === "output_text" || part.type === "text")?.text;
  if (outputText && outputText.trim()) {
    return outputText;
  }

  return payload.choices?.[0]?.message?.content;
}

function extractAndParseJson(content: string) {
  const normalized = content.trim();
  const fencedMatch =
    normalized.match(/```json\s*([\s\S]*?)```/i) || normalized.match(/```\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() || normalized;

  try {
    return JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    }

    throw new ModelOutputError("模型返回了格式错误的 JSON。");
  }
}

function isHtmlResponseBody(text: string) {
  const normalized = text.trim().toLowerCase();
  return normalized.startsWith("<!doctype") || normalized.startsWith("<html");
}

function isRetryableProviderError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("2064") ||
    normalized.includes("overloaded") ||
    normalized.includes("timed out") ||
    normalized.includes("connection timed out") ||
    normalized.includes("curl: (28)") ||
    normalized.includes("curl: (35)") ||
    normalized.includes("curl: (52)") ||
    normalized.includes("curl: (56)") ||
    normalized.includes("empty reply from server") ||
    normalized.includes("html block page")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function humanizeProviderError(message: string, attempt: number, maxAttempts: number, timeoutSec: number) {
  const normalized = message.toLowerCase();

  if (normalized.includes("curl: (28)") || normalized.includes("timed out")) {
    if (attempt < maxAttempts) {
      return `模型响应较慢，正在自动重试（第 ${attempt}/${maxAttempts} 次，单次超时 ${timeoutSec} 秒）。`;
    }

    return `模型响应超时。服务端在 ${timeoutSec} 秒内没有返回结果，请稍后重试，或换一个更快的模型/代理。`;
  }

  if (normalized.includes("overloaded")) {
    return "模型服务当前负载较高，请稍后再试。";
  }

  if (normalized.includes("html block page")) {
    return "模型服务返回了异常拦截页，可能是代理或网关暂时不可用。";
  }

  return message;
}
