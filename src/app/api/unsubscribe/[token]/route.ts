import { setSubscribed } from "@/lib/teammate";

// One-click unsubscribe (RFC 8058): Gmail and Outlook POST here from their own "Unsubscribe" button.
export async function POST(_req: Request, ctx: RouteContext<"/api/unsubscribe/[token]">) {
  const r = await setSubscribed((await ctx.params).token, false);
  return new Response(r ? "Unsubscribed" : "Not found", { status: r ? 200 : 404 });
}
