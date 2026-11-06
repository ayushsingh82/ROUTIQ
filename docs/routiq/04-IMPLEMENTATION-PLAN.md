# ROUTIQ — Implementation Plan

Companion to `01-PROJECT-BRIEF.md`, `02-TECHNICAL-SPEC.md`, `03-VERIFIED-FINDINGS.md`, `05-PITCH.md`.
Repository root = the Next.js app; all markdown in `docs/`. StealthRadar is preserved in git history (`fd3ff0d`).

## 1. Architecture decisions (and why)

| Decision | Choice | Reason |
|---|---|---|
| Two planes | Inference plane (server) vs settlement/privacy plane (browser) | Anon-RPC is browser-only; backend reads can't be private. Keep and label both |
| Gateway | Next.js route handlers under `/api/v1` (OpenAI-compatible) | One deployable; OpenAI SDK works by changing `baseURL` |
| Providers | `ProviderAdapter` interface; one generic **OpenAI-compatible adapter** (Ollama, vLLM, Groq, Together, DeepSeek all speak it) | Smallest code that supports real independent endpoints |
| Real providers available now | Local **Ollama** (`smollm2:135m`). Groq/Together/others activate when API keys are present in env | No keys were provided; we do not fake providers |
| Independent-operator story | A **reference provider node** (tiny OpenAI-compatible server with its own price manifest + wallet) can be run on multiple ports, labelled *reference provider*, proxying to a local model | Shows real routing between distinct endpoints without pretending they are different companies |
| Router | Deterministic weighted scoring (cost 0.40, latency 0.30, availability 0.20, reputation 0.10; configurable), modes cheapest/fastest/balanced; fallback only to another provider of the **same model**, only when the policy allows | Spec F4 |
| Health/latency/reputation | Measured by real probes and real requests; reputation only from onchain/verifiable sources, else neutral and labelled | No invented numbers |
| Persistence | JSON file under `.data/` (gitignored) for keys-hash/usage/health; swap for Postgres later | Hackathon scope, disk-constrained |
| Auth | Hashed API keys (sha256), revocable, per-key rate limit; creation endpoint | Spec Part 14 |
| SSRF | Provider endpoints validated: https/http only, no private/link-local/metadata IPs; loopback allowed only for explicitly flagged local providers; timeouts + size limits | Spec Part 14 |
| Chain | Devnet **1337** for ProviderRegistry + payments; Anon-RPC retargeted from Sepolia to the devnet RPC | Frame Txs only exist there |
| Registry | `ProviderRegistry.sol`: operator, `manifestURI`, `manifestHash`, `active`, `updatedAt`; models/prices stay offchain in signed manifests | Spec Part 6 |
| Payments | `InferenceAccount` (VERIFY-frame smart account): owner sig via `SIGPARAM`; per-request cap + daily quota in its **own** storage; payee must be an active provider per **ProviderRegistry (external storage read ⇒ needs Alt Mempool + stake)**; SENDER frame `payProvider(providerId, amount)` updates counters; native ETH on devnet | Gives a real, defensible Alt-Mempool use |
| Session economics | Prefunded budget; meter requests offchain; **batch settlement** via Frame Tx; gateway refuses requests when the reserved budget is exhausted | Spec F8 |
| Wallet | Frame Txs are type 0x06 — MetaMask cannot sign them. The browser holds an *AI-spending key* (encrypted vault, reused from StealthRadar) that owns the `InferenceAccount`; user funds the account separately | Honest about wallet limits |

## 2. Phases and status

| # | Phase | Deliverable | Status |
|---|---|---|---|
| 0 | Docs + verification | `docs/routiq/01-05` | done |
| 1 | Core router | OpenAI-compatible `/models`, `/chat/completions` (stream), `/providers`; adapters; router + tests | **done** |
| 2 | Routing features | health probes, quotes/preview, fallback, usage ledger, API keys | **done** |
| 3 | Frontend pivot | ROUTIQ landing + console in the Confide visual language | **done** |
| 4 | Anon-RPC on the devnet | retarget transport to 1337; read the devnet in-browser through Nox; Privacy Center counters | **done** (registry read pending the contract) |
| 5 | ProviderRegistry | contract + deploy script (legacy tx, faucet-funded key) + seed with the live providers | next |
| 6 | Frame Tx payments | probe opcodes → `InferenceAccount` → stake → submit via Alt Mempool → rejected over-limit tx | **blocked on approval to install `@forshtat/hegota-support`** |
| 7 | Integration | selection → authorisation → settlement; wallet/payments page; end-to-end test | after 4–6 |

## 3. Honest scope rules

- Every provider shown has a real adapter and a real endpoint; local/reference providers are labelled.
- Prices are configured values (labelled), usage/cost are computed from provider-reported `usage` (flagged `estimated` when the provider omits it).
- Privacy claims limited to the Ethereum read path in the browser; gateway sees prompts; providers see prompts.
- No fabricated tx hashes; payment status comes from the devnet.

## 4. Risks (ordered)

1. Frame introspection opcodes unverified on devnet (see findings §1). 2. Devnet resets / faucet. 3. Nox exit → devnet RPC reachability. 4. Disk space. 5. Third-party package approval (hegota-support).
