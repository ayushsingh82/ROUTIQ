// One adapter for every OpenAI-compatible upstream (Ollama, vLLM, Groq, Together, DeepSeek, reference nodes).
import { assertSafeEndpoint } from "../ssrf.ts";
import type { ProviderRuntime } from "../types.ts";

const join = (base: string, path: string) => base.replace(/\/+$/, "") + path;

function headers(p: ProviderRuntime): Record<string, string> {
  const h: Record<string, string> = { "content-type": "application/json", accept: "application/json, text/event-stream" };
  if (p.apiKey) h.authorization = `Bearer ${p.apiKey}`;
  return h;
}

/** A model entry as reported by an upstream /models endpoint (OpenAI shape, plus optional catalogue fields). */
export interface UpstreamModel {
  id: string;
  owned_by?: string;
  name?: string;
  context_length?: number;
  max_output_length?: number;
  pricing?: { input?: number; output?: number };
  input_modalities?: string[];
  output_modalities?: string[];
  supported_features?: string[];
}

export interface ProbeResult {
  ok: boolean;
  ms: number;
  models: string[];
  infos: UpstreamModel[];
  error?: string;
}

/** Health + model discovery in one real request: GET {base}/models. */
export async function probeProvider(p: ProviderRuntime, timeoutMs = 4000): Promise<ProbeResult> {
  const t0 = performance.now();
  try {
    await assertSafeEndpoint(p.baseUrl, { allowLoopback: p.allowLoopback });
    const res = await fetch(join(p.baseUrl, "/models"), { headers: headers(p), signal: AbortSignal.timeout(timeoutMs), redirect: "error" });
    const ms = performance.now() - t0;
    if (!res.ok) return { ok: false, ms, models: [], infos: [], error: `HTTP ${res.status}` };
    const j = (await res.json()) as { data?: UpstreamModel[] };
    const infos = Array.isArray(j.data) ? j.data.filter((m) => m && typeof m.id === "string") : [];
    return { ok: true, ms, models: infos.map((m) => m.id), infos };
  } catch (e) {
    return { ok: false, ms: performance.now() - t0, models: [], infos: [], error: e instanceof Error ? e.message : String(e) };
  }
}

/** Sends a chat completion upstream. The caller owns the Response (stream or JSON). */
export async function chatUpstream(
  p: ProviderRuntime,
  body: unknown,
  opts: { stream: boolean; signal?: AbortSignal },
): Promise<Response> {
  await assertSafeEndpoint(p.baseUrl, { allowLoopback: p.allowLoopback });
  const timeout = AbortSignal.timeout(opts.stream ? 180_000 : 90_000);
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;
  return fetch(join(p.baseUrl, "/chat/completions"), {
    method: "POST",
    headers: headers(p),
    body: JSON.stringify(body),
    signal,
    redirect: "error", // never follow redirects to a host we did not validate
  });
}

/** Reads a response body with a hard size cap. */
export async function readLimited(res: Response, maxBytes = 8 * 1024 * 1024): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("upstream response too large");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
