import { describe, it, expect } from "vitest";
import { productsToCsv, parseInventoryCsv } from "./inventoryCsv";
import type { Product } from "@/types";

function prod(over: Partial<Product>): Product {
  return {
    id: "p1",
    shopId: "s1",
    name: "Sugar",
    category: "Staples",
    is_loose: false,
    price: 28,
    costPrice: 21,
    stockQuantity: 50,
    lowStockThreshold: 10,
    unit: "pcs",
    ...over,
  } as Product;
}

describe("productsToCsv", () => {
  it("escapes quotes and formula-injection cells", () => {
    const csv = productsToCsv([prod({ name: "=CMD|'/c calc'!A0", category: "T" })], true);
    expect(csv).toContain("'=CMD");
    const quoted = productsToCsv([prod({ name: 'Say "hi", ok' })], false);
    expect(quoted).toContain('"Say ""hi"", ok"');
  });
  it("omits cost columns when includeCost=false", () => {
    const csv = productsToCsv([prod({})], false);
    expect(csv.split("\n")[0]).not.toContain("costPrice");
    expect(productsToCsv([prod({})], true).split("\n")[0]).toContain("costPrice");
  });
});

describe("parseInventoryCsv", () => {
  it("parses header + rows, skips nameless", () => {
    const { rows, errors } = parseInventoryCsv("name,category,price\nSugar,Staples,28\n,Staples,5\n");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe("Sugar");
    expect(errors.join()).toMatch(/missing name/);
  });
  it("rejects oversized files and caps 500 rows", () => {
    expect(parseInventoryCsv("x".repeat(1_000_001)).errors.join()).toMatch(/too large/);
    const big = "name\n" + Array.from({ length: 600 }, (_, i) => `P${i}`).join("\n");
    const { rows, errors } = parseInventoryCsv(big);
    expect(rows).toHaveLength(500);
    expect(errors.join()).toMatch(/500/);
  });
  it("requires header + body", () => {
    expect(parseInventoryCsv("name").errors).not.toHaveLength(0);
  });
});
