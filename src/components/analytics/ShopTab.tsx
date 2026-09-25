"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatINR } from "@/lib/utils";
import type { AnalyticsSections } from "@/lib/api";
import { Store, Monitor } from "lucide-react";

type Props = { sections: AnalyticsSections | null; isSuper: boolean };

/** Tab 2 — shop performance: per-counter (owner) or per-shop compare (super admin). */
export default function ShopTab({ sections, isSuper }: Props) {
  if (isSuper) {
    const shops = sections?.shops ?? [];
    const totalOrders = shops.reduce((s, x) => s + x.orders, 0);
    const totalRevenue = shops.reduce((s, x) => s + x.revenue, 0);
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="py-0"><CardContent className="p-3"><div className="text-[11px] text-muted-foreground uppercase font-medium">Shops</div><div className="text-xl font-black mt-1">{shops.length}</div></CardContent></Card>
          <Card className="py-0"><CardContent className="p-3"><div className="text-[11px] text-muted-foreground uppercase font-medium">Total Orders</div><div className="text-xl font-black mt-1">{totalOrders}</div></CardContent></Card>
          <Card className="py-0 border-primary/20 bg-primary/5"><CardContent className="p-3"><div className="text-[11px] text-primary uppercase font-medium">Total Revenue</div><div className="text-sm font-black mt-1 text-primary">{formatINR(totalRevenue)}</div></CardContent></Card>
          <Card className="py-0"><CardContent className="p-3"><div className="text-[11px] text-muted-foreground uppercase font-medium">Avg / Shop</div><div className="text-sm font-black mt-1">{formatINR(shops.length ? totalRevenue / shops.length : 0)}</div></CardContent></Card>
        </div>
        <Card className="py-0 overflow-hidden">
          <CardHeader className="py-3 border-b flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Store className="w-4 h-4 text-primary" /> Shop Comparison</CardTitle>
            <Badge variant="outline" className="text-xs">{sections?.range?.label}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {shops.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No shops</div> : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Shop</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Orders</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Avg Bill</TableHead><TableHead className="text-right">Share</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {[...shops].sort((a, b) => b.revenue - a.revenue).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs font-semibold">{s.name}</TableCell>
                      <TableCell>{s.isActive ? <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">Active</Badge> : <Badge variant="secondary" className="text-[10px]">Disabled</Badge>}</TableCell>
                      <TableCell className="text-right text-xs font-mono">{s.orders}</TableCell>
                      <TableCell className="text-right text-xs font-bold">{formatINR(s.revenue)}</TableCell>
                      <TableCell className="text-right text-xs">{formatINR(s.avgBill)}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{totalRevenue ? ((s.revenue / totalRevenue) * 100).toFixed(1) : 0}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const counters = sections?.counters ?? [];
  const totalOrders = counters.reduce((s, x) => s + x.orders, 0);
  const totalRevenue = counters.reduce((s, x) => s + x.revenue, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="py-0"><CardContent className="p-3"><div className="text-[11px] text-muted-foreground uppercase font-medium">Counters</div><div className="text-xl font-black mt-1">{counters.length}</div></CardContent></Card>
        <Card className="py-0"><CardContent className="p-3"><div className="text-[11px] text-muted-foreground uppercase font-medium">Total Orders</div><div className="text-xl font-black mt-1">{totalOrders}</div></CardContent></Card>
        <Card className="py-0 border-primary/20 bg-primary/5"><CardContent className="p-3"><div className="text-[11px] text-primary uppercase font-medium">Total Revenue</div><div className="text-sm font-black mt-1 text-primary">{formatINR(totalRevenue)}</div></CardContent></Card>
        <Card className="py-0"><CardContent className="p-3"><div className="text-[11px] text-muted-foreground uppercase font-medium">Avg / Counter</div><div className="text-sm font-black mt-1">{formatINR(counters.length ? totalRevenue / counters.length : 0)}</div></CardContent></Card>
      </div>
      <Card className="py-0 overflow-hidden">
        <CardHeader className="py-3 border-b flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Monitor className="w-4 h-4 text-primary" /> Counter Performance</CardTitle>
          <Badge variant="outline" className="text-xs">{sections?.range?.label}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {counters.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No counters</div> : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Counter</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Orders</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Avg Bill</TableHead><TableHead className="text-right">Share</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {[...counters].sort((a, b) => b.revenue - a.revenue).map((ct) => (
                  <TableRow key={ct.id}>
                    <TableCell className="text-xs font-semibold">{ct.name}</TableCell>
                    <TableCell>{ct.isActive ? <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">Active</Badge> : <Badge variant="secondary" className="text-[10px]">Disabled</Badge>}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{ct.orders}</TableCell>
                    <TableCell className="text-right text-xs font-bold">{formatINR(ct.revenue)}</TableCell>
                    <TableCell className="text-right text-xs">{formatINR(ct.avgBill)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{totalRevenue ? ((ct.revenue / totalRevenue) * 100).toFixed(1) : 0}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
