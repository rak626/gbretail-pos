import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase().trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);

  try {
    if (q) {
      const customers = await prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return NextResponse.json({ customers });
    }
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json({ customers });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error", customers: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, balance } = body;
    const trimmedName = String(name ?? "").trim();
    const trimmedPhone = phone ? String(phone).trim().replace(/\D/g, "").slice(0, 10) : null;

    if (!trimmedName) return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    if (trimmedPhone && !/^\d{10}$/.test(trimmedPhone)) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }

    if (trimmedPhone) {
      const existing = await prisma.customer.findUnique({ where: { phone: trimmedPhone } });
      if (existing) return NextResponse.json({ error: "Customer with this phone already exists", customer: existing }, { status: 409 });
    }

    const customer = await prisma.customer.create({
      data: {
        name: trimmedName,
        phone: trimmedPhone || null,
        balance: balance != null ? Number(balance) : 0,
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create customer";
    if (msg.includes("DATABASE_URL") || msg.includes("connect")) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
