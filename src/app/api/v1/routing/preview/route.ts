import { apiError, authenticate, isResponse } from "@/lib/routiq/http";
import { DEFAULT_EXPECTED_OUTPUT_TOKENS, estimateInputTokens } from "@/lib/routiq/pricing";
import { buildCandidates } from "@/lib/routiq/providers";
import { explain, NoEligibleProviderError, planRoute, scoreCandidates } from "@/lib/routiq/router";
import type { RouteMode } from "@/lib/routiq/types";


/** Explains which provider WOULD be chosen and why, without sending any inference request. */
export async function POST(req: Request) {
  const key = authenticate(req);
  if (isResponse(key)) return key;
  let b: { model?: string; mode?: string; fallback?: boolean; provider?: string; messages?: unknown; expected_output_tokens?: number };
  try {
    b = await req.json();
  } catch {
    return apiError(400, "Body must be valid JSON.", "invalid_request_error", "invalid_json");
  }
  if (!b.model) return apiError(400, "`model` is required.", "invalid_request_error", "model_required");
  const mode: RouteMode = b.mode === "cheapest" || b.mode === "fastest" ? b.mode : "balanced";
  const cands = await buildCandidates(b.model);
  if (cands.length === 0) return apiError(404, `No provider currently serves model "${b.model}".`, "invalid_request_error", "model_not_found");
  const scored = scoreCandidates(cands, { mode, inputTokens: estimateInputTokens(b.messages ?? ""), outputTokens: b.expected_output_tokens ?? DEFAULT_EXPECTED_OUTPUT_TOKENS });
  let chain: string[] = [];
  let error: string | null = null;
  try {
    chain = planRoute(scored, { allowFallback: b.fallback !== false, pinnedProviderId: b.provider }).map((c) => c.providerId);
  } catch (e) {
    if (e instanceof NoEligibleProviderError) error = e.message;
    else throw e;
  }
  return Response.json({
    model: b.model,
    strategy: mode,
    selectedProvider: chain[0] ?? null,
    reason: chain[0] ? (scored.find((c) => c.providerId === chain[0]) ? explain(scored.find((c) => c.providerId === chain[0])!, mode) : null) : error,
    alternatives: chain.slice(1),
    mode,
    selected: chain[0] ?? null,
    chain,
    error,
    estimate_is_pre_flight: true,
    candidates: scored.map((c) => ({
      provider: c.providerId,
      name: c.providerName,
      label: c.label,
      eligible: c.eligible,
      excluded_reason: c.excludedReason ?? null,
      est_cost_usd: c.estCostUsd,
      scores: c.scores,
      total: c.total,
      notes: c.notes,
      explanation: explain(c, mode),
    })),
  });
}
