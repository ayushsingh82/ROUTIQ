# ROUTIQ — Verified Findings (as of 2026-11-06)

Everything here was checked against the real docs, packages or live endpoints, not assumed. Items marked **UNVERIFIED** must be tested before we rely on them.

## 1. Frame Transactions / Alternative Mempool devnet

Source: https://docs.altmempool.wtf (Public devnet, Submit a Frame Transaction, Staking, RPC methods, Storage rules, Differences), `forshtat/mempool-workshop`, `forshtat/mempool-workshop-sidecar`. Docs are marked "generated from source code using AI"; treat conflicts as TBD.

| Fact | Value | Status |
|---|---|---|
| Chain | **chain ID 1337 (0x539)** — its own throwaway devnet, **not Sepolia**. May be reset at any time; no persistence guarantee | live-verified (`eth_chainId`) |
| Execution RPC (ethrex fork) | `https://altmempool.forshtat.com` (CORS open, POST JSON-RPC) | live-verified |
| Sidecar / Alt Mempool RPC | `https://altmempool.forshtat.com/rpc` and gateway `https://altmempoolgateway.forshtat.com/rpc` (both answer, `skandha/v4.1.1`) | live-verified |
| Client build | `ethrex/v23.0.0-eip8141-tracer-9aa3645d…` | live-verified |
| Block time | ~6 s | docs |
| Frame tx submit | `eth_sendFrameTransaction [tx]` on `/rpc` (JSON form). Returns `keccak256(0x06 ‖ rlp(tx))` | docs |
| Follow | `skandha_frameTransactionStatus [hash]` → New/Pending/Submitted/OnChain/Finalized/Cancelled/Reverted; `eth_getFrameTransactionReceipt` (per-frame receipts) | docs |
| Dry run | `eth_estimateFrameTransactionGas` (sidecar); `ethrex_simulateFrameTransaction [rawTx, block?, {trace}]` (ethrex, takes RLP not JSON) | docs |
| Canonical mempool | type `0x06` via `eth_sendRawTransaction` (ethrex's own stricter rules) | docs |
| Frames | `mode`: DEFAULT 0, VERIFY 1 (static, must call APPROVE), SENDER 2. `flags` bits 0-1 = approve scope (1 payment, 2 execution, 3 both), bit 2 = atomic batch. `target:null` ⇒ tx.sender | docs |
| Signatures | scheme 0 ARBITRARY, 1 SECP256K1, 2 P256; secp256k1 packed `<y-parity 1B><r><s>`; `signer:"0x"` ⇒ tx.sender | docs |
| Admitted prefix shapes | `[self_verify]`, `[deploy, self_verify]`, `[only_verify, pay]`, `[deploy, only_verify, pay]` (+ optional `expiry_verify`; ERC-8421 allows one `pre_verify` before each approving frame) | docs |
| Gas | resource model: execution and state gas limited **per frame**; creating an account needs a non-zero `state` limit (else silent failure). Plain transfer to a *new* account ≥ ~204,600 gas. Contract deploy `gasLimit` 6,000,000 works (900k reverted) | docs/workshop |
| Fees (workshop) | `maxFeePerGas` 2 gwei; legacy gas price 0.002 gwei (base fee ~7 wei) | workshop config |
| Funding | `skandha_explorer_faucet [address]` on the gateway returns a tx hash and 1 ETH (once per hour per address). The docs' "no faucet" statement is stale | **live-verified** |
| Staking registry | `NaiveStakingRegistry` `0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f`; `addStake(86400)` with value; devnet `minStake` 0.01 ETH (live `skandha_config`); registry keys on `msg.sender`, so a contract entity must stake itself (a SENDER frame calling `addStake` makes the wallet the staker) | live+docs |
| Sentinel entry point | `0x00000000000000000000000000000000000000aa` | live `skandha_config` |

### What needs the *Alternative* mempool (our Track-2 argument)

Storage rules (STORAGE-0xx): a sender may always touch **its own** storage (010); touching storage of **other** contracts during validation is rejected by the canonical mempool and by the alt mempool while unstaked; a **staked** entity gets read-only access to other contracts' storage (032) and write access to slots associated with itself (033). Use-cases doc explicitly lists *stateful paymasters (quotas, subscriptions, credits)* and *keystore contracts*.

**Design consequence:** the spending account's VERIFY frame reads the **ProviderRegistry** (another contract) to confirm the payee is an *active registered provider*. That external-storage read is rejected by the canonical mempool and admitted by the alt mempool once the account is staked. Per-request cap and daily quota live in the account's *own* storage (always allowed). This is a genuine reason for the Alt Mempool, mirroring the workshop's "violating wallet" steps 6→8.

### Opcode availability on the 1337 devnet (`ERC8421_WORKSHOP` profile)

From `@forshtat/hegota-support` README: **verified on the devnet:** `APPROVE`, `SIGPARAM`. **From the EIP text only (may differ from the client):** `TXPARAM`, `FRAMEDATALOAD`, `FRAMEDATACOPY`, `FRAMEPARAM`, `SIGDATACOPY`.
→ **UNVERIFIED and high-risk:** reading the SENDER frame's calldata (`framedatacopy`) and value (`frameparam`) inside the VERIFY frame to enforce per-request/quota policy. **Must be probed on the live devnet first.** Fallback designs if it fails: (a) policy keyed to the signature `msg`/owner approvals, (b) a `pre_verify` frame performing the state write, (c) enforce quota in the SENDER frame (revert on violation) and use the VERIFY-frame read of the registry for the Alt-Mempool-specific part.

### Tooling

- `@forshtat/hegota-support@0.0.1` (MIT, Alex Forshtat): `…/tx` (build, sign, encode, decode, `sigHash`, `toWire`), `…/rpc`, `…/contracts/HegotaSupport.sol` (opcodes as Solidity functions via per-contract Yul helpers; wallets are `fallback()`-based VERIFY handlers). Profile `ethrex-eip8141-tracer` = chain 1337. **Installing it was blocked by the permission system; needs the user's explicit approval** (see plan).
- `forge`/`anvil` installed locally (`~/.foundry/bin`). Forge/Hardhat simulated chains do **not** know the frame opcodes: opcode behaviour is only testable on the devnet.
- The workshop repo has **no LICENSE file**; do not copy its code. The npm package above is MIT.

## 2. Anon-RPC

Source: https://ethereum.github.io/anon-rpc/, repo, npm (already integrated and live-tested earlier in this project).

| Fact | Value |
|---|---|
| Package | `@anon-rpc/browser-harness@0.4.0` (2026-10-28, MIT, browser-only). `AnonRpcWorker({address, config?, preExisting:{rpcProvider}})`, `.ready`, `.fetch`, `.close()`; per-call `anonOptions:{isolationKey}` (support varies) |
| Genuine networks | Nox `0x35133267…7A9A` (specifier on **Sepolia**, chain 11155111), tor-js `0x700dA319…659e` (mainnet specifier; needs `gateways`), Nym `0x3aCD9742…0eD0`. **Passthrough `0x4fd77be3…8d27` is `kind:"reference"` — not anonymising** |
| Bootstrap | One non-anonymised read of the specifier contract via a normal RPC. We count it separately |
| Worker `fetch(url)` | fetches **any https URL** from the exit side ⇒ it can carry reads to the 1337 devnet RPC `https://altmempool.forshtat.com` **(verified: Nox read the devnet in a real browser — see `DEVNET_RESEARCH.md`)** |
| Browser-only | The worker runs in the browser (null-origin iframe, WebRTC for KPS). Server-side code cannot use it ⇒ **backend-originated reads are NOT private**; only browser (user-originated) reads are. We keep these two paths separate and label them. |
| Live-verified earlier | Nox starts in headless Chrome; Provider's-view showed different IPs direct vs Nox; scan of live Sepolia via Nox: 5 reads via Anon-RPC, 0 direct, 2 bootstrap |

## 3. Routstr (inspiration, https://docs.routstr.com)

- "Decentralized protocol for permissionless AI inference… marketplace… Bitcoin eCash (Cashu)." Base URL `https://api.routstr.com/v1`; auth `Authorization: Bearer sk-…` or Cashu token / `X-Cashu` header. OpenAI-compatible `/v1/chat/completions` (+ embeddings, models, "decisions"); wallet management, rate limiting.
- **Discovery:** Nostr as a decentralised directory; providers publish **kind 38421** advertisements (URL, models, pricing), re-announced every 24 h; clients query relays; optional Tor `.onion` endpoints.
- Sessions funded by eCash with top-up/refund flow; per-node dashboard, pricing margins, team ("remote node") deployments.
- **Our mapping:** Nostr → *Ethereum ProviderRegistry + signed manifests*; eCash sessions → *prefunded smart-account session budget*; Tor hidden service → *Anon-RPC for the read path*. We do not copy Routstr's code, branding or Bitcoin/Cashu design.

## 4. Local environment constraints

- Node 24, Foundry present, **Ollama installed** (`/opt/homebrew/bin/ollama`); `smollm2:135m` (270 MB) being pulled as the *one real, free, local inference provider*. No Groq/Together/OpenAI keys are present — those adapters are implemented but only activate when the user provides keys.
- **Disk is nearly full** (≈0.7–1 GB free, fluctuating because other tools write to the same volume). Avoid large downloads; build caches are cleared as needed.

## 5. Open questions to resolve by testing (ordered by risk)

1. Do `FRAMEDATACOPY` / `FRAMEPARAM` / `TXPARAM` work inside a VERIFY frame on the live devnet? (blocks the policy-in-validation design)
2. ~~Is the faucet available?~~ **Yes** (verified).
3. ~~Can the Nox exit reach `altmempool.forshtat.com`?~~ **Yes** (verified).
4. Does a staked self-relay account reading `ProviderRegistry` storage get admitted by the alt mempool (and rejected canonically)?
5. Devnet stability: it has been reset recently (block ~100); registry deployments must be re-runnable via a script.
