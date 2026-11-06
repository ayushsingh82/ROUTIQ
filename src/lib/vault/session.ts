// In-memory unlocked-key session with inactivity auto-lock. Keys are zeroed on lock.
// Nothing here touches storage; callers persist only the EncryptedVault.

import type { StealthKeys } from "../crypto/stealth.ts";
import { decryptKeys, type EncryptedVault } from "./crypto.ts";

export const AUTO_LOCK_MS = 5 * 60 * 1000;

let keys: StealthKeys | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version++;
  listeners.forEach((l) => l());
}

function arm() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(lock, AUTO_LOCK_MS);
}

export function lock() {
  if (keys) {
    keys.spendingPrivateKey.fill(0);
    keys.viewingPrivateKey.fill(0);
  }
  keys = null;
  if (timer) clearTimeout(timer);
  timer = null;
  emit();
}

export async function unlock(password: string, vault: EncryptedVault) {
  const k = await decryptKeys(password, vault);
  lock();
  keys = k;
  arm();
  emit();
}

/** Adopt freshly generated keys (e.g. right after creating an identity). */
export function adoptKeys(k: StealthKeys) {
  lock();
  keys = k;
  arm();
  emit();
}

/** Returns live keys or null if locked. Resets the inactivity timer. Never log the result. */
export function getKeys(): StealthKeys | null {
  if (keys) arm();
  return keys;
}

export const vaultSession = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  isUnlocked: () => keys !== null,
  getVersion: () => version,
};
