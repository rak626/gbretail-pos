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

  // If no cookie, the browser has no server-visible session — bounce to login.
  // (localStorage tokens are invisible here; /login auto-redirects back when the
  // session is actually valid, preserving ?next=.)
  if (!accessToken && !refreshToken) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
