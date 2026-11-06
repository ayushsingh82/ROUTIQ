"use client";

import { useMemo, useState } from "react";
import type { EIP1193Provider } from "viem";
import { generateStealthAddress, parseMetaAddress, toHex } from "@/lib/crypto/stealth";
import { sendStealthEth, type SendResult } from "@/lib/sender/send";
import { Btn, Card, inputCls, SEPOLIA_ADDR, SEPOLIA_TX, Stat } from "./ui";

export function SendPanel() {
  const [meta, setMeta] = useState("");
  const [amount, setAmount] = useState("0.001");
  const [steps, setSteps] = useState<string[]>([]);
  const [res, setRes] = useState<SendResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [nonce, setNonce] = useState(0);

  let metaOk = false;
  try {
    parseMetaAddress(meta);
    metaOk = true;
  } catch {
    /* invalid */
  }

  // The exact one-time address that will receive the funds, shown BEFORE paying. A fresh one per payment.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = useMemo(() => (metaOk ? generateStealthAddress(meta.trim()) : null), [meta, metaOk, nonce]);

  async function send() {
    const provider = (window as unknown as { ethereum?: EIP1193Provider }).ethereum;
    if (!provider) return setErr("No EIP-1193 wallet found (install MetaMask).");
    if (!plan) return;
    setErr(null);
    setRes(null);
    setSteps([]);
    setBusy(true);
    try {
      setRes(await sendStealthEth(provider, plan, amount, (s) => setSteps((x) => [...x, s])));
      setNonce((n) => n + 1); // next payment gets a brand-new stealth address
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Send a stealth payment (demo sender · Sepolia ETH)">
        <p className="mb-3 text-xs text-zinc-400">
          Derives a one-time stealth address from the recipient&apos;s meta-address, sends ETH to it, then publishes the ERC-5564 announcement.
          These are two separate wallet transactions. Use a <strong>different wallet</strong> than the recipient for a clean demo.
        </p>
        <div className="space-y-3">
          <textarea className={`${inputCls} h-20`} placeholder="st:eth:0x…" value={meta} onChange={(e) => setMeta(e.target.value)} />
          {meta && !metaOk && <p className="text-xs text-red-400">Not a valid stealth meta-address.</p>}
          {plan && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">One-time stealth address · Ethereum Sepolia</span>
                <span className="rounded-full bg-accent/15 px-3 py-1 text-xs text-accent">chain 11155111</span>
              </div>
              <a className="break-all font-mono text-sm text-accent underline" href={SEPOLIA_ADDR(plan.stealthAddress)} target="_blank" rel="noreferrer">
                {plan.stealthAddress}
              </a>
              <div className="mt-2 grid gap-1 text-xs text-zinc-400 md:grid-cols-2">
                <div>View tag: <span className="font-mono">0x{plan.viewTag.toString(16).padStart(2, "0")}</span></div>
                <div className="break-all">Ephemeral key: <span className="font-mono">{toHex(plan.ephemeralPublicKey)}</span></div>
              </div>
              <p className="mt-2 text-xs text-zinc-500">This is exactly where your ETH will go. It is unlinkable to the recipient&apos;s wallet. Pay twice and you get two different addresses.</p>
            </div>
          )}
          <div className="flex items-end gap-3">
            <label className="text-xs text-zinc-400">
              Amount (ETH)
              <input className={`${inputCls} mt-1 w-40`} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <Btn onClick={send} disabled={!plan || busy || !Number(amount)}>
              {busy ? "Waiting for wallet…" : "Pay privately"}
            </Btn>
          </div>
        </div>
        {steps.length > 0 && <pre className="mt-3 whitespace-pre-wrap text-xs text-zinc-400">{steps.join("\n")}</pre>}
        {err && <p className="mt-3 break-all text-sm text-red-400">{err}</p>}
      </Card>

      {res && (
        <Card title="Sent">
          <div className="grid gap-3 md:grid-cols-2">
            <Stat label="Stealth address" value={<a className="text-accent underline" href={SEPOLIA_ADDR(res.stealthAddress)} target="_blank" rel="noreferrer">{res.stealthAddress}</a>} />
            <Stat label="View tag" value={`0x${res.viewTag.toString(16).padStart(2, "0")}`} />
            <Stat label="Ephemeral public key" value={res.ephemeralPublicKey} />
            <div />
            <Stat label="Transfer tx" value={<a className="text-accent underline" href={SEPOLIA_TX(res.transferTx)} target="_blank" rel="noreferrer">{res.transferTx}</a>} />
            <Stat label="Announcement tx" value={<a className="text-accent underline" href={SEPOLIA_TX(res.announceTx)} target="_blank" rel="noreferrer">{res.announceTx}</a>} />
          </div>
        </Card>
      )}
    </div>
  );
}
