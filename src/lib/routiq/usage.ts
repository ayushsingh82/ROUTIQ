import { readJson, writeJson } from "./store.ts";
import type { UsageRecord } from "./types.ts";

const FILE = "usage.json";
const MAX = 5000;
let cache: UsageRecord[] | null = null;

const all = () => (cache ??= readJson<UsageRecord[]>(FILE, []));

export function recordUsage(u: UsageRecord): void {
  const list = all();
  list.push(u);
  if (list.length > MAX) list.splice(0, list.length - MAX);
  writeJson(FILE, list);
}

export function usageFor(keyId: string, limit = 100): UsageRecord[] {
  return all().filter((u) => u.keyId === keyId).slice(-limit).reverse();
}

export function summarize(keyId: string) {
  const rows = all().filter((u) => u.keyId === keyId);
  const sum = (f: (u: UsageRecord) => number) => rows.reduce((a, u) => a + f(u), 0);
  const byProvider: Record<string, { requests: number; costUsd: number }> = {};
  for (const u of rows) {
    const b = (byProvider[u.providerId] ??= { requests: 0, costUsd: 0 });
    b.requests++;
    b.costUsd += u.costUsd;
  }
  return {
    requests: rows.length,
    inputTokens: sum((u) => u.inputTokens),
    outputTokens: sum((u) => u.outputTokens),
    costUsd: sum((u) => u.costUsd),
    byProvider,
  };
}

export function resetUsageCache(): void {
  cache = null;
}

/** Aggregate over ALL keys, for the public stats page. Contains no prompts, keys or per-user data. */
export function globalSummary(now = Date.now()) {
  const rows = all();
  const ok = rows.filter((u) => u.status === "ok");
  const byProvider: Record<string, { requests: number; costUsd: number; avgLatencyMs: number }> = {};
  const byModel: Record<string, number> = {};
  for (const u of ok) {
    const b = (byProvider[u.providerId] ??= { requests: 0, costUsd: 0, avgLatencyMs: 0 });
    b.avgLatencyMs = (b.avgLatencyMs * b.requests + u.latencyMs) / (b.requests + 1);
    b.requests++;
    b.costUsd += u.costUsd;
    byModel[u.model] = (byModel[u.model] ?? 0) + 1;
  }
  // 24 hourly buckets, oldest → newest
  const hours = Array.from({ length: 24 }, (_, i) => ({ t: now - (23 - i) * 3_600_000, requests: 0, errors: 0 }));
  for (const u of rows) {
    const idx = 23 - Math.floor((now - u.createdAt) / 3_600_000);
    if (idx >= 0 && idx < 24) {
      if (u.status === "ok") hours[idx].requests += 1;
      else hours[idx].errors += 1;
    }
  }
  return {
    requests: rows.length,
    ok: ok.length,
    errors: rows.length - ok.length,
    fallbacks: rows.filter((u) => u.fallbackFrom?.length).length,
    inputTokens: ok.reduce((a, u) => a + u.inputTokens, 0),
    outputTokens: ok.reduce((a, u) => a + u.outputTokens, 0),
    costUsd: ok.reduce((a, u) => a + u.costUsd, 0),
    byProvider,
    topModels: Object.entries(byModel).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([model, requests]) => ({ model, requests })),
    hours,
  };
}

/** Per-key usage over the last `days` days, bucketed by UTC day, plus per-model and per-provider leaderboards. */
export function rangeSummary(keyId: string, days: number, now = Date.now()) {
  const n = Math.min(Math.max(Math.round(days), 1), 90);
  const since = now - n * 86_400_000;
  const rows = all().filter((u) => u.keyId === keyId && u.createdAt >= since);
  const ok = rows.filter((u) => u.status === "ok");
  const day = (t: number) => new Date(t).toISOString().slice(0, 10);
  const byDay = new Map<string, { date: string; requests: number; tokens: number; costUsd: number }>();
  for (let i = n - 1; i >= 0; i--) {
    const d = day(now - i * 86_400_000);
    byDay.set(d, { date: d, requests: 0, tokens: 0, costUsd: 0 });
  }
  const add = (m: Map<string, { requests: number; tokens: number; costUsd: number }>, k: string, u: UsageRecord) => {
    const b = m.get(k) ?? { requests: 0, tokens: 0, costUsd: 0 };
    b.requests++;
    b.tokens += u.inputTokens + u.outputTokens;
    b.costUsd += u.costUsd;
    m.set(k, b);
  };
  const byModel = new Map<string, { requests: number; tokens: number; costUsd: number }>();
  const byProvider = new Map<string, { requests: number; tokens: number; costUsd: number }>();
  for (const u of ok) {
    const d = byDay.get(day(u.createdAt));
    if (d) {
      d.requests++;
      d.tokens += u.inputTokens + u.outputTokens;
      d.costUsd += u.costUsd;
    }
    add(byModel, u.model, u);
    add(byProvider, u.providerId, u);
  }
  const list = (m: Map<string, { requests: number; tokens: number; costUsd: number }>) => [...m.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.tokens - a.tokens);
  return {
    days: n,
    requests: ok.length,
    failed: rows.length - ok.length,
    tokens: ok.reduce((a, u) => a + u.inputTokens + u.outputTokens, 0),
    costUsd: ok.reduce((a, u) => a + u.costUsd, 0),
    avgLatencyMs: ok.length ? ok.reduce((a, u) => a + u.latencyMs, 0) / ok.length : null,
    byDay: [...byDay.values()],
    byModel: list(byModel).slice(0, 10),
    byProvider: list(byProvider),
  };
}
