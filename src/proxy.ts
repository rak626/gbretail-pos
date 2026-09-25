import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that don't require auth
const PUBLIC_PATHS = ["/login", "/_next", "/api", "/icon", "/favicon", "/manifest", "/apple-icon"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // Check for accessToken cookie or Authorization header presence (via cookie)
  const accessToken = req.cookies.get("accessToken")?.value;
  const refreshToken = req.cookies.get("refreshToken")?.value;

  // Also allow Authorization header via? middleware only sees cookies, but apiClient stores in localStorage; we rely on cookie for SSR
  // If no cookie, allow client-side auth via localStorage — we still let request through, client will redirect
  // To enforce strict, redirect to /login if no cookie and no token header
  // For now, only redirect if definitely no token and not already navigating to login

  // If we have no tokens and it's a page (not api), redirect to login
  const accept = req.headers.get("accept") || "";
  const isPage = accept.includes("text/html") || pathname === "/" || pathname.startsWith("/inventory") || pathname.startsWith("/customers") || pathname.startsWith("/orders") || pathname.startsWith("/ledger") || pathname.startsWith("/analytics");

  if (isPage && !accessToken && !refreshToken) {
    // Don't block if client has localStorage token — we can't see it server side, so we allow and client useEffect will handle
    // Add header to hint client to check auth
    const res = NextResponse.next();
    res.headers.set("x-auth-required", "1");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
