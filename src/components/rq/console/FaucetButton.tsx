"use client";

import { useState } from "react";
import { useAccount } from "wagmi";

export function FaucetButton() {
  const { address } = useAccount();
  const [state, setState] = useState<{ busy: boolean; msg: string | null; ok: boolean }>({ busy: false, msg: null, ok: true });
  if (!address) return null;

  async function drip() {
    setState({ busy: true, msg: null, ok: true });
    try {
      const r = await fetch("/api/v1/faucet", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address }) });
      const j = (await r.json()) as { txHash?: string; amountEth?: number; error?: string };
      if (!r.ok || !j.txHash) throw new Error(j.error ?? `Faucet failed (${r.status})`);
      setState({ busy: false, ok: true, msg: `+${j.amountEth} ETH · ${j.txHash.slice(0, 10)}…` });
    } catch (e) {
      setState({ busy: false, ok: false, msg: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={drip} disabled={state.busy} className="rounded-full border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition hover:bg-neutral-950 disabled:opacity-50" title="Free devnet ETH (chain 1337), once per hour per address">
        {state.busy ? "Requesting…" : "Get devnet ETH"}
      </button>
      {state.msg && <span className={`hidden max-w-[220px] truncate text-xs lg:inline ${state.ok ? "text-emerald-400" : "text-red-400"}`} title={state.msg}>{state.msg}</span>}
    </div>
  );
}
