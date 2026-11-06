"use client";

import { useCallback, useEffect, useState } from "react";
import { getJson } from "../hooks";
import { Badge, Button, Card, CardHeader, Input, Stat, compact, usd } from "../ui";
import { useConsoleKey } from "./ConsoleShell";
import type { UsageResponse } from "./types";

interface KeyRow {
  id: string;
  name: string;
  prefix: string;
  rpm: number;
  createdAt: number;
  revokedAt?: number;
}

export function Keys() {
  const { key: sessionKey, setKey, create } = useConsoleKey();
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("https://your-host");

  const load = useCallback(async () => {
    try {
      const list = (await getJson<{ data: KeyRow[] }>("/api/v1/developer/keys")).data;
      setOrigin(window.location.origin);
      setKeys(list);
      if (sessionKey) setUsage(await getJson<UsageResponse>("/api/v1/usage", sessionKey));
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [sessionKey]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function createKey() {
    try {
      const r = await getJson<{ key: string }>("/api/v1/developer/keys", undefined, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: name || "API key" }) });
      setCreated(r.key);
      setName("");
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }
  async function revoke(id: string) {
    await getJson(`/api/v1/developer/keys?id=${encodeURIComponent(id)}`, undefined, { method: "DELETE" });
    if (sessionKey && keys.find((k) => k.id === id)?.prefix === sessionKey.slice(0, 12)) {
      setKey(null);
      await create();
    }
    load();
  }

  const shown = created ?? sessionKey ?? "YOUR_API_KEY";
  const curl = `curl ${origin}/v1/chat/completions \\\n  -H "Authorization: Bearer ${shown}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model":"<model id>","messages":[{"role":"user","content":"Hello"}],"routiq":{"mode":"cheapest"}}'`;
  const sdk = `import OpenAI from "openai";\n\nconst client = new OpenAI({\n  apiKey: process.env.ROUTIQ_API_KEY,\n  baseURL: "${origin}/v1",\n});\n\nconst r = await client.chat.completions.create({\n  model: "<model id>",\n  messages: [{ role: "user", content: "Hello" }],\n});`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Requests (this key)" value={usage?.summary.requests ?? "—"} />
        <Stat label="Tokens" value={usage ? compact(usage.summary.inputTokens + usage.summary.outputTokens) : "—"} />
        <Stat label="Metered cost" value={usage ? usd(usage.summary.costUsd, 6) : "—"} tone="accent" />
        <Stat label="Active keys" value={keys.filter((k) => !k.revokedAt).length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Create an API key" sub="Shown once. Only a SHA-256 hash is stored server-side." />
          <div className="space-y-4 p-5">
            <div className="flex gap-3">
              <Input placeholder="Key name (e.g. my agent)" value={name} onChange={(e) => setName(e.target.value)} />
              <Button onClick={createKey}>Create</Button>
            </div>
            {created && (
              <div className="border border-accent/60 p-4">
                <div className="mb-2 text-[10px] uppercase tracking-wider text-accent">Copy it now — it won&apos;t be shown again</div>
                <code className="block break-all text-xs text-foreground">{created}</code>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    navigator.clipboard.writeText(created);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            )}
            {err && <p className="text-xs text-bad">{err}</p>}
          </div>
        </Card>
        <Card className="overflow-x-auto">
          <CardHeader title="Your keys" />
          <table className="w-full min-w-[420px] text-left text-xs">
            <tbody className="divide-y divide-border">
              {keys.map((k) => {
                const mine = sessionKey?.startsWith(k.prefix);
                return (
                  <tr key={k.id}>
                    <td className="px-5 py-3">
                      <div className="text-foreground">{k.name} {mine && <Badge tone="accent">this browser</Badge>}</div>
                      <div className="mt-0.5 text-muted-foreground">{k.prefix}… · {k.rpm}/min · {new Date(k.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {k.revokedAt ? <Badge tone="bad">revoked</Badge> : <Button variant="danger" size="sm" onClick={() => revoke(k.id)}>Revoke</Button>}
                    </td>
                  </tr>
                );
              })}
              {keys.length === 0 && <tr><td className="px-5 py-6 text-muted-foreground">No keys yet.</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="cURL" />
          <pre className="overflow-x-auto p-5 text-[12px] leading-relaxed text-muted-foreground">{curl}</pre>
        </Card>
        <Card>
          <CardHeader title="OpenAI SDK" sub="Change the base URL. Everything else is unchanged." />
          <pre className="overflow-x-auto p-5 text-[12px] leading-relaxed text-muted-foreground">{sdk}</pre>
        </Card>
      </div>
      <p className="text-[11px] text-muted-foreground">Routing hints go in an optional <code className="text-foreground">routiq</code> field: <code className="text-foreground">{`{ mode: "cheapest"|"fastest"|"balanced", provider?: "<id>", fallback?: boolean }`}</code>. Responses carry <code className="text-foreground">x-routiq-*</code> headers (provider, cost, latency, request id).</p>
    </div>
  );
}
