"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatINR } from "@/lib/utils";
import type { AnalyticsSections } from "@/lib/api";
import { Users } from "lucide-react";

type Props = { sections: AnalyticsSections | null; isSuper: boolean };

/** Tab 3 — people performance: staff (owner view) or owners (super admin view). */
export default function StaffTab({ sections, isSuper }: Props) {
  const rows = sections?.staff ?? [];
  const totalOrders = rows.reduce((s, x) => s + x.orders, 0);
  const totalRevenue = rows.reduce((s, x) => s + x.revenue, 0);
  const totalUnits = rows.reduce((s, x) => s + x.units, 0);
  const label = isSuper ? "Owners" : "Staff";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="py-0"><CardContent className="p-3"><div className="text-[11px] text-muted-foreground uppercase font-medium">{label}</div><div className="text-xl font-black mt-1">{rows.length}</div></CardContent></Card>
        <Card className="py-0"><CardContent className="p-3"><div className="text-[11px] text-muted-foreground uppercase font-medium">Bills</div><div className="text-xl font-black mt-1">{totalOrders}</div></CardContent></Card>
        <Card className="py-0 border-primary/20 bg-primary/5"><CardContent className="p-3"><div className="text-[11px] text-primary uppercase font-medium">Revenue</div><div className="text-sm font-black mt-1 text-primary">{formatINR(totalRevenue)}</div></CardContent></Card>
        <Card className="py-0"><CardContent className="p-3"><div className="text-[11px] text-muted-foreground uppercase font-medium">Units Sold</div><div className="text-xl font-black mt-1">{totalUnits}</div></CardContent></Card>
      </div>
      <Card className="py-0 overflow-hidden">
        <CardHeader className="py-3 border-b flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> {isSuper ? "Owner Performance (per shop)" : "Staff Performance"}</CardTitle>
          <Badge variant="outline" className="text-xs">{sections?.range?.label}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No {label.toLowerCase()} found</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  {isSuper && <TableHead>Shop</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Bills</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Avg Bill</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...rows].sort((a, b) => b.revenue - a.revenue).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="text-xs font-semibold">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground">{p.role}</div>
                    </TableCell>
                    {isSuper && <TableCell className="text-xs">{p.shopName ?? "—"}</TableCell>}
                    <TableCell>{p.isActive ? <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">Active</Badge> : <Badge variant="destructive" className="text-[10px]">Disabled</Badge>}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{p.orders}</TableCell>
                    <TableCell className="text-right text-xs font-bold">{formatINR(p.revenue)}</TableCell>
                    <TableCell className="text-right text-xs">{formatINR(p.avgBill)}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{p.units}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{formatINR(p.discount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <div className="text-[11px] text-muted-foreground text-center pb-2">
        {isSuper ? "Each owner row reflects their whole shop in the selected period." : "Each row reflects bills personally rung up by that staff member."}
      </div>
    </div>
  );
}
