# StealthRadar — Build Blueprint and Claude Build Prompt

A private, self-custodial stealth-payment inbox for Ethereum. Someone sends funds to a stealth address; the payment is published on-chain but doesn't reveal that it belongs to you. StealthRadar scans public announcements, identifies your payments **locally**, and shows them in a private inbox — using **Anon-RPC** for Ethereum reads while stealth keys and matching stay on-device.

## 1. Architecture

Sender → generates one-time stealth address, pays ETH/tokens → ERC-5564 Announcer emits `Announcement` (stealth address, ephemeral pubkey, view tag) → logs read through **Anon-RPC worker** → **local cryptographic scanner** (viewing key) → **private inbox**.

Two separate privacy mechanisms:
- **ERC-5564:** separates a recipient's public identity from the one-time receiving address.
- **Anon-RPC:** prevents the RPC endpoint from directly associating the user's IP with their chain queries.

Anon-RPC's worker bundle is hash-pinned, verified before execution, and isolated from the host app's wallet keys and DOM.

## 2. Cryptography (ERC-5564 scheme 1, secp256k1)

Recipient keys: spending key (controls funds) and viewing key (detects payments). Meta-address: `st:eth:0x<spendingPublicKey><viewingPublicKey>`.

Sender: random ephemeral key → ephemeral pubkey → shared secret `p_eph · P_view` → hash → one-time stealth address + 1-byte view tag → transfer → announce.

Scanner: for each announcement compute shared secret with viewing private key → hash → view tag; mismatch ⇒ skip (≈255/256 skipped); match ⇒ derive `P_stealth = P_spend + s_h·G`, address, compare with announced address. View tag is only a preliminary filter.

**Never** send viewing/spending/stealth private keys to a server, Anon-RPC worker, RPC request, API route, analytics or console.

## 3. Anon-RPC integration

Official package: `@anon-rpc/browser-harness`; use `AnonRpcWorker` and its `fetch` for JSON-RPC.

| Network | Specifier contract |
|---|---|
| Tor-js | `0x700dA3193D35fA54Cd3fBf29B66f2a2A0385659e` |
| Nym | `0x3aCD9742C68F6d993066Ae25533e09b9e1f60eD0` |
| Nox | `0x35133267A8F7EC35046a83DCA0f4Ca8A6e1b7A9A` (specifier on Sepolia, chain 11155111) |

Suggested first implementation: **Nox on Sepolia**, then Tor-js as a second selectable network, after checking current worker config and availability.

**Critical trap:** the quick-start example uses a *passthrough* worker (`0x4fd7…8d27`) that does **not** anonymize. Never use it as proof of Anon-RPC.

## 4. Product modules

A. Private stealth wallet (keys + meta-address) · B. Private announcement scanner (configurable range, incremental) · C. Stealth payment inbox · D. Anon-RPC privacy panel · E. Demo sender (separate wallet; ETH first, ERC-20 after).
The announcement is an event, not a transfer — payment and announcement must both occur.

## 5. Decisions

| Decision | Choice |
|---|---|
| First chain | Sepolia |
| First asset | ETH |
| Standard | ERC-5564 scheme 1 |
| RPC privacy | Genuine Anon-RPC network, not passthrough |
| Key storage | Encrypted local vault |
| Payment matching | Browser-side only |
| Backend | None for private scanning |
| Sender demo | Separate test-wallet flow |
| UI | Dark, premium privacy dashboard |

Three make-or-break items: (1) *prove* Anon-RPC is used (real worker, real network, visible routing); (2) correct crypto (view tag alone ≠ ownership; derive and verify the address); (3) an end-to-end demo (second wallet pays → announce → Anon-RPC scan → local detection).

---

## 6. The Claude Code build prompt (original)

> Act as a senior Web3 protocol engineer, cryptography engineer, privacy researcher and full-stack product developer. Build a complete, functional hackathon project called **StealthRadar** — not a landing page. Real ERC-5564 scanning, local cryptographic matching, genuine Anon-RPC. Submission: Ethereum Foundation Anon-RPC / CROPS track, ETHGlobal Mumbai.
>
> **Vision:** "Discover every stealth payment intended for you, without revealing your wallet identity to your RPC provider." Self-custodial, privacy-first stealth inbox; polished privacy wallet feel, not an explorer.
>
> **References to read first:** ERC-5564 (eips.ethereum.org/EIPS/eip-5564 and ercs.ethereum.org/ERCS/erc-5564), Anon-RPC docs/spec/GitHub/wallet-integration guide/adopters.json5. Verify actual package APIs and versions; do not invent formulas.
>
> **Stack:** Next.js App Router, TypeScript, Tailwind, wagmi + viem, `@anon-rpc/browser-harness`, an audited secp256k1 library, IndexedDB for encrypted persistence, Web Crypto, Lucide icons, Recharts only where valuable. No unnecessary backend; private-key ops and scanning client-side.
>
> **Crypto:** implement scheme 1: keypair generation, public keys, meta-address build/parse/validate, stealth address generation, announcement verification with viewing key, stealth private key derivation. Use exact curve point encoding/hashing from the standard; add tests against known vectors and independent cases; don't write custom crypto if a maintained library does it; a view-tag match alone does not prove ownership.
>
> **Scanner:** `Announcement(uint256 indexed schemeId, address indexed stealthAddress, address indexed caller, bytes ephemeralPubKey, bytes metadata)` from singleton `0x55649E01B5Df198D18D95b5cc5051630cfD45564` (verify deployment per chain). Filter scheme 1, decode metadata, view tag = first metadata byte, local match, store only verified matches. Support configurable start block, latest block, incremental scans, chunked `eth_getLogs`, pagination, dedupe by txHash+logIndex, retries, reorg handling, confirmation status. Sepolia + native ETH first. Retrieve tx/receipt to verify payment and amount. Don't present the announcement caller as a verified sender identity.
>
> **Anon-RPC (critical):** one long-lived `AnonRpcWorker` per network; plug `worker.fetch` into viem via a verified custom transport; use a genuine anonymizing specifier (investigate Nox on Sepolia; Tor-js as second). Verify specifier access, bundle retrieval, hash verification, readiness, a real JSON-RPC request, routing, failure handling. The privacy panel must distinguish genuine network / passthrough / direct RPC / init failure. **Fail closed** in privacy mode — never silently fall back to direct RPC; the user must explicitly choose direct mode. Bootstrap RPC is used only for the one-time specifier lookup (document it). After init all chain reads (blockNumber, getLogs, getTransactionByHash, getTransactionReceipt, getBalance, call, …) go through Anon-RPC via **one centralized RPC client**. Use `isolationKey` where supported but don't claim it guarantees unlinkability.
>
> **Vault:** CSPRNG keys; encrypt before persisting with a password-derived key (suitable KDF) + AES-GCM (Web Crypto); IndexedDB only; no plaintext keys, no localStorage, no logging; auto-lock + manual lock; encrypted export/restore. Don't use the user's ordinary wallet key as the stealth spending key. Connect MetaMask/EIP-1193 only for optional sender txs. No withdrawal/signing from stealth accounts in v1 unless key handling is safe.
>
> **UX:** premium dark UI (black/charcoal, subtle gradients, amber accent), responsive. Screens: Dashboard, Stealth Identity, Payment Inbox (filters: All/ETH/ERC-20/Confirmed/Pending), Scanner (start/stop, starting block, progress, processed, view-tag matches, full matches, errors), Privacy/Anon-RPC panel (network, worker specifier, readiness, hash verification if exposed, requests via Anon-RPC, direct bootstrap count, failures, avg response time, privacy mode — don't invent metrics the worker can't measure), Demo Sender (meta-address → derive → show stealth address + ephemeral key → connect wallet → send small ETH → publish announcement → show both tx hashes; never show an announcement without a transfer as a received payment).
>
> **Data model:** `StealthIdentity`, `AnnouncementRecord`, `DetectedPayment` typed interfaces; never store private keys in announcement/payment records; persist minimum locally.
>
> **Security/privacy:** no GA, trackers, session replay, telemetry, remote key storage, backend receiving viewing keys, backend matching, or centralized indexer. Be honest about limits: announcements/transfers are public; amounts/timing observable; Anon-RPC reduces IP↔query linkage but doesn't privatize chain data; operators may still infer; a malicious worker can lie. Document the threat model.
>
> **Tests:** key gen, meta-address codec, stealth address gen, shared secret, view tag, non-match rejection, match detection, stealth key derivation, metadata parsing, dedupe, chunked scanning, worker init, routing, failure behaviour, encrypted vault. Plus an E2E: generate identity → sender ephemeral key → stealth address → send ETH on Sepolia → announce → scan via Anon-RPC → match → inbox, verifying tx and announcement independently.
>
> **Demo flow:** generate identity → copy meta-address → demo sender pays → announce → scan via genuine anonymizing worker → local view-tag filter → full verification → inbox → show viewing key never leaves the browser → show active network + routing. Include a privacy architecture page and a README (why, ERC-5564, Anon-RPC, local scanning, public vs. untransmitted data, limits, run steps, reproduce the demo).
>
> **Structure:** `src/app`, `components/{dashboard,inbox,identity,scanner,privacy,sender}`, `lib/{crypto,erc5564,anon-rpc,rpc,scanner,vault,transactions}`, `hooks`, `types`, `config`. No fake data as the main implementation (mock data only in an explicitly labelled demo mode). Don't invent contract addresses, worker configs, package exports or network support; if blocked, explain it. Prioritize correctness, security, real Anon-RPC and a working E2E flow.
>
> **First:** inspect the repo, read the specs, verify Anon-RPC networks/config, pick crypto libraries, return architecture + dependency list + assumptions + plan — then implement.
