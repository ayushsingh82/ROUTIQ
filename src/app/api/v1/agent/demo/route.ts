import { demoAvailable, runDemo, type DemoKind } from "@/lib/routiq/agentDemo";

export const maxDuration = 60;

export async function GET() {
  return Response.json({ available: demoAvailable() });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { kind?: string };
  const kind = body.kind as DemoKind;
  if (!["pay", "over-cap", "unregistered"].includes(kind)) return Response.json({ error: { code: "bad_request", message: "kind must be pay, over-cap or unregistered" } }, { status: 400 });
  try {
    return Response.json(await runDemo(kind));
  } catch (e) {
    return Response.json({ error: { code: "demo_unavailable", message: e instanceof Error ? e.message : String(e) } }, { status: 503 });
  }
}
