export type ServerHealthLevel = "ok" | "degraded" | "down";

type ServerStatusState = {
  level: ServerHealthLevel;
  summary: string;
  detail: string | null;
  lastCheckedAt: number | null;
  lastSuccessAt: number | null;
  consecutiveFailures: number;
};

const statusState: ServerStatusState = {
  level: "ok",
  summary: "服务正常",
  detail: "翻译服务可用。",
  lastCheckedAt: null,
  lastSuccessAt: null,
  consecutiveFailures: 0,
};

export function markServerHealthy() {
  const now = Date.now();
  statusState.level = "ok";
  statusState.summary = "服务正常";
  statusState.detail = "翻译服务可用。";
  statusState.lastCheckedAt = now;
  statusState.lastSuccessAt = now;
  statusState.consecutiveFailures = 0;
}

export function markServerFailure(message: string) {
  const now = Date.now();
  statusState.lastCheckedAt = now;
  statusState.consecutiveFailures += 1;
  statusState.level = statusState.consecutiveFailures >= 2 ? "down" : "degraded";
  statusState.summary = statusState.level === "down" ? "服务异常" : "服务波动";
  statusState.detail = summarizeFailure(message);
}

export function getServerStatus() {
  return {
    level: statusState.level,
    summary: statusState.summary,
    detail: statusState.detail,
    last_checked_at: statusState.lastCheckedAt,
    last_success_at: statusState.lastSuccessAt,
    consecutive_failures: statusState.consecutiveFailures,
  };
}

function summarizeFailure(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("temporarily unavailable")) {
    return "上游翻译服务暂时不可用，稍等片刻再试。";
  }

  if (normalized.includes("超时") || normalized.includes("timed out")) {
    return "模型响应较慢，建议稍后再提交翻译。";
  }

  if (normalized.includes("负载较高") || normalized.includes("overloaded")) {
    return "服务当前负载较高，等待一会再发请求会更稳。";
  }

  return "翻译服务刚刚出现异常，建议稍后重试。";
}
