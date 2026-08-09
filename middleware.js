import { NextResponse } from "next/server";

// Lightweight gate: checks cookie *presence* for page routes and redirects.
// Real JWT verification happens server-side on every /api call.
export function middleware(req) {
  const { pathname } = req.nextUrl;
  const hasToken = Boolean(req.cookies.get("narco_token")?.value);

  if (pathname === "/login") {
    if (hasToken) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!hasToken) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // All pages except api routes, next internals and static files
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|robots.txt).*)",
  ],
};
