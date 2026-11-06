"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CatalogProvider } from "../hooks";
import { Badge, Card, CardHeader, ms, usd } from "../ui";
import type { UsageRow } from "./types";

/** Requests over the last 12 minutes-buckets, drawn from the recent ledger (no invented data). */
export function ActivityChart({ rows }: { rows: UsageRow[] }) {
  const N = 12;
  const span = 5 * 60_000;
  const [now, setNow] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
  }, [rows]);
  const end = Math.ceil(now / span) * span;
  const buckets = Array.from({ length: N }, (_, i) => ({ t: end - (N - i) * span, ok: 0, err: 0 }));
  for (const r of rows) {
    const i = Math.floor((r.createdAt - (end - N * span)) / span);
    if (i < 0 || i >= N) continue;
    if (r.status === "ok") buckets[i].ok += 1;
    else buckets[i].err += 1;
  }
  const max = Math.max(1, ...buckets.map((b) => b.ok + b.err));
  const total = buckets.reduce((s, b) => s + b.ok + b.err, 0);
  return (
    <Card>
      <CardHeader title="Request activity" sub="Last hour in 5-minute buckets" right={<Badge tone="accent">{total} req</Badge>} />
      <div className="flex h-40 items-end gap-1.5 px-5 pb-2 pt-6" role="img" aria-label="Requests per 5 minutes">
        {buckets.map((b) => (
          <div key={b.t} className="group relative flex h-full flex-1 flex-col justify-end" title={`${new Date(b.t).toLocaleTimeString()} · ${b.ok} ok · ${b.err} failed`}>
            {b.err > 0 && <div className="w-full bg-bad/80" style={{ height: `${(b.err / max) * 100}%` }} />}
            <div className={b.ok + b.err ? "w-full bg-accent" : "w-full bg-border"} style={{ height: b.ok ? `${(b.ok / max) * 100}%` : b.err ? 0 : "2px" }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between px-5 pb-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>−60 min</span>
        <span>now</span>
      </div>
    </Card>
  );
}

export function SpendByProvider({ byProvider }: { byProvider: Record<string, { requests: number; costUsd: number }> }) {
  const rows = Object.entries(byProvider).sort((a, b) => b[1].requests - a[1].requests);
  const max = Math.max(1, ...rows.map(([, v]) => v.requests));
  return (
    <Card>
      <CardHeader title="Traffic by provider" sub="Where the router actually sent requests" />
      <div className="space-y-4 p-5">
        {rows.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No traffic yet.</p>}
        {rows.map(([id, v]) => (
          <div key={id}>
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="text-foreground">{id}</span>
              <span className="text-muted-foreground">
                {v.requests} req · {usd(v.costUsd, 6)}
              </span>
            </div>
            <div className="h-1.5 bg-border">
              <div className="h-full bg-accent" style={{ width: `${(v.requests / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ProviderHealth({ providers }: { providers: CatalogProvider[] }) {
  return (
    <Card>
      <CardHeader title="Provider health" sub="Probe latency and success rate from live checks" right={<Link href="/app/nodes" className="text-[11px] uppercase tracking-wider text-accent hover:underline">manage →</Link>} />
      <ul className="divide-y divide-border">
        {providers.map((p) => {
          const up = p.status === "up";
          return (
            <li key={p.id} className="flex items-center gap-4 px-5 py-3.5 text-xs">
              <span className={`h-2 w-2 shrink-0 rounded-full ${!p.configured ? "bg-neutral-600" : up ? "bg-ok" : "bg-bad"}`} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-foreground">{p.name}</div>
                <div className="text-muted-foreground">
                  {p.label} · {p.modelCount} models
                </div>
              </div>
              <div className="text-right text-muted-foreground">
                <div>{ms(p.avgLatencyMs)}</div>
                <div>{p.successRate === null ? "—" : `${Math.round(p.successRate * 100)}% ok`}</div>
              </div>
              <Badge tone={!p.configured ? "neutral" : up ? "ok" : "bad"}>{!p.configured ? "no key" : p.status}</Badge>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function PrivacyMeter({ anon, direct, bootstrap, ready, network }: { anon: number; direct: number; bootstrap: number; ready: boolean; network: string | null }) {
  const total = anon + direct;
  const pct = total ? Math.round((anon / total) * 100) : 0;
  return (
    <Card>
      <CardHeader title="Anon-RPC privacy" sub="Ethereum reads from this browser" right={<Badge tone={ready ? "ok" : "warn"}>{ready ? network : "not started"}</Badge>} />
      <div className="p-5">
        <div className="flex items-end justify-between">
          <div className="text-4xl font-semibold tracking-tight text-foreground">{total ? `${pct}%` : "—"}</div>
          <div className="text-xs text-muted-foreground">of reads anonymised</div>
        </div>
        <div className="mt-4 flex h-2 overflow-hidden bg-border">
          <div className="bg-accent" style={{ width: `${total ? (anon / total) * 100 : 0}%` }} />
          <div className="bg-bad/80" style={{ width: `${total ? (direct / total) * 100 : 0}%` }} />
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-3 text-xs">
          {[["Anonymised", anon], ["Direct", direct], ["Bootstrap", bootstrap]].map(([k, v]) => (
            <div key={k as string}>
              <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{k}</dt>
              <dd className="mt-1 text-lg text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        {!ready && (
          <Link href="/app/privacy" className="mt-5 inline-block text-[11px] uppercase tracking-wider text-accent hover:underline">
            start a network →
          </Link>
        )}
      </div>
    </Card>
  );
}

const PROOF_TX = "0x40f16d8cf7f5940b9284a84fd5ad3de676a016ef25651fdf6f59ee0265214800";
export function FrameTxProof() {
  return (
    <Card>
      <CardHeader title="EIP-8141 Frame Tx" sub="Verified on the Alt-Mempool devnet (chain 1337)" right={<Badge tone="ok">on-chain</Badge>} />
      <div className="space-y-3 p-5 text-xs">
        <div className="flex items-center gap-2">
          {["VERIFY", "SENDER"].map((f, i) => (
            <div key={f} className="flex items-center gap-2">
              <span className="border border-border px-2.5 py-1 font-mono text-[10px] tracking-wider text-foreground">{f}</span>
              {i === 0 && <span className="text-muted-foreground">→</span>}
            </div>
          ))}
          <span className="ml-auto text-muted-foreground">block 0x69a</span>
        </div>
        <p className="break-all font-mono text-[11px] text-muted-foreground">{PROOF_TX}</p>
        <p className="text-muted-foreground">Sent through the sidecar mempool and confirmed with per-frame receipts. Vault and paymaster enforcement is the next milestone.</p>
        <Link href="/app/agent" className="inline-block text-[11px] uppercase tracking-wider text-accent hover:underline">
          agent spending →
        </Link>
      </div>
    </Card>
  );
}
