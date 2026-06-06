import { NextRequest, NextResponse } from "next/server";

// Gate the whole app behind the shared-password cookie.
// /login and the login API are public; everything else needs the cookie.
const PUBLIC_PATHS = ["/login", "/api/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const authed = req.cookies.get("av_auth")?.value === "1";

  if (isPublic) {
    // Already logged in? skip the login page.
    if (pathname === "/login" && authed) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!authed) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // run on everything except next internals and static assets
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)).*)",
  ],
};
