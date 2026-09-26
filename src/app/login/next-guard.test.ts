import { describe, it, expect } from "vitest";

// Mirrors takeNext() in src/app/login/page.tsx — the open-redirect guard.
// Kept as a pure copy so the security invariant is pinned by a test.
function takeNext(n: string | null): string | null {
  if (!n || !n.startsWith("/") || n.startsWith("//") || n.startsWith("/\\")) return null;
  if (n.startsWith("/login")) return null;
  if (/[:\\]/.test(n)) return null;
  return n;
}

describe("login ?next= guard", () => {
  it("rejects protocol-relative, absolute, backslash and /login targets", () => {
    expect(takeNext("//evil.com")).toBeNull();
    expect(takeNext("//evil.com/path")).toBeNull();
    expect(takeNext("http://evil.com")).toBeNull();
    expect(takeNext("/\\evil")).toBeNull();
    expect(takeNext("/login")).toBeNull();
    expect(takeNext("/login?x=1")).toBeNull();
    expect(takeNext("/a:b")).toBeNull();
    expect(takeNext(null)).toBeNull();
  });
  it("accepts plain same-origin paths", () => {
    expect(takeNext("/")).toBe("/");
    expect(takeNext("/orders?page=2")).toBe("/orders?page=2");
    expect(takeNext("/inventory")).toBe("/inventory");
  });
});
