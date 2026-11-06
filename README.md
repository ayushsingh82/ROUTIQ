# StealthRadar

**Discover every stealth payment meant for you, without revealing your wallet identity to your RPC provider.**

A self-custodial ERC-5564 stealth-payment inbox. Keys, scanning and matching run entirely in your browser. Every chain read goes through [Anon-RPC](https://ethereum.github.io/anon-rpc/) over a genuine anonymizing network (Nox / tor-js / Nym), and the app **fails closed**: if the anonymizing worker isn't ready, it refuses to read the chain instead of silently falling back to a normal RPC.

Built for ETHGlobal Mumbai — Ethereum Foundation, *Best Use of Anon-RPC*.

## Why

Stealth addresses hide *who* a payment is for. But the receiver still has to look things up (announcements, balances, receipts) — and a normal RPC provider sees your IP next to every address you query, quietly re-linking you to your stealth addresses. Anon-RPC removes that link.

## How it works

```
Sender wallet ──ETH──▶ one-time stealth address
              └─announce()─▶ ERC-5564 Announcer (0x5564…5564)

Browser (this app)
  Anon-RPC worker (hash-pinned, sandboxed) ──anonymizing network──▶ RPC ──▶ Ethereum
        ▲ eth_getLogs / eth_getBalance / eth_blockNumber …
  Local engine: view-tag filter → full address derivation → payment verification → encrypted IndexedDB
```

1. **Identity** — spending + viewing keys generated locally, encrypted (PBKDF2-SHA256 600k → AES-256-GCM) in IndexedDB. Meta-address `st:eth:0x<spendPub><viewPub>`.
2. **Send** — derive a stealth address from a meta-address, transfer ETH, then publish the announcement (two txs).
3. **Scan** — chunked `eth_getLogs` through Anon-RPC (auto-halves the range on provider limits), dedupe by `txHash:logIndex`, 12-block reorg overlap on incremental scans.
4. **Match** — scheme-1 view tag (≈1/256 pass) is only a pre-filter; a match requires the *derived address to equal the announced address*.
5. **Verify** — an announcement is not a payment. We mark `verified` only when the stealth address's on-chain balance supports the announced amount; otherwise `matched, payment unverified`. Metadata is treated as an attacker-controlled hint.

## Run it

```bash
npm install
npm test            # unit tests: crypto, vault, scanner, provider-view — 18 tests
npm run e2e:local   # full flow on an anvil fork of Sepolia (needs Foundry): pay → announce → scan → verify → spend
npm run live:scan   # read-only sanity scan of real Sepolia announcements
npm run smoke       # real-browser smoke test (see Testing)
npm run e2e:browser # full UI payment flow on an anvil fork
npx next dev -p 3100
```

Open http://localhost:3100

### Reproduce the end-to-end demo (Sepolia)
1. **Identity** → create a vault (password) → copy the meta-address.
2. **Privacy** → pick **Nox** → *Start worker*. Wait for `ready`. (Try tor-js if Nox is busy.)
3. **Send** → with a *different* wallet (MetaMask, Sepolia ETH from a faucet) → paste the meta-address → pay 0.001 ETH. Two txs are shown.
4. **Scan & Inbox** → *Start scan* (leave start block blank or use a block just before your tx). Watch the counters: announcements → view-tag passes → full matches.
5. The payment appears as **verified**. In the Privacy tab, check *Via Anon-RPC* vs *Direct reads (0)* vs *Bootstrap (1–2)*.
6. In the browser's Network tab, confirm no keys appear in any request.

**Provider's view** tab: sends the same request directly and through Anon-RPC to an echo endpoint (httpbin by default, throwaway address only) and shows the IP, headers and query the provider observed on each side.

`/spike` is a minimal harness that proves a real network can carry `eth_blockNumber` and `eth_getLogs`.

## Testing

| Layer | Command | Covers |
|---|---|---|
| Unit | `npm test` | ERC-5564 derivations (cross-checked with viem), vault encryption/tamper/backup, scanner chunking/dedupe/abort, verification rules, echo parsing |
| Local E2E | `npm run e2e:local` | Real Announcer contract on an anvil fork of Sepolia: transfer + `announce()`, chunked scan, view-tag → full match, idempotent rescan, a second user matching only their own payment, unfunded announcement stays *unverified*, and **spending from the stealth address with the derived key** |
| Live read | `npm run live:scan` | Real Sepolia `eth_getLogs` decoding with a random key (expects 0 matches) |
| Browser smoke | `npm run build && npx next start -p 3101` then `npm run smoke` (add `WORKER=1` for a real Anon-RPC network) | Headless Chrome via DevTools: brand colors, create identity, encrypted vault in IndexedDB (no plaintext keys), lock/unlock/wrong password, persistence across reload, **fail-closed scanning**, send validation, Provider's view; with `WORKER=1`: starts **Nox**, shows two different IPs, scans live Sepolia through it and checks counters (Anon-RPC reads > 0, direct reads = 0, bootstrap counted) |
| Browser E2E | `npm run e2e:browser` | The full payment flow **through the real UI** on an anvil fork: create identity → real stealth payment + announcement → scan → inbox shows the verified 0.25 ETH, the unfunded announcement stays *unverified*, rescan is idempotent, payments survive a reload |

The tests caught two real bugs, both fixed: (1) viem caches the chain head for ~4 s, so a scan right after a payment stopped one block short (`cacheTime: 0`); (2) the scan could finish before the last match was verified and saved, so a found payment could be missing from the inbox and its cursor advanced early (scan now awaits all verifications, and any matched announcement without a verified payment is re-verified on the next scan).

Note: scanning in **Direct** mode is possible only after you explicitly select it on the Privacy tab, and the UI shows a red warning. `NEXT_PUBLIC_RPC_OVERRIDE` is a build-time test knob used only by `e2e:browser`.

## Threat model & honesty

| What | Status |
|---|---|
| Announcements, stealth addresses, amounts, timing | **Public on-chain** |
| Your IP ↔ the RPC endpoint | Hidden by the anonymizing network |
| One-time bootstrap read of the Anon-RPC specifier contract | **Not anonymized** (counted separately in the UI) |
| Wallet-broadcast sender txs (Send tab) | Sent by your wallet, **not** via Anon-RPC |
| Malicious worker / network | Can observe, censor or lie (sandbox + on-chain hash pin narrow, don't remove, trust) |
| `isolationKey` | Passed per call, but support varies by network — **we make no unlinkability claim** |
| Viewing / spending keys | Never leave the browser: not in RPC calls, worker config, logs or any server (there is no backend) |
| Withdrawal from stealth addresses | **Not implemented** (deliberately — no unsafe signing code) |
| ERC-20 / USDC | Matched, but shown as *unverified / unsupported* for now |

Known limits: balance-based verification can't attribute funds to a specific tx without trace APIs, and a swept address shows as unverified. The ERC leaves the hash `h` abstract; we use keccak256 of the shared point's x-coordinate (self-consistent and cross-checked against viem for address derivation, but **not yet interop-tested against other stealth tools**). Matching runs on the main thread (a Web Worker is a planned improvement).

## Layout

```
src/lib/crypto     ERC-5564 scheme 1 (noble secp256k1/keccak)
src/lib/erc5564    constants, metadata codec
src/lib/vault      PBKDF2→AES-GCM vault, auto-lock session
src/lib/anon-rpc   network registry + worker manager (fail-closed, honest counters)
src/lib/rpc        the ONLY JSON-RPC client (viem custom transport over the worker)
src/lib/scanner    pure scan/match logic, payment verification, RPC bindings
src/lib/sender     demo sender (transfer + announce)
src/lib/db         IndexedDB (ciphertext + public records only)
```

## AI usage

Built with Claude Code (Anthropic). Specs, product brief and build plan are in [`docs/`](docs).

## License

MIT
