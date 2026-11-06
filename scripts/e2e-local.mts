// Local end-to-end test on an anvil FORK of Sepolia (real Announcer contract, real ABI, real log decoding).
// Exercises the production code paths: stealth derivation, transfer + announce, chunked scan, view-tag +
// full match, payment verification, and spending from the stealth address with the derived key.
// Anon-RPC itself is browser-only and is covered by the manual /spike + UI run.
//
//   npm run e2e:local

import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { createPublicClient, createWalletClient, http, parseEther, formatEther, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { encodeMetaAddress, generateStealthAddress, generateStealthKeys, toHex, computeStealthPrivateKey } from "../src/lib/crypto/stealth.ts";
import { encodeEthMetadata } from "../src/lib/erc5564/metadata.ts";
import { ANNOUNCER_ABI, ANNOUNCER_ADDRESS } from "../src/lib/erc5564/constants.ts";
import { depsFromClient } from "../src/lib/scanner/clientDeps.ts";
import { scan } from "../src/lib/scanner/scan.ts";
import { verifyPayment } from "../src/lib/scanner/verify.ts";

const PORT = 8546;
const FORK = process.env.FORK_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
const RPC = `http://127.0.0.1:${PORT}`;
// anvil's well-known dev key #0 (public, test-only)
const DEV_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const ok = (m: string) => console.log(`  ✔ ${m}`);

async function forkBlock(): Promise<string> {
  // Public RPCs are load-balanced; their newest block may be missing on some backends. Fork a bit behind head.
  const r = await fetch(FORK, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }) });
  const head = BigInt(((await r.json()) as { result: string }).result);
  return (head - 40n).toString();
}

async function startAnvil() {
  const anvilBin = process.env.ANVIL ?? `${process.env.HOME}/.foundry/bin/anvil`;
  const p = spawn(anvilBin, ["--fork-url", FORK, "--fork-block-number", await forkBlock(), "--port", String(PORT), "--chain-id", "11155111", "--silent"], { stdio: "ignore" });
  const c = createPublicClient({ chain: sepolia, transport: http(RPC) });
  for (let i = 0; i < 60; i++) {
    try {
      await c.getBlockNumber();
      return { proc: p, client: c as PublicClient };
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  p.kill();
  throw new Error("anvil did not start (fork url unreachable?)");
}

const { proc, client } = await startAnvil();
let failed = false;
try {
  console.log("Local E2E on anvil fork of Sepolia");
  const deps = depsFromClient(client);
  const wallet = createWalletClient({ account: privateKeyToAccount(DEV_KEY), chain: sepolia, transport: http(RPC) });

  assert.notEqual(await client.getCode({ address: ANNOUNCER_ADDRESS }), undefined);
  ok("ERC-5564 Announcer has code on the fork");

  // recipient + an unrelated user
  const alice = generateStealthKeys();
  const bob = generateStealthKeys();
  const aliceMeta = encodeMetaAddress(alice.spendingPublicKey, alice.viewingPublicKey);
  const bobMeta = encodeMetaAddress(bob.spendingPublicKey, bob.viewingPublicKey);

  const startBlock = await client.getBlockNumber();
  const amount = parseEther("0.25");

  async function pay(meta: string, value: bigint, announce = true) {
    const g = generateStealthAddress(meta);
    const t = await wallet.sendTransaction({ to: g.stealthAddress, value });
    await client.waitForTransactionReceipt({ hash: t });
    if (announce) {
      const a = await wallet.writeContract({
        address: ANNOUNCER_ADDRESS,
        abi: ANNOUNCER_ABI,
        functionName: "announce",
        args: [1n, g.stealthAddress, toHex(g.ephemeralPublicKey), encodeEthMetadata(g.viewTag, value)],
      });
      await client.waitForTransactionReceipt({ hash: a });
    }
    return g;
  }

  const toAlice = await pay(aliceMeta, amount);
  await pay(bobMeta, parseEther("0.1")); // someone else's payment on the same announcer
  // announcement with NO funds behind it (must never become a verified payment)
  const empty = generateStealthAddress(aliceMeta);
  const ea = await wallet.writeContract({
    address: ANNOUNCER_ADDRESS,
    abi: ANNOUNCER_ABI,
    functionName: "announce",
    args: [1n, empty.stealthAddress, toHex(empty.ephemeralPublicKey), encodeEthMetadata(empty.viewTag, parseEther("1"))],
  });
  await client.waitForTransactionReceipt({ hash: ea });
  ok("sent 2 payments + 1 unfunded announcement through the real Announcer");

  // Alice scans in tiny chunks to exercise chunking against the real node
  const seen = new Set<string>();
  const res = await scan({
    chainId: 11155111,
    viewingPrivateKey: alice.viewingPrivateKey,
    spendingPublicKey: alice.spendingPublicKey,
    fromBlock: startBlock,
    chunkSize: 2n,
    seenIds: seen,
    deps,
  });
  assert.equal(res.matches.length, 2, `alice should match her 2 announcements, got ${res.matches.length}`);
  assert.ok(res.progress.announcementsScanned >= 3);
  ok(`scanner: ${res.progress.announcementsScanned} announcements scanned, 2 full matches for Alice`);

  // rescan with overlap -> deduped
  const again = await scan({
    chainId: 11155111,
    viewingPrivateKey: alice.viewingPrivateKey,
    spendingPublicKey: alice.spendingPublicKey,
    fromBlock: startBlock,
    seenIds: seen,
    deps,
  });
  assert.equal(again.matches.length, 0);
  assert.equal(again.progress.duplicates, 2);
  ok("rescan is idempotent (2 duplicates skipped)");

  // Bob only sees his own
  const bobRes = await scan({ chainId: 11155111, viewingPrivateKey: bob.viewingPrivateKey, spendingPublicKey: bob.spendingPublicKey, fromBlock: startBlock, deps });
  assert.equal(bobRes.matches.length, 1);
  ok("Bob matches only his own payment");

  // verification: funded -> verified, unfunded -> unverified
  const payments = await Promise.all(res.matches.map((m) => verifyPayment(deps, m)));
  const funded = payments.find((p) => p.stealthAddress.toLowerCase() === toAlice.stealthAddress.toLowerCase())!;
  const unfunded = payments.find((p) => p.stealthAddress.toLowerCase() === empty.stealthAddress.toLowerCase())!;
  assert.equal(funded.status, "verified");
  assert.equal(funded.amountWei, amount.toString());
  assert.equal(unfunded.status, "unverified");
  ok(`funded payment verified (${formatEther(BigInt(funded.amountWei!))} ETH); unfunded announcement stays UNVERIFIED`);

  // the recipient can actually SPEND from the stealth address with the derived key
  const stealthPriv = toHex(
    computeStealthPrivateKey({
      spendingPrivateKey: alice.spendingPrivateKey,
      viewingPrivateKey: alice.viewingPrivateKey,
      ephemeralPublicKey: toAlice.ephemeralPublicKey,
    }),
  );
  const stealthAcct = privateKeyToAccount(stealthPriv);
  assert.equal(stealthAcct.address.toLowerCase(), toAlice.stealthAddress.toLowerCase());
  const sweeper = createWalletClient({ account: stealthAcct, chain: sepolia, transport: http(RPC) });
  const dest = privateKeyToAccount(toHex(crypto.getRandomValues(new Uint8Array(32)))).address;
  const gasPrice = await client.getGasPrice();
  const sweep = amount - 21000n * gasPrice * 2n;
  const sh = await sweeper.sendTransaction({ to: dest, value: sweep, gas: 21000n, maxFeePerGas: gasPrice * 2n, maxPriorityFeePerGas: 1n });
  await client.waitForTransactionReceipt({ hash: sh });
  assert.equal(await client.getBalance({ address: dest }), sweep);
  ok(`derived stealth key controls the address: swept ${formatEther(sweep)} ETH to a fresh address`);

  // after sweeping, the announcement is still matched but can no longer be verified (documented limit)
  const after = await verifyPayment(deps, res.matches.find((m) => m.stealthAddress.toLowerCase() === toAlice.stealthAddress.toLowerCase())!);
  console.log(`  ℹ after sweep the payment reads as: ${after.status} (${after.note})`);

  console.log("\nALL LOCAL E2E CHECKS PASSED");
} catch (e) {
  failed = true;
  console.error("\nE2E FAILED:", e);
} finally {
  proc.kill();
}
process.exit(failed ? 1 : 0);
