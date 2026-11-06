import { test } from "node:test";
import assert from "node:assert/strict";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { manifestMessageClient } from "./manifestClient.ts";
import { canonicalize, manifestHash, manifestMessage, ManifestError, validateManifest, verifyManifestSignature, type ProviderManifest } from "./manifest.ts";

const acct = privateKeyToAccount(generatePrivateKey());
const base = (over: Partial<ProviderManifest> = {}): ProviderManifest => ({
  providerId: "acme-gpu",
  name: "Acme GPU",
  walletAddress: acct.address,
  endpoint: "https://inference.acme.example/v1",
  models: [{ id: "llama-3-8b", inputPrice: 0.1, outputPrice: 0.2, contextWindow: 8192 }],
  capabilities: ["chat", "streaming"],
  updatedAt: Date.now(),
  ...over,
});
const sign = (m: ProviderManifest, a = acct) => a.signMessage({ message: manifestMessage(m) });

test("canonicalization is order-independent and hash is stable", () => {
  assert.equal(canonicalize({ b: 1, a: { d: 2, c: 3 } }), canonicalize({ a: { c: 3, d: 2 }, b: 1 }));
  const m = base();
  assert.equal(manifestHash(m), manifestHash({ ...m, models: [{ ...m.models[0] }] }));
});

test("valid signature by the owning wallet verifies", async () => {
  const m = validateManifest(base());
  assert.equal(await verifyManifestSignature(m, await sign(m)), true);
});

test("signature from a different wallet, or over a tampered manifest, is rejected", async () => {
  const m = base();
  const other = privateKeyToAccount(generatePrivateKey());
  assert.equal(await verifyManifestSignature(m, await sign(m, other)), false);
  const sig = await sign(m);
  assert.equal(await verifyManifestSignature({ ...m, endpoint: "https://evil.example/v1" }, sig), false);
  assert.equal(await verifyManifestSignature({ ...m, models: [{ id: "llama-3-8b", inputPrice: 0, outputPrice: 0 }] }, sig), false);
  assert.equal(await verifyManifestSignature(m, "0x1234"), false);
  assert.equal(await verifyManifestSignature(m, "not-hex"), false);
});

test("validation rejects bad ids, prices, capabilities, duplicates and stale timestamps", () => {
  const bad = (over: Partial<ProviderManifest>) => assert.throws(() => validateManifest(base(over)), ManifestError);
  bad({ providerId: "A" });
  bad({ providerId: "has space" });
  bad({ walletAddress: "0x123" });
  bad({ models: [] });
  bad({ models: [{ id: "m", inputPrice: -1, outputPrice: 1 }] });
  bad({ models: [{ id: "m", inputPrice: 1, outputPrice: 5000 }] });
  bad({ models: [{ id: "m", inputPrice: 1, outputPrice: 1 }, { id: "m", inputPrice: 1, outputPrice: 1 }] });
  bad({ capabilities: ["teleport"] });
  bad({ updatedAt: Date.now() - 3 * 60 * 60 * 1000 });
  assert.throws(() => validateManifest(null), ManifestError);
});

test("browser and server build byte-identical signing messages", async () => {
  const m = base();
  assert.equal(await manifestMessageClient(m), manifestMessage(m));
  // and a signature produced over the browser-built message verifies on the server
  const sig = await acct.signMessage({ message: await manifestMessageClient(m) });
  assert.equal(await verifyManifestSignature(m, sig), true);
});
