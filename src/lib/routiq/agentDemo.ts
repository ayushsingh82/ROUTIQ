// Live Frame Transaction demo for the Agent page. Server-side only: signs with a throwaway DEVNET agent key
// (ROUTIQ_DEMO_AGENT_KEY, or .data/devnet-keys.json locally) and submits through the Alt-Mempool sidecar.
import { readFileSync } from "node:fs";
import { decodeErrorResult, encodeFunctionData, parseAbi, type Address, type Hex } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { profile } from "@forshtat/hegota-support/profiles/ethrex-eip8141-tracer";
import { frame, newTx, secp256k1Placeholder, signTx, txHash } from "@forshtat/hegota-support/tx";
import { toWire, rpc } from "@forshtat/hegota-support/rpc";
import dep from "../../../deployments/devnet.json";

const EXEC = process.env.NEXT_PUBLIC_ROUTIQ_RPC_URL ?? "https://altmempool.forshtat.com";
const SIDECAR = process.env.NEXT_PUBLIC_ROUTIQ_SIDECAR_RPC_URL ?? "https://altmempool.forshtat.com/rpc";
const vaultAbi = parseAbi(["function pay(address,uint256)", "function payFee(address,uint256)"]);
const policyErr = parseAbi(["error Policy(string reason)", "error Rejected(string reason)"]);

export type DemoKind = "pay" | "over-cap" | "unregistered";
export interface DemoResult {
  kind: DemoKind;
  accepted: boolean;
  status: string;
  hash: string;
  reason?: string;
  amount: string;
  payee: string;
  note: string;
}

function agentKey(): Hex | null {
  const env = process.env.ROUTIQ_DEMO_AGENT_KEY;
  if (env && /^0x[0-9a-fA-F]{64}$/.test(env)) return env as Hex;
  try {
    return (JSON.parse(readFileSync(".data/devnet-keys.json", "utf8")) as { agent: Hex }).agent;
  } catch {
    return null;
  }
}
export const demoAvailable = () => agentKey() !== null;

function explain(message: string): string {
  const m = /reverted with data (0x[0-9a-fA-F]+)/.exec(message);
  if (m) {
    try {
      const d = decodeErrorResult({ abi: policyErr, data: m[1] as Hex });
      return `${d.errorName}: ${(d.args as readonly string[])[0]}`;
    } catch {
      /* fall through */
    }
  }
  return message.replace(/^RpcError: /, "").slice(0, 240);
}

let last = 0;
export async function runDemo(kind: DemoKind): Promise<DemoResult> {
  const key = agentKey();
  if (!key) throw new Error("Demo agent key is not configured (set ROUTIQ_DEMO_AGENT_KEY to a throwaway devnet key).");
  if (Date.now() - last < 4000) throw new Error("Slow down — one demo transaction at a time.");
  last = Date.now();

  const vault = dep.vault as Address;
  const registered = (dep as { provider?: string }).provider as Address;
  const payee = kind === "unregistered" ? privateKeyToAccount(generatePrivateKey()).address : registered;
  const amount = kind === "over-cap" ? 600_000n : BigInt(100_000 + Math.floor(Math.random() * 90_000));
  const signer = privateKeyToAccount(key).address;
  const nonce = BigInt(await rpc(EXEC, "eth_getTransactionCount", [vault, "latest"]));

  const tx = await signTx(
    profile,
    newTx({
      chainId: 1337,
      sender: vault,
      nonceSeq: nonce,
      fees: { maxFeePerGas: 2_000_000_000n },
      signatures: [secp256k1Placeholder(profile, signer)],
      frames: [
        frame(profile, "VERIFY", { scope: "EXECUTION", execution: 600_000n }),
        frame(profile, "VERIFY", { target: dep.paymaster as Address, scope: "PAYMENT", execution: 600_000n }),
        frame(profile, "SENDER", { target: vault, execution: 200_000n, state: 400_000n, data: encodeFunctionData({ abi: vaultAbi, functionName: "pay", args: [payee, amount] }) }),
        frame(profile, "SENDER", { target: vault, execution: 200_000n, state: 400_000n, data: encodeFunctionData({ abi: vaultAbi, functionName: "payFee", args: [dep.paymaster as Address, 20_000_000n] }) }),
      ],
    }),
    key,
  );
  const hash = txHash(profile, tx);
  const base = { kind, hash, amount: (Number(amount) / 1e6).toFixed(6), payee };
  try {
    await rpc(SIDECAR, "eth_sendFrameTransaction", [toWire(tx)]);
  } catch (e) {
    return { ...base, accepted: false, status: "Rejected", reason: explain((e as Error).message), note: "Rejected during validation, before inclusion. No gas was spent and no funds moved." };
  }
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const st = (await rpc(SIDECAR, "skandha_frameTransactionStatus", [hash]).catch(() => null)) as { status?: string; reason?: string } | null;
    if (st?.status && ["OnChain", "Finalized", "Reverted", "Cancelled"].includes(st.status)) {
      const ok = st.status === "OnChain" || st.status === "Finalized";
      return { ...base, accepted: ok, status: st.status, reason: st.reason, note: ok ? "Included on-chain. Gas was sponsored by the paymaster and repaid in mUSDC." : "Not included." };
    }
  }
  return { ...base, accepted: false, status: "Pending", note: "Still pending after 36 s; check the status by hash." };
}
