// Source of truth: https://github.com/ethereum/anon-rpc/blob/main/adopters.json5 (verified 2026-11-06).
// `kind: "reference"` = does NOT anonymize. It must never be used for private mode.

export type NetworkKind = "network" | "reference";

export interface AnonNetwork {
  id: string;
  label: string;
  specifier: `0x${string}`;
  /** Chain the specifier contract lives on == chain the bootstrap RPC must read from. */
  specifierChainId: number;
  kind: NetworkKind;
  config?: unknown;
  note: string;
}

export const NETWORKS: AnonNetwork[] = [
  {
    id: "nox",
    label: "Nox — Sphinx mixnet",
    specifier: "0x35133267A8F7EC35046a83DCA0f4Ca8A6e1b7A9A",
    specifierChainId: 11155111,
    kind: "network",
    note: "Sphinx packets via entry/mix/exit nodes over KPS. Slower per request (mixing delay). Specifier is on Sepolia.",
  },
  {
    id: "tor-js",
    label: "tor-js — Tor in WebAssembly",
    specifier: "0x700dA3193D35fA54Cd3fBf29B66f2a2A0385659e",
    specifierChainId: 1,
    kind: "network",
    // Demonstration gateway from the official adopters list: limited capacity, may disappear.
    config: { gateways: ["152.236.3.22:12298:uEiCH0VdbhryzJcMtCfB0vLA4sOvHdQ4hq5w7CopcwU59bQ"] },
    note: "Full Tor client in the sandbox; gateways are blind KPS relays. Demo gateway may vanish — run your own for real use.",
  },
  {
    id: "nym",
    label: "Nym — mixnet",
    specifier: "0x3aCD9742C68F6d993066Ae25533e09b9e1f60eD0",
    specifierChainId: 1,
    kind: "network",
    note: "Nym mixnet client in WASM (~18 MB bundle, several seconds to bootstrap).",
  },
  {
    id: "passthrough",
    label: "Passthrough — NO anonymization (reference)",
    specifier: "0x4fd77be300f31c5fe6ab266d35d27750a3478d27",
    specifierChainId: 1,
    kind: "reference",
    note: "Plain fetch inside the sandbox. Demonstrates hash pinning only. Blocked in private mode.",
  },
];

/** Bootstrap RPCs: used ONCE to read the specifier contract; this read is NOT anonymized. */
export const BOOTSTRAP_RPC: Record<number, string> = {
  1: "https://ethereum-rpc.publicnode.com",
  11155111: "https://ethereum-sepolia-rpc.publicnode.com",
};

/** Destination RPC the anonymizing network's exit node calls on our behalf. */
export const TARGET_CHAINS = {
  sepolia: {
    id: 11155111,
    name: "Sepolia",
    // NEXT_PUBLIC_RPC_OVERRIDE is a BUILD-time knob used only by the local browser E2E (anvil fork).
    rpc: process.env.NEXT_PUBLIC_RPC_OVERRIDE || "https://ethereum-sepolia-rpc.publicnode.com",
  },
} as const;

export function getNetwork(id: string): AnonNetwork {
  const n = NETWORKS.find((x) => x.id === id);
  if (!n) throw new Error(`Unknown Anon-RPC network: ${id}`);
  return n;
}
