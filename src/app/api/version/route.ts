/** The deployed build, so open tabs can tell when a newer version is live. */
export function GET() {
  return Response.json({ v: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" }, { headers: { "cache-control": "no-store" } });
}
