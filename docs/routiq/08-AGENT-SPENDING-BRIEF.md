# ROUTIQ — MASTER HACKATHON PRODUCT & ENGINEERING EXECUTION BRIEF (Agent Spending Account)

> The product was previously called VeilRouter and is now **ROUTIQ**. This brief **sharpens the story**: ROUTIQ is an agent payment and execution layer. The OpenAI-compatible router built so far is its inference plane; the new centre of gravity is the **Agent Spending Account** (budget vault + ERC-20 paymaster + Frame Transactions + Anon-RPC reads). Where this brief and earlier docs differ, this brief wins.

## 1. Role

Founding CTO / senior protocol engineer / contract architect / full-stack engineer. Target Ethereum Foundation tracks at ETHGlobal Mumbai: **(1) Best Use of Anon-RPC, (2) Best Use of Frame Transactions / Alternative Mempool.** Both must work in the real app and be demonstrable. Inspect the repository first; preserve working code. Never invent APIs, addresses, tx formats, RPC methods, chain configs or protocol capabilities; verify against official docs and the actual devnet.

## 2. Product

**Name:** ROUTIQ · **Tagline:** One API. Every model. No single gatekeeper.
Privacy-aware AI inference and payment infrastructure that lets developers give autonomous AI agents **controlled access to paid inference** through programmable Ethereum spending policies.

Problem: agents need paid inference; unrestricted wallet or billing access is dangerous. ROUTIQ provides a unified OpenAI-compatible API; model discovery and routing; per-agent budgets; programmable USDC payment policies; ERC-20 gas sponsorship via a custom paymaster; Frame Transactions through the Alternative Mempool; Anon-RPC for private Ethereum reads; provider and usage monitoring. **Differentiator: the Agent Spending Account.**

Example policy (configurable, not hardcoded): agent budget $5 USDC; max $0.10/request; max $2/day; approved model Qwen; approved provider NEAR AI Cloud; gas sponsorship $1/day, ≤ $0.10 per tx; 24 h expiry.

## 3. Track A — Anon-RPC

Use `@anon-rpc/browser-harness` (https://ethereum.github.io/anon-rpc/, /wallets/, https://github.com/ethereum/anon-rpc). Before coding: read install docs, inspect real exports/API, worker config, integrity/hash requirements, anonymising network config, supported reads. Implement with real methods only.

Route eligible **frontend** reads through it by default: vault balances, agent session config, spending policy, daily quota state, paymaster config, provider registry, onchain model/provider metadata, tx receipts/status where supported.

Does **not**: hide wallet addresses in submitted txs, hide prompts from NEAR AI Cloud, anonymise backend RPC, anonymise tx submission, guarantee anonymity — never claim these. **Fail closed:** explicit error + retry; no silent direct fallback; any direct mode is explicit, labelled and consented.

**Privacy Center (real metrics only):** worker status, integrity status if exposed, transport, network/chain, successful anonymised reads, failed reads, direct reads, last successful read, RPC mode; bootstrap requests counted separately.

## 4. Track B — Frame Transactions + Alternative Mempool (most important)

Resources: https://eips.ethereum.org/EIPS/eip-8141 · https://docs.altmempool.wtf/ (+ /guides/quickstart/, /concepts/frame-transactions/, /guides/staking/) · https://altmempoolexplorer.forshtat.com/.

Core use case: an agent operates under account-enforced policy: approved agent, approved token, max tx expenditure, daily quota, session expiry, approved operations, paymaster sponsorship limits. Real Frame Txs through the Alt Mempool — never ordinary txs relabelled.

**Research first → `docs/DEVNET_RESEARCH.md`** (exact verified config + source links): chain ID, RPC URL, Alt-Mempool submission endpoint, tx encoding, validation frames, execution frames, paymaster interfaces, deployed contracts + test tokens, admission/resource restrictions, **whether `pre_verify` is supported**, differences between the EIP draft and the devnet. Never guess addresses.

## 5. Three onchain components

1. **Agent Budget Vault** — holds USDC earmarked for inference. Deposit/withdraw unused, register agent, create session, set max spend, per-request cap, daily quota, allowed model/provider, expiry, revoke, expose usage/settlement state. Conceptual `AgentPolicy { owner, agent, paymentToken, totalBudget, maxPerRequest, dailyLimit, dailySpent, expiry, active }` — adapt to the real account/frame architecture. The agent never gets unrestricted transfer rights; the owner can revoke.
2. **ROUTIQ ERC-20 Paymaster** — distinct from the vault (vault pays for inference; paymaster sponsors gas). Enforces approved account, approved agent/session, approved gas token, max sponsorship per tx, daily sponsorship quota, reserves, expiry, duplicate-tx protection. Configurable (e.g. $1/day, ≤ $0.10/tx). **Investigate the actual Alt-Mempool paymaster interface and devnet ERC-20 gas support.** Intended flow: tx carries paymaster/validation frames → paymaster verifies eligibility, allowance, quota → ERC-20 collection if required → validation confirms the payment succeeded → paymaster approves sponsorship → execution. If `pre_verify` is supported, use it for the state-changing ERC-20 collection *before* the approving verification frame (**VERIFY frames are static: no arbitrary state mutation inside them**). Don't reuse an ERC-4337 paymaster unchanged. Demonstrate with real admission results: within-quota admitted; over-quota rejected; disallowed account rejected; expired session rejected — **not simulated in frontend JS**.
3. **Anon-RPC integration** — the privacy-aware read layer; kept separate from tx submission.

## 6. End-to-end workflow

1. Connect wallet (account, network, USDC balance, agent status). 2. Fund the vault (show deposit, vault address, tx hash; **no success until confirmed**). 3. Configure the agent policy (real token decimals/conversions), authorised by a real Frame Tx if the account design supports it. 4. Submit the Frame Tx through the Alt Mempool; show hash, submission/admission/validation/execution status, explorer link, validation result — no fake success. 5. Anon-RPC reads: vault balance, agent policy, remaining allowance, paymaster quota, session expiry, provider registry. 6. Agent calls `POST /v1/chat/completions` (Bearer key): authenticate → identify agent → load policy → check remaining budget, per-request max, daily quota, approved provider/model → pick a healthy source → send → compute actual usage/cost → record → update remaining budget; **reject policy violations; never silently change the model**. 7. **NEAR AI Cloud** is the first inference source (https://cloud-api.near.ai/docs; user holds a key; server-side env only). It is **one platform** with a model catalogue — **do not claim multiple independent providers**. Keep the provider-adapter abstraction. Verify the current endpoint and auth. 8. Usage & settlement (MVP): meter real token usage, compute cost, deduct from the vault's authorised *accounting* balance, show remaining budget. If offchain, **label it**; never claim each request caused an onchain USDC transfer. Distinguish: (1) USDC deposited onchain, (2) inference usage measured offchain, (3) offchain liability, (4) actual onchain settlement, (5) unused funds withdrawable. Design for later batch settlement.

## 7. Architecture

User wallet → ROUTIQ frontend → (a) Anon-RPC browser harness → Ethereum RPC reads; (b) wallet/tx submission → Frame Tx → Alt Mempool → smart-account validation (agent budget policy + ERC-20 paymaster: sponsorship quota, token-payment validation, gas sponsorship) → execution. AI agent → ROUTIQ OpenAI-compatible API (auth, policy check, model/provider selection, usage calc) → NEAR AI Cloud → real inference → usage record + budget accounting. The backend inference service must not claim to use browser Anon-RPC; do not route tx submission through the Anon-RPC read transport unless the protocol explicitly supports it.

## 8. Stack

Retain the repo's stack. Next.js/React/TS/Tailwind, wagmi + viem (WalletConnect/Reown if needed); Node route handlers or Fastify; PostgreSQL/Supabase only if persistence requires; Solidity + Foundry; EIP-8141-compatible account; USDC-compatible ERC-20; custom paymaster + vault; NEAR AI Cloud via an OpenAI-compatible adapter; `@anon-rpc/browser-harness`. No infrastructure for appearance.

## 9. Contracts (inspect devnet interfaces before finalising)

`contracts/{AgentBudgetVault.sol, ROUTIQPaymaster.sol, AgentPolicyRegistry.sol, interfaces/, libraries/, test/}`. Vault methods (proposed): `deposit`, `withdraw`, `createAgentSession(agent, budget, maxPerRequest, dailyLimit, expiry)`, `revokeAgentSession(sessionId)`, `getAgentPolicy`, `getRemainingBudget`. Paymaster responsibilities: validate, eligibility, daily quota, tx cap, ERC-20 gas collection, approve sponsorship, update quota — implemented against the real frame structure. Registry stores account, agent identity, session id, allowed token, allowed models/providers, limits, expiry, revocation; keep prices/health/request data offchain.

## 10. Frontend (premium dark infrastructure UI)

Black/charcoal, amber/orange highlights, subtle borders, clean technical typography, dense readable metrics, no decorative excess, no fake data shown as live. Pages: **Landing** ("Privacy-aware inference and programmable payments for AI agents"; AI routing · agent spending · privacy-aware Ethereum access) · **Agent Dashboard** (wallet, vault balance, agent status, remaining budget, daily usage, allowed models, expiry, recent requests, paymaster usage) · **Create Agent Policy** · **Inference Playground** (model, prompt, response, tokens, cost, provider, latency, remaining budget) · **Privacy Center** · **Paymaster Dashboard** (address, gas token, sponsorship funds, quota, used, per-tx cap, registered agents, sponsored vs rejected txs, explorer links) · **Transaction Explorer** (frame tx id; submission/admission/validation/execution/sponsorship/ERC-20 results; only fields backed by real data).

## 11. Data & security

Tables (if persistence needed): users, wallets, api_keys, agents, agent_sessions, agent_policies, providers, provider_manifests, models, provider_models, provider_health, inference_requests, routing_decisions, usage_records, vault_deposits, settlement_records, paymaster_sponsorships, frame_transactions, anon_rpc_metrics. Hash API keys; no private keys; provider and NEAR keys server-side; no service-role secrets exposed; minimal prompt logging; SSRF validation; rate limits; validate monetary values and token decimals; prevent duplicate charges; handle timeouts and partial streams; **failed inference must not be charged**.

## 12. API

`/v1`: `GET /models`, `GET /providers`, `GET /providers/:id`, `POST /chat/completions` (OpenAI-compatible, streaming if feasible), `GET /usage`, `GET /agents`, `GET /agents/:id/policy`, `GET /agents/:id/balance`, `GET /agents/:id/transactions`. Keep the inference API separate from the blockchain tx-submission service.

## 13. Three-minute judge demo (real contracts, real devnet txs)

0:00–0:25 problem · 0:25–0:55 connect, deposit $5 USDC to the vault, configure ($0.10 max/request, $2/day, Qwen + NEAR AI Cloud approved, 24 h, $1/day gas sponsorship, ≤$0.10 sponsored tx), show the real authorisation tx · 0:55–1:25 Frame Tx through the Alt Mempool: id, admission, validation, execution, explorer proof · 1:25–1:55 Privacy Center: worker initialised, transport, live reads of vault balance and agent policy, anonymised read count (show the browser network path) · 1:55–2:30 inference through the API: model, real NEAR AI Cloud response, tokens, cost, remaining budget · 2:30–3:00 policy enforcement: request over the inference cap → rejected; onchain tx over the paymaster's daily gas quota → real Alt-Mempool/devnet rejection; explain offchain inference-policy rejection vs onchain gas-sponsorship validation.

## 14. Milestones (prove protocols first)

M1 repo + protocol research (`docs/DEVNET_RESEARCH.md`, architecture diagram) · **M2 minimal real Frame Tx through the Alt Mempool (before the full paymaster)** · M3 Anon-RPC proof (real worker, reads, network verification, fail-closed, metrics) · M4 Agent Budget Vault (deposit, policy, limits, expiry, revocation, Foundry tests) · M5 ERC-20 Paymaster (devnet-compatible, ERC-20 gas payment, quota, tx cap, eligibility, success + over-quota rejection, tests) · M6 inference (NEAR AI Cloud adapter, catalogue, API-key auth, metering, budget enforcement, failure handling) · M7 dashboard around verified functionality · M8 clean-environment end-to-end run of the demo.

## 15. Tests

**Vault:** owner deposit/withdraw; agent cannot withdraw; cannot exceed budget or per-request cap; expired and revoked rejected. **Paymaster:** registered account sponsored; unregistered rejected; expired rejected; below quota accepted; above quota rejected; above per-tx cap rejected; invalid token payment rejected; failed collection cannot approve sponsorship; duplicate tx cannot double-account. **Anon-RPC:** worker init; integrity check; reads use the anonymising transport; failures visible; no silent direct RPC; metrics match real requests. **Inference:** valid request; invalid key; unknown model; disallowed model; exceeded budget; upstream timeout; failed inference not charged; token usage/cost accurate.

## 16. Environment

`.env.example` (proposed): `NEAR_AI_API_KEY`, `NEAR_AI_BASE_URL`, `DATABASE_URL`, Supabase vars, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_RPC_URL`, `ALTERNATIVE_MEMPOOL_URL`, contract addresses (`AGENT_BUDGET_VAULT_ADDRESS`, `ROUTIQ_PAYMASTER_ADDRESS`, `AGENT_POLICY_REGISTRY_ADDRESS`), `USDC_ADDRESS`, `ANON_RPC_WORKER_URL`, `ANON_RPC_WORKER_HASH`. Only variables required by verified integrations. No secrets in `NEXT_PUBLIC_*`; never commit `.env.local`; never ask the user to paste secrets into chat.

## 17. Non-negotiable rules

1 Inspect the repo first. 2 Don't overwrite working code unseen. 3–5 Never invent API methods, contract addresses or Frame-Tx formats. 6 No normal tx called a Frame Tx. 7 No direct RPC called Anon-RPC. 8 No offchain record called an onchain payment. 9 No fabricated live metrics. 10 Never claim prompts are private from NEAR AI Cloud. 11 No silent Anon-RPC→direct fallback. 12 Agent never gets unrestricted wallet access. 13 Never silently substitute a model. 14 A paymaster must not approve without verifying the token payment. 15 No admission/execution claim without evidence. 16 Keep the contract security model simple and testable. 17 Document what the devnet cannot do; propose the closest legitimate alternative.

## 18. First task

Audit the repo and protocols, return: existing architecture, frontend/backend, dependencies, Anon-RPC requirements, verified devnet config, Alt-Mempool submission interface, Frame-Tx structure, paymaster validation interface, ERC-20 sponsorship feasibility, proposed smart-account architecture, deployment plan, exact env vars, milestone plan, blockers — separating confirmed facts from assumptions, with source links. Then implement **M2**. Goal: a working, verifiable ETHGlobal submission, not maximum code.

## Positioning

ROUTIQ is an **agent payment and execution layer**: privacy-aware Ethereum reads (Anon-RPC) + programmable smart-account policies (Frame Txs) + ERC-20 gas sponsorship (quota-aware paymaster) + controlled inference spending (Agent Budget Vault) + unified inference (OpenAI-compatible API). Central demo: *"A developer funds an AI agent once. The agent accesses paid inference under a strict spending policy, reads its permissions through Anon-RPC, and executes approved blockchain operations using an ERC-20 paymaster and Frame Transactions through the Alternative Mempool."* One coherent product.

Attach as references: Anon-RPC repo + docs, EIP-8141, Alternative Mempool docs/workshop, NEAR AI Cloud docs. **Prove the Frame Tx + Alt Mempool integration first — it is the riskiest dependency.**
