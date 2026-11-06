// Browser-safe manifest helpers (no node: imports). The server and the browser MUST hash identical bytes, so the
// canonical form lives here and manifest.ts re-uses it.

/** Stable JSON: keys sorted recursively, undefined dropped. */
export function canonicalize(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalize).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonicalize(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

export async function sha256Hex(text: string): Promise<string> {
  const d = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** The exact text the operator signs. Must equal manifestMessage() in manifest.ts. */
export async function manifestMessageClient(m: { providerId: string; walletAddress: string }): Promise<string> {
  return `ROUTIQ provider manifest v1\nprovider: ${m.providerId}\nwallet: ${m.walletAddress.toLowerCase()}\nsha256: ${await sha256Hex(canonicalize(m))}`;
}

export const toHexUtf8 = (s: string): string => "0x" + [...new TextEncoder().encode(s)].map((b) => b.toString(16).padStart(2, "0")).join("");
