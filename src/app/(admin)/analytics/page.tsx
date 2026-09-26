"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchAnalyticsSummary, fetchAnalyticsSections, getAnalyticsExportUrl, type AnalyticsSections } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useOnlineStore } from "@/store/onlineStore";
import { OFFLINE_REASON } from "@/hooks/useOfflineBlock";
import { BarChart3, Download, Package, Store, Users, UserPlus, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import ProductsTab from "@/components/analytics/ProductsTab";
import ShopTab from "@/components/analytics/ShopTab";
import StaffTab from "@/components/analytics/StaffTab";
import CustomersTab from "@/components/analytics/CustomersTab";
import LedgerTab from "@/components/analytics/LedgerTab";

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

type Tab = "products" | "shop" | "staff" | "customers" | "ledger";

const TABS: { value: Tab; label: string; icon: React.ElementType }[] = [
  { value: "products", label: "Products", icon: Package },
  { value: "shop", label: "Shop", icon: Store },
  { value: "staff", label: "Staff", icon: Users },
  { value: "customers", label: "Customers", icon: UserPlus },
  { value: "ledger", label: "Ledger", icon: Wallet },
];

export default function AnalyticsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const offline = useOnlineStore((s) => !s.online);
  const isSuper = role === "SUPER_ADMIN";
  const [preset, setPreset] = useState<Preset>("7d");
  const [granularity, setGranularity] = useState<string>("auto");
  const [topN, setTopN] = useState<number>(10);
  const [category, setCategory] = useState<string>("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);
  const [sections, setSections] = useState<AnalyticsSections | null>(null);
  const [topSort, setTopSort] = useState<"qty" | "revenue">("qty");
  const [tab, setTab] = useState<Tab>("products");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [res, sec] = await Promise.all([
        fetchAnalyticsSummary({
          preset: preset === "custom" ? "custom" : preset,
          from: preset === "custom" ? from : undefined,
          to: preset === "custom" ? to : undefined,
          granularity: granularity !== "auto" ? granularity : undefined,
          topN,
          category,
        }),
        fetchAnalyticsSections({
          preset: preset === "custom" ? "custom" : preset,
          from: preset === "custom" ? from : undefined,
          to: preset === "custom" ? to : undefined,
        }),
      ]);
      setData(res);
      setSections(sec);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [preset, from, to, granularity, topN, category]);

  useEffect(() => {
    load();
  }, [load]);

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
    <>
      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-semibold flex items-center gap-1.5"><BarChart3 className="w-4 h-4 text-primary" /> Analytics</h1>
              {data?.range && <Badge variant="secondary" className="hidden sm:flex rounded-full">{data.range.label} • {data.range.granularity}</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.open(exportUrl, "_blank")} disabled={offline} title={offline ? OFFLINE_REASON : undefined}><Download className="w-4 h-4" /> CSV</Button>
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
              {tab === "products" && (
                <div className="flex flex-wrap gap-1.5">
                  {["All", ...Array.from(new Set<string>((data?.categories ?? []).map((c: any) => c.category).filter(Boolean))).sort()].map((cat: string) => (
                    <Button key={cat} variant={category===cat?"secondary":"ghost"} size="sm" className="h-6 text-[11px] px-2" onClick={()=>setCategory(cat)}>{cat}</Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.value;
              return (
                <Button
                  key={t.value}
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTab(t.value)}
                  className={cn("h-9 rounded-full px-4 text-[13px] font-semibold gap-1.5 shrink-0", !active && "bg-card")}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.value === "staff" && isSuper ? "Owners" : t.label}
                </Button>
              );
            })}
          </div>

          {error ? (
            <Card className="py-0"><CardContent className="p-6 text-center"><div className="text-sm text-destructive">{error}</div><Button size="sm" variant="outline" className="mt-3" onClick={load}>Retry</Button></CardContent></Card>
          ) : loading && !data ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading analytics…</div>
          ) : (
            <>
              {tab === "products" && <ProductsTab data={data} topN={topN} setTopN={setTopN} topSort={topSort} setTopSort={setTopSort} granularity={granularity} setGranularity={setGranularity} />}
              {tab === "shop" && <ShopTab sections={sections} isSuper={isSuper} />}
              {tab === "staff" && <StaffTab sections={sections} isSuper={isSuper} />}
              {tab === "customers" && <CustomersTab sections={sections} />}
              {tab === "ledger" && <LedgerTab ledger={data?.ledger} defaulters={sections?.customers.defaulters ?? []} />}
            </>
          )}
        </div>
      </div>
    </>
  );
}
