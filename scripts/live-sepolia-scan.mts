// Read-only sanity check against REAL Sepolia announcements (direct RPC, no wallet, no Anon-RPC).
// Validates event decoding on real data and that a random key's view-tag pass rate is ~1/256 with 0 full matches.
//   npm run live:scan

import { createPublicClient, http, type PublicClient } from "viem";
import { sepolia } from "viem/chains";
import { generateStealthKeys } from "../src/lib/crypto/stealth.ts";
import { depsFromClient } from "../src/lib/scanner/clientDeps.ts";
import { scan } from "../src/lib/scanner/scan.ts";

const RPC = process.env.RPC ?? "https://ethereum-sepolia-rpc.publicnode.com";
const SPAN = BigInt(process.env.SPAN ?? 9000);
const client = createPublicClient({ chain: sepolia, transport: http(RPC) }) as PublicClient;
const deps = depsFromClient(client);

const head = (await deps.getBlockNumber()) - 30n;
const keys = generateStealthKeys();
const t0 = Date.now();
const r = await scan({
  chainId: 11155111,
  viewingPrivateKey: keys.viewingPrivateKey,
  spendingPublicKey: keys.spendingPublicKey,
  fromBlock: head - SPAN,
  toBlock: head,
  chunkSize: 5000n,
  deps,
});
const p = r.progress;
console.log(`scanned blocks ${p.fromBlock}..${p.toBlock} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`announcements: ${p.announcementsScanned}  wrongScheme: ${p.wrongScheme}  malformed: ${p.malformed}  chunkRetries: ${p.chunkRetries}`);
const s1 = p.announcementsScanned - p.wrongScheme - p.malformed;
console.log(`scheme-1 announcements: ${s1}  view-tag passes: ${p.viewTagMatches}  (expected ~${(s1 / 256).toFixed(1)})  full matches: ${p.fullMatches}`);
if (p.fullMatches !== 0) {
  console.error("FAIL: a random key must not match anything");
  process.exit(1);
}
console.log("OK");
