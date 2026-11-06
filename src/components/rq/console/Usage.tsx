"use client";

import { useCallback, useEffect, useState } from "react";
import { getJson } from "../hooks";
import { Card, CardHeader, Stat, compact, ms, usd } from "../ui";
import { useConsoleKey } from "./ConsoleShell";

interface Range {
  days: number;
  requests: number;
  failed: number;
  tokens: number;
  costUsd: number;
  avgLatencyMs: number | null;
  byDay: { date: string; requests: number; tokens: number; costUsd: number }[];
  byModel: { name: string; requests: number; tokens: number; costUsd: number }[];
  byProvider: { name: string; requests: number; tokens: number; costUsd: number }[];
}
const TABS = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

export function Usage() {
  const { key } = useConsoleKey();
  const [days, setDays] = useState(30);
  const [r, setR] = useState<Range | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!key) return;
    try {
      setR((await getJson<{ range: Range }>(`/api/v1/usage?days=${days}`, key)).range);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [key, days]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [load]);

  const max = Math.max(1, ...(r?.byDay.map((d) => d.tokens) ?? [1]));
  const label = TABS.find((t) => t.days === days)?.label ?? `${days}d`;
  const empty = !r || r.requests === 0;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-neutral-500">Monitor your resource consumption and usage metrics.</p>
        <div className="inline-flex overflow-hidden border border-neutral-800 text-xs">
          {TABS.map((t) => (
            <button key={t.label} onClick={() => setDays(t.days)} className={`px-4 py-2 transition ${days === t.days ? "bg-white text-black" : "text-neutral-400 hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 [&>*]:-ml-px [&>*]:-mt-px">
        <Stat label="Requests" value={r?.requests ?? "—"} sub={`Last ${label}${r?.failed ? ` · ${r.failed} failed` : ""}`} />
        <Stat label="Total tokens" value={r ? compact(r.tokens) : "—"} sub="Across all models" />
        <Stat label="Total cost" value={r ? usd(r.costUsd, 4) : "—"} sub="Metered offchain, from provider usage" />
        <Stat label="Avg latency" value={r ? ms(r.avgLatencyMs) : "—"} sub="Per completed request" />
      </div>
      {err && <p className="text-xs text-bad">{err}</p>}

      <section>
        <h3 className="text-xl font-semibold tracking-tight">Token consumption by day</h3>
        <p className="mt-1 text-sm text-neutral-500">Tokens used over the last {label}</p>
        <Card className="mt-5">
          {empty ? (
            <div className="grid min-h-[260px] place-items-center p-10 text-center">
              <div>
                <svg className="mx-auto mb-4 text-neutral-700" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 20V4M4 20h16M8 15l3-4 3 2 4-6" />
                </svg>
                <p className="text-sm font-medium">No usage data available</p>
                <p className="mx-auto mt-1 max-w-xs text-xs text-neutral-500">Requests will appear here once they have token consumption. Try the playground.</p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <svg viewBox="0 0 600 160" className="h-56 w-full" role="img" aria-label="Tokens per day">
                {r!.byDay.map((d, i) => {
                  const w = 600 / r!.byDay.length;
                  const h = (d.tokens / max) * 140;
                  return (
                    <g key={d.date}>
                      <rect x={i * w + w * 0.15} y={150 - h} width={w * 0.7} height={Math.max(h, d.tokens ? 2 : 0)} fill="#fafafa" opacity={d.tokens ? 0.9 : 0.1}>
                        <title>{`${d.date}: ${d.tokens} tokens, ${d.requests} requests, ${usd(d.costUsd, 6)}`}</title>
                      </rect>
                    </g>
                  );
                })}
                <line x1="0" y1="150.5" x2="600" y2="150.5" stroke="#262626" />
              </svg>
              <div className="mt-2 flex justify-between font-mono text-[10px] text-neutral-600">
                <span>{r!.byDay[0]?.date}</span>
                <span>{r!.byDay[r!.byDay.length - 1]?.date}</span>
              </div>
            </div>
          )}
        </Card>
      </section>

      <div className="grid lg:grid-cols-2 [&>*]:-ml-px">
        <Card>
          <CardHeader title="By model" sub="Leaderboard by tokens" />
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-neutral-900">
              {(r?.byModel ?? []).map((m, i) => (
                <tr key={m.name}>
                  <td className="w-10 px-5 py-3 font-mono text-neutral-600">{i + 1}</td>
                  <td className="py-3 text-white">{m.name}</td>
                  <td className="px-3 py-3 text-neutral-500">{compact(m.tokens)} tok</td>
                  <td className="px-5 py-3 text-right">{usd(m.costUsd, 6)}</td>
                </tr>
              ))}
              {empty && <tr><td className="px-5 py-8 text-neutral-600">No usage data available</td></tr>}
            </tbody>
          </table>
        </Card>
        <Card>
          <CardHeader title="By provider" sub="Where requests were served" />
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-neutral-900">
              {(r?.byProvider ?? []).map((p) => (
                <tr key={p.name}>
                  <td className="px-5 py-3 text-white">{p.name}</td>
                  <td className="px-3 py-3 text-neutral-500">{p.requests} req</td>
                  <td className="px-3 py-3 text-neutral-500">{compact(p.tokens)} tok</td>
                  <td className="px-5 py-3 text-right">{usd(p.costUsd, 6)}</td>
                </tr>
              ))}
              {empty && <tr><td className="px-5 py-8 text-neutral-600">No usage data available</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
