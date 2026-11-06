"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { IconCompare, IconIdentity, IconOverview, IconPrivacy, IconScan, IconSend } from "./icons";
import { IdentityPanel } from "./IdentityPanel";
import { OverviewPanel } from "./OverviewPanel";
import { PrivacyPanel } from "./PrivacyPanel";
import { ProviderViewPanel } from "./ProviderViewPanel";
import { ScannerPanel } from "./ScannerPanel";
import { SendPanel } from "./SendPanel";
import { Logo } from "./Logo";
import { useAnon, useUnlocked } from "./ui";

const TABS = [
  { id: "overview", label: "Overview", icon: IconOverview, hint: "Your stealth wallet at a glance" },
  { id: "identity", label: "Identity", icon: IconIdentity, hint: "Your stealth keys and shareable meta-address" },
  { id: "privacy", label: "Privacy", icon: IconPrivacy, hint: "Anon-RPC network, routing counters and mode" },
  { id: "view", label: "Provider's view", icon: IconCompare, hint: "What an RPC provider sees: direct vs anonymized" },
  { id: "scan", label: "Scan & Inbox", icon: IconScan, hint: "Find and verify payments meant for you" },
  { id: "send", label: "Send", icon: IconSend, hint: "Pay a meta-address on Ethereum Sepolia" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const anon = useAnon();
  const unlocked = useUnlocked();
  const private_ = anon.status === "ready" && anon.mode === "private" && anon.kind === "network";
  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div className="min-h-screen text-mint md:flex">
      {/* Sidebar (becomes a scrollable top bar on small screens) */}
      <aside className="shrink-0 border-b border-white/10 bg-black/20 px-4 py-3 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:border-b-0 md:border-r md:px-4 md:py-6">
        <div className="mb-3 md:mb-8 md:px-2">
          <Logo dark size={34} />
        </div>

        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`group btn-press flex shrink-0 items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition md:w-full ${
                tab === id ? "bg-accent text-black" : "text-mint/60 hover:bg-white/5 hover:text-mint"
              }`}
            >
              <Icon size={18} />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto hidden space-y-4 pt-8 md:block">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs leading-relaxed text-mint/60">
            Keys never leave this browser. Chain reads go through Anon-RPC only. No analytics, no backend.
          </div>
          <Link href="/" className="flex items-center gap-2 px-2 text-xs text-mint/50 hover:text-mint">
            <ArrowLeft size={14} /> Back to home
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">
        <div className="mx-auto max-w-5xl">
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{current.label}</h1>
              <p className="mt-1 text-sm text-mint/50">{current.hint}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/10 px-3 py-1 text-mint">Ethereum Sepolia · 11155111</span>
              <span className={`inline-flex items-center rounded-full px-3 py-1 ${private_ ? "bg-accent/15 text-accent" : "bg-red-500/15 text-red-300"}`}>
                {private_ && <span className="live-dot mr-2" />}
                {private_ ? `Anon-RPC · ${anon.networkId}` : "Anon-RPC off · reads blocked"}
              </span>
              <span className={`rounded-full px-3 py-1 ${unlocked ? "bg-accent/15 text-accent" : "bg-white/10 text-mint/60"}`}>
                {unlocked ? "Vault unlocked" : "Vault locked"}
              </span>
            </div>
          </header>

          <div className={tab === "overview" ? "animate-panel" : "hidden"}>
            <OverviewPanel active={tab === "overview"} go={setTab} />
          </div>
          <div className={tab === "identity" ? "animate-panel" : "hidden"}>
            <IdentityPanel />
          </div>
          <div className={tab === "privacy" ? "animate-panel" : "hidden"}>
            <PrivacyPanel />
          </div>
          <div className={tab === "view" ? "animate-panel" : "hidden"}>
            <ProviderViewPanel />
          </div>
          <div className={tab === "scan" ? "animate-panel" : "hidden"}>
            <ScannerPanel />
          </div>
          <div className={tab === "send" ? "animate-panel" : "hidden"}>
            <SendPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
