import { apiError } from "@/lib/routiq/http";
import { createKey, listKeys, revokeKey } from "@/lib/routiq/keys";


// Local-first MVP: key management is open on localhost. If ROUTIQ_ADMIN_TOKEN is set it is required
// (send `x-admin-token`). Wallet-signature auth is the planned replacement for a public deployment.
function guard(req: Request): Response | null {
  const t = process.env.ROUTIQ_ADMIN_TOKEN;
  if (t && req.headers.get("x-admin-token") !== t) return apiError(401, "Admin token required.", "authentication_error", "admin_token_required");
  return null;
}

export async function GET(req: Request) {
  const g = guard(req);
  if (g) return g;
  return Response.json({ object: "list", data: listKeys() });
}

export async function POST(req: Request) {
  const g = guard(req);
  if (g) return g;
  let name = "unnamed";
  try {
    const b = (await req.json()) as { name?: string };
    if (typeof b.name === "string") name = b.name;
  } catch {
    /* empty body is fine */
  }
  const { record, key } = createKey(name);
  return Response.json({ ...record, key, warning: "Store this key now. It is shown once and only its hash is kept." }, { status: 201 });
}

export async function DELETE(req: Request) {
  const g = guard(req);
  if (g) return g;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  return revokeKey(id) ? Response.json({ revoked: true, id }) : apiError(404, "Key not found or already revoked.", "invalid_request_error", "key_not_found");
}
