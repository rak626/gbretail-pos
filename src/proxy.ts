import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that don't require auth
const PUBLIC_PATHS = ["/login", "/_next", "/api", "/icon", "/favicon", "/manifest", "/apple-icon"];

// Server-visible session check. Cookies are same-site (localhost ignores ports),
// so backend-set cookies ARE visible here after login. But fetch sessions using
// Authorization: Bearer <localStorage> are invisible on page navigations
// (navigations never carry Authorization). So NEVER hard-redirect here —
// AuthGuard (client) is the source of truth and validates via /api/auth/me.
// Proxy only hints via x-auth-required to avoid login flash/loop.

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // Check for accessToken cookie or Authorization header presence (via cookie)
  const accessToken = req.cookies.get("accessToken")?.value;
  const refreshToken = req.cookies.get("refreshToken")?.value;
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");

  // If no server-visible session, allow through and let AuthGuard redirect.
  // (localStorage tokens are invisible here; /login auto-redirects back when the
  // session is actually valid, preserving ?next=.)
  if (!accessToken && !refreshToken && !authHeader) {
    const res = NextResponse.next();
    res.headers.set("x-auth-required", "1");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
