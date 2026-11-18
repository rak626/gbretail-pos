import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  // Same-origin API proxy (deploy plan B): in production NEXT_PUBLIC_API_URL
  // points at THIS origin, and these rewrites forward /api/* to the Cloudflare
  // worker. The browser therefore never crosses sites, so the backend's
  // SameSite=Lax auth cookies stay first-party and refresh sessions survive.
  // Local dev leaves API_PROXY_TARGET unset and talks to the backend directly.
  async rewrites() {
    const target = process.env.API_PROXY_TARGET; // e.g. https://gbretail-backend.<sub>.workers.dev
    return target ? [{ source: "/api/:path*", destination: `${target}/api/:path*` }] : [];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              // Production is same-origin (/api/* mount) — never widen it to a
              // developer's localhost origin when NEXT_PUBLIC_API_URL is unset.
              "connect-src 'self'" + (process.env.NEXT_PUBLIC_API_URL ? ` ${process.env.NEXT_PUBLIC_API_URL}` : ""),
              "frame-ancestors 'none'",
            ].join("; "),
          },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
