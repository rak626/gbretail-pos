"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatINR } from "@/lib/utils";
import { fetchAnalyticsSummary, getAnalyticsExportUrl } from "@/lib/api";
import { ArrowLeft, TrendingUp, TrendingDown, ShoppingBag, IndianRupee, Receipt, Tag, Wallet, Package, CreditCard, Calendar, Download, BarChart3, PieChart as PieIcon, Layers, AlertTriangle } from "lucide-react";
import Link from "next/link";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type Preset = "today" | "yesterday" | "3d" | "7d" | "15d" | "1m" | "2m" | "3m" | "6m" | "1y" | "2y" | "3y" | "5y" | "custom";

const PRESETS: { value: Preset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "3d", label: "3D" },
  { value: "7d", label: "7D" },
  { value: "15d", label: "15D" },
  { value: "1m", label: "1M" },
  { value: "2m", label: "2M" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "2y", label: "2Y" },
  { value: "3y", label: "3Y" },
  { value: "5y", label: "5Y" },
];

const COLORS = ["#16a34a", "#2563eb", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];
const PAY_COLORS: Record<string, string> = { cash: "#16a34a", upi: "#2563eb", khata: "#f59e0b", split: "#8b5cf6" };

function Delta({ value }: { value: number | null | undefined }) {
  if (value == null || isNaN(value)) return <span className="text-[11px] text-muted-foreground">—</span>;
  const up = value > 0;
  const down = value < 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${up ? "text-green-600" : down ? "text-destructive" : "text-muted-foreground"}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : down ? <TrendingDown className="w-3 h-3" /> : null}
      {value > 0 ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

export default function AnalyticsPage() {
  const [preset, setPreset] = useState<Preset>("7d");
  const [granularity, setGranularity] = useState<string>("auto");
  const [topN, setTopN] = useState<number>(10);
  const [category, setCategory] = useState<string>("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);
  const [topSort, setTopSort] = useState<"qty" | "revenue">("qty");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchAnalyticsSummary({
        preset: preset === "custom" ? "custom" : preset,
        from: preset === "custom" ? from : undefined,
        to: preset === "custom" ? to : undefined,
        granularity: granularity !== "auto" ? granularity : undefined,
        topN,
        category,
      });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [preset, from, to, granularity, topN, category]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = data?.kpis;
  const timeseries = data?.timeseries ?? [];
  const categories = data?.categories ?? [];
  const topProducts = data?.topProducts ?? [];
  const topByRevenue = data?.topByRevenue ?? [];
  const displayTop = topSort === "qty" ? topProducts : topByRevenue;
  const ledger = data?.ledger;

  const handlePreset = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") {
      setFrom("");
      setTo("");
    }
  };

  const exportUrl = getAnalyticsExportUrl({
    preset: preset === "custom" ? "custom" : preset,
    from: preset === "custom" ? from : undefined,
    to: preset === "custom" ? to : undefined,
    granularity: granularity !== "auto" ? granularity : undefined,
    format: "csv",
  });

  return (
    <AppShell>
      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <Link href="/"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4" /> Billing</Button></Link>
              <h1 className="text-lg font-bold flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Analytics</h1>
              {data?.range && <Badge variant="secondary" className="hidden sm:flex">{data.range.label} • {data.range.granularity}</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.open(exportUrl, "_blank")}><Download className="w-4 h-4" /> CSV</Button>
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>{loading ? "Loading..." : "Refresh"}</Button>
            </div>
          </div>

          {/* Time bar */}
          <Card className="py-0 border-primary/20 ring-1 ring-primary/5">
            <CardContent className="p-2 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map(p => (
                  <Button key={p.value} variant={preset === p.value ? "default" : "outline"} size="sm" className="h-7 text-xs px-2.5" onClick={() => handlePreset(p.value)}>{p.label}</Button>
                ))}
                <Button variant={preset === "custom" ? "default" : "outline"} size="sm" className="h-7 text-xs px-2.5" onClick={() => handlePreset("custom")}>Custom</Button>
                <div className="ml-auto flex items-center gap-2">
                  <Select value={String(topN)} onValueChange={(v: string | null) => setTopN(Number(v))}>
                    <SelectTrigger className="h-7 w-[90px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">Top 5</SelectItem>
                      <SelectItem value="10">Top 10</SelectItem>
                      <SelectItem value="20">Top 20</SelectItem>
                      <SelectItem value="50">Top 50</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={granularity} onValueChange={(v: string | null) => setGranularity(v ?? "auto")}>
                    <SelectTrigger className="h-7 w-[110px] text-xs"><SelectValue placeholder="Auto" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="hour">Hourly</SelectItem>
                      <SelectItem value="day">Daily</SelectItem>
                      <SelectItem value="week">Weekly</SelectItem>
                      <SelectItem value="month">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {preset === "custom" && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs">From</Label>
                    <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-7 w-[150px] text-xs" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs">To</Label>
                    <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-7 w-[150px] text-xs" />
                  </div>
                  <Button size="sm" className="h-7" onClick={load} disabled={!from || !to}>Apply</Button>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {["All","Staples","Packaged","Snacks","Dairy","Vegetables","Spices"].map(cat => (
                  <Button key={cat} variant={category===cat?"secondary":"ghost"} size="sm" className="h-6 text-[11px] px-2" onClick={()=>setCategory(cat)}>{cat}</Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {error ? (
            <Card className="py-0"><CardContent className="p-6 text-center"><div className="text-sm text-destructive">{error}</div><Button size="sm" variant="outline" className="mt-3" onClick={load}>Retry</Button></CardContent></Card>
          ) : loading && !data ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading analytics…</div>
          ) : (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
                <Card className="py-0">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground uppercase font-medium">Orders</span><ShoppingBag className="w-4 h-4 text-muted-foreground" /></div>
                    <div className="text-xl font-black leading-none mt-1">{kpis?.orders ?? 0}</div>
                    <div className="mt-1"><Delta value={kpis?.delta?.orders} /> <span className="text-[10px] text-muted-foreground">vs prev</span></div>
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
                    <div className="flex items-center justify-between"><span className="text-[11px] text-amber-700 dark:text-amber-300 uppercase font-medium">Discount</span><Tag className="w-4 h-4 text-amber-600" /></div>
                    <div className="text-sm font-black leading-none mt-1 text-amber-700">{formatINR(kpis?.discount ?? 0)}</div>
                    <div className="text-[11px] text-muted-foreground">{kpis?.gross ? ((kpis.discount/kpis.gross)*100).toFixed(1):0}% of gross</div>
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
                <Card className="py-0 border-green-200 bg-green-50/40 dark:bg-green-950/20">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between"><span className="text-[11px] text-green-700 dark:text-green-300 uppercase font-medium">Profit</span><TrendingUp className="w-4 h-4 text-green-600" /></div>
                    <div className="text-sm font-black leading-none mt-1 text-green-700">{formatINR(kpis?.profit ?? 0)}</div>
                    <div className="text-[11px] text-muted-foreground">net = grossProfit - discount</div>
                    <div className="mt-1"><Delta value={kpis?.delta?.profit} /></div>
                  </CardContent>
                </Card>
                <Card className="py-0 border-destructive/20 bg-destructive/5">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between"><span className="text-[11px] text-destructive uppercase font-medium">Loss</span><TrendingDown className="w-4 h-4 text-destructive" /></div>
                    <div className="text-sm font-black leading-none mt-1 text-destructive">{formatINR(kpis?.loss ?? 0)}</div>
                    <div className="text-[11px] text-muted-foreground">where profit &lt;0</div>
                  </CardContent>
                </Card>
                <Card className="py-0">
                  <CardContent className="p-3">
                    <div className="text-[11px] text-muted-foreground uppercase font-medium">Margin</div>
                    <div className="text-xl font-black leading-none mt-1">{(kpis?.marginPct ?? 0).toFixed(1)}%</div>
                    <div className="text-[11px] text-muted-foreground">profit / net</div>
                  </CardContent>
                </Card>
                <Card className="py-0">
                  <CardContent className="p-3">
                    <div className="text-[11px] text-muted-foreground uppercase font-medium">AOV</div>
                    <div className="text-sm font-black leading-none mt-1">{formatINR(kpis?.avgOrderValue ?? 0)}</div>
                    <div className="text-[11px] text-muted-foreground">net / orders</div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <Card className="lg:col-span-2 py-0 overflow-hidden">
                  <CardHeader className="py-3 border-b flex-row items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Revenue & Profit Over Time</CardTitle>
                    <Badge variant="outline" className="text-xs">{data?.range?.label}</Badge>
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
                          <Area type="monotone" dataKey="loss" name="Loss" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} />
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
                              <Legend />
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
                                  <TableCell className={`text-right text-xs font-bold ${c.profit>=0?"text-green-600":"text-destructive"}`}>{formatINR(c.profit)}</TableCell>
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
                    <div className="flex items-center gap-1">
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
                                  <TableCell className={`text-right text-xs font-bold ${p.profit>=0?"text-green-600":"text-destructive"}`}>{formatINR(p.profit)}</TableCell>
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

              {/* Ledger Analytics */}
              <Card className="py-0 overflow-hidden">
                <CardHeader className="py-3 border-b flex-row items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /> Ledger Analytics</CardTitle>
                  <Badge variant="outline" className="text-xs">Khata</Badge>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Card className="py-0 bg-muted/20"><CardContent className="p-2.5"><div className="text-[11px] text-muted-foreground uppercase">Created</div><div className="text-sm font-black">{ledger?.created?.count ?? 0} • {formatINR(ledger?.created?.amount ?? 0)}</div></CardContent></Card>
                    <Card className="py-0 bg-green-50 border-green-200 dark:bg-green-950/20"><CardContent className="p-2.5"><div className="text-[11px] text-green-700 uppercase">Settled</div><div className="text-sm font-black text-green-700">{ledger?.settled?.count ?? 0} • {formatINR(ledger?.settled?.amount ?? 0)}</div></CardContent></Card>
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

              <div className="text-[11px] text-muted-foreground text-center pb-2">
                Gross = before discount • Net = after discount • Profit = (sell-buy)*qty - allocated discount • Loss = |negative profit| • Ledger ageing in days from due date
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
