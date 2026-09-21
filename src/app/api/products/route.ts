import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { products as staticProducts } from "@/data/products";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase() ?? "";
  const category = searchParams.get("category") ?? "All";
  const limit = parseInt(searchParams.get("limit") ?? "100", 10);

  try {
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" as const } },
        { barcode: { contains: search } },
      ];
    }
    if (category && category !== "All") {
      if (category === "Loose Items") {
        (where as Record<string, unknown>).is_loose = true;
      } else {
        (where as Record<string, unknown>).category = category;
      }
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      take: Math.min(limit, 200),
    });

    return NextResponse.json({ products, source: "db" });
  } catch (e) {
    console.warn("[API /products] DB fallback to static:", e instanceof Error ? e.message : e);
    let filtered = staticProducts as unknown as Array<Record<string, unknown>>;
    if (search) {
      filtered = filtered.filter(
        (p) =>
          String(p.name).toLowerCase().includes(search) ||
          String(p.barcode ?? "").includes(search)
      );
    }
    if (category && category !== "All") {
      if (category === "Loose Items") filtered = filtered.filter((p) => p.is_loose);
      else filtered = filtered.filter((p) => p.category === category);
    }
    return NextResponse.json({ products: filtered.slice(0, limit), source: "static" });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, is_loose, rate_per_kg, barcode, price, unit, category, preset_weights, preset_prices, stockQuantity } = body;

    if (!name || !category) {
      return NextResponse.json({ error: "name and category required" }, { status: 400 });
    }

    if (barcode) {
      const existing = await prisma.product.findUnique({ where: { barcode } });
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: "Barcode already exists" }, { status: 409 });
      }
    }

    const data = {
      name: String(name).trim(),
      is_loose: Boolean(is_loose),
      rate_per_kg: rate_per_kg != null ? Number(rate_per_kg) : null,
      barcode: barcode ? String(barcode).trim() : null,
      price: price != null ? Number(price) : null,
      unit: unit ? String(unit) : "pcs",
      category: String(category),
      preset_weights: Array.isArray(preset_weights) ? preset_weights.map(Number) : [],
      preset_prices: Array.isArray(preset_prices) ? preset_prices.map(Number) : [],
      stockQuantity: stockQuantity != null ? Number(stockQuantity) : 100,
    };

    let product;
    if (id) {
      product = await prisma.product.upsert({
        where: { id },
        update: data,
        create: { id, ...data },
      });
    } else {
      product = await prisma.product.create({ data });
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (e) {
    console.error("[API POST /products]", e);
    const msg = e instanceof Error ? e.message : "Failed to create product";
    if (msg.includes("DATABASE_URL") || msg.includes("connect")) {
      return NextResponse.json({ error: "Database not configured. Set DATABASE_URL" }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
