// Anon-RPC worker lifecycle + honest counters. Browser-only.
// One long-lived worker per network (per the integration guide). Fail-closed in private mode.

import type { AnonRpcWorker as AnonRpcWorkerType } from "@anon-rpc/browser-harness";
import { BOOTSTRAP_RPC, getNetwork, type AnonNetwork } from "./networks.ts";

export type WorkerStatus = "idle" | "starting" | "ready" | "failed";
export type PrivacyMode = "private" | "direct";

export interface AnonState {
  networkId: string | null;
  kind: AnonNetwork["kind"] | null;
  specifier: string | null;
  status: WorkerStatus;
  error: string | null;
  mode: PrivacyMode;
  /** Reads that went through worker.fetch (anonymized iff kind === "network"). */
  anonRequests: number;
  /** Reads sent without the worker (only possible after the user explicitly picked direct mode). */
  directRequests: number;
  /** One-time, non-anonymized read of the specifier contract(s). */
  bootstrapRequests: number;
  failedRequests: number;
  /** Provider's-view comparison probes (demo only; sent to an echo endpoint, never carries real data). */
  probeRequests: number;
  totalLatencyMs: number;
  startedAt: number | null;
  readyAt: number | null;
}

const initial = (): AnonState => ({
  networkId: null,
  kind: null,
  specifier: null,
  status: "idle",
  error: null,
  mode: "private",
  anonRequests: 0,
  directRequests: 0,
  bootstrapRequests: 0,
  failedRequests: 0,
  probeRequests: 0,
  totalLatencyMs: 0,
  startedAt: null,
  readyAt: null,
});

export class PrivacyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrivacyError";
  }
}

let state: AnonState = initial();
let worker: AnonRpcWorkerType | null = null;
const listeners = new Set<() => void>();

function set(patch: Partial<AnonState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const anonStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot: () => state,
  getServerSnapshot: () => state,
};

export function setPrivacyMode(mode: PrivacyMode) {
  set({ mode });
}

export async function startWorker(networkId: string): Promise<void> {
  stopWorker();
  const net = getNetwork(networkId);
  const bootstrapUrl = BOOTSTRAP_RPC[net.specifierChainId];
  if (!bootstrapUrl) throw new Error(`No bootstrap RPC for chain ${net.specifierChainId}`);

  set({
    ...initial(),
    mode: state.mode,
    networkId: net.id,
    kind: net.kind,
    specifier: net.specifier,
    status: "starting",
    startedAt: Date.now(),
  });

  try {
    const { AnonRpcWorker } = await import("@anon-rpc/browser-harness");
    worker = new AnonRpcWorker({
      address: net.specifier,
      config: net.config as never, // network-defined, opaque to the harness
      preExisting: {
        // Used ONCE by the harness to read the specifier contract. Not anonymized — counted separately.
        rpcProvider: {
          request: async ({ method, params }: { method: string; params?: unknown }) => {
            set({ bootstrapRequests: state.bootstrapRequests + 1 });
            const res = await fetch(bootstrapUrl, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: params ?? [] }),
            });
            const j = await res.json();
            if (j.error) throw new Error(j.error.message ?? "bootstrap RPC error");
            return j.result;
          },
        },
      },
    });
    await worker.ready;
    set({ status: "ready", readyAt: Date.now(), error: null });
  } catch (e) {
    worker = null;
    set({ status: "failed", error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
    throw e;
  }
}

export function stopWorker() {
  try {
    worker?.close();
  } catch {
    /* ignore */
  }
  worker = null;
  set({ ...initial(), mode: state.mode });
}

/**
 * THE choke point for chain reads. Every JSON-RPC call in the app goes through here.
 * - private mode: requires a ready worker on a genuine anonymizing network, else throws (fail closed).
 * - direct mode: explicit user opt-in only; counted separately.
 */
export async function anonFetch(url: string, init: RequestInit & { isolationKey?: string }): Promise<Response> {
  const t0 = performance.now();
  try {
    if (state.mode === "direct") {
      const res = await fetch(url, init);
      set({ directRequests: state.directRequests + 1, totalLatencyMs: state.totalLatencyMs + (performance.now() - t0) });
      return res;
    }
    if (!worker || state.status !== "ready") {
      throw new PrivacyError("Privacy mode: Anon-RPC worker is not ready. Refusing to fall back to direct RPC.");
    }
    if (state.kind !== "network") {
      throw new PrivacyError("Privacy mode: the selected worker is a reference/passthrough worker and does not anonymize.");
    }
    const { isolationKey, ...rest } = init;
    const res = await worker.fetch(url, {
      ...rest,
      ...(isolationKey ? { anonOptions: { isolationKey } } : {}),
    } as RequestInit);
    set({ anonRequests: state.anonRequests + 1, totalLatencyMs: state.totalLatencyMs + (performance.now() - t0) });
    return res;
  } catch (e) {
    set({ failedRequests: state.failedRequests + 1 });
    throw e;
  }
}

/**
 * Provider's-view demo ONLY. Sends the same request either directly or through the worker to an ECHO
 * endpoint so the UI can show what a provider would observe. It never changes the privacy mode and never
 * carries real keys/addresses (callers must pass throwaway data). Counted separately as `probeRequests`.
 * Kept in this file so all network egress stays in one auditable place.
 */
export async function probeFetch(via: "direct" | "anon", url: string, init: RequestInit): Promise<Response> {
  if (via === "direct") {
    const res = await fetch(url, init);
    set({ probeRequests: state.probeRequests + 1 });
    return res;
  }
  if (!worker || state.status !== "ready") throw new PrivacyError("Start an Anon-RPC worker first.");
  if (state.kind !== "network") throw new PrivacyError("The selected worker does not anonymize; pick a real network.");
  const res = await worker.fetch(url, init);
  set({ probeRequests: state.probeRequests + 1 });
  return res;
}
