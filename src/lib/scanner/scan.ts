// Announcement scanner. Pure logic over injected deps (testable in Node, no network here).
// Pipeline per announcement: scheme filter -> shape check -> view tag (cheap) -> full address check.
// A view-tag pass alone NEVER produces a match.

import { checkStealthAddress, fromHex, viewTagMatches } from "../crypto/stealth.ts";
import { parseMetadata } from "../erc5564/metadata.ts";
import type { MatchedAnnouncement, RawAnnouncement, ScanDeps, ScanProgress } from "./types.ts";

export const REORG_DEPTH = 12n;
export const DEFAULT_CHUNK = 2000n;
const MAX_RETRIES_PER_CHUNK = 6;

export function announcementId(chainId: number, a: Pick<RawAnnouncement, "txHash" | "logIndex">): string {
  return `${chainId}:${a.txHash.toLowerCase()}:${a.logIndex}`;
}

/** Incremental scans re-scan the last REORG_DEPTH blocks; dedupe by id makes this idempotent. */
export function nextScanStart(lastScannedBlock: bigint | null, userStart: bigint): bigint {
  if (lastScannedBlock === null) return userStart;
  const s = lastScannedBlock - REORG_DEPTH;
  return s > userStart ? s : userStart;
}

export interface ScanOptions {
  chainId: number;
  viewingPrivateKey: Uint8Array;
  spendingPublicKey: Uint8Array;
  fromBlock: bigint;
  toBlock?: bigint; // default: latest
  chunkSize?: bigint;
  seenIds?: Set<string>;
  deps: ScanDeps;
  onProgress?: (p: ScanProgress) => void;
  onMatch?: (m: MatchedAnnouncement) => void;
  signal?: AbortSignal;
}

export interface ScanResult {
  matches: MatchedAnnouncement[];
  progress: ScanProgress;
  /** Highest block fully scanned. Persist this as the cursor. */
  lastScannedBlock: bigint;
  aborted: boolean;
}

export function evaluateAnnouncement(
  a: RawAnnouncement,
  chainId: number,
  keys: { viewingPrivateKey: Uint8Array; spendingPublicKey: Uint8Array },
): "wrong-scheme" | "malformed" | "no-view-tag" | "no-match" | MatchedAnnouncement {
  if (a.schemeId !== 1n) return "wrong-scheme";
  let eph: Uint8Array;
  let viewTag: number;
  try {
    eph = fromHex(a.ephemeralPubKey);
    viewTag = parseMetadata(a.metadata).viewTag;
  } catch {
    return "malformed";
  }
  if (eph.length !== 33) return "malformed";
  if (!viewTagMatches(keys.viewingPrivateKey, eph, viewTag)) return "no-view-tag";
  const ok = checkStealthAddress({
    viewingPrivateKey: keys.viewingPrivateKey,
    spendingPublicKey: keys.spendingPublicKey,
    ephemeralPublicKey: eph,
    stealthAddress: a.stealthAddress,
    viewTag,
  });
  if (!ok) return "no-match"; // view tag collided but the address is not ours
  return {
    id: announcementId(chainId, a),
    chainId,
    stealthAddress: a.stealthAddress,
    caller: a.caller,
    ephemeralPubKey: a.ephemeralPubKey,
    metadata: a.metadata,
    viewTag,
    txHash: a.txHash,
    logIndex: a.logIndex,
    blockNumber: a.blockNumber.toString(),
    blockHash: a.blockHash,
  };
}

export async function scan(opts: ScanOptions): Promise<ScanResult> {
  const { deps, chainId } = opts;
  const latest = opts.toBlock ?? (await deps.getBlockNumber());
  const seen = opts.seenIds ?? new Set<string>();
  let chunk = opts.chunkSize ?? DEFAULT_CHUNK;

  const progress: ScanProgress = {
    fromBlock: opts.fromBlock,
    toBlock: latest,
    currentBlock: opts.fromBlock,
    announcementsScanned: 0,
    wrongScheme: 0,
    malformed: 0,
    viewTagMatches: 0,
    fullMatches: 0,
    duplicates: 0,
    chunkRetries: 0,
  };
  const matches: MatchedAnnouncement[] = [];
  let cursor = opts.fromBlock;
  let lastScanned = opts.fromBlock - 1n;
  let aborted = false;

  while (cursor <= latest) {
    if (opts.signal?.aborted) {
      aborted = true;
      break;
    }
    let end = cursor + chunk - 1n;
    if (end > latest) end = latest;

    let logs: RawAnnouncement[] | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_CHUNK; attempt++) {
      try {
        logs = await deps.getLogs(cursor, end);
        break;
      } catch (e) {
        if (opts.signal?.aborted) throw e;
        if (attempt === MAX_RETRIES_PER_CHUNK) throw e;
        progress.chunkRetries++;
        // Typical cause: provider block-range / result-size limit -> halve the window and retry.
        if (end > cursor) {
          chunk = chunk > 1n ? chunk / 2n : 1n;
          end = cursor + chunk - 1n;
        }
      }
    }

    for (const a of logs ?? []) {
      progress.announcementsScanned++;
      const id = announcementId(chainId, a);
      const r = evaluateAnnouncement(a, chainId, opts);
      if (r === "wrong-scheme") progress.wrongScheme++;
      else if (r === "malformed") progress.malformed++;
      else if (r === "no-view-tag") continue;
      else if (r === "no-match") progress.viewTagMatches++;
      else {
        progress.viewTagMatches++;
        if (seen.has(id)) {
          progress.duplicates++;
          continue;
        }
        seen.add(id);
        progress.fullMatches++;
        matches.push(r);
        opts.onMatch?.(r);
      }
    }

    lastScanned = end;
    progress.currentBlock = end;
    opts.onProgress?.({ ...progress });
    cursor = end + 1n;
  }

  return { matches, progress, lastScannedBlock: lastScanned, aborted };
}
