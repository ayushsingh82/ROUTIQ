import { test } from "node:test";
import assert from "node:assert/strict";
import { privateKeyToAddress } from "viem/accounts";
import {
  generateStealthKeys,
  encodeMetaAddress,
  parseMetaAddress,
  generateStealthAddress,
  checkStealthAddress,
  viewTagMatches,
  computeStealthPrivateKey,
  toHex,
  keysFromPrivate,
} from "./stealth.ts";
import { encodeEthMetadata, parseMetadata } from "../erc5564/metadata.ts";

test("meta-address round trips and validates", () => {
  const k = generateStealthKeys();
  const meta = encodeMetaAddress(k.spendingPublicKey, k.viewingPublicKey);
  const p = parseMetaAddress(meta);
  assert.deepEqual(p.spendingPublicKey, k.spendingPublicKey);
  assert.deepEqual(p.viewingPublicKey, k.viewingPublicKey);
  assert.throws(() => parseMetaAddress("0xabc"));
  assert.throws(() => parseMetaAddress("st:eth:0x" + "00".repeat(66)));
  assert.throws(() => parseMetaAddress(meta.slice(0, -2)));
});

test("recipient detects own payment; stealth key controls the announced address", () => {
  const k = generateStealthKeys();
  const meta = encodeMetaAddress(k.spendingPublicKey, k.viewingPublicKey);
  const g = generateStealthAddress(meta);

  assert.ok(viewTagMatches(k.viewingPrivateKey, g.ephemeralPublicKey, g.viewTag));
  assert.ok(
    checkStealthAddress({
      viewingPrivateKey: k.viewingPrivateKey,
      spendingPublicKey: k.spendingPublicKey,
      ephemeralPublicKey: g.ephemeralPublicKey,
      stealthAddress: g.stealthAddress,
      viewTag: g.viewTag,
    }),
  );

  // Independent cross-check: viem derives the address from the private key we computed.
  const priv = computeStealthPrivateKey({
    spendingPrivateKey: k.spendingPrivateKey,
    viewingPrivateKey: k.viewingPrivateKey,
    ephemeralPublicKey: g.ephemeralPublicKey,
  });
  assert.equal(privateKeyToAddress(toHex(priv)).toLowerCase(), g.stealthAddress.toLowerCase());
});

test("other recipient rejects it; wrong view tag / address rejected", () => {
  const a = generateStealthKeys();
  const b = generateStealthKeys();
  const g = generateStealthAddress(encodeMetaAddress(a.spendingPublicKey, a.viewingPublicKey));
  const asB = (over: Partial<Parameters<typeof checkStealthAddress>[0]> = {}) =>
    checkStealthAddress({
      viewingPrivateKey: b.viewingPrivateKey,
      spendingPublicKey: b.spendingPublicKey,
      ephemeralPublicKey: g.ephemeralPublicKey,
      stealthAddress: g.stealthAddress,
      viewTag: g.viewTag,
      ...over,
    });
  assert.equal(asB(), false);

  // Right keys but tampered fields.
  const asA = (over: Partial<Parameters<typeof checkStealthAddress>[0]>) =>
    checkStealthAddress({
      viewingPrivateKey: a.viewingPrivateKey,
      spendingPublicKey: a.spendingPublicKey,
      ephemeralPublicKey: g.ephemeralPublicKey,
      stealthAddress: g.stealthAddress,
      viewTag: g.viewTag,
      ...over,
    });
  assert.equal(asA({}), true);
  assert.equal(asA({ viewTag: (g.viewTag + 1) % 256 }), false);
  assert.equal(asA({ stealthAddress: "0x" + "11".repeat(20) }), false);
  assert.equal(asA({ ephemeralPublicKey: new Uint8Array(33) }), false); // malformed → false, no throw
});

test("view tag is a ~1/256 filter on unrelated announcements", () => {
  const me = generateStealthKeys();
  const other = generateStealthKeys();
  const meta = encodeMetaAddress(other.spendingPublicKey, other.viewingPublicKey);
  let pass = 0;
  const n = 2000;
  for (let i = 0; i < n; i++) {
    const g = generateStealthAddress(meta);
    if (viewTagMatches(me.viewingPrivateKey, g.ephemeralPublicKey, g.viewTag)) pass++;
  }
  assert.ok(pass < 40, `too many false view-tag passes: ${pass}/${n}`); // expect ~8
});

test("keys can be rebuilt from private material", () => {
  const k = generateStealthKeys();
  const r = keysFromPrivate(k.spendingPrivateKey, k.viewingPrivateKey);
  assert.deepEqual(r.spendingPublicKey, k.spendingPublicKey);
  assert.deepEqual(r.viewingPublicKey, k.viewingPublicKey);
});

test("ETH metadata codec", () => {
  const md = encodeEthMetadata(0xab, 1_000_000_000_000_000n);
  const p = parseMetadata(md);
  assert.equal(p.viewTag, 0xab);
  assert.equal(p.isEth, true);
  assert.equal(p.amount, 1_000_000_000_000_000n);
  assert.equal(parseMetadata("0x07").viewTag, 7);
});
