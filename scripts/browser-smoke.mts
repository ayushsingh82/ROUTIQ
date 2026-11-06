// Real-browser smoke test for the whole ROUTIQ UI (headless Chrome via DevTools protocol, throwaway profile).
// Needs: a PRODUCTION server (npm run build && npx next start -p 3101) and a local model provider
// (ollama serve, with smollm2:135m) so a real streamed completion can run.
//   npm run smoke
import { launch, type Page } from "./lib/cdp.mts";

const BASE = process.env.BASE ?? "http://127.0.0.1:3101";
const MODEL = process.env.MODEL ?? "smollm2:135m";
const SHOTS = process.env.SHOTS ?? "";
let failed = 0;
const p = await launch({ width: 1440, height: 1000 });

const has = (page: Page, t: string) => page.eval<boolean>(`document.body.innerText.toLowerCase().includes(${JSON.stringify(t.toLowerCase())})`);
const until = (t: string, ms = 30000) => p.waitFor(`document.body.innerText.toLowerCase().includes(${JSON.stringify(t.toLowerCase())})`, ms, `text "${t}"`);
const hydrated = () => p.waitFor("Object.keys(document.querySelector('a,button')).some(k=>k.startsWith('__react'))", 30000, "hydration");
const setSelect = (idx: number, value: string) =>
  p.eval(`(()=>{const s=document.querySelectorAll('select')[${idx}];const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;set.call(s,${JSON.stringify(value)});s.dispatchEvent(new Event('change',{bubbles:true}))})()`);
async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✔ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✖ ${name}\n      ${e instanceof Error ? e.message : e}`);
  }
}
const eq = (a: unknown, b: unknown, m: string) => {
  if (a !== b) throw new Error(`${m}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
};

console.log(`ROUTIQ browser smoke → ${BASE}`);

await step("landing: Confide-style hero, serif accent, pill CTA, live numbers", async () => {
  await p.goto(BASE + "/");
  await hydrated();
  await until("No single gatekeeper");
  eq(await p.eval<string>("getComputedStyle(document.body).backgroundColor"), "rgb(0, 0, 0)", "background is pure black");
  eq(await p.eval<boolean>("!!document.querySelector('h1 span.font-serif.italic')"), true, "serif italic accent word");
  eq(await p.eval<string>("[...document.querySelectorAll('a')].find(a=>a.textContent.includes('Open the dashboard')).getAttribute('href')"), "/app", "CTA link");
  const radius = parseFloat(await p.eval<string>("getComputedStyle([...document.querySelectorAll('a')].find(a=>a.textContent.includes('Open the dashboard'))).borderRadius"));
  if (!(radius >= 9999)) throw new Error(`CTA is not a pill (border-radius ${radius})`);
  await p.waitFor("(()=>{const n=[...document.querySelectorAll('p')].find(d=>d.textContent==='Models served right now'); return n && /^\\d+$/.test(n.previousElementSibling.textContent)})()", 30000, "live model count");
  if (SHOTS) await p.screenshot(`${SHOTS}/landing.png`);
});

await step("tab: title and ROUTIQ favicon", async () => {
  const title = await p.eval<string>("document.title");
  if (!/ROUTIQ/.test(title)) throw new Error(`title: ${title}`);
  const icon = await p.eval<string>("document.querySelector('link[rel~=icon]')?.getAttribute('href') || ''");
  if (!icon.includes("icon.svg")) throw new Error(`favicon: ${icon}`);
  const svg = await p.eval<string>("fetch('/icon.svg').then(r=>r.text())");
  if (!svg.includes("#34d399")) throw new Error("icon.svg is not the ROUTIQ mark");
});

await step("dashboard: sidebar, workspace labels, session key issued", async () => {
  await p.goto(BASE + "/app");
  await hydrated();
  for (const l of ["My workspace", "Playground", "Browse models", "Usage", "Providers", "Privacy Center", "Agent vault", "API keys"]) if (!(await has(p, l))) throw new Error(`missing sidebar item: ${l}`);
  await p.waitFor("/rq_live_/.test(document.body.innerText)", 20000, "session key in profile pill");
  await until("Setup checks");
});

await step("playground: real streamed completion with cost, tokens, provider and latency", async () => {
  await p.click("Playground");
  await until("Routing preview");
  await p.waitFor(`[...document.querySelectorAll('select')][0] && [...document.querySelectorAll('select')][0].querySelector('option[value=${JSON.stringify(MODEL)}]')`, 30000, "model option");
  await setSelect(0, MODEL);
  await setSelect(1, "cheapest");
  await p.waitFor("document.body.innerText.toLowerCase().includes('selected')", 20000, "routing preview");
  await p.type('textarea[placeholder="Message…"]', "Reply with the single word: pong");
  await p.click("Send");
  await p.waitFor("document.body.innerText.includes('via ') && /\\d+ in \\/ \\d+ out/.test(document.body.innerText)", 120000, "response metadata");
  const t = await p.eval<string>("document.body.innerText");
  const meta = /via ([^\n]+)\n?[^\n]*?(\d+) in \/ (\d+) out[^\n]*\$([0-9.]+)[^\n]*?(\d+) ms/.exec(t.replace(/\n/g, " ").replace(/\s+/g, " "));
  console.log(`      ${t.replace(/\n/g, " ").match(/via .{0,120}/)?.[0] ?? ""}`);
  if (!meta) throw new Error("response metadata line not found");
  if (SHOTS) await p.screenshot(`${SHOTS}/playground.png`);
});

await step("usage: the request shows up with tokens and cost", async () => {
  await p.click("Usage");
  await until("Token consumption by day");
  await p.waitFor("(()=>{const n=[...document.querySelectorAll('div')].find(d=>d.textContent==='Requests'); return n && Number(n.nextElementSibling.textContent)>=1})()", 30000, "requests >= 1");
  if (SHOTS) await p.screenshot(`${SHOTS}/usage.png`);
});

await step("browse models: search and creator filter, detail page lists providers", async () => {
  await p.click("Browse models");
  await until("models");
  await p.waitFor("document.querySelectorAll('a[href^=\"/models/\"]').length > 20", 30000, "model cards");
  await p.type('input[aria-label="Search models"]', "gpt-5-nano");
  await p.waitFor("document.querySelectorAll('a[href^=\"/models/\"]').length === 1", 10000, "filtered to one model");
  await p.eval("document.querySelector('a[href^=\"/models/\"]').click()");
  await until("Who serves it");
  await until("NEAR AI Cloud");
});

await step("providers page: live status for every provider", async () => {
  await p.goto(BASE + "/providers");
  await hydrated();
  await until("Run a provider");
  const n = await p.eval<number>("[...document.querySelectorAll('h3')].filter(h=>/NEAR AI Cloud|Ollama|Reference Provider/.test(h.textContent)).length");
  if (n < 3) throw new Error(`expected >=3 providers, saw ${n}`);
});

await step("api keys: create (shown once), then revoke", async () => {
  await p.goto(BASE + "/app/keys");
  await hydrated();
  await until("Create an API key");
  const keyName = `smoke-${Date.now()}`;
  await p.type('input[placeholder="Key name (e.g. my agent)"]', keyName);
  await p.click("Create");
  await until("won't be shown again");
  const key = await p.eval<string>("[...document.querySelectorAll('code')].map(c=>c.textContent).find(t=>/^rq_live_[0-9a-f]{48}$/.test(t))||''");
  if (!key) throw new Error("new key not displayed");
  const before = await p.eval<number>("document.querySelectorAll('button').length && [...document.querySelectorAll('button')].filter(b=>b.textContent==='Revoke').length");
  await p.eval(`[...document.querySelectorAll('tr')].filter(r=>r.textContent.includes(${JSON.stringify(keyName)}) && r.querySelector('button')).pop().querySelector('button').click()`);
  await p.waitFor(`[...document.querySelectorAll('tr')].filter(r=>r.textContent.includes(${JSON.stringify(keyName)})).every(r=>r.textContent.toLowerCase().includes('revoked'))`, 15000, "key revoked");
  console.log(`      created and revoked a key (${before} revocable keys before)`);
});

await step("agent vault page shows the deployed contracts and has no dead buttons", async () => {
  await p.goto(BASE + "/app/agent");
  await hydrated();
  await until("deployed on the Alt-Mempool devnet");
  await until("Spending policy");
  const dead = await p.eval<number>("[...document.querySelectorAll('button')].filter(b=>b.disabled && !/Run devnet check/.test(b.textContent)).length");
  eq(dead, 0, "disabled buttons other than the gated devnet check");
});

await step("no console errors during the run", async () => {
  const real = p.errors.filter((e) => !/favicon|Failed to load resource/i.test(e));
  if (real.length) throw new Error(real.slice(0, 3).join(" || "));
});

await p.close();
console.log(failed ? `\n${failed} step(s) FAILED` : "\nALL BROWSER SMOKE CHECKS PASSED");
process.exit(failed ? 1 : 0);
