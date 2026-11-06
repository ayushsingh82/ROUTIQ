// ERC-5564 metadata codec.
//   byte 0        view tag
//   bytes 1..4    function selector  (ETH: 0xeeeeeeee, ERC-20: 0xa9059cbb transfer)
//   bytes 5..24   token address       (ETH: 0xEeee…EEeE sentinel)
//   bytes 25..56  amount, uint256 big-endian
// Metadata is attacker-controlled: it is only a HINT. Payments must be verified on-chain.

import { ETH_SENTINEL } from "./constants.ts";
import { fromHex, toHex } from "../crypto/stealth.ts";

export interface ParsedMetadata {
  viewTag: number;
  selector?: `0x${string}`;
  token?: `0x${string}`;
  amount?: bigint;
  isEth: boolean;
}

export function encodeEthMetadata(viewTag: number, amountWei: bigint): `0x${string}` {
  if (!Number.isInteger(viewTag) || viewTag < 0 || viewTag > 255) throw new Error("viewTag out of range");
  if (amountWei < 0n || amountWei >= 1n << 256n) throw new Error("amount out of range");
  const out = new Uint8Array(57);
  out[0] = viewTag;
  out.set([0xee, 0xee, 0xee, 0xee], 1);
  out.set(fromHex(ETH_SENTINEL), 5);
  out.set(fromHex(amountWei.toString(16).padStart(64, "0")), 25);
  return toHex(out);
}

export function encodeErc20Metadata(viewTag: number, token: string, amount: bigint): `0x${string}` {
  if (!Number.isInteger(viewTag) || viewTag < 0 || viewTag > 255) throw new Error("viewTag out of range");
  const out = new Uint8Array(57);
  out[0] = viewTag;
  out.set(fromHex("0xa9059cbb"), 1); // transfer(address,uint256)
  out.set(fromHex(token), 5);
  out.set(fromHex(amount.toString(16).padStart(64, "0")), 25);
  return toHex(out);
}

export function parseMetadata(metadata: string): ParsedMetadata {
  const b = fromHex(metadata);
  if (b.length < 1) throw new Error("Empty metadata");
  const viewTag = b[0];
  if (b.length < 57) return { viewTag, isEth: false };
  const selector = toHex(b.slice(1, 5));
  const token = toHex(b.slice(5, 25));
  const amount = BigInt(toHex(b.slice(25, 57)));
  const isEth = selector === "0xeeeeeeee" && token.toLowerCase() === ETH_SENTINEL.toLowerCase();
  return { viewTag, selector, token, amount, isEth };
}
