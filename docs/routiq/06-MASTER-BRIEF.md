# ROUTIQ — MASTER PRODUCT & ENGINEERING BRIEF

> Supersedes earlier tone/priorities where they differ. Design direction in this brief (dark, black/charcoal, **amber/orange accent**) applies to ROUTIQ. Execution rules are in `07-CODING-EXECUTION-PROMPT.md`.

## 0. Role

Act as founding CTO, product architect, senior full-stack engineer and hackathon strategist. Compete for **Best Use of Anon-RPC** and **Best Use of Frame Transaction Alternative Mempool**. Not a generic AI chatbot. Challenge weak assumptions; build the smallest working product that demonstrates a genuinely compelling use case.

## 1. Identity

**ROUTIQ** — decentralised AI inference infrastructure. Tagline: **One API. Every model. No single gatekeeper.** An open, decentralised AI routing network that connects developers to independent inference providers through a unified OpenAI-compatible API, with privacy-preserving blockchain access and programmable inference payments. Developers point the OpenAI SDK at `https://api.routiq.xyz/v1`; ROUTIQ handles provider discovery, routing, execution, usage tracking and payment-policy enforcement.

## 2. Problems

A. Provider fragmentation. B. Centralised routing/aggregators; independent operators lack an open marketplace. C. Poor routing decisions without real latency/availability/cost comparison. D. Limited programmable payments: agents need controlled spending without unrestricted access to a user's funds. E. Blockchain-read privacy: onchain registries/balances/policies expose IP-to-RPC-query linkage; Anon-RPC reduces this.

## 3. Five layers

1. Unified API gateway. 2. Independent provider discovery + marketplace. 3. Intelligent routing engine. 4. Privacy-preserving blockchain access. 5. Programmable payment and spending infrastructure. Modular: routing works independently of payments/privacy; the full demo integrates all five.

## 4. Architecture

**L1 API:** `GET /v1/models`, `POST /v1/chat/completions`, `GET /v1/providers`, `GET /v1/providers/:id`, `GET /v1/usage`. Standard OpenAI formats; multiple upstreams; normalised responses; streaming; consistent errors; token usage; latency; provider metadata; API-key auth; timeouts and cancellation. `/v1/chat/completions` first.

**L2 Marketplace:** provider publishes `ProviderManifest { providerId, name, walletAddress, endpoint, models[], inputPrice, outputPrice, capabilities[], contextWindow?, manifestURI?, updatedAt, signature? }`. Needs: registration, wallet-ownership verification, **signed manifests**, model registration, pricing, endpoint verification, availability, health checks, request stats, dashboard, deactivation. **Do not put frequently changing prices/endpoints/health onchain**: onchain registry = canonical identity + manifest commitments; offchain signed manifests verified against the registered identity. Nostr optional, only if it does not delay the core.

**L3 Router:** strategies cheapest / fastest / balanced (`0.40 cost + 0.30 latency + 0.20 availability + 0.10 reliability`, normalised; not final — test alternatives). Compare providers for the model, measure real latency, keep health, track success/failure, exclude unhealthy, configurable strategies, **explain the choice**, fallback, record decisions. **Never silently replace a model**; fallback only to another provider of the same model unless the developer explicitly allows substitution. `POST /api/v1/routing/preview` returns `{model, strategy, selectedProvider, reason, alternatives}`. Only real metrics; label simulated data.

**L4 Anon-RPC:** official browser harness, verified API. Route supported Ethereum reads (registry info, registration status, manifest commitments, smart-account balances, payment policies, payment status, reputation) through the actual anonymising worker; centralise reads; track successful/failed anonymised reads and **direct** calls separately; privacy status UI; demonstrate the worker handling requests; failure handling; never silently fall back to direct RPC while claiming anonymity. **Privacy Center:** connection status, worker status, network/chain, total anonymised reads, failed reads, direct reads, last successful read, recent activity — all from real events. Do not claim prompts are hidden, providers cannot see requests, all activity is anonymous, or transactions become private. The browser harness does not anonymise backend-originated RPC.

**L5 Frame Tx / Alt Mempool (core differentiator):** inspect the real devnet first (network, RPC, chain, encoding, smart-account interfaces, addresses, RPC methods, validation rules, verification gas limits, state-access restrictions); use only verified details. Use case: **programmable AI spending**. `SpendingPolicy { maxPerRequest, dailyLimit, totalBudget, approvedProviders[], approvedToken, expiry }` (match what the devnet supports). Example: agent may spend ≤ $0.10/request, ≤ $5/day, ≤ $50 total, approved providers only, with expiry. Demonstrate a transaction that *needs* Alt-Mempool capabilities (complex verification, daily quotas, provider allowlists, flexible state access, token validation, custom paymaster/sender logic) — verify support, do not assume.

**Required demo:** connect smart account → configure policy → construct a real Frame Tx → submit via the Alt Mempool → verify admission and execution → valid payment → violating payment → account rejects it. **The rejected transaction matters as much as the successful one.**

**Payments:** prefunded inference session (authorise budget → smart account validates → session created → requests metered → usage recorded → settlement per verified design → unused funds released/refunded). Distinguish offchain accounting from onchain settlement; never present a database record as a blockchain payment.

## 5. Provider economics

Providers register an endpoint, publish models, set pricing and capacity, receive requests, track completed requests/tokens/revenue, update health. Platform may charge a small routing fee. Providers keep control of their infrastructure and upstream credentials; never store provider upstream keys in plaintext. Endpoint validation + SSRF protection: reject localhost, private ranges and cloud metadata targets.

## 6. Interface

Premium infrastructure dashboard: dark, black/charcoal, amber/orange accent, clean typography, dense-but-readable technical data, subtle borders, strong spacing, quality charts, responsive. Avoid generic AI-landing templates.

Pages: Landing (CTA: *Explore Network*, *Start Building*) · Explore Models (filters: category, provider, price, capability, availability) · Model details (compare providers; pick routing prefs) · Chat Playground (model/provider/auto-routing/strategy/streaming/tokens/cost/latency/provider/payment status) · Provider marketplace · Provider dashboard · Wallet & payments · Privacy Center · Developer dashboard (keys, docs, volume, tokens, cost, latency, errors, history).

## 7. Stack

Use the existing repo stack; don't rewrite working code. Next.js/React/TS/Tailwind, wagmi + viem; Node/TS backend (Next route handlers acceptable), PostgreSQL (lightweight store acceptable for the hackathon), SSE streaming; Solidity + Foundry + viem; the actual devnet. Inference: investigate Groq, Together, Fireworks, DeepSeek; Ollama/vLLM for self-hosted. At least **two genuinely independent endpoints**. Never use OpenRouter as the only upstream.

## 8. Database (propose)

`users, wallets, api_keys, providers, provider_manifests, models, provider_models, provider_health, inference_requests, routing_decisions, usage_records, payment_sessions, payment_policies, payments` with indexes/relationships. Hash API keys; never store wallet private keys; protect provider credentials; avoid storing full prompts; minimise personal data; authenticate/authorise provider and user dashboards.

## 9. API

Public: `/v1/models, /v1/chat/completions, /v1/providers, /v1/providers/:id, /v1/usage`. Provider: `POST /api/v1/providers/register`, `PATCH /api/v1/providers/:id`, `GET /api/v1/providers/:id`, `/health`, `/stats`. Routing: `POST /api/v1/routing/preview`, `POST /api/v1/routing/quote`, `GET /api/v1/routing/history`. Payments: `GET /api/v1/payments/balance|history|policies`, `POST /api/v1/payments/policies`, `GET /api/v1/payments/:id`. Privacy: server-side info only; browser Anon-RPC metrics stay in the browser or go through an explicitly designed telemetry channel — no backend API pretending to know browser worker state.

## 10. What wins

(A) A real product: an API request really returns a response from an independent provider. (B) Deep integration of Anon-RPC and Frame Txs in real workflows. (C) A compelling demo a judge understands in minutes. Centre of the presentation: marketplace → pick model → router compares → selects by strategy → request → response with real cost/latency/provider → registry/payment reads through Anon-RPC → configure spending policy → Frame Tx through the Alt Mempool → valid op succeeds → policy-violating op rejected.

## 11. Priorities

**P0:** OpenAI-compatible endpoint; two real independent providers; model discovery; provider selection; working router; real usage/latency tracking; actual Anon-RPC; actual Frame Tx; Alt-Mempool submission; programmable spending policy; end-to-end demo. **P1:** provider registration/dashboard, marketplace, routing preview, streaming, API-key management, payment history, Privacy Center. **P2:** Nostr, reputation, advanced routing, more providers, analytics, embeddings, agent SDK, public onboarding.

## 12. Research to do first

Anon-RPC (install, init, worker config, chains, request API, errors, real anonymisation, limits); EIP-8141 and the actual devnet (network, RPC, chain ID, tx format, submission, validation, gas, state access, contracts, example txs); Routstr docs + protocol (discovery, routing, API, pricing, payments); provider docs (Groq, Together, Fireworks, DeepSeek).

## 13. Strict rules

1 Never invent package methods. 2 …contract addresses. 3 …RPC methods. 4 …devnet capabilities. 5 Never fake Anon-RPC metrics. 6 …a Frame Tx. 7 Never claim an onchain payment when only a DB record changed. 8 Never label a centralised aggregator as an independent provider. 9 Never show fake latency/availability as real. 10 Never silently switch models. 11 Never expose API keys/wallet secrets. 12 Never silently bypass the anonymising worker. 13 No buttons that do nothing. 14 Never sacrifice a working end-to-end flow for UI complexity. If a feature is blocked: explain the blocker and propose the smallest truthful alternative.

## 14. First tasks

1 Repository audit. 2 Technical research. 3 Feasibility report (verified, unverified, blockers, credentials, infrastructure, devnet functionality, approach). 4 Final architecture (diagram, frontend, backend, provider adapters, DB schema, contracts, payment lifecycle, Anon-RPC lifecycle, Frame-Tx lifecycle, API contracts). 5 Milestone plan (files, deps, details, acceptance criteria, tests, expected output). 6 Build: smallest complete flow first — prove the backend routes a real request between independent providers, then Anon-RPC and Frame Txs, then the polished frontend. Not the landing page first.

## 15. Standard

Feels like a real developer infrastructure platform. A judge can: understand it immediately; explore the marketplace; see independent providers; test the unified API; observe a real routing decision; verify Anon-RPC activity; configure a spending policy; observe a real Frame Tx; see a valid and an invalid payment operation.

## 16. Five questions to prove before frontend work

| Question | Strong answer |
|---|---|
| Can it route real inference? | Two independent providers, same API |
| Is discovery genuinely decentralised? | Wallet-verified providers and signed manifests |
| Does Anon-RPC actually work? | Verified anonymising worker handling real reads |
| Does the Frame Tx actually work? | Real devnet tx through the Alternative Mempool |
| Why does the alt mempool matter? | A policy-validation use case that needs its capabilities |

## 17. Strongest product recommendation — **ROUTIQ Agent Vault**

An AI agent may use inference services but never gets unrestricted access to the user's wallet: e.g. $5 daily inference budget, $0.10 max per request, approved providers only, enforced by smart-account validation, rejected when the agent exceeds its authority. Story: *give AI agents the ability to spend money without giving them unlimited control over money.* A far stronger reason to use Frame Txs than "we accept crypto payments."
