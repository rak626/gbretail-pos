import { describe, it, expect } from "vitest";
import { computeGst, formatBillTimestamp, formatGstDate, money, round2 } from "./tax";

describe("computeGst", () => {
  it("extracts the inclusive tax and splits it into CGST/SGST", () => {
    const gst = computeGst(59, 5);
    expect(gst.taxable).toBe(56.19);
    expect(gst.tax).toBe(2.81);
    expect(gst.cgst + gst.sgst).toBeCloseTo(gst.tax, 2);
    expect(gst.total).toBe(59);
    expect(gst.gross).toBe(59);
  });

  it("keeps the pre-discount gross while taxing the net payable", () => {
    const gst = computeGst(90, 5, 100);
    expect(gst.gross).toBe(100);
    expect(gst.total).toBe(90);
    expect(gst.taxable).toBe(85.71);
    expect(gst.tax).toBe(4.29);
  });

  it("handles a zero rate without producing NaN", () => {
    const gst = computeGst(59, 0);
    expect(gst.tax).toBe(0);
    expect(gst.cgst).toBe(0);
    expect(gst.sgst).toBe(0);
    expect(gst.taxable).toBe(59);
  });

  it("rounds to paise and ignores invalid input", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(Number.NaN)).toBe(0);
    const gst = computeGst(Number.NaN, Number.NaN);
    expect(gst.total).toBe(0);
    expect(gst.rate).toBe(0);
  });
});

describe("money", () => {
  it("always prints two decimals", () => {
    expect(money(59)).toBe("59.00");
    expect(money("2.8")).toBe("2.80");
    expect(money(null)).toBe("0.00");
  });
});

describe("formatBillTimestamp", () => {
  it("prints dd-MMM-yyyy HH:mm:ss", () => {
    const d = new Date(2026, 10, 4, 21, 1, 37);
    expect(formatBillTimestamp(d)).toBe("04-Nov-2026 21:01:37");
  });

  it("returns an empty string for an invalid date", () => {
    expect(formatBillTimestamp("not-a-date")).toBe("");
  });
});

describe("formatGstDate", () => {
  it("formats ISO and human dates as dd-MMM-yyyy", () => {
    expect(formatGstDate("2017-07-01")).toBe("01 Jul 2017");
    expect(formatGstDate("01 Jul 2017")).toBe("01 Jul 2017");
  });

  it("returns blank for empty values and the raw text when unparseable", () => {
    expect(formatGstDate("")).toBe("");
    expect(formatGstDate(null)).toBe("");
    expect(formatGstDate("not a date")).toBe("not a date");
  });
});
