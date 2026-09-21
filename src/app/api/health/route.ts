import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { status: "error", db: "disconnected", error: e instanceof Error ? e.message : "unknown", timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
