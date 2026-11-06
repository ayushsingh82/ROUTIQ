import { isAddress } from "viem";

// Proxies the Alt-Mempool devnet faucet (1 ETH per address per hour, enforced upstream). Devnet only.
const GATEWAY = process.env.ROUTIQ_FAUCET_RPC_URL ?? "https://altmempoolgateway.forshtat.com/rpc";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { address?: string } | null;
  const address = body?.address;
  if (!address || !isAddress(address)) return Response.json({ error: "A valid address is required." }, { status: 400 });
  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "skandha_explorer_faucet", params: [address] }),
      signal: AbortSignal.timeout(25_000),
    });
    const j = (await res.json()) as { result?: { txHash: string; amount: string }; error?: { message: string } };
    if (j.error || !j.result) return Response.json({ error: j.error?.message ?? "Faucet returned no result." }, { status: 429 });
    return Response.json({ txHash: j.result.txHash, amountEth: Number(BigInt(j.result.amount)) / 1e18 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Faucet unreachable." }, { status: 502 });
  }
}
