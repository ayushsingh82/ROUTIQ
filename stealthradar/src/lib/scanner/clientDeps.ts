// Adapts ANY viem PublicClient to the scanner's deps. The app passes the Anon-RPC-backed client
// (see rpcDeps.ts); tests/e2e pass a client pointed at a local anvil fork.

import type { PublicClient } from "viem";
import { ANNOUNCEMENT_EVENT_ABI, ANNOUNCER_ADDRESS } from "../erc5564/constants.ts";
import type { RawAnnouncement, ScanDeps } from "./types.ts";
import type { VerifyDeps } from "./verify.ts";

export function depsFromClient(client: PublicClient): ScanDeps & VerifyDeps {
  return {
    // cacheTime: 0 — viem caches the head for ~4s, which would make a scan right after a payment miss it
    getBlockNumber: () => client.getBlockNumber({ cacheTime: 0 }),
    async getLogs(fromBlock, toBlock) {
      const logs = await client.getLogs({
        address: ANNOUNCER_ADDRESS,
        event: ANNOUNCEMENT_EVENT_ABI,
        fromBlock,
        toBlock,
      });
      const out: RawAnnouncement[] = [];
      for (const l of logs) {
        if (l.blockNumber === null || l.transactionHash === null || l.logIndex === null || l.blockHash === null) continue; // pending
        const a = l.args;
        if (a.schemeId === undefined || !a.stealthAddress || !a.caller || !a.ephemeralPubKey || !a.metadata) continue;
        out.push({
          schemeId: a.schemeId,
          stealthAddress: a.stealthAddress,
          caller: a.caller,
          ephemeralPubKey: a.ephemeralPubKey,
          metadata: a.metadata,
          txHash: l.transactionHash,
          logIndex: l.logIndex,
          blockNumber: l.blockNumber,
          blockHash: l.blockHash,
        });
      }
      return out;
    },
    getBalance: (address, blockNumber) => client.getBalance({ address, blockNumber }),
  };
}
