export interface RawAnnouncement {
  schemeId: bigint;
  stealthAddress: `0x${string}`;
  caller: `0x${string}`;
  ephemeralPubKey: `0x${string}`;
  metadata: `0x${string}`;
  txHash: `0x${string}`;
  logIndex: number;
  blockNumber: bigint;
  blockHash: `0x${string}`;
}

/** Stored locally. Contains NO private keys. */
export interface MatchedAnnouncement {
  id: string; // `${chainId}:${txHash}:${logIndex}`
  chainId: number;
  stealthAddress: `0x${string}`;
  caller: `0x${string}`; // public tx field, NOT a verified sender identity
  ephemeralPubKey: `0x${string}`;
  metadata: `0x${string}`;
  viewTag: number;
  txHash: `0x${string}`;
  logIndex: number;
  blockNumber: string; // bigint as decimal string (IndexedDB-safe)
  blockHash: `0x${string}`;
}

export type VerificationStatus = "verified" | "unverified";

/** "unverified" == announcement matched us, but no on-chain funds could be confirmed. Never guess. */
export interface DetectedPayment {
  id: string; // same as announcement id
  chainId: number;
  stealthAddress: `0x${string}`;
  asset: "ETH" | "ERC20-UNSUPPORTED" | "UNKNOWN";
  amountWei?: string; // verified amount (decimal string)
  hintedAmountWei?: string; // from metadata — attacker-controlled hint only
  txHash: `0x${string}`; // announcement tx (transfer may be a different tx)
  blockNumber: string;
  status: VerificationStatus;
  note: string;
  verifiedAt?: number;
}

export interface ScanProgress {
  fromBlock: bigint;
  toBlock: bigint;
  currentBlock: bigint;
  announcementsScanned: number;
  wrongScheme: number;
  malformed: number;
  viewTagMatches: number;
  fullMatches: number;
  duplicates: number;
  chunkRetries: number;
}

export interface ScanDeps {
  getBlockNumber(): Promise<bigint>;
  getLogs(fromBlock: bigint, toBlock: bigint): Promise<RawAnnouncement[]>;
}
