import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = await prisma.order.count({ where: { createdAt: { gte: today } } });
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const seq = String(count + 1).padStart(3, "0");
    return NextResponse.json({ orderNumber: `ORD-${yyyy}${mm}${dd}-${seq}`, count });
  } catch {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
    return NextResponse.json({ orderNumber: `ORD-${yyyy}${mm}${dd}-${rnd}`, count: 0, fallback: true });
  }
}
