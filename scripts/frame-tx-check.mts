// First real EIP-8141 Frame Transaction on the Alt-Mempool devnet: EOA self-relay (VERIFY + SENDER transfer).
// Throwaway key, devnet only. Run: node scripts/frame-tx-check.mts
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { profile } from "@forshtat/hegota-support/profiles/ethrex-eip8141-tracer";
import { frame, newTx, secp256k1Placeholder, signTx, encodeTx, txHash } from "@forshtat/hegota-support/tx";
import { toWire, rpc } from "@forshtat/hegota-support/rpc";

const EXEC = "https://altmempool.forshtat.com";
const SIDECAR = process.env.SIDECAR ?? "https://altmempool.forshtat.com/rpc";
const GATEWAY = "https://altmempoolgateway.forshtat.com/rpc";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const pk = generatePrivateKey();
const acct = privateKeyToAccount(pk);
const to = privateKeyToAccount(generatePrivateKey()).address;
console.log("sender", acct.address, "recipient", to);

console.log("faucet ->", await rpc(GATEWAY, "skandha_explorer_faucet", [acct.address]));
for (let i = 0; i < 12; i++) {
  const b = BigInt(await rpc(EXEC, "eth_getBalance", [acct.address, "latest"]));
  if (b > 0n) { console.log("funded", b.toString()); break; }
  await sleep(3000);
}

const nonce = BigInt(await rpc(EXEC, "eth_getTransactionCount", [acct.address, "latest"]));
const tx = await signTx(profile, newTx({
  chainId: 1337, sender: acct.address, nonceSeq: nonce,
  fees: { maxFeePerGas: 2_000_000_000n },
  signatures: [secp256k1Placeholder(profile)],
  frames: [
    frame(profile, "VERIFY", { scope: "EXECUTION_AND_PAYMENT", execution: 100_000n }),
    frame(profile, "SENDER", { target: to, execution: 50_000n, state: 300_000n, value: 1_000_000_000_000n }),
  ],
}), pk);
const hash = txHash(profile, tx);
console.log("tx hash", hash, "raw bytes", (encodeTx(profile, tx).length - 2) / 2);

try {
  const sent = await rpc(SIDECAR, "eth_sendFrameTransaction", [toWire(tx)]);
  console.log("submitted via sidecar:", sent);
} catch (e) { console.log("SUBMIT FAILED:", (e as Error).message); process.exit(1); }

for (let i = 0; i < 20; i++) {
  await sleep(3000);
  const st = await rpc(SIDECAR, "skandha_frameTransactionStatus", [hash]).catch((e: Error) => "err " + e.message);
  console.log("status:", typeof st === "string" ? st : JSON.stringify(st));
  if (/OnChain|Finalized|Reverted|Cancelled/.test(JSON.stringify(st))) break;
}
const bal = BigInt(await rpc(EXEC, "eth_getBalance", [to, "latest"]));
console.log("recipient balance:", bal.toString(), bal > 0n ? "PASS" : "NOT RECEIVED");
