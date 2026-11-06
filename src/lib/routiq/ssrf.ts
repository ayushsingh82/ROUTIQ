// Endpoint safety for provider registration and health checks (SSRF defence).
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export function isLoopback(ip: string): boolean {
  if (ip === "::1") return true;
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  return isIP(v4) === 4 && v4.startsWith("127.");
}

/** True for addresses an outside caller must never be able to make us contact. */
export function isPrivateAddress(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower.startsWith("::ffff:")) return isPrivateAddress(lower.slice(7));
  if (isIP(lower) === 6) {
    return lower === "::" || lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || /^fe[89ab]/.test(lower);
  }
  if (isIP(lower) !== 4) return true; // not an IP at all: refuse
  const [a, b] = lower.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) || // link-local incl. cloud metadata 169.254.169.254
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    a >= 224 // multicast / reserved
  );
}

export type Resolver = (host: string) => Promise<string[]>;
const defaultResolver: Resolver = async (host) => (await lookup(host, { all: true })).map((r) => r.address);

export class UnsafeEndpointError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeEndpointError";
  }
}

/**
 * Validates a provider base URL. Loopback is permitted only when `allowLoopback` is set (local/reference
 * providers). Metadata and private ranges are always refused. Hostnames are resolved and every address is checked.
 */
export async function assertSafeEndpoint(raw: string, opts: { allowLoopback?: boolean; resolver?: Resolver } = {}): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeEndpointError("Endpoint is not a valid URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new UnsafeEndpointError("Only http(s) endpoints are allowed");
  if (url.username || url.password) throw new UnsafeEndpointError("Credentials in the URL are not allowed");

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  let addrs: string[];
  try {
    addrs = isIP(host) ? [host] : host === "localhost" ? ["127.0.0.1"] : await (opts.resolver ?? defaultResolver)(host);
  } catch {
    throw new UnsafeEndpointError("Endpoint hostname could not be resolved");
  }
  if (addrs.length === 0) throw new UnsafeEndpointError("Endpoint did not resolve");

  for (const a of addrs) {
    if (isLoopback(a)) {
      if (!opts.allowLoopback) throw new UnsafeEndpointError("Loopback endpoints are not allowed for this provider");
      continue;
    }
    if (isPrivateAddress(a)) throw new UnsafeEndpointError(`Endpoint resolves to a private or reserved address (${a})`);
  }
  if (url.protocol === "http:" && !opts.allowLoopback && !addrs.every(isLoopback)) {
    throw new UnsafeEndpointError("Plain http is only allowed for local providers; use https");
  }
  return url;
}
