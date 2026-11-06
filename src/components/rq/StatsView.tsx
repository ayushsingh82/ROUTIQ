"use client";

import { useEffect, useState } from "react";
import { getJson } from "./hooks";
import { Card, CardHeader, Stat, compact, ms, usd } from "./ui";

interface Stats {
  requests: number;
  ok: number;
  errors: number;
  fallbacks: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  byProvider: Record<string, { requests: number; costUsd: number; avgLatencyMs: number }>;
  topModels: { model: string; requests: number }[];
  hours: { t: number; requests: number; errors: number }[];
}

export function StatsView() {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => getJson<Stats>("/api/v1/public/stats").then((d) => live && setS(d)).catch((e) => live && setErr(String(e.message ?? e)));
    load();
    const t = setInterval(load, 15_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);
  if (!s) return <p className="text-xs text-muted-foreground">{err ? `Error: ${err}` : "Loading…"}</p>;
  const max = Math.max(1, ...s.hours.map((h) => h.requests + h.errors));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Requests" value={s.requests} sub={`${s.ok} ok · ${s.errors} failed`} />
        <Stat label="Tokens" value={compact(s.inputTokens + s.outputTokens)} sub={`${compact(s.inputTokens)} in · ${compact(s.outputTokens)} out`} />
        <Stat label="Metered cost" value={usd(s.costUsd, 6)} sub="from provider-reported usage" tone="accent" />
        <Stat label="Failovers" value={s.fallbacks} sub="served by a fallback provider" />
      </div>
      <Card>
        <CardHeader title="Requests, last 24 hours" sub="Aggregate across all API keys. No prompts or keys are stored here." />
        <div className="p-5">
          {s.requests === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">No traffic yet. Send a request from the playground and it will show up here.</p>
          ) : (
            <svg viewBox="0 0 480 120" className="h-40 w-full" role="img" aria-label="Requests per hour">
              {s.hours.map((h, i) => {
                const x = 6 + i * 19.5;
                const okH = (h.requests / max) * 100;
                const errH = (h.errors / max) * 100;
                return (
                  <g key={h.t}>
                    <rect x={x} y={110 - okH} width="14" height={okH} style={{ fill: "var(--accent)" }} />
                    <rect x={x} y={110 - okH - errH} width="14" height={errH} style={{ fill: "var(--bad)" }} />
                  </g>
                );
              })}
              <line x1="0" y1="110.5" x2="480" y2="110.5" stroke="var(--border)" />
            </svg>
          )}
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="By provider" />
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-border">
              {Object.entries(s.byProvider).map(([id, b]) => (
                <tr key={id}>
                  <td className="px-5 py-3 text-foreground">{id}</td>
                  <td className="px-3 py-3 text-muted-foreground">{b.requests} req</td>
                  <td className="px-3 py-3 text-muted-foreground">{ms(b.avgLatencyMs)}</td>
                  <td className="px-5 py-3 text-right">{usd(b.costUsd, 6)}</td>
                </tr>
              ))}
              {Object.keys(s.byProvider).length === 0 && <tr><td className="px-5 py-6 text-muted-foreground">—</td></tr>}
            </tbody>
          </table>
        </Card>
        <Card>
          <CardHeader title="Top models" />
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-border">
              {s.topModels.map((m) => (
                <tr key={m.model}>
                  <td className="px-5 py-3 text-foreground">{m.model}</td>
                  <td className="px-5 py-3 text-right text-muted-foreground">{m.requests} req</td>
                </tr>
              ))}
              {s.topModels.length === 0 && <tr><td className="px-5 py-6 text-muted-foreground">—</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
