"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { anonStore } from "@/lib/anon-rpc/manager";
import { getJson, useCatalog } from "../hooks";
import { Badge, Card, CardHeader, LinkButton, Stat, compact, ms, usd } from "../ui";
import { useConsoleKey } from "./ConsoleShell";
import type { RoutingRow, UsageResponse } from "./types";
import { ActivityChart, FrameTxProof, PrivacyMeter, ProviderHealth, SpendByProvider } from "./Widgets";

export function Overview() {
  const { key, ready } = useConsoleKey();
  const { data: catalog } = useCatalog(15_000);
  const anon = useSyncExternalStore(anonStore.subscribe, anonStore.getSnapshot, anonStore.getServerSnapshot);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [routing, setRouting] = useState<RoutingRow[]>([]);

  const load = useCallback(async () => {
    if (!key) return;
    try {
      setUsage(await getJson<UsageResponse>("/api/v1/usage", key));
      setRouting((await getJson<{ data: RoutingRow[] }>("/api/v1/routing/history", key)).data);
    } catch {
      /* shown via checks */
    }
  }, [key]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [load]);

  const near = catalog?.providers.find((p) => p.id === "near-ai-cloud");
  const up = catalog?.providers.filter((p) => p.status === "up").length ?? 0;
  const privateReady = anon.status === "ready" && anon.kind === "network" && anon.mode === "private";
  const checks: { label: string; ok: boolean | null; detail: string; href?: string }[] = [
    { label: "Gateway reachable", ok: catalog ? true : null, detail: catalog ? `${catalog.totals.models} models across ${catalog.totals.providers} providers` : "checking…" },
    { label: "API key valid", ok: !ready ? null : usage !== null, detail: key ? `${key.slice(0, 12)}…` : "no key", href: "/app/keys" },
    { label: "At least one provider up", ok: catalog ? up > 0 : null, detail: catalog ? `${up} up` : "checking…", href: "/app/nodes" },
    { label: "NEAR AI Cloud configured", ok: near ? near.configured : null, detail: near ? (near.configured ? `${near.modelCount} models available` : "set NEAR_AI_API_KEY in .env.local and restart") : "checking…", href: "/app/nodes" },
    { label: "Anon-RPC worker ready", ok: privateReady, detail: privateReady ? `${anon.networkId} · ${anon.anonRequests} anonymised reads` : "start a network in the Privacy Center", href: "/app/privacy" },
    { label: "Agent vault deployed", ok: false, detail: "devnet work in progress", href: "/app/agent" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Requests" value={usage?.summary.requests ?? "—"} />
        <Stat label="Tokens" value={usage ? compact(usage.summary.inputTokens + usage.summary.outputTokens) : "—"} />
        <Stat label="Metered cost" value={usage ? usd(usage.summary.costUsd, 6) : "—"} tone="accent" sub="offchain accounting" />
        <Stat label="Providers up" value={catalog ? `${up}/${catalog.totals.providers}` : "—"} tone={up > 0 ? "ok" : "bad"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ActivityChart rows={usage?.recent ?? []} />
        <SpendByProvider byProvider={usage?.summary.byProvider ?? {}} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PrivacyMeter anon={anon.anonRequests} direct={anon.directRequests} bootstrap={anon.bootstrapRequests} ready={privateReady} network={anon.networkId ?? null} />
        <FrameTxProof />
        <Card>
          <CardHeader title="Quick actions" />
          <div className="grid gap-3 p-5">
            <LinkButton href="/app/playground">Send a request</LinkButton>
            <LinkButton href="/app/keys" variant="outline">
              Create an API key
            </LinkButton>
            <LinkButton href="/app/privacy" variant="outline">
              Start Anon-RPC
            </LinkButton>
          </div>
        </Card>
      </div>

      {catalog && <ProviderHealth providers={catalog.providers} />}

      <div className="grid gap-4">
        <Card>
          <CardHeader title="Setup checks" sub="Live checks, not a static checklist." />
          <ul className="divide-y divide-border">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-4 px-5 py-3.5 text-xs">
                <div className="min-w-0">
                  <div className="text-foreground">{c.label}</div>
                  <div className="mt-0.5 truncate text-muted-foreground">{c.detail}</div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge tone={c.ok === null ? "neutral" : c.ok ? "ok" : "warn"}>{c.ok === null ? "…" : c.ok ? "ok" : "todo"}</Badge>
                  {c.href && !c.ok && (
                    <Link href={c.href} className="text-[11px] uppercase tracking-wider text-accent hover:underline">
                      fix →
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <CardHeader title="Recent requests" sub="Cost and tokens come from provider-reported usage; `est` marks an estimate." />
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">When</th>
              <th className="px-3 py-3 font-medium">Model</th>
              <th className="px-3 py-3 font-medium">Provider</th>
              <th className="px-3 py-3 font-medium">Tokens in/out</th>
              <th className="px-3 py-3 font-medium">Cost</th>
              <th className="px-3 py-3 font-medium">Latency</th>
              <th className="px-3 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(usage?.recent ?? []).slice(0, 10).map((r) => (
              <tr key={r.requestId}>
                <td className="px-5 py-3 text-muted-foreground">{new Date(r.createdAt).toLocaleTimeString()}</td>
                <td className="px-3 py-3 text-foreground">{r.model}</td>
                <td className="px-3 py-3">
                  {r.providerName}
                  {r.fallbackFrom?.length ? <span className="ml-2 text-warn">↩ from {r.fallbackFrom.join(", ")}</span> : null}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {r.inputTokens}/{r.outputTokens}
                  {r.tokensEstimated && <span className="ml-1 text-warn">est</span>}
                </td>
                <td className="px-3 py-3">{usd(r.costUsd, 6)}</td>
                <td className="px-3 py-3 text-muted-foreground">{ms(r.latencyMs)}</td>
                <td className="px-3 py-3">
                  <Badge tone={r.status === "ok" ? "ok" : "bad"}>{r.status}</Badge>
                </td>
              </tr>
            ))}
            {usage && usage.recent.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                  No requests yet — try the playground.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {routing.length > 0 && (
        <Card>
          <CardHeader title="Latest routing decisions" sub="Why each request went where it did." />
          <ul className="divide-y divide-border">
            {routing.slice(0, 5).map((r) => (
              <li key={r.requestId} className="px-5 py-3.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-foreground">{r.model}</span>
                  <Badge tone="accent">{r.mode}</Badge>
                  <span className="text-muted-foreground">→ {r.selected ?? "none"}</span>
                  <span className="text-muted-foreground">chain: {r.chain.join(" › ") || "—"}</span>
                </div>
                {r.selected && <p className="mt-1.5 text-muted-foreground">{r.reasons[r.selected]}</p>}
                {Object.entries(r.excluded).map(([id, why]) => (
                  <p key={id} className="mt-1 text-warn">excluded {id}: {why}</p>
                ))}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
