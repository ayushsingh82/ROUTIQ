"use client";

import { useCallback, useEffect, useState } from "react";

export async function getJson<T>(url: string, key?: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...(key ? { authorization: `Bearer ${key}` } : {}), ...(init?.headers ?? {}) } });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON */
  }
  if (!res.ok) throw new Error((body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`);
  return body as T;
}

export interface CatalogOffer {
  providerId: string;
  providerName: string;
  label: "local" | "reference" | "hosted";
  inputPerM: number;
  outputPerM: number;
  status: string;
  unavailableReason: string | null;
  avgLatencyMs: number | null;
}
export interface CatalogModel {
  id: string;
  name: string;
  vendor: string | null;
  contextWindow: number | null;
  features: string[];
  inputModalities: string[];
  offers: CatalogOffer[];
}
export interface CatalogProvider {
  id: string;
  name: string;
  label: "local" | "reference" | "hosted";
  configured: boolean;
  status: string;
  avgLatencyMs: number | null;
  successRate: number | null;
  lastError: string | null;
  operator: string | null;
  note: string | null;
  modelCount: number;
}
export interface Catalog {
  generatedAt: number;
  totals: { providers: number; configuredProviders: number; models: number; vendors: number };
  providers: CatalogProvider[];
  models: CatalogModel[];
}

/** Loads (and refreshes every 30 s) the public marketplace snapshot. */
export function useCatalog(refreshMs = 30_000) {
  const [data, setData] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setData(await getJson<Catalog>("/api/v1/public/catalog"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const t = setInterval(load, refreshMs);
    return () => clearInterval(t);
  }, [load, refreshMs]);
  return { data, error, reload: load };
}

/** A per-browser API key, created on first use and kept in localStorage. Revocable from the Keys page. */
export function useSessionKey() {
  const [key, setKeyState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setKey = useCallback((k: string | null) => {
    setKeyState(k);
    try {
      if (k) localStorage.setItem("routiq.key", k);
      else localStorage.removeItem("routiq.key");
    } catch {
      /* private mode */
    }
  }, []);

  const create = useCallback(async () => {
    try {
      const r = await getJson<{ key: string }>("/api/v1/developer/keys", undefined, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "browser session" }) });
      setKey(r.key);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [setKey]);

  useEffect(() => {
    let existing: string | null = null;
    try {
      existing = localStorage.getItem("routiq.key");
    } catch {
      /* ignore */
    }
    (async () => {
      if (existing) {
        try {
          await getJson("/api/v1/usage", existing); // still valid?
          setKeyState(existing);
          setReady(true);
          return;
        } catch {
          /* revoked or unknown: make a new one */
        }
      }
      await create();
      setReady(true);
    })();
  }, [create]);

  return { key, ready, error, setKey, create };
}
