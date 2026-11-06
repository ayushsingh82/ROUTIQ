// Binds the scanner to the central Anon-RPC client. All app reads go through lib/rpc/client.

import { getPublicClient } from "../rpc/client.ts";
import { depsFromClient } from "./clientDeps.ts";
import type { ScanDeps } from "./types.ts";
import type { VerifyDeps } from "./verify.ts";

export function makeScanDeps(isolationKey?: string): ScanDeps & VerifyDeps {
  return depsFromClient(getPublicClient(isolationKey));
}
