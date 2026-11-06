"use client";

// M1 go/no-go spike: prove a REAL anonymizing network can carry eth_blockNumber and eth_getLogs from the browser.
import { useState, useSyncExternalStore } from "react";
import { anonStore, startWorker, stopWorker } from "@/lib/anon-rpc/manager";
import { NETWORKS } from "@/lib/anon-rpc/networks";
import { getPublicClient } from "@/lib/rpc/client";
import { ANNOUNCEMENT_EVENT_ABI, ANNOUNCER_ADDRESS } from "@/lib/erc5564/constants";

export default function Spike() {
  const s = useSyncExternalStore(anonStore.subscribe, anonStore.getSnapshot, anonStore.getServerSnapshot);
  const [net, setNet] = useState("nox");
  const [log, setLog] = useState<string[]>([]);
  const add = (m: string) => setLog((l) => [...l, `${new Date().toISOString().slice(11, 19)}  ${m}`]);

  async function init() {
    add(`starting ${net} …`);
    try {
      await startWorker(net);
      add("worker ready ✔");
    } catch (e) {
      add(`worker FAILED: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function test() {
    const c = getPublicClient();
    try {
      const t0 = performance.now();
      const bn = await c.getBlockNumber();
      add(`eth_blockNumber = ${bn} (${Math.round(performance.now() - t0)} ms)`);
      const t1 = performance.now();
      const logs = await c.getLogs({
        address: ANNOUNCER_ADDRESS,
        event: ANNOUNCEMENT_EVENT_ABI,
        fromBlock: bn - 500n,
        toBlock: bn,
      });
      add(`eth_getLogs (500 blocks) = ${logs.length} Announcement logs (${Math.round(performance.now() - t1)} ms)`);
    } catch (e) {
      add(`test FAILED: ${e instanceof Error ? e.message : e}`);
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6 font-mono text-sm">
      <h1 className="text-xl font-bold">Anon-RPC spike (M1)</h1>
      <select className="border bg-transparent p-2" value={net} onChange={(e) => setNet(e.target.value)}>
        {NETWORKS.map((n) => (
          <option key={n.id} value={n.id} className="text-black">
            {n.label}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button className="border px-3 py-1" onClick={init}>
          1. Start worker
        </button>
        <button className="border px-3 py-1" onClick={test} disabled={s.status !== "ready"}>
          2. Run reads
        </button>
        <button className="border px-3 py-1" onClick={() => stopWorker()}>
          Stop
        </button>
      </div>
      <pre className="whitespace-pre-wrap border p-3">
        {JSON.stringify({ ...s, avgLatencyMs: s.anonRequests ? Math.round(s.totalLatencyMs / s.anonRequests) : 0 }, null, 2)}
      </pre>
      <pre className="whitespace-pre-wrap border p-3">{log.join("\n") || "—"}</pre>
    </main>
  );
}
