import type { ModelOffer } from "./types.ts";

/** Cost in USD for a request, from token counts and per-1M prices. */
export function costUsd(offer: Pick<ModelOffer, "inputPerM" | "outputPerM">, inputTokens: number, outputTokens: number): number {
  return (inputTokens * offer.inputPerM + outputTokens * offer.outputPerM) / 1_000_000;
}

/** Rough pre-flight token estimate (~4 chars/token). Always labelled as an estimate. */
export function estimateInputTokens(messages: unknown): number {
  return Math.max(1, Math.ceil(JSON.stringify(messages ?? "").length / 4));
}

export const DEFAULT_EXPECTED_OUTPUT_TOKENS = 256;
