# Implementation audit (2026-11-06)

## Repository

Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind 4, viem. The repo started life as a stealth-payments prototype
(history preserved; messages reworded to ROUTIQ) and was pivoted to ROUTIQ. The prototype's crypto, vault, scanner and sender code was removed from the tree;
the Anon-RPC layer and the central RPC client were kept and retargeted from Sepolia to the Alt-Mempool devnet.

## What works (verified)

| Area | Evidence |
|---|---|
| OpenAI-compatible gateway (`/v1/chat/completions`, streaming, `/v1/models`) | live streamed completions in a real browser; `/v1/*` rewrite works for the OpenAI SDK base URL |
| Real hosted inference | NEAR AI Cloud completion through the router; cost `$0.00005575` = 11×$0.05 + 138×$0.40 per 1M, from provider-reported usage |
| Routing | cheapest / fastest / balanced, deterministic, explained; unit-tested |
| Same-model failover | provider returning 503 → served by another provider, flagged in headers; fallback disabled → clean 502 |
| Keys, rate limits, usage ledger | hashed keys (no plaintext at rest), revocation (401 afterwards), per-key usage ranges |
| Provider registration | EIP-191 signature, replay window, SSRF rejections (loopback, private, metadata, bad DNS), endpoint must serve declared models; browser/server hashing parity test |
| Anon-RPC | real Nox network reading the devnet in headless Chrome; fail-closed before start; counters 2 / 0 / 2 (anonymised / direct / bootstrap) |
| UI | real-browser smoke test across landing, console, playground, usage, models, providers, keys, agent page; no console errors |

## Incomplete / blocked

| Item | Why |
|---|---|
| Frame Transactions, vault, ERC-20 paymaster | frame introspection opcodes unverified on the devnet; support-library install needs explicit approval; see `DEVNET_RESEARCH.md` |
| Onchain `ProviderRegistry` | not yet deployed (depends on the above tooling for the staked-account story) |
| Onchain settlement | usage is metered offchain only (labelled) |
| Wallet-based API-key auth | key management is open on localhost; `ROUTIQ_ADMIN_TOKEN` protects it on a public deployment |

## Environment

`NEAR_AI_API_KEY` (server only), optional `NEAR_AI_BASE_URL`, `OLLAMA_URL`, `ROUTIQ_DISABLE_OLLAMA`, `ROUTIQ_DATA_DIR`, `ROUTIQ_ADMIN_TOKEN`,
`NEXT_PUBLIC_ROUTIQ_CHAIN_ID` / `_RPC_URL` / `_SIDECAR_RPC_URL`. See `.env.example`. Secrets live only in `.env.local` (gitignored).
