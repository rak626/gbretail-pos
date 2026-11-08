import { describe, it, expect } from "vitest";
import { generateReceiptHtml } from "./template";
import type { ReceiptContext } from "./types";

function ctx(over: Partial<ReceiptContext> = {}): ReceiptContext {
  return {
    items: [
      {
        name: "home beautiful kitchen napkins",
        articleCode: "1220029480",
        hsn: "630710",
        quantity: 1,
        price: 59,
        unit: "pcs",
        lineTotal: 59,
      },
    ],
    total: 59,
    discount: 0,
    shop: {
      name: "Vishal Mega Mart",
      city: "Midnapore",
      address: "Jack Paul Building, Hospital Road, Midnapore",
      gstin: "19AABC A7614B1ZV",
      gstDate: "2017-07-01",
      fssai: "12819014000095",
      companyName: "Airplaza Retail Holdings Pvt Ltd",
      franchiseNote: "A Franchise Store Operated By Airplaza Retail Holding Pvt. Ltd.",
      phone: "9315487822",
      receiptFooter: "Thank's for shopping with us.",
      poweredBy: "OMNIPAY",
    },
    meta: {
      billNo: "HW18040019640",
      billDate: "2026-11-04T21:01:37+05:30",
      sessionNo: 1,
      counterNo: "04",
      cashier: "ARPITA GIRI (*****055)",
      payments: [{ type: "UPI", reference: "630814489290", amount: 59 }],
      customerPhone: "918609179249",
      gstRate: 5,
    },
    ...over,
  };
}

describe("generateReceiptHtml", () => {
  it("prints the retail tax-invoice sections", () => {
    const html = generateReceiptHtml(ctx());
    expect(html).toContain("Vishal Mega Mart");
    expect(html).toContain("TAX INVOICE");
    expect(html).toContain("FSSAI LIC NO: 12819014000095");
    expect(html).toContain("De 01 Jul 2017");
    expect(html).toContain("Airplaza Retail Holdings Pvt Ltd");
    expect(html).toContain("A Franchise Store Operated By");
    expect(html).toContain("Bill No: HW18040019640");
    expect(html).toContain("Counter No: 04");
    expect(html).toContain("Cashier: ARPITA GIRI (*****055)");
    expect(html).toContain("Article Description");
    expect(html).toContain("GST 5.00%");
    expect(html).toContain("630710");
    expect(html).toContain("1220029480");
    expect(html).toContain("Payment Details");
    expect(html).toContain("Tax Summary");
    expect(html).toContain("56.19");
    expect(html).toContain("2.81");
    expect(html).toContain("59.00");
    expect(html).toContain("Loyalty Points Added to Mobile: #918609179249");
    expect(html).toContain("Powered By OMNIPAY");
    expect(html).toContain("<svg");
  });

  it("marks unconfirmed prints as a PRE-BILL without a barcode", () => {
    const html = generateReceiptHtml(ctx({ meta: { billDate: new Date(), cashier: "Asha" } }));
    expect(html).toContain("PRE-BILL");
    expect(html).toContain("DRAFT — NOT SAVED");
    expect(html).not.toContain("<svg");
    expect(html).toContain("PAYABLE");
    expect(html).toContain("Balance Due");
  });

  it("shows khata as due instead of received", () => {
    const html = generateReceiptHtml(
      ctx({
        meta: {
          billNo: "HW18040019641",
          payments: [{ type: "KHATA", reference: "Asha", amount: 59 }],
          customerName: "Asha",
        },
      }),
    );
    expect(html).toContain("KHATA");
    expect(html).toContain("Balance Due");
    expect(html).toContain("59.00");
  });

  it("escapes shop and item text", () => {
    const html = generateReceiptHtml(
      ctx({
        shop: { name: "<b>Store</b>", receiptFooter: 'Say "hi" & bye' },
        items: [{ name: "<script>alert(1)</script>", lineTotal: 59, price: 59 }],
      }),
    );
    expect(html).toContain("&lt;b&gt;Store&lt;/b&gt;");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("Say &quot;hi&quot; &amp; bye");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("shows a line-level discount and bill discount", () => {
    const html = generateReceiptHtml(
      ctx({
        items: [{ name: "Soap", quantity: 1, price: 100, unit: "pcs", lineTotal: 100, discount: 5 }],
        total: 90,
        discount: 10,
      }),
    );
    expect(html).toContain("Disc: 10.00");
    expect(html).toContain("Discount :");
    expect(html).toContain("-10.00");
    expect(html).toContain("90.00");
  });

  it("omits optional header and meta lines that have no value", () => {
    const html = generateReceiptHtml(
      ctx({
        shop: { name: "Corner Shop" },
        meta: { billNo: "B-1", billDate: "2026-11-04T21:01:37+05:30" },
      }),
    );
    expect(html).toContain("Corner Shop");
    expect(html).not.toContain("FSSAI");
    expect(html).not.toContain("GST :");
    expect(html).not.toContain("Franchise");
    expect(html).not.toContain("Counter No:");
    expect(html).not.toContain("Cashier:");
    expect(html).not.toContain("Session No:");
    expect(html).not.toContain("Contact :");
  });
});
