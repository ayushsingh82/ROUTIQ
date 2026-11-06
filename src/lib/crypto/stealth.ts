// ERC-5564 scheme 1 (secp256k1 with view tags).
// Spec: https://eips.ethereum.org/EIPS/eip-5564
//
// The ERC leaves the hash `h` abstract. We follow the common implementation
// convention: h(s) = keccak256(x-coordinate of the shared point, 32 bytes).
// This lives in ONE function (`hashSharedSecret`) so it is trivial to audit/change.
// Interop with other stealth tools should be cross-checked before relying on it.
//
// SECURITY: nothing in this file does I/O. Private keys must never be logged or sent anywhere.

import { secp256k1 } from "@noble/curves/secp256k1.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

const Point = secp256k1.Point;
const N: bigint = Point.Fn.ORDER;

export const SCHEME_ID_SECP256K1 = 1n;

export type Bytes = Uint8Array;

// ---------- hex helpers ----------
export function toHex(b: Bytes): `0x${string}` {
  return `0x${bytesToHex(b)}`;
}
export function fromHex(h: string): Bytes {
  const s = h.startsWith("0x") || h.startsWith("0X") ? h.slice(2) : h;
  if (s.length % 2 !== 0) throw new Error("Invalid hex: odd length");
  return hexToBytes(s);
}
function bytesToBigInt(b: Bytes): bigint {
  return b.length === 0 ? 0n : BigInt(`0x${bytesToHex(b)}`);
}
function bigIntTo32(n: bigint): Bytes {
  return hexToBytes(n.toString(16).padStart(64, "0"));
}

// ---------- keys ----------
export interface StealthKeys {
  spendingPrivateKey: Bytes;
  spendingPublicKey: Bytes; // 33-byte compressed
  viewingPrivateKey: Bytes;
  viewingPublicKey: Bytes; // 33-byte compressed
}

/** Generate a fresh recipient key set using the platform CSPRNG. */
export function generateStealthKeys(): StealthKeys {
  const spendingPrivateKey = secp256k1.utils.randomSecretKey();
  const viewingPrivateKey = secp256k1.utils.randomSecretKey();
  return {
    spendingPrivateKey,
    spendingPublicKey: secp256k1.getPublicKey(spendingPrivateKey, true),
    viewingPrivateKey,
    viewingPublicKey: secp256k1.getPublicKey(viewingPrivateKey, true),
  };
}

/** Rebuild the full key set from the two private keys (used on import/unlock). */
export function keysFromPrivate(spendingPrivateKey: Bytes, viewingPrivateKey: Bytes): StealthKeys {
  return {
    spendingPrivateKey,
    spendingPublicKey: secp256k1.getPublicKey(spendingPrivateKey, true),
    viewingPrivateKey,
    viewingPublicKey: secp256k1.getPublicKey(viewingPrivateKey, true),
  };
}

// ---------- meta-address ----------
export const META_PREFIX = "st:eth:0x";

export function encodeMetaAddress(spendingPublicKey: Bytes, viewingPublicKey: Bytes): string {
  assertCompressedPubKey(spendingPublicKey, "spending");
  assertCompressedPubKey(viewingPublicKey, "viewing");
  return `${META_PREFIX}${bytesToHex(spendingPublicKey)}${bytesToHex(viewingPublicKey)}`;
}

export function parseMetaAddress(meta: string): { spendingPublicKey: Bytes; viewingPublicKey: Bytes } {
  const m = meta.trim();
  if (!m.startsWith(META_PREFIX)) throw new Error("Meta-address must start with st:eth:0x");
  const body = fromHex(m.slice(META_PREFIX.length));
  if (body.length !== 66) throw new Error("Meta-address must contain two 33-byte compressed public keys");
  const spendingPublicKey = body.slice(0, 33);
  const viewingPublicKey = body.slice(33);
  assertCompressedPubKey(spendingPublicKey, "spending");
  assertCompressedPubKey(viewingPublicKey, "viewing");
  return { spendingPublicKey, viewingPublicKey };
}

function assertCompressedPubKey(pk: Bytes, label: string) {
  if (pk.length !== 33 || (pk[0] !== 0x02 && pk[0] !== 0x03)) {
    throw new Error(`Invalid ${label} public key: expected 33-byte compressed point`);
  }
  try {
    Point.fromBytes(pk); // throws if not on curve
  } catch {
    throw new Error(`Invalid ${label} public key: not a valid secp256k1 point`);
  }
}

// ---------- core derivations ----------
/** h(s): keccak256 of the shared point's x-coordinate. Returns 32 bytes. */
function hashSharedSecret(privateKey: Bytes, publicKey: Bytes): Bytes {
  const shared = secp256k1.getSharedSecret(privateKey, publicKey, true); // 33 bytes compressed
  return keccak_256(shared.slice(1)); // drop 0x02/0x03 prefix → x-coordinate
}

/** Ethereum address of a secp256k1 public point (0x-prefixed, lowercase hex). */
export function pubKeyToAddress(point: InstanceType<typeof Point>): `0x${string}` {
  const uncompressed = point.toBytes(false); // 65 bytes, 0x04 || X || Y
  return toHex(keccak_256(uncompressed.slice(1)).slice(12));
}

function stealthPointFor(spendingPublicKey: Bytes, hashedSecret: Bytes) {
  const sh = bytesToBigInt(hashedSecret) % N;
  if (sh === 0n) throw new Error("Degenerate shared secret"); // astronomically unlikely
  const stealth = Point.fromBytes(spendingPublicKey).add(Point.BASE.multiply(sh));
  return stealth;
}

export interface GeneratedStealth {
  stealthAddress: `0x${string}`;
  ephemeralPublicKey: Bytes; // 33-byte compressed
  viewTag: number; // 0..255
}

/**
 * Sender side. `ephemeralPrivateKey` is injectable for tests only;
 * production callers must omit it so a fresh CSPRNG key is used.
 */
export function generateStealthAddress(meta: string, ephemeralPrivateKey?: Bytes): GeneratedStealth {
  const { spendingPublicKey, viewingPublicKey } = parseMetaAddress(meta);
  const eph = ephemeralPrivateKey ?? secp256k1.utils.randomSecretKey();
  const ephemeralPublicKey = secp256k1.getPublicKey(eph, true);
  const sh = hashSharedSecret(eph, viewingPublicKey);
  const stealth = stealthPointFor(spendingPublicKey, sh);
  return { stealthAddress: pubKeyToAddress(stealth), ephemeralPublicKey, viewTag: sh[0] };
}

/** Cheap pre-filter (1 ECMUL + 1 hash). A match here does NOT prove ownership. */
export function viewTagMatches(viewingPrivateKey: Bytes, ephemeralPublicKey: Bytes, viewTag: number): boolean {
  const sh = hashSharedSecret(viewingPrivateKey, ephemeralPublicKey);
  return sh[0] === viewTag;
}

/**
 * Full ERC-5564 `checkStealthAddress`. Returns true only if the announced stealth
 * address is exactly the one derived for this recipient. Invalid ephemeral keys → false.
 */
export function checkStealthAddress(args: {
  viewingPrivateKey: Bytes;
  spendingPublicKey: Bytes;
  ephemeralPublicKey: Bytes;
  stealthAddress: string;
  viewTag: number;
}): boolean {
  try {
    const sh = hashSharedSecret(args.viewingPrivateKey, args.ephemeralPublicKey);
    if (sh[0] !== args.viewTag) return false;
    const stealth = stealthPointFor(args.spendingPublicKey, sh);
    return pubKeyToAddress(stealth).toLowerCase() === args.stealthAddress.toLowerCase();
  } catch {
    return false; // malformed ephemeral key etc. is simply "not ours"
  }
}

/**
 * Stealth private key = (p_spend + s_h) mod n. Only call for announcements that passed
 * `checkStealthAddress`. Handle the result as a live secret.
 */
export function computeStealthPrivateKey(args: {
  spendingPrivateKey: Bytes;
  viewingPrivateKey: Bytes;
  ephemeralPublicKey: Bytes;
}): Bytes {
  const sh = bytesToBigInt(hashSharedSecret(args.viewingPrivateKey, args.ephemeralPublicKey)) % N;
  const k = (bytesToBigInt(args.spendingPrivateKey) + sh) % N;
  if (k === 0n) throw new Error("Degenerate stealth key");
  return bigIntTo32(k);
}
