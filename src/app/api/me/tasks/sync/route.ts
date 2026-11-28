import { getSession } from "@/lib/auth";
import { applyOps, type Op } from "@/lib/offline-tasks";

// Check-offs made offline, sent when the connection is back. Same-origin only.
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host) return Response.json({ error: "forbidden" }, { status: 403 });
  const session = await getSession();
  if (!session) return Response.json({ error: "signed out" }, { status: 401 });
  const body = await req.json().catch(() => null) as { ops?: Op[] } | null;
  const ops = Array.isArray(body?.ops) ? body!.ops.filter((o) => (o?.type === "task" || o?.type === "part") && typeof o.id === "string" && typeof o.at === "string") : [];
  return Response.json(await applyOps(session.user, ops), { headers: { "cache-control": "no-store" } });
}
