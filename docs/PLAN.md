# StealthRadar — Build Plan

**Target prize:** Ethereum Foundation → *Best Use of Anon-RPC* ($2.5k / $1.5k / $1k)
**One-liner:** Discover every stealth payment meant for you, without revealing your wallet identity to your RPC provider.
**Companion docs:** [`SPEC.md`](./SPEC.md) (product + technical spec), [`BLUEPRINT.md`](./BLUEPRINT.md) (original build blueprint and Claude prompt).
**App:** the Next.js app is the repository root (`src/`, `scripts/`, `package.json`); all markdown lives in `docs/` plus the root `README.md`.

---

## 0. Verified facts (checked against official sources, 2026-11-06)

| Item | Verified |
|---|---|
| `@anon-rpc/browser-harness` | Latest **0.4.0** (published 2026-10-28), ESM, browser-only, MIT. Exports `AnonRpcWorker`, `RpcError`. |
| Worker API | `new AnonRpcWorker({ address, config?, preExisting: { rpcProvider: { request } } })`; `worker.ready`; `worker.fetch(url, init)` (this-bound); `worker.close()`; per-call `anonOptions: { isolationKey }`. |
| Bootstrap | One non-anonymized read of the specifier contract (`workerHash()`, `workerResolvers()`) via the bootstrap provider. Must be documented as one-time exposure. |
| Passthrough worker `0x4fd77be3…8d27` | `kind: "reference"`, **does not anonymize**. Never use as the privacy path. |
| Tor-js `0x700dA319…659e` | `kind: "network"`. Needs `config.gateways` (demo gateway may vanish). Specifier on mainnet. |
| Nym `0x3aCD9742…0eD0` | `kind: "network"`. ~18 MB bundle, seconds to bootstrap. Specifier on mainnet. |
| Nox `0x35133267…7A9A` | `kind: "network"`, `chainId: 11155111` → specifier lives on **Sepolia**, so bootstrap RPC must be Sepolia. |
| `isolationKey` | Support varies per network — must test, never claim unlinkability. |
| ERC-5564 Announcer | `0x55649E01B5Df198D18D95b5cc5051630cfD45564` (CREATE2, same address on every chain **if deployed**). Must `eth_getCode` before enabling a chain. |
| Event | `Announcement(uint256 indexed schemeId, address indexed stealthAddress, address indexed caller, bytes ephemeralPubKey, bytes metadata)` |
| Metadata (ETH) | byte0 view tag · bytes1–4 `0xeeeeeeee` · bytes5–24 `0xEeee…EEeE` · bytes25–56 amount (uint256 BE) |
| Scheme 1 crypto | `s = p_eph·P_view`; `s_h = h(s)`; viewTag = `s_h[0]`; `P_stealth = P_spend + s_h·G`; addr = keccak(pubkey)[12:]; stealth priv = `p_spend + s_h mod n` |

> The ERC text leaves `h` abstract. Reference implementations (ScopeLift, Umbra-style) use `keccak256` of the **compressed (33-byte)** shared-secret point. We will follow that and **cross-check against an independent implementation / test vectors before trusting it** (see M2).

---

## 1. Scope

**In (must ship):** identity + encrypted vault · meta-address · sender (ETH) · Anon-RPC engine (real network, fail-closed) · Announcement scanner · local matching (view tag + full address) · payment verification · inbox · privacy center · README + threat model.

**Strong add:** ERC-20 (USDC) support.
**Advanced / only if time:** withdrawal from stealth address (separate signing module).
**Out:** multi-chain, ERC-6538 registry, NFTs, fiat prices, any backend.

**Chain:** Sepolia first. **Asset:** ETH first. **No backend** for scanning/matching.

---

## 2. Architecture

```
Browser (Next.js, no private backend)
 ├─ lib/crypto      secp256k1 (@noble/curves), keccak (@noble/hashes) — ERC-5564 scheme 1
 ├─ lib/erc5564     meta-address codec, metadata codec, announcer ABI/addresses
 ├─ lib/anon-rpc    AnonRpcWorker manager, network registry, request counters, fail-closed policy
 ├─ lib/rpc         ONE central JSON-RPC client (viem custom transport over worker.fetch) — audit point
 ├─ lib/scanner     chunked getLogs → parse → view-tag → full match → verify transfer
 ├─ lib/vault       PBKDF2/scrypt → AES-GCM, IndexedDB, auto-lock
 └─ lib/db          IndexedDB stores: announcements, payments, scanState
```

Rule: **Ethereum = public data · Anon-RPC = transport · browser = identity matching.** Keys never leave the browser (not into worker config, RPC calls, logs, or any API route).

---

## 3. Milestones (in order — each is a go/no-go gate)

| # | Milestone | Done when | Risk gate |
|---|---|---|---|
| **M0** | Docs + scaffold + deps | Folder builds, specs saved | — |
| **M1** | **Anon-RPC spike** | A real `eth_blockNumber` AND `eth_getLogs` (Announcer) round-trips through Nox *or* Tor-js on Sepolia from the browser; request counter visible | **Go/no-go.** If no network works, fall back to ProofShip (see Fallbacks). |
| **M2** | Crypto core + tests | generate/encode/decode meta-address, generate stealth address, check, derive stealth key; vitest green incl. independent cross-check | Must match a reference impl. |
| **M3** | Vault | Encrypt/decrypt/lock/export/import; no plaintext in storage | — |
| **M4** | RPC layer | Single client; privacy mode fail-closed; direct mode opt-in only; counters (anon/bootstrap/failed/latency) | — |
| **M5** | Sender demo | Pay ETH to a meta-address + `announce()`; shows both tx hashes | Needs Sepolia ETH + Announcer deployed on Sepolia (verify `eth_getCode`). |
| **M6** | Scanner + matcher | Chunked logs, dedupe by txHash+logIndex, view-tag filter, full match, verify transfer | — |
| **M7** | UI | Dashboard, Identity, Inbox, Scanner, Send, Privacy Center, Settings; dark/amber | — |
| **M8** | E2E on Sepolia | Two wallets → payment → announce → Anon-RPC scan → inbox | **This is the demo.** |
| **M9** | Polish | README, threat model page, demo video, deploy | — |
| **M10** | Stretch | USDC; withdrawal; Veil-style "provider's view" panel | Only if M8 is solid. |

---

## 4. Demo script (≤3 min)

1. Generate identity → copy `st:eth:0x…`.
2. Privacy Center: worker verified, real network (not passthrough), 0 direct reads.
3. Second wallet → Send → pay 0.001 Sepolia ETH to the meta-address; show both tx hashes.
4. Scanner → Start. Show: announcements fetched via Anon-RPC, view-tag filter (≈1/256 pass), full match.
5. Inbox shows the payment, verified against the receipt.
6. Show "viewing key never leaves browser" (network tab: no key in any request).
7. Provider's-view comparison: direct vs Anon-RPC (stretch).

## 5. Judging fit

Works end to end · UX · **share of traffic through Anon-RPC (target ~100%, only bootstrap read is direct — stated)** · shippable after hackathon · technical depth (real ECDH/view-tag crypto, fail-closed policy, honest threat model).

## 6. Honest weaknesses to address in README

- The announcement scan is generic (everyone fetches the same logs). The real leak is **follow-up reads on stealth addresses** (balance / tx / receipt lookups) → this is why they must all route via Anon-RPC. Frame the demo around that.
- Announcements/transfers are public on-chain; Anon-RPC hides IP↔query linkage only.
- A malicious worker/network can censor or lie. Bootstrap read is not anonymized.
- Existing stealth tools (Umbra, Fluidkey) exist — novelty is *privacy-preserving discovery via Anon-RPC, fail-closed*.

## 7. Fallbacks

| If | Then |
|---|---|
| No anonymizing network works from the browser | Switch to **ProofShip** (verify deployed frontend == source) |
| Nox/Tor flaky at demo time | Pre-record backup video; keep second network (Nym/Tor) selectable |
| `isolationKey` ignored | Don't claim it; document |
| Sepolia Announcer not deployed | Deploy ERC5564Announcer ourselves is *not* allowed to change the canonical address → use mainnet read-only demo or a chain where it exists; verify first in M1 |

## 8. Hackathon checklist

- [ ] Public repo, open-source license, README (what/why/setup/threat model/limitations)
- [ ] Demo video ≤3 min + live link
- [ ] Proper commit history (not one big upload)
- [ ] State AI usage
- [ ] Anon-RPC usage proven (worker address, network kind, request counts)
- [ ] No third-party analytics/trackers

---

## 9. Progress log

| Date | Milestone | Status |
|---|---|---|
| 2026-11-06 | M0 docs + Next.js 16 scaffold + deps (`@anon-rpc/browser-harness@0.4.0`, viem, wagmi, noble, idb) | ✅ done |
| 2026-11-06 | M2 crypto core (`src/lib/crypto/stealth.ts`) + metadata codec; `npm test` 6/6 pass, incl. independent viem address cross-check | ✅ done |
| 2026-11-06 | M4 (partial) Anon-RPC manager + single central RPC client, fail-closed private mode, honest counters | ✅ code, typechecks |
| 2026-11-06 | Verified on Sepolia: Announcer `0x5564…5564` has code; Nox specifier has code | ✅ |
| — | **M1 spike: real browser run of Nox / tor-js via `/spike`** | ⏳ **needs a human browser** (iframe + WebRTC); page serves 200 |
| — | M3 vault, M5 sender, M6 scanner, M7 UI, M8 E2E | not started |

**Notes**
- Hash input for `h(s)` is the x-coordinate of the shared point (ERC leaves it abstract) — cross-check with another stealth tool before claiming interop.
- Dev server: `npx next dev -p 3100` (port 3000 was held by another local process).
- Tests use Node's built-in runner (`npm test`); vitest install hit ENOSPC and isn't needed.

### Update — vault, scanner, sender, UI

| Milestone | Status |
|---|---|
| M1 Anon-RPC spike (real network in browser) | ✅ user-confirmed working |
| M3 Vault (PBKDF2 600k → AES-GCM, AAD-bound meta-address, auto-lock 5 min, encrypted backup/restore, wipe) | ✅ 4 tests |
| M6 Scanner (chunked + adaptive range, dedupe, reorg overlap, abort, view-tag → full match) + payment verification (never guesses) | ✅ 5 tests |
| M5 Sender (transfer + announce, 2 txs) | ✅ code (needs live Sepolia run) |
| M7 UI (Identity, Privacy, Scan & Inbox, Send), dark/amber | ✅ builds; **not yet driven in a browser** |
| M9 README + threat model + MIT | ✅ |
| M8 Live E2E on Sepolia (2 wallets) | ⏳ needs a human + Sepolia ETH |
| M10 stretch: ERC-20/USDC verify, withdrawal, Web Worker matching, provider's-view panel, interop test vs another stealth lib | open |

Checks: `tsc` clean · `eslint` clean · `npm test` 15/15 · `next build` OK.

| Provider's-view panel (direct vs Anon-RPC against an echo endpoint, IP/headers/query diff, verdict) | done, 3 tests; needs a live run |

### Update — local testing

- Added `npm run e2e:local` (anvil fork of Sepolia): pay + announce through the real Announcer → chunked scan → match → verify → **sweep funds with the derived stealth key**. All checks pass.
- It found and fixed a real bug: viem's 4 s `getBlockNumber` cache made scans right after a payment miss it (`cacheTime: 0`).
- Added `npm run live:scan` (read-only, real Sepolia). Public RPC keeps ~10–20k blocks of logs; Sepolia currently has ~0 announcements, so it only validates the query path.
- Remaining manual: live Sepolia payment through a real anonymizing network in the browser; git history; deploy.

### Update — design + browser testing

- **UI redesign (near.com-style):** light landing at `/` (#FEFEFE, black text) and dark dashboard at `/app` (#262626, text #F4FEF8, highlight #00EC97). Pill buttons, large type, radar graphic, honest "what it does not do" section. Verified computed colors in a real browser.
- **Real-browser tests** (headless Chrome over DevTools protocol, throwaway profile): `npm run smoke` (+`WORKER=1`) and `npm run e2e:browser`.
- Verified live: starting **Nox** in the browser works; Provider's view showed direct IP 103.179.194.51 vs Nox exit 98.92.70.228 (UA `Nox-Proxy/1.0`, no Referer); a scan of live Sepolia through Nox made 4 Anon-RPC reads, 0 direct, 2 counted bootstrap reads.
- Bugs found by browser tests and fixed: scan finishing before verification completed; Identity "Loading…" could hang if IndexedDB failed (now falls back with a message).
- Dev-server note: `next dev` doesn't hydrate under headless Chrome here; production builds do. Browser tests use production builds.
- Still manual: a real Sepolia payment from a funded wallet through MetaMask (Send tab), git history, deploy, demo video.
