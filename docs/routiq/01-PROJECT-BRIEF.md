# ROUTIQ — Complete Project Vision & Technical Handoff

> **Pivot note:** the project changed from *StealthRadar* (ERC-5564 stealth-payment inbox, preserved in git history up to `fd3ff0d`) to **ROUTIQ**. The earlier "AI agent wallet marketplace" idea is also dropped. This file is the handoff; `02-TECHNICAL-SPEC.md` is the addendum; `03-VERIFIED-FINDINGS.md` records what was verified against the real devnet/packages; `04-IMPLEMENTATION-PLAN.md` is the plan we execute.

## 1. Project overview

**Name:** ROUTIQ
**Tagline:** The Decentralised Private AI Router.
**Positioning:** A decentralised, privacy-first alternative to OpenRouter, inspired by Routstr.

ROUTIQ is a decentralised AI inference routing network that connects developers to independent AI model providers through a single OpenAI-compatible API, combining privacy-preserving blockchain access (Anon-RPC) with programmable Ethereum payments (Frame Transactions / Alternative Mempool).

## 2. The direction change

We are **not** building an AI-agent wallet marketplace as the primary product. We are building a decentralised private AI router, similar in UX to OpenRouter and inspired by Routstr's permissionless infrastructure.

Developer promise: one API endpoint; many models; multiple independent providers; automatic model/provider routing; pay-per-request; no dependence on one centralised gateway; privacy-preserving blockchain interactions; programmable onchain payments. Autonomous agents may be clients, but are not the positioning.

## 3. Inspiration

- **OpenRouter:** unified OpenAI-compatible API, model discovery, provider selection, pricing comparison, fallback/routing, simple DX. Developers should switch only the base URL.
- **Routstr** (https://routstr.com/): permissionless inference marketplace; independent providers; discovery via Nostr; OpenAI-compatible API; pay-per-request over Lightning/Cashu; `routstrd` local daemon. We take the *concept*, build our own Ethereum-native, privacy-first architecture, and do not copy its branding or assume its Bitcoin/Cashu design maps to Ethereum.

## 4. Problems

1. Centralised AI gateways control access, routing, billing.
2. Fragmented providers: many keys, billing systems, rate limits, pricing.
3. Independent providers lack distribution.
4. Blockchain access exposes user activity: ordinary RPC providers can link IP to repeated registry/payment queries.
5. Payments aren't programmable enough for frequent small payments; we want smart-account spending policies.

## 5. Solution — three pillars

**Pillar 1 — Decentralised inference.** Providers publish identity, models, capabilities, input/output pricing, context window, endpoint/API compatibility, availability, performance, reputation. The router picks by requested model, price, latency, availability, reputation and user preferences.

**Pillar 2 — Privacy through Anon-RPC.** Use the official `@anon-rpc/browser-harness` for Ethereum reads: provider registry, reputation, registration status, onchain pricing/model refs, smart-account balances, payment status, receipts, settlement verification. Route reads through the Anon-RPC worker, never silently direct. **Do not claim complete anonymity.** Anon-RPC does *not* hide public chain data, wallet addresses, amounts, timing, AI prompts, requests to inference providers, or the provider's identity. A passthrough worker is not anonymising. On worker failure: error, or require an explicit opt-in direct mode. MVP uses the browser harness; the extension harness is optional.

**Pillar 3 — Programmable Ethereum payments.** Track: *Best Use of the Frame Transaction Alternative Mempool* (EIP-8141, ERC-8421, ERC-7562-style staking/reputation). The account's own code decides validity. Policies: max per request, daily quota, provider allowlist, model limits, ERC-20 payments, sponsored gas via paymaster. We must implement **actual** Frame Transactions and **actual** Alternative Mempool admission — never a normal tx dressed up. Verify encoding, structure, keyed nonces, recent roots, account validation, mempool endpoint, admission rules, staking/reputation, paymaster compatibility, execution/settlement. If unsupported, do not fake; build the strongest supported end-to-end path.

## 6. Architecture components

A. **Developer API gateway** — OpenAI-compatible `/v1/models`, `/v1/chat/completions` (streaming, usage, errors). Chat completions is the MVP priority.
B. **Model & provider registry** — onchain: registration, identity/key, payment permissions, reputation refs, settlement info. Offchain: model descriptions, context windows, detailed pricing, health, latency, rich metadata.
C. **Intelligent router** — deterministic, transparent, configurable scoring (e.g. 40% cost, 30% latency, 20% availability, 10% reputation). No invented reputation/latency; label demo data.
D. **Inference providers** — at least 2–3 *working* endpoints; routing must genuinely choose between different endpoints.
E. **Payment & settlement** — smart account validates payments with a real Frame Transaction through the Alt Mempool; explicit reservation/authorisation/settlement so there is no unlimited unpaid inference.

## 7. User workflow (demo)

Explore models → connect wallet / smart account + policies → pick model or auto-route → prompt → provider discovery (reads via Anon-RPC) → router selects → payment authorisation (real Frame Tx via Alt Mempool) → inference → response with model, provider, tokens, cost, latency, payment tx, routing details.

## 8. Screens

Explore · Chat · Providers · Wallet & Payments · Privacy Center · Developer Dashboard. (Premium dark developer-tool look; avoid generic crypto dashboard.)

## 9. Prize tracks

1. **Best Use of Anon-RPC** ($5k pool): meaningful, visible usage; all appropriate reads through the harness; Privacy Center; show query → harness → anonymising network → result; no silent direct RPC.
2. **Best Use of the Frame Transaction Alternative Mempool** ($5k pool): programmable inference spending accounts (daily budget, per-request max, approved providers/models) enforced during frame-tx validation, submitted through the real Alt Mempool, showing a capability that genuinely needs it (flexible state access / complex validation). Investigate ERC-20 paymaster and daily-quota support; do not assume.

## 10. Stack

Next.js, TypeScript, Tailwind, shadcn/ui, Lucide, wagmi + viem, React Query · Node API (Next routes) · Solidity + Foundry · Anon-RPC browser harness · PostgreSQL or lightweight DB (hackathon: lightweight) · OpenAI-compatible provider adapters. Keep secrets server-side; never store private keys or API credentials in plaintext.

## 11. MVP priorities

**P0:** polished frontend; model marketplace; ≥2 working providers; OpenAI-compatible endpoint; real routing; Anon-RPC integration with a real anonymising worker; working Frame Tx flow; Alt Mempool submission; programmable payment validation; end-to-end demo.
**P1:** provider registration/onboarding; price comparison; auto selection; streaming chat; usage tracking; wallet/payment dashboard; Privacy Center; developer docs.
**P2:** extension, advanced routing, multi-token, reputation, analytics, team billing, fallback, staking.

## 12. Demo script (~3 min)

Developer sees multiple models → connects wallet, sets a budget → auto-routing, prompt "Analyse this Solidity contract for vulnerabilities" → registry read via Anon-RPC → router compares → picks provider → smart account validates policy → Frame Tx to Alt Mempool → payment executes → response streams with provider/model/usage/price/tx → **then** exceed the spending limit and show rejection → Privacy Center shows Anon-RPC routing.

## 13. Differentiation

OpenRouter-style DX + Routstr-inspired permissionless providers + Anon-RPC private Ethereum reads + Ethereum-native programmable payment authorisation + competing independent providers. Do not claim OpenRouter lacks routing or Routstr lacks decentralised inference.

## 14. Principles

No fake demo (every button works; every provider is a real adapter or clearly labelled demo; real routing; real payments; real Anon-RPC; real Frame Txs; no fabricated hashes/metrics). Verify official specs before implementing. Keep modules separate: frontend, gateway, adapters, router, Anon-RPC client, smart account, payments, registry. Be honest about privacy (Anon-RPC is not prompt encryption).

## 15. Pitch

*ROUTIQ — The Decentralised Private AI Router.* A privacy-first, permissionless alternative to OpenRouter: one OpenAI-compatible API over independent providers, Anon-RPC for private blockchain access and Frame Transactions for programmable payments. "Our vision is to make AI inference open, permissionless and privacy-preserving."

## 16. First tasks (from the handoff)

Understand the pivot; inspect the Anon-RPC integration; inspect the Frame Tx / Alt Mempool devnet; define the minimum architecture that genuinely supports both tracks; decide what is end-to-end feasible; list blockers; propose contracts, backend/adapters, schema and roadmap. Get Anon-RPC and Frame Tx devnet integrations working **early** — they are the biggest risks and the core of the submission.
