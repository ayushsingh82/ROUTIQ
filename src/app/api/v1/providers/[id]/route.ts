import { probeProvider } from "@/lib/routiq/adapters/openaiCompat";
import { apiError } from "@/lib/routiq/http";
import { ManifestError, validateManifest, verifyManifestSignature } from "@/lib/routiq/manifest";
import { getRegistered, saveRegistered } from "@/lib/routiq/registry";
import { assertSafeEndpoint, UnsafeEndpointError } from "@/lib/routiq/ssrf";
import { healthSnapshot } from "@/lib/routiq/health";
import { getProvider, listMarket, resetProviderCache } from "@/lib/routiq/providers";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const p = getProvider(id);
  if (!p) return apiError(404, `Unknown provider "${id}"`, "invalid_request_error", "provider_not_found");
  const market = await listMarket();
  const offers = market.flatMap((m) => m.providers.filter((c) => c.providerId === id).map((c) => ({ model: m.modelId, input_per_million_usd: c.offer.inputPerM, output_per_million_usd: c.offer.outputPerM })));
  return Response.json({ id: p.id, name: p.name, label: p.label, note: p.note ?? null, operator: p.operator ?? null, offers, health: healthSnapshot(p.id) });
}

/** Update or deactivate a registered provider. Requires a NEWER manifest signed by the SAME wallet. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const existing = getRegistered(id);
  if (!existing) return apiError(404, `Provider "${id}" is not an operator-registered provider.`, "invalid_request_error", "provider_not_found");
  let body: { manifest?: unknown; signature?: string };
  try {
    body = await req.json();
  } catch {
    return apiError(400, "Body must be valid JSON.", "invalid_request_error", "invalid_json");
  }
  try {
    const manifest = validateManifest(body.manifest);
    if (manifest.providerId !== id) return apiError(400, "providerId cannot change.", "invalid_request_error", "provider_id_mismatch");
    if (manifest.walletAddress.toLowerCase() !== existing.manifest.walletAddress.toLowerCase()) return apiError(403, "Only the registering wallet may modify this provider.", "authentication_error", "wrong_owner");
    if (!(await verifyManifestSignature(manifest, body.signature ?? ""))) return apiError(401, "Signature does not match walletAddress.", "authentication_error", "bad_signature");
    if (manifest.updatedAt <= existing.updatedAt) return apiError(409, "updatedAt must be newer than the current manifest (replay protection).", "invalid_request_error", "stale_manifest");
    if (manifest.status !== "inactive") {
      await assertSafeEndpoint(manifest.endpoint, { allowLoopback: false });
      const probe = await probeProvider({ id, name: manifest.name, label: "hosted", baseUrl: manifest.endpoint, prices: {}, configured: true });
      if (!probe.ok) return apiError(422, `Endpoint verification failed: ${probe.error}`, "invalid_request_error", "endpoint_unreachable");
      const missing = manifest.models.filter((m) => !probe.models.includes(m.id)).map((m) => m.id);
      if (missing.length) return apiError(422, `Endpoint does not serve: ${missing.join(", ")}`, "invalid_request_error", "models_not_served");
    }
    const rec = saveRegistered(manifest, body.signature as string, existing);
    resetProviderCache();
    return Response.json({ providerId: id, manifestHash: rec.manifestHash, active: rec.active });
  } catch (e) {
    if (e instanceof ManifestError) return apiError(e.status, e.message, "invalid_request_error", "invalid_manifest");
    if (e instanceof UnsafeEndpointError) return apiError(400, e.message, "invalid_request_error", "unsafe_endpoint");
    throw e;
  }
}
