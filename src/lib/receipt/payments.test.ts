import { describe, it, expect } from "vitest";
import { derivePayments } from "./payments";

describe("derivePayments", () => {
  it("prints a single cash row", () => {
    expect(derivePayments({ paymentMethod: "cash", total: 120 })).toEqual([
      { type: "CASH", reference: "-", amount: 120 },
    ]);
  });

  it("uses the shop UPI id as the UPI reference", () => {
    expect(derivePayments({ paymentMethod: "upi", total: 120, upiId: "shop@upi" })).toEqual([
      { type: "UPI", reference: "shop@upi", amount: 120 },
    ]);
  });

  it("splits cash and UPI amounts", () => {
    expect(
      derivePayments({ paymentMethod: "split", total: 120, cashAmount: 50, upiAmount: 70, upiId: "shop@upi" }),
    ).toEqual([
      { type: "CASH", reference: "-", amount: 50 },
      { type: "UPI", reference: "shop@upi", amount: 70 },
    ]);
  });

  it("keeps khata as a reference-only tender (no money received)", () => {
    expect(derivePayments({ paymentMethod: "khata", total: 120, customerName: "Asha" })).toEqual([
      { type: "KHATA", reference: "Asha", amount: 120 },
    ]);
  });

  it("falls back to a payable row when the method is unknown", () => {
    expect(derivePayments({ total: 120 })).toEqual([
      { type: "PAYABLE", reference: "-", amount: 120 },
    ]);
  });
});
