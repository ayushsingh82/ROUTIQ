"use client";

import { useState } from "react";
import { probeFetch } from "@/lib/anon-rpc/manager";
import { compareObservations, parseEcho, type ProviderObservation } from "@/lib/provider-view/echo";
import { Btn, Card, inputCls, useAnon } from "./ui";

const DEFAULT_ECHO = "https://httpbin.org/post";

interface Side {
  obs: ProviderObservation | null;
  ms: number | null;
  error: string | null;
  raw: string | null;
}
const empty: Side = { obs: null, ms: null, error: null, raw: null };

function throwawayAddress(): string {
  const b = crypto.getRandomValues(new Uint8Array(20));
  return "0x" + Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

async function run(via: "direct" | "anon", url: string, body: string): Promise<Side> {
  const t0 = performance.now();
  try {
    const res = await probeFetch(via, url, { method: "POST", headers: { "content-type": "application/json" }, body });
    const text = await res.text();
    const ms = Math.round(performance.now() - t0);
    if (!res.ok) return { ...empty, ms, error: `HTTP ${res.status}` };
    return { obs: parseEcho(JSON.parse(text)), ms, error: null, raw: text };
  } catch (e) {
    return { ...empty, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
  }
}

export function ProviderViewPanel() {
  const anon = useAnon();
  const [url, setUrl] = useState(DEFAULT_ECHO);
  const [direct, setDirect] = useState<Side>(empty);
  const [viaAnon, setViaAnon] = useState<Side>(empty);
  const [address, setAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const canAnon = anon.status === "ready" && anon.kind === "network";

  async function compare() {
    setBusy(true);
    setDirect(empty);
    setViaAnon(empty);
    const addr = throwawayAddress(); // throwaway: no real address is ever sent to the echo service
    setAddress(addr);
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [addr, "latest"] });
    const d = await run("direct", url, body);
    setDirect(d);
    if (canAnon) setViaAnon(await run("anon", url, body));
    setBusy(false);
  }

  const verdict = direct.obs && viaAnon.obs ? compareObservations(direct.obs, viaAnon.obs) : null;

  return (
    <div className="space-y-4">
      <Card title="What does the RPC provider see?">
        <p className="mb-3 text-xs text-zinc-400">
          Sends the <em>same</em> JSON-RPC request twice to a public echo endpoint that reports back what it observed — once
          directly from your browser, once through the Anon-RPC network. The address queried is a freshly generated throwaway,
          so nothing of yours is sent to the echo service. Only the public IP-level difference is being demonstrated.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-64 flex-1 text-xs text-zinc-400">
            Echo endpoint (must return httpbin-style JSON)
            <input className={`${inputCls} mt-1`} value={url} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <Btn onClick={compare} disabled={busy || !url}>
            {busy ? "Comparing…" : "Compare"}
          </Btn>
        </div>
        {!canAnon && <p className="mt-3 text-sm text-amber-400">Start a real anonymizing network on the Privacy tab to fill the right-hand side.</p>}
        {address && <p className="mt-3 break-all font-mono text-xs text-zinc-500">Throwaway address queried: {address}</p>}
      </Card>

      {verdict && (
        <div
          className={`rounded-xl border p-4 text-sm font-medium ${
            verdict === "unlinked"
              ? "border-accent/40 bg-accent/10 text-accent"
              : verdict === "same-ip"
                ? "border-red-500/40 bg-red-500/10 text-red-300"
                : "border-amber-500/40 bg-amber-500/10 text-amber-300"
          }`}
        >
          {verdict === "unlinked" && "The provider saw two different IPs. The anonymized request cannot be linked to your IP."}
          {verdict === "same-ip" && "Same IP on both sides — this network did NOT hide your address from the provider."}
          {verdict === "unknown" && "Could not compare: the echo endpoint did not report an IP."}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <SideCard title="Direct (normal RPC)" tone="bad" side={direct} showRaw={showRaw} />
        <SideCard title={`Via Anon-RPC${anon.networkId ? ` · ${anon.networkId}` : ""}`} tone="good" side={viaAnon} showRaw={showRaw} disabled={!canAnon} />
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <button className="underline" onClick={() => setShowRaw((s) => !s)}>
          {showRaw ? "Hide" : "Show"} raw echo responses
        </button>
        <span>Probe requests so far: {anon.probeRequests}</span>
      </div>

      <Card title="What stays visible even with Anon-RPC">
        <ul className="list-disc space-y-1 pl-5 text-xs text-zinc-400">
          <li>The query itself — the method and the address asked about. Anon-RPC hides <strong>who</strong> asks, not <strong>what</strong> is asked.</li>
          <li>The exit node&apos;s IP, and whatever headers the worker chooses to send (compare User-Agent above).</li>
          <li>Timing and volume patterns; an adversary watching both ends could correlate. We make no unlinkability guarantee.</li>
        </ul>
      </Card>
    </div>
  );
}

function SideCard({ title, tone, side, showRaw, disabled }: { title: string; tone: "good" | "bad"; side: Side; showRaw: boolean; disabled?: boolean }) {
  const border = tone === "good" ? "border-accent/30" : "border-red-500/30";
  return (
    <section className={`rounded-xl border ${border} bg-white/[0.03] p-4`}>
      <h3 className={`mb-3 text-sm font-semibold ${tone === "good" ? "text-accent" : "text-red-300"}`}>{title}</h3>
      {disabled ? (
        <p className="text-xs text-zinc-500">No anonymizing worker running.</p>
      ) : side.error ? (
        <p className="break-all font-mono text-xs text-red-400">{side.error}</p>
      ) : !side.obs ? (
        <p className="text-xs text-zinc-500">—</p>
      ) : (
        <dl className="space-y-2 text-xs">
          <Row k="Provider sees your IP as" v={side.obs.ips.join(", ") || "—"} strong />
          <Row k="User-Agent" v={side.obs.userAgent ?? "—"} />
          <Row k="Accept-Language" v={side.obs.acceptLanguage ?? "—"} />
          <Row k="Referer" v={side.obs.referer ?? "—"} />
          <Row k="Query (visible)" v={`${side.obs.method ?? "—"}(${side.obs.queriedAddress ?? "—"})`} />
          <Row k="Round trip" v={side.ms !== null ? `${side.ms} ms` : "—"} />
        </dl>
      )}
      {showRaw && side.raw && <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded bg-black/50 p-2 text-[10px] text-zinc-400">{side.raw}</pre>}
    </section>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-zinc-500">{k}</dt>
      <dd className={`break-all font-mono ${strong ? "text-sm text-zinc-100" : "text-zinc-300"}`}>{v}</dd>
    </div>
  );
}
