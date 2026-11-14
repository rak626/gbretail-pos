# Single-Project Vercel Deployment (POS + API) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the POS UI and the Hono API from one Vercel project (one origin, one URL), with no paid services and a measured cold start under 5 seconds.

**Architecture:** The backend repo becomes a publishable npm package `@gbretail/backend` exposing the bare Hono app at the `./app` subpath. The POS repo consumes it as a git dependency and mounts it in a Next.js catch-all route handler (`src/app/api/[...path]/route.ts`), so `/api/*` is served from the POS's own origin — auth cookies stay first-party and no rewrite proxy is needed. The Cloudflare Worker stays deployed as a free, 50 ms fallback that can be re-enabled with one env var.

**Tech Stack:** Next.js 16 (App Router, route handlers), Hono 4.13.8, Prisma 7.10.0 (`prisma-client-js` generator, Neon HTTP driver), Vercel Hobby (free), Neon free tier, Cloudflare Workers (fallback only).

**Spec:** `docs/superpowers/specs/2026-11-14-vercel-single-project-deployment-design.md`

## Global Constraints

- **$0 only.** Vercel Hobby + Neon free + Cloudflare Workers free. No Pro features (no Password Protection), no Docker (container start would break the cold-start budget).
- **Cold start must measure under 5 s** — a hard gate in Task 4, not an assumption.
- **Never set `ssoProtection` to `null`** on any Vercel project: in this account that value breaks edge routing (every hostname 404s). Restore to `all_except_custom_domains` or `prod_deployment_urls_and_all_previews` instead.
- **The API must stay on the POS's own origin.** No cross-origin API URL in production — that is what breaks refresh-session cookies.
- **Migrations and seeding run from the CLI/CI only**, never through an HTTP request.
- Both repos stay green (`typecheck` + tests) and pushed after every task.
- Existing backend routes, request/response shapes and cookie names are unchanged — this plan changes hosting, not the API contract.

## Review Focus

1. **Two `Set-Cookie` headers on login** (`accessToken` + `refreshToken`) must both survive the Next route handler. Losing one silently breaks refresh — the user is logged out every 15 minutes with no error.
2. **API responses must never be CDN-cached** — a cached `/api/health` or `/api/orders` GET would serve stale stock and inventory to every shop terminal at once.
3. **With `NEXT_PUBLIC_API_URL` unset, browser API calls must use same-origin relative URLs and must not throw.** The current client throws when the base is empty, which would break the whole UI in production.
4. **The Prisma client must exist inside the deployed bundle.** If generation is skipped at build time, every request 500s with a Prisma initialization error — the first symptom is a 500 on `/api/health`.
5. **`API_PROXY_TARGET` must be absent in production.** The rewrite is an afterFiles rewrite so the route handler still wins, but its presence means the fallback path is silently live and the intended topology is not the one being tested.

---

### Task 1: Package the backend for consumption

**Files:**
- Modify: `gbretail-backend/package.json`
- Create: `gbretail-backend/tests/unit/package-exports.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: npm package `@gbretail/backend` with subpath export `./app` → `./dist/app.js` (types `./dist/app.d.ts`) and the Prisma schema shipped at `prisma/schema.prisma`. The `./app` default export is a Hono app exposing `fetch(request: Request): Promise<Response>`.

- [ ] **Step 1: Write the failing test**

Create `gbretail-backend/tests/unit/package-exports.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import app from "../../src/app.js";

describe("package contract", () => {
  it("exposes the Hono app without starting a server", () => {
    expect(typeof app.fetch).toBe("function");
  });

  it("declares the ./app export and ships the prisma schema", () => {
    const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
    expect(pkg.name).toBe("@gbretail/backend");
    expect(pkg.exports["./app"].import).toBe("./dist/app.js");
    expect(pkg.files).toContain("dist");
    expect(pkg.files).toContain("prisma");
    expect(pkg.private).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd gbretail-backend && npx vitest run tests/unit/package-exports.test.ts`
Expected: FAIL — `pkg.name` is `"gbretail-backend"`, `pkg.exports` is undefined.

- [ ] **Step 3: Add the package contract to package.json**

In `gbretail-backend/package.json`: set `"name": "@gbretail/backend"`, delete `"private": true`, and add:

```json
"exports": {
  ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
  "./app": { "types": "./dist/app.d.ts", "import": "./dist/app.js" }
},
"files": ["dist", "prisma"]
```

Keep `"type": "module"` and every existing script untouched.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd gbretail-backend && npx vitest run tests/unit/package-exports.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Verify the build emits the exported entry points**

Run: `cd gbretail-backend && npm run build && ls dist/app.js dist/app.d.ts dist/index.js dist/index.d.ts`
Expected: all four files listed.

- [ ] **Step 6: Verify importing the app does not open a server socket**

Run: `cd gbretail-backend && node -e "import('./dist/app.js').then(m=>{console.log('fetch:', typeof m.default.fetch); process.exit(0)})"`
Expected: prints `fetch: function` and exits immediately (no listener keeps the process alive).

- [ ] **Step 7: Run the whole backend suite**

Run: `cd gbretail-backend && npm test`
Expected: all suites pass (92 existing + 2 new).

- [ ] **Step 8: Commit**

```bash
cd gbretail-backend
git add package.json tests/unit/package-exports.test.ts
git commit -m "Package backend as @gbretail/backend with a publishable ./app export for Vercel in-project hosting"
git push origin main
```

- [ ] **Step 9: Tag the release the POS will pin**

```bash
cd gbretail-backend
git tag v1.0.0
git push origin v1.0.0
```

---

### Task 2: Mount the API inside the POS app

**Files:**
- Modify: `gbretail-pos/package.json` (dependency + build script)
- Modify: `gbretail-pos/prisma.config.ts` (finalize the file created by the spike)
- Modify: `gbretail-pos/src/lib/apiClient.ts` (same-origin default)
- Modify: `gbretail-pos/src/app/(pos)/page.tsx` (only if it repeats the empty-base guard)
- Create: `gbretail-pos/src/app/api/[...path]/route.ts`
- Create: `gbretail-pos/src/app/api/[...path]/route.test.ts`

**Interfaces:**
- Consumes: `@gbretail/backend/app` — default export, Hono app with `fetch(request: Request): Promise<Response>` (Task 1).
- Produces: HTTP surface `/api/*` on the POS origin, handled by `src/app/api/[...path]/route.ts`; `API_BASE` in `src/lib/apiClient.ts` becomes `""` (relative/same-origin) whenever `NEXT_PUBLIC_API_URL` is unset.

- [ ] **Step 1: Write the failing test**

Create `gbretail-pos/src/app/api/[...path]/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const appFetch = vi.fn();
vi.mock("@gbretail/backend/app", () => ({ default: { fetch: appFetch } }));

import { GET, dynamic } from "./route";

describe("api catch-all route", () => {
  beforeEach(() => appFetch.mockReset());

  it("forwards the request to the Hono app and returns its response", async () => {
    appFetch.mockResolvedValue(Response.json({ status: "ok" }, { status: 201 }));
    const res = await GET(new Request("http://localhost/api/health"));
    expect(appFetch).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("preserves both Set-Cookie headers from the API response", async () => {
    const headers = new Headers();
    headers.append("set-cookie", "accessToken=a; Path=/; HttpOnly; SameSite=Lax");
    headers.append("set-cookie", "refreshToken=r; Path=/; HttpOnly; SameSite=Lax");
    appFetch.mockResolvedValue(new Response("{}", { status: 200, headers }));
    const res = await GET(new Request("http://localhost/api/auth/login"));
    const cookies = res.headers.getSetCookie();
    expect(cookies).toHaveLength(2);
    expect(cookies.some((c) => c.startsWith("accessToken="))).toBe(true);
    expect(cookies.some((c) => c.startsWith("refreshToken="))).toBe(true);
  });

  it("is never statically cached", () => {
    expect(dynamic).toBe("force-dynamic");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd gbretail-pos && npx vitest run "src/app/api"`
Expected: FAIL — cannot resolve `./route`.

- [ ] **Step 3: Install the backend package as a dependency**

Run: `cd gbretail-pos && npm i github:rak626/gbretail-backend#v1.0.0`
Expected: `node -p "require('./node_modules/@gbretail/backend/package.json').name"` prints `@gbretail/backend`.

- [ ] **Step 4: Finalize `prisma.config.ts`**

Keep the spike's file, but make the datasource URL independent of build-time env so the build never needs a secret:

```ts
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "node_modules/@gbretail/backend/prisma/schema.prisma",
  datasource: { url: process.env.DATABASE_URL ?? "postgresql://u:p@localhost:5432/postgres" },
});
```

- [ ] **Step 5: Create the catch-all route handler**

Create `gbretail-pos/src/app/api/[...path]/route.ts`:

```ts
import app from "@gbretail/backend/app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = (request: Request): Response | Promise<Response> => app.fetch(request);

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE, handler as OPTIONS };
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd gbretail-pos && npx vitest run "src/app/api"`
Expected: PASS (3 tests).

- [ ] **Step 7: Wire Prisma generation into the build**

In `gbretail-pos/package.json` set `"build": "prisma generate && next build"`.
Run: `cd gbretail-pos && npx prisma generate`
Expected: `Generated Prisma Client (v7.10.0) to ./node_modules/@prisma/client` — the client must land in the **root** `node_modules/.prisma/client` (spike-confirmed) so the hoisted `@prisma/client` resolves it.

- [ ] **Step 8: Make same-origin the default for API calls**

In `gbretail-pos/src/lib/apiClient.ts`: keep `API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")`, but remove the `requireApiBase()` throw and the "not set" warning so an empty base means *same origin*. Update `src/app/(pos)/page.tsx` line ~90 if it repeats the guard.

Then add a case to `src/lib/apiClient.test.ts`: with `NEXT_PUBLIC_API_URL` unset (`vi.stubEnv("NEXT_PUBLIC_API_URL", "")`), a request must be issued to a **relative** path (e.g. `/api/auth/login`) and must **not** throw. Update any existing case that asserted the removed throw.

- [ ] **Step 9: Run the POS checks**

Run: `cd gbretail-pos && npm run typecheck && npm test`
Expected: typecheck clean, all suites pass (42 existing + 3 new).

- [ ] **Step 10: Commit**

```bash
cd gbretail-pos
git add package.json package-lock.json prisma.config.ts src/app/api src/lib/apiClient.ts src/lib/apiClient.test.ts "src/app/(pos)/page.tsx"
git commit -m "Mount the Hono API in-project at /api/* (same-origin auth cookies) and default API calls to relative URLs"
git push origin main
```

---

### Task 3: Prove the whole app locally in one process

**Files:** none (verification only).

**Interfaces:**
- Consumes: Task 2's route handler and the local Postgres at `localhost:5432/gbretail`.
- Produces: evidence that login → refresh → health works end to end through the Next route handler.

- [ ] **Step 1: Export the local backend environment**

Run:
```bash
cd gbretail-backend && set -a && . ./.env && set +a
cd ../gbretail-pos
```
Expected: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` are set for the local Postgres (`localhost:5432/gbretail`).

- [ ] **Step 2: Build the POS with the API mounted**

Run: `cd gbretail-pos && npm run build`
Expected: build succeeds; `prisma generate` runs before `next build`; no "PrismaClient is unable to run in the browser" or engine-tracing errors.

- [ ] **Step 3: Start the production server locally**

Run: `cd gbretail-pos && (npx next start -p 3100 > /tmp/opencode/pos-inproject.log 2>&1 & echo $! > /tmp/opencode/pos.pid)` then wait ~5 s.
Expected: server listening on 3100.

- [ ] **Step 4: Verify login sets both cookies through the route handler**

Run:
```bash
curl -s -D - -o /tmp/opencode/login.json -X POST http://localhost:3100/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"super@gbretail.local","password":"super123"}' | grep -ic '^set-cookie'
```
Expected: `2` (accessToken + refreshToken) and status 200.

- [ ] **Step 5: Verify refresh works with the cookie jar**

Run:
```bash
JAR=/tmp/opencode/local-cookies.txt; rm -f $JAR
curl -s -c $JAR -o /dev/null -X POST http://localhost:3100/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"super@gbretail.local","password":"super123"}'
curl -s -b $JAR -c $JAR -o /tmp/opencode/refresh.json -w '%{http_code}\n' -X POST http://localhost:3100/api/auth/refresh
```
Expected: `200` and a JSON body containing a new access token.

- [ ] **Step 6: Verify health**

Run: `curl -s http://localhost:3100/api/health`
Expected: `{"status":"ok","db":"connected",...}`.

- [ ] **Step 7: Stop the local server**

Run: `kill $(cat /tmp/opencode/pos.pid) 2>/dev/null; rm -f /tmp/opencode/pos.pid`
Expected: process gone.

---

### Task 4: Deploy to Vercel and clear the gates

**Files:** none (environment + deploy).

**Interfaces:**
- Consumes: Task 2's build; the Vercel project `gbretail-pos-web` (`prj_wkFZGkD3s7h3SFGODlf8flb2Xq5L`); the Neon URL in `/tmp/opencode/neon-url.txt`; the generated production password in `/tmp/opencode/prod-credentials.txt`.
- Produces: a production deployment serving POS + API on one origin, with measured cold start and a passed acceptance suite.

- [ ] **Step 1: Confirm the linked project**

Run: `cd gbretail-pos && cat .vercel/project.json`
Expected: `"projectName":"gbretail-pos-web"`, `projectId` `prj_wkFZGkD3s7h3SFGODlf8flb2Xq5L`.

- [ ] **Step 2: Set the production environment**

Set on the Vercel project (Production):

| Variable | Value |
|---|---|
| `DATABASE_URL` | contents of `/tmp/opencode/neon-url.txt` |
| `JWT_ACCESS_SECRET` | `openssl rand -hex 32` (fresh — the Worker's values are not readable) |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 32` (fresh) |
| `USE_NEON` | `1` |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://gbretail-pos-web.vercel.app` |
| `NEXT_PUBLIC_API_URL` | **removed** (same-origin → relative URLs) |
| `API_PROXY_TARGET` | **removed** (no rewrite; the Worker stays the manual fallback) |

Run: `cd gbretail-pos && npx vercel env ls production`
Expected: `API_PROXY_TARGET` and `NEXT_PUBLIC_API_URL` are **absent** from the list; the six variables above are present.

- [ ] **Step 3: Deploy**

Run: `cd gbretail-pos && npx vercel deploy --prod --yes`
Expected: a Ready production deployment; note its deployment URL.

- [ ] **Step 4: Cold-start gate (immediately after the deploy)**

Run (bypass header is required because the deployment URL is SSO-gated):
```bash
curl -s -o /dev/null -w 'cold /api/health: %{time_total}s\n' \
  -H "x-vercel-protection-bypass: $BYPASS" \
  "https://<deployment-url>/api/health"
```
Expected: **under 5 s**. If the bypass secret cannot be read from the project, time `npx vercel curl` instead and record the number.
If the measurement is ≥ 5 s: **stop** — the API reverts to the Worker fallback (set `API_PROXY_TARGET` to `https://gbretail-backend.rakeshacot.workers.dev`, redeploy) and the in-project mount is reported as not meeting the budget.

- [ ] **Step 5: Acceptance suite against the deployment**

Using the bypass header and a cookie jar, run in order:
1. `GET /api/health` → 200, `db: connected`.
2. `POST /api/auth/login` with the **generated** production password (from `/tmp/opencode/prod-credentials.txt`) → 200 with 2 `Set-Cookie` headers.
3. `POST /api/auth/login` with `super123` → **401** (must fail).
4. `POST /api/auth/refresh` with the cookie jar → 200.
5. `GET /` → 200 (POS homepage).
6. Test sale: `POST /api/orders` with the payload shape from `gbretail-backend/tests/integration/orders.test.ts` (`bill()` → items/total/paymentMethod) and an `Idempotency-Key` header → 201 with an `orderNumber` matching `/^ORD-\d{8}-[A-Z0-9]{4}-\d{4}$/`; then re-read the product's stock and confirm it decreased by the sold quantity.

- [ ] **Step 6: Confirm CI is green in both repos**

Run: `gh run watch <backend-run> -R rak626/gbretail-backend --exit-status` and the same for `rak626/gbretail-pos`.
Expected: both exit 0.

---

### Task 5: Clean up and document the new topology

**Files:**
- Modify: `gbretail-backend/scripts/deploy.md`
- Modify: `gbretail-pos/README.md` (only if it documents the API URL)

**Interfaces:**
- Consumes: the verified deployment from Task 4.
- Produces: docs that describe the shipped topology; one Vercel project instead of two.

- [ ] **Step 1: Delete the stray Vercel project**

Run (keeps only `gbretail-pos-web`):
```bash
TOK=$(sed -n 's/.*"token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' /home/rakesh/.local/share/com.vercel.cli/auth.json)
curl -s -X DELETE -H "Authorization: Bearer $TOK" \
  "https://api.vercel.com/v9/projects/prj_AKOEOtMPIupZDl9N4AVqDH0Q8ma1?teamId=team_MwoCdK4AGqx2mL4XpwNDIbwB" -w ' HTTP:%{http_code}\n'
```
Expected: `HTTP:204`.

- [ ] **Step 2: Update the backend deploy checklist**

In `gbretail-backend/scripts/deploy.md`: state that production serves the API from the POS's Vercel project at `/api/*` (same origin), that the Cloudflare Worker is the free fallback re-enabled with `API_PROXY_TARGET`, and that migrations/seed run from the CLI only.

- [ ] **Step 3: Update the POS README**

Document that API calls are same-origin relative paths (`/api/*`), that `NEXT_PUBLIC_API_URL` is only for local dev, and that `API_PROXY_TARGET` is the emergency switch to the Worker.

- [ ] **Step 4: Commit and push**

```bash
cd gbretail-backend && git add scripts/deploy.md && git commit -m "docs: production topology — API served in-project on Vercel, Worker as free fallback" && git push origin main
cd ../gbretail-pos && git add README.md && git commit -m "docs: same-origin API at /api/*; NEXT_PUBLIC_API_URL is local-dev only" && git push origin main
```

- [ ] **Step 5: Report the Worker decision**

State to the user: the Worker still runs (free, 50 ms cold start) as the rollback path; ask whether to keep it or tear it down. Do not delete it unprompted.
