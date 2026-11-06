import Link from "next/link";
import { EyeOff, KeyRound, Radar as RadarIcon, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";

const MONO = "var(--font-geist-mono), ui-monospace, monospace";
const TAG = "inline-flex items-center gap-2 border border-black px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider";
const BTN = "inline-flex items-center justify-center border border-black px-7 py-3.5 font-display text-sm font-semibold tracking-wide transition";

function SectionLabel({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-wider">
      <span className="grid h-6 w-6 place-items-center bg-black text-white">{n}</span>
      <span>{children}</span>
    </div>
  );
}

/* ───────────────────────── illustrations (square language) ───────────────────────── */

/** Hero: one public meta-address fans out to unlinkable one-time addresses; only the viewing key connects them. */
function HeroArt() {
  const nodes = [
    { x: 110, addr: "0x9a4f…c21e", amt: "0.25 ETH" },
    { x: 260, addr: "0x51be…07d3", amt: "1.10 ETH" },
    { x: 410, addr: "0xe6f3…917e", amt: "0.03 ETH" },
  ];
  return (
    <svg viewBox="0 0 520 470" className="block h-auto w-full" role="img" aria-label="One public meta-address fans out into unlinkable one-time stealth addresses">
      <defs>
        <pattern id="hero-grid" width="26" height="26" patternUnits="userSpaceOnUse">
          <path d="M26 0H0V26" fill="none" stroke="#F4FEF8" strokeOpacity="0.06" />
        </pattern>
        <radialGradient id="hero-glow" cx="50%" cy="0%" r="75%">
          <stop offset="0%" stopColor="#00EC97" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#00EC97" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="520" height="470" fill="#262626" />
      <rect width="520" height="470" fill="url(#hero-grid)" />
      <rect width="520" height="470" fill="url(#hero-glow)" />

      {/* meta-address */}
      <rect x="80" y="34" width="360" height="52" fill="#333" stroke="#00EC97" strokeOpacity="0.7" />
      <rect x="98" y="54" width="12" height="12" fill="#00EC97" />
      <text x="124" y="65" fontSize="13.5" fill="#F4FEF8" fontFamily={MONO}>
        st:eth:0x03a6c6…437068
      </text>
      <text x="260" y="110" textAnchor="middle" fontSize="11.5" fill="#F4FEF8" opacity="0.55" fontFamily={MONO}>
        YOUR PUBLIC META-ADDRESS
      </text>

      {/* fan-out */}
      <path d="M260 118 V150 H110 V238" fill="none" stroke="#00EC97" strokeWidth="2" className="flow-dash" />
      <path d="M260 118 V238" fill="none" stroke="#00EC97" strokeWidth="2" className="flow-dash" />
      <path d="M260 118 V150 H410 V238" fill="none" stroke="#00EC97" strokeWidth="2" className="flow-dash" />

      {/* unlinkable markers */}
      {[185, 335].map((x) => (
        <g key={x}>
          <line x1={x - 36} y1="272" x2={x + 36} y2="272" stroke="#F4FEF8" strokeOpacity="0.2" strokeDasharray="3 5" />
          <rect x={x - 10} y="262" width="20" height="20" fill="#262626" stroke="#FF6B6B" />
          <path d={`M${x - 4} 268 L${x + 4} 276 M${x + 4} 268 L${x - 4} 276`} stroke="#FF6B6B" strokeWidth="1.8" strokeLinecap="square" />
        </g>
      ))}

      {/* one-time addresses */}
      {nodes.map((n) => (
        <g key={n.addr}>
          <rect x={n.x - 34} y="238" width="68" height="68" fill="#1f1f1f" stroke="#00EC97" strokeOpacity="0.8" strokeWidth="1.5" />
          <rect x={n.x - 23} y="249" width="46" height="46" fill="none" stroke="#00EC97" strokeOpacity="0.25" />
          <rect x={n.x - 6} y="266" width="12" height="12" fill="#00EC97" />
          <text x={n.x} y="327" textAnchor="middle" fontSize="12" fill="#F4FEF8" fontFamily={MONO}>
            {n.addr}
          </text>
          <text x={n.x} y="346" textAnchor="middle" fontSize="12.5" fill="#00EC97" fontWeight="600" fontFamily={MONO}>
            {n.amt}
          </text>
        </g>
      ))}

      {/* local match card */}
      <rect x="40" y="376" width="440" height="68" fill="#333" stroke="#F4FEF8" strokeOpacity="0.12" />
      <g transform="translate(76 410)">
        <rect x="-17" y="-17" width="34" height="34" fill="none" stroke="#00EC97" strokeOpacity="0.4" />
        <rect x="-9" y="-9" width="18" height="18" fill="none" stroke="#00EC97" strokeOpacity="0.6" />
        <path d="M0 0 L0 -17 L17 -17 L17 0 Z" fill="#00EC97" fillOpacity="0.55" />
        <rect x="-2.5" y="-2.5" width="5" height="5" fill="#00EC97" />
      </g>
      <text x="108" y="404" fontSize="13.5" fontWeight="600" fill="#F4FEF8">
        Only your viewing key links these to you
      </text>
      <text x="108" y="424" fontSize="11.5" fill="#F4FEF8" opacity="0.55">
        Matched on your device · never sent to an RPC
      </text>
      <text x="504" y="462" textAnchor="end" fontSize="9" fill="#F4FEF8" opacity="0.35" fontFamily={MONO}>
        ILLUSTRATIVE
      </text>
    </svg>
  );
}

function LaptopIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="square" strokeLinejoin="miter">
      <rect x="-15" y="-13" width="30" height="20" />
      <path d="M-21 13 H21" />
    </g>
  );
}
function ServerIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="square" strokeLinejoin="miter">
      <rect x="-17" y="-17" width="34" height="14" />
      <rect x="-17" y="3" width="34" height="14" />
      <rect x="-11" y="-11" width="3" height="3" fill="#fff" />
      <rect x="-11" y="9" width="3" height="3" fill="#fff" />
    </g>
  );
}
function Relay({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g>
      <rect x={x - 30} y={y - 30} width="60" height="60" fill="#00EC97" stroke="#000" strokeWidth="2" />
      <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#000" fontFamily={MONO}>
        {label.toUpperCase()}
      </text>
    </g>
  );
}

/** The leak: who learns what, with and without an anonymizing network. */
function LeakDiagram() {
  return (
    <svg viewBox="0 0 960 430" className="h-auto w-full" role="img" aria-label="With a normal RPC your IP and queried address reach the provider; through StealthRadar the provider only sees an exit relay">
      <defs>
        <marker id="arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#E5484D" />
        </marker>
        <marker id="arrow-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#00B26E" />
        </marker>
      </defs>

      {/* Panel 1 — normal RPC */}
      <rect x="0.5" y="0.5" width="959" height="199" fill="#000" fillOpacity="0.03" stroke="#000" />
      <rect x="26" y="24" width="116" height="28" fill="#FDE7E7" stroke="#B42318" />
      <text x="84" y="43" textAnchor="middle" fontSize="12" fontWeight="700" fill="#B42318" fontFamily={MONO}>
        NORMAL RPC
      </text>
      <rect x="94" y="72" width="72" height="72" fill="#000" />
      <LaptopIcon x={130} y={106} />
      <text x="130" y="166" textAnchor="middle" fontSize="13" fontWeight="600" fill="#000">
        You
      </text>
      <rect x="795" y="72" width="72" height="72" fill="#000" />
      <ServerIcon x={831} y={108} />
      <text x="831" y="166" textAnchor="middle" fontSize="13" fontWeight="600" fill="#000">
        RPC provider
      </text>
      <text x="831" y="186" textAnchor="middle" fontSize="12" fill="#B42318">
        links your IP to your addresses
      </text>
      <line x1="176" y1="108" x2="786" y2="108" stroke="#E5484D" strokeWidth="3" markerEnd="url(#arrow-red)" />
      <rect x="352" y="58" width="256" height="38" fill="#fff" stroke="#E5484D" />
      <text x="480" y="82" textAnchor="middle" fontSize="13" fill="#B42318" fontFamily={MONO}>
        your IP + 0x9a4f…c21e
      </text>

      {/* Panel 2 — StealthRadar */}
      <rect x="0.5" y="228.5" width="959" height="201" fill="#000" fillOpacity="0.03" stroke="#000" />
      <rect x="26" y="252" width="132" height="28" fill="#D3FBEA" stroke="#006B42" />
      <text x="92" y="271" textAnchor="middle" fontSize="12" fontWeight="700" fill="#006B42" fontFamily={MONO}>
        STEALTHRADAR
      </text>
      <rect x="94" y="302" width="72" height="72" fill="#000" />
      <LaptopIcon x={130} y={336} />
      <text x="130" y="396" textAnchor="middle" fontSize="13" fontWeight="600" fill="#000">
        You
      </text>
      <rect x="795" y="302" width="72" height="72" fill="#000" />
      <ServerIcon x={831} y={338} />
      <text x="831" y="396" textAnchor="middle" fontSize="13" fontWeight="600" fill="#000">
        RPC provider
      </text>
      <text x="831" y="416" textAnchor="middle" fontSize="12" fill="#006B42">
        sees a relay, not you
      </text>
      {[
        [176, 296],
        [364, 450],
        [510, 600],
        [660, 786],
      ].map(([a, b], i) => (
        <line key={a} x1={a} y1="338" x2={b} y2="338" stroke="#00B26E" strokeWidth="3" className="flow-dash" markerEnd={i === 3 ? "url(#arrow-green)" : undefined} />
      ))}
      <Relay x={330} y={338} label="entry" />
      <Relay x={480} y={338} label="mix" />
      <Relay x={630} y={338} label="exit" />
      <rect x="590" y="268" width="196" height="36" fill="#fff" stroke="#00B26E" />
      <text x="688" y="291" textAnchor="middle" fontSize="13" fill="#006B42" fontFamily={MONO}>
        exit-node IP only
      </text>
    </svg>
  );
}

/** Step illustrations (square language). */
function VaultArt() {
  return (
    <svg viewBox="0 0 240 140" className="h-full w-full" role="img" aria-label="An encrypted vault that stays in your browser">
      <path d="M96 56 V42 H144 V56" fill="none" stroke="#000" strokeWidth="9" strokeLinejoin="miter" />
      <rect x="78" y="54" width="84" height="66" fill="#000" />
      <rect x="110" y="74" width="20" height="20" fill="#00EC97" />
      <rect x="117" y="90" width="6" height="16" fill="#00EC97" />
      <rect x="14" y="22" width="70" height="24" fill="#00EC97" stroke="#000" />
      <text x="49" y="38" textAnchor="middle" fontSize="11" fontWeight="700" fill="#000" fontFamily={MONO}>
        AES-GCM
      </text>
      <rect x="158" y="104" width="70" height="24" fill="#000" />
      <text x="193" y="120" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" fontFamily={MONO}>
        PBKDF2
      </text>
    </svg>
  );
}
function FanArt() {
  return (
    <svg viewBox="0 0 240 140" className="h-full w-full" role="img" aria-label="One meta-address becomes many one-time addresses">
      <rect x="108" y="12" width="24" height="24" fill="#000" />
      <rect x="116" y="20" width="8" height="8" fill="#00EC97" />
      {[48, 120, 192].map((x) => (
        <g key={x}>
          <path d={`M120 36 V62 H${x} V92`} fill="none" stroke="#000" strokeWidth="2" strokeDasharray="4 5" />
          <rect x={x - 16} y="92" width="32" height="32" fill="#fff" stroke="#000" strokeWidth="2.5" />
          <rect x={x - 5} y="103" width="10" height="10" fill="#00EC97" />
        </g>
      ))}
    </svg>
  );
}
function ScanArt() {
  return (
    <svg viewBox="0 0 240 140" className="h-full w-full" role="img" aria-label="A radar finding your payment">
      <g transform="translate(110 74)">
        <rect x="-58" y="-58" width="116" height="116" fill="none" stroke="#000" strokeOpacity="0.18" strokeWidth="2" />
        <rect x="-38" y="-38" width="76" height="76" fill="none" stroke="#000" strokeOpacity="0.18" strokeWidth="2" />
        <rect x="-18" y="-18" width="36" height="36" fill="none" stroke="#000" strokeOpacity="0.18" strokeWidth="2" />
        <path d="M0 0 L0 -58 L58 -58 L58 0 Z" fill="#00EC97" fillOpacity="0.5" />
        <path d="M-58 0 H58 M0 -58 V58" stroke="#000" strokeOpacity="0.12" />
        <rect x="-37" y="23" width="6" height="6" fill="#000" fillOpacity="0.25" />
        <rect x="9" y="37" width="6" height="6" fill="#000" fillOpacity="0.25" />
        <rect x="34" y="-30" width="11" height="11" fill="#000" />
        <rect x="-3" y="-3" width="6" height="6" fill="#000" />
      </g>
      <rect x="148" y="14" width="84" height="26" fill="#000" />
      <text x="190" y="31" textAnchor="middle" fontSize="12" fontWeight="700" fill="#00EC97" fontFamily={MONO}>
        0.25 ETH ✓
      </text>
    </svg>
  );
}

/* ───────────────────────── content ───────────────────────── */

const STEPS = [
  {
    n: "01",
    art: <VaultArt />,
    title: "Make a stealth identity",
    body: "Your keys are generated in the browser and locked with your password. You get one meta-address to share. It never touches your wallet address.",
  },
  {
    n: "02",
    art: <FanArt />,
    title: "Get paid to one-time addresses",
    body: "Each sender derives a brand-new address from your meta-address, sends funds there, and publishes an ERC-5564 announcement. No two payments are linkable.",
  },
  {
    n: "03",
    art: <ScanArt />,
    title: "Find it without being found",
    body: "StealthRadar scans announcements through Anon-RPC and matches them on your device with your viewing key. The RPC provider never learns it was you.",
  },
];

const COMPARE: [string, string, string][] = [
  ["Where your keys live", "Often a hosted scanner or indexer", "Only in your browser, encrypted"],
  ["Who sees your IP while you scan", "Your RPC provider", "An exit relay, never you"],
  ["Can the provider link addresses to you?", "Yes, by IP", "Not by IP"],
  ["If the privacy layer fails", "Quietly falls back to a normal RPC", "Stops and refuses to read the chain"],
  ["Backend or account needed", "Usually", "None"],
];

const FEATURES = [
  { icon: KeyRound, title: "Keys never leave the browser", body: "PBKDF2 and AES-GCM in IndexedDB. No server, no analytics, no remote key storage." },
  { icon: ShieldCheck, title: "Fails closed", body: "If the anonymizing worker isn't ready, reads are blocked. Direct mode exists, but only if you choose it, and it is flagged in red." },
  { icon: RadarIcon, title: "Matches are proven, not guessed", body: "The view tag is a fast filter. A payment is yours only when the derived address equals the announced one, and it counts only when funds are really there." },
  { icon: EyeOff, title: "See what the provider sees", body: "A built-in side-by-side shows your IP, headers and query on a normal RPC versus through the anonymizing network." },
];

const LIMITS = [
  "Announcements, stealth addresses, amounts and timing are public on-chain.",
  "Anon-RPC hides who is asking, not what is asked.",
  "The one-time worker bootstrap read is not anonymized, and we count it.",
  "A malicious network or worker can observe, censor or lie. Choosing one is a trust decision.",
];

const FAQ = [
  {
    q: "What exactly does Anon-RPC hide?",
    a: "It hides your IP address from the RPC endpoint by sending requests through an anonymizing network (Nox, tor-js or Nym). It does not hide the query itself, and everything on-chain stays public.",
  },
  {
    q: "Why not just use a VPN?",
    a: "A VPN moves all your trust to one operator who sees your traffic and knows who you are. Anonymizing networks split what each relay knows, and the Anon-RPC worker is pinned to an on-chain hash and sandboxed, so what runs is auditable.",
  },
  {
    q: "Is it safe to use with real funds?",
    a: "No. This is unaudited testnet software built for a hackathon. It runs on Ethereum Sepolia, and spending from a stealth address isn't built into the interface yet.",
  },
  {
    q: "Do I have to trust your server?",
    a: "There isn't one. There is no backend, no account and no analytics. You do trust the anonymizing network you pick, and every read is counted in the app so you can check the routing.",
  },
  {
    q: "What happens if I lose my password?",
    a: "Your keys are encrypted with it and we cannot recover them. Export the encrypted backup from the Identity tab and keep it somewhere safe.",
  },
];

/* ───────────────────────── page ───────────────────────── */

export default function Landing() {
  return (
    <div className="theme-landing min-h-screen">
      {/* Nav — floating square bar */}
      <header className="sticky top-0 z-30 px-4 pt-4">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between border border-black bg-paper/95 px-4 shadow-[4px_4px_0_0_#000] backdrop-blur sm:px-5">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {[
              ["The leak", "#leak"],
              ["How it works", "#how"],
              ["Compare", "#compare"],
              ["FAQ", "#faq"],
            ].map(([label, href]) => (
              <a key={href} href={href} className="group relative px-4 py-2 font-mono text-xs uppercase tracking-wider text-black/65 transition hover:text-black">
                {label}
                <span className="absolute inset-x-4 bottom-1 h-[3px] origin-left scale-x-0 bg-accent transition-transform duration-200 group-hover:scale-x-100" />
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-black/60 lg:inline-flex">
              <span className="live-dot" />
              Sepolia
            </span>
            <Link href="/app" className={`${BTN} bg-black !px-5 !py-2.5 text-white hover:bg-accent hover:text-black`}>
              Launch app
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.045)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:linear-gradient(to_bottom,black_55%,transparent)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-14 pt-14 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="animate-panel">
            <div className={TAG}>
              <span className="h-2 w-2 bg-accent" />
              ERC-5564 × Anon-RPC · Ethereum Sepolia
            </div>
            <h1 className="mt-7 font-display text-[clamp(2.6rem,5.6vw,4.9rem)] font-bold leading-[0.98] tracking-[-0.04em]">
              Nobody sees
              <br />
              you get paid.
              <br />
              <span className="relative isolate mt-1 inline-block px-2 sm:px-3">
                <span className="absolute inset-0 -z-10 bg-accent" />
                Nobody sees you look.
              </span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-black/70">
              StealthRadar finds your stealth payments through an anonymizing network, so your RPC provider never learns which addresses are yours.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/app" className={`${BTN} bg-accent text-black shadow-[4px_4px_0_0_#000] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#000]`}>
                Open the app
              </Link>
              <a href="#leak" className={`${BTN} bg-paper hover:bg-black hover:text-white`}>
                See the leak it fixes
              </a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-2">
              {["Keys stay in your browser", "Fails closed", "Open source · MIT"].map((t) => (
                <li key={t} className="inline-flex items-center gap-2 border border-black/20 bg-paper px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-black/70">
                  <span className="h-1.5 w-1.5 bg-black" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="float-y border border-black bg-ink shadow-[10px_10px_0_0_#00EC97]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-mint/60">
                <span>Stealth inbox</span>
                <span className="inline-flex items-center gap-2 text-accent">
                  <span className="h-2 w-2 bg-accent" />
                  Illustrative preview
                </span>
              </div>
              <HeroArt />
            </div>
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl px-5 pb-24">
          <dl className="grid grid-cols-3 gap-3 sm:gap-5">
            {[
              ["0", "servers"],
              ["0", "trackers"],
              ["100%", "matched on-device"],
            ].map(([v, l]) => (
              <div key={l} className="border border-black bg-paper p-4 transition duration-200 hover:-translate-y-1 hover:shadow-[5px_5px_0_0_#000] sm:p-6">
                <dt className="font-display text-3xl font-bold tracking-tight sm:text-5xl">{v}</dt>
                <dd className="mt-1 font-mono text-[11px] uppercase tracking-wider text-black/55">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* The leak */}
      <section id="leak" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <SectionLabel n="01">The problem</SectionLabel>
          <h2 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.02] tracking-[-0.035em] sm:text-6xl">Stealth addresses leak at the RPC.</h2>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-black/70">
            To find your payments you have to ask the chain: logs, balances, receipts. A normal RPC provider sees your IP next to every address you ask about, which quietly re-links you to the very addresses stealth payments were meant to separate you from.
          </p>
          <div className="mt-12 border border-black bg-white p-3 sm:p-5">
            <LeakDiagram />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <SectionLabel n="02">How it works</SectionLabel>
          <h2 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.02] tracking-[-0.035em] sm:text-6xl">Three steps. Nobody in the middle.</h2>
          <div className="mt-12 grid border border-black md:grid-cols-3 md:divide-x md:divide-black">
            {STEPS.map(({ n, art, title, body }) => (
              <div key={n} className="flex flex-col border-b border-black last:border-b-0 md:border-b-0">
                <div className="h-48 border-b border-black bg-white p-4">{art}</div>
                <div className="flex-1 p-6">
                  <span className="grid h-7 w-7 place-items-center bg-black font-mono text-xs text-white">{n}</span>
                  <h3 className="mt-4 font-display text-2xl font-bold tracking-tight">{title}</h3>
                  <p className="mt-3 leading-relaxed text-black/70">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compare (dark) */}
      <section id="compare" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="theme-app border border-black p-6 sm:p-12">
            <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-wider text-accent">
              <span className="grid h-6 w-6 place-items-center bg-accent text-black">03</span>
              Compare
            </div>
            <h2 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.02] tracking-[-0.035em] sm:text-6xl">Same payments. Very different exposure.</h2>
            <div className="mt-10 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="font-mono text-[11px] uppercase tracking-wider text-mint/50">
                    <th className="border border-mint/15 px-5 py-3 font-medium"> </th>
                    <th className="border border-mint/15 px-5 py-3 font-medium">A normal RPC setup</th>
                    <th className="border border-mint/15 bg-accent px-5 py-3 font-medium text-black">StealthRadar</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map(([k, a, b]) => (
                    <tr key={k}>
                      <td className="border border-mint/15 px-5 py-4 font-medium">{k}</td>
                      <td className="border border-mint/15 px-5 py-4 text-mint/60">{a}</td>
                      <td className="border border-mint/15 bg-accent/10 px-5 py-4 font-medium text-accent">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-mint/40">&ldquo;Normal RPC setup&rdquo; means an ordinary RPC connection; it is not a claim about any specific product.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <SectionLabel n="04">Principles</SectionLabel>
          <h2 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.02] tracking-[-0.035em] sm:text-6xl">Built to be checked, not trusted.</h2>
          <div className="mt-12 grid gap-px border border-black bg-black sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-5 bg-paper p-7">
                <span className="grid h-11 w-11 shrink-0 place-items-center bg-accent text-black">
                  <Icon size={20} />
                </span>
                <div>
                  <h3 className="font-display text-xl font-bold tracking-tight">{title}</h3>
                  <p className="mt-2 leading-relaxed text-black/70">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Limits */}
      <section id="limits" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <SectionLabel n="05">Honesty</SectionLabel>
          <h2 className="mt-5 font-display text-4xl font-bold tracking-[-0.035em] sm:text-5xl">What it does not do</h2>
          <p className="mt-4 max-w-2xl text-black/70">Privacy tools earn trust by being upfront. Here is what StealthRadar does not hide.</p>
          <ul className="mt-10 grid gap-px border border-black bg-black md:grid-cols-2">
            {LIMITS.map((l, i) => (
              <li key={l} className="flex gap-4 bg-paper p-6 text-sm leading-relaxed">
                <span className="font-mono text-xs text-black/40">{String(i + 1).padStart(2, "0")}</span>
                {l}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24">
        <div className="mx-auto max-w-4xl px-5 py-20">
          <SectionLabel n="06">FAQ</SectionLabel>
          <h2 className="mt-5 font-display text-4xl font-bold tracking-[-0.035em] sm:text-6xl">Questions</h2>
          <div className="mt-10 border border-black">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group border-b border-black px-6 py-5 last:border-b-0">
                <summary className="flex cursor-pointer items-center justify-between gap-6 font-display text-lg font-semibold">
                  {q}
                  <span className="faq-plus grid h-8 w-8 shrink-0 place-items-center border border-black text-xl leading-none transition">+</span>
                </summary>
                <p className="mt-3 max-w-2xl leading-relaxed text-black/70">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section>
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="border border-black bg-accent p-10 text-center sm:p-16">
            <h2 className="mx-auto max-w-3xl font-display text-4xl font-bold leading-[1] tracking-[-0.04em] sm:text-6xl">Receive in private. Look in private.</h2>
            <p className="mx-auto mt-5 max-w-xl text-black/70">Try the full flow on Sepolia in a couple of minutes. You need a browser and a little test ETH.</p>
            <Link href="/app" className={`${BTN} mt-8 bg-black text-white hover:bg-paper hover:text-black`}>
              Launch StealthRadar
            </Link>
          </div>
        </div>
      </section>

      <footer>
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-10 sm:flex-row sm:items-center">
          <Logo />
          <div className="max-w-md space-y-2 text-xs leading-relaxed text-black/55">
            <p>
              Built on{" "}
              <a className="underline hover:text-black" href="https://eips.ethereum.org/EIPS/eip-5564" target="_blank" rel="noreferrer">
                ERC-5564
              </a>{" "}
              and{" "}
              <a className="underline hover:text-black" href="https://ethereum.github.io/anon-rpc/" target="_blank" rel="noreferrer">
                Anon-RPC
              </a>
              .
            </p>
            <p>Open source (MIT). Testnet software for ETHGlobal Mumbai, not audited. Do not use it to hold real funds.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
