// The routing engine: deterministic, transparent scoring. No randomness, no hidden inputs.
// Unmeasured signals are scored NEUTRAL (0.5) and said so in `notes`; nothing is fabricated.

import { costUsd } from "./pricing.ts";
import { DEFAULT_WEIGHTS, type Candidate, type RoutePolicy, type ScoredCandidate, type Weights } from "./types.ts";

const NEUTRAL = 0.5;

/** (max - x) / (max - min); 1 when everything ties. Lower raw value = better. */
function lowerIsBetter(x: number, min: number, max: number): number {
  return max === min ? 1 : (max - x) / (max - min);
}

export function scoreCandidates(
  cands: Candidate[],
  opts: { mode: RoutePolicy["mode"]; weights?: Partial<Weights>; inputTokens: number; outputTokens: number },
): ScoredCandidate[] {
  const w: Weights = { ...DEFAULT_WEIGHTS, ...opts.weights };
  const base: ScoredCandidate[] = cands.map((c) => {
    const est = costUsd(c.offer, opts.inputTokens, opts.outputTokens);
    const down = c.health.status === "down";
    const unavailable = c.unavailableReason;
    const priceBad = !Number.isFinite(c.offer.inputPerM) || !Number.isFinite(c.offer.outputPerM) || c.offer.inputPerM < 0 || c.offer.outputPerM < 0;
    return {
      ...c,
      eligible: !down && !priceBad && !unavailable,
      excludedReason: unavailable ?? (down ? `provider is down (${c.health.lastError ?? "failed health checks"})` : priceBad ? "invalid price" : undefined),
      estCostUsd: est,
      scores: { cost: 0, latency: 0, availability: 0, reputation: 0 },
      total: 0,
      notes: [],
    };
  });

  const ok = base.filter((c) => c.eligible);
  const costs = ok.map((c) => c.estCostUsd);
  const lats = ok.map((c) => c.health.avgLatencyMs).filter((v): v is number => v !== null);
  const minC = Math.min(...costs), maxC = Math.max(...costs);
  const minL = Math.min(...lats), maxL = Math.max(...lats);

  for (const c of ok) {
    c.scores.cost = lowerIsBetter(c.estCostUsd, minC, maxC);
    if (c.health.avgLatencyMs === null) {
      c.scores.latency = NEUTRAL;
      c.notes.push("latency not measured yet (neutral)");
    } else {
      c.scores.latency = lowerIsBetter(c.health.avgLatencyMs, minL, maxL);
    }
    if (c.health.successRate === null) {
      c.scores.availability = NEUTRAL;
      c.notes.push("availability not measured yet (neutral)");
    } else {
      c.scores.availability = c.health.successRate;
    }
    if (c.reputation === null) {
      c.scores.reputation = NEUTRAL;
      c.notes.push("no reputation data (neutral)");
    } else {
      c.scores.reputation = c.reputation;
    }
    const totalW = w.cost + w.latency + w.availability + w.reputation || 1;
    c.total = (c.scores.cost * w.cost + c.scores.latency * w.latency + c.scores.availability * w.availability + c.scores.reputation * w.reputation) / totalW;
  }

  const lat = (c: ScoredCandidate) => c.health.avgLatencyMs ?? Number.POSITIVE_INFINITY;
  const cmp: Record<RoutePolicy["mode"], (a: ScoredCandidate, b: ScoredCandidate) => number> = {
    cheapest: (a, b) => a.estCostUsd - b.estCostUsd || lat(a) - lat(b),
    fastest: (a, b) => lat(a) - lat(b) || a.estCostUsd - b.estCostUsd,
    balanced: (a, b) => b.total - a.total || a.estCostUsd - b.estCostUsd,
  };
  const sorted = [...ok].sort((a, b) => cmp[opts.mode](a, b) || a.providerId.localeCompare(b.providerId));
  return [...sorted, ...base.filter((c) => !c.eligible)];
}

export class NoEligibleProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoEligibleProviderError";
  }
}

/**
 * Orders providers to try. Fallback never changes the MODEL: every candidate already serves the requested
 * model. Fallback is used only if the policy allows it; a pinned provider is never silently replaced.
 */
export function planRoute(scored: ScoredCandidate[], policy: Pick<RoutePolicy, "allowFallback" | "pinnedProviderId">): ScoredCandidate[] {
  const eligible = scored.filter((c) => c.eligible);
  if (policy.pinnedProviderId) {
    const pinned = scored.find((c) => c.providerId === policy.pinnedProviderId);
    if (!pinned) throw new NoEligibleProviderError(`Provider "${policy.pinnedProviderId}" does not serve this model`);
    if (!pinned.eligible) throw new NoEligibleProviderError(`Provider "${pinned.providerId}" is unavailable: ${pinned.excludedReason}`);
    return [pinned];
  }
  if (eligible.length === 0) throw new NoEligibleProviderError("No eligible provider is currently available for this model");
  return policy.allowFallback ? eligible : eligible.slice(0, 1);
}

/** Human-readable reason for a choice, used by /routing/preview and the UI. */
export function explain(c: ScoredCandidate, mode: RoutePolicy["mode"]): string {
  const s = c.scores;
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const parts = [`est. $${c.estCostUsd.toFixed(6)}`, `cost ${pct(s.cost)}`, `latency ${pct(s.latency)}`, `availability ${pct(s.availability)}`, `reputation ${pct(s.reputation)}`];
  return `${c.providerName}: ${parts.join(" · ")} (mode: ${mode})${c.notes.length ? ` — ${c.notes.join("; ")}` : ""}`;
}
