# ROUTIQ — MASTER CODING EXECUTION PROMPT

You are responsible for implementing ROUTIQ as a complete, functional Web3 + AI infrastructure product. Do not just plan: inspect the repository, decide, write code, integrate, test and fix. Work like a senior full-stack engineer.

## 1. Objective

A functional decentralised AI inference router with: OpenAI-compatible API · multiple independent providers · intelligent routing · provider marketplace · Anon-RPC · Frame Transactions · Alt-Mempool submission · programmable inference spending policies · developer, provider and privacy dashboards. Every important feature is connected to real functionality; no static demo data pretending the product works.

## 2. First: repository audit

Inspect all directories/files, framework, dependencies, `package.json`, API routes, contracts, wallet/blockchain integrations, UI components, env vars; run the app; identify errors. Create **`docs/IMPLEMENTATION_AUDIT.md`**: what works, what is incomplete, what needs implementing. Don't delete/rewrite working code without reason.

## 3. Suggested structure (adapt to the repo; do not duplicate)

`apps/web` (pages: playground, models, providers, dashboard, wallet, privacy, developer), `apps/api` (routes, services, providers, router, middleware, database), `packages/{shared, provider-sdk, anon-rpc, frame-transactions}`, `contracts/`, `docs/`, `tests/`.

## 4. Inference router first

```ts
interface InferenceProvider {
  id: string; name: string;
  getModels(): Promise<Model[]>;
  chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  healthCheck(): Promise<ProviderHealth>;
}
```

≥2 real independent providers (suggested Groq, Together, Fireworks) via official APIs and env-supplied credentials (never hardcoded). Implement registration, configuration, model discovery, request/response normalisation, streaming, timeouts, errors, token usage, latency. `POST /v1/chat/completions` must work with the official OpenAI SDK.

## 5. Routing strategies

```ts
interface RoutingRequest { model: string; strategy: "cheapest"|"fastest"|"balanced"; preferredProvider?: string }
interface RoutingResult { selectedProvider: string; model: string; strategy: string; reason: string; alternatives: string[] }
```

Cheapest by real pricing; fastest by measured latency; balanced by multiple metrics; exclude unhealthy; same-model fallback; record decisions; explain every decision; **unit tests**; no random selection.

## 6. Provider marketplace

Provider: unique ID, wallet address, endpoint, models, pricing, capabilities, health, signed manifest, registration status. **Ownership verified by wallet signature.** Provider dashboard to update metadata and inspect inference activity. Use onchain registry commitments only after deployment/contract design are verified.

## 7. Anon-RPC

Read the official harness docs first. Dedicated module; all supported frontend Ethereum reads through the real worker; reusable hooks (`usePrivateProviderRegistry`, `usePrivatePaymentPolicy`, `usePrivateAccountBalance`, `useAnonRpcStatus` — application-level names, adapt to the real SDK). Real initialisation, routing, chain config, error handling; **no silent direct fallback**; real metrics; privacy indicator; Privacy Center page. Count a request as anonymised only if the worker actually handled it. Keep backend RPC traffic separate from browser-worker metrics.

## 8. Frame Transactions

Inspect the exact devnet and Alt-Mempool docs first. A module for smart-account connection, spending-policy configuration, Frame-Tx construction, signing, Alt-Mempool submission, status tracking, execution verification, rejection handling. No assumed formats; no ordinary-tx substitutes. Policy: max per request, daily limit, total budget, approved providers, approved token, expiry — only what the devnet really supports. Tests for allowed and rejected spending.

## 9. Payment sessions

Authorise budget → smart account validates policy → session created → requests processed → usage measured → usage records stored → settlement via the verified design → unused funds handled. Avoid one onchain tx per small request unless justified. Separate authorisation, usage accounting, settlement, refunds. Never call offchain accounting confirmed settlement.

## 10. Frontend (after the core works)

Dark premium infrastructure aesthetic, black/charcoal, amber/orange accent, minimal, technical data viz, responsive, subtle motion. Pages: Landing, Model marketplace, Model detail, Chat playground, Provider marketplace, Provider dashboard, Wallet & payments, Privacy Center, Developer dashboard. Every button does a real action; every metric is real or clearly labelled sample.

## 11. Developer experience

API key creation/revocation, API docs, OpenAI SDK + cURL examples, usage analytics, request logs, error logs, routing explanations. Usable by an external developer, not only via our chat UI.

## 12. Tests

**Inference:** valid model, invalid model, provider timeout, provider failure, fallback, token usage, streaming. **Routing:** cheapest, fastest, balanced, unhealthy exclusion, same-model fallback. **Provider registration:** valid signature, invalid signature, duplicate registration, manifest modification. **Anon-RPC:** worker init, successful read, failed read, fail-closed, no misleading metrics. **Frame Tx:** valid policy, invalid policy, allowed payment, exceeded per-request limit, exceeded daily quota, Alt-Mempool submission, execution/rejection verification.

## 13. Environment

`.env.example` with all required variables (DATABASE_URL, GROQ_API_KEY, TOGETHER_API_KEY, FIREWORKS_API_KEY, NEXT_PUBLIC_CHAIN_ID, NEXT_PUBLIC_RPC_URL, ANON_RPC_CONFIG, WALLETCONNECT_PROJECT_ID …) — add only what verified integrations need. Never commit credentials.

## 14. Documentation

`README.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/ANON_RPC.md`, `docs/FRAME_TRANSACTIONS.md`, `docs/PROVIDER_INTEGRATION.md`, `docs/DEPLOYMENT.md`, `docs/DEMO_SCRIPT.md`. Document the actual implementation, not aspirations.

## 15. Workflow

Per milestone: run the app → run tests → fix TS errors → fix lint → verify functionality → update docs → summarise → list blockers. Do not advance while core functionality is broken.

## 16. Acceptance (demo-ready only when)

A developer can call the OpenAI-compatible API · ≥2 independent providers serve inference · the router makes a real selection · latency and usage are measured · provider registration works · Anon-RPC handles real Ethereum reads · Privacy Center shows verified metrics · a real Frame Tx goes through the Alt Mempool · spending policies allow and reject operations · the frontend shows real backend and chain state · the whole demo works start to finish.

## Extra instructions to paste if the work drifts

1. **Architecture decisions:** compare ≥2 approaches per major decision (complexity, hackathon feasibility, scalability), choose, explain trade-offs briefly.
2. **No fakes:** "I would rather have 3 fully working features than 15 fake features." No mock data as proof of integration; label unavailable services; never simulate a successful blockchain tx.
3. **Final demo:** a reproducible end-to-end demo from a clean browser session: setup, credentials, wallet preparation, test transactions, expected outputs, failure scenarios; testable by a judge.
