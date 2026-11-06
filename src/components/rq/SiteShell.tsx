"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "./Logo";
import { LinkButton } from "./ui";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? "px-3 pt-3" : "px-0 pt-0"}`}>
      <div className={`mx-auto transition-all duration-500 ${scrolled ? "max-w-5xl rounded-full border border-neutral-800 bg-black/70 backdrop-blur-xl" : "max-w-none border-b border-transparent"}`}>
        <div className={`flex items-center justify-between px-6 transition-all duration-500 lg:px-8 ${scrolled ? "h-14" : "h-20"}`}>
          <Logo />
          <div className="flex items-center gap-3">
            <LinkButton href="/app" size="sm">
              Open the dashboard
            </LinkButton>
          </div>
        </div>
      </div>
    </header>
  );
}

const COLS: { title: string; links: [string, string, boolean?][] }[] = [
  { title: "Explore", links: [["Models", "/models"], ["Providers", "/providers"], ["Network stats", "/stats"]] },
  { title: "Developers", links: [["Dashboard", "/app"], ["Playground", "/app/playground"], ["API keys", "/app/keys"], ["Privacy Center", "/app/privacy"]] },
  { title: "Built on", links: [["Anon-RPC", "https://ethereum.github.io/anon-rpc/", true], ["EIP-8141", "https://eips.ethereum.org/EIPS/eip-8141", true], ["Alternative Mempools", "https://docs.altmempool.wtf/", true], ["NEAR AI Cloud", "https://cloud-api.near.ai/docs", true]] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-900">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-500">One API. Every model. No single gatekeeper. Private Ethereum reads over Anon-RPC and programmable agent payments with Frame Transactions.</p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h4 className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">{c.title}</h4>
            <ul className="mt-5 space-y-3">
              {c.links.map(([label, href, ext]) => (
                <li key={label}>
                  {ext ? (
                    <a href={href} target="_blank" rel="noreferrer" className="text-sm text-neutral-400 hover:text-white">
                      {label} ↗
                    </a>
                  ) : (
                    <Link href={href} className="text-sm text-neutral-400 hover:text-white">
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="relative overflow-hidden border-t border-neutral-900 select-none" aria-hidden>
        <div className="pointer-events-none absolute left-1/2 top-0 h-2/3 w-3/4 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-[110px]" />
        <p
          className="relative mx-auto max-w-[110rem] whitespace-nowrap px-4 pb-6 pt-6 text-center font-semibold leading-[1] tracking-tighter text-transparent"
          style={{
            fontSize: "clamp(5rem, 25vw, 27rem)",
            backgroundImage: "linear-gradient(180deg, #ffffff 0%, #d4d4d4 35%, #6ee7b7 75%, rgba(52,211,153,0) 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
          }}
        >
          routiq
        </p>
      </div>
    </footer>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-black">
      <SiteHeader />
      <main className="flex-1 pt-20">{children}</main>
      <SiteFooter />
    </div>
  );
}
