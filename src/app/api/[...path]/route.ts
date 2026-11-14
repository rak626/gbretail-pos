import app from "@gbretail/backend/app";

// The API is mounted inside the POS deployment, so the browser only ever talks
// to this origin: auth cookies stay first-party and refresh sessions survive.
// The Hono app owns every route under /api — this handler is a thin adapter
// from the Next.js Web Request/Response pair to Hono's fetch handler.
export const runtime = "nodejs";
// API responses are per-request data (stock levels, carts, sessions). Never let
// the CDN cache them — a cached /api/orders GET would serve stale stock to
// every terminal at once.
export const dynamic = "force-dynamic";

const handler = (request: Request): Response | Promise<Response> => app.fetch(request);

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE, handler as OPTIONS };
