"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatEther } from "viem";
import { getKeys } from "@/lib/vault/session";
import { scan, nextScanStart } from "@/lib/scanner/scan";
import { verifyPayment } from "@/lib/scanner/verify";
import { makeScanDeps } from "@/lib/scanner/rpcDeps";
import { store } from "@/lib/db";
import { TARGET_CHAINS } from "@/lib/anon-rpc/networks";
import type { DetectedPayment, ScanProgress } from "@/lib/scanner/types";
import { Btn, Card, inputCls, SEPOLIA_ADDR, SEPOLIA_TX, short, Stat, useAnon, useUnlocked } from "./ui";

const CHAIN_ID = TARGET_CHAINS.sepolia.id;
const nowMs = () => Date.now();

export function ScannerPanel() {
  const anon = useAnon();
  const unlocked = useUnlocked();
  const [from, setFrom] = useState("");
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [payments, setPayments] = useState<DetectedPayment[]>([]);
  const [filter, setFilter] = useState<"all" | "verified" | "unverified">("all");
  const abort = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    const p = await store.allPayments();
    setPayments(p.sort((a, b) => Number(BigInt(b.blockNumber) - BigInt(a.blockNumber))));
    const st = await store.getScanState(CHAIN_ID);
    if (st) setLastScan(`block ${st.lastScannedBlock} · ${new Date(st.lastScanAt).toLocaleTimeString()}`);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const direct = anon.mode === "direct";
  const privateReady = anon.status === "ready" && anon.mode === "private" && anon.kind === "network";
  // Direct mode is allowed only because the user explicitly chose it on the Privacy tab; it is loudly flagged below.
  const ready = unlocked && (privateReady || direct);

  async function start() {
    const keys = getKeys();
    if (!keys) return;
    setErr(null);
    setRunning(true);
    const ac = new AbortController();
    abort.current = ac;
    try {
      const deps = makeScanDeps(CHAIN_ID.toString()); // isolationKey: per-chain; effect depends on network support
      const head = await deps.getBlockNumber();
      const state = await store.getScanState(CHAIN_ID);
      const userStart = from.trim() ? BigInt(from.trim()) : head > 5000n ? head - 5000n : 0n;
      const fromBlock = nextScanStart(state ? BigInt(state.lastScannedBlock) : null, userStart);
      const seenIds = await store.announcementIds();

      // Matches are processed concurrently with scanning; we must wait for them before declaring the scan done
      // or advancing the cursor, otherwise a payment can be "found" but missing from the inbox.
      const pending: Promise<void>[] = [];
      const res = await scan({
        chainId: CHAIN_ID,
        viewingPrivateKey: keys.viewingPrivateKey,
        spendingPublicKey: keys.spendingPublicKey,
        fromBlock,
        toBlock: head,
        seenIds,
        deps,
        signal: ac.signal,
        onProgress: setProgress,
        onMatch: (m) => {
          pending.push(
            (async () => {
              await store.putAnnouncement(m);
              try {
                await store.putPayment(await verifyPayment(deps, m));
              } catch (e) {
                setErr(`Verification read failed (will retry): ${e instanceof Error ? e.message : e}`);
              }
              refresh();
            })(),
          );
        },
      });
      await Promise.allSettled(pending);
      if (!res.aborted) await store.putScanState({ chainId: CHAIN_ID, lastScannedBlock: res.lastScannedBlock.toString(), lastScanAt: nowMs() });
      await reverify(deps);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    } finally {
      setRunning(false);
    }
  }

  // Verify every matched announcement that has no verified payment yet: covers transfers that landed after the
  // announcement AND announcements whose first verification failed or never finished (e.g. tab closed mid-scan).
  async function reverify(deps: ReturnType<typeof makeScanDeps>) {
    const have = new Map((await store.allPayments()).map((p) => [p.id, p]));
    for (const a of await store.allAnnouncements()) {
      if (have.get(a.id)?.status === "verified") continue;
      try {
        await store.putPayment(await verifyPayment(deps, a));
      } catch (e) {
        setErr(`Verification read failed: ${e instanceof Error ? e.message : e}`);
      }
    }
  }

  const shown = payments.filter((p) => filter === "all" || p.status === filter);
  const totalWei = payments.filter((p) => p.status === "verified" && p.amountWei).reduce((s, p) => s + BigInt(p.amountWei!), 0n);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Payments found" value={payments.length} />
        <Stat label="Verified received" value={`${formatEther(totalWei)} ETH`} tone="good" />
        <Stat label="Last scan" value={lastScan ?? "never"} />
        <Stat label="Privacy" value={direct ? "DIRECT · not anonymous" : privateReady ? "Anon-RPC · private" : "NOT READY"} tone={privateReady ? "good" : "bad"} />
      </div>

      <Card title="Scanner">
        {!unlocked && <p className="mb-3 text-sm text-amber-400">Unlock your identity first (Identity tab).</p>}
        {direct && <p className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">DIRECT mode: scans are NOT anonymized — your RPC provider can see your IP and every address this scan queries.</p>}
        {!direct && anon.status !== "ready" && <p className="mb-3 text-sm text-amber-400">Start an Anon-RPC worker first (Privacy tab). Chain reads are blocked until then — by design.</p>}
        {!direct && anon.status === "ready" && anon.kind !== "network" && <p className="mb-3 text-sm text-red-400">Selected worker does not anonymize. Choose a real network.</p>}
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-zinc-400">
            Start block (blank = last 5,000 · public RPCs keep only ~1–2 days of logs)
            <input className={`${inputCls} mt-1 w-48`} value={from} onChange={(e) => setFrom(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 7000000" />
          </label>
          <Btn onClick={start} disabled={!ready || running}>
            {running ? "Scanning…" : "Start scan"}
          </Btn>
          <Btn variant="ghost" onClick={() => abort.current?.abort()} disabled={!running}>
            Stop
          </Btn>
        </div>
        <p className="mt-3 text-xs text-zinc-500">Matching runs locally in this tab. Your viewing key is never sent to the RPC, the worker, or any server.</p>
        {err && <p className="mt-3 break-all font-mono text-xs text-red-400">{err}</p>}
        {progress && (
          <div className="mt-4 space-y-2">
            <div className="h-2 overflow-hidden rounded bg-white/10">
              <div
                className={`h-full bg-accent transition-all ${running ? "animate-pulse" : ""}`}
                style={{
                  width: `${progress.toBlock > progress.fromBlock ? Number(((progress.currentBlock - progress.fromBlock) * 100n) / (progress.toBlock - progress.fromBlock + 1n)) : 100}%`,
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Block" value={`${progress.currentBlock} / ${progress.toBlock}`} />
              <Stat label="Announcements" value={progress.announcementsScanned} />
              <Stat label="View-tag passes" value={progress.viewTagMatches} />
              <Stat label="Full matches" value={progress.fullMatches} tone="good" />
              <Stat label="Wrong scheme" value={progress.wrongScheme} />
              <Stat label="Malformed" value={progress.malformed} />
              <Stat label="Duplicates" value={progress.duplicates} />
              <Stat label="Chunk retries" value={progress.chunkRetries} />
            </div>
          </div>
        )}
      </Card>

      <Card
        title="Payment inbox"
        right={
          <div className="flex gap-1 text-xs">
            {(["all", "verified", "unverified"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded px-2 py-1 ${filter === f ? "bg-accent text-black" : "text-zinc-400 hover:bg-white/5"}`}>
                {f}
              </button>
            ))}
          </div>
        }
      >
        {shown.length === 0 ? (
          <p className="text-sm text-zinc-500">No payments yet. Send one from the Send tab, then scan.</p>
        ) : (
          <div className="space-y-2">
            {shown.map((p) => (
              <div key={p.id} className="animate-pop card-hover rounded-lg border border-white/10 bg-black/30 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-lg">
                    {p.status === "verified" && p.amountWei ? `${formatEther(BigInt(p.amountWei))} ETH` : p.hintedAmountWei ? `~${formatEther(BigInt(p.hintedAmountWei))} ETH (unverified)` : "—"}
                  </span>
                  <span className={`rounded px-2 py-0.5 text-xs ${p.status === "verified" ? "bg-accent/20 text-accent" : "bg-amber-500/20 text-amber-300"}`}>{p.status}</span>
                </div>
                <div className="mt-2 grid gap-1 text-xs text-zinc-400 md:grid-cols-2">
                  <div>
                    Stealth address:{" "}
                    <a className="font-mono text-accent underline" href={SEPOLIA_ADDR(p.stealthAddress)} target="_blank" rel="noreferrer">
                      {short(p.stealthAddress)}
                    </a>
                  </div>
                  <div>
                    Announcement tx:{" "}
                    <a className="font-mono text-accent underline" href={SEPOLIA_TX(p.txHash)} target="_blank" rel="noreferrer">
                      {short(p.txHash)}
                    </a>
                  </div>
                  <div>Block {p.blockNumber}</div>
                  <div>{p.note}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
