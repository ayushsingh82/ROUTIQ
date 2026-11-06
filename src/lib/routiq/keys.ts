// API keys: only a sha256 hash is stored; the plaintext is shown once. Revocable, rate-limited.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { readJson, writeJson } from "./store.ts";

export interface KeyRecord {
  id: string;
  name: string;
  hash: string; // sha256 hex of the full key
  prefix: string; // first chars, for display only
  rpm: number; // requests per minute
  createdAt: number;
  revokedAt?: number;
}

const FILE = "keys.json";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

function load(): KeyRecord[] {
  return readJson<KeyRecord[]>(FILE, []);
}

export function createKey(name: string, rpm = 60): { record: Omit<KeyRecord, "hash">; key: string } {
  const key = `rq_live_${randomBytes(24).toString("hex")}`;
  const record: KeyRecord = { id: `key_${randomBytes(6).toString("hex")}`, name: name.slice(0, 60) || "unnamed", hash: sha(key), prefix: key.slice(0, 12), rpm, createdAt: Date.now() };
  writeJson(FILE, [...load(), record]);
  const { hash: _hash, ...safe } = record;
  void _hash;
  return { record: safe, key };
}

export function listKeys(): Omit<KeyRecord, "hash">[] {
  return load().map(({ hash, ...r }) => (void hash, r));
}

export function revokeKey(id: string): boolean {
  const all = load();
  const k = all.find((r) => r.id === id && !r.revokedAt);
  if (!k) return false;
  k.revokedAt = Date.now();
  writeJson(FILE, all);
  return true;
}

export function verifyKey(presented: string): KeyRecord | null {
  if (!presented.startsWith("rq_live_")) return null;
  const h = Buffer.from(sha(presented), "hex");
  for (const r of load()) {
    if (r.revokedAt) continue;
    const a = Buffer.from(r.hash, "hex");
    if (a.length === h.length && timingSafeEqual(a, h)) return r;
  }
  return null;
}

// Fixed-window per-key rate limiter (in memory).
const windows = new Map<string, { start: number; count: number }>();
export function rateLimit(keyId: string, rpm: number, now = Date.now()): { ok: boolean; retryAfterSec: number } {
  const w = windows.get(keyId);
  if (!w || now - w.start >= 60_000) {
    windows.set(keyId, { start: now, count: 1 });
    return { ok: true, retryAfterSec: 0 };
  }
  if (w.count >= rpm) return { ok: false, retryAfterSec: Math.ceil((60_000 - (now - w.start)) / 1000) };
  w.count++;
  return { ok: true, retryAfterSec: 0 };
}
