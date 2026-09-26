<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# GB Retail POS — project rules

- Online-only POS (no offline billing). Dexie `products` is a speed cache; writes require the server.
- Auth: httpOnly cookies + in-memory access token. Never persist tokens in localStorage. Refresh via cookie only (`POST /api/auth/refresh`, no body).
- API base: `NEXT_PUBLIC_API_URL` (required, e.g. `http://localhost:4000`). Client fails fast when unset.
- Roles: `SUPER_ADMIN` (platform, no billing) / `SHOP_OWNER` (full shop) / `STAFF` (billing; inventory only with `canManageInventory`). All RBAC is enforced server-side; client bounces are UX only.
- Catalog: `useCatalogStore.loadCatalog()` is the source; call `invalidate()` after any inventory mutation.
- CSV import: use `POST /api/products/batch` (≤500 rows), never sequential `POST /api/products`.
- Exports: use `apiClient.download()` (authed), never `window.open` on a bare URL.
- Search/pagination: list endpoints support `?cursor&limit → { nextCursor }` (preferred) and legacy `?page` (deprecated).
- Run `npm run typecheck` (strict + `noUncheckedIndexedAccess`) before every change.

