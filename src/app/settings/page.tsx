"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/apiClient";
import { Settings, Monitor, Plus, Trash2, Store, Users } from "lucide-react";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const shop = useAuthStore((s) => s.shop);
  const [counters, setCounters] = useState<{ id: string; name: string; isActive: boolean; shopId: string }[]>([]);
  const [newCounter, setNewCounter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    if (!user?.shopId) return;
    setLoading(true);
    try {
      const cData = await apiClient.get<{ counters: typeof counters }>("/api/counters", { shopId: user.shopId } as any);
      setCounters(cData.counters);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.shopId]);

  if (!user) return <AppShell><div className="p-8 text-center text-sm">Loading...</div></AppShell>;

  if (!user.shopId) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-md w-full">
            <CardContent className="p-6 text-center">
              <Store className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <div className="font-semibold">No Shop Assigned</div>
              <div className="text-xs text-muted-foreground mt-1">Your account has no shop. Super Admins manage shops from Admin. Contact admin.</div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const canManage = user.role === "SHOP_OWNER" || user.role === "SUPER_ADMIN";

  const handleCreateCounter = async () => {
    if (!newCounter.trim()) return;
    try {
      await apiClient.post("/api/counters", { name: newCounter.trim() });
      setNewCounter("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <AppShell>
      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold flex items-center gap-2"><Settings className="w-4 h-4 text-primary" /> Settings — {shop?.name ?? "Shop"}</h1>
            <Badge variant="outline">{user.role}</Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">Shop sharing inventory • any staff can use any counter • tracked who billed</span>
          </div>

          {error && <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">{error}</div>}

          <Card>
            <CardHeader className="py-3 border-b"><CardTitle className="text-sm flex items-center gap-2"><Store className="w-4 h-4" /> Shop Info</CardTitle></CardHeader>
            <CardContent className="p-3 space-y-1 text-sm">
              <div><span className="text-muted-foreground">Shop:</span> <span className="font-semibold">{shop?.name ?? "—"}</span> <span className="font-mono text-xs text-muted-foreground">{shop?.id ?? user.shopId ?? "—"}</span></div>
              <div><span className="text-muted-foreground">You:</span> {user.name} ({user.email}) — {user.role}</div>
              <div className="text-xs text-muted-foreground">Counters in this shop share inventory. Any staff login works on any counter; order records which counter & who billed.</div>
              {(user.role === "SHOP_OWNER" || user.role === "SUPER_ADMIN") && (
                <div className="pt-2">
                  <Link href="/users" className="text-xs text-primary hover:underline inline-flex items-center gap-1"><Users className="w-3 h-3" /> Manage users of this shop → Users</Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 border-b flex-row items-center justify-between"><CardTitle className="text-sm flex items-center gap-2"><Monitor className="w-4 h-4" /> Counters ({counters.length})</CardTitle><Badge variant="outline">Shared inventory</Badge></CardHeader>
            <CardContent className="p-3 space-y-3">
              {/* Only SHOP_OWNER (and SUPER_ADMIN) can create counters — STAFF sees read-only list */}
              {canManage && (
                <div className="flex gap-2">
                  <Input value={newCounter} onChange={(e) => setNewCounter(e.target.value)} placeholder="Counter name e.g., Counter 3" className="h-7 text-xs flex-1" />
                  <Button size="sm" className="h-7" onClick={handleCreateCounter}><Plus className="w-3 h-3" /> Add Counter</Button>
                </div>
              )}
              {!canManage && counters.length > 0 && <div className="text-xs text-muted-foreground">STAFF view — read-only. Only SHOP_OWNER can create counters.</div>}
              <div className="flex flex-wrap gap-2">
                {counters.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
                    <Monitor className="w-3.5 h-3.5 text-primary" /> {c.name}
                    {canManage && (
                      <Button variant="ghost" size="icon-xs" className="h-5 w-5 ml-1" onClick={async () => { if (!confirm(`Delete ${c.name}?`)) return; await apiClient.delete(`/api/counters/${c.id}`); load(); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
                {counters.length === 0 && <span className="text-xs text-muted-foreground">{canManage ? "No counters yet — create one." : "No counters yet."}</span>}
              </div>
            </CardContent>
          </Card>

          {!canManage && <div className="text-[11px] text-muted-foreground px-1">You are logged in as STAFF. You can use any counter to bill — orders track who billed. User management is not available for this role.</div>}
        </div>
      </div>
    </AppShell>
  );
}
