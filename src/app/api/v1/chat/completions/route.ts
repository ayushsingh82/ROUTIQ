import { randomUUID } from "node:crypto";
import { chatUpstream, readLimited } from "@/lib/routiq/adapters/openaiCompat";
import { recordHealth } from "@/lib/routiq/health";
import { apiError, authenticate, isResponse } from "@/lib/routiq/http";
import { costUsd, DEFAULT_EXPECTED_OUTPUT_TOKENS, estimateInputTokens } from "@/lib/routiq/pricing";
import { buildCandidates, getProvider } from "@/lib/routiq/providers";
import { explain, NoEligibleProviderError, planRoute, scoreCandidates } from "@/lib/routiq/router";
import { recordRouting } from "@/lib/routiq/routingLog";
import { recordUsage } from "@/lib/routiq/usage";
import type { RouteMode, ScoredCandidate } from "@/lib/routiq/types";


const MAX_BODY_BYTES = 1024 * 1024;
const MODES: RouteMode[] = ["cheapest", "fastest", "balanced"];
const enc = new TextEncoder();
const dec = new TextDecoder();

interface Usage {
  prompt_tokens?: number;
  completion_tokens?: number;
}

function parsePolicy(req: Request, body: Record<string, unknown>) {
  const v = (body.routiq ?? {}) as { mode?: unknown; fallback?: unknown; provider?: unknown };
  const modeRaw = String(v.mode ?? req.headers.get("x-routiq-mode") ?? "balanced");
  const mode = (MODES as string[]).includes(modeRaw) ? (modeRaw as RouteMode) : "balanced";
  const fbRaw = v.fallback ?? req.headers.get("x-routiq-fallback");
  const allowFallback = fbRaw === undefined || fbRaw === null ? true : String(fbRaw) !== "false" && fbRaw !== false && String(fbRaw) !== "0";
  const pinned = String(v.provider ?? req.headers.get("x-routiq-provider") ?? "") || undefined;
  return { mode, allowFallback, pinnedProviderId: pinned };
}

export async function POST(req: Request) {
  const key = authenticate(req);
  if (isResponse(key)) return key;

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return apiError(413, "Request body too large (max 1 MB).", "invalid_request_error", "body_too_large");
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return apiError(413, "Request body too large (max 1 MB).", "invalid_request_error", "body_too_large");
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    return apiError(400, "Body must be valid JSON.", "invalid_request_error", "invalid_json");
  }
  const model = typeof body.model === "string" ? body.model : "";
  if (!model || model.length > 200) return apiError(400, "`model` is required.", "invalid_request_error", "model_required");
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 500) return apiError(400, "`messages` must be a non-empty array.", "invalid_request_error", "messages_required");
  const stream = body.stream === true;

  const policy = parsePolicy(req, body);
  const cands = await buildCandidates(model);
  if (cands.length === 0) return apiError(404, `No provider currently serves model "${model}".`, "invalid_request_error", "model_not_found");

  const inputEst = estimateInputTokens(body.messages);
  const scored = scoreCandidates(cands, { mode: policy.mode, inputTokens: inputEst, outputTokens: Number(body.max_tokens) || DEFAULT_EXPECTED_OUTPUT_TOKENS });
  let chain: ScoredCandidate[];
  try {
    chain = planRoute(scored, policy);
  } catch (e) {
    if (e instanceof NoEligibleProviderError) return apiError(503, e.message, "server_error", "no_eligible_provider");
    throw e;
  }

  const requestIdForLog = `req_${randomUUID()}`;
  recordRouting({
    requestId: requestIdForLog,
    keyId: key.id,
    model,
    mode: policy.mode,
    allowFallback: policy.allowFallback,
    pinned: policy.pinnedProviderId,
    chain: chain.map((c) => c.providerId),
    selected: chain[0]?.providerId ?? null,
    reasons: Object.fromEntries(chain.map((c) => [c.providerId, explain(c, policy.mode)])),
    excluded: Object.fromEntries(scored.filter((c) => !c.eligible).map((c) => [c.providerId, c.excludedReason ?? "excluded"])),
    createdAt: Date.now(),
  });

  // Never forward routing hints or our own fields upstream.
  const upstreamBody: Record<string, unknown> = { ...body };
  delete upstreamBody.routiq;
  if (stream) upstreamBody.stream_options = { ...((body.stream_options as object) ?? {}), include_usage: true };

  const requestId = requestIdForLog;
  const failed: string[] = [];

  for (const c of chain) {
    const p = getProvider(c.providerId);
    if (!p) continue;
    const t0 = performance.now();
    try {
      const res = await chatUpstream(p, upstreamBody, { stream, signal: req.signal });
      if (res.status >= 500 || res.status === 429) throw new Error(`upstream HTTP ${res.status}`);
      const baseHeaders: Record<string, string> = {
        "x-routiq-request-id": requestId,
        "x-routiq-provider": p.id,
        "x-routiq-provider-name": p.name,
        "x-routiq-mode": policy.mode,
        "x-routiq-fallback-from": failed.join(","),
      };
      if (!res.ok) {
        // 4xx = the request itself is wrong; passing it through is correct and not a provider failure.
        const errText = await readLimited(res, 64 * 1024).catch(() => "");
        return new Response(errText || JSON.stringify({ error: { message: `Upstream returned ${res.status}` } }), { status: res.status, headers: { "content-type": "application/json", ...baseHeaders } });
      }

      const finish = (u: { usage?: Usage | null; outChars: number; status: "ok" | "interrupted" }) => {
        const hasUsage = u.usage && (u.usage.prompt_tokens !== undefined || u.usage.completion_tokens !== undefined);
        const inTok = hasUsage ? Number(u.usage?.prompt_tokens ?? 0) : inputEst;
        const outTok = hasUsage ? Number(u.usage?.completion_tokens ?? 0) : Math.ceil(u.outChars / 4);
        const cost = costUsd(c.offer, inTok, outTok);
        const latencyMs = Math.round(performance.now() - t0);
        recordUsage({ requestId, keyId: key.id, model, providerId: p.id, providerName: p.name, mode: policy.mode, inputTokens: inTok, outputTokens: outTok, tokensEstimated: !hasUsage, costUsd: cost, latencyMs, status: u.status, fallbackFrom: failed.length ? failed : undefined, createdAt: Date.now() });
        recordHealth(p.id, true, latencyMs, undefined, false);
        return { inTok, outTok, cost, latencyMs, estimated: !hasUsage };
      };

      if (!stream) {
        const raw = await readLimited(res);
        const json = JSON.parse(raw) as { usage?: Usage; choices?: { message?: { content?: string } }[] };
        const out = json.choices?.[0]?.message?.content ?? "";
        const m = finish({ usage: json.usage, outChars: out.length, status: "ok" });
        return Response.json(json, { headers: { ...baseHeaders, "x-routiq-cost-usd": m.cost.toFixed(8), "x-routiq-tokens-estimated": String(m.estimated), "x-routiq-latency-ms": String(m.latencyMs) } });
      }

      // Streaming: pass bytes through untouched, meter usage on the way, then append an SSE *comment* with
      // routing/cost metadata (comments are ignored by SSE parsers, so OpenAI SDKs are unaffected).
      const upstream = res.body;
      if (!upstream) throw new Error("upstream sent no body");
      let usage: Usage | null = null;
      let outChars = 0;
      let buf = "";
      let done = false;
      const readerRef = upstream.getReader();
      const out = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for (;;) {
              const { done: d, value } = await readerRef.read();
              if (d) break;
              controller.enqueue(value);
              buf += dec.decode(value, { stream: true });
              let i: number;
              while ((i = buf.indexOf("\n")) >= 0) {
                const line = buf.slice(0, i).trim();
                buf = buf.slice(i + 1);
                if (!line.startsWith("data:")) continue;
                const data = line.slice(5).trim();
                if (!data || data === "[DONE]") continue;
                try {
                  const j = JSON.parse(data) as { usage?: Usage; choices?: { delta?: { content?: string } }[] };
                  if (j.usage) usage = j.usage;
                  const delta = j.choices?.[0]?.delta?.content;
                  if (typeof delta === "string") outChars += delta.length;
                } catch {
                  /* partial or non-JSON line */
                }
              }
            }
            done = true;
            const m = finish({ usage, outChars, status: "ok" });
            controller.enqueue(enc.encode(`: routiq ${JSON.stringify({ request_id: requestId, provider: p.id, provider_name: p.name, mode: policy.mode, input_tokens: m.inTok, output_tokens: m.outTok, tokens_estimated: m.estimated, cost_usd: m.cost, latency_ms: m.latencyMs, fallback_from: failed })}\n\n`));
            controller.close();
          } catch (e) {
            if (!done) {
              done = true;
              finish({ usage, outChars, status: "interrupted" });
            }
            controller.error(e);
          }
        },
        cancel() {
          if (!done) {
            done = true;
            finish({ usage, outChars, status: "interrupted" });
          }
          void readerRef.cancel();
        },
      });
      return new Response(out, { headers: { ...baseHeaders, "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", "x-accel-buffering": "no" } });
    } catch (e) {
      if (req.signal.aborted) return apiError(499, "Client closed the request.", "invalid_request_error", "client_closed");
      const msg = e instanceof Error ? e.message : String(e);
      recordHealth(p.id, false, Math.round(performance.now() - t0), msg, false);
      failed.push(p.id);
      // Loop continues to the next provider for the SAME model (planRoute already enforced fallback policy).
    }
  }
  recordUsage({ requestId, keyId: key.id, model, providerId: failed[failed.length - 1] ?? "none", providerName: "-", mode: policy.mode, inputTokens: inputEst, outputTokens: 0, tokensEstimated: true, costUsd: 0, latencyMs: 0, status: "error", fallbackFrom: failed, createdAt: Date.now() });
  return apiError(502, `All eligible providers failed for "${model}" (${failed.join(", ")}).`, "server_error", "all_providers_failed");
}
