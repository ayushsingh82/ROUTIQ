import { healthSnapshot } from "@/lib/routiq/health";
import { getProviders, listMarket } from "@/lib/routiq/providers";

export async function GET() {
  await listMarket();
  return Response.json({ providers: getProviders().map((p) => healthSnapshot(p.id)) });
}
