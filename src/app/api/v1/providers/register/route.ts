import { probeProvider } from "@/lib/routiq/adapters/openaiCompat";
import { apiError } from "@/lib/routiq/http";
import { manifestHash, ManifestError, validateManifest, verifyManifestSignature } from "@/lib/routiq/manifest";
import { getRegistered, saveRegistered } from "@/lib/routiq/registry";
import { resetProviderCache } from "@/lib/routiq/providers";
import { assertSafeEndpoint, UnsafeEndpointError } from "@/lib/routiq/ssrf";

/**
 * Register a provider with a wallet-signed manifest.
 *   1. structural validation   2. signature must recover to manifest.walletAddress
 *   3. endpoint SSRF check (public https only; no localhost / private / metadata)
 *   4. the endpoint must really answer /models and list the declared models
 *   5. duplicate providerId → 409 (updates go through PATCH /providers/:id, signed by the same wallet)
 */
export async function POST(req: Request) {
  let body: { manifest?: unknown; signature?: string };
  try {
    body = await req.json();
  } catch {
    return apiError(400, "Body must be valid JSON.", "invalid_request_error", "invalid_json");
  }
  try {
    const manifest = validateManifest(body.manifest);
    if (!(await verifyManifestSignature(manifest, body.signature ?? ""))) return apiError(401, "Signature does not match walletAddress.", "authentication_error", "bad_signature");
    if (getRegistered(manifest.providerId)) return apiError(409, `Provider "${manifest.providerId}" is already registered. Use PATCH with a newer signed manifest.`, "invalid_request_error", "duplicate_provider");
    await assertSafeEndpoint(manifest.endpoint, { allowLoopback: false });
    const probe = await probeProvider({ id: manifest.providerId, name: manifest.name, label: "hosted", baseUrl: manifest.endpoint, prices: {}, configured: true });
    if (!probe.ok) return apiError(422, `Endpoint verification failed: ${probe.error}`, "invalid_request_error", "endpoint_unreachable");
    const missing = manifest.models.filter((m) => !probe.models.includes(m.id)).map((m) => m.id);
    if (missing.length) return apiError(422, `Endpoint does not serve: ${missing.join(", ")}`, "invalid_request_error", "models_not_served");
    const rec = saveRegistered(manifest, body.signature as string);
    resetProviderCache();
    return Response.json({ providerId: manifest.providerId, manifestHash: rec.manifestHash, active: rec.active, onchain: null, note: "Offchain registration verified. The onchain registry commitment is a separate step." }, { status: 201 });
  } catch (e) {
    if (e instanceof ManifestError) return apiError(e.status, e.message, "invalid_request_error", "invalid_manifest");
    if (e instanceof UnsafeEndpointError) return apiError(400, e.message, "invalid_request_error", "unsafe_endpoint");
    throw e;
  }
}

export { manifestHash };
