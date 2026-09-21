import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function generateOrderNumber(date = new Date()) {
  const d = date;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const time = Date.now().toString(36).toUpperCase().slice(-4);
  return `ORD-${yyyy}${mm}${dd}-${random}${time}`;
}

async function getNextOrderNumber() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const count = await prisma.order.count({
    where: { createdAt: { gte: today } },
  });
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const seq = String(count + 1).padStart(3, "0");
  return `ORD-${yyyy}${mm}${dd}-${seq}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10), 1);
  const customerId = searchParams.get("customerId");
  const paymentMethod = searchParams.get("paymentMethod");
  const search = searchParams.get("search")?.trim() ?? "";
  const date = searchParams.get("date"); // YYYY-MM-DD

  try {
    const where: Record<string, unknown> = {};
    if (customerId) where.customerId = customerId;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (search) where.orderNumber = { contains: search, mode: "insensitive" as const };
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true, customer: { select: { id: true, name: true, phone: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({ orders, total, page, limit });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to fetch orders", orders: [], total: 0 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, total, discount = 0, paymentMethod, customerId, customerName, customerPhone, status = "completed" } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Items required" }, { status: 400 });
    }
    if (typeof total !== "number" || total < 0) {
      return NextResponse.json({ error: "Valid total required" }, { status: 400 });
    }
    if (!paymentMethod || !["cash", "upi", "khata", "split"].includes(paymentMethod)) {
      return NextResponse.json({ error: "Invalid paymentMethod" }, { status: 400 });
    }

    const orderNumber = await getNextOrderNumber().catch(() => generateOrderNumber());

    let resolvedCustomerId = customerId ?? null;

    // Auto-create or resolve customer for khata/split if name provided
    if (!resolvedCustomerId && (customerName || customerPhone) && paymentMethod === "khata") {
      const phone = customerPhone ? String(customerPhone).trim().replace(/\D/g, "").slice(0, 10) : null;
      const name = customerName ? String(customerName).trim() : "Walk-in Customer";
      if (phone) {
        const existing = await prisma.customer.findUnique({ where: { phone } });
        if (existing) {
          resolvedCustomerId = existing.id;
          await prisma.customer.update({
            where: { id: existing.id },
            data: {
              balance: { increment: total },
              totalSpent: { increment: total },
              totalOrders: { increment: 1 },
              lastOrderAt: new Date(),
            },
          });
        } else {
          const c = await prisma.customer.create({
            data: {
              name,
              phone,
              balance: total,
              totalSpent: total,
              totalOrders: 1,
              lastOrderAt: new Date(),
            },
          });
          resolvedCustomerId = c.id;
        }
      } else if (name && name !== "Walk-in Customer") {
        const c = await prisma.customer.create({
          data: { name, balance: total, totalSpent: total, totalOrders: 1, lastOrderAt: new Date() },
        });
        resolvedCustomerId = c.id;
      }
    } else if (resolvedCustomerId) {
      // Update existing customer's stats
      try {
        await prisma.customer.update({
          where: { id: resolvedCustomerId },
          data: {
            totalSpent: { increment: total },
            totalOrders: { increment: 1 },
            lastOrderAt: new Date(),
            ...(paymentMethod === "khata" ? { balance: { increment: total } } : {}),
          },
        });
      } catch {
        // customer might not exist, ignore
      }
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        total: Number(total),
        discount: Number(discount),
        paymentMethod,
        customerId: resolvedCustomerId,
        status,
        items: {
          create: items.map((it: Record<string, unknown>) => ({
            productId: (it.productId as string) || null,
            name: String(it.name),
            price: Number(it.price),
            unit: String(it.unit ?? "pcs"),
            quantity: it.quantity != null ? Number(it.quantity) : null,
            weight: it.weight != null ? Number(it.weight) : null,
            lineTotal: Number(it.lineTotal),
            isCustom: Boolean(it.isCustom),
            costPrice: it.costPrice != null ? Number(it.costPrice) : null,
          })),
        },
      },
      include: { items: true, customer: true },
    });

    // Decrement stock for non-custom items
    for (const it of items) {
      if (!it.isCustom && it.productId) {
        try {
          const qty = Number(it.quantity ?? it.weight ?? 1);
          await prisma.product.update({
            where: { id: String(it.productId) },
            data: { stockQuantity: { decrement: qty } },
          });
        } catch {
          // ignore stock update failures
        }
      }
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (e) {
    console.error("[API POST /orders]", e);
    const msg = e instanceof Error ? e.message : "Failed to create order";
    if (msg.includes("DATABASE_URL") || msg.includes("connect") || msg.includes("Can't reach")) {
      return NextResponse.json({ error: "Database not configured. Set DATABASE_URL", code: "DB_NOT_CONFIGURED" }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
