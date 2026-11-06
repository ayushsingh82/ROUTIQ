"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { anonStore } from "@/lib/anon-rpc/manager";
import { vaultSession } from "@/lib/vault/session";

export function useAnon() {
  return useSyncExternalStore(anonStore.subscribe, anonStore.getSnapshot, anonStore.getServerSnapshot);
}
export function useUnlocked() {
  return useSyncExternalStore(vaultSession.subscribe, vaultSession.isUnlocked, () => false);
}

export function Card({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="card-hover rounded-2xl border border-white/10 bg-white/[0.05] p-5">
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">{title}</h2>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Btn({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
}) {
  const v = {
    primary: "bg-accent text-black hover:brightness-95",
    ghost: "border border-white/15 text-zinc-200 hover:bg-white/5",
    danger: "border border-red-500/40 text-red-300 hover:bg-red-500/10",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn-press rounded-full px-5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${v}`}
    >
      {children}
    </button>
  );
}

export const inputCls =
  "w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-accent/60";

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "good" | "bad" | "warn" }) {
  const c = tone === "good" ? "text-accent" : tone === "bad" ? "text-red-400" : tone === "warn" ? "text-amber-400" : "text-zinc-100";
  return (
    <div className="animate-pop rounded-lg border border-white/10 bg-black/30 p-3">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-1 break-all font-mono text-sm ${c}`}>{value}</div>
    </div>
  );
}

export const short = (s: string, n = 6) => (s.length > 2 * n + 2 ? `${s.slice(0, n + 2)}…${s.slice(-n)}` : s);
export const SEPOLIA_TX = (h: string) => `https://sepolia.etherscan.io/tx/${h}`;
export const SEPOLIA_ADDR = (a: string) => `https://sepolia.etherscan.io/address/${a}`;
