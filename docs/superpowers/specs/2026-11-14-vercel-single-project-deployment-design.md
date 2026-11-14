# Design: single-project deployment of POS + API on Vercel

Date: 2026-11-14
Status: proposed (awaiting approval)

## Intent

Run the POS UI **and** the API from **one Vercel project**, so staff use a single URL and the browser never
crosses origins — auth cookies stay first-party and refresh sessions survive. Cloudflare Workers/wrangler
leaves the production path.

Why now: the API on Workers is already live and healthy (`https://gbretail-backend.rakeshacot.workers.dev`,
health 200, `db:connected`), but the POS hostname on Vercel does not route (edge returns
`x-vercel-error: NOT_FOUND` for every new hostname in this account, while older projects still serve).
Every design that needs a *second* Vercel hostname inherits that breakage, so the API must ride the
**same deployment as the UI**.

## Goals

- One Vercel project serves the POS UI and the API at one origin.
- Auth cookies (`accessToken`, `refreshToken`) are first-party; refresh works through the browser.
- Neon (Postgres) stays the datastore, reached over HTTP via the Neon serverless driver.
- No wrangler/Workers in the production request path (Worker kept only as fallback until verified).
- Migrations and seeding run from CI/local — never through an HTTP request.

## Non-goals

- No custom domain yet (sticking with `*.vercel.app`).
- No changes to `gbretail-online` or `gbretail-microservice`.
- No schema changes, no new features, no CI/CD pipeline work (Phase B, separate task).

## Constraints

0. **$0 only. No paid plan, no Docker.** Everything runs on free tiers: Vercel **Hobby** + Neon free
   (already in use). Consequences:
   - Hobby gives Functions 300s max duration, 2 GB / 1 vCPU, 1M invocations/month, 100 deployments/day —
     far above a single-shop POS's needs.
   - Hobby's Deployment Protection is **Vercel Authentication only**; Password Protection is Pro-only.
     Free substitutes: *Shareable Links* and *Protection Exceptions* (both included on Hobby), or a
     **public production alias** once it routes (the account's `prod_deployment_urls_and_all_previews`
     setting exempts production aliases from SSO).
   - **Docker is ruled out**: container image pull + start would blow the <5s budget, and Hobby's function
     model already covers us.
   - *Note (Vercel terms):* Hobby is a non-commercial tier; a commercial retail POS is outside its intended
     use. Proceeding per explicit instruction to spend nothing — the fallback path below stays free too.
1. **Cold start must be < 5 s.** Measured baseline: Cloudflare Worker start = **50 ms**; a Vercel Node
   function with Prisma is expected **1–3 s**. This is a **measured gate**, not an assumption:
   after each fresh deploy, the first `/api/health` and first page load must respond < 5 s, otherwise the
   API reverts to the Worker path (which is 50 ms) and the in-project mount is dropped.
2. **Never set `ssoProtection` to `null`.** In this account that value breaks edge routing — every hostname
   404s (reproduced 4×: project-only null, team+project null, `preview`, `prod_deployment_urls_and_all_previews`
   all 404; restoring `all_except_custom_domains` recovers routing in ~60s). Working account projects use
   `prod_deployment_urls_and_all_previews` or `all_except_custom_domains`; ours currently sits at
   `prod_deployment_urls_and_all_previews`.
3. **The project's production alias still 404s** at the edge (account-level issue affecting newly created
   hostnames only; `inktown`/`pressio-ui`/`dsa-tracker` serve fine). Interim entry point = the **deployment
   URL**, which routes and is SSO-gated. This is not caused by the design below.
4. POS must keep working with `NEXT_PUBLIC_API_URL` pointing at its own origin.

## Approaches considered

| # | Approach | Trade-off |
|---|----------|-----------|
| 1 | **In-project Next route handler mounting the Hono app** (chosen) | One deployment, one origin, no CORS, no rewrite proxy. Costs: backend repo becomes a publishable npm package; Prisma client generation must run in the POS build |
| 2 | Separate Vercel project for the API + existing rewrite proxy | Less packaging work, but the API needs its **own hostname** — exactly what's broken; the POS would proxy to a 404 |
| 3 | Dockerfile: one container running Next standalone + Hono API on one port | **Ruled out** — container start breaks the <5s cold-start budget and Hobby's function model already covers the workload |
| 4 | Status quo: API on Workers, POS proxies via rewrite (already proven) | Zero rework, keeps two platforms and wrangler in the path — but it is the **fallback**: Worker cold start is 50 ms, so it stays the speed benchmark and the safety net |

Chosen: **#1**. #2 and #4 both depend on a second hostname; #3 adds a container and custom server for no
functional gain.

## Design

### Backend repo (`gbretail-backend`) becomes a publishable package

- `package.json`: name `@gbretail/backend`; add `exports`:
  - `"." : "./dist/index.js"` (Node server — local/Docker)
  - `"./app": "./dist/app.js"` (**Hono app, no server bootstrap** — this is what Vercel imports)
- `files: ["dist", "prisma"]` so the schema ships to consumers.
- `src/app.ts` stays server-free (it already is; `src/index.ts` owns the `serve()` call).
- Prisma stays on the Neon **HTTP** driver (`USE_NEON=1` → `@prisma/adapter-neon`) — no TCP in a serverless function.
- Tag `v1.0.0` so the POS can pin an exact commit.

### POS repo (`gbretail-pos`) mounts the API

- Dependency: `"@gbretail/backend": "github:rak626/gbretail-backend#v1.0.0"`.
- `devDependency`: `prisma` (CLI). Build script: `prisma generate --schema=node_modules/@gbretail/backend/prisma/schema.prisma && next build`.
  (The backend package keeps `@prisma/client` as a peer dependency so one version is generated for both sides.)
- New file `src/app/api/[...path]/route.ts`:

  ```ts
  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";
  import app from "@gbretail/backend/app";

  const handler = (request: Request) => app.fetch(request);
  export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE, handler as OPTIONS };
  ```

  Next route handlers beat `rewrites()`, so this takes over `/api/*`; the existing rewrite stays behind
  `API_PROXY_TARGET` as the one-env-var fallback to the live Worker.
- `next.config.ts`: unchanged except that the rewrite only applies when `API_PROXY_TARGET` is set (it already is conditional).

### Environment (Vercel → project `gbretail-retail-pos`, Production)

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Neon pooled URL (`?schema=public`) | from `/tmp/opencode/neon-url.txt` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | generated hex secrets | match the Worker for seamless fallback |
| `USE_NEON` | `1` | HTTP driver, no TCP |
| `NODE_ENV` | `production` | |
| `CORS_ORIGIN` | POS origin (+ Worker fallback) | moot same-origin; kept for the fallback |
| `NEXT_PUBLIC_API_URL` | the POS's own origin | already set |
| `API_PROXY_TARGET` | **unset** | presence would route `/api/*` to the Worker instead of the in-project API |

### Request flow (production)

```
browser ──► POS origin /api/orders ──► Next route handler ──► Hono app ──► Neon (HTTP)
              (same origin, first-party cookies)                                    │
              ◄── Response incl. 2× Set-Cookie ◄────────────────────────────────────┘
```

## Verification

Local first, then deployed:

1. `npm run build` + `next start` in the POS → `POST /api/auth/login` returns **200 with both `Set-Cookie`
   headers intact** (the critical unknown: two cookies through a Next route handler), `POST /api/auth/refresh`
   works with the cookie jar, `GET /api/health` returns `db: connected`.
2. Deploy to Vercel production.
3. **Cold-start gate** (fresh deploy, instance cold): first `/api/health` and first page load must each
   respond in **< 5 s** (measured with `curl -w %{time_total}`), and a warm second call should be far
   faster. A failure here reverts the API to the Worker path (constraint 4).
4. Against the deployed URL: health 200 → login with the **generated** production password 200 → login with
   `super123` must **fail** → refresh via cookie jar → **test sale** `POST /api/orders` (payload from
   `gbretail-backend/tests/integration/orders.test.ts` `bill()`) → verify **stock decrement** → POS homepage 200.
5. Repos: `npm test` + `typecheck` green in both, CI green, both repos pushed.

## Risks and rollback

| Risk | Mitigation / rollback |
|---|---|
| Next route handler drops one of the two `Set-Cookie` headers | Detect in step 1 locally; fallback = set `API_PROXY_TARGET` to the live Worker (already proven) — one env var, no code change |
| Prisma client generation fails in Vercel's build | Generate in POS `postinstall`/`build`; fallback = keep the Worker |
| Cold start ≥ 5 s on Hobby | Fallback = set `API_PROXY_TARGET` to the live Worker (50 ms) and drop the in-project mount; the rewrite is already implemented and locally proven |
| Hobby lacks Password Protection | Staff reach the POS via Vercel account sign-in, a free Shareable Link, or the public production alias once it routes |
| Production alias still 404 | Unrelated to this change; staff use the deployment URL (SSO) meanwhile; Vercel support/dashboard for the alias |

## Left for the builder

- Backend: package `exports`, `files`, peer-dep move, tag `v1.0.0`.
- POS: dependency + `prisma generate` in the build, the catch-all route handler, env wiring.
- Run the verification ladder; report before any teardown of the Worker.
