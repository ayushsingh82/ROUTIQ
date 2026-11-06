"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { decodeFunctionResult, encodeFunctionData, parseAbi } from "viem";
import dep from "../../../../deployments/devnet.json";
import { TARGET_CHAIN } from "@/lib/anon-rpc/networks";
import { rpcRequest } from "@/lib/rpc/client";
import { Badge, Button, Card, CardHeader, Stat } from "../ui";
import { useAnon } from "./useAnon";

// NaiveStakingRegistry on the devnet, from https://docs.altmempool.wtf/guides/devnet/ (addresses can change if the devnet resets).
const STAKING_REGISTRY = "0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f";

interface Check {
  label: string;
  state: "ok" | "fail" | "todo";
  detail: string;
}

interface DemoOut { kind: string; accepted: boolean; status: string; hash: string; reason?: string; amount: string; payee: string; note: string }

function LiveDemo() {
  const [busy, setBusy] = useState<string | null>(null);
  const [runs, setRuns] = useState<DemoOut[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/v1/agent/demo")
      .then((r) => r.json())
      .then((j: { available: boolean }) => setAvailable(j.available))
      .catch(() => setAvailable(false));
  }, []);
  async function go(kind: string) {
    setBusy(kind);
    setErr(null);
    try {
      const r = await fetch("/api/v1/agent/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error?.message ?? `HTTP ${r.status}`);
      setRuns((x) => [j as DemoOut, ...x].slice(0, 6));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }
  const labels: Record<string, string> = { pay: "Pay a registered provider", "over-cap": "Try over the cap", unregistered: "Try an unregistered provider" };
  return (
    <Card>
      <CardHeader title="Live Frame Transaction" sub="Sends a real EIP-8141 transaction to the Alt-Mempool devnet. The agent key is a throwaway devnet key held by the server." right={<Badge tone={available ? "ok" : "warn"}>{available === null ? "…" : available ? "ready" : "key not set"}</Badge>} />
      <div className="flex flex-wrap gap-3 p-5">
        {Object.entries(labels).map(([k, v]) => (
          <Button key={k} size="sm" variant={k === "pay" ? "primary" : "outline"} disabled={!available || busy !== null} onClick={() => go(k)}>
            {busy === k ? "Submitting…" : v}
          </Button>
        ))}
      </div>
      {err && <p className="px-5 pb-4 text-xs text-bad">{err}</p>}
      {runs.length > 0 && (
        <ul className="divide-y divide-border border-t border-border">
          {runs.map((r) => (
            <li key={r.hash} className="space-y-1.5 px-5 py-4 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={r.accepted ? "ok" : "bad"}>{r.status}</Badge>
                <span className="text-foreground">{r.amount} mUSDC → {r.payee.slice(0, 10)}…</span>
              </div>
              {r.reason && <p className="text-warn">{r.reason}</p>}
              <p className="text-muted-foreground">{r.note}</p>
              <p className="break-all font-mono text-[11px] text-muted-foreground">{r.hash}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function Agent() {
  const s = useAnon();
  const privateReady = s.status === "ready" && s.kind === "network" && s.mode === "private";
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [facts, setFacts] = useState<{ block?: string; minStake?: string; entryPoint?: string } | null>(null);
  const [policy, setPolicy] = useState<{ cap: bigint; daily: bigint; spent: bigint; balance: bigint; providerActive: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const out: Check[] = [];
      const block = BigInt(await rpcRequest<string>("eth_blockNumber"));
      out.push({ label: "Devnet reachable through Anon-RPC", state: "ok", detail: `block ${block} on chain ${TARGET_CHAIN.id}` });
      const code = await rpcRequest<string>("eth_getCode", [STAKING_REGISTRY, "latest"]);
      out.push({ label: "Staking registry deployed", state: code && code !== "0x" ? "ok" : "fail", detail: code && code !== "0x" ? `${(code.length - 2) / 2} bytes at ${STAKING_REGISTRY.slice(0, 10)}…` : "no code at the documented address (devnet may have been reset)" });
      let cfg: { minStake?: string; entryPoints?: string[] } | null = null;
      try {
        cfg = await rpcRequest("skandha_config", [], { endpoint: TARGET_CHAIN.sidecarRpc });
      } catch {
        /* sidecar config is optional */
      }
      out.push({ label: "Alt-Mempool sidecar answers", state: cfg ? "ok" : "fail", detail: cfg ? `minStake ${cfg.minStake ? Number(BigInt(cfg.minStake)) / 1e18 : "?"} ETH` : "skandha_config unavailable" });
      setFacts({ block: String(block), minStake: cfg?.minStake, entryPoint: cfg?.entryPoints?.[0] });
      const has = async (a: string) => {
        const c = await rpcRequest<string>("eth_getCode", [a, "latest"]);
        return c && c !== "0x" ? (c.length - 2) / 2 : 0;
      };
      const [vb, pb, rb] = await Promise.all([has(dep.vault), has(dep.paymaster), has(dep.registry)]);
      out.push({ label: "AgentBudgetVault deployed", state: vb ? "ok" : "fail", detail: vb ? `${vb} bytes at ${dep.vault.slice(0, 10)}…` : "no code (devnet reset? re-run scripts/deploy-devnet.mts)" });
      out.push({ label: "ERC-20 TokenPaymaster deployed", state: pb ? "ok" : "fail", detail: pb ? `${pb} bytes at ${dep.paymaster.slice(0, 10)}…` : "no code" });
      out.push({ label: "ProviderRegistry deployed", state: rb ? "ok" : "fail", detail: rb ? `${rb} bytes at ${dep.registry.slice(0, 10)}…` : "no code" });
      const call = async (to: string, sig: string, fn: string, args: unknown[] = []) => {
        const abi = parseAbi([sig]);
        const data = encodeFunctionData({ abi, functionName: fn, args } as never);
        const r = await rpcRequest<string>("eth_call", [{ to, data }, "latest"]);
        return decodeFunctionResult({ abi, functionName: fn, data: r as `0x${string}` } as never) as unknown;
      };
      if (vb) {
        const [cap, daily, spent, bal, active] = await Promise.all([
          call(dep.vault, "function perRequestCap() view returns (uint256)", "perRequestCap"),
          call(dep.vault, "function dailyQuota() view returns (uint256)", "dailyQuota"),
          call(dep.vault, "function spentToday() view returns (uint256)", "spentToday"),
          call(dep.token, "function balanceOf(address) view returns (uint256)", "balanceOf", [dep.vault]),
          call(dep.registry, "function isActive(address) view returns (bool)", "isActive", [dep.provider]),
        ]);
        setPolicy({ cap: cap as bigint, daily: daily as bigint, spent: spent as bigint, balance: bal as bigint, providerActive: active as boolean });
      }
      setChecks(out);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border border-ok/40 p-5 text-sm text-ok">
        The vault, paymaster and provider registry are <strong>deployed on the Alt-Mempool devnet</strong> (chain 1337, throwaway test tokens). A real Frame Transaction paid a registered provider through the paymaster, and over-limit and unregistered payments were rejected during validation, before inclusion. The devnet can be reset at any time.
      </div>

      <LiveDemo />

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader title="Devnet readiness" sub="Real reads, sent through Anon-RPC." right={<Button size="sm" onClick={run} disabled={!privateReady || busy}>{busy ? "Checking…" : "Run devnet check"}</Button>} />
          <div className="p-5">
            {!privateReady && (
              <p className="text-xs text-muted-foreground">
                Reads are blocked until an anonymising network is running (fail-closed). <Link href="/app/privacy" className="text-accent underline">Start one in the Privacy Center</Link>.
              </p>
            )}
            {err && <p className="mb-3 text-xs text-bad">{err}</p>}
            {checks && (
              <ul className="divide-y divide-border border border-border">
                {checks.map((c) => (
                  <li key={c.label} className="flex items-center justify-between gap-4 px-4 py-3 text-xs">
                    <div className="min-w-0">
                      <div className="text-foreground">{c.label}</div>
                      <div className="mt-0.5 text-muted-foreground">{c.detail}</div>
                    </div>
                    <Badge tone={c.state === "ok" ? "ok" : c.state === "fail" ? "bad" : "warn"}>{c.state === "todo" ? "pending" : c.state}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3 self-start">
          <Stat label="Chain" value={TARGET_CHAIN.id} sub={TARGET_CHAIN.name} />
          <Stat label="Latest block" value={facts?.block ?? "—"} />
          <Stat label="Sidecar minStake" value={facts?.minStake ? `${Number(BigInt(facts.minStake)) / 1e18} ETH` : "—"} />
          <Stat label="Anonymised reads" value={s.anonRequests} tone="accent" />
        </div>
      </div>

      <Card>
        <CardHeader title="Spending policy (read from the chain)" sub="Enforced by the vault's VERIFY frame. Run the devnet check to load the live values." right={<Badge tone="ok">deployed</Badge>} />
        <div className="grid gap-px border-t border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Max per request", policy ? `${Number(policy.cap) / 1e6} mUSDC` : "—"],
            ["Daily limit", policy ? `${Number(policy.daily) / 1e6} mUSDC` : "—"],
            ["Spent today", policy ? `${Number(policy.spent) / 1e6} mUSDC` : "—"],
            ["Vault balance", policy ? `${Number(policy.balance) / 1e6} mUSDC` : "—"],
            ["Demo provider active", policy ? (policy.providerActive ? "yes — registered" : "no") : "—"],
            ["Gas", "sponsored by the ERC-20 paymaster, repaid in tokens"],
          ].map(([k, v]) => (
            <div key={k} className="bg-card p-4 text-xs">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
              <div className="mt-1.5 text-foreground">{v}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t border-border p-5 text-xs text-muted-foreground">
          <p>Contracts: vault <span className="font-mono text-foreground">{dep.vault}</span>, paymaster <span className="font-mono text-foreground">{dep.paymaster}</span>, registry <span className="font-mono text-foreground">{dep.registry}</span>.</p>
          <p>Paid Frame Tx: <span className="break-all font-mono text-foreground">{dep.proof.paidTx}</span></p>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-border p-5">
          <a className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground" href="https://docs.altmempool.wtf/" target="_blank" rel="noreferrer">Alt-Mempool docs ↗</a>
          <a className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground" href="https://eips.ethereum.org/EIPS/eip-8141" target="_blank" rel="noreferrer">EIP-8141 ↗</a>
        </div>
      </Card>
    </div>
  );
}
