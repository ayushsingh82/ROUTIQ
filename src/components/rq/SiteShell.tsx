"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "./Logo";
import { LinkButton } from "./ui";

const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/models", label: "Models" },
  { href: "/providers", label: "Providers" },
  { href: "/stats", label: "Stats" },
  { href: "/roadmap", label: "Roadmap" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
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
          <nav className="hidden items-center gap-9 md:flex">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="group relative text-sm font-medium text-neutral-400 transition-colors hover:text-white">
                {l.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-white transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <LinkButton href="/app" size="sm" className="hidden md:inline-flex">
              Open the console
            </LinkButton>
            <button onClick={() => setOpen((o) => !o)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} className="p-2 text-white md:hidden">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {open ? <path strokeLinecap="round" strokeWidth="1.8" d="M6 6l12 12M18 6L6 18" /> : <path strokeLinecap="round" strokeWidth="1.8" d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>
      {open && (
        <nav className="mx-3 mt-2 flex flex-col gap-1 rounded-2xl border border-neutral-800 bg-black p-3 md:hidden">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-base font-medium text-neutral-200 hover:bg-neutral-900">
              {l.label}
            </Link>
          ))}
          <LinkButton href="/app" className="mt-2">
            Open the console
          </LinkButton>
        </nav>
      )}
    </header>
  );
}

const COLS: { title: string; links: [string, string, boolean?][] }[] = [
  { title: "Explore", links: [["Models", "/models"], ["Providers", "/providers"], ["Network stats", "/stats"], ["Roadmap", "/roadmap"]] },
  { title: "Developers", links: [["Console", "/app"], ["Playground", "/app/playground"], ["API keys", "/app/keys"], ["Privacy Center", "/app/privacy"]] },
  { title: "Built on", links: [["Anon-RPC", "https://ethereum.github.io/anon-rpc/", true], ["EIP-8141", "https://eips.ethereum.org/EIPS/eip-8141", true], ["Alternative Mempools", "https://docs.altmempool.wtf/", true], ["NEAR AI Cloud", "https://cloud-api.near.ai/docs", true]] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-900">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-500">One API. Every model. No single gatekeeper. Privacy-aware inference and programmable payments for AI agents.</p>
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
      <div className="border-t border-neutral-900">
        <p className="mx-auto max-w-6xl px-6 py-6 text-xs leading-relaxed text-neutral-600">
          Hackathon software (ETHGlobal Mumbai). Runs against a public throwaway devnet; not audited; do not use with real funds. Anon-RPC protects supported Ethereum reads only — it does not hide prompts from inference providers.
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
