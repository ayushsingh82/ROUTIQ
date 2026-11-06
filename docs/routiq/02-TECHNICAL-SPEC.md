# ROUTIQ — Product Features, APIs & Complete Technical Architecture

**Project:** ROUTIQ · **Category:** Decentralised Private AI Router · **Targets:** Best Use of Anon-RPC; Best Use of Frame Transaction Alternative Mempool.

Two planes, kept separate:
- **Inference plane:** discovers providers, routes prompts, streams responses.
- **Settlement & privacy plane:** Anon-RPC for Ethereum reads; Frame Transactions for programmable payment authorisation.

Design stance: Ethereum is the source of provider identity and payment-policy truth; frequently changing model info lives in signed offchain manifests; Anon-RPC gives private access to Ethereum state. Routstr's protocol splits discovery, pricing, routing, auditing, payments and marketplace into separate specs — follow that modular approach.

---

# PART 1 — What we are building

One OpenAI-compatible API over many independent providers. ROUTIQ handles model discovery, provider discovery, comparison, automatic routing, health monitoring, cost estimation, usage metering, payment authorisation, settlement and private Ethereum access. **One API. Every AI model. Independent providers. Private blockchain access. Programmable payments.** Infrastructure, not a chatbot.

# PART 2 — Features

## F1 Unified AI API gateway (most important)

```ts
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.ROUTIQ_API_KEY, baseURL: "https://api.routiq.xyz/v1" });
const r = await client.chat.completions.create({ model: "deepseek-v4", messages: [{ role: "user", content: "Explain Ethereum account abstraction." }] });
```

| Endpoint | Purpose | Priority |
|---|---|---|
| `GET /v1/models` | list models | P0 |
| `POST /v1/chat/completions` | responses (streaming) | P0 |
| `GET /v1/providers` | list providers | P0 |
| `GET /v1/providers/{id}` | provider info | P0 |
| `POST /v1/embeddings` | embeddings | P1 |
| `GET /v1/usage` | usage | P1 |
| `POST /v1/responses` | Responses API | P2 |

Return standard OpenAI structures incl. usage. Core flow before breadth.

## F2 Model marketplace

Search, filter by category (general, coding, reasoning, vision, embedding, image, open-source), compare price/context/providers/capabilities/availability, pick a provider, enable auto-routing. **Only show models that have a real configured adapter.** Card: name, id, provider count, input/output price per 1M tokens, context window, features, availability, measured latency, last updated. (Prices in demos are illustrative, not live quotes.)

## F3 Independent provider marketplace

Provider flow: connect wallet → register identity → submit endpoint manifest → list models → set pricing → configure request types → publish availability → receive traffic.

```ts
interface ProviderManifest {
  providerId: string; name: string; walletAddress: string; endpoint: string;
  models: string[]; inputPrice: number; outputPrice: number; contextWindow?: number;
  capabilities: string[]; status: "active" | "inactive"; manifestURI?: string; updatedAt: number;
}
```

Provider dashboard: registered models, requests, tokens, revenue, latency, success rate, settlement status, pricing. MVP may restrict onboarding to configured endpoints, but the architecture must support permissionless registration.

## F4 Intelligent router

Eligibility: model compatibility, availability, input/output price, latency, reliability, reputation, user preferences. Modes: **cheapest**, **fastest**, **balanced**:

```
score = costScore*0.40 + latencyScore*0.30 + availabilityScore*0.20 + reputationScore*0.10   // weights configurable
```

No fabricated reputation/latency (label simulated). **Fallback:** if the chosen provider fails → find another provider for the *same* model → check the user permits fallback → verify its cost → route → record the event. **Never silently switch models** when a specific model was requested.

## F5 Private AI chat

Demonstration client for the same API: model/provider selectors, auto-routing toggle, cheapest/fastest/balanced, streaming, tokens, cost, provider used, latency, tx details, history. Not the primary product.

## F6 Privacy Center (Anon-RPC)

Reads to protect: provider registration, reputation, registry status, payment policies, smart-account balance, payment verification, contract reads. Show: status, active worker, anonymising network, total/successful/failed requests, direct requests, whether direct fallback is disabled, last success, supported network. **Count only successful requests through a genuine anonymising worker.**

Requirements: official `@anon-rpc/browser-harness`; verify the current API; centralise the transport; no hidden direct RPC in libraries; fail closed; explicit opt-in for direct only if essential; never present a passthrough worker as anonymous. The harness protects the **read path** under its threat model; it does not encrypt prompts or hide requests from providers. The extension harness is optional and out of MVP.

# PART 3 — Frame Transaction payment system

## F7 Programmable AI spending wallet

Example: fund 10 USDC; ≤1 USDC/request; ≤10 USDC/day; approved providers; approved payment contracts; optional per-model limits. Policies: per-request cap, daily quota, provider allowlist, max total, approved token, optional expiry. Prioritise policies that demonstrate meaningful Alt-Mempool capability (state access).

## F8 Frame Transaction execution

EIP-8141 + ERC-8421 + the hackathon's real devnet. The account validates the signature, checks policy, recipient and quota, approves payment, executes. A second tx exceeding the limit must be **rejected**. Economics: do not submit one onchain tx per tiny request. Use a session/prefunded model: authorise an allowance via a Frame Tx → reserve budget → meter requests → record usage → settle in batches → account enforces aggregate quota. Implement the simplest version the devnet supports, but a **real** Frame Tx must be demonstrated. An offchain record is not an onchain settlement.

# PART 4 — API architecture

**A. Public OpenAI-compatible API** `/v1`: `/models`, `/chat/completions`, `/embeddings`, `/providers`, `/providers/{id}`, `/usage`. Auth: scoped API keys, hashed at rest, revocable, usage-limited; wallet-authenticated ephemeral credentials for the chat demo. Never expose upstream keys; never store wallet keys. The gateway **can** see prompts — do not claim gateway anonymity.

**B. Marketplace API** `/api/v1`:
- Models: `GET /models`, `/models/{id}`, `/models/{id}/providers`, `/models/categories`
- Providers: `GET /providers`, `/providers/{id}`, `POST /providers/register`, `PATCH /providers/{id}`, `GET /providers/{id}/models|health|stats` (registration/modification needs signature verification)
- Routing: `POST /routing/preview` (explain choice), `POST /routing/quote`, `GET /routing/strategies`, `GET /routing/history`
- Payments: `GET /payments/balance|history|policies`, `POST /payments/authorize|settle|policies`, `GET /payments/{id}` (proposed app APIs, not protocol methods)
- Privacy: `GET /privacy/status|metrics|config` (browser-side worker state is browser-side; do not create a backend endpoint that falsely reports it)
- Developer: `GET/POST /developer/keys`, `DELETE /developer/keys/{id}`, `GET /developer/usage|logs`

**C. Provider inference API:** OpenAI-compatible `POST /v1/chat/completions`, `GET /v1/models`, `GET /health`, normalised by provider adapters.

# PART 5 — External APIs

Provider abstraction first. Candidates: OpenAI, Anthropic, Gemini, Groq, Together AI, Fireworks, DeepSeek, Ollama (self-hosted), vLLM (self-hosted). **MVP: three actual providers** (suggested Groq, Together AI, one OpenAI-compatible self-hosted/alternative). Do **not** use OpenRouter as the sole upstream (OpenRouter adapter only for testing, labelled as an aggregator). Blockchain: viem, wagmi, Foundry, Solidity, Anon-RPC harness, the hackathon devnet RPC/mempool. SDK: official OpenAI Node SDK; SSE for streaming. Infra: PostgreSQL (providers, models, usage, payments), Redis optional, Next.js + Node, Docker for providers.

# PART 6 — Smart contracts (keep minimal)

1. **ProviderRegistry.sol** — register provider, update manifest reference/hash, status, identity, events. Store identity + manifest commitment, **not** model lists/prices.
   ```solidity
   struct Provider { address operator; string manifestURI; bytes32 manifestHash; bool active; uint64 updatedAt; }
   event ProviderRegistered(bytes32 indexed providerId, address indexed operator, string manifestURI);
   event ProviderUpdated(bytes32 indexed providerId, bytes32 manifestHash);
   event ProviderStatusChanged(bytes32 indexed providerId, bool active);
   ```
2. **ProviderReputation.sol** — optional; never let a provider self-assign perfect reputation.
3. **InferencePayment.sol** — deposit, session allowance, spending limits, provider authorisation, batch settlement, refunds, events. Lifecycle `CREATED → AUTHORIZED → INFERENCE_REQUESTED → COMPLETED → SETTLED` (+ failure/refund states). An API response is not proof of settlement.
4. **Smart account / treasury** — Frame Tx validation + programmable spending (daily quota, per-request cap, approved providers/token, expiry, recipient restrictions). Must follow the devnet's real EIP-8141 implementation; no custom tx format.

# PART 7 — Discovery

Hybrid: Ethereum registry = canonical identity; signed offchain manifests = model/endpoint metadata; optional Nostr announcements; Anon-RPC = private access to registry state. Manifest example: `{providerId, name, wallet, endpoint, models:[{id,inputPrice,outputPrice,contextWindow}], capabilities, updatedAt}`; provider signs the manifest/hash. App flow: discover via Ethereum → read through Anon-RPC → fetch manifest → verify signature+hash → check live health → eligible for routing. Nostr is an optional adapter, only if it solves a real problem.

# PART 8 — System architecture

Developers/Users → OpenAI-compatible SDK → **ROUTIQ API** → (Model service, Auth/API-key service, Provider service) → **Routing engine** (price engine + health engine → provider selector) → **Payment authorisation** (smart-account validation + payment service) → **Frame Transaction** → **Alternative Mempool** → Ethereum devnet (payment/registry). Independent Providers A/B/C → inference response → ROUTIQ API → developer. **Blockchain read path:** browser → Anon-RPC browser harness → anonymising worker/network → Ethereum RPC/contract reads. Logical services only; combine into few apps for the hackathon but keep code modular.

# PART 9 — Data model (offchain)

Tables: `providers`, `models`, `provider_models`, `users`, `api_keys`, `inference_requests`, `payment_sessions`, `payments`, `provider_health`, `provider_reputation`, `usage_records` (fields as in the handoff: ids, addresses, endpoint, manifest uri/hash, status, prices, latency, success rate, token counts, costs, tx hashes, timestamps). No wallet private keys or upstream API keys in tables.

# PART 10 — Request lifecycle

1 request → 2 API key validated → 3 validation + model lookup → 4 eligible providers → 5 metadata/availability → 6 price quote → 7 payment policy check → 8 smart account/session authorisation → 9 provider receives request → 10 inference → 11 usage measured → 12 settlement per the authorised model → 13 response → 14 usage/tx history updated. MVP: prefunded/reserved budget so no unpaid inference; define policy for failed/interrupted/partial streams.

# PART 11 — Frontend pages

Landing · Explore models · Model details · Chat · Providers · Provider dashboard · Wallet & payments · Privacy Center · Developer dashboard.

# PART 12 — Roadmap

1. **Core marketplace:** app, landing, marketplace, provider model, adapters, OpenAI-compatible chat, ≥2 real providers. 2. **Routing:** health, pricing, strategies, fallback, usage, comparison. 3. **Anon-RPC:** inspect package, integrate harness, real anonymising network, centralised reads, registry reads, metrics, worker-failure test, no silent fallback. 4. **Frame Txs:** inspect devnet, correct encoding, account validation, quota, provider restrictions, real Alt-Mempool submission, success + rejection tests. 5. **Integration:** selection → authorisation, usage → settlement, provider/tx display, failure handling, dashboard metrics, full demo test.

# PART 13 — Judging strategy

**Anon-RPC:** registry read → Anon-RPC transport → real anonymising worker → returned provider data → Privacy Center metrics → worker failure + fail-closed. Not just the npm install. **Alt Mempool:** account with policy → valid payment → frame tx construction → Alt-Mempool submission → admission + execution → over-limit request → rejection; explain why a normal tx cannot do this (flexible state access / quota validation).

# PART 14 — Security & privacy (mandatory)

**API:** hashed keys, rate limits, secret upstream creds, validated model ids and manifests, SSRF protection, size/time limits. **Payments:** validate amounts and provider identity, prevent replay, check expiry and quota, safe nonces, handle failed settlement, avoid duplicates, never trust frontend usage values. **Privacy:** Anon-RPC for the intended read path, no silent direct fallback, no private keys exposed, don't log full prompts by default, tell users what providers can see, no anonymity claims, no prompt-encryption claims. **Providers:** verify manifests + signatures, restrict protocols, block private IPs/cloud metadata in registration and health checks, timeouts, validate returned usage, don't trust provider-reported prices/token counts blindly.

# PART 15 — Final product definition

Unified API · model marketplace · provider network · routing engine · Anon-RPC · smart accounts · Frame Transactions · Alternative Mempool · settlement. *Open, permissionless, privacy-preserving AI inference.*

# PART 16 — Instructions

Lead architect + full-stack engineer. Do not revert to an agent marketplace. Before implementing: inspect Routstr docs/protocol, the Anon-RPC harness and the real devnet; verify every API/package version; identify blockers; propose architecture, API contract, contract interfaces, payment lifecycle, phased plan. Do not invent RPC methods, package APIs, addresses or tx formats; do not fake Anon-RPC privacy or Frame Tx execution; no nonfunctional controls; do not build everything at once. Smallest working product that proves: (1) OpenAI-compatible endpoint works; (2) router selects between multiple actual providers; (3) Ethereum reads go through genuine Anon-RPC; (4) a smart account enforces a spending policy through a real Frame Tx via the Alt Mempool. Then expand.

## Recommended decisions

| Area | Choice |
|---|---|
| Frontend | Next.js + TypeScript + Tailwind |
| API | Node + OpenAI SDK compatibility |
| Providers | Groq + Together AI + one independent provider |
| Routing | cost / latency / reliability scoring |
| Discovery | Ethereum registry + signed offchain manifests (+ optional Nostr) |
| Chain | Solidity + Foundry + viem |
| Privacy | Anon-RPC browser harness |
| Payments | Smart account + Frame Txs; prefunded session budget + batch settlement |
| DB | PostgreSQL (hackathon: lightweight) |
| Realtime | SSE |

Key decisions: (1) not all model info onchain; (2) not every inference request an Ethereum tx; (3) don't rely on the browser harness for backend privacy — keep privacy-sensitive reads in the browser and separate backend-originated from user-originated reads; (4) don't use OpenRouter as the only upstream; (5) the OpenAI-compatible API is the centre of the product.

References: https://docs.routstr.com/ · https://docs.routstr.com/api/endpoints/ · https://github.com/routstr/protocol · https://docs.routstr.com/provider/discovery/ · https://eips.ethereum.org/EIPS/eip-8141 · https://ethereum.github.io/anon-rpc/
