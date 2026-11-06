// The ONLY place the app performs JSON-RPC. Audit point: grep for `fetch(` elsewhere — there must be none
// outside lib/anon-rpc/manager.ts.

import { createPublicClient, custom, type PublicClient } from "viem";
import { sepolia } from "viem/chains";
import { anonFetch } from "../anon-rpc/manager.ts";
import { TARGET_CHAINS } from "../anon-rpc/networks.ts";

let rpcId = 0;

/** The demo runs on Ethereum Sepolia only. */
export const EXPECTED_CHAIN_ID = TARGET_CHAINS.sepolia.id;
let chainCheck: Promise<void> | null = null;

interface Opts {
  isolationKey?: string;
  signal?: AbortSignal;
}

async function post<T>(method: string, params: unknown[], opts: Opts): Promise<T> {
  const res = await anonFetch(TARGET_CHAINS.sepolia.rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }),
    signal: opts.signal,
    isolationKey: opts.isolationKey,
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status} for ${method}`);
  const j = (await res.json()) as { result?: T; error?: { code: number; message: string } };
  if (j.error) throw new Error(`RPC ${method}: ${j.error.message} (${j.error.code})`);
  return j.result as T;
}

/** Refuse to read from any chain other than Sepolia (checked once per page session, through the same private path). */
function ensureSepolia(opts: Opts): Promise<void> {
  chainCheck ??= post<string>("eth_chainId", [], opts)
    .then((hex) => {
      const id = Number(BigInt(hex));
      if (id !== EXPECTED_CHAIN_ID) {
        throw new Error(`Wrong network: RPC reports chain ${id}, expected Ethereum Sepolia (${EXPECTED_CHAIN_ID}).`);
      }
    })
    .catch((e) => {
      chainCheck = null; // allow a retry
      throw e;
    });
  return chainCheck;
}

export async function rpcRequest<T = unknown>(method: string, params: unknown[] = [], opts: Opts = {}): Promise<T> {
  if (method !== "eth_chainId") await ensureSepolia(opts);
  return post<T>(method, params, opts);
}

/** viem client whose transport is the central Anon-RPC path (no other network access). */
export function getPublicClient(isolationKey?: string): PublicClient {
  return createPublicClient({
    chain: sepolia,
    transport: custom({
      request: ({ method, params }: { method: string; params?: unknown }) =>
        rpcRequest(method, (params as unknown[]) ?? [], { isolationKey }),
    }),
  }) as PublicClient;
}
