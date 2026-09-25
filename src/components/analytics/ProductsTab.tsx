"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatINR } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Delta, COLORS, PAY_COLORS } from "@/components/analytics/shared";
import { ShoppingBag, Receipt, Tag, IndianRupee, TrendingUp, TrendingDown, BarChart3, PieChart as PieIcon, Layers, Package } from "lucide-react";
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
};

/** Tab 1 — product & sales performance (existing KPIs, charts, categories, top products). */
export default function ProductsTab({ data, topN, setTopN, topSort, setTopSort, granularity, setGranularity }: Props) {
  const kpis = data?.kpis;
  const timeseries = data?.timeseries ?? [];
  const categories = data?.categories ?? [];
  const topProducts = data?.topByRevenue ?? [];
  const topByQty = data?.topProducts ?? [];
  const displayTop = topSort === "qty" ? topByQty : topProducts;

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <Card className="py-0">
          <CardContent className="p-3">
            <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground uppercase font-medium">Orders</span><ShoppingBag className="w-4 h-4 text-muted-foreground" /></div>
            <div className="text-xl font-black leading-none mt-1">{kpis?.orders ?? 0}</div>
            <div className="text-[11px] invisible select-none" aria-hidden>·</div>
            <div className="mt-1"><Delta value={kpis?.delta?.orders} /> <span className={`text-[10px] text-muted-foreground ${kpis?.delta?.orders == null ? "invisible" : ""}`}>vs prev</span></div>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-3">
            <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground uppercase font-medium">Gross</span><Receipt className="w-4 h-4 text-muted-foreground" /></div>
            <div className="text-sm font-black leading-none mt-1">{formatINR(kpis?.gross ?? 0)}</div>
            <div className="text-[11px] text-muted-foreground">before discount</div>
            <div className="mt-1"><Delta value={kpis?.delta?.gross} /></div>
          </CardContent>
        </Card>
        <Card className="py-0 border-amber-200 bg-amber-50/30 dark:bg-amber-950/10">
          <CardContent className="p-3">
            <div className="flex items-center justify-between"><span className="text-[11px] text-amber-700 dark:text-amber-300 uppercase font-medium">Discount</span><Tag className="w-4 h-4 text-primary" /></div>
            <div className="text-sm font-black leading-none mt-1 text-amber-700">{formatINR(kpis?.discount ?? 0)}</div>
            <div className="text-[11px] text-muted-foreground">{kpis?.gross ? ((kpis.discount/kpis.gross)*100).toFixed(1):0}% of gross</div>
            <div className="mt-1"><Delta value={null} /></div>
          </CardContent>
        </Card>
        <Card className="py-0 border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between"><span className="text-[11px] text-primary uppercase font-medium">Net Revenue</span><IndianRupee className="w-4 h-4 text-primary" /></div>
            <div className="text-sm font-black leading-none mt-1 text-primary">{formatINR(kpis?.netRevenue ?? 0)}</div>
            <div className="text-[11px] text-muted-foreground">after discount</div>
            <div className="mt-1"><Delta value={kpis?.delta?.netRevenue} /></div>
          </CardContent>
        </Card>
        <Card className="py-0 border-primary/20 bg-primary/5/40 dark:bg-primary/10">
          <CardContent className="p-3">
            <div className="flex items-center justify-between"><span className="text-[11px] text-primary dark:text-primary uppercase font-medium">Profit</span><TrendingUp className="w-4 h-4 text-primary" /></div>
            <div className="text-sm font-black leading-none mt-1 text-primary">{formatINR(kpis?.profit ?? 0)}</div>
            <div className="text-[11px] text-muted-foreground">net = grossProfit - discount</div>
            <div className="mt-1"><Delta value={kpis?.delta?.profit} /></div>
          </CardContent>
        </Card>
        <Card className="py-0 border-destructive/20 bg-destructive/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between"><span className="text-[11px] text-destructive uppercase font-medium">Loss</span><TrendingDown className="w-4 h-4 text-destructive" /></div>
            <div className="text-sm font-black leading-none mt-1 text-destructive">{formatINR(kpis?.loss ?? 0)}</div>
            <div className="text-[11px] text-muted-foreground">where profit &lt;0</div>
            <div className="mt-1"><Delta value={null} /></div>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-3">
            <div className="text-[11px] text-muted-foreground uppercase font-medium">Margin</div>
            <div className="text-xl font-black leading-none mt-1">{(kpis?.marginPct ?? 0).toFixed(1)}%</div>
            <div className="text-[11px] text-muted-foreground">profit / net</div>
            <div className="mt-1"><Delta value={null} /></div>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-3">
            <div className="text-[11px] text-muted-foreground uppercase font-medium">AOV</div>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-3">
            <div className="text-[11px] text-muted-foreground uppercase font-medium">AOV</div>
            <div className="text-sm font-black leading-none mt-1">{formatINR(kpis?.avgOrderValue ?? 0)}</div>
            <div className="text-[11px] text-muted-foreground">net / orders</div>
            <div className="mt-1"><Delta value={null} /></div>
          </CardContent>
        </Card>
      </div>

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
          <CardContent className="p-2 h-[300px]">
            {timeseries.length === 0 ? <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No sales in period</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeseries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="label" tick={{fontSize:11}} interval="preserveStartEnd" />
                  <YAxis tick={{fontSize:11}} tickFormatter={(v)=>`₹${v}`} />
                  <Tooltip formatter={(value: any, name: any)=>[typeof value==='number'?formatINR(value as number):value, name as string]} />
                  <Legend />
                  <Area type="monotone" dataKey="gross" name="Gross" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.15} strokeWidth={2} />
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
          <CardContent className="p-2 h-[300px] flex flex-col">
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
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                        {pieData.map((e,i)=>(<Cell key={e.name} fill={PAY_COLORS[e.name.toLowerCase()] ?? COLORS[i%COLORS.length]} />))}
                      </Pie>
                      <Tooltip formatter={(v:any)=>formatINR(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {pieData.map(d=>(
                      <div key={d.name} className="flex items-center justify-between rounded-lg border p-2 text-xs">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{background:PAY_COLORS[d.name.toLowerCase()]}} />{d.name}</span>
                        <span className="font-bold">{formatINR(d.value)}</span>
                      </div>
                    ))}
                  </div>
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
                <div className="h-[240px] p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categories} layout="vertical" margin={{left:20}}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis type="number" tick={{fontSize:11}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="category" tick={{fontSize:11}} width={80} />
                      <Tooltip formatter={(v: any)=>formatINR(v as number)} />
                      <Bar dataKey="netRevenue" name="Net Revenue" fill="#2563eb" radius={[0,6,6,0]} />
                      <Bar dataKey="profit" name="Profit" fill="#16a34a" radius={[0,6,6,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="max-h-[220px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Category</TableHead><TableHead className="text-right">Net</TableHead><TableHead className="text-right">Profit</TableHead><TableHead className="text-right">Margin</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((c: any)=>(
                        <TableRow key={c.category}>
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
                <div className="max-h-[220px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>#</TableHead><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Profit</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayTop.map((p: any, idx: number)=>(
                        <TableRow key={p.name+idx}>
                          <TableCell className="text-xs text-muted-foreground">{idx+1}</TableCell>
                          <TableCell><div className="text-xs font-medium leading-tight truncate max-w-[160px]">{p.name}</div><div className="text-[11px] text-muted-foreground">{p.category}</div></TableCell>
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
