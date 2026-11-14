import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock factories are hoisted above module-level declarations, so the mock
// has to be created through vi.hoisted to be reachable from the factory.
const { appFetch } = vi.hoisted(() => ({ appFetch: vi.fn() }));
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
