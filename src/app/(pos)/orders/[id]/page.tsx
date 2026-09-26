"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { formatINR } from "@/lib/utils";
import { generateReceiptHTML, printReceiptHTML } from "@/lib/print";
import { useReceiptShop } from "@/hooks/useReceiptShop";
import { ArrowLeft, Calendar, User, Phone, CreditCard, ShoppingBag, Printer, Receipt } from "lucide-react";
import type { Order } from "@/db/database";
import { fetchOrder } from "@/lib/api";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [order, setOrder] = useState<(Order & { customer?: { name: string; phone: string | null; balance?: number } | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const receiptShop = useReceiptShop();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const o = await fetchOrder(id as string);
        setOrder(o as unknown as typeof order);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const handlePrint = () => {
    if (!order) return;
    const items = order.items.map((it) => ({
      name: it.name,
      qty: it.isCustom ? String(it.unit) : `${it.quantity ?? it.weight ?? 1}`,
      quantity: (it as any).quantity ?? null,
      weight: (it as any).weight ?? null,
      price: (it as any).price,
      perUnit: (it as any).isCustom ? (it as any).unit : (it as any).weight ? "kg" : (it as any).unit || "pcs",
      unit: (it as any).unit,
      isCustom: (it as any).isCustom,
      lineTotal: it.lineTotal,
    }));
    const customer = (order as unknown as { customer?: { name: string } }).customer;
    const custLabel = customer?.name || (order.customerId ? "Customer" : undefined);
    const t = order as unknown as { cashAmount?: number | null; upiAmount?: number | null };
    const label = order.paymentMethod === "split" && t.cashAmount != null && t.upiAmount != null
      ? `${custLabel ? `${custLabel} ` : ""}(Split: Cash ${formatINR(t.cashAmount)} + UPI ${formatINR(t.upiAmount)})`
      : custLabel;
    const html = generateReceiptHTML(items as any, order.total, order.discount || 0, label, (order as unknown as { orderNumber?: string }).orderNumber || order.id, receiptShop);
    printReceiptHTML(html);
  };

  return (
    <>
      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="flex items-center gap-2">
            <Link href="/orders"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4" /> Back to Orders</Button></Link>
            <h1 className="text-lg font-bold flex items-center gap-2"><Receipt className="w-5 h-5 text-primary" /> Order Detail</h1>
          </div>

          {loading ? (
            <Card className="py-10 text-center text-sm text-muted-foreground">Loading order…</Card>
          ) : error ? (
            <Card className="py-10 text-center">
              <div className="text-sm font-medium text-destructive">{error}</div>
              <Link href="/orders"><Button variant="outline" size="sm" className="mt-3">Back</Button></Link>
            </Card>
          ) : order ? (
            <>
              <Card className="py-0">
                <CardContent className="p-4 flex flex-wrap gap-3 items-center justify-between">
                  <div>
                    <div className="font-mono text-sm font-bold">{(order as unknown as { orderNumber?: string }).orderNumber || order.id}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(order.createdAt as unknown as string).toLocaleString("en-IN")}</div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={order.paymentMethod === "khata" ? "destructive" : order.paymentMethod === "upi" ? "default" : "secondary"} className="capitalize">{order.paymentMethod}</Badge>
                    <Badge variant="outline">{order.status}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="py-0">
                <CardContent className="p-3 flex flex-row items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border flex items-center justify-center text-primary"><User className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{(order as unknown as { customer?: { name: string } }).customer?.name || (order.customerId ? "Customer" : "Walk-in")}</div>
                    {(order as unknown as { customer?: { phone: string | null } }).customer?.phone && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {(order as unknown as { customer: { phone: string } }).customer.phone}</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="py-0 overflow-hidden">
                <div className="p-3 flex items-center gap-2 border-b bg-muted/10">
                  <ShoppingBag className="w-4 h-4 text-primary" /><span className="text-sm font-semibold">Items</span><Badge variant="secondary">{order.items.length}</Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">#</TableHead>
                      <TableHead className="text-xs">Product</TableHead>
                      <TableHead className="text-xs text-center">Qty</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs">{idx + 1}</TableCell>
                        <TableCell><div className="text-[13px] font-medium">{it.name}</div><div className="text-[11px] text-muted-foreground">{it.price ? formatINR(it.price) : ""} {it.unit}</div></TableCell>
                        <TableCell className="text-xs text-center font-mono">{it.quantity ?? it.weight ?? 1} {it.unit}</TableCell>
                        <TableCell className="text-right font-bold text-[13px]">{formatINR(it.lineTotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              <Card className="py-0 bg-muted/20">
                <CardContent className="p-3 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{formatINR(order.total + (order.discount || 0))}</span></div>
                  {(order.discount || 0) > 0 && <div className="flex justify-between text-primary"><span>Discount</span><span className="font-bold">- {formatINR(order.discount)}</span></div>}
                  <Separator />
                  <div className="flex justify-between items-center"><span className="font-bold flex items-center gap-1"><CreditCard className="w-4 h-4" /> Grand Total</span><span className="font-black text-lg text-primary">{formatINR(order.total)}</span></div>
                  <div className="flex justify-between text-xs text-muted-foreground"><span>Payment</span><span className="capitalize font-medium text-foreground">{order.paymentMethod}</span></div>
                  {(() => {
                    const t = order as unknown as { cashAmount?: number | null; upiAmount?: number | null };
                    return order.paymentMethod === "split" && t.cashAmount != null && t.upiAmount != null ? (
                      <div className="flex justify-between text-xs text-muted-foreground"><span>Tender</span><span className="font-medium text-foreground">{formatINR(t.cashAmount)} cash + {formatINR(t.upiAmount)} UPI</span></div>
                    ) : null;
                  })()}
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Link href="/orders" className="flex-1"><Button variant="outline" className="w-full h-10">Back</Button></Link>
                <Button className="flex-1 h-10" onClick={handlePrint}><Printer className="w-4 h-4" /> Print Receipt</Button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
