// Real-browser check: start a genuine Anon-RPC network, read the Alt-Mempool devnet through it, then run the
// Agent page's devnet readiness check. Needs a PRODUCTION server (`next build && next start -p 3101`).
//   BASE=http://127.0.0.1:3101 NET=nox node scripts/anon-devnet-check.mts
import { launch } from "./lib/cdp.mts";

const BASE = process.env.BASE ?? "http://127.0.0.1:3101";
const NET = process.env.NET ?? "nox";
const p = await launch({ width: 1280, height: 1000 });
const text = () => p.eval<string>("document.body.innerText");
const until = (t: string, ms = 120000) => p.waitFor(`document.body.innerText.toLowerCase().includes(${JSON.stringify(t.toLowerCase())})`, ms, t);
let failed = 0;
const step = async (n: string, f: () => Promise<void>) => {
  try {
    await f();
    console.log(`  ✔ ${n}`);
  } catch (e) {
    failed++;
    console.log(`  ✖ ${n}\n      ${e instanceof Error ? e.message : e}`);
  }
};

console.log(`Anon-RPC → devnet check (${NET})`);
await step("Privacy Center loads, fail-closed before a worker starts", async () => {
  await p.goto(`${BASE}/app/privacy`);
  await p.waitFor("Object.keys(document.querySelector('button')).some(k=>k.startsWith('__react'))", 30000, "hydration");
  await until("No worker running");
  await p.click("Test read");
  await until("Anon-RPC worker is not ready");
});
await step(`start ${NET} and read the devnet through it`, async () => {
  await p.eval(`(()=>{const s=document.querySelector('select');const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;set.call(s,${JSON.stringify(NET)});s.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  await p.click("Start worker");
  await p.waitFor("document.body.innerText.includes('genuine anonymising network') || document.body.innerText.toLowerCase().includes('worker failed')", 150000, "worker ready");
  if ((await text()).toLowerCase().includes("worker failed")) throw new Error("worker failed to start");
  await p.click("Test read");
  await p.waitFor("document.body.innerText.includes('eth_blockNumber →') || /RPC|Wrong network|HTTP/.test(document.body.innerText.split('Test read')[1]||'')", 120000, "read result");
  const t = await text();
  const m = /eth_blockNumber → (\d+) on [^\n]+ in (\d+) ms/.exec(t);
  if (!m) throw new Error(`read did not succeed: ${t.split("\n").find((l) => /Wrong network|RPC|HTTP|Error/i.test(l)) ?? "unknown"}`);
  console.log(`      block ${m[1]} read through ${NET} in ${m[2]} ms`);
});
await step("counters: anonymised reads > 0, direct reads = 0, bootstrap counted", async () => {
  const stat = (l: string) => p.eval<string>(`[...document.querySelectorAll('div')].find(d=>d.children.length===0&&d.textContent===${JSON.stringify(l)})?.nextElementSibling?.textContent??''`);
  const anon = Number(await stat("Anonymised reads"));
  const direct = Number(await stat("Direct reads"));
  const boot = Number(await stat("Bootstrap (not anonymised)"));
  console.log(`      anonymised=${anon} direct=${direct} bootstrap=${boot}`);
  if (!(anon >= 2)) throw new Error("expected chain-id guard + block read through the worker");
  if (direct !== 0) throw new Error("direct reads must be 0");
  if (!(boot >= 1)) throw new Error("bootstrap read should be counted");
});
await step("Agent page: devnet readiness check via Anon-RPC", async () => {
  await p.click("Agent Vault");
  await until("Devnet readiness");
  await p.click("Run devnet check");
  await until("Staking registry deployed", 150000);
  const t = await text();
  console.log("      " + t.split("\n").filter((l) => /Devnet reachable|Staking registry|sidecar|minStake|bytes at|block \d+/.test(l)).slice(0, 5).join(" | "));
});
await step("no console errors", async () => {
  const real = p.errors.filter((e) => !/favicon|Failed to load resource/i.test(e));
  if (real.length) throw new Error(real.slice(0, 2).join(" || "));
});
await p.close();
console.log(failed ? `\n${failed} check(s) FAILED` : "\nALL ANON-RPC → DEVNET CHECKS PASSED");
process.exit(failed ? 1 : 0);
