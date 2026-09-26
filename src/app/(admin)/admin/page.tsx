"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/apiClient";
import { useConfirm } from "@/components/confirm-dialog";
import { useOfflineBlock } from "@/hooks/useOfflineBlock";
import { Shield, Store, Plus, Monitor, Trash2, RefreshCw, Power, Users, Package, Receipt, UserX } from "lucide-react";
import { cn } from "@/lib/utils";

type ShopOwner = { id: string; name: string; email: string; isActive: boolean } | null;
type ShopRow = {
  id: string;
  name: string;
  address?: string | null;
  isActive: boolean;
  owner?: ShopOwner;
  staffCount?: number;
  productCount?: number;
  lastOrderAt?: string | null;
};

function lastBillLabel(iso?: string | null) {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const { confirm, notify } = useConfirm();
  const { offline, block, reason } = useOfflineBlock(notify);
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [countersByShop, setCountersByShop] = useState<Record<string, { id: string; name: string; isActive: boolean }[]>>({});

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const sData = await apiClient.get<{ shops: ShopRow[] }>("/api/shops");
      setShops(sData.shops);
      const m: Record<string, typeof countersByShop[string]> = {};
      for (const s of sData.shops) {
        try {
          const cData = await apiClient.get<{ counters: typeof countersByShop[string] }>("/api/counters", { shopId: s.id } as any);
          m[s.id] = cData.counters;
        } catch {
          m[s.id] = [];
        }
      }
      setCountersByShop(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") load();
  }, [user]);

  if (!user || user.role !== "SUPER_ADMIN") {
    return (
      <>
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-md w-full">
            <CardContent className="p-6 text-center">
              <Shield className="w-10 h-10 mx-auto text-destructive mb-3" />
              <div className="font-semibold">Access Denied</div>
              <div className="text-xs text-muted-foreground mt-1">Only SUPER_ADMIN can access Admin panel.</div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const handleCreateShop = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (await block()) return;
    if (!shopName.trim()) return setError("Shop name required");
    setLoading(true);
    try {
      await apiClient.post("/api/shops", { name: shopName.trim(), address: shopAddress.trim() || null });
      setShopName("");
      setShopAddress("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShop = async (id: string, name: string) => {
    if (await block()) return;
    const ok = await confirm({
      title: `Delete shop "${name}"?`,
      description: "The shop will be soft-deleted along with its counters. This can be restored later.",
      confirmText: "Delete shop",
      danger: true,
    });
    if (!ok) return;
    try {
      await apiClient.delete(`/api/shops/${id}`);
      await load();
    } catch (e) {
      await notify({ title: "Delete failed", description: e instanceof Error ? e.message : "Delete failed", danger: true });
    }
  };

  const handleToggleShop = async (s: ShopRow) => {
    if (await block()) return;
    if (s.isActive) {
      const ok = await confirm({
        title: `Deactivate "${s.name}"?`,
        description: "Its owner and staff will not be able to log in until the shop is reactivated.",
        confirmText: "Deactivate",
        danger: true,
      });
      if (!ok) return;
    }
    setBusyId(s.id);
    try {
      await apiClient.patch(`/api/shops/${s.id}`, { isActive: !s.isActive });
      setShops((prev) => prev.map((x) => (x.id === s.id ? { ...x, isActive: !s.isActive } : x)));
    } catch (e) {
      await notify({ title: "Update failed", description: e instanceof Error ? e.message : "Update failed", danger: true });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="flex-1 overflow-auto p-4 pb-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Admin — Shops</h1>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className="w-4 h-4" /> Refresh</Button>
          </div>

          {error && <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">{error}</div>}

          <Card>
            <CardHeader className="py-3 border-b"><CardTitle className="text-sm flex items-center gap-2"><Store className="w-4 h-4" /> New shop</CardTitle></CardHeader>
            <CardContent className="p-3">
              <form onSubmit={handleCreateShop} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs">Shop name *</Label>
                  <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g., Main Shop" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Address</Label>
                  <Input value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} placeholder="Main Bazaar" className="h-9 text-sm" />
                </div>
                <Button type="submit" disabled={loading || offline} title={offline ? reason : undefined} className="h-9 px-5"><Plus className="w-4 h-4" /> Add shop</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 border-b flex-row items-center justify-between">
              <CardTitle className="text-sm">Shops</CardTitle>
              <Badge variant="outline">{loading ? "loading..." : `${shops.length} shop${shops.length === 1 ? "" : "s"}`}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {shops.map((s) => {
                  const counters = countersByShop[s.id] ?? [];
                  const dimmed = !s.isActive;
                  return (
                    <div key={s.id} className={cn("p-4 space-y-2.5 transition-opacity", dimmed && "opacity-60")}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Store className="w-4 h-4 text-primary shrink-0" />
                            <span className="font-bold text-[15px] tracking-tight truncate">{s.name}</span>
                            <Badge variant={s.isActive ? "default" : "secondary"} className={cn("text-[10px]", s.isActive && "bg-primary")}>
                              {s.isActive ? "Active" : "Disabled"}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] gap-1"><Monitor className="w-3 h-3" /> {counters.length} counter{counters.length === 1 ? "" : "s"}</Badge>
                          </div>
                          {s.address && <div className="text-xs text-muted-foreground mt-1 truncate">{s.address}</div>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleShop(s)}
                            disabled={busyId === s.id || offline}
                            className="h-8 gap-1.5 text-xs font-semibold"
                            title={offline ? reason : s.isActive ? "Deactivate shop (blocks staff login)" : "Reactivate shop"}
                          >
                            <Power className="w-3.5 h-3.5" /> {s.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteShop(s.id, s.name)} disabled={offline} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" title={offline ? reason : "Delete shop"}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-muted-foreground pl-6">
                        <span className="inline-flex items-center gap-1.5">
                          {s.owner ? (
                            <><Users className="w-3.5 h-3.5" /> <span className="font-medium text-foreground">{s.owner.name}</span>{!s.owner.isActive && <span className="text-destructive font-semibold">(disabled)</span>}</>
                          ) : (
                            <><UserX className="w-3.5 h-3.5 text-amber-600" /> <span className="text-amber-600 font-semibold">No owner assigned</span></>
                          )}
                        </span>
                        <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {s.staffCount ?? 0} staff</span>
                        <span className="inline-flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> {s.productCount ?? 0} products</span>
                        <span className="inline-flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5" /> Last bill: <span className="font-medium text-foreground">{lastBillLabel(s.lastOrderAt)}</span></span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pl-6">
                        {counters.map((c) => (
                          <Badge key={c.id} variant="outline" className="gap-1.5 text-[11px]"><Monitor className="w-3 h-3" /> {c.name}{c.isActive ? "" : " (inactive)"}</Badge>
                        ))}
                        {counters.length === 0 && <span className="text-[11px] text-muted-foreground/70">No counters yet</span>}
                      </div>
                    </div>
                  );
                })}
                {shops.length === 0 && !loading && <div className="p-6 text-center text-sm text-muted-foreground">No shops — create one above</div>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
