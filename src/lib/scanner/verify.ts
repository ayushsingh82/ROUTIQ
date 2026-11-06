// Payment verification. An announcement proves nothing about funds: the transfer is a separate tx and
// the metadata amount is attacker-controlled. We only mark "verified" when on-chain balance supports it.
// Limit (documented in README): without trace APIs we cannot attribute a balance to a specific tx, and a
// withdrawn address shows zero balance -> those stay "unverified" rather than being guessed.

import { fromHex } from "../crypto/stealth.ts";
import { parseMetadata } from "../erc5564/metadata.ts";
import type { DetectedPayment, MatchedAnnouncement } from "./types.ts";

export interface VerifyDeps {
  getBalance(address: `0x${string}`, blockNumber?: bigint): Promise<bigint>;
}

export async function verifyPayment(deps: VerifyDeps, m: MatchedAnnouncement): Promise<DetectedPayment> {
  const meta = parseMetadata(m.metadata);
  const base = {
    id: m.id,
    chainId: m.chainId,
    stealthAddress: m.stealthAddress,
    txHash: m.txHash,
    blockNumber: m.blockNumber,
  };

  if (!meta.isEth) {
    const isToken = meta.selector !== undefined && meta.selector !== "0xeeeeeeee";
    return {
      ...base,
      asset: isToken ? "ERC20-UNSUPPORTED" : "UNKNOWN",
      status: "unverified",
      note: isToken
        ? "Token announcement matched you; ERC-20 verification is not implemented yet."
        : "Announcement matched you but carries no recognizable asset metadata.",
    };
  }

  const hint = meta.amount ?? 0n;
  let atBlock = 0n;
  try {
    atBlock = await deps.getBalance(m.stealthAddress, BigInt(m.blockNumber));
  } catch {
    /* non-archive RPCs reject old blocks; fall through to latest */
  }
  const latest = await deps.getBalance(m.stealthAddress);
  const observed = atBlock > latest ? atBlock : latest;

  const supported = hint > 0n ? observed >= hint : observed > 0n;
  if (supported) {
    return {
      ...base,
      asset: "ETH",
      status: "verified",
      amountWei: (hint > 0n ? hint : observed).toString(),
      hintedAmountWei: hint.toString(),
      verifiedAt: Date.now(),
      note: "Stealth address holds at least the announced amount.",
    };
  }
  return {
    ...base,
    asset: "ETH",
    status: "unverified",
    hintedAmountWei: hint.toString(),
    note:
      observed === 0n
        ? "Matched, payment unverified: address holds no ETH (not funded yet, or already withdrawn)."
        : "Matched, payment unverified: balance is below the announced amount.",
  };
}

export function isValidAddress(a: string): a is `0x${string}` {
  try {
    return fromHex(a).length === 20;
  } catch {
    return false;
  }
}
