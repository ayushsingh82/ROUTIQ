"use client";

import Link from "next/link";
import { useState } from "react";
import { TARGET_CHAIN } from "@/lib/anon-rpc/networks";
import { rpcRequest } from "@/lib/rpc/client";
import { Badge, Button, Card, CardHeader, LinkButton, Stat } from "../ui";
import { useAnon } from "./useAnon";

// NaiveStakingRegistry on the devnet, from https://docs.altmempool.wtf/guides/devnet/ (addresses can change if the devnet resets).
const STAKING_REGISTRY = "0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f";

interface Check {
  label: string;
  state: "ok" | "fail" | "todo";
  detail: string;
}

export function Agent() {
  const s = useAnon();
  const privateReady = s.status === "ready" && s.kind === "network" && s.mode === "private";
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [facts, setFacts] = useState<{ block?: string; minStake?: string; entryPoint?: string } | null>(null);
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
      out.push({ label: "Frame opcodes usable in VERIFY frames", state: "todo", detail: "APPROVE and SIGPARAM verified upstream; FRAMEPARAM / FRAMEDATACOPY unverified on this devnet" });
      out.push({ label: "AgentBudgetVault contract", state: "todo", detail: "not deployed" });
      out.push({ label: "ROUTIQ ERC-20 paymaster", state: "todo", detail: "not deployed" });
      setChecks(out);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border border-warn/50 p-5 text-sm text-warn">
        Agent spending policies are enforced by smart-account validation on the Alt-Mempool devnet. That onchain part is <strong>in progress</strong>: no vault or paymaster is deployed yet, so nothing on this page can move funds. Inference metering (offchain) is live and is labelled as offchain wherever it appears.
      </div>

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
        <CardHeader title="Planned spending policy" sub="Read-only preview of what the vault and paymaster will enforce. Not active." right={<Badge tone="warn">not deployed</Badge>} />
        <div className="grid gap-px border-t border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Total budget", "USDC, set by the owner"],
            ["Max per request", "e.g. $0.10"],
            ["Daily limit", "e.g. $2.00"],
            ["Approved models", "allowlist"],
            ["Approved providers", "allowlist"],
            ["Session expiry", "e.g. 24 h"],
            ["Gas sponsorship quota", "paymaster, per day"],
            ["Max sponsored tx", "e.g. $0.10"],
            ["Revocation", "owner can revoke at any time"],
          ].map(([k, v]) => (
            <div key={k} className="bg-card p-4 text-xs">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
              <div className="mt-1.5 text-foreground">{v}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-border p-5">
          <LinkButton href="/roadmap" variant="outline" size="sm">View roadmap</LinkButton>
          <a className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground" href="https://docs.altmempool.wtf/" target="_blank" rel="noreferrer">Alt-Mempool docs ↗</a>
          <a className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground" href="https://eips.ethereum.org/EIPS/eip-8141" target="_blank" rel="noreferrer">EIP-8141 ↗</a>
        </div>
      </Card>
    </div>
  );
}
