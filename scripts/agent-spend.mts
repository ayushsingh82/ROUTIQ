// Agent spending demo on the Alt-Mempool devnet: the vault pays a registered provider through a paymaster-sponsored
// Frame Transaction, then an over-limit payment is rejected. Needs `node scripts/deploy-devnet.mts` first.
//   node scripts/agent-spend.mts [amountBaseUnits=250000] [feeBaseUnits=12000000]
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, defineChain, encodeFunctionData, http, parseAbi, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { profile } from "@forshtat/hegota-support/profiles/ethrex-eip8141-tracer";
import { frame, newTx, secp256k1Placeholder, signTx, txHash } from "@forshtat/hegota-support/tx";
import { toWire, rpc } from "@forshtat/hegota-support/rpc";

const EXEC = "https://altmempool.forshtat.com";
const SIDECAR = "https://altmempool.forshtat.com/rpc";
const chain = defineChain({ id: 1337, name: "devnet", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [EXEC] } } });
const pub = createPublicClient({ chain, transport: http(EXEC) });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const dep = JSON.parse(readFileSync("deployments/devnet.json", "utf8")) as Record<string, Address>;
const keys = JSON.parse(readFileSync(".data/devnet-keys.json", "utf8")) as { deployer: Hex; agent: Hex };
const deployer = privateKeyToAccount(keys.deployer);
const agentAddr = privateKeyToAccount(keys.agent).address;
const wallet = createWalletClient({ account: deployer, chain, transport: http(EXEC) });

const erc20 = parseAbi(["function mint(address,uint256)", "function balanceOf(address) view returns (uint256)"]);
const reg = parseAbi(["function register(address,bytes32,string)", "function isActive(address) view returns (bool)"]);
const vaultAbi = parseAbi(["function pay(address,uint256)", "function payFee(address,uint256)", "function remainingToday() view returns (uint256)", "function spentToday() view returns (uint256)"]);

const amount = BigInt(process.argv[2] ?? 250_000);
const fee = BigInt(process.argv[3] ?? 12_000_000);
const providerKeyFile = ".data/provider-payto.txt";
let provider: Address;
try { provider = readFileSync(providerKeyFile, "utf8").trim() as Address; } catch { provider = privateKeyToAccount(generatePrivateKey()).address; (await import("node:fs")).writeFileSync(providerKeyFile, provider); }

async function send(to: Address, data: Hex) {
  const h = await wallet.sendTransaction({ to, data, gas: 500_000n });
  const r = await pub.waitForTransactionReceipt({ hash: h });
  if (r.status !== "success") throw new Error("setup tx reverted " + h);
}
if (!(await pub.readContract({ address: dep.registry, abi: reg, functionName: "isActive", args: [provider] }))) {
  await send(dep.registry, encodeFunctionData({ abi: reg, functionName: "register", args: [provider, `0x${"11".repeat(32)}`, "https://provider.example/v1"] }));
  console.log("registered provider payTo", provider);
}
const bal = (a: Address) => pub.readContract({ address: dep.token, abi: erc20, functionName: "balanceOf", args: [a] });
if ((await bal(dep.vault)) < 30_000_000n) { await send(dep.token, encodeFunctionData({ abi: erc20, functionName: "mint", args: [dep.vault, 50_000_000n] })); console.log("minted 50 mUSDC to the vault"); }

async function submit(label: string, payAmount: bigint, payee: Address) {
  const nonce = BigInt(await rpc(EXEC, "eth_getTransactionCount", [dep.vault, "latest"]));
  const tx = await signTx(profile, newTx({
    chainId: 1337, sender: dep.vault, nonceSeq: nonce,
    fees: { maxFeePerGas: 2_000_000_000n },
    signatures: [secp256k1Placeholder(profile, agentAddr)],
    frames: [
      frame(profile, "VERIFY", { scope: "EXECUTION", execution: 600_000n }),
      frame(profile, "VERIFY", { target: dep.paymaster, scope: "PAYMENT", execution: 600_000n }),
      frame(profile, "SENDER", { target: dep.vault, execution: 200_000n, state: 400_000n, data: encodeFunctionData({ abi: vaultAbi, functionName: "pay", args: [payee, payAmount] }) }),
      frame(profile, "SENDER", { target: dep.vault, execution: 200_000n, state: 400_000n, data: encodeFunctionData({ abi: vaultAbi, functionName: "payFee", args: [dep.paymaster, fee] }) }),
    ],
  }), keys.agent);
  const hash = txHash(profile, tx);
  console.log(`\n[${label}] pay ${payAmount} -> ${payee}\n  hash ${hash}`);
  try { console.log("  submitted:", await rpc(SIDECAR, "eth_sendFrameTransaction", [toWire(tx)])); }
  catch (e) { console.log("  REJECTED:", (e as Error).message); return false; }
  for (let i = 0; i < 25; i++) {
    await sleep(3000);
    const st = await rpc(SIDECAR, "skandha_frameTransactionStatus", [hash]).catch(() => null);
    if (st?.status && ["OnChain", "Finalized", "Reverted", "Cancelled"].includes(st.status)) { console.log("  status:", st.status); return st.status !== "Reverted" && st.status !== "Cancelled"; }
  }
  console.log("  status: timeout"); return false;
}

const before = await bal(provider);
// A tiny per-run jitter keeps the tx hash unique: the sidecar remembers cancelled hashes and would not retry an identical tx.
const jitter = () => BigInt(Math.floor(Math.random() * 900) + 1);
let ok = await submit("within policy", amount + jitter(), provider);
if (!ok) ok = await submit("within policy (retry)", amount + jitter(), provider);
console.log("provider balance", before, "->", await bal(provider), "| vault spentToday", await pub.readContract({ address: dep.vault, abi: vaultAbi, functionName: "spentToday" }));
const over = await submit("over per-request cap", 600_000n, provider);
const stranger = privateKeyToAccount(generatePrivateKey()).address;
const unreg = await submit("unregistered provider", 100_000n, stranger);
console.log(`\nRESULT within-policy=${ok ? "PAID" : "FAILED"} over-cap=${over ? "ACCEPTED(bad)" : "rejected"} unregistered=${unreg ? "ACCEPTED(bad)" : "rejected"}`);
