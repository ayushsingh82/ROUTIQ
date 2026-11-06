// Offchain registry of operator-registered providers (signed manifests). The onchain ProviderRegistry stores only
// the identity + manifest hash commitment; this store holds the full manifest and the signature that backs it.
import { manifestHash, type ProviderManifest } from "./manifest.ts";
import { readJson, writeJson } from "./store.ts";

export interface RegisteredProvider {
  manifest: ProviderManifest;
  signature: string;
  manifestHash: string;
  registeredAt: number;
  updatedAt: number;
  active: boolean;
  /** Set once the manifest commitment has been written to the onchain ProviderRegistry. */
  onchainTx?: string;
}

const FILE = "registered-providers.json";
const load = () => readJson<RegisteredProvider[]>(FILE, []);

export const listRegistered = (): RegisteredProvider[] => load();
export const getRegistered = (id: string) => load().find((p) => p.manifest.providerId === id);

export function saveRegistered(manifest: ProviderManifest, signature: string, existing?: RegisteredProvider): RegisteredProvider {
  const all = load().filter((p) => p.manifest.providerId !== manifest.providerId);
  const rec: RegisteredProvider = {
    manifest,
    signature,
    manifestHash: manifestHash(manifest),
    registeredAt: existing?.registeredAt ?? Date.now(),
    updatedAt: manifest.updatedAt,
    active: manifest.status !== "inactive",
    onchainTx: existing?.onchainTx,
  };
  writeJson(FILE, [...all, rec]);
  return rec;
}
