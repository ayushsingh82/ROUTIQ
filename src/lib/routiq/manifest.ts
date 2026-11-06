// Signed provider manifests. The operator signs the manifest with the wallet that owns the provider; the server
// verifies the signature (EIP-191 personal_sign) so nobody can register or modify a provider they do not control.
import { createHash } from "node:crypto";
import { canonicalize } from "./manifestClient.ts";
import { verifyMessage, type Address, type Hex } from "viem";

export interface ManifestModel {
  id: string;
  inputPrice: number; // USD per 1M tokens
  outputPrice: number;
  contextWindow?: number;
  category?: string;
}

export interface ProviderManifest {
  providerId: string;
  name: string;
  walletAddress: string;
  endpoint: string; // OpenAI-compatible base URL, e.g. https://provider.example.com/v1
  models: ManifestModel[];
  capabilities: string[];
  updatedAt: number; // unix ms; must be fresh (replay protection) and increase on updates
  status?: "active" | "inactive";
  manifestURI?: string;
}

export const ALLOWED_CAPABILITIES = ["chat", "streaming", "tool-calling", "vision", "embeddings"];
export const MAX_PRICE_PER_M = 1000; // sanity cap, USD per 1M tokens
export const MAX_SKEW_MS = 10 * 60 * 1000;

export { canonicalize };

export const manifestHash = (m: ProviderManifest): string => createHash("sha256").update(canonicalize(m)).digest("hex");

/** The exact text the operator signs (shown in their wallet). */
export function manifestMessage(m: ProviderManifest): string {
  return `ROUTIQ provider manifest v1\nprovider: ${m.providerId}\nwallet: ${m.walletAddress.toLowerCase()}\nsha256: ${manifestHash(m)}`;
}

export class ManifestError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ManifestError";
    this.status = status;
  }
}

const isAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s);

/** Structural + sanity validation. Endpoint safety (SSRF) and liveness are checked separately by the route. */
export function validateManifest(raw: unknown, now = Date.now()): ProviderManifest {
  const m = raw as Partial<ProviderManifest> | null;
  if (!m || typeof m !== "object") throw new ManifestError("manifest must be an object");
  if (typeof m.providerId !== "string" || !/^[a-z0-9][a-z0-9-]{2,39}$/.test(m.providerId)) throw new ManifestError("providerId must be 3-40 chars of a-z, 0-9, '-'");
  if (typeof m.name !== "string" || m.name.trim().length < 2 || m.name.length > 60) throw new ManifestError("name must be 2-60 characters");
  if (typeof m.walletAddress !== "string" || !isAddress(m.walletAddress)) throw new ManifestError("walletAddress must be an EVM address");
  if (typeof m.endpoint !== "string" || m.endpoint.length > 300) throw new ManifestError("endpoint is required");
  if (!Array.isArray(m.models) || m.models.length === 0 || m.models.length > 50) throw new ManifestError("models must list 1-50 models");
  for (const x of m.models) {
    if (!x || typeof x.id !== "string" || x.id.length === 0 || x.id.length > 120) throw new ManifestError("each model needs an id");
    for (const k of ["inputPrice", "outputPrice"] as const) {
      if (typeof x[k] !== "number" || !Number.isFinite(x[k]) || x[k] < 0 || x[k] > MAX_PRICE_PER_M) throw new ManifestError(`model ${x.id}: ${k} must be a number in [0, ${MAX_PRICE_PER_M}] USD per 1M tokens`);
    }
    if (x.contextWindow !== undefined && (!Number.isInteger(x.contextWindow) || x.contextWindow <= 0)) throw new ManifestError(`model ${x.id}: invalid contextWindow`);
  }
  if (new Set(m.models.map((x) => x.id)).size !== m.models.length) throw new ManifestError("duplicate model ids");
  if (!Array.isArray(m.capabilities) || m.capabilities.some((c) => !ALLOWED_CAPABILITIES.includes(c))) throw new ManifestError(`capabilities must be from: ${ALLOWED_CAPABILITIES.join(", ")}`);
  if (typeof m.updatedAt !== "number" || Math.abs(now - m.updatedAt) > MAX_SKEW_MS) throw new ManifestError("updatedAt must be within 10 minutes of the server time (replay protection)");
  if (m.status !== undefined && m.status !== "active" && m.status !== "inactive") throw new ManifestError("status must be active or inactive");
  return m as ProviderManifest;
}

export async function verifyManifestSignature(m: ProviderManifest, signature: string): Promise<boolean> {
  if (!/^0x[0-9a-fA-F]{130}$/.test(signature)) return false;
  try {
    return await verifyMessage({ address: m.walletAddress as Address, message: manifestMessage(m), signature: signature as Hex });
  } catch {
    return false;
  }
}
