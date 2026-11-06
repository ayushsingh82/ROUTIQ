"use client";

import { useState } from "react";
import { NETWORKS } from "@/lib/anon-rpc/networks";
import { setPrivacyMode, startWorker, stopWorker } from "@/lib/anon-rpc/manager";
import { Btn, Card, Stat, useAnon } from "./ui";

export function PrivacyPanel() {
  const s = useAnon();
  const [net, setNet] = useState("nox");
  const sel = NETWORKS.find((n) => n.id === net)!;
  const avg = s.anonRequests + s.directRequests ? Math.round(s.totalLatencyMs / (s.anonRequests + s.directRequests)) : 0;
  const total = s.anonRequests + s.directRequests;
  const share = total ? Math.round((s.anonRequests / total) * 100) : 0;

  const verdict =
    s.status !== "ready"
      ? { t: s.status === "failed" ? "Worker failed" : "No worker — chain reads are BLOCKED", tone: "bad" as const }
      : s.mode === "direct"
        ? { t: "DIRECT mode — reads are NOT anonymized", tone: "bad" as const }
        : s.kind === "network"
          ? { t: "Private mode — genuine anonymizing network", tone: "good" as const }
          : { t: "Reference worker — NOT anonymizing (blocked)", tone: "warn" as const };

  return (
    <div className="space-y-4">
      <Card title="Anon-RPC network">
        <div className="flex flex-wrap items-end gap-3">
          <select className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm" value={net} onChange={(e) => setNet(e.target.value)}>
            {NETWORKS.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
          <Btn onClick={() => startWorker(net).catch(() => {})} disabled={s.status === "starting"}>
            {s.status === "starting" ? "Starting…" : "Start worker"}
          </Btn>
          <Btn variant="ghost" onClick={stopWorker}>
            Stop
          </Btn>
        </div>
        <p className="mt-3 text-xs text-zinc-400">{sel.note}</p>
        {sel.kind === "reference" && <p className="mt-2 text-xs text-amber-400">This worker does not anonymize. Private mode will refuse to use it.</p>}
        {s.error && <p className="mt-3 break-all font-mono text-xs text-red-400">{s.error}</p>}
      </Card>

      <Card title="Status">
        <div className={`mb-3 text-sm font-semibold ${verdict.tone === "good" ? "text-accent" : verdict.tone === "warn" ? "text-amber-400" : "text-red-400"}`}>
          {verdict.t}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Worker" value={s.status} tone={s.status === "ready" ? "good" : s.status === "failed" ? "bad" : undefined} />
          <Stat label="Network kind" value={s.kind ?? "—"} />
          <Stat label="Via Anon-RPC" value={s.anonRequests} tone="good" />
          <Stat label="Direct reads" value={s.directRequests} tone={s.directRequests ? "bad" : undefined} />
          <Stat label="Bootstrap (not anonymized)" value={s.bootstrapRequests} tone="warn" />
          <Stat label="Failed" value={s.failedRequests} tone={s.failedRequests ? "bad" : undefined} />
          <Stat label="Avg latency" value={`${avg} ms`} />
          <Stat label="Anonymized share" value={`${share}%`} />
        </div>
        <div className="mt-3">
          <Stat label="Specifier contract" value={s.specifier ?? "—"} />
        </div>
      </Card>

      <Card title="Mode">
        <div className="flex items-center gap-3">
          <Btn variant={s.mode === "private" ? "primary" : "ghost"} onClick={() => setPrivacyMode("private")}>
            Private (fail closed)
          </Btn>
          <Btn variant={s.mode === "direct" ? "danger" : "ghost"} onClick={() => setPrivacyMode("direct")}>
            Direct (no anonymity)
          </Btn>
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          In private mode, if the worker is not ready the app refuses to read the chain — it never silently falls back to a direct RPC.
          Direct mode must be chosen explicitly and is counted separately above.
        </p>
      </Card>

      <Card title="What leaks, honestly">
        <ul className="list-disc space-y-1 pl-5 text-xs text-zinc-400">
          <li>The one-time bootstrap read of the specifier contract is not anonymized (counted above).</li>
          <li>Announcements, stealth addresses, amounts and timing are public on-chain.</li>
          <li>Anon-RPC hides your IP from the RPC endpoint; it does not make blockchain data private.</li>
          <li>A malicious worker/network can observe, censor or lie. Choosing a network is a trust decision.</li>
          <li>Wallet-sent transactions (sender demo) are broadcast by your wallet, not through Anon-RPC.</li>
        </ul>
      </Card>
    </div>
  );
}
