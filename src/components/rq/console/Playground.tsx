"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getJson, useCatalog } from "../hooks";
import { Badge, Button, Card, CardHeader, Input, Select, Textarea, Spinner, ms, usd } from "../ui";
import { useConsoleKey } from "./ConsoleShell";

interface Msg {
  role: "user" | "assistant";
  content: string;
  meta?: { provider: string; providerName: string; mode: string; inputTokens: number; outputTokens: number; estimated: boolean; costUsd: number; latencyMs: number; fallbackFrom: string[] };
  error?: string;
}
interface Preview {
  selectedProvider: string | null;
  chain: string[];
  error: string | null;
  candidates: { provider: string; name: string; eligible: boolean; excluded_reason: string | null; est_cost_usd: number; total: number; explanation: string }[];
}

export function Playground() {
  const { key } = useConsoleKey();
  const { data: catalog } = useCatalog(30_000);
  const params = useSearchParams();
  const [model, setModel] = useState(params.get("model") ?? "");
  const [mode, setMode] = useState("balanced");
  const [provider, setProvider] = useState("auto");
  const [fallback, setFallback] = useState(true);
  const [maxTokens, setMaxTokens] = useState(256);
  const [system, setSystem] = useState("");
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const abort = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const models = useMemo(() => {
    const m = catalog?.models ?? [];
    const usable = (x: (typeof m)[number]) => x.offers.some((o) => o.status === "up" || o.status === "unknown");
    return [...m].sort((a, b) => Number(usable(b)) - Number(usable(a)) || a.id.localeCompare(b.id));
  }, [catalog]);
  const current = models.find((m) => m.id === model);

  useEffect(() => {
    if (!model && models.length) {
      const first = models.find((m) => m.offers.some((o) => o.status === "up")) ?? models[0];
      setModel(first.id);
    }
  }, [models, model]);
  useEffect(() => {
    setProvider("auto");
  }, [model]);

  // Routing preview: which provider WOULD be chosen, and why (no inference is sent).
  useEffect(() => {
    if (!key || !model) return;
    const t = setTimeout(async () => {
      try {
        setPreview(await getJson<Preview>("/api/v1/routing/preview", key, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model, mode, fallback, provider: provider === "auto" ? undefined : provider, messages: input || "hello" }) }));
      } catch (e) {
        setPreview({ selectedProvider: null, chain: [], error: e instanceof Error ? e.message : String(e), candidates: [] });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [key, model, mode, provider, fallback, input]);

  useEffect(() => {
    // no return value: newer Chrome versions return a Promise from scrollIntoView, which React would treat as a cleanup function
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  async function send() {
    if (!key || !model || !input.trim() || busy) return;
    const history = [...msgs.filter((m) => !m.error), { role: "user" as const, content: input.trim() }];
    setMsgs([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const ac = new AbortController();
    abort.current = ac;
    const t0 = performance.now();
    try {
      const res = await fetch("/api/v1/chat/completions", {
        method: "POST",
        signal: ac.signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          stream: true,
          max_tokens: maxTokens,
          messages: [...(system.trim() ? [{ role: "system", content: system.trim() }] : []), ...history.map((m) => ({ role: m.role, content: m.content }))],
          routiq: { mode, fallback, provider: provider === "auto" ? undefined : provider },
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? `HTTP ${res.status}`);
      }
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let text = "";
      let meta: Msg["meta"];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (line.startsWith(": routiq ")) {
            const m = JSON.parse(line.slice(9));
            meta = { provider: m.provider, providerName: m.provider_name, mode: m.mode, inputTokens: m.input_tokens, outputTokens: m.output_tokens, estimated: m.tokens_estimated, costUsd: m.cost_usd, latencyMs: m.latency_ms, fallbackFrom: m.fallback_from ?? [] };
          } else if (line.startsWith("data:")) {
            const d = line.slice(5).trim();
            if (!d || d === "[DONE]") continue;
            try {
              const delta = JSON.parse(d).choices?.[0]?.delta?.content;
              if (typeof delta === "string") text += delta;
            } catch {
              /* partial line */
            }
          }
        }
        setMsgs((cur) => [...cur.slice(0, -1), { role: "assistant", content: text, meta }]);
      }
      setMsgs((cur) => [...cur.slice(0, -1), { role: "assistant", content: text || "(empty response)", meta: meta ?? { provider: res.headers.get("x-routiq-provider") ?? "?", providerName: res.headers.get("x-routiq-provider-name") ?? "?", mode, inputTokens: 0, outputTokens: 0, estimated: true, costUsd: 0, latencyMs: Math.round(performance.now() - t0), fallbackFrom: [] } }]);
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === "AbortError";
      setMsgs((cur) => [...cur.slice(0, -1), { role: "assistant", content: cur[cur.length - 1]?.content ?? "", error: aborted ? "stopped" : e instanceof Error ? e.message : String(e) }]);
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader title="Request" />
          <div className="space-y-4 p-5 text-xs">
            <label className="block">
              <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground">Model</span>
              <Select value={model} onChange={(e) => setModel(e.target.value)}>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground">Routing mode</span>
              <Select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="balanced">balanced — cost + latency + availability</option>
                <option value="cheapest">cheapest</option>
                <option value="fastest">fastest (measured)</option>
              </Select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground">Provider</span>
              <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
                <option value="auto">auto-route</option>
                {(current?.offers ?? []).map((o) => (
                  <option key={o.providerId} value={o.providerId}>
                    {o.providerName}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={fallback} onChange={(e) => setFallback(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
              <span>Allow fallback to another provider of the same model</span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground">Max output tokens</span>
              <Input type="number" min={1} max={8192} value={maxTokens} onChange={(e) => setMaxTokens(Math.max(1, Number(e.target.value) || 1))} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground">System prompt (optional)</span>
              <Textarea rows={3} value={system} onChange={(e) => setSystem(e.target.value)} />
            </label>
          </div>
        </Card>

        <Card>
          <CardHeader title="Routing preview" sub="Computed before sending; nothing is billed." />
          <div className="space-y-3 p-5 text-xs">
            {!preview ? (
              <Spinner />
            ) : preview.error ? (
              <p className="text-bad">{preview.error}</p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Badge tone="accent">selected</Badge>
                  <span className="text-foreground">{preview.selectedProvider}</span>
                </div>
                {preview.candidates.map((c) => (
                  <div key={c.provider} className={`border p-3 ${c.provider === preview.selectedProvider ? "border-accent/60" : "border-border"} ${c.eligible ? "" : "opacity-60"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-foreground">{c.name}</span>
                      <span className="text-muted-foreground">{usd(c.est_cost_usd, 6)}</span>
                    </div>
                    <p className="mt-1.5 leading-relaxed text-muted-foreground">{c.eligible ? c.explanation : `excluded: ${c.excluded_reason}`}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </Card>
      </div>

      <Card className="flex min-h-[640px] flex-col">
        <CardHeader title="Conversation" right={<Button variant="ghost" size="sm" onClick={() => setMsgs([])} disabled={busy || msgs.length === 0}>Clear</Button>} />
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {msgs.length === 0 && <p className="py-16 text-center text-xs text-muted-foreground">Ask something. The response comes back with the provider that served it, tokens, cost and latency.</p>}
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "ml-auto max-w-[85%]" : "max-w-[92%]"}>
              <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{m.role}</div>
              <div className={`whitespace-pre-wrap border p-3.5 text-sm leading-relaxed ${m.role === "user" ? "border-border bg-muted" : "border-border bg-background"}`}>
                {m.content || (busy && i === msgs.length - 1 && !m.error ? <Spinner /> : "")}
                {m.error && <div className="mt-2 text-xs text-bad">⚠ {m.error}</div>}
              </div>
              {m.meta && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span>via <span className="text-foreground">{m.meta.providerName}</span></span>
                  <span>{m.meta.inputTokens} in / {m.meta.outputTokens} out{m.meta.estimated ? " (est)" : ""}</span>
                  <span>{usd(m.meta.costUsd, 6)}</span>
                  <span>{ms(m.meta.latencyMs)}</span>
                  {m.meta.fallbackFrom.length > 0 && <span className="text-warn">↩ fell back from {m.meta.fallbackFrom.join(", ")}</span>}
                </div>
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="border-t border-border p-4">
          <div className="flex gap-3">
            <Textarea rows={2} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message…" onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())} className="flex-1" />
            {busy ? <Button variant="outline" onClick={() => abort.current?.abort()}>Stop</Button> : <Button onClick={send} disabled={!key || !model || !input.trim()}>Send</Button>}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Enter to send · Shift+Enter for a new line · prompts are visible to the provider that serves them.</p>
        </div>
      </Card>
    </div>
  );
}
