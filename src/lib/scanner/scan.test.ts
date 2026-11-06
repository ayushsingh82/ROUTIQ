import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeMetaAddress, generateStealthAddress, generateStealthKeys, toHex } from "../crypto/stealth.ts";
import { encodeEthMetadata } from "../erc5564/metadata.ts";
import { scan, nextScanStart, REORG_DEPTH } from "./scan.ts";
import { verifyPayment } from "./verify.ts";
import type { RawAnnouncement, ScanDeps } from "./types.ts";

const CHAIN = 11155111;
let n = 0;
const h = (x: number) => ("0x" + x.toString(16).padStart(64, "0")) as `0x${string}`;

function announce(meta: string, block: bigint, amount = 10n ** 15n, over: Partial<RawAnnouncement> = {}): RawAnnouncement {
  const g = generateStealthAddress(meta);
  n++;
  return {
    schemeId: 1n,
    stealthAddress: g.stealthAddress,
    caller: ("0x" + "ab".repeat(20)) as `0x${string}`,
    ephemeralPubKey: toHex(g.ephemeralPublicKey),
    metadata: encodeEthMetadata(g.viewTag, amount),
    txHash: h(n),
    logIndex: 0,
    blockNumber: block,
    blockHash: h(1000 + n),
    ...over,
  };
}

function depsFor(all: RawAnnouncement[], opts: { maxRange?: bigint; head?: bigint } = {}): ScanDeps & { calls: number } {
  const d = {
    calls: 0,
    getBlockNumber: async () => opts.head ?? 10_000n,
    async getLogs(from: bigint, to: bigint) {
      d.calls++;
      if (opts.maxRange && to - from + 1n > opts.maxRange) throw new Error("block range too large");
      return all.filter((a) => a.blockNumber >= from && a.blockNumber <= to);
    },
  };
  return d;
}

test("finds only my payments among many, ignores other schemes and malformed logs", async () => {
  const me = generateStealthKeys();
  const other = generateStealthKeys();
  const myMeta = encodeMetaAddress(me.spendingPublicKey, me.viewingPublicKey);
  const otherMeta = encodeMetaAddress(other.spendingPublicKey, other.viewingPublicKey);

  const logs: RawAnnouncement[] = [
    announce(myMeta, 100n),
    announce(myMeta, 5_000n),
    ...Array.from({ length: 300 }, (_, i) => announce(otherMeta, BigInt(i * 30))),
    announce(myMeta, 200n, 1n, { schemeId: 2n }),
    announce(myMeta, 201n, 1n, { ephemeralPubKey: "0x1234" }),
  ];
  const r = await scan({
    chainId: CHAIN,
    viewingPrivateKey: me.viewingPrivateKey,
    spendingPublicKey: me.spendingPublicKey,
    fromBlock: 0n,
    deps: depsFor(logs),
  });
  assert.equal(r.matches.length, 2);
  assert.equal(r.progress.wrongScheme, 1);
  assert.equal(r.progress.malformed, 1);
  assert.equal(r.progress.announcementsScanned, logs.length);
  assert.equal(r.lastScannedBlock, 10_000n);
});

test("view-tag collision without address match is not a match", async () => {
  const me = generateStealthKeys();
  const other = generateStealthKeys();
  const otherMeta = encodeMetaAddress(other.spendingPublicKey, other.viewingPublicKey);
  // Forge: other's announcement but with MY view tag. Passes filter at most by luck; must never become a match.
  const logs = Array.from({ length: 600 }, (_, i) => announce(otherMeta, BigInt(i)));
  const r = await scan({
    chainId: CHAIN,
    viewingPrivateKey: me.viewingPrivateKey,
    spendingPublicKey: me.spendingPublicKey,
    fromBlock: 0n,
    deps: depsFor(logs),
  });
  assert.equal(r.matches.length, 0);
});

test("adapts chunk size when the provider limits the block range", async () => {
  const me = generateStealthKeys();
  const meta = encodeMetaAddress(me.spendingPublicKey, me.viewingPublicKey);
  const logs = [announce(meta, 3n), announce(meta, 9_990n)];
  const d = depsFor(logs, { maxRange: 100n });
  const r = await scan({
    chainId: CHAIN,
    viewingPrivateKey: me.viewingPrivateKey,
    spendingPublicKey: me.spendingPublicKey,
    fromBlock: 0n,
    chunkSize: 2000n,
    deps: d,
  });
  assert.equal(r.matches.length, 2);
  assert.ok(r.progress.chunkRetries > 0);
});

test("dedupes on rescan (reorg overlap) and supports abort", async () => {
  const me = generateStealthKeys();
  const meta = encodeMetaAddress(me.spendingPublicKey, me.viewingPublicKey);
  const logs = [announce(meta, 9_995n)];
  const seen = new Set<string>();
  const args = {
    chainId: CHAIN,
    viewingPrivateKey: me.viewingPrivateKey,
    spendingPublicKey: me.spendingPublicKey,
    seenIds: seen,
    deps: depsFor(logs),
  };
  const first = await scan({ ...args, fromBlock: 9_000n });
  const second = await scan({ ...args, fromBlock: nextScanStart(first.lastScannedBlock, 0n) });
  assert.equal(first.matches.length, 1);
  assert.equal(second.matches.length, 0);
  assert.equal(second.progress.duplicates, 1);
  assert.equal(nextScanStart(10_000n, 0n), 10_000n - REORG_DEPTH);

  const ac = new AbortController();
  ac.abort();
  const stopped = await scan({ ...args, seenIds: new Set(), fromBlock: 0n, signal: ac.signal });
  assert.equal(stopped.aborted, true);
});

test("payment verification: verified only when balance supports it; never guesses", async () => {
  const me = generateStealthKeys();
  const meta = encodeMetaAddress(me.spendingPublicKey, me.viewingPublicKey);
  const a = announce(meta, 50n, 10n ** 15n);
  const r = await scan({
    chainId: CHAIN,
    viewingPrivateKey: me.viewingPrivateKey,
    spendingPublicKey: me.spendingPublicKey,
    fromBlock: 0n,
    deps: depsFor([a]),
  });
  const m = r.matches[0];

  const funded = await verifyPayment({ getBalance: async () => 10n ** 15n }, m);
  assert.equal(funded.status, "verified");
  assert.equal(funded.amountWei, (10n ** 15n).toString());

  const empty = await verifyPayment({ getBalance: async () => 0n }, m);
  assert.equal(empty.status, "unverified"); // announcement alone is NOT a payment

  const lying = await verifyPayment({ getBalance: async () => 1n }, m); // hint says 0.001 ETH, only 1 wei there
  assert.equal(lying.status, "unverified");

  const nonArchive = await verifyPayment(
    { getBalance: async (_a, bn) => { if (bn !== undefined) throw new Error("missing trie node"); return 10n ** 15n; } },
    m,
  );
  assert.equal(nonArchive.status, "verified");
});
