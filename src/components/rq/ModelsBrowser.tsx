"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCatalog, type CatalogModel } from "./hooks";
import { Badge, Input, Select, usd } from "./ui";

const cheapest = (m: CatalogModel) => Math.min(...m.offers.map((o) => o.inputPerM + o.outputPerM));
const CAPS: [string, string][] = [
  ["all", "All capabilities"],
  ["tools", "Tool calling"],
  ["reasoning", "Reasoning"],
  ["structured_outputs", "Structured outputs"],
  ["image", "Image input"],
];

function Avatar({ name }: { name: string }) {
  return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-neutral-800 bg-neutral-950 font-mono text-sm uppercase text-neutral-300">{name.slice(0, 1)}</span>;
}

export function ModelsBrowser() {
  const { data, error } = useCatalog();
  const [q, setQ] = useState("");
  const [vendor, setVendor] = useState("all");
  const [provider, setProvider] = useState("all");
  const [cap, setCap] = useState("all");
  const [sort, setSort] = useState<"price" | "context" | "name">("price");

  const vendors = useMemo(() => [...new Set((data?.models ?? []).map((m) => m.vendor).filter(Boolean) as string[])].sort(), [data]);
  const rows = useMemo(() => {
    const has = (m: CatalogModel, c: string) => (c === "image" ? m.inputModalities.includes("image") : m.features.includes(c));
    let r = (data?.models ?? []).filter((m) => (q ? (m.id + m.name).toLowerCase().includes(q.toLowerCase()) : true) && (vendor === "all" || m.vendor === vendor) && (provider === "all" || m.offers.some((o) => o.providerId === provider)) && (cap === "all" || has(m, cap)));
    r = [...r].sort((a, b) => (sort === "price" ? cheapest(a) - cheapest(b) : sort === "context" ? (b.contextWindow ?? 0) - (a.contextWindow ?? 0) : a.id.localeCompare(b.id)));
    return r;
  }, [data, q, vendor, provider, cap, sort]);

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <Input placeholder="Search models…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search models" />
        <Select value={vendor} onChange={(e) => setVendor(e.target.value)} aria-label="Creator">
          <option value="all">All creators</option>
          {vendors.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </Select>
        <Select value={provider} onChange={(e) => setProvider(e.target.value)} aria-label="Provider">
          <option value="all">All providers</option>
          {(data?.providers ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select value={cap} onChange={(e) => setCap(e.target.value)} aria-label="Capability">
          {CAPS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort">
          <option value="price">Sort: price</option>
          <option value="context">Sort: context</option>
          <option value="name">Sort: name</option>
        </Select>
      </div>
      <p className="mt-3 text-xs text-neutral-500">{data ? `${rows.length} of ${data.models.length} models` : error ? `Error: ${error}` : "Loading the live catalogue…"} · USD per 1M tokens, from each provider&apos;s own catalogue.</p>

      <div className="mt-6 grid border-l border-t border-neutral-900 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((m) => {
          const best = [...m.offers].sort((a, b) => a.inputPerM + a.outputPerM - (b.inputPerM + b.outputPerM))[0];
          return (
            <Link key={m.id} href={`/models/${m.id}`} className="group flex flex-col border-b border-r border-neutral-900 p-6 transition hover:bg-neutral-950">
              <div className="flex items-start gap-3">
                <Avatar name={m.vendor ?? m.name} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{m.name}</div>
                  <div className="mt-0.5 truncate font-mono text-[11px] text-neutral-600">{m.id}</div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {m.vendor && <Badge>{m.vendor}</Badge>}
                {m.features.slice(0, 3).map((f) => (
                  <Badge key={f}>{f.replace("_", " ")}</Badge>
                ))}
                {m.inputModalities.includes("image") && <Badge tone="accent">vision</Badge>}
              </div>
              <div className="mt-6 flex items-end justify-between gap-3 border-t border-neutral-900 pt-4 text-xs text-neutral-500">
                <div>
                  <div className="text-white">{usd(best.inputPerM, 2)} <span className="text-neutral-600">in</span> · {usd(best.outputPerM, 2)} <span className="text-neutral-600">out</span></div>
                  <div className="mt-1">{m.contextWindow ? `${Math.round(m.contextWindow / 1000)}k context` : "context n/a"}</div>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  {m.offers.map((o) => (
                    <span key={o.providerId} title={`${o.providerName}: ${o.status.replace("_", " ")}`} className={`h-2 w-2 rounded-full ${o.status === "up" ? "bg-emerald-400" : o.status === "not_configured" ? "bg-amber-400" : "bg-neutral-700"}`} />
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
        {data && rows.length === 0 && <div className="col-span-full border-b border-r border-neutral-900 p-12 text-center text-sm text-neutral-500">No models match these filters.</div>}
      </div>
    </div>
  );
}
