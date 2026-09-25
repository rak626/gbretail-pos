"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/apiClient";
import { Shield, Store, Plus, Monitor, Trash2, RefreshCw } from "lucide-react";

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const [shops, setShops] = useState<{ id: string; name: string; address?: string | null; isActive: boolean }[]>([]);
  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countersByShop, setCountersByShop] = useState<Record<string, { id: string; name: string; isActive: boolean }[]>>({});

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const sData = await apiClient.get<{ shops: typeof shops }>("/api/shops");
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
      <AppShell>
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-md w-full">
            <CardContent className="p-6 text-center">
              <Shield className="w-10 h-10 mx-auto text-destructive mb-3" />
              <div className="font-semibold">Access Denied</div>
              <div className="text-xs text-muted-foreground mt-1">Only SUPER_ADMIN can access Admin panel.</div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const handleCreateShop = async () => {
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

  return (
    <AppShell>
      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Admin — Shops</h1>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className="w-4 h-4" /> Refresh</Button>
          </div>

          {error && <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">{error}</div>}

          {/* SUPER_ADMIN only — shop creation */}
          <Card>
            <CardHeader className="py-3 border-b"><CardTitle className="text-sm flex items-center gap-2"><Store className="w-4 h-4" /> Create Shop</CardTitle></CardHeader>
            <CardContent className="p-3 flex flex-col sm:flex-row gap-2">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">Shop Name *</Label>
                <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g., Main Shop" className="h-8 text-xs" />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">Address</Label>
                <Input value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} placeholder="Main Bazaar" className="h-8 text-xs" />
              </div>
              <div className="flex items-end"><Button onClick={handleCreateShop} disabled={loading} className="h-8"><Plus className="w-4 h-4" /> Create Shop</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 border-b flex-row items-center justify-between"><CardTitle className="text-sm">Shops ({shops.length})</CardTitle><Badge variant="outline">{loading ? "loading..." : `${shops.length} shops`}</Badge></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {shops.map((s) => {
                  const counters = countersByShop[s.id] ?? [];
                  return (
                    <div key={s.id} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm flex items-center gap-2 flex-wrap"><Store className="w-4 h-4 text-primary shrink-0" /> {s.name} <Badge variant={s.isActive ? "default" : "secondary"} className="text-[10px]">{s.isActive ? "Active" : "Inactive"}</Badge> <Badge variant="outline" className="text-[10px] gap-1"><Monitor className="w-3 h-3" /> {counters.length} counter{counters.length === 1 ? "" : "s"}</Badge></div>
                          <div className="text-xs text-muted-foreground font-mono mt-1 break-all">ID: {s.id}</div>
                          <div className="text-xs text-muted-foreground mt-0.5"><span className="font-medium">Address:</span> {s.address ? s.address : <span className="italic">No address</span>}</div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={async () => { if (!confirm(`Delete shop ${s.name}? Soft delete.`)) return; await apiClient.delete(`/api/shops/${s.id}`); load(); }}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                      {/* counters read-only for SUPER_ADMIN — no Add Counter */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {counters.map((c) => (
                          <Badge key={c.id} variant="outline" className="gap-1.5"><Monitor className="w-3 h-3" /> {c.name} {c.isActive ? "" : "(inactive)"}</Badge>
                        ))}
                        {counters.length === 0 && <span className="text-xs text-muted-foreground">No counters yet — counters are created by Shop Owner</span>}
                      </div>
                    </div>
                  );
                })}
                {shops.length === 0 && !loading && <div className="p-6 text-center text-sm text-muted-foreground">No shops — create one above</div>}
              </div>
            </CardContent>
          </Card>

          <div className="text-[11px] text-muted-foreground px-1">SUPER_ADMIN view is read-only for counters. Shop Owners create counters from Settings. Manage users from <span className="font-medium text-foreground">Users</span> in navigation.</div>
        </div>
      </div>
    </AppShell>
  );
}
