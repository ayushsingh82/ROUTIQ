import { authenticate, isResponse } from "@/lib/routiq/http";
import { listMarket } from "@/lib/routiq/providers";

/** OpenAI-compatible model list; each entry carries the providers that REALLY serve it. */
export async function GET(req: Request) {
  const key = authenticate(req);
  if (isResponse(key)) return key;
  const market = await listMarket();
  return Response.json({
    object: "list",
    data: market.map((m) => ({
      id: m.modelId,
      object: "model",
      created: 0,
      owned_by: m.providers[0]?.offer.vendor ?? "routiq",
      name: m.providers[0]?.offer.displayName ?? m.modelId,
      context_length: m.providers[0]?.offer.contextWindow ?? null,
      routiq: {
        providers: m.providers.map((c) => ({
          id: c.providerId,
          name: c.providerName,
          label: c.label,
          input_per_million_usd: c.offer.inputPerM,
          output_per_million_usd: c.offer.outputPerM,
          status: c.unavailableReason ? "not_configured" : c.health.status,
          unavailable_reason: c.unavailableReason ?? null,
          avg_latency_ms: c.health.avgLatencyMs,
        })),
      },
    })),
  });
}
