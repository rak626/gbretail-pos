"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatINR } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Delta, COLORS, PAY_COLORS } from "@/components/analytics/shared";
import {
  ShoppingBag, Receipt, Tag, IndianRupee, TrendingUp, TrendingDown, BarChart3, PieChart as PieIcon, Layers, Package, AlertTriangle, Truck, Clock, Users, TrendingUp as TrendUp,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";

type Props = {
  data: any;
  topN: number;
  setTopN: (v: number) => void;
  topSort: "qty" | "revenue";
  setTopSort: (v: "qty" | "revenue") => void;
  granularity: string;
  setGranularity: (v: string) => void;
  onCategoryDrilldown?: (category: string) => void;
};

/** KPI card with large number, small delta, and sub-label. */
function KpiCard({
  title, value, sub, icon, color = "text-primary", deltaValue, deltaLabel = "vs prev",
}: {
  title: string; value: string | number; sub?: string; icon: React.ElementType;
  color?: string; deltaValue?: number | null; deltaLabel?: string;
}) {
  const Icon = icon;
  const up = deltaValue != null && deltaValue > 0;
  const down = deltaValue != null && deltaValue < 0;
  const deltaColor = up ? "text-primary" : down ? "text-destructive" : "text-muted-foreground";
  return (
    <Card className="py-0 border-transparent hover:border-primary/20 transition-colors">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase font-medium">{title}</span>
            <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: "currentColor", opacity: 0.4 }} />
          </div>
          <Badge variant="outline" className="text-[10px] h-6 px-2">{deltaLabel}</Badge>
        </div>
        <div className="text-2xl font-black leading-none mt-0.5 {color}">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
        {deltaValue != null && !isNaN(deltaValue) && (
          <div className="mt-1">
            <Delta value={deltaValue} />
            <span className={`text-[10px] text-muted-foreground ${deltaValue == null ? "invisible" : ""}`}>{deltaLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Small stat chip for inventory/ops. */
function StatChip({ label, value, status = "neutral", icon, subText }: { label: string; value: string | number; status?: "neutral" | "good" | "warn" | "bad"; icon: React.ElementType; subText?: string }) {
  const Icon = icon;
  const variant = status === "good" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
    status === "warn" ? "bg-amber-50 text-amber-700 border-amber-100" :
    status === "bad" ? "bg-destructive/50 text-destructive border-destructive/100" :
    "bg-muted text-muted-foreground border-border";
  return (
    <div className={`flex flex-col gap-0.5 px-3 py-2 rounded-lg border text-xs ${variant}`}>
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ opacity: 0.6 }} />
        <div>
          <div className="text-[10px] text-muted-foreground uppercase font-medium">{label}</div>
          <div className="text-sm font-bold">{value}</div>
        </div>
      </div>
      {subText && <div className="text-[9px] text-muted-foreground/70">{subText}</div>}
    </div>
  );
}

export default function ProductsTab({ data, topN, setTopN, topSort, setTopSort, granularity, setGranularity, onCategoryDrilldown }: Props) {
  const kpis = data?.kpis;
  const inventory = data?.inventory;
  const customers = data?.customers;
  const operations = data?.operations;
  const timeseries = data?.timeseries ?? [];
  const categories = data?.categories ?? [];
  const topProducts = data?.topByRevenue ?? [];
  const topByQty = data?.topProducts ?? [];
  const displayTop = topSort === "qty" ? topByQty : topProducts;
  const slowMovers = inventory?.slowMovers ?? [];
  const [drillCategory, setDrillCategory] = useState<string | null>(null);

  const handleCategoryClick = (cat: string) => {
    setDrillCategory(cat);
    onCategoryDrilldown?.(cat);
  };

  return (
    <div className="space-y-4">
      {/* Drill-down banner */}
      {drillCategory && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium">Viewing category: <span className="font-bold">{drillCategory}</span></span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setDrillCategory(null)}>Clear</Button>
          </CardContent>
        </Card>
      )}

      {/* KPI row — 6 most important metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <KpiCard title="Orders" value={kpis?.orders ?? 0} icon={ShoppingBag} deltaValue={kpis?.delta?.orders} />
        <KpiCard title="Net Revenue" value={formatINR(kpis?.netRevenue ?? 0)} sub="after discount" icon={IndianRupee} color="text-primary" deltaValue={kpis?.delta?.netRevenue} />
        <KpiCard title="Gross" value={formatINR(kpis?.gross ?? 0)} sub="before discount" icon={Receipt} color="text-muted-foreground" deltaValue={kpis?.delta?.gross} />
        <KpiCard title="Profit" value={formatINR(kpis?.profit ?? 0)} sub={kpis?.marginPct != null ? `margin ${kpis.marginPct.toFixed(1)}%` : ""} icon={TrendingUp} color={kpis?.profit ?? 0 >= 0 ? "text-primary" : "text-destructive"} deltaValue={kpis?.delta?.profit} />
        <KpiCard title="Discount" value={formatINR(kpis?.discount ?? 0)} sub={kpis?.gross ? ((kpis.discount / kpis.gross) * 100).toFixed(1) + "% of gross" : ""} icon={Tag} color="text-amber-700" deltaValue={null} />
        <KpiCard title="AOV" value={formatINR(kpis?.avgOrderValue ?? 0)} sub="net / orders" icon={ShoppingBag} color="text-muted-foreground" deltaValue={null} />
      </div>

      {/* Inventory health section */}
      <Card className="py-0 overflow-hidden">
        <CardHeader className="py-3 border-b flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Inventory Health</CardTitle>
          <Badge variant="outline" className="text-xs">{data?.range?.label}</Badge>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <StatChip label="Stock Value" value={formatINR(inventory?.stockValue ?? 0)} status="neutral" icon={Package} />
            <StatChip label="Out of Stock" value={inventory?.outOfStockCount ?? 0} status={inventory?.outOfStockCount ?? 0 > 0 ? "bad" : "good"} icon={AlertTriangle} />
            <StatChip label="Low Stock" value={inventory?.lowStockCount ?? 0} status={inventory?.lowStockCount ?? 0 > 0 ? "warn" : "good"} icon={Truck} />
            <StatChip label="Dead Stock" value={inventory?.deadStockCount ?? 0} status={inventory?.deadStockCount ?? 0 > 0 ? "bad" : "good"} icon={Clock} subText={formatINR(inventory?.deadStockValue ?? 0)} />
            <StatChip label="Stock-out Rate" value={((inventory?.stockOutRate ?? 0) as number).toFixed(1) + "%"} status={(inventory?.stockOutRate ?? 0) > 20 ? "bad" : (inventory?.stockOutRate ?? 0) > 5 ? "warn" : "good"} icon={AlertTriangle} />
          </div>

          {slowMovers.length > 0 && (
            <div className="mt-2 border-t pt-2">
              <div className="text-[10px] text-muted-foreground uppercase font-medium mb-1.5">Slow Movers (bottom by qty sold)</div>
              <div className="max-h-[160px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">Product</TableHead>
                      <TableHead className="text-right">Qty Sold</TableHead>
                      <TableHead className="text-right">Stock Left</TableHead>
                      <TableHead className="text-right">Stock Value</TableHead>
                      <TableHead className="text-right">Sell-through</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slowMovers.map((p: any, idx: number) => (
                      <TableRow key={p.name + idx}>
                        <TableCell className="text-xs font-medium">{p.name}</TableCell>
                        <TableCell className="text-right text-xs font-mono">{p.qty}</TableCell>
                        <TableCell className={`text-right text-xs font-mono ${p.stock === 0 ? "text-destructive" : ""}`}>{p.stock}</TableCell>
                        <TableCell className="text-right text-xs">{formatINR(p.stockValue)}</TableCell>
                        <TableCell className="text-right text-xs">{p.sellThroughRate.toFixed(0)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer value section */}
      <Card className="py-0 overflow-hidden">
        <CardHeader className="py-3 border-b flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Customer Value</CardTitle>
          <Badge variant="outline" className="text-xs">Lifetime</Badge>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <StatChip label="Total Customers" value={customers?.totalCustomers ?? 0} status="neutral" icon={Users} />
            <StatChip label="With Orders" value={customers?.customersWithOrders ?? 0} status="good" icon={ShoppingBag} />
            <StatChip label="Repeat Rate" value={((customers?.repeatPurchaseRate ?? 0) as number).toFixed(1) + "%"} status={(customers?.repeatPurchaseRate ?? 0) > 30 ? "good" : (customers?.repeatPurchaseRate ?? 0) > 10 ? "warn" : "bad"} icon={TrendUp} />
            <StatChip label="CLV" value={formatINR(customers?.customerLifetimeValue ?? 0)} status="neutral" icon={IndianRupee} />
            <StatChip label="Cohort Retention" value={((customers?.cohortRetentionPct ?? 0) as number).toFixed(1) + "%"} status={(customers?.cohortRetentionPct ?? 0) > 40 ? "good" : (customers?.cohortRetentionPct ?? 0) > 20 ? "warn" : "bad"} icon={Users} />
          </div>
        </CardContent>
      </Card>

      {/* Operational insights */}
      <Card className="py-0 overflow-hidden">
        <CardHeader className="py-3 border-b flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Operational Insights</CardTitle>
          <Badge variant="outline" className="text-xs">Patterns</Badge>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <StatChip label="Peak Hour" value={operations?.peakHour != null ? `${operations.peakHour}:00` : "—"} status="neutral" icon={Clock} />
            <StatChip label="Peak Day" value={operations?.peakDay ?? "—"} status="neutral" icon={Clock} />
            <StatChip label="Basket Size" value={((operations?.basketSize ?? 0) as number).toFixed(1) + " items"} status="neutral" icon={ShoppingBag} />
            <StatChip label="Discount Rate" value={((operations?.discountRate ?? 0) as number).toFixed(1) + "%"} status={(operations?.discountRate ?? 0) > 15 ? "bad" : (operations?.discountRate ?? 0) > 5 ? "warn" : "good"} icon={Tag} />
          </div>
        </CardContent>
      </Card>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2 py-0 overflow-hidden">
          <CardHeader className="py-3 border-b flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Revenue & Profit Over Time</CardTitle>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-xs">{data?.range?.label}</Badge>
              <Select value={granularity} onValueChange={(v: string | null) => setGranularity(v ?? "auto")}>
                <SelectTrigger className="h-7 w-[100px] text-xs"><SelectValue placeholder="Auto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="hour">Hourly</SelectItem>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-2 h-[320px]">
            {timeseries.length === 0 ? <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No sales in period</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeseries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="label" tick={{fontSize:11}} interval="preserveStartEnd" />
                  <YAxis tick={{fontSize:11}} tickFormatter={(v)=>`₹${v}`} />
                  <Tooltip formatter={(value: any, name: any)=>[typeof value==='number'?formatINR(value as number):value, name as string]} />
                  <Legend />
                  <Area type="monotone" dataKey="gross" name="Gross" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1} strokeWidth={2} />
                  <Area type="monotone" dataKey="netRevenue" name="Net Revenue" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#16a34a" fill="#16a34a" fillOpacity={0.2} strokeWidth={2} />
                  {timeseries.some((d: any) => Number(d.loss) > 0) && (
                    <Area type="monotone" dataKey="loss" name="Loss" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="py-0 overflow-hidden">
          <CardHeader className="py-3 border-b"><CardTitle className="text-sm flex items-center gap-2"><PieIcon className="w-4 h-4 text-primary" /> Payment Split</CardTitle></CardHeader>
          <CardContent className="p-2 h-[320px] flex flex-col">
            {(() => {
              const pieData = [
                { name: "Cash", value: data?.paymentSplit?.cash ?? 0 },
                { name: "UPI", value: data?.paymentSplit?.upi ?? 0 },
                { name: "Khata", value: data?.paymentSplit?.khata ?? 0 },
                { name: "Split", value: data?.paymentSplit?.split ?? 0 },
              ].filter(d=>d.value>0);
              if (pieData.length===0) return <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">No payments</div>;
              return (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                        {pieData.map((e,i)=>(<Cell key={e.name} fill={PAY_COLORS[e.name.toLowerCase()] ?? COLORS[i%COLORS.length]} />))}
                        <Tooltip formatter={(v:any)=>formatINR(v)} />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {pieData.map(d=>(
                      <div key={d.name} className="flex items-center justify-between rounded-lg border p-2 text-xs">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{background:PAY_COLORS[d.name.toLowerCase()]}} />{d.name}</span>
                        <span className="font-bold">{formatINR(d.value)}</span>
                      </div>
                    ))}
                  </div>
                  {(Number((data as any)?.tender?.splitCash) > 0 || Number((data as any)?.tender?.splitUpi) > 0) && (
                    <div className="mt-2 rounded-lg border border-dashed p-2 text-xs text-muted-foreground flex items-center justify-between">
                      <span>Split tender — drawer tally</span>
                      <span className="font-bold text-foreground">{formatINR(Number((data as any).tender.splitCash))} cash + {formatINR(Number((data as any).tender.splitUpi))} UPI</span>
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Categories + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="py-0 overflow-hidden">
          <CardHeader className="py-3 border-b flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> Category Wise</CardTitle>
            <Badge variant="secondary" className="text-xs">{categories.length} cats</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {categories.length===0 ? <div className="p-8 text-center text-sm text-muted-foreground">No category sales</div> : (
              <>
                <div className="h-[260px] p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categories} layout="vertical" margin={{left:20}}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis type="number" tick={{fontSize:11}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="category" tick={{fontSize:11}} width={90} />
                      <Tooltip formatter={(v: any)=>formatINR(v as number)} />
                      <Bar dataKey="netRevenue" name="Net Revenue" fill="#2563eb" radius={[0,6,6,0]} />
                      <Bar dataKey="profit" name="Profit" fill="#16a34a" radius={[0,6,6,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="max-h-[200px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Category</TableHead><TableHead className="text-right">Net</TableHead><TableHead className="text-right">Profit</TableHead><TableHead className="text-right">Margin</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((c: any)=>(
                        <TableRow key={c.category} onClick={() => handleCategoryClick(c.category)} className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <TableCell className="text-xs font-medium">{c.category}</TableCell>
                          <TableCell className="text-right text-xs font-bold">{formatINR(c.netRevenue)}</TableCell>
                          <TableCell className={`text-right text-xs font-bold ${c.profit>=0?"text-primary":"text-destructive"}`}>{formatINR(c.profit)}</TableCell>
                          <TableCell className="text-right text-xs">{c.marginPct.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="py-0 overflow-hidden">
          <CardHeader className="py-3 border-b flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Top {topN} Products</CardTitle>
            <div className="flex items-center gap-1.5">
              <Select value={String(topN)} onValueChange={(v: string | null) => setTopN(Number(v))}>
                <SelectTrigger className="h-6 w-[76px] text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Top 5</SelectItem>
                  <SelectItem value="10">Top 10</SelectItem>
                  <SelectItem value="20">Top 20</SelectItem>
                  <SelectItem value="50">Top 50</SelectItem>
                </SelectContent>
              </Select>
              <Button variant={topSort==="qty"?"secondary":"ghost"} size="sm" className="h-6 text-[11px] px-2" onClick={()=>setTopSort("qty")}>Qty</Button>
              <Button variant={topSort==="revenue"?"secondary":"ghost"} size="sm" className="h-6 text-[11px] px-2" onClick={()=>setTopSort("revenue")}>Revenue</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {displayTop.length===0 ? <div className="p-8 text-center text-sm text-muted-foreground">No sales</div> : (
              <>
                <div className="h-[240px] p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={displayTop.slice(0,10)} layout="vertical" margin={{left:20}}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis type="number" tick={{fontSize:11}} />
                      <YAxis type="category" dataKey="name" tick={{fontSize:10}} width={100} tickFormatter={(v:string)=>v.length>14?v.slice(0,14)+"…":v} />
                      <Tooltip formatter={(v: any, n: any)=>[n==="qty"?v:formatINR(v as number), n as string]} />
                      <Bar dataKey={topSort==="qty"?"qty":"gross"} name={topSort==="qty"?"Qty":"Revenue"} fill={topSort==="qty"?"#16a34a":"#2563eb"} radius={[0,6,6,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="max-h-[200px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>#</TableHead><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Profit</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayTop.map((p: any, idx: number)=>(
                        <TableRow key={p.name+idx} className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <TableCell className="text-xs text-muted-foreground">{idx+1}</TableCell>
                          <TableCell>
                            <div className="text-xs font-medium leading-tight truncate max-w-[160px]">{p.name}</div>
                            <div className="text-[10px] text-muted-foreground">{p.category}</div>
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">{p.qty}</TableCell>
                          <TableCell className="text-right text-xs font-bold">{formatINR(p.gross)}</TableCell>
                          <TableCell className={`text-right text-xs font-bold ${p.profit>=0?"text-primary":"text-destructive"}`}>{formatINR(p.profit)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="text-[11px] text-muted-foreground text-center pb-2">
        Gross = before discount • Net = after discount • Profit = (sell-buy)*qty - allocated discount • Loss = |negative profit|
      </div>
    </div>
  );
}