// Stakes the paymaster (owner call) and the vault (self-relay Frame Tx whose SENDER frame calls stakeSelf) in the
// Alt-Mempool staking registry. Staked entities may read other contracts' storage during validation.
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, defineChain, encodeFunctionData, http, parseAbi, parseEther, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { profile } from "@forshtat/hegota-support/profiles/ethrex-eip8141-tracer";
import { frame, newTx, secp256k1Placeholder, signTx, txHash } from "@forshtat/hegota-support/tx";
import { toWire, rpc } from "@forshtat/hegota-support/rpc";

const EXEC = "https://altmempool.forshtat.com", SIDECAR = "https://altmempool.forshtat.com/rpc";
const chain = defineChain({ id: 1337, name: "devnet", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [EXEC] } } });
const pub = createPublicClient({ chain, transport: http(EXEC) });
const dep = JSON.parse(readFileSync("deployments/devnet.json", "utf8")) as Record<string, Address>;
const keys = JSON.parse(readFileSync(".data/devnet-keys.json", "utf8")) as { deployer: Hex; agent: Hex };
const wallet = createWalletClient({ account: privateKeyToAccount(keys.deployer), chain, transport: http(EXEC) });
const agentAddr = privateKeyToAccount(keys.agent).address;
const STAKE = parseEther("0.012");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const stakeInfo = (a: Address) => rpc(EXEC, "eth_call", [{ to: dep.staking, data: "0x" + "00".repeat(0) }, "latest"]).catch(() => null);
void stakeInfo;

const pm = await wallet.writeContract({ address: dep.paymaster, abi: parseAbi(["function stake(address,uint256)"]), functionName: "stake", args: [dep.staking, STAKE], gas: 500_000n });
console.log("paymaster stake tx", (await pub.waitForTransactionReceipt({ hash: pm })).status);

const nonce = BigInt(await rpc(EXEC, "eth_getTransactionCount", [dep.vault, "latest"]));
const tx = await signTx(profile, newTx({
  chainId: 1337, sender: dep.vault, nonceSeq: nonce, fees: { maxFeePerGas: 2_000_000_000n },
  signatures: [secp256k1Placeholder(profile, agentAddr)],
  frames: [
    frame(profile, "VERIFY", { scope: "EXECUTION_AND_PAYMENT", execution: 600_000n }),
    frame(profile, "SENDER", { target: dep.vault, execution: 300_000n, state: 400_000n, data: encodeFunctionData({ abi: parseAbi(["function stakeSelf(uint256)"]), functionName: "stakeSelf", args: [STAKE] }) }),
  ],
}), keys.agent);
const hash = txHash(profile, tx);
try { console.log("vault stake submitted", await rpc(SIDECAR, "eth_sendFrameTransaction", [toWire(tx)])); } catch (e) { console.log("REJECTED:", (e as Error).message); process.exit(1); }
for (let i = 0; i < 25; i++) { await sleep(3000); const s = await rpc(SIDECAR, "skandha_frameTransactionStatus", [hash]).catch(() => null); if (s?.status && ["OnChain", "Finalized", "Reverted", "Cancelled"].includes(s.status)) { console.log("status", s.status); break; } }
console.log("staking registry balance:", await pub.getBalance({ address: dep.staking }));
