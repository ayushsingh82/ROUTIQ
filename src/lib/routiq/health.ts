// Rolling health per provider, fed ONLY by real probes and real requests.
import type { HealthSnapshot } from "./types.ts";

interface Sample {
  t: number;
  ok: boolean;
  ms: number;
  /** Whether `ms` counts toward the latency average. Only like-for-like probe timings do. */
  lat: boolean;
  error?: string;
}
const WINDOW = 30;
const samples = new Map<string, Sample[]>();

/**
 * Probes record `latency = true` (a fixed, comparable /models round trip). Real chat requests record success/failure
 * only (`latency = false`): their duration depends on output length, so they must not skew the latency average.
 */
export function recordHealth(providerId: string, ok: boolean, ms: number, error?: string, latency = true): void {
  const list = samples.get(providerId) ?? [];
  list.push({ t: Date.now(), ok, ms, lat: latency, error });
  if (list.length > WINDOW) list.shift();
  samples.set(providerId, list);
}

export function healthSnapshot(providerId: string): HealthSnapshot {
  const list = samples.get(providerId) ?? [];
  if (list.length === 0) {
    return { providerId, status: "unknown", samples: 0, successRate: null, avgLatencyMs: null, lastCheck: null, lastError: null };
  }
  const oks = list.filter((s) => s.ok);
  const lats = list.filter((s) => s.ok && s.lat);
  const last = list[list.length - 1];
  const lastTwoFailed = list.length >= 2 ? !list[list.length - 1].ok && !list[list.length - 2].ok : !last.ok;
  return {
    providerId,
    status: lastTwoFailed ? "down" : "up",
    samples: list.length,
    successRate: oks.length / list.length,
    avgLatencyMs: lats.length ? lats.reduce((a, s) => a + s.ms, 0) / lats.length : null,
    lastCheck: last.t,
    lastError: [...list].reverse().find((s) => !s.ok)?.error ?? null,
  };
}

export function resetHealth(): void {
  samples.clear();
}
