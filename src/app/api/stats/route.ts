import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [todayOrders, totalOrders, totalRevenueAgg, customersCount, lowStock] = await Promise.all([
      prisma.order.findMany({ where: { createdAt: { gte: todayStart, lte: todayEnd } }, select: { total: true, paymentMethod: true } }),
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { total: true } }),
      prisma.customer.count(),
      prisma.product.findMany({ where: { stockQuantity: { lt: 10 } }, select: { id: true, name: true, stockQuantity: true }, take: 5 }),
    ]);

    const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);
    const todayByPayment: Record<string, number> = {};
    for (const o of todayOrders) todayByPayment[o.paymentMethod] = (todayByPayment[o.paymentMethod] ?? 0) + o.total;

    return NextResponse.json({
      today: { orders: todayOrders.length, revenue: todayRevenue, byPayment: todayByPayment },
      total: { orders: totalOrders, revenue: totalRevenueAgg._sum.total ?? 0, customers: customersCount },
      lowStock,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed", today: { orders: 0, revenue: 0, byPayment: {} }, total: { orders: 0, revenue: 0, customers: 0 }, lowStock: [] }, { status: 500 });
  }
}
