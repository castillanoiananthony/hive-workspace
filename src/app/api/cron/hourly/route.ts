import { timingSafeEqual } from "node:crypto";
import { runHourly } from "@/lib/buzz";

// Called every hour by the GitHub Actions workflow (.github/workflows/hourly.yml) with the shared secret.
export const maxDuration = 300;

function authorized(req: Request) {
  const want = Buffer.from(`Bearer ${process.env.CRON_SECRET ?? ""}`);
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  return Boolean(process.env.CRON_SECRET) && want.length === got.length && timingSafeEqual(want, got);
}

async function handle(req: Request) {
  if (!authorized(req)) return new Response("Not found", { status: 404 });
  // local testing only: ?now=2027-03-05T02:00:00Z pretends it's that moment, so reminders and digests can be checked without waiting
  const fake = process.env.NODE_ENV !== "production" ? new URL(req.url).searchParams.get("now") : null;
  const result = await runHourly(fake ? new Date(fake) : new Date());
  return Response.json({ ok: true, at: new Date().toISOString(), ...result });
}

export { handle as GET, handle as POST };
