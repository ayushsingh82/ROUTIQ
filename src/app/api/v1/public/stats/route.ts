import { globalSummary } from "@/lib/routiq/usage";

/** Public, aggregate-only usage statistics (no prompts, keys or per-user data). */
export async function GET() {
  return Response.json({ generatedAt: Date.now(), ...globalSummary() });
}
