"use client";

import { useState } from "react";
import { probeFetch as anonFetchProbe, setPrivacyMode, startWorker, stopWorker } from "@/lib/anon-rpc/manager";
import { NETWORKS, TARGET_CHAIN } from "@/lib/anon-rpc/networks";
import { compareObservations, parseEcho, type ProviderObservation } from "@/lib/provider-view/echo";
import { rpcRequest } from "@/lib/rpc/client";
import { Badge, Button, Card, CardHeader, Input, Select, Stat, ms } from "../ui";
import { useAnon } from "./useAnon";

export function Privacy() {
  const s = useAnon();
  const [net, setNet] = useState("nox");
  const sel = NETWORKS.find((n) => n.id === net)!;
  const total = s.anonRequests + s.directRequests;
  const avg = total ? s.totalLatencyMs / total : null;
  const privateReady = s.status === "ready" && s.kind === "network" && s.mode === "private";

  const [read, setRead] = useState<{ ok: boolean; text: string } | null>(null);
  const [reading, setReading] = useState(false);
  async function testRead() {
    setReading(true);
    const t0 = performance.now();
    try {
      const n = BigInt(await rpcRequest<string>("eth_blockNumber"));
      setRead({ ok: true, text: `eth_blockNumber → ${n} on ${TARGET_CHAIN.name} (chain ${TARGET_CHAIN.id}) in ${Math.round(performance.now() - t0)} ms` });
    } catch (e) {
      setRead({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setReading(false);
    }
  }

  const [echo, setEcho] = useState("https://httpbin.org/post");
  const [cmp, setCmp] = useState<{ d?: ProviderObservation; a?: ProviderObservation; err?: string } | null>(null);
  async function compare() {
    setCmp({});
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: ["0x" + "ab".repeat(20), "latest"] });
    const init = { method: "POST", headers: { "content-type": "application/json" }, body };
    try {
      const d = parseEcho(await (await anonFetchProbe("direct", echo, init)).json());
      let a: ProviderObservation | undefined;
      if (privateReady) a = parseEcho(await (await anonFetchProbe("anon", echo, init)).json());
      setCmp({ d, a });
    } catch (e) {
      setCmp({ err: e instanceof Error ? e.message : String(e) });
    }
  }
  const verdict = cmp?.d && cmp.a ? compareObservations(cmp.d, cmp.a) : null;

  return (
    <div className="space-y-6">
      <div className={`border p-5 text-sm ${privateReady ? "border-ok/50 text-ok" : s.mode === "direct" ? "border-bad/50 text-bad" : "border-warn/50 text-warn"}`}>
        {privateReady ? `Private mode — reads go through ${s.networkId} (a genuine anonymising network).` : s.mode === "direct" ? "DIRECT mode — reads are NOT anonymised." : s.status === "ready" && s.kind !== "network" ? "Reference worker — does not anonymise; reads are blocked." : "No worker running — Ethereum reads are blocked (fail-closed)."}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Anon-RPC network" sub="Official @anon-rpc/browser-harness; sandboxed, hash-pinned worker." />
          <div className="space-y-4 p-5 text-xs">
            <Select value={net} onChange={(e) => setNet(e.target.value)} aria-label="Network">
              {NETWORKS.map((n) => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
            </Select>
            <p className="leading-relaxed text-muted-foreground">{sel.note}</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => startWorker(net).catch(() => {})} disabled={s.status === "starting"}>{s.status === "starting" ? "Starting…" : "Start worker"}</Button>
              <Button variant="outline" onClick={stopWorker}>Stop</Button>
              <Button variant="outline" onClick={testRead} disabled={reading}>{reading ? "Reading…" : "Test read"}</Button>
            </div>
            {s.error && <p className="break-all text-bad">{s.error}</p>}
            {read && <p className={read.ok ? "text-ok" : "text-bad"}>{read.text}</p>}
            <div className="flex gap-2 border-t border-border pt-4">
              <Button size="sm" variant={s.mode === "private" ? "primary" : "outline"} onClick={() => setPrivacyMode("private")}>Private (fail closed)</Button>
              <Button size="sm" variant={s.mode === "direct" ? "danger" : "outline"} onClick={() => setPrivacyMode("direct")}>Direct (no anonymity)</Button>
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3 self-start">
          <Stat label="Worker" value={s.status} tone={s.status === "ready" ? "ok" : s.status === "failed" ? "bad" : undefined} />
          <Stat label="Network kind" value={s.kind ?? "—"} />
          <Stat label="Anonymised reads" value={s.anonRequests} tone="accent" />
          <Stat label="Direct reads" value={s.directRequests} tone={s.directRequests ? "bad" : undefined} />
          <Stat label="Bootstrap (not anonymised)" value={s.bootstrapRequests} tone="warn" />
          <Stat label="Failed" value={s.failedRequests} tone={s.failedRequests ? "bad" : undefined} />
          <Stat label="Avg latency" value={ms(avg)} />
          <Stat label="Target chain" value={TARGET_CHAIN.id} sub={TARGET_CHAIN.name} />
        </div>
      </div>

      <Card>
        <CardHeader title="What does the RPC provider see?" sub="The same request sent directly and through Anon-RPC to an echo endpoint. A throwaway address is queried; nothing of yours is sent." />
        <div className="space-y-4 p-5 text-xs">
          <div className="flex gap-3">
            <Input value={echo} onChange={(e) => setEcho(e.target.value)} aria-label="Echo endpoint" />
            <Button onClick={compare}>Compare</Button>
          </div>
          {!privateReady && <p className="text-warn">Start a real anonymising network to fill the right-hand side.</p>}
          {cmp?.err && <p className="text-bad">{cmp.err}</p>}
          {verdict && <p className={verdict === "unlinked" ? "text-ok" : "text-bad"}>{verdict === "unlinked" ? "The provider saw two different IPs — the anonymised request can't be linked to yours." : verdict === "same-ip" ? "Same IP on both sides: this network did NOT hide your address." : "The echo endpoint reported no IP."}</p>}
          {(cmp?.d || cmp?.a) && (
            <div className="grid gap-4 md:grid-cols-2">
              {([["Direct", cmp.d], ["Via Anon-RPC", cmp.a]] as const).map(([t, o]) => (
                <div key={t} className="border border-border p-4">
                  <div className="mb-3 flex items-center justify-between"><span className="uppercase tracking-wider">{t}</span><Badge tone={t === "Direct" ? "bad" : "ok"}>{t === "Direct" ? "exposed" : "relayed"}</Badge></div>
                  {o ? (
                    <dl className="space-y-2">
                      <div><dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Provider sees IP</dt><dd className="break-all text-foreground">{o.ips.join(", ") || "—"}</dd></div>
                      <div><dt className="text-[10px] uppercase tracking-wider text-muted-foreground">User-Agent</dt><dd className="break-all">{o.userAgent ?? "—"}</dd></div>
                      <div><dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Query (still visible)</dt><dd className="break-all">{o.method}({o.queriedAddress})</dd></div>
                    </dl>
                  ) : <span className="text-muted-foreground">—</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider">What Anon-RPC does not do</h3>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-muted-foreground">
          <li>It does not hide your prompts: the gateway and the inference provider can read them.</li>
          <li>It protects only reads made in this browser. Server-side calls (the gateway talking to providers, or to an RPC) are not anonymised.</li>
          <li>The one-time worker bootstrap read is not anonymised; it is counted separately above.</li>
          <li>Wallet addresses, transaction amounts and timing on chain stay public.</li>
        </ul>
      </Card>
    </div>
  );
}
