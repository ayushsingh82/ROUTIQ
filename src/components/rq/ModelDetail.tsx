"use client";

import Link from "next/link";
import { useCatalog } from "./hooks";
import { Badge, Card, CardHeader, LinkButton, Stat, ms, usd } from "./ui";

export function ModelDetail({ id }: { id: string }) {
  const { data, error } = useCatalog();
  const m = data?.models.find((x) => x.id === id);
  if (!data) return <p className="text-xs text-muted-foreground">{error ? `Error: ${error}` : "Loading…"}</p>;
  if (!m)
    return (
      <Card className="p-8">
        <p className="text-sm">No provider currently serves <code className="text-accent">{id}</code>.</p>
        <Link href="/models" className="mt-4 inline-block text-xs uppercase tracking-wider text-accent">← All models</Link>
      </Card>
    );
  const sorted = [...m.offers].sort((a, b) => a.inputPerM + a.outputPerM - (b.inputPerM + b.outputPerM));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/models" className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground">← All models</Link>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">{m.name}</h1>
          <p className="mt-2 text-xs text-muted-foreground">{m.id}{m.vendor ? ` · ${m.vendor}` : ""}</p>
        </div>
        <LinkButton href={`/app/playground?model=${encodeURIComponent(m.id)}`}>Try in playground</LinkButton>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Context" value={m.contextWindow ? `${Math.round(m.contextWindow / 1000)}k` : "—"} />
        <Stat label="Providers" value={m.offers.length} />
        <Stat label="Best input / 1M" value={usd(sorted[0].inputPerM, 2)} tone="accent" />
        <Stat label="Best output / 1M" value={usd(sorted[0].outputPerM, 2)} tone="accent" />
      </div>
      {m.features.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {m.features.map((f) => (
            <Badge key={f}>{f.replace("_", " ")}</Badge>
          ))}
          {m.inputModalities.map((f) => (
            <Badge key={f} tone="accent">{f} input</Badge>
          ))}
        </div>
      )}
      <Card className="overflow-x-auto">
        <CardHeader title="Who serves it" sub="Same model, different providers. ROUTIQ never substitutes a different model when it falls back." />
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Provider</th>
              <th className="px-3 py-3 font-medium">Type</th>
              <th className="px-3 py-3 font-medium">Input / 1M</th>
              <th className="px-3 py-3 font-medium">Output / 1M</th>
              <th className="px-3 py-3 font-medium">Probe latency</th>
              <th className="px-3 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((o) => (
              <tr key={o.providerId}>
                <td className="px-5 py-3 text-foreground">{o.providerName}</td>
                <td className="px-3 py-3 text-muted-foreground">{o.label}</td>
                <td className="px-3 py-3">{usd(o.inputPerM, 3)}</td>
                <td className="px-3 py-3">{usd(o.outputPerM, 3)}</td>
                <td className="px-3 py-3 text-muted-foreground">{ms(o.avgLatencyMs)}</td>
                <td className="px-3 py-3">
                  <Badge tone={o.status === "up" ? "ok" : o.status === "not_configured" ? "warn" : "bad"}>{o.status.replace("_", " ")}</Badge>
                  {o.unavailableReason && <div className="mt-1 text-[11px] text-muted-foreground">{o.unavailableReason}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
