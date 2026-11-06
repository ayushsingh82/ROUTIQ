import { test } from "node:test";
import assert from "node:assert/strict";
import { explain, NoEligibleProviderError, planRoute, scoreCandidates } from "./router.ts";
import type { Candidate, HealthSnapshot } from "./types.ts";

const health = (id: string, o: Partial<HealthSnapshot> = {}): HealthSnapshot => ({
  providerId: id, status: "up", samples: 10, successRate: 1, avgLatencyMs: 500, lastCheck: 1, lastError: null, ...o,
});
const cand = (id: string, inP: number, outP: number, h: Partial<HealthSnapshot> = {}, rep: number | null = null): Candidate => ({
  providerId: id, providerName: id.toUpperCase(), label: "reference",
  offer: { modelId: "m", inputPerM: inP, outputPerM: outP }, health: health(id, h), reputation: rep,
});
const T = { inputTokens: 1000, outputTokens: 1000 };
const A = cand("a", 2, 2, { avgLatencyMs: 900 });
const B = cand("b", 1, 1, { avgLatencyMs: 400 });
const C = cand("c", 3, 3, { avgLatencyMs: 100 });

test("cheapest picks the lowest estimated cost", () => {
  assert.equal(scoreCandidates([A, B, C], { mode: "cheapest", ...T })[0].providerId, "b");
});

test("fastest picks the lowest measured latency", () => {
  assert.equal(scoreCandidates([A, B, C], { mode: "fastest", ...T })[0].providerId, "c");
});

test("balanced follows the configurable weights", () => {
  const cost = scoreCandidates([A, B, C], { mode: "balanced", weights: { cost: 1, latency: 0, availability: 0, reputation: 0 }, ...T });
  assert.equal(cost[0].providerId, "b");
  const speed = scoreCandidates([A, B, C], { mode: "balanced", weights: { cost: 0, latency: 1, availability: 0, reputation: 0 }, ...T });
  assert.equal(speed[0].providerId, "c");
});

test("down providers are excluded and explained; routing never selects them", () => {
  const down = cand("d", 0.01, 0.01, { status: "down", lastError: "ECONNREFUSED" });
  const scored = scoreCandidates([down, A], { mode: "cheapest", ...T });
  assert.equal(scored[0].providerId, "a");
  const d = scored.find((s) => s.providerId === "d")!;
  assert.equal(d.eligible, false);
  assert.match(d.excludedReason!, /ECONNREFUSED/);
  assert.deepEqual(planRoute(scored, { allowFallback: true }).map((s) => s.providerId), ["a"]);
});

test("unmeasured signals are neutral and labelled, never invented", () => {
  const u = cand("u", 1, 1, { avgLatencyMs: null, successRate: null, status: "unknown" });
  const [s] = scoreCandidates([u], { mode: "balanced", ...T });
  assert.equal(s.scores.latency, 0.5);
  assert.equal(s.scores.availability, 0.5);
  assert.equal(s.scores.reputation, 0.5);
  assert.equal(s.notes.length, 3);
});

test("fallback: only same-model candidates, only when allowed; pinned is never replaced", () => {
  const scored = scoreCandidates([A, B, C], { mode: "cheapest", ...T });
  assert.deepEqual(planRoute(scored, { allowFallback: false }).map((s) => s.providerId), ["b"]);
  assert.deepEqual(planRoute(scored, { allowFallback: true }).map((s) => s.providerId), ["b", "a", "c"]);
  assert.deepEqual(planRoute(scored, { allowFallback: true, pinnedProviderId: "c" }).map((s) => s.providerId), ["c"]);
  assert.throws(() => planRoute(scored, { allowFallback: true, pinnedProviderId: "zzz" }), NoEligibleProviderError);
  const withDown = scoreCandidates([cand("x", 1, 1, { status: "down" }), A], { mode: "cheapest", ...T });
  assert.throws(() => planRoute(withDown, { allowFallback: true, pinnedProviderId: "x" }), NoEligibleProviderError);
});

test("no eligible provider raises a clear error", () => {
  const scored = scoreCandidates([cand("x", 1, 1, { status: "down" })], { mode: "cheapest", ...T });
  assert.throws(() => planRoute(scored, { allowFallback: true }), NoEligibleProviderError);
});

test("ties are broken deterministically", () => {
  const a = scoreCandidates([cand("b", 1, 1), cand("a", 1, 1)], { mode: "cheapest", ...T });
  const b = scoreCandidates([cand("a", 1, 1), cand("b", 1, 1)], { mode: "cheapest", ...T });
  assert.deepEqual(a.map((s) => s.providerId), b.map((s) => s.providerId));
});

test("explain mentions cost, latency, availability and notes", () => {
  const [s] = scoreCandidates([cand("a", 1, 1, { avgLatencyMs: null })], { mode: "balanced", ...T });
  assert.match(explain(s, "balanced"), /cost .*latency .*availability .*reputation.*not measured/);
});

test("a provider that is listed but unavailable (e.g. API key not set) is excluded with its reason", () => {
  const locked = { ...cand("near", 0.01, 0.01), unavailableReason: "NEAR_AI_API_KEY is not set on the server" };
  const scored = scoreCandidates([locked, A], { mode: "cheapest", ...T });
  assert.equal(scored[0].providerId, "a");
  assert.equal(scored.find((s) => s.providerId === "near")!.eligible, false);
  assert.match(scored.find((s) => s.providerId === "near")!.excludedReason!, /NEAR_AI_API_KEY/);
  assert.throws(() => planRoute(scored, { allowFallback: true, pinnedProviderId: "near" }), NoEligibleProviderError);
});
