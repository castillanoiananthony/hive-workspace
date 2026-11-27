import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Fast cookie check only; every page still verifies the session against the database.
export function proxy(request: NextRequest) {
  const signedIn = Boolean(getSessionCookie(request));
  const { pathname } = request.nextUrl;
  // the landing page and the sign-in/up pages are public; signed-in people skip straight to Home
  if (pathname === "/" || pathname === "/signin" || pathname === "/signup") return signedIn ? NextResponse.redirect(new URL("/home", request.url)) : NextResponse.next();
  if (!signedIn) return NextResponse.redirect(new URL("/signin", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/home", "/signin", "/signup", "/onboarding", "/cell/:path*", "/hive/:path*", "/calendar/:path*", "/settings/:path*", "/tasks/:path*", "/profile/:path*", "/tutorial/:path*", "/join/:path*", "/people/:path*", "/u/:path*"],
};
