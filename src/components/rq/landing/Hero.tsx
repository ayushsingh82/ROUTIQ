"use client";

import { LinkButton } from "../ui";

export function Hero() {
  return (
    <section className="relative -mt-20 overflow-hidden">
      <div className="halftone pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-6 pb-28 pt-40 text-center sm:pt-48">
        <span className="rq-in inline-flex max-w-full flex-wrap items-center justify-center gap-x-2.5 gap-y-1 rounded-2xl border border-neutral-800 bg-black/50 px-3 py-1.5 font-mono text-[0.6rem] font-medium uppercase tracking-[0.18em] text-neutral-400 backdrop-blur sm:rounded-full sm:px-4 sm:text-[0.7rem] sm:tracking-[0.25em]">
          <span className="rq-dot" />
          Private Ethereum reads
          <span className="hidden h-3 w-px bg-neutral-800 sm:block" />
          <span className="text-neutral-500">powered by</span> <span className="text-white">Anon-RPC</span> <span className="text-neutral-500">+</span> <span className="text-white">Frame Txs</span>
        </span>
        <h1 className="rq-in mt-8 text-balance text-[2.25rem] font-semibold leading-[1.05] tracking-tight sm:mt-10 sm:text-7xl sm:leading-[0.95] md:text-8xl" style={{ animationDelay: "0.05s" }}>
          One API. Every model.
          <br />
          No single <span className="font-serif font-normal italic">gatekeeper</span>.
        </h1>
        <p className="rq-in mt-8 max-w-2xl text-balance text-base leading-relaxed text-neutral-400 sm:text-lg" style={{ animationDelay: "0.1s" }}>
          ROUTIQ is the agent payment and execution layer: an OpenAI-compatible router over many models, spending limits enforced by the account itself, and Ethereum reads that don&apos;t leak who is asking.
        </p>
        <div className="rq-in mt-10 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row" style={{ animationDelay: "0.15s" }}>
          <LinkButton href="/app" className="w-full sm:w-auto">
            Open the dashboard
          </LinkButton>
          <LinkButton href="#how-it-works" variant="outline" className="w-full sm:w-auto">
            See how it works
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
