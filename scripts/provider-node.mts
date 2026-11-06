// ROUTIQ reference provider node: a small OpenAI-compatible server an operator runs on their own
// machine/port. It forwards to a local OpenAI-compatible upstream (default: Ollama), so every response is
// REAL inference. It is a *reference* implementation, not a different company: the UI labels it that way.
//
//   node scripts/provider-node.mts --name "Reference Alpha" --port 4101
import { createServer } from "node:http";
import { Readable } from "node:stream";

const arg = (k: string, d: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > -1 ? process.argv[i + 1] : d;
};
const NAME = arg("name", "Reference Provider");
const PORT = Number(arg("port", "4101"));
const UPSTREAM = arg("upstream", "http://127.0.0.1:11434/v1").replace(/\/+$/, "");
// Test fixture: fail chat requests with 503 while /models and /health still answer (a provider that looks healthy but errors).
const FAIL_CHAT = process.argv.includes("--fail-chat");

const json = (res: import("node:http").ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { ok: true, name: NAME });
    if (req.method === "GET" && url.pathname === "/v1/models") {
      const up = await fetch(`${UPSTREAM}/models`, { signal: AbortSignal.timeout(4000) });
      res.writeHead(up.status, { "content-type": "application/json", "x-provider-name": NAME });
      return res.end(await up.text());
    }
    if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
      if (FAIL_CHAT) return json(res, 503, { error: { message: `${NAME}: simulated failure (--fail-chat)` } });
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const c of req) {
        size += (c as Buffer).length;
        if (size > 2 * 1024 * 1024) return json(res, 413, { error: { message: "request too large" } });
        chunks.push(c as Buffer);
      }
      const up = await fetch(`${UPSTREAM}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: Buffer.concat(chunks),
        signal: AbortSignal.timeout(180_000),
      });
      res.writeHead(up.status, { "content-type": up.headers.get("content-type") ?? "application/json", "x-provider-name": NAME });
      if (!up.body) return res.end();
      Readable.fromWeb(up.body as never).pipe(res);
      return;
    }
    json(res, 404, { error: { message: "not found" } });
  } catch (e) {
    json(res, 502, { error: { message: e instanceof Error ? e.message : "upstream error" } });
  }
});

server.listen(PORT, "127.0.0.1", () => console.log(`[${NAME}] OpenAI-compatible node on http://127.0.0.1:${PORT}/v1 → ${UPSTREAM}`));
