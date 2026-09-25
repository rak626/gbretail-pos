"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatINR } from "@/lib/utils";
import { Wallet, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell } from "recharts";

type Props = { ledger: any; defaulters: { id: string; name: string; phone: string | null; balance: number; totalOrders: number }[] };

/** Tab 5 — Khata: collection health, ageing, created-vs-settled, top defaulters. */
export default function LedgerTab({ ledger, defaulters }: Props) {
  return (
    <div className="space-y-4">
      <Card className="py-0 overflow-hidden">
        <CardHeader className="py-3 border-b flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /> Ledger Analytics</CardTitle>
          <Badge variant="outline" className="text-xs">Khata</Badge>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="py-0 bg-muted/20"><CardContent className="p-2.5"><div className="text-[11px] text-muted-foreground uppercase">Created</div><div className="text-sm font-black">{ledger?.created?.count ?? 0} • {formatINR(ledger?.created?.amount ?? 0)}</div></CardContent></Card>
            <Card className="py-0 bg-primary/5 border-primary/20 dark:bg-primary/10"><CardContent className="p-2.5"><div className="text-[11px] text-primary uppercase">Settled</div><div className="text-sm font-black text-primary">{ledger?.settled?.count ?? 0} • {formatINR(ledger?.settled?.amount ?? 0)}</div></CardContent></Card>
            <Card className="py-0 border-amber-200 bg-amber-50/40"><CardContent className="p-2.5"><div className="text-[11px] text-amber-700 uppercase">Pending</div><div className="text-sm font-black text-amber-700">{ledger?.pending?.count ?? 0} • {formatINR(ledger?.pending?.amount ?? 0)}</div></CardContent></Card>
            <Card className="py-0 border-destructive/20 bg-destructive/5"><CardContent className="p-2.5"><div className="text-[11px] text-destructive uppercase">Overdue</div><div className="text-sm font-black text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{ledger?.overdue?.count ?? 0} • {formatINR(ledger?.overdue?.amount ?? 0)}</div></CardContent></Card>
            <Card className="py-0"><CardContent className="p-2.5"><div className="text-[11px] text-muted-foreground uppercase">Collection</div><div className="text-sm font-black">{ledger?.collectionRate ?? 0}%</div><div className="text-[11px] text-muted-foreground">Avg {ledger?.avgDaysToSettle ?? "—"} days</div></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="h-[220px] border rounded-lg p-2">
              <div className="text-xs font-semibold mb-1">Created vs Settled</div>
              {ledger?.timeseries?.length ? (
                <ResponsiveContainer width="100%" height="90%">
                  <AreaChart data={ledger.timeseries}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="label" tick={{fontSize:10}} interval="preserveStartEnd" />
                    <YAxis tick={{fontSize:10}} tickFormatter={v=>`₹${v}`} />
                    <Tooltip formatter={(v:any)=>formatINR(v as number)} />
                    <Legend />
                    <Area type="monotone" dataKey="created" name="Created" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} />
                    <Area type="monotone" dataKey="settled" name="Settled" stroke="#16a34a" fill="#16a34a" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No ledger activity</div>}
            </div>
            <div className="h-[220px] border rounded-lg p-2">
              <div className="text-xs font-semibold mb-1">Ageing — Pending (fast)</div>
              {ledger?.aging?.length ? (
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={ledger.aging}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="bucket" tick={{fontSize:11}} />
                    <YAxis tick={{fontSize:10}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v:any)=>formatINR(v as number)} />
                    <Bar dataKey="amount" name="Amount" radius={[6,6,0,0]}>
                      {ledger.aging.map((e:any,i:number)=>(<Cell key={e.bucket} fill={e.bucket==="0-7"?"#f59e0b":e.bucket==="7-15"?"#f97316":e.bucket==="15-30"?"#ef4444":e.bucket==="30-60"?"#dc2626":"#7f1d1d"} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No pending ageing</div>}
              <div className="flex flex-wrap gap-1.5 mt-1">
                {ledger?.aging?.map((a:any)=>(
                  <Badge key={a.bucket} variant="outline" className="text-[11px]">{a.bucket}: {a.count} • {formatINR(a.amount)}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="py-0 overflow-hidden">
        <CardHeader className="py-3 border-b flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" /> Top Defaulters</CardTitle>
          <Badge variant="outline" className="text-xs">by due balance</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {defaulters.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No dues outstanding 🎉</div> : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>#</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Orders</TableHead><TableHead className="text-right">Due Balance</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {defaulters.map((d, idx) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold">{d.name}</div>
                      {d.phone && <div className="text-[11px] text-muted-foreground font-mono">{d.phone}</div>}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono">{d.totalOrders}</TableCell>
                    <TableCell className="text-right text-xs font-bold text-destructive">{formatINR(d.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="text-[11px] text-muted-foreground text-center pb-2">
        Ledger ageing in days from due date
      </div>
    </div>
  );
}
