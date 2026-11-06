// Encrypted key vault primitives: PBKDF2-SHA256 -> AES-256-GCM (Web Crypto only).
// The metaAddress (public) is bound as AES-GCM additional data, so tampering with the stored public
// part makes decryption fail. Plaintext keys exist only inside decryptKeys()'s return value.

import { encodeMetaAddress, fromHex, keysFromPrivate, toHex, type StealthKeys } from "../crypto/stealth.ts";

export const DEFAULT_PBKDF2_ITERATIONS = 600_000; // OWASP 2023 guidance for PBKDF2-HMAC-SHA256
const MIN_DECRYPT_ITERATIONS = 1_000; // sanity floor only; tests use a low value for speed

export interface EncryptedVault {
  v: 1;
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
  /** Public data, stored in the clear (safe to show while locked). */
  metaAddress: string;
  spendingPublicKey: string;
  viewingPublicKey: string;
  createdAt: number;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

export function b64(b: Uint8Array): string {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
}
export function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveAesKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptKeys(
  password: string,
  keys: StealthKeys,
  opts: { iterations?: number } = {},
): Promise<EncryptedVault> {
  if (password.length < 8) throw new Error("Password must be at least 8 characters");
  const iterations = opts.iterations ?? DEFAULT_PBKDF2_ITERATIONS;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const metaAddress = encodeMetaAddress(keys.spendingPublicKey, keys.viewingPublicKey);

  const plaintext = enc.encode(
    JSON.stringify({ s: toHex(keys.spendingPrivateKey), v: toHex(keys.viewingPrivateKey) }),
  );
  const key = await deriveAesKey(password, salt, iterations);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource, additionalData: enc.encode(metaAddress) as BufferSource },
      key,
      plaintext as BufferSource,
    ),
  );
  plaintext.fill(0);

  return {
    v: 1,
    kdf: "PBKDF2-SHA256",
    iterations,
    salt: b64(salt),
    iv: b64(iv),
    ciphertext: b64(ct),
    metaAddress,
    spendingPublicKey: toHex(keys.spendingPublicKey),
    viewingPublicKey: toHex(keys.viewingPublicKey),
    createdAt: Date.now(),
  };
}

export class WrongPasswordError extends Error {
  constructor() {
    super("Wrong password or corrupted vault");
    this.name = "WrongPasswordError";
  }
}

export async function decryptKeys(password: string, vault: EncryptedVault): Promise<StealthKeys> {
  if (vault.v !== 1 || vault.kdf !== "PBKDF2-SHA256") throw new Error("Unsupported vault format");
  if (!Number.isInteger(vault.iterations) || vault.iterations < MIN_DECRYPT_ITERATIONS) {
    throw new Error("Vault KDF iterations too low");
  }
  const key = await deriveAesKey(password, unb64(vault.salt), vault.iterations);
  let pt: Uint8Array;
  try {
    pt = new Uint8Array(
      await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: unb64(vault.iv) as BufferSource,
          additionalData: enc.encode(vault.metaAddress) as BufferSource,
        },
        key,
        unb64(vault.ciphertext) as BufferSource,
      ),
    );
  } catch {
    throw new WrongPasswordError();
  }
  const parsed = JSON.parse(dec.decode(pt)) as { s: string; v: string };
  pt.fill(0);
  const keys = keysFromPrivate(fromHex(parsed.s), fromHex(parsed.v));
  // Defence in depth: decrypted keys must reproduce the public data we stored.
  if (encodeMetaAddress(keys.spendingPublicKey, keys.viewingPublicKey) !== vault.metaAddress) {
    keys.spendingPrivateKey.fill(0);
    keys.viewingPrivateKey.fill(0);
    throw new WrongPasswordError();
  }
  return keys;
}

/** Backups are just the encrypted vault JSON — never plaintext. */
export function exportBackup(vault: EncryptedVault): string {
  return JSON.stringify(vault, null, 2);
}

export function parseBackup(json: string): EncryptedVault {
  const v = JSON.parse(json) as EncryptedVault;
  if (v?.v !== 1 || v.kdf !== "PBKDF2-SHA256" || !v.salt || !v.iv || !v.ciphertext || !v.metaAddress) {
    throw new Error("Not a valid StealthRadar backup");
  }
  return v;
}
