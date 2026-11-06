# Devnet research — Frame Transactions / Alternative Mempool

Verified on **2026-11-06** against the live devnet and the primary documentation. Each row states how it was verified.
"UNVERIFIED" items are not relied on by any shipped feature.

## Sources

- EIP-8141 Frame Transactions — https://eips.ethereum.org/EIPS/eip-8141
- Alternative Mempools docs — https://docs.altmempool.wtf/ (Public devnet, Submit a Frame Transaction, Staking, RPC methods, Storage rules, Differences)
- Workshop + sidecar — https://github.com/forshtat/mempool-workshop · https://github.com/forshtat/mempool-workshop-sidecar
- Support library (MIT) — `@forshtat/hegota-support` (frame codec + opcodes-as-Solidity)
- Anon-RPC — https://ethereum.github.io/anon-rpc/ · https://github.com/ethereum/anon-rpc

> The docs state they are "generated from source code using AI"; where sources disagree they mark `(TBD)`. We treat live behaviour as the tie-breaker.

## Network

| Item | Value | Verified by |
|---|---|---|
| Chain ID | `1337` (`0x539`) — a throwaway devnet, **not** Sepolia | live `eth_chainId` on all three endpoints |
| Execution RPC (ethrex fork) | `https://altmempool.forshtat.com` — `ethrex/v23.0.0-eip8141-tracer-9aa3645d…` | live `web3_clientVersion` |
| Sidecar / Alt-Mempool RPC | `https://altmempool.forshtat.com/rpc` and gateway `https://altmempoolgateway.forshtat.com/rpc` — `skandha/v4.1.1` | live |
| Block time | ~6 s | docs; blocks advance during testing |
| Faucet | `skandha_explorer_faucet [address]` on the gateway → 1 ETH (workshop says once per hour per address). **The docs' "no faucet" statement is stale.** | live call returned a tx hash and `1000000000000000000` |
| Explorer | https://explorer.altmempool.wtf/ | link only |
| Entry point sentinel | `0x00000000000000000000000000000000000000aa` | live `skandha_config` |
| Sidecar `minStake` / `minUnstakeDelay` | 0.01 ETH / 0 | live `skandha_config` |
| Staking registry (`NaiveStakingRegistry`) | `0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f`, **1259 bytes of code** | live `eth_getCode`, **read through Anon-RPC** |

## Transaction format (from the docs; JSON form sent to the sidecar)

- Submit: `eth_sendFrameTransaction [tx]` on the sidecar. The result is `keccak256(0x06 ‖ rlp(tx))`. A rejected tx returns no hash.
- Follow: `skandha_frameTransactionStatus [hash]` → `New | Pending | Submitted | OnChain | Finalized | Cancelled | Reverted`; `eth_getFrameTransactionReceipt` (per-frame receipts).
- Dry run: `eth_estimateFrameTransactionGas` (sidecar); `ethrex_simulateFrameTransaction [rawTx, block?, {trace}]` (ethrex, takes the RLP form).
- A frame: `{mode, flags, target, limits:{execution,state}, value, data}`. Modes `DEFAULT 0`, `VERIFY 1` (static, must `APPROVE`), `SENDER 2`. Flag bits 0-1 = approved scope (1 payment, 2 execution, 3 both), bit 2 = atomic batch. `target: null` ⇒ `tx.sender`.
- Signatures: `scheme` `0 ARBITRARY | 1 SECP256K1 | 2 P256`; secp256k1 is packed `<y-parity 1B><r><s>`; `signer: "0x"` ⇒ `tx.sender`.
- Admitted validation-prefix shapes: `[self_verify]`, `[deploy, self_verify]`, `[only_verify, pay]`, `[deploy, only_verify, pay]`, optional `expiry_verify`; ERC-8421 additionally allows one `pre_verify` frame before each approving frame.
- Gas: execution and state gas are limited **per frame**; creating an account needs a non-zero `state` limit. A plain transfer to a new account needs ≥ ~204,600 gas; contract creation worked with a 6,000,000 limit (900k reverted).
- A freshly created contract account starts at nonce 1. Fund a paymaster through the `value` of its CREATE (a later plain transfer would run its fallback, which calls APPROVE outside a frame and halts).

## What the Alternative Mempool admits that the canonical one does not (our Track-B argument)

Storage rules (docs, `STORAGE-0xx`): a sender may always read/write its **own** storage; storage of **other** contracts during validation is rejected by the canonical mempool and by the alt mempool while unstaked; a **staked** entity gets read-only access to other contracts' storage (`STORAGE-032`) and write access to slots associated with itself (`STORAGE-033`). The "use cases" page explicitly lists *stateful paymasters (quotas, subscriptions, credits)*.

**Design consequence:** the spending account's VERIFY frame reads `ProviderRegistry` (another contract) to confirm the payee is an active provider. That external read is the part that needs the Alt Mempool and a staked sender. Per-request cap and daily quota live in the account's own storage.

## Opcode availability on this devnet

| Opcode | Status |
|---|---|
| `APPROVE`, `SIGPARAM` | verified on the devnet by the support library's authors |
| `TXPARAM`, `FRAMEPARAM`, `FRAMEDATALOAD`, `FRAMEDATACOPY`, `SIGDATACOPY` | **UNVERIFIED** — from the EIP text; may differ from the client |
| `pre_verify` frames | described by ERC-8421; whether this devnet build admits them is **UNVERIFIED** |

The planned policy check reads the SENDER frame's calldata/value inside the VERIFY frame, so it depends on `FRAMEPARAM`/`FRAMEDATACOPY`. **This must be probed first.** Fallbacks: enforce the cap in the SENDER frame (revert on violation) and keep only the registry check in VERIFY; or use a `pre_verify` frame for the quota write.

## Anon-RPC → devnet (verified in a real browser)

Starting the Nox network from the Privacy Center and reading the devnet through it worked: `eth_blockNumber` → block 1478 in 3.7 s, `eth_getCode` of the staking registry, and `skandha_config` from the sidecar, with **2 anonymised reads, 0 direct reads, 2 bootstrap reads** counted. So the exit nodes can reach `altmempool.forshtat.com`. Reproduce: `npm run build && npx next start -p 3101 && npm run check:anon`.

## Open items

1. Probe `FRAMEPARAM`/`FRAMEDATACOPY`/`TXPARAM` and `pre_verify` on the live devnet. 2. First real Frame Transaction (EOA self-relay, then a contract account). 3. Deploy `ProviderRegistry`, vault and paymaster; stake the account. 4. The devnet can be reset at any time: every deployment must be re-runnable from a script.
