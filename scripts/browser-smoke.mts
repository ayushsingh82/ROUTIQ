// Real-browser smoke test (headless Chrome via DevTools protocol) against a PRODUCTION build.
//   npm run build && npx next start -p 3101   (in another terminal)
//   npm run smoke
// Uses a throwaway Chrome profile. Set WORKER=1 to also try starting a real Anon-RPC network (needs internet).

import { launch, type Page } from "./lib/cdp.mts";

const BASE = process.env.BASE ?? "http://127.0.0.1:3101";
const SHOTS = process.env.SHOTS ?? "";
let failures = 0;

const has = (p: Page, text: string) => p.eval<boolean>(`document.body.innerText.toLowerCase().includes(${JSON.stringify(text.toLowerCase())})`);
async function until(p: Page, text: string, ms = 15000) {
  await p.waitFor(`document.body.innerText.toLowerCase().includes(${JSON.stringify(text.toLowerCase())})`, ms, `text "${text}"`);
}
async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✔ ${name}`);
  } catch (e) {
    failures++;
    console.log(`  ✖ ${name}\n      ${e instanceof Error ? e.message : e}`);
  }
}
const eq = (a: unknown, b: unknown, msg: string) => {
  if (a !== b) throw new Error(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
};

const PW = "correct horse battery";
const p = await launch({ width: 1280, height: 1000 });
console.log(`Browser smoke test → ${BASE}`);

await step("landing page renders with brand colors and CTA", async () => {
  await p.goto(BASE + "/");
  await until(p, "you get paid");
  const bg = await p.eval<string>("getComputedStyle(document.querySelector('.theme-landing')).backgroundColor");
  eq(bg, "rgb(254, 254, 254)", "landing background #FEFEFE");
  const fg = await p.eval<string>("getComputedStyle(document.querySelector('.theme-landing')).color");
  eq(fg, "rgb(0, 0, 0)", "landing text black");
  const href = await p.eval<string>("[...document.querySelectorAll('a')].find(a=>a.textContent.includes('Launch app')).getAttribute('href')");
  eq(href, "/app", "Launch app link");
  if (SHOTS) await p.screenshot(`${SHOTS}/landing.png`);
});

await step("dashboard uses #262626 / #F4FEF8 and hydrates", async () => {
  await p.goto(BASE + "/app");
  await p.waitFor("Object.keys(document.querySelector('nav button')).some(k=>k.startsWith('__react'))", 20000, "React hydration");
  const bg = await p.eval<string>("getComputedStyle(document.querySelector('.theme-app')).backgroundColor");
  eq(bg, "rgb(38, 38, 38)", "dashboard background #262626");
  const fg = await p.eval<string>("getComputedStyle(document.querySelector('.theme-app')).color");
  eq(fg, "rgb(244, 254, 248)", "dashboard text #F4FEF8");
  const accent = await p.eval<string>("getComputedStyle(document.querySelector('nav button.bg-accent')).backgroundColor");
  eq(accent, "rgb(0, 236, 151)", "highlight #00EC97");
});

await step("opens on Overview; no vault yet → create form on Identity (IndexedDB works)", async () => {
  await until(p, "Get started");
  await p.click("Identity");
  await until(p, "Create stealth identity");
});

let meta = "";
await step("create identity: keys generated, encrypted, meta-address shown", async () => {
  await p.type('input[placeholder="Password (min 8 chars)"]', PW);
  await p.type('input[placeholder="Repeat password"]', PW);
  await p.click("Generate identity");
  await until(p, "Your stealth meta-address", 30000);
  meta = await p.eval<string>("[...document.querySelectorAll('div')].map(d=>d.textContent).find(t=>/^Meta-address \\(public/.test(t||'') ) ? [...document.querySelectorAll('div.font-mono')].map(e=>e.textContent).find(t=>t.startsWith('st:eth:0x')) : ''");
  if (!/^st:eth:0x[0-9a-f]{132}$/.test(meta)) throw new Error(`bad meta-address: ${meta}`);
  await until(p, "Unlocked");
  if (SHOTS) await p.screenshot(`${SHOTS}/identity.png`);
});

await step("private keys never rendered in the page", async () => {
  const html = await p.eval<string>("document.documentElement.outerHTML");
  const idb = await p.eval<string>(`(async()=>{const db=await new Promise((r,j)=>{const q=indexedDB.open('stealthradar');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});
    const v=await new Promise((r)=>{const t=db.transaction('vault').objectStore('vault').get('identity');t.onsuccess=()=>r(t.result)});return JSON.stringify(v)})()`);
  const v = JSON.parse(idb);
  if (!v.ciphertext || !v.salt || !v.iv) throw new Error("vault not stored encrypted");
  const allowed = ["v", "kdf", "iterations", "salt", "iv", "ciphertext", "metaAddress", "spendingPublicKey", "viewingPublicKey", "createdAt"];
  const extra = Object.keys(v).filter((k) => !allowed.includes(k));
  if (extra.length || /spendingPrivate|viewingPrivate/i.test(idb)) throw new Error(`unexpected fields in stored vault: ${extra.join(",")}`);
  if (html.includes(v.ciphertext)) throw new Error("ciphertext leaked into DOM (unexpected)");
});

await step("lock → wrong password rejected → right password unlocks", async () => {
  await p.click("Lock");
  await until(p, "Vault is locked");
  await p.type('input[placeholder="Password"]', "totally wrong pw");
  await p.click("Unlock");
  await until(p, "Wrong password");
  await p.type('input[placeholder="Password"]', PW);
  await p.click("Unlock");
  await until(p, "Unlocked");
});

await step("vault persists across reload (locked, same meta-address)", async () => {
  await p.goto(BASE + "/app");
  await p.waitFor("Object.keys(document.querySelector('nav button')).some(k=>k.startsWith('__react'))", 20000, "hydration");
  await p.click("Identity");
  await until(p, "Vault is locked");
  if (!(await has(p, meta.slice(0, 30)))) throw new Error("meta-address not shown after reload");
});

await step("fail-closed: scanning is blocked without an anonymizing worker", async () => {
  await p.click("Scan & Inbox");
  await until(p, "Start an Anon-RPC worker first");
  const disabled = await p.eval<boolean>("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Start scan')).disabled");
  eq(disabled, true, "Start scan disabled");
  if (!(await has(p, "Anon-RPC off"))) throw new Error("header should say Anon-RPC off");
});

await step("privacy tab: reference worker is flagged as non-anonymizing", async () => {
  await p.click("Privacy");
  await p.eval(`(()=>{const s=document.querySelector('select');const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;set.call(s,'passthrough');s.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  await until(p, "does not anonymize");
  eq(await has(p, "Direct reads"), true, "counters present");
});

await step("send tab: validates meta-address", async () => {
  await p.click("Send");
  await p.type("textarea", "not-a-meta-address");
  await until(p, "Not a valid stealth meta-address");
  const dis1 = await p.eval<boolean>("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Pay privately')).disabled");
  eq(dis1, true, "disabled for invalid");
  await p.type("textarea", meta);
  await p.waitFor("![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Pay privately')).disabled", 5000, "enabled for valid meta");
});

await step("send tab: previews the one-time stealth address on Ethereum Sepolia with an explorer link", async () => {
  await until(p, "One-time stealth address · Ethereum Sepolia");
  const href = await p.eval<string>("[...document.querySelectorAll('a')].find(a=>a.href.includes('sepolia.etherscan.io/address/'))?.href || ''");
  if (!/^https:\/\/sepolia\.etherscan\.io\/address\/0x[0-9a-fA-F]{40}$/.test(href)) throw new Error(`bad explorer link: ${href}`);
  if (!(await has(p, "chain 11155111"))) throw new Error("chain badge missing");
  if (!(await has(p, "Ethereum Sepolia · 11155111"))) throw new Error("header network badge missing");
});

await step("provider's view: direct side reports an IP; anon side refuses without a worker", async () => {
  await p.click("Provider's view");
  await p.click("Compare");
  await until(p, "Provider sees your IP as", 30000);
  const ip = await p.eval<string>("[...document.querySelectorAll('dt')].find(d=>d.textContent.includes('Provider sees your IP'))?.nextElementSibling?.textContent || ''");
  if (!/\d+\.\d+\.\d+\.\d+|:/.test(ip)) throw new Error(`no IP reported: "${ip}"`);
  if (!(await has(p, "No anonymizing worker running"))) throw new Error("anon side should be disabled");
  console.log(`      (direct IP seen by echo endpoint: ${ip})`);
  if (SHOTS) await p.screenshot(`${SHOTS}/provider-view.png`);
});

if (process.env.WORKER) {
  await step(`REAL Anon-RPC: start ${process.env.WORKER_NET ?? "nox"} and read the chain`, async () => {
    await p.click("Privacy");
    await p.eval(`(()=>{const s=document.querySelector('select');const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;set.call(s,${JSON.stringify(process.env.WORKER_NET ?? "nox")});s.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    await p.click("Start worker");
    await p.waitFor("document.body.innerText.includes('genuine anonymizing network') || document.body.innerText.includes('Worker failed')", 120000, "worker ready/failed");
    if (await has(p, "Worker failed")) {
      const err = await p.eval<string>("document.querySelector('p.font-mono')?.textContent || ''");
      throw new Error(`worker failed: ${err}`);
    }
    await p.click("Provider's view");
    await p.click("Compare");
    await p.waitFor("document.body.innerText.includes('The provider saw two different IPs') || document.body.innerText.includes('Same IP') || document.body.innerText.includes('Could not compare')", 120000, "comparison verdict");
    const verdict = await p.eval<string>("[...document.querySelectorAll('div')].map(d=>d.textContent||'').find(t=>/^(The provider saw|Same IP|Could not compare)/.test(t))||''");
    console.log(`      verdict: ${verdict.slice(0, 120)}`);
    if (SHOTS) await p.screenshot(`${SHOTS}/provider-view-anon.png`);
  });
}

if (process.env.WORKER) {
  const stat = (label: string) =>
    p.eval<string>(`[...document.querySelectorAll('div')].find(d => d.children.length === 0 && d.textContent === ${JSON.stringify(label)} && d.getClientRects().length > 0)?.nextElementSibling?.textContent ?? ''`);

  await step("REAL scan: unlock, scan live Sepolia through Anon-RPC, counters prove routing", async () => {
    await p.click("Identity");
    await p.type('input[placeholder="Password"]', PW);
    await p.click("Unlock");
    await until(p, "Unlocked");
    await p.click("Scan & Inbox");
    await until(p, "Anon-RPC · nox");
    await p.waitFor("![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Start scan')).disabled", 5000, "scan enabled");
    await p.click("Start scan");
    await p.waitFor("document.body.innerText.toLowerCase().includes('full matches') && [...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Start scan')", 180000, "scan finished");
    const err = await p.eval<string>("document.querySelector('p.font-mono.text-red-400, p.text-red-400.font-mono')?.textContent || ''");
    if (err) throw new Error(`scan error shown: ${err}`);
    const blockRow = await stat("Block");
    console.log(`      scanned: block ${blockRow}`);
    if (SHOTS) await p.screenshot(`${SHOTS}/scan.png`);
    await p.click("Privacy");
    const via = Number(await stat("Via Anon-RPC"));
    const direct = Number(await stat("Direct reads"));
    const boot = Number(await stat("Bootstrap (not anonymized)"));
    console.log(`      via Anon-RPC: ${via} · direct reads: ${direct} · bootstrap: ${boot}`);
    if (!(via >= 2)) throw new Error("expected scan reads to go through Anon-RPC");
    eq(direct, 0, "no direct reads in private mode");
    if (!(boot >= 1)) throw new Error("expected the one-time bootstrap read to be counted");
    if (SHOTS) await p.screenshot(`${SHOTS}/privacy.png`);
  });
}

await step("no console errors during the whole run", async () => {
  const real = p.errors.filter((e) => !/favicon|Failed to load resource/i.test(e));
  if (real.length) throw new Error(real.slice(0, 3).join(" || "));
});

await p.close();
console.log(failures ? `\n${failures} step(s) FAILED` : "\nALL BROWSER SMOKE CHECKS PASSED");
process.exit(failures ? 1 : 0);
