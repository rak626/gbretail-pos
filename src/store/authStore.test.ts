import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "./authStore";

const owner = { id: "u1", shopId: "s1", email: "o@x.co", name: "Owner", role: "SHOP_OWNER" };
const staff = { id: "u2", shopId: "s1", email: "s@x.co", name: "Staff", role: "STAFF", counterId: "ctr9" };

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it("never persists tokens (cookies-only)", () => {
    useAuthStore.getState().setAuth("tok", owner as any, { id: "s1", name: "S" }, [{ id: "c1", shopId: "s1", name: "C1", isActive: true }]);
    const raw = localStorage.getItem("gbretail-auth");
    expect(raw ?? "").not.toContain("tok");
    expect(raw ?? "").not.toContain("accessToken");
    expect(useAuthStore.getState().accessToken).toBe("tok");
  });

  it("pins STAFF to assigned counter, owner to first counter", () => {
    useAuthStore.getState().setAuth("t", staff as any, null, [
      { id: "c1", shopId: "s1", name: "C1", isActive: true },
      { id: "ctr9", shopId: "s1", name: "C9", isActive: true },
    ]);
    expect(useAuthStore.getState().selectedCounterId).toBe("ctr9");
    useAuthStore.getState().clearAuth();
    useAuthStore.getState().setAuth("t", owner as any, null, [{ id: "c1", shopId: "s1", name: "C1", isActive: true }]);
    expect(useAuthStore.getState().selectedCounterId).toBe("c1");
  });

  it("clearAuth wipes memory token + identity", () => {
    useAuthStore.getState().setAuth("t", owner as any, null, []);
    useAuthStore.getState().clearAuth();
    const s = useAuthStore.getState();
    expect(s.accessToken).toBeNull();
    expect(s.user).toBeNull();
  });
});
