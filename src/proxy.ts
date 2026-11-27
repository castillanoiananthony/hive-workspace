import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Fast cookie check only; every page still verifies the session against the database.
export function proxy(request: NextRequest) {
  const signedIn = Boolean(getSessionCookie(request));
  const { pathname } = request.nextUrl;
  if (pathname === "/login") return signedIn ? NextResponse.redirect(new URL("/cell", request.url)) : NextResponse.next();
  if (!signedIn) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/onboarding", "/cell/:path*", "/hive/:path*", "/calendar/:path*", "/settings/:path*", "/tasks/:path*"],
};
