import { test } from "node:test";
import assert from "node:assert/strict";
import { generateStealthKeys, toHex } from "../crypto/stealth.ts";
import { encryptKeys, decryptKeys, exportBackup, parseBackup, WrongPasswordError } from "./crypto.ts";

const ITER = { iterations: 2_000 }; // fast for tests; production default is 600k

test("encrypt/decrypt round trip", async () => {
  const k = generateStealthKeys();
  const v = await encryptKeys("correct horse battery", k, ITER);
  const d = await decryptKeys("correct horse battery", v);
  assert.deepEqual(d.spendingPrivateKey, k.spendingPrivateKey);
  assert.deepEqual(d.viewingPrivateKey, k.viewingPrivateKey);
});

test("no plaintext key material in the stored blob", async () => {
  const k = generateStealthKeys();
  const v = await encryptKeys("correct horse battery", k, ITER);
  const blob = JSON.stringify(v).toLowerCase();
  assert.ok(!blob.includes(toHex(k.spendingPrivateKey).slice(2)));
  assert.ok(!blob.includes(toHex(k.viewingPrivateKey).slice(2)));
});

test("wrong password and tampering are rejected", async () => {
  const k = generateStealthKeys();
  const other = generateStealthKeys();
  const v = await encryptKeys("correct horse battery", k, ITER);
  await assert.rejects(() => decryptKeys("wrong password!!", v), WrongPasswordError);
  // swapping the public meta-address (bound as AAD) must fail
  const o = await encryptKeys("correct horse battery", other, ITER);
  await assert.rejects(() => decryptKeys("correct horse battery", { ...v, metaAddress: o.metaAddress }), WrongPasswordError);
  // ciphertext bit flip
  const ct = Buffer.from(v.ciphertext, "base64");
  ct[0] ^= 1;
  await assert.rejects(() => decryptKeys("correct horse battery", { ...v, ciphertext: ct.toString("base64") }), WrongPasswordError);
});

test("short passwords refused; backup round trips", async () => {
  const k = generateStealthKeys();
  await assert.rejects(() => encryptKeys("short", k, ITER));
  const v = await encryptKeys("correct horse battery", k, ITER);
  const restored = parseBackup(exportBackup(v));
  const d = await decryptKeys("correct horse battery", restored);
  assert.deepEqual(d.viewingPrivateKey, k.viewingPrivateKey);
  assert.throws(() => parseBackup("{}"));
});
