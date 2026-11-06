// Interprets an httpbin-style echo response ({ origin, headers, json }) as "what the provider observed".
// Pure + dependency-free so it is unit-testable.

export interface ProviderObservation {
  /** Source IP(s) the endpoint saw (comma-separated when behind proxies). */
  ips: string[];
  userAgent: string | null;
  acceptLanguage: string | null;
  referer: string | null;
  /** The JSON-RPC call content the provider could read (method + first param). */
  method: string | null;
  queriedAddress: string | null;
}

function pick(headers: Record<string, string>, name: string): string | null {
  const k = Object.keys(headers).find((h) => h.toLowerCase() === name.toLowerCase());
  return k ? headers[k] : null;
}

export function parseEcho(raw: unknown): ProviderObservation {
  const o = (raw ?? {}) as { origin?: unknown; headers?: unknown; json?: unknown };
  const headers = (typeof o.headers === "object" && o.headers ? o.headers : {}) as Record<string, string>;
  const json = (typeof o.json === "object" && o.json ? o.json : {}) as { method?: unknown; params?: unknown };
  const params = Array.isArray(json.params) ? json.params : [];
  return {
    ips: typeof o.origin === "string" ? o.origin.split(",").map((s) => s.trim()).filter(Boolean) : [],
    userAgent: pick(headers, "user-agent"),
    acceptLanguage: pick(headers, "accept-language"),
    referer: pick(headers, "referer"),
    method: typeof json.method === "string" ? json.method : null,
    queriedAddress: typeof params[0] === "string" ? params[0] : null,
  };
}

export type Verdict = "unlinked" | "same-ip" | "unknown";

/** "unlinked" iff both sides reported IPs and they share none. */
export function compareObservations(direct: ProviderObservation, anon: ProviderObservation): Verdict {
  if (direct.ips.length === 0 || anon.ips.length === 0) return "unknown";
  return direct.ips.some((ip) => anon.ips.includes(ip)) ? "same-ip" : "unlinked";
}
