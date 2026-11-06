import { readJson, writeJson } from "./store.ts";
import type { RouteMode } from "./types.ts";

export interface RoutingDecision {
  requestId: string;
  keyId: string;
  model: string;
  mode: RouteMode;
  allowFallback: boolean;
  pinned?: string;
  chain: string[];
  selected: string | null;
  reasons: Record<string, string>;
  excluded: Record<string, string>;
  createdAt: number;
}

const FILE = "routing.json";
const MAX = 2000;
let cache: RoutingDecision[] | null = null;
const all = () => (cache ??= readJson<RoutingDecision[]>(FILE, []));

export function recordRouting(d: RoutingDecision): void {
  const list = all();
  list.push(d);
  if (list.length > MAX) list.splice(0, list.length - MAX);
  writeJson(FILE, list);
}

export const routingHistory = (keyId: string, limit = 50) => all().filter((d) => d.keyId === keyId).slice(-limit).reverse();
