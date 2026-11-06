import { authenticate, isResponse } from "@/lib/routiq/http";
import { rangeSummary, summarize, usageFor } from "@/lib/routiq/usage";


export async function GET(req: Request) {
  const key = authenticate(req);
  if (isResponse(key)) return key;
  const days = Number(new URL(req.url).searchParams.get("days") ?? 30);
  return Response.json({ summary: summarize(key.id), recent: usageFor(key.id, 50), range: rangeSummary(key.id, Number.isFinite(days) ? days : 30) });
}
