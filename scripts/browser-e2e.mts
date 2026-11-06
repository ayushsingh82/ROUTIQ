// Full payment flow THROUGH THE REAL UI in headless Chrome, against an anvil fork of Sepolia.
//   npm run e2e:browser
//
// - builds a TEST-ONLY bundle (.next-e2e) whose chain RPC is the local fork (NEXT_PUBLIC_RPC_OVERRIDE)
// - browser: create identity in the real app (real IndexedDB + PBKDF2/AES-GCM vault)
// - node: send a real stealth payment + announcement through the real Announcer contract
// - browser: scan (explicit DIRECT mode — exit nodes can't reach localhost), see the verified payment in the inbox
// Anon-RPC routing itself is covered by `WORKER=1 npm run smoke` against live Sepolia.

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { generateStealthAddress, toHex } from "../src/lib/crypto/stealth.ts";
import { encodeEthMetadata } from "../src/lib/erc5564/metadata.ts";
import { ANNOUNCER_ABI, ANNOUNCER_ADDRESS } from "../src/lib/erc5564/constants.ts";
import { launch, type Page } from "./lib/cdp.mts";

const ANVIL_PORT = 8546;
const APP_PORT = 3102;
const RPC = `http://127.0.0.1:${ANVIL_PORT}`;
const FORK = process.env.FORK_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
const DEV_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // anvil's public dev key #0
const SHOTS = process.env.SHOTS ?? "";
const PW = "correct horse battery";
const children: ChildProcess[] = [];
let failures = 0;

const ok = (m: string) => console.log(`  ✔ ${m}`);
async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    ok(name);
  } catch (e) {
    failures++;
    console.log(`  ✖ ${name}\n      ${e instanceof Error ? e.message : e}`);
  }
}
const until = (p: Page, text: string, ms = 20000) =>
  p.waitFor(`document.body.innerText.toLowerCase().includes(${JSON.stringify(text.toLowerCase())})`, ms, `text "${text}"`);
const stat = (p: Page, label: string) =>
  p.eval<string>(`[...document.querySelectorAll('div')].find(d => d.children.length === 0 && d.textContent === ${JSON.stringify(label)} && d.getClientRects().length > 0)?.nextElementSibling?.textContent ?? ''`);
const eq = (a: unknown, b: unknown, msg: string) => {
  if (a !== b) throw new Error(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
};

async function cleanup() {
  for (const c of children) c.kill();
}
process.on("exit", () => children.forEach((c) => c.kill()));

try {
  console.log("Browser E2E (real UI + anvil fork of Sepolia)");

  // --- chain: anvil fork, a few blocks behind head (public RPCs are load balanced)
  const head = BigInt(
    ((await (await fetch(FORK, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }) })).json()) as { result: string }).result,
  );
  const anvilBin = process.env.ANVIL ?? `${process.env.HOME}/.foundry/bin/anvil`;
  children.push(spawn(anvilBin, ["--fork-url", FORK, "--fork-block-number", (head - 40n).toString(), "--port", String(ANVIL_PORT), "--chain-id", "11155111", "--silent"], { stdio: "ignore" }));
  const chain = createPublicClient({ chain: sepolia, transport: http(RPC) });
  for (let i = 0; i < 60; i++) {
    try {
      await chain.getBlockNumber();
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  ok("anvil fork up");

  // --- app: test-only production bundle pointing at the fork
  const env = { ...process.env, NEXT_DIST_DIR: ".next-e2e", NEXT_PUBLIC_RPC_OVERRIDE: RPC };
  const build = spawnSync("npx", ["next", "build"], { env, stdio: "pipe", encoding: "utf8" });
  if (build.status !== 0) throw new Error(`test build failed:\n${build.stdout}\n${build.stderr}`);
  children.push(spawn("npx", ["next", "start", "-p", String(APP_PORT)], { env, stdio: "ignore" }));
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${APP_PORT}/`)).ok) break;
    } catch {
      /* starting */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  ok("test bundle serving");

  const BASE = `http://127.0.0.1:${APP_PORT}`;
  const p = await launch();
  let meta = "";

  await step("UI: create identity", async () => {
    await p.goto(BASE + "/app");
    await p.waitFor("Object.keys(document.querySelector('nav button')).some(k=>k.startsWith('__react'))", 20000, "hydration");
    await p.click("Identity");
    await until(p, "Create stealth identity");
    await p.type('input[placeholder="Password (min 8 chars)"]', PW);
    await p.type('input[placeholder="Repeat password"]', PW);
    await p.click("Generate identity");
    await until(p, "Your stealth meta-address", 30000);
    meta = await p.eval<string>("[...document.querySelectorAll('div.font-mono')].map(e=>e.textContent).find(t=>t.startsWith('st:eth:0x'))");
    if (!/^st:eth:0x[0-9a-f]{132}$/.test(meta)) throw new Error(`bad meta ${meta}`);
  });

  const wallet = createWalletClient({ account: privateKeyToAccount(DEV_KEY), chain: sepolia, transport: http(RPC) });
  const amount = parseEther("0.25");
  await step("chain: real stealth payment + announcement, plus an UNFUNDED announcement", async () => {
    const g = generateStealthAddress(meta);
    const t = await wallet.sendTransaction({ to: g.stealthAddress, value: amount });
    await chain.waitForTransactionReceipt({ hash: t });
    const a = await wallet.writeContract({ address: ANNOUNCER_ADDRESS, abi: ANNOUNCER_ABI, functionName: "announce", args: [1n, g.stealthAddress, toHex(g.ephemeralPublicKey), encodeEthMetadata(g.viewTag, amount)] });
    await chain.waitForTransactionReceipt({ hash: a });
    const e = generateStealthAddress(meta);
    const b = await wallet.writeContract({ address: ANNOUNCER_ADDRESS, abi: ANNOUNCER_ABI, functionName: "announce", args: [1n, e.stealthAddress, toHex(e.ephemeralPublicKey), encodeEthMetadata(e.viewTag, parseEther("1"))] });
    await chain.waitForTransactionReceipt({ hash: b });
  });

  await step("UI: scanning is blocked in private mode with no worker, then allowed only after explicit Direct opt-in", async () => {
    await p.click("Scan & Inbox");
    await until(p, "Start an Anon-RPC worker first");
    eq(await p.eval<boolean>("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Start scan')).disabled"), true, "scan disabled (fail closed)");
    await p.click("Privacy");
    await p.click("Direct (no anonymity)");
    await p.click("Scan & Inbox");
    await until(p, "DIRECT mode: scans are NOT anonymized");
    await p.waitFor("![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Start scan')).disabled", 5000, "scan enabled in direct mode");
  });

  await step("UI: scan finds the payment; inbox shows VERIFIED 0.25 ETH and the unfunded one as UNVERIFIED", async () => {
    await p.click("Start scan");
    await p.waitFor("document.body.innerText.toLowerCase().includes('full matches') && [...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Start scan')", 90000, "scan finished");
    await until(p, "0.25 ETH");
    eq(await stat(p, "Payments found"), "2", "payments found");
    eq(await stat(p, "Verified received"), "0.25 ETH", "verified total (unfunded announcement must not count)");
    const text = await p.eval<string>("document.body.innerText");
    if (!/verified/i.test(text) || !/unverified/i.test(text)) throw new Error("expected both verified and unverified badges");
    if (!/~1(\.0+)? ETH \(unverified\)/i.test(text)) throw new Error("unfunded announcement should show as ~1 ETH (unverified)");
    if (SHOTS) await p.screenshot(`${SHOTS}/inbox.png`);
  });

  await step("UI: rescan is idempotent (no duplicate payments)", async () => {
    await p.click("Start scan");
    await p.waitFor("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Start scan')", 60000, "rescan finished");
    await new Promise((r) => setTimeout(r, 500));
    eq(await stat(p, "Payments found"), "2", "payments after rescan");
  });

  await step("UI: payments persist across reload (IndexedDB)", async () => {
    await p.goto(BASE + "/app");
    await p.waitFor("Object.keys(document.querySelector('nav button')).some(k=>k.startsWith('__react'))", 20000, "hydration");
    await p.click("Scan & Inbox");
    await until(p, "0.25 ETH");
    eq(await stat(p, "Payments found"), "2", "payments after reload");
  });

  await step("no console errors", async () => {
    const real = p.errors.filter((e) => !/favicon|Failed to load resource/i.test(e));
    if (real.length) throw new Error(real.slice(0, 3).join(" || "));
  });
  await p.close();
} catch (e) {
  failures++;
  console.error("\nE2E ABORTED:", e);
} finally {
  await cleanup();
}
console.log(failures ? `\n${failures} step(s) FAILED` : "\nALL BROWSER E2E CHECKS PASSED");
process.exit(failures ? 1 : 0);
