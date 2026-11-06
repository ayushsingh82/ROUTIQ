// ROUTIQ core types. Prices are USD per 1M tokens, as *declared by the provider's manifest*
// (never fetched from a live quotation), and every provider is labelled by how it is operated.

export type ProviderLabel = "local" | "reference" | "hosted";
export type RouteMode = "cheapest" | "fastest" | "balanced";

export interface ModelOffer {
  modelId: string;
  /** Who built the model (e.g. anthropic, qwen). Informational: one platform can serve many vendors. */
  vendor?: string;
  features?: string[];
  inputModalities?: string[];
  outputModalities?: string[];
  maxOutputTokens?: number;
  inputPerM: number;
  outputPerM: number;
  contextWindow?: number;
  category?: "general" | "coding" | "reasoning" | "vision" | "embedding" | "image" | "open-source";
  displayName?: string;
}

/** Static description of a provider, from `routiq.providers.json` or built in. */
export interface ProviderConfig {
  id: string;
  name: string;
  label: ProviderLabel;
  baseUrl: string; // OpenAI-compatible, e.g. http://127.0.0.1:11434/v1
  apiKeyEnv?: string; // name of the env var holding the upstream key (never the key itself)
  allowLoopback?: boolean; // only for local/reference providers
  operator?: string; // wallet address of the operator (ties to the ProviderRegistry)
  /** `upstream`: take price/context/vendor from the provider's own /models catalogue (e.g. NEAR AI Cloud). */
  pricingSource?: "manifest" | "upstream";
  /** If true the provider cannot serve requests without its API key; it is shown but excluded until configured. */
  requiresKey?: boolean;
  /** Prices for models the provider actually serves. `*` is a default for any discovered model. */
  prices: Record<string, { inputPerM: number; outputPerM: number; contextWindow?: number; category?: ModelOffer["category"] }>;
  note?: string;
}

export interface ProviderRuntime extends ProviderConfig {
  apiKey?: string;
  /** false when `requiresKey` is set and the key env var is empty. */
  configured: boolean;
}

export interface HealthSnapshot {
  providerId: string;
  status: "unknown" | "up" | "down";
  samples: number;
  successRate: number | null; // 0..1, null until measured
  avgLatencyMs: number | null;
  lastCheck: number | null;
  lastError: string | null;
}

export interface Candidate {
  providerId: string;
  providerName: string;
  label: ProviderLabel;
  offer: ModelOffer;
  health: HealthSnapshot;
  /** 0..1 from verifiable sources only; null means "no data" and is scored neutral. */
  reputation: number | null;
  /** Set when the provider is listed but cannot serve requests right now (e.g. API key missing). */
  unavailableReason?: string;
}

export interface Weights {
  cost: number;
  latency: number;
  availability: number;
  reputation: number;
}

export const DEFAULT_WEIGHTS: Weights = { cost: 0.4, latency: 0.3, availability: 0.2, reputation: 0.1 };

export interface ScoredCandidate extends Candidate {
  eligible: boolean;
  excludedReason?: string;
  estCostUsd: number;
  scores: { cost: number; latency: number; availability: number; reputation: number };
  total: number;
  notes: string[];
}

export interface RoutePolicy {
  mode: RouteMode;
  allowFallback: boolean;
  pinnedProviderId?: string;
  weights?: Partial<Weights>;
}

export interface UsageRecord {
  requestId: string;
  keyId: string;
  model: string;
  providerId: string;
  providerName: string;
  mode: RouteMode;
  inputTokens: number;
  outputTokens: number;
  tokensEstimated: boolean;
  costUsd: number;
  latencyMs: number;
  status: "ok" | "error" | "interrupted";
  fallbackFrom?: string[];
  createdAt: number;
}
