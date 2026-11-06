// Demo sender: pay ETH to a stealth meta-address, then publish the ERC-5564 announcement.
// These are TWO separate transactions (transfer, then announce). Writes go through the sender's own wallet
// provider, NOT Anon-RPC (documented exclusion: the wallet broadcasts them). Recipient-side reads are anonymized.

import { createPublicClient, createWalletClient, custom, parseEther, type EIP1193Provider } from "viem";
import { sepolia } from "viem/chains";
import { toHex, type GeneratedStealth } from "../crypto/stealth.ts";
import { encodeEthMetadata } from "../erc5564/metadata.ts";
import { ANNOUNCER_ABI, ANNOUNCER_ADDRESS } from "../erc5564/constants.ts";

export interface SendResult {
  stealthAddress: `0x${string}`;
  ephemeralPublicKey: `0x${string}`;
  viewTag: number;
  transferTx: `0x${string}`;
  announceTx: `0x${string}`;
}

export async function sendStealthEth(
  provider: EIP1193Provider,
  g: GeneratedStealth, // from generateStealthAddress(meta); the UI previews exactly this address before paying
  amountEth: string,
  onStep?: (s: string) => void,
): Promise<SendResult> {
  const value = parseEther(amountEth);
  if (value <= 0n) throw new Error("Amount must be positive");

  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as `0x${string}`[];
  const account = accounts[0];
  if (!account) throw new Error("No wallet account");
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xaa36a7" }] });
  } catch {
    throw new Error("Please switch your wallet to Sepolia");
  }

  const wallet = createWalletClient({ account, chain: sepolia, transport: custom(provider) });
  const reader = createPublicClient({ chain: sepolia, transport: custom(provider) });

  onStep?.(`Sending ${amountEth} ETH to stealth address ${g.stealthAddress} …`);
  const transferTx = await wallet.sendTransaction({ to: g.stealthAddress, value });
  const r1 = await reader.waitForTransactionReceipt({ hash: transferTx });
  if (r1.status !== "success") throw new Error("Transfer reverted");

  onStep?.("Publishing ERC-5564 announcement …");
  const announceTx = await wallet.writeContract({
    address: ANNOUNCER_ADDRESS,
    abi: ANNOUNCER_ABI,
    functionName: "announce",
    args: [1n, g.stealthAddress, toHex(g.ephemeralPublicKey), encodeEthMetadata(g.viewTag, value)],
  });
  const r2 = await reader.waitForTransactionReceipt({ hash: announceTx });
  if (r2.status !== "success") throw new Error("Announcement reverted (funds were already sent!)");

  return {
    stealthAddress: g.stealthAddress,
    ephemeralPublicKey: toHex(g.ephemeralPublicKey),
    viewTag: g.viewTag,
    transferTx,
    announceTx,
  };
}
