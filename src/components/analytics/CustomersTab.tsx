"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatINR } from "@/lib/utils";
import type { AnalyticsSections } from "@/lib/api";
import { UserPlus, Users, Repeat, Percent } from "lucide-react";

type Props = { sections: AnalyticsSections | null };

/** Tab 4 — customer growth & loyalty: new, active, retention, top spenders. */
export default function CustomersTab({ sections }: Props) {
  const c = sections?.customers;
  const top = c?.top ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="py-0 border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between"><span className="text-[11px] text-primary uppercase font-medium">New</span><UserPlus className="w-4 h-4 text-primary" /></div>
            <div className="text-xl font-black mt-1 text-primary">{c?.newCount ?? 0}</div>
            <div className="text-[11px] text-muted-foreground">first order in period</div>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-3">
            <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground uppercase font-medium">Active</span><Users className="w-4 h-4 text-muted-foreground" /></div>
            <div className="text-xl font-black mt-1">{c?.activeCount ?? 0}</div>
            <div className="text-[11px] text-muted-foreground">ordered in period</div>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-3">
            <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground uppercase font-medium">Repeat</span><Repeat className="w-4 h-4 text-muted-foreground" /></div>
            <div className="text-xl font-black mt-1">{c?.repeatCount ?? 0}</div>
            <div className="text-[11px] text-muted-foreground">2+ lifetime orders</div>
          </CardContent>
        </Card>
        <Card className="py-0 border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between"><span className="text-[11px] text-primary uppercase font-medium">Retention</span><Percent className="w-4 h-4 text-primary" /></div>
            <div className="text-xl font-black mt-1 text-primary">{c?.retentionPct ?? 0}%</div>
            <div className="text-[11px] text-muted-foreground">repeat / active</div>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-3">
            <div className="text-[11px] text-muted-foreground uppercase font-medium">Avg / Customer</div>
            <div className="text-sm font-black mt-1">{formatINR(c?.avgCustomerValue ?? 0)}</div>
            <div className="text-[11px] text-muted-foreground">revenue / active</div>
          </CardContent>
        </Card>
      </div>

      <Card className="py-0 overflow-hidden">
        <CardHeader className="py-3 border-b flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Top Customers</CardTitle>
          <Badge variant="outline" className="text-xs">this shop's spend</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {top.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No customers yet</div> : (
            <Table>
              <TableHeader>
                      <TableRow><TableHead>#</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Orders</TableHead><TableHead className="text-right">Spent (shop)</TableHead><TableHead className="text-right">Due</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {top.map((t, idx) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold">{t.name}</div>
                      {t.phone && <div className="text-[11px] text-muted-foreground font-mono">{t.phone}</div>}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono">{t.totalOrders}</TableCell>
                    <TableCell className="text-right text-xs font-bold">{formatINR(t.totalSpent)}</TableCell>
                    <TableCell className={`text-right text-xs font-bold ${t.balance > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {t.balance > 0 ? formatINR(t.balance) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <div className="text-[11px] text-muted-foreground text-center pb-2">
        Spend & orders counted in this shop only • dues show the full outstanding balance
      </div>
    </div>
  );
}
