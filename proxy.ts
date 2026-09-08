import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = request.cookies.has("ledger_auth");

  // Already on login page — if authenticated, redirect to home
  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Not authenticated — redirect to login
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - /studio and its sub-paths (Sanity Studio)
     * - /api/auth/* (login/logout/me endpoints)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, static assets
     */
    "/((?!login(?:/|$)|studio(?:/|$)|api/auth(?:/|$)|_next(?:/|$)|favicon.ico$).*)",
  ],
};
