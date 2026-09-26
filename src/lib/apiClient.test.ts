import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient, ApiError, setMemoryTokenStore } from "./apiClient";

const BASE = "http://localhost:4000";

function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...headers } });
}

describe("apiClient", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", BASE);
    setMemoryTokenStore({ getState: () => ({ accessToken: "mem-token" }) });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends memory token as Authorization header", async () => {
    const spy = vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", spy);
    await apiClient.get("/api/health");
    const [, init] = spy.mock.calls[0]!;
    expect((init!.headers as Record<string, string>)["Authorization"]).toBe("Bearer mem-token");
    expect(init!.credentials).toBe("include");
  });

  it("401 triggers single cookie-refresh + retry", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push(url);
        if (url.endsWith("/api/auth/refresh")) return jsonResponse({ accessToken: "fresh-token" });
        if (calls.filter((u) => u.endsWith("/api/health")).length === 1) return jsonResponse({ error: "x" }, 401);
        return jsonResponse({ ok: true });
      })
    );
    const { useAuthStore } = await import("@/store/authStore");
    await apiClient.get("/api/health");
    expect(calls.some((u) => u.endsWith("/api/auth/refresh"))).toBe(true);
    expect(useAuthStore.getState().accessToken).toBe("fresh-token");
  });

  it("broadcasts auth:revoked on SESSION_REVOKED", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "revoked", code: "SESSION_REVOKED" }, 401)));
    const seen: string[] = [];
    const h = (e: Event) => seen.push((e as CustomEvent<string>).detail);
    window.addEventListener("auth:revoked", h);
    try {
      await expect(apiClient.get("/api/health")).rejects.toBeInstanceOf(ApiError);
      expect(seen).toContain("SESSION_REVOKED");
    } finally {
      window.removeEventListener("auth:revoked", h);
    }
  });

  it("non-JSON 500 becomes HTTP 500 ApiError (no crash)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>oops</html>", { status: 500 })));
    const err = await apiClient.get("/api/health").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe("HTTP 500");
  });
});
