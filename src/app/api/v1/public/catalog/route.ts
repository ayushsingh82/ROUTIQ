import { healthSnapshot } from "@/lib/routiq/health";
import { getProviders, listMarket } from "@/lib/routiq/providers";

/** Public marketplace snapshot: every provider and every model that a reachable provider really serves. */
export async function GET() {
  const market = await listMarket(); // probes providers (cached ~20 s) → real health + live catalogues
  const providers = getProviders().map((p) => {
    const h = healthSnapshot(p.id);
    return {
      id: p.id,
      name: p.name,
      label: p.label,
      configured: p.configured,
      status: p.configured ? h.status : "not_configured",
      avgLatencyMs: h.avgLatencyMs,
      successRate: h.successRate,
      lastError: h.lastError,
      operator: p.operator ?? null,
      note: p.note ?? null,
      modelCount: market.filter((m) => m.providers.some((c) => c.providerId === p.id)).length,
    };
  });
  const models = market.map((m) => {
    const first = m.providers[0].offer;
    return {
      id: m.modelId,
      name: first.displayName ?? m.modelId,
      vendor: first.vendor ?? null,
      contextWindow: first.contextWindow ?? null,
      features: first.features ?? [],
      inputModalities: first.inputModalities ?? [],
      offers: m.providers.map((c) => ({
        providerId: c.providerId,
        providerName: c.providerName,
        label: c.label,
        inputPerM: c.offer.inputPerM,
        outputPerM: c.offer.outputPerM,
        status: c.unavailableReason ? "not_configured" : c.health.status,
        unavailableReason: c.unavailableReason ?? null,
        avgLatencyMs: c.health.avgLatencyMs,
      })),
    };
  });
  return Response.json({
    generatedAt: Date.now(),
    totals: {
      providers: providers.length,
      configuredProviders: providers.filter((p) => p.configured).length,
      models: models.length,
      vendors: new Set(models.map((m) => m.vendor).filter(Boolean)).size,
    },
    providers,
    models,
  });
}
