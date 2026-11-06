import { rateLimit, verifyKey, type KeyRecord } from "./keys.ts";

/** OpenAI-shaped error body so SDKs surface it properly. */
export function apiError(status: number, message: string, type = "invalid_request_error", code?: string, headers?: Record<string, string>): Response {
  return Response.json({ error: { message, type, code: code ?? null } }, { status, headers });
}

/** Bearer-key auth + per-key rate limit. Returns the key record or an error Response. */
export function authenticate(req: Request): KeyRecord | Response {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(\S+)$/i.exec(h);
  if (!m) return apiError(401, "Missing API key. Send `Authorization: Bearer rq_live_…`.", "authentication_error", "missing_api_key");
  const key = verifyKey(m[1]);
  if (!key) return apiError(401, "Invalid or revoked API key.", "authentication_error", "invalid_api_key");
  const rl = rateLimit(key.id, key.rpm);
  if (!rl.ok) return apiError(429, `Rate limit exceeded (${key.rpm}/min).`, "rate_limit_error", "rate_limited", { "retry-after": String(rl.retryAfterSec) });
  return key;
}

export const isResponse = (v: unknown): v is Response => v instanceof Response;
