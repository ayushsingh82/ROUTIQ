"use client";

import { WalletButton } from "../WalletButton";
import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { getJson, useCatalog } from "../hooks";
import { manifestMessageClient } from "@/lib/routiq/manifestClient";
import { Badge, Button, Card, CardHeader, Input, Textarea, ms } from "../ui";

export function Nodes() {
  const { data, reload } = useCatalog(15_000);
  const { address: account } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [form, setForm] = useState({ providerId: "", name: "", endpoint: "https://", models: "model-id, 0.10, 0.20", chat: true, streaming: true });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function register() {
    if (!account) return;
    setBusy(true);
    setResult(null);
    try {
      const models = form.models.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
        const [id, i, o, ctx] = l.split(",").map((x) => x.trim());
        return { id, inputPrice: Number(i), outputPrice: Number(o), ...(ctx ? { contextWindow: Number(ctx) } : {}) };
      });
      const manifest = { providerId: form.providerId.trim(), name: form.name.trim(), walletAddress: account, endpoint: form.endpoint.trim(), models, capabilities: [form.chat && "chat", form.streaming && "streaming"].filter(Boolean) as string[], updatedAt: Date.now() };
      const message = await manifestMessageClient(manifest);
      const signature = await signMessageAsync({ message });
      const r = await getJson<{ providerId: string; manifestHash: string }>("/api/v1/providers/register", undefined, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ manifest, signature }) });
      setResult({ ok: true, text: `Registered ${r.providerId}. Manifest sha256 ${r.manifestHash.slice(0, 16)}…` });
      reload();
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  const providers = data?.providers ?? [];
  return (
    <div className="space-y-6">
      <Card className="overflow-x-auto">
        <CardHeader title="Provider nodes" sub="Live probes, refreshed every 15 seconds." />
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Provider</th>
              <th className="px-3 py-3 font-medium">Type</th>
              <th className="px-3 py-3 font-medium">Models</th>
              <th className="px-3 py-3 font-medium">Probe latency</th>
              <th className="px-3 py-3 font-medium">Success</th>
              <th className="px-3 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {providers.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-3">
                  <div className="text-foreground">{p.name}</div>
                  <div className="mt-0.5 text-muted-foreground">{p.id}{p.operator ? ` · ${p.operator.slice(0, 8)}…` : ""}</div>
                </td>
                <td className="px-3 py-3 text-muted-foreground">{p.label}</td>
                <td className="px-3 py-3">{p.modelCount}</td>
                <td className="px-3 py-3 text-muted-foreground">{ms(p.avgLatencyMs)}</td>
                <td className="px-3 py-3 text-muted-foreground">{p.successRate === null ? "—" : `${Math.round(p.successRate * 100)}%`}</td>
                <td className="px-3 py-3">
                  <Badge tone={p.status === "up" ? "ok" : p.status === "not_configured" ? "warn" : p.status === "down" ? "bad" : "neutral"}>{p.status.replace("_", " ")}</Badge>
                  {p.lastError && p.status !== "up" && <div className="mt-1 max-w-[220px] truncate text-[11px] text-muted-foreground">{p.lastError}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <CardHeader title="Register a provider" sub="Sign a manifest with your wallet. We verify the signature, the endpoint's safety, and that it really serves the models." right={<WalletButton />} />
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <label className="block text-xs">
            <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground">Provider ID</span>
            <Input value={form.providerId} onChange={(e) => setForm({ ...form, providerId: e.target.value.toLowerCase() })} placeholder="my-gpu-node" />
          </label>
          <label className="block text-xs">
            <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground">Display name</span>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My GPU Node" />
          </label>
          <label className="block text-xs md:col-span-2">
            <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground">Endpoint (public HTTPS, OpenAI-compatible base URL)</span>
            <Input value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} />
          </label>
          <label className="block text-xs md:col-span-2">
            <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground">Models — one per line: id, input $/1M, output $/1M[, context]</span>
            <Textarea rows={3} value={form.models} onChange={(e) => setForm({ ...form, models: e.target.value })} />
          </label>
          <div className="flex items-center gap-6 text-xs">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.chat} onChange={(e) => setForm({ ...form, chat: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" /> chat</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.streaming} onChange={(e) => setForm({ ...form, streaming: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" /> streaming</label>
          </div>
          <div className="flex items-center justify-end">
            <Button onClick={register} disabled={!account || busy || !form.providerId || !form.name}>{busy ? "Waiting for wallet…" : "Sign & register"}</Button>
          </div>
        </div>
        {!account && <p className="border-t border-border px-5 py-3 text-[11px] text-muted-foreground">Connect a wallet to enable registration. The wallet signs a message — no transaction, no gas.</p>}
        {result && <p className={`border-t border-border px-5 py-3 text-xs ${result.ok ? "text-ok" : "text-bad"}`}>{result.text}</p>}
      </Card>
      <p className="text-[11px] leading-relaxed text-muted-foreground">Localhost, private-network and cloud-metadata endpoints are rejected by design. To run a local node for development, use <code className="text-foreground">scripts/provider-node.mts</code> and list it in <code className="text-foreground">routiq.providers.json</code>.</p>
    </div>
  );
}
