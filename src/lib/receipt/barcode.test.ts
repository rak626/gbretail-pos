import { describe, it, expect } from "vitest";
import { code128Modules, code128Svg } from "./barcode";

describe("code128Modules", () => {
  it("emits start + data + checksum + stop modules", () => {
    // 2 data chars: start, d1, d2, checksum = 11 modules each; stop = 13.
    expect(code128Modules("AB")).toHaveLength(4 * 11 + 13);
  });

  it("matches the expected width for a bill number", () => {
    // 13 data chars: start + 13 + checksum = 15 symbols × 11 + stop 13.
    expect(code128Modules("HW18040019640")).toHaveLength(15 * 11 + 13);
  });

  it("drops non-ASCII characters and returns empty for unusable input", () => {
    expect(code128Modules("")).toEqual([]);
    expect(code128Modules("₹₹")).toEqual([]);
    expect(code128Modules("A₹B")).toEqual(code128Modules("AB"));
  });
});

describe("code128Svg", () => {
  it("renders bars and escapes the aria label", () => {
    const svg = code128Svg('A"<B');
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("<rect");
    expect(svg).not.toContain('aria-label="Barcode A"<B"');
  });

  it("returns an empty string when nothing can be encoded", () => {
    expect(code128Svg("")).toBe("");
  });
});
