"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getJson, useCatalog } from "../hooks";
import { Eyebrow, LinkButton } from "../ui";

const Title = ({ children }: { children: React.ReactNode }) => <h2 className="mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">{children}</h2>;
const Serif = ({ children }: { children: React.ReactNode }) => <span className="font-serif font-normal italic">{children}</span>;

const STEPS = [
  { tag: "First", title: "Fund an agent vault", body: "Deposit USDC into a vault earmarked for inference. Set the agent's limits — per request, per day, total, approved models and providers, expiry." },
  { tag: "Then", title: "Route through one API", body: "Point any OpenAI client at ROUTIQ. It scores providers on cost, latency and availability — and never swaps the model you asked for." },
  { tag: "Finally", title: "Pay under policy", body: "Usage is metered from provider-reported tokens and charged against the budget. Anything outside the policy is rejected before money moves." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-24">
      <Eyebrow>How it works</Eyebrow>
      <Title>
        Three steps, <Serif>zero</Serif> blank cheques.
      </Title>
      <div className="mt-14 grid border border-neutral-900 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.tag} className={`p-9 ${i > 0 ? "border-t border-neutral-900 md:border-l md:border-t-0" : ""}`}>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">{s.tag}</p>
            <h3 className="mt-6 text-2xl font-semibold tracking-tight">{s.title}</h3>
            <p className="mt-4 text-sm leading-relaxed text-neutral-500">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Features() {
  const { data } = useCatalog();
  const t = data?.totals;
  const items = [
    { title: "One OpenAI-compatible API", body: t ? `${t.models} models from ${t.vendors} vendors across hosted, local and community-run providers. Change one base URL.` : "Hundreds of models behind one base URL.", href: "/models" },
    { title: "Routing you can inspect", body: "Cheapest, fastest or balanced, with a preview of why a provider was chosen. Failover only to another provider of the same model — never a silent swap.", href: "/app/playground" },
    { title: "Private Ethereum reads", body: "Browser reads go through a real Anon-RPC network, fail closed, with honest counters for anonymised, direct and bootstrap requests.", href: "/app/privacy" },
    { title: "Spending policy in the account", body: "Vault and ERC-20 paymaster enforced by Frame Transaction validation on the Alt-Mempool devnet. Policy checks run in the account, not in our UI.", href: "/app/agent" },
  ];
  return (
    <section id="features" className="surface-light relative overflow-hidden">
      <div className="halftone-dark pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-6 py-24">
        <Eyebrow>Features</Eyebrow>
        <Title>
          Everything an agent needs to <Serif>spend</Serif> safely.
        </Title>
        <div className="mt-14 grid border border-border bg-white sm:grid-cols-2">
          {items.map((f, i) => (
            <Link key={f.title} href={f.href} className={`group p-9 transition hover:bg-neutral-50 ${i % 2 === 1 ? "sm:border-l sm:border-border" : ""} ${i > 1 ? "border-t border-border" : i === 1 ? "border-t border-border sm:border-t-0" : ""}`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold tracking-tight">{f.title}</h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Clock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString("en-GB"));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);
  return <span className="text-neutral-400">{t}</span>;
}

export function Numbers() {
  const { data } = useCatalog(15_000);
  const [reqs, setReqs] = useState<number | null>(null);
  useEffect(() => {
    getJson<{ requests: number }>("/api/v1/public/stats").then((s) => setReqs(s.requests)).catch(() => {});
  }, []);
  const up = data?.providers.filter((p) => p.status === "up").length;
  const cells = [
    { v: data?.totals.models ?? "—", l: "Models served right now" },
    { v: data?.totals.vendors ?? "—", l: "Model vendors in one API" },
    { v: data ? `${up}/${data.totals.providers}` : "—", l: "Providers up (live probes)" },
    { v: reqs ?? "—", l: "Requests metered by this gateway" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow bracket>By the numbers</Eyebrow>
          <Title>
            Less trust. <br />
            <Serif>More proof.</Serif>
          </Title>
        </div>
        <p className="flex items-center gap-3 font-mono text-xs text-neutral-500">
          <span className="rq-dot" /> Live <span className="text-neutral-700">|</span> <Clock />
        </p>
      </div>
      <div className="mt-14 grid border border-neutral-900 sm:grid-cols-2">
        {cells.map((c, i) => (
          <div key={c.l} className={`p-10 ${i % 2 === 1 ? "sm:border-l sm:border-neutral-900" : ""} ${i > 1 ? "border-t border-neutral-900" : i === 1 ? "border-t border-neutral-900 sm:border-t-0" : ""}`}>
            <div className="text-6xl font-semibold tracking-tight sm:text-7xl">{c.v}</div>
            <p className="mt-4 text-sm text-neutral-500">{c.l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const STACK: [string, string][] = [
  ["Anon-RPC", "Private reads"],
  ["EIP-8141", "Frame transactions"],
  ["Alt Mempool", "ERC-8421 rules"],
  ["Nox", "Mixnet network"],
  ["tor-js", "Tor in WASM"],
  ["Nym", "Mixnet network"],
  ["NEAR AI Cloud", "First inference source"],
  ["Ollama", "Local models"],
  ["viem", "Ethereum client"],
  ["Next.js", "App shell"],
];

export function PoweredBy() {
  const { data } = useCatalog();
  const models = (data?.models ?? []).slice(0, 12).map((m) => [m.name, m.vendor ?? "model"] as [string, string]);
  const row = (items: [string, string][], rev?: boolean) => (
    <div className="flex overflow-hidden">
      <div className={`flex shrink-0 gap-3 pr-3 ${rev ? "rq-marquee-rev" : "rq-marquee"}`} style={{ width: "max-content" }}>
        {[...items, ...items, ...items, ...items].map(([a, b], i) => (
          <div key={`${a}-${i}`} className="w-48 shrink-0 border border-neutral-900 px-5 py-4">
            <div className="truncate text-sm font-medium text-white">{a}</div>
            <div className="mt-1 truncate text-xs text-neutral-600">{b}</div>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <section className="overflow-hidden py-24">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <Eyebrow bracket>Powered by</Eyebrow>
        <Title>
          Built on <Serif>open</Serif> infrastructure.
        </Title>
        <p className="mx-auto mt-5 max-w-xl text-neutral-500">Real integrations, real model catalogue — nothing here is a placeholder.</p>
      </div>
      <div className="mt-14 space-y-3">
        {row(STACK)}
        {models.length > 0 && row(models, true)}
      </div>
    </section>
  );
}

export function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-28 pt-10 text-center">
      <h2 className="mx-auto max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
        Build agents that can <Serif>spend</Serif> — safely.
      </h2>
      <p className="mx-auto mt-6 max-w-xl text-neutral-500">Create an API key, send a request, and watch the routing decision, cost and latency come back with the response.</p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <LinkButton href="/app">Open the dashboard</LinkButton>
      </div>
    </section>
  );
}
