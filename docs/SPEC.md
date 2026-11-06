# StealthRadar — Full Product and Technical Specification

StealthRadar is a **private stealth-payment discovery application**, not a general-purpose wallet.

Its job:

1. Generate or import a stealth identity.
2. Give the user a stealth meta-address to share.
3. Let someone else pay that identity using ERC-5564.
4. Discover the payment through Anon-RPC.
5. Identify the payment locally using cryptography.
6. Display the payment in a private inbox.
7. Let the recipient eventually access the funds using the stealth private key.

**Critical architectural rule:** Ethereum provides public blockchain data; Anon-RPC transports the reads; the browser performs private identity matching.

## 1. System at a glance

1. **Sender side:** meta-address → ephemeral key → stealth address → ETH/token transfer → ERC-5564 announcement
2. **Ethereum:** Announcer events, receipts, native/token transfers, balances, block data
3. **Anon-RPC layer:** hash-verified worker, anonymizing network transport, RPC reads
4. **Browser privacy engine:** announcement parsing, view-tag filtering, stealth-address derivation, payment verification, encrypted local storage
5. **UI:** dashboard, identity, inbox, scanner, send, privacy center, settings

## 2. Core modules

| Module | What it does | Priority |
|---|---|---|
| Stealth Identity | Generate/import keys, create meta-address | Essential |
| Receive Payments | Share meta-address, receive stealth payments | Essential |
| Anon-RPC Engine | Fetch chain data through anonymizing workers | Essential |
| Announcement Scanner | Scan and decode ERC-5564 events | Essential |
| Private Matching Engine | Match announcements locally | Essential |
| Payment Inbox | Show discovered payments | Essential |
| Transaction Verification | Verify funds actually reached the stealth address | Essential |
| Stealth Withdrawal | Derive private key and access funds | Advanced |

### A. Generate stealth identity
Generate without connecting an existing wallet: spending private/public key, viewing private/public key, meta-address `st:eth:0x<spendingPublicKey><viewingPublicKey>`.
Actions: generate, import, copy meta-address, QR, export encrypted backup, lock, restore.
The viewing key discovers incoming payments; the spending key controls funds. Keep them separate.

### B. Receive stealth payments
Sender: parse recipient public keys → random ephemeral private key → ephemeral public key → shared secret → stealth address → view tag → send ETH/tokens → publish ERC-5564 announcement. The recipient need not be online.

### C. Scan announcements
Announcer: `0x55649E01B5Df198D18D95b5cc5051630cfD45564`.

| Field | Meaning |
|---|---|
| `schemeId` | Cryptographic scheme; use `1` |
| `stealthAddress` | One-time recipient address |
| `caller` | Account that called the announcer |
| `ephemeralPubKey` | Sender-generated ephemeral public key |
| `metadata` | View tag and optional asset/payment info |

### D. Local cryptographic matching
For every announcement: read ephemeral pubkey → ECDH with viewing private key → hash → compare view tag → skip mismatches → derive stealth pubkey/address for candidates → compare with announced address → accept only a full match. Ideally in a **Web Worker** so large scans don't freeze the UI.

### E. Verify actual payment
An announcement does **not** prove money moved. For each match: fetch tx + receipt, check success, check stealth address, determine ETH vs token, compute actual amount, check confirmations, track later balance changes. Only verified transfers appear as received payments.

### F. Private payment inbox
Per record: asset name/symbol, amount, stealth address, tx hash, block, timestamp, confirmation status, network, announcer `caller` (labelled as a public tx field, **not** a verified identity).

### G. Withdraw funds
`p_stealth = p_spend + s_h (mod n)`. Advanced feature with a separate, carefully tested signing module. Not needed to prove the Anon-RPC concept.

### H. Privacy monitoring
Show: active Anon-RPC network; worker init success; bundle integrity verification; reads routed through it; direct bootstrap reads; whether any direct fallback happened; whether in privacy mode. The reference **passthrough worker is not anonymizing** and must be distinguished from real networks.

## 3. Screens

| # | Screen | Contents |
|---|---|---|
| 01 | Dashboard | Payments discovered, ETH/token totals, latest payments, active chain, Anon-RPC status, last scan, scan button, quick receive/send |
| 02 | Stealth Identity | Generate/import, spending+viewing pubkeys, meta-address, QR, copy/share, encrypted backup |
| 03 | Payment Inbox | All payments, ETH/token filters, pending/confirmed filters, search by address/tx, details |
| 04 | Scanner | Start/stop, from/to block, current block, events scanned, view-tag matches, full matches, last scanned block, errors/retries |
| 05 | Privacy Center | Active network/worker, verification, readiness, requests via Anon-RPC, direct bootstrap requests, failed requests, latency, privacy mode |
| 06 | Send Payment | Recipient meta-address, asset, amount, derived stealth address, ephemeral pubkey, confirmation, announcement tx |
| 07 | Transaction Details | Announcement event, receipt, transfer event, stealth address, amount, confirmations, explorer link |
| 08 | Security & Backup | Password vault, encrypted export, import, lock, recovery instructions, local data deletion |
| 09 | Settings | Network, RPC network, block range, auto-scan, confirmation threshold, theme, storage controls |

Sidebar: Dashboard, Inbox, Scanner, Send, Identity, Privacy Center, Settings. Transaction Details and Security & Backup are subpages/modals.

## 4. Data sources

| Data | Source | How |
|---|---|---|
| Announcement events | Ethereum | `eth_getLogs` via Anon-RPC |
| Stealth address / caller / block / tx hash | Event log | Indexed fields / log |
| Ephemeral public key | Event | `ephemeralPubKey` |
| View tag | Event metadata | First byte |
| Receipt / tx | Ethereum | `eth_getTransactionReceipt` / `eth_getTransactionByHash` |
| ETH balance | Ethereum | `eth_getBalance` |
| ERC-20 balance/symbol/decimals | Token | `eth_call` |
| Token transfer | Ethereum | ERC-20 `Transfer` logs |
| Keys, meta-address, shared secret, match result, stealth private key | Local crypto | Browser |
| Payment history | Local DB | IndexedDB |
| Fiat conversion | Optional price API | Later; must never see keys or scan activity |

**Must go through Anon-RPC:** `eth_chainId`, `eth_blockNumber`, `eth_getLogs`, `eth_getTransactionByHash`, `eth_getTransactionReceipt`, `eth_getBalance`, `eth_call`, `eth_getBlockByNumber`. No hidden direct RPC.

**Local only (no RPC):** key generation, meta-address, stealth address derivation, shared secret, view tag, matching, vault decrypt, scan cursor, inbox filtering, totals.

## 5. Chains

- **Initial:** Ethereum Sepolia (full demo).
- **Next:** Ethereum mainnet after confirming deployments and scanning.
- **Future:** Base, Optimism, Arbitrum — only after verifying Announcer deployment code and a suitable Anon-RPC worker per chain. The Announcer address is deterministic across chains but **deployment must be checked**.

## 6. Assets

**Phase 1 — ETH.** Sender: derive stealth address → send ETH → `announce()` with scheme 1, ephemeral pubkey, encoded metadata → recipient scans/verifies.
Metadata:

| Bytes | Data |
|---|---|
| 0 | View tag |
| 1–4 | `0xeeeeeeee` |
| 5–24 | ETH sentinel `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` |
| 25–56 | ETH amount (32-byte big-endian) |

The app must independently verify the transaction rather than trusting metadata.

**Phase 2 — ERC-20 (USDC).** Sender calls token `transfer(stealth, amount)` then `announce()` with metadata: byte0 view tag · bytes1–4 selector · bytes5–24 token address · bytes25–56 amount. Read `symbol()`/`decimals()` for display. Verify the ERC-20 `Transfer` event.

**Phase 3 — later:** ERC-721, ERC-1155, multiple tokens.

**Payment-correlation detail:** transfer and announcement can be two separate transactions, so the announcement tx hash ≠ transfer tx hash. For the demo sender, save both hashes and expected details locally. For external senders, use the announced address, asset metadata, history and transfer logs. If ambiguous, show **"matched, payment unverified"** — never guess.

## 7. Integrations

| Integration | API / method | Purpose |
|---|---|---|
| Anon-RPC | `AnonRpcWorker`, `worker.ready`, `worker.fetch` | Anonymous RPC |
| Ethereum | `eth_getLogs`, `eth_getTransactionReceipt`, `eth_getTransactionByHash`, `eth_getBalance`, `eth_call` | Scanning + verification |
| Wallet | EIP-1193 | Connect sender wallet |
| ERC-5564 | `announce()` | Publish announcement |
| ERC-20 | `transfer()` | Token transfer |
| Storage | IndexedDB | Encrypted identity + scan history |
| Crypto | Web Crypto API; secp256k1 library | Vault; keys + ECDH |

References: ERC-5564 (https://ercs.ethereum.org/ERCS/erc-5564), Anon-RPC spec (https://ethereum.github.io/anon-rpc/spec/), wallet integration (https://ethereum.github.io/anon-rpc/wallets/), repo (https://github.com/ethereum/anon-rpc), optional ERC-6538 registry (https://eips.ethereum.org/EIPS/eip-6538).

**Backend:** none for the core product. Frontend (Next.js), crypto, key storage, scanning, Anon-RPC harness, matching and history all run in the browser; sender txs go through the connected wallet.

## 8. Data flows

1. **Create identity:** Generate → keypairs → public keys + meta-address → encrypt private material with password → store in IndexedDB → show meta-address + QR. No tx needed.
2. **Someone sends ETH:** enter meta-address → derive stealth address + ephemeral key locally → transfer ETH → publish announcement → two txs on chain.
3. **Recipient discovers:** init real Anon-RPC worker → request logs via worker → extract fields → view-tag filter → full derivation on candidates → verify against chain transfers → store + display.
4. **Recipient accesses funds:** open payment → derive stealth private key → review balance → sign tx with the one-time key (separate tested module).

## 9. Data models

| Model | Fields |
|---|---|
| `StealthIdentity` | id, chainId, spendingPublicKey, viewingPublicKey, encryptedKeys, metaAddress |
| `Announcement` | chainId, schemeId, stealthAddress, caller, ephemeralPubKey, metadata, txHash, logIndex, blockNumber |
| `DetectedPayment` | id, stealthAddress, asset, amount, tokenAddress, txHash, status, blockNumber |
| `ScanState` | chainId, lastScannedBlock, lastScanAt, scanStatus |
| `AnonRpcSession` | network, workerStatus, verified, requestCount, failureCount |
| `LocalSettings` | selectedChain, selectedNetwork, confirmationThreshold, autoScan |

Keep the encrypted vault separate from announcement/payment records. Never persist plaintext private keys.

## 10. Feature priorities

| Feature | Priority |
|---|---|
| Real Anon-RPC integration (verified worker, genuine network, real reads, no silent direct fallback) | Must |
| ERC-5564 identity generation (correct keys, meta-address, encrypted vault) | Must |
| Local announcement scanning (decode, view-tag filter, full match) | Must |
| Verified payment inbox | Must |
| End-to-end sender demo | Must |
| USDC support | Strong addition |
| Stealth withdrawals | Advanced |
| Multi-chain + ERC-6538 registry | Later |

## 11. Two experiences

- **Receive mode:** generate identity, share meta-address, discover payments.
- **Send mode:** enter someone's meta-address and make a stealth payment.

Self-contained, so judges can test with two wallets.

**Winning demo:** two wallets, one stealth identity, one real ETH payment, one on-chain announcement, a genuine Anon-RPC scan, local cryptographic matching, and the payment appearing in the recipient's inbox.
