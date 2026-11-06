export interface UsageRow {
  requestId: string;
  model: string;
  providerId: string;
  providerName: string;
  mode: string;
  inputTokens: number;
  outputTokens: number;
  tokensEstimated: boolean;
  costUsd: number;
  latencyMs: number;
  status: "ok" | "error" | "interrupted";
  fallbackFrom?: string[];
  createdAt: number;
}
export interface UsageResponse {
  summary: { requests: number; inputTokens: number; outputTokens: number; costUsd: number; byProvider: Record<string, { requests: number; costUsd: number }> };
  recent: UsageRow[];
}
export interface RoutingRow {
  requestId: string;
  model: string;
  mode: string;
  chain: string[];
  selected: string | null;
  reasons: Record<string, string>;
  excluded: Record<string, string>;
  createdAt: number;
}
