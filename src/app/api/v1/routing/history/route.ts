import { authenticate, isResponse } from "@/lib/routiq/http";
import { routingHistory } from "@/lib/routiq/routingLog";

export async function GET(req: Request) {
  const key = authenticate(req);
  if (isResponse(key)) return key;
  return Response.json({ object: "list", data: routingHistory(key.id, 100) });
}
