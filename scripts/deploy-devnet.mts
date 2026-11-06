// Deploys MockUSDC, ProviderRegistry, TokenPaymaster and AgentBudgetVault to the Alt-Mempool devnet (chain 1337).
// Keys are throwaway and stay in .data/devnet-keys.json (gitignored). Addresses go to deployments/devnet.json.
//   forge build && node scripts/deploy-devnet.mts
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createPublicClient, createWalletClient, defineChain, http, parseEther, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { rpc } from "@forshtat/hegota-support/rpc";

const EXEC = "https://altmempool.forshtat.com";
const GATEWAY = "https://altmempoolgateway.forshtat.com/rpc";
const chain = defineChain({ id: 1337, name: "Alt-Mempool devnet", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [EXEC] } } });
const pub = createPublicClient({ chain, transport: http(EXEC) });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

mkdirSync(".data", { recursive: true });
const KEYS = ".data/devnet-keys.json";
const keys: { deployer: Hex; agent: Hex } = existsSync(KEYS) ? JSON.parse(readFileSync(KEYS, "utf8")) : { deployer: generatePrivateKey(), agent: generatePrivateKey() };
writeFileSync(KEYS, JSON.stringify(keys, null, 2));
const deployer = privateKeyToAccount(keys.deployer);
const agent = privateKeyToAccount(keys.agent);
const wallet = createWalletClient({ account: deployer, chain, transport: http(EXEC) });

if ((await pub.getBalance({ address: deployer.address })) < parseEther("0.2")) {
  console.log("faucet ->", await rpc(GATEWAY, "skandha_explorer_faucet", [deployer.address]));
  for (let i = 0; i < 15 && (await pub.getBalance({ address: deployer.address })) === 0n; i++) await sleep(3000);
}
console.log("deployer", deployer.address, "agent", agent.address);

const art = (n: string) => JSON.parse(readFileSync(`contracts/out/${n}.sol/${n}.json`, "utf8")) as { abi: never; bytecode: { object: Hex } };
async function deploy(name: string, args: unknown[] = [], value = 0n) {
  const a = art(name);
  const hash = await wallet.deployContract({ abi: a.abi, bytecode: a.bytecode.object, args, value, gas: 12_000_000n });
  const r = await pub.waitForTransactionReceipt({ hash, timeout: 90_000 });
  if (r.status !== "success" || !r.contractAddress) throw new Error(`${name} deploy failed: ${hash}`);
  console.log(name.padEnd(18), r.contractAddress, `(gas ${r.gasUsed})`);
  return r.contractAddress;
}

const token = await deploy("MockUSDC");
const registry = await deploy("ProviderRegistry");
const paymaster = await deploy("TokenPaymaster", [deployer.address, token, 3_000_000_000n], parseEther("0.15")); // 3000 mUSDC per ETH
const STAKING = "0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f";
const vault = await deploy("AgentBudgetVault", [agent.address, token, registry, paymaster, STAKING, 500_000n, 2_000_000n], parseEther("0.05")); // cap 0.50, daily 2.00 mUSDC

const out = { chainId: 1337, staking: STAKING, token, registry, paymaster, vault, agent: agent.address, deployer: deployer.address, deployedAt: new Date().toISOString() };
writeFileSync("deployments/devnet.json", JSON.stringify(out, null, 2) + "\n");
console.log("wrote deployments/devnet.json");
