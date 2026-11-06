import { healthSnapshot } from "@/lib/routiq/health";
import { listMarket, getProviders } from "@/lib/routiq/providers";

/** Public provider directory (no secrets). Health is measured, never invented. */
export async function GET() {
  const market = await listMarket(); // also refreshes health
  return Response.json({
    object: "list",
    data: getProviders().map((p) => ({
      id: p.id,
      name: p.name,
      label: p.label,
      endpoint: p.label === "hosted" ? p.baseUrl : `${p.baseUrl} (local/reference)`,
      operator: p.operator ?? null,
      note: p.note ?? null,
      models: market.filter((m) => m.providers.some((c) => c.providerId === p.id)).map((m) => m.modelId),
      health: healthSnapshot(p.id),
      pricing_is_declared: true,
    })),
  });
}
