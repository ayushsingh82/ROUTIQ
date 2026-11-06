// Provider registry (server side): static config + live discovery. Offers exist only for models the
// provider REALLY reports from its /models endpoint, priced from its declared manifest.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { probeProvider, type UpstreamModel } from "./adapters/openaiCompat.ts";
import { listRegistered } from "./registry.ts";
import { healthSnapshot, recordHealth } from "./health.ts";
import type { Candidate, ModelOffer, ProviderConfig, ProviderRuntime } from "./types.ts";

const BUILTIN: ProviderConfig[] = [
  {
    id: "ollama-local",
    name: "Ollama (this machine)",
    label: "local",
    baseUrl: process.env.OLLAMA_URL ?? "http://127.0.0.1:11434/v1",
    allowLoopback: true,
    prices: { "*": { inputPerM: 0, outputPerM: 0, category: "open-source" } },
    note: "Local self-hosted inference. Free; speed depends on this machine.",
  },
  {
    id: "near-ai-cloud",
    name: "NEAR AI Cloud",
    label: "hosted",
    baseUrl: process.env.NEAR_AI_BASE_URL ?? "https://cloud-api.near.ai/v1",
    apiKeyEnv: "NEAR_AI_API_KEY",
    requiresKey: true,
    pricingSource: "upstream",
    prices: {},
    note: "One inference platform serving models from many vendors. Prices and context come from its own live catalogue. Prompts are visible to NEAR AI Cloud.",
  },
];

/** Models that are not chat-completion models (embeddings, rerankers, speech, image generation, filters). */
const NON_CHAT = /(embedding|reranker|whisper|privacy-filter|flux|stable-diffusion|tts|asr)/i;
export const isChatModel = (m: UpstreamModel): boolean =>
  !NON_CHAT.test(m.id) && (!m.output_modalities || (m.output_modalities.length === 1 && m.output_modalities[0] === "text"));

function validate(c: unknown): ProviderConfig | null {
  const x = c as Partial<ProviderConfig>;
  if (!x || typeof x.id !== "string" || typeof x.name !== "string" || typeof x.baseUrl !== "string" || !x.prices) return null;
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(x.id)) return null;
  const label = x.label === "local" || x.label === "reference" || x.label === "hosted" ? x.label : "hosted";
  return { ...(x as ProviderConfig), label };
}

let cached: ProviderRuntime[] | null = null;

export function getProviders(): ProviderRuntime[] {
  if (cached) return cached;
  let fromFile: ProviderConfig[] = [];
  try {
    const raw = JSON.parse(readFileSync(join(process.cwd(), "routiq.providers.json"), "utf8")) as { providers?: unknown[] };
    fromFile = (raw.providers ?? []).map(validate).filter((v): v is ProviderConfig => v !== null);
  } catch {
    /* optional file */
  }
  const byId = new Map<string, ProviderConfig>();
  for (const c of process.env.ROUTIQ_DISABLE_OLLAMA === "1" ? [] : BUILTIN) byId.set(c.id, c);
  for (const c of fromFile) byId.set(c.id, c);
  // Operator-registered providers (wallet-signed manifests). Public endpoints only; never loopback.
  for (const r of listRegistered()) {
    if (!r.active) continue;
    const m = r.manifest;
    byId.set(m.providerId, {
      id: m.providerId,
      name: m.name,
      label: "hosted",
      baseUrl: m.endpoint,
      operator: m.walletAddress,
      prices: Object.fromEntries(m.models.map((x) => [x.id, { inputPerM: x.inputPrice, outputPerM: x.outputPrice, contextWindow: x.contextWindow }])),
      note: `Registered by ${m.walletAddress}; manifest ${r.manifestHash.slice(0, 12)}… signed by the operator wallet.`,
    });
  }
  cached = [...byId.values()].map((c) => {
    const apiKey = c.apiKeyEnv ? process.env[c.apiKeyEnv] || undefined : undefined;
    return { ...c, apiKey, configured: !c.requiresKey || Boolean(apiKey) };
  });
  return cached;
}

export const getProvider = (id: string) => getProviders().find((p) => p.id === id);

interface DiscoveryEntry {
  at: number;
  models: string[];
  infos: Map<string, UpstreamModel>;
}
const discovery = new Map<string, DiscoveryEntry>();
const TTL_MS = 20_000;

/** Probes a provider (a real request), records health, and caches the model list briefly. */
export async function refreshProvider(p: ProviderRuntime, force = false): Promise<string[]> {
  const hit = discovery.get(p.id);
  if (!force && hit && Date.now() - hit.at < TTL_MS) return hit.models;
  const r = await probeProvider(p);
  recordHealth(p.id, r.ok, r.ms, r.error);
  const infos = new Map(r.infos.filter((m) => p.pricingSource !== "upstream" || isChatModel(m)).map((m) => [m.id, m]));
  const models = r.ok ? [...infos.keys()] : [];
  discovery.set(p.id, { at: Date.now(), models, infos });
  return models;
}

function offerFor(p: ProviderRuntime, modelId: string): ModelOffer | null {
  if (p.pricingSource === "upstream") {
    const info = discovery.get(p.id)?.infos.get(modelId);
    const pr = info?.pricing;
    if (!info || typeof pr?.input !== "number" || typeof pr?.output !== "number") return null; // no upstream price → not offered
    return {
      modelId,
      displayName: info.name ?? modelId,
      vendor: info.owned_by,
      inputPerM: pr.input,
      outputPerM: pr.output,
      contextWindow: info.context_length,
      maxOutputTokens: info.max_output_length,
      features: info.supported_features,
      inputModalities: info.input_modalities,
      outputModalities: info.output_modalities,
      category: "general",
    };
  }
  const price = p.prices[modelId] ?? p.prices["*"];
  if (!price) return null; // unpriced models are not offered: we never guess a price
  return { modelId, inputPerM: price.inputPerM, outputPerM: price.outputPerM, contextWindow: price.contextWindow, category: price.category, displayName: modelId };
}

/** All providers that currently serve `modelId`, with live health. */
export async function buildCandidates(modelId: string): Promise<Candidate[]> {
  const out: Candidate[] = [];
  await Promise.all(
    getProviders().map(async (p) => {
      const models = await refreshProvider(p);
      const health = healthSnapshot(p.id);
      // A down provider that is NOT currently listing the model still appears (as excluded) if the model is in its manifest.
      const serves = models.includes(modelId) || (health.status === "down" && Boolean(p.prices[modelId]));
      if (!serves) return;
      const offer = offerFor(p, modelId);
      if (!offer) return;
      out.push({ providerId: p.id, providerName: p.name, label: p.label, offer, health, reputation: null, unavailableReason: p.configured ? undefined : `${p.apiKeyEnv ?? "API key"} is not set on the server` });
    }),
  );
  return out.sort((a, b) => a.providerId.localeCompare(b.providerId));
}

export interface MarketModel {
  modelId: string;
  providers: Candidate[];
}

/** The marketplace: every model that at least one reachable provider really serves. */
export async function listMarket(): Promise<MarketModel[]> {
  const byModel = new Map<string, Candidate[]>();
  await Promise.all(
    getProviders().map(async (p) => {
      const models = await refreshProvider(p);
      const health = healthSnapshot(p.id);
      for (const m of models) {
        const offer = offerFor(p, m);
        if (!offer) continue;
        const list = byModel.get(m) ?? [];
        list.push({ providerId: p.id, providerName: p.name, label: p.label, offer, health, reputation: null, unavailableReason: p.configured ? undefined : `${p.apiKeyEnv ?? "API key"} is not set on the server` });
        byModel.set(m, list);
      }
    }),
  );
  return [...byModel.entries()].map(([modelId, providers]) => ({ modelId, providers: providers.sort((a, b) => a.providerId.localeCompare(b.providerId)) })).sort((a, b) => a.modelId.localeCompare(b.modelId));
}

export function resetProviderCache(): void {
  cached = null;
  discovery.clear();
}
