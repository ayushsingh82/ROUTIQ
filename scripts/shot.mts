// Screenshot a page in headless Chrome after React has hydrated (uses the dependency-free CDP driver).
//   node scripts/shot.mts <url> <out.png> [width] [height] [waitForText]
import { launch } from "./lib/cdp.mts";

const [url, out, w = "1440", h = "1000", text] = process.argv.slice(2);
const p = await launch({ width: Number(w), height: Number(h) });
await p.goto(url);
await p.waitFor("document.body && document.body.innerText.length > 50", 30000, "page content");
if (text) await p.waitFor(`document.body.innerText.toLowerCase().includes(${JSON.stringify(text.toLowerCase())})`, 30000, `text "${text}"`);
await new Promise((r) => setTimeout(r, 1200));
const height = await p.eval<number>("document.documentElement.scrollHeight");
await p.screenshot(out);
console.log(`saved ${out} (page height ${height}px)`);
await p.close();
