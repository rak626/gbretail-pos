import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { orders: { orderBy: { createdAt: "desc" }, take: 10, include: { items: true } } },
    });
    if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ customer });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const customer = await prisma.customer.update({ where: { id }, data: body });
    return NextResponse.json({ customer });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
