"use client";

import { useCatalog } from "./hooks";
import { Badge, Card, Stat, ms } from "./ui";

export function ProvidersView() {
  const { data, error } = useCatalog();
  if (!data) return <p className="text-xs text-muted-foreground">{error ? `Error: ${error}` : "Probing providers…"}</p>;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Providers" value={data.totals.providers} />
        <Stat label="Configured" value={data.totals.configuredProviders} tone="ok" />
        <Stat label="Models" value={data.totals.models} />
        <Stat label="Vendors" value={data.totals.vendors} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {data.providers.map((p) => (
          <Card key={p.id} className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider">{p.name}</h3>
                <div className="mt-1 text-[11px] text-muted-foreground">{p.id} · {p.label}</div>
              </div>
              <Badge tone={p.status === "up" ? "ok" : p.status === "not_configured" ? "warn" : p.status === "down" ? "bad" : "neutral"}>{p.status.replace("_", " ")}</Badge>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-4 text-xs">
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Models</dt>
                <dd className="mt-1 text-foreground">{p.modelCount}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Probe latency</dt>
                <dd className="mt-1 text-foreground">{ms(p.avgLatencyMs)}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Success</dt>
                <dd className="mt-1 text-foreground">{p.successRate === null ? "—" : `${Math.round(p.successRate * 100)}%`}</dd>
              </div>
            </dl>
            {p.note && <p className="mt-5 text-xs leading-relaxed text-muted-foreground">{p.note}</p>}
            {p.operator && <p className="mt-3 break-all text-[11px] text-muted-foreground">operator: {p.operator}</p>}
            {p.lastError && p.status !== "up" && <p className="mt-3 text-[11px] text-bad">last error: {p.lastError}</p>}
          </Card>
        ))}
      </div>
      <Card className="p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider">Run a provider</h3>
        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Any operator with a public HTTPS, OpenAI-compatible endpoint can register by signing a manifest with their wallet. ROUTIQ verifies the signature, checks the endpoint is public (no localhost, private ranges or cloud-metadata targets), and confirms the endpoint really serves the declared models before listing it. The reference node in <code className="text-foreground">scripts/provider-node.mts</code> is a starting point. Registration lives in the console under <span className="text-foreground">Providers</span>.
        </p>
      </Card>
    </div>
  );
}
