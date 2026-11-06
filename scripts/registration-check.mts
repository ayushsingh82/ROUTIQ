// Live negative-path check for POST /api/v1/providers/register (needs a running server). Every line below must be a rejection.
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { manifestMessage } from "../src/lib/routiq/manifest.ts";
const B = (process.env.BASE ?? "http://127.0.0.1:3100") + "/api/v1/providers/register";
const a = privateKeyToAccount(generatePrivateKey());
const m = (endpoint: string, over: object = {}) => ({ providerId: "acme-gpu", name: "Acme GPU", walletAddress: a.address, endpoint, models: [{ id: "smollm2:135m", inputPrice: 0.1, outputPrice: 0.2 }], capabilities: ["chat"], updatedAt: Date.now(), ...over });
const post = async (manifest: ReturnType<typeof m>, signer = a, sigOverride?: string) => {
  const signature = sigOverride ?? (await signer.signMessage({ message: manifestMessage(manifest) }));
  const r = await fetch(B, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ manifest, signature }) });
  const j = (await r.json()) as { error?: { code?: string } };
  return `${r.status} ${j.error?.code ?? JSON.stringify(j)}`;
};
console.log("loopback endpoint        →", await post(m("http://127.0.0.1:4101/v1")));
console.log("cloud metadata endpoint  →", await post(m("http://169.254.169.254/latest")));
console.log("private network endpoint →", await post(m("http://10.0.0.5/v1")));
console.log("wrong signer             →", await post(m("https://inference.acme.example/v1"), privateKeyToAccount(generatePrivateKey())));
console.log("garbage signature        →", await post(m("https://inference.acme.example/v1"), a, "0xdeadbeef"));
console.log("stale timestamp          →", await post(m("https://inference.acme.example/v1", { updatedAt: Date.now() - 86400000 })));
console.log("bad price                →", await post(m("https://inference.acme.example/v1", { models: [{ id: "x", inputPrice: -1, outputPrice: 1 }] })));
console.log("valid sig, unreachable   →", await post(m("https://inference.invalid-host-routiq.example/v1")));
