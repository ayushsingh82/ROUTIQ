"use client";

import { WalletButton } from "../WalletButton";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";
import { useCatalog, useSessionKey } from "../hooks";
import { Logo } from "../Logo";
import { FaucetButton } from "./FaucetButton";
import { useAnon } from "./useAnon";

type IconName = "home" | "play" | "models" | "usage" | "nodes" | "privacy" | "vault" | "key";
const PATHS: Record<IconName, string> = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  play: "M7 4l13 8-13 8z",
  models: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5",
  usage: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  nodes: "M4 6h16v5H4zM4 14h16v5H4zM8 8.5h.01M8 16.5h.01",
  privacy: "M12 3l8 3v6c0 4.5-3.2 7.7-8 9-4.8-1.3-8-4.5-8-9V6z",
  vault: "M4 5h16v14H4zM12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M12 5v4M12 15v4",
  key: "M15 7a4 4 0 1 1-3.4 6.1L4 20.7V22h2v-2h2v-2h2l1.9-1.9A4 4 0 0 1 15 7zM16 9h.01",
};
const Icon = ({ n }: { n: IconName }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={PATHS[n]} />
  </svg>
);

const GROUPS: { label: string; items: { href: string; label: string; icon: IconName; hint: string }[] }[] = [
  {
    label: "My workspace",
    items: [
      { href: "/app", label: "Overview", icon: "home", hint: "Setup checks and recent activity" },
      { href: "/app/playground", label: "Playground", icon: "play", hint: "Send requests through the router" },
      { href: "/app/models", label: "Browse models", icon: "models", hint: "Every model a provider really serves" },
      { href: "/app/usage", label: "Usage", icon: "usage", hint: "Tokens, cost and latency from real requests" },
    ],
  },
  {
    label: "Network",
    items: [
      { href: "/app/nodes", label: "Providers", icon: "nodes", hint: "Health and registration" },
      { href: "/app/privacy", label: "Privacy Center", icon: "privacy", hint: "Anon-RPC status and reads" },
    ],
  },
  {
    label: "Agents",
    items: [
      { href: "/app/agent", label: "Agent vault", icon: "vault", hint: "Spending policy and paymaster" },
      { href: "/app/keys", label: "API keys", icon: "key", hint: "Create and revoke keys" },
    ],
  },
];
const ALL = GROUPS.flatMap((g) => g.items);

const KeyCtx = createContext<ReturnType<typeof useSessionKey> | null>(null);
export const useConsoleKey = () => {
  const v = useContext(KeyCtx);
  if (!v) throw new Error("useConsoleKey outside ConsoleShell");
  return v;
};

export function ConsoleShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const session = useSessionKey();
  const anon = useAnon();
  const { data: catalog } = useCatalog(20_000);
  const near = catalog?.providers.find((p) => p.id === "near-ai-cloud");
  const current = ALL.find((n) => (n.href === "/app" ? path === "/app" : path.startsWith(n.href))) ?? ALL[0];
  const privateReady = anon.status === "ready" && anon.kind === "network" && anon.mode === "private";

  return (
    <KeyCtx.Provider value={session}>
      <div className="flex min-h-screen flex-col bg-black md:flex-row">
        <aside className="shrink-0 border-b border-neutral-900 bg-black md:sticky md:top-0 md:flex md:h-screen md:w-60 md:flex-col md:border-b-0 md:border-r">
          <div className="px-5 py-5">
            <Logo href="/" />
          </div>
          <nav className="flex gap-6 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:gap-7 md:overflow-y-auto md:pb-6">
            {GROUPS.map((g) => (
              <div key={g.label} className="flex shrink-0 gap-1 md:block md:space-y-1">
                <p className="hidden px-3 pb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-600 md:block">{g.label}</p>
                {g.items.map((n) => {
                  const on = n === current;
                  return (
                    <Link key={n.href} href={n.href} className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${on ? "bg-neutral-900 text-white shadow-[inset_2px_0_0_#34d399]" : "text-neutral-400 hover:bg-neutral-950 hover:text-white"}`}>
                      <Icon n={n.icon} />
                      <span className="whitespace-nowrap">{n.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="hidden space-y-2 border-t border-neutral-900 px-5 py-4 font-mono text-[10px] uppercase tracking-[0.2em] md:block">
            <p className={`flex items-center gap-2 ${near?.configured && near.status === "up" ? "text-neutral-400" : "text-neutral-600"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${near?.configured && near.status === "up" ? "bg-emerald-400" : "bg-neutral-700"}`} />
              NEAR AI Cloud {near?.configured && near.status === "up" ? "connected" : near && !near.configured ? "no key" : "…"}
            </p>
            <p className={`flex items-center gap-2 ${privateReady ? "text-neutral-400" : "text-neutral-600"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${privateReady ? "bg-emerald-400" : "bg-neutral-700"}`} />
              Anon-RPC {privateReady ? anon.networkId : "off"}
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex h-14 items-center justify-between border-b border-neutral-900 px-6 md:px-8">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-neutral-600">ROUTIQ</span>
              <span className="text-neutral-700">/</span>
              <h1 className="font-medium text-white">{current.label}</h1>
              <span className="hidden items-center gap-1.5 rounded-full border border-neutral-800 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-neutral-400 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Alt-Mempool devnet · 1337
              </span>
            </div>
            <div className="flex items-center gap-3">
            <FaucetButton />
            <WalletButton />
            </div>
          </header>
          <div className="px-6 py-10 md:px-8">
            <div className="mb-10">
              <h2 className="text-3xl font-semibold tracking-tight">{current.label}</h2>
              <p className="mt-2 text-sm text-neutral-500">{current.hint}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </KeyCtx.Provider>
  );
}
