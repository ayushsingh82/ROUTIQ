"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Circle } from "lucide-react";
import { formatEther } from "viem";
import { store } from "@/lib/db";
import { TARGET_CHAINS } from "@/lib/anon-rpc/networks";
import type { DetectedPayment } from "@/lib/scanner/types";
import { Btn, Card, SEPOLIA_ADDR, short, Stat, useAnon, useUnlocked } from "./ui";

type Dest = "identity" | "privacy" | "scan" | "send";
const CHAIN_ID = TARGET_CHAINS.sepolia.id;
const when = (ms: number) => new Date(ms).toLocaleString();

export function OverviewPanel({ active, go }: { active: boolean; go: (t: Dest) => void }) {
  const anon = useAnon();
  const unlocked = useUnlocked();
  const [payments, setPayments] = useState<DetectedPayment[]>([]);
  const [hasVault, setHasVault] = useState(false);
  const [lastScan, setLastScan] = useState<{ block: string; at: number } | null>(null);

  const load = useCallback(async () => {
    const [p, v, s] = await Promise.all([store.allPayments(), store.getVault(), store.getScanState(CHAIN_ID)]);
    setPayments(p.sort((a, b) => Number(BigInt(b.blockNumber) - BigInt(a.blockNumber))));
    setHasVault(!!v);
    setLastScan(s ? { block: s.lastScannedBlock, at: s.lastScanAt } : null);
  }, []);

  // Panels stay mounted while hidden, so reload whenever this tab becomes visible.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (active) load().catch(() => {});
  }, [active, load]);

  const verified = payments.filter((p) => p.status === "verified" && p.amountWei);
  const totalWei = verified.reduce((s, p) => s + BigInt(p.amountWei!), 0n);
  const addresses = new Set(payments.map((p) => p.stealthAddress.toLowerCase())).size;
  const privateReady = anon.status === "ready" && anon.mode === "private" && anon.kind === "network";

  const checklist: { done: boolean; label: string; action?: [string, Dest] }[] = [
    { done: hasVault, label: "Create your stealth identity", action: ["Create", "identity"] },
    { done: unlocked, label: "Unlock the vault", action: ["Unlock", "identity"] },
    { done: privateReady, label: "Start an Anon-RPC network", action: ["Open Privacy", "privacy"] },
    { done: payments.length > 0, label: "Receive and discover a payment", action: ["Scan", "scan"] },
  ];
  const next = checklist.find((c) => !c.done);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Verified received" value={`${formatEther(totalWei)} ETH`} tone={totalWei > 0n ? "good" : undefined} />
        <Stat label="Payments discovered" value={payments.length} />
        <Stat label="Stealth addresses" value={addresses} />
        <Stat label="Last scan" value={lastScan ? `block ${lastScan.block}` : "never"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Card
            title="Recent payments"
            right={
              <Btn variant="ghost" onClick={() => go("scan")}>
                Open inbox
              </Btn>
            }
          >
            {payments.length === 0 ? (
              <p className="text-sm text-zinc-400">Nothing discovered yet. Share your meta-address, have someone pay it, then scan.</p>
            ) : (
              <div className="space-y-2">
                {payments.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-black/25 p-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-mono">
                        {p.status === "verified" && p.amountWei ? `${formatEther(BigInt(p.amountWei))} ETH` : "unverified"}
                      </div>
                      <a className="font-mono text-xs text-accent underline" href={SEPOLIA_ADDR(p.stealthAddress)} target="_blank" rel="noreferrer">
                        {short(p.stealthAddress)}
                      </a>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ${p.status === "verified" ? "bg-accent/20 text-accent" : "bg-amber-500/20 text-amber-300"}`}>{p.status}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Quick actions">
            <div className="flex flex-wrap gap-2">
              <Btn onClick={() => go("scan")}>Scan for payments</Btn>
              <Btn variant="ghost" onClick={() => go("identity")}>
                Receive (my meta-address)
              </Btn>
              <Btn variant="ghost" onClick={() => go("send")}>
                Send a payment
              </Btn>
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card title={next ? "Get started" : "You're all set"}>
            <ol className="space-y-2">
              {checklist.map((c) => (
                <li key={c.label} className="flex items-center gap-3 text-sm">
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${c.done ? "bg-accent text-black" : "border border-white/20 text-transparent"}`}>
                    {c.done ? <Check size={13} /> : <Circle size={13} />}
                  </span>
                  <span className={c.done ? "text-mint/50 line-through" : ""}>{c.label}</span>
                  {!c.done && c === next && c.action && (
                    <button onClick={() => go(c.action![1])} className="ml-auto text-xs text-accent underline">
                      {c.action[0]}
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </Card>

          <Card title="Status">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-400">Network</dt>
                <dd>Ethereum Sepolia · {CHAIN_ID}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-400">Anon-RPC</dt>
                <dd className={privateReady ? "text-accent" : "text-red-300"}>{privateReady ? `${anon.networkId} · private` : anon.mode === "direct" ? "direct (not anonymous)" : "off · reads blocked"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-400">Vault</dt>
                <dd>{unlocked ? "unlocked" : hasVault ? "locked" : "not created"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-400">Last scan</dt>
                <dd>{lastScan ? when(lastScan.at) : "never"}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
