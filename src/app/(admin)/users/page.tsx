"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/apiClient";
import { Users, Shield, Trash2, Plus, RefreshCw } from "lucide-react";
import UserDrawer from "@/components/users/UserDrawer";
import { useConfirm } from "@/components/confirm-dialog";

type UserRow = { id: string; email: string; name: string; role: string; shopId: string | null; isActive: boolean; canManageInventory?: boolean; shop?: { id: string; name: string } | null; createdAt?: string };
type ShopOpt = { id: string; name: string };

export default function UsersPage() {
  const user = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [shops, setShops] = useState<ShopOpt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newUser, setNewUser] = useState({ email: "", password: "", name: "", role: "STAFF", shopId: "", invGrant: false });
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { confirm } = useConfirm();

  const isSuper = user?.role === "SUPER_ADMIN";
  const isOwner = user?.role === "SHOP_OWNER";
  const isStaff = user?.role === "STAFF";

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const uData = await apiClient.get<{ users: UserRow[] }>("/api/users");
      setUsers(uData.users);
      if (isSuper) {
        const sData = await apiClient.get<{ shops: ShopOpt[] }>("/api/shops");
        setShops(sData.shops);
        setNewUser((s) => (s.shopId ? s : sData.shops[0] ? { ...s, shopId: sData.shops[0].id } : s));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !isStaff) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?.shopId]);

  if (!user) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center p-8 text-sm text-muted-foreground">Loading...</div>
      </>
    );
  }

  if (isStaff) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-md w-full">
            <CardContent className="p-6 text-center">
              <Shield className="w-10 h-10 mx-auto text-destructive mb-3" />
              <div className="font-semibold">Access Denied</div>
              <div className="text-xs text-muted-foreground mt-1">STAFF cannot access Users. Only SUPER_ADMIN and SHOP_OWNER can manage users.</div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const handleCreate = async () => {
    if (!newUser.email || !newUser.password || !newUser.name) return setError("email / password / name required");
    try {
      const payload: Record<string, unknown> = {
        email: newUser.email,
        password: newUser.password,
        name: newUser.name,
        role: isSuper ? newUser.role : "STAFF",
        shopId: isSuper ? (newUser.shopId || undefined) : undefined,
        // Owner/super can grant inventory access at creation (STAFF only)
        canManageInventory: newUser.invGrant,
      };
      await apiClient.post("/api/users", payload);
      setShowForm(false);
      setNewUser((s) => ({ ...s, email: "", password: "", name: "", invGrant: false }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    }
  };

  const handleToggleInventory = async (u: UserRow) => {
    setError("");
    try {
      await apiClient.patch(`/api/users/${u.id}`, { canManageInventory: !u.canManageInventory });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, canManageInventory: !u.canManageInventory } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update inventory access");
    }
  };

  // Activate/deactivate rules mirror the backend:
  // owner ↔ own-shop staff, super ↔ owners. Nobody touches self or staff-above.
  const canToggleStatus = (u: UserRow) => {
    if (!user || u.id === user.id) return false;
    if (isOwner) return u.role === "STAFF";
    if (isSuper) return u.role === "SHOP_OWNER";
    return false;
  };

  const statusHint = (u: UserRow) => {
    if (!user || u.id === user.id) return "You cannot change your own status.";
    if (isOwner) return u.role === "STAFF" ? "As shop owner you can activate or deactivate this staff account." : "Owners cannot change other owners.";
    if (isSuper) return u.role === "SHOP_OWNER" ? "As super admin you can activate or deactivate this owner." : "Staff status is managed by their shop owner, not super admin.";
    return "";
  };

  const handleToggleStatus = async (u: UserRow) => {
    if (!canToggleStatus(u)) return;
    if (u.isActive) {
      const ok = await confirm({
        title: `Deactivate ${u.name}?`,
        description: "They will be signed out immediately and cannot log in until reactivated.",
        confirmText: "Deactivate",
        danger: true,
      });
      if (!ok) return;
    }
    setError("");
    setBusy(true);
    try {
      await apiClient.patch(`/api/users/${u.id}`, { isActive: !u.isActive });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: !u.isActive } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteUser = async (u: UserRow) => {
    const ok = await confirm({
      title: `Delete ${u.name}?`,
      description: "The account will be soft-deleted and can be restored later.",
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    setError("");
    try {
      await apiClient.delete(`/api/users/${u.id}`);
      if (selectedId === u.id) setSelectedId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  const selected = users.find((x) => x.id === selectedId) ?? null;

  const shopNameOf = (u: UserRow) => {
    if (u.shop?.name) return u.shop.name;
    if (!u.shopId) return "—";
    const found = shops.find((s) => s.id === u.shopId);
    if (found) return found.name;
    // for owner view, shop is current user's shop
    if (isOwner && u.shopId === user.shopId) return user.shop?.name ?? u.shopId.slice(0, 8);
    return u.shopId.slice(0, 8);
  };

  return (
    <>
      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Users {isSuper ? "(All Shops)" : isOwner ? `— ${user.shop?.name ?? "Your Shop"}` : ""}</h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{loading ? "loading..." : `${users.length} users`}</Badge>
              <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className="w-4 h-4" /> Refresh</Button>
              <Button size="sm" onClick={() => setShowForm((v) => !v)}><Plus className="w-4 h-4" /> {showForm ? "Cancel" : "Create User"}</Button>
            </div>
          </div>

          {error && <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">{error}</div>}

          {showForm && (
            <Card>
              <CardHeader className="py-3 border-b"><CardTitle className="text-sm">Create User</CardTitle></CardHeader>
              <CardContent className="p-3">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Name *</Label>
                    <Input value={newUser.name} onChange={(e) => setNewUser((s) => ({ ...s, name: e.target.value }))} placeholder="Staff name" className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email *</Label>
                    <Input value={newUser.email} onChange={(e) => setNewUser((s) => ({ ...s, email: e.target.value }))} placeholder="email" className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Password *</Label>
                    <Input value={newUser.password} onChange={(e) => setNewUser((s) => ({ ...s, password: e.target.value }))} type="password" placeholder="password" className="h-8 text-xs" />
                  </div>
                  {isSuper ? (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs">Role</Label>
                        <select value={newUser.role} onChange={(e) => setNewUser((s) => ({ ...s, role: e.target.value }))} className="h-8 text-xs rounded-md border px-2 bg-background w-full">
                          <option value="STAFF">STAFF</option>
                          <option value="SHOP_OWNER">SHOP_OWNER</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Shop {(newUser.role === "SHOP_OWNER" || newUser.role === "STAFF") && "*"}</Label>
                        <select value={newUser.shopId} onChange={(e) => setNewUser((s) => ({ ...s, shopId: e.target.value }))} className="h-8 text-xs rounded-md border px-2 bg-background w-full" disabled={newUser.role === "SUPER_ADMIN"}>
                          <option value="">{newUser.role === "SUPER_ADMIN" ? "No shop (super)" : "Select shop"}</option>
                          {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1 hidden sm:block">
                        <Label className="text-xs">Role</Label>
                        <Input value="STAFF" disabled className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1 hidden sm:block">
                        <Label className="text-xs">Shop</Label>
                        <Input value={user.shop?.name ?? user.shopId ?? "—"} disabled className="h-8 text-xs" />
                      </div>
                    </>
                  )}
                </div>
                <div className="flex justify-end mt-3">
                  <Button size="sm" onClick={handleCreate}>Create</Button>
                </div>
                {(isOwner) && (
                  <label className="flex items-center gap-2 mt-3 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newUser.invGrant}
                      onChange={(e) => setNewUser((s) => ({ ...s, invGrant: e.target.checked }))}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="font-medium">Grant inventory access <span className="text-muted-foreground font-normal">(staff can open + edit stock)</span></span>
                  </label>
                )}
                {isOwner && <p className="text-[11px] text-muted-foreground mt-2">SHOP_OWNER can only create STAFF for own shop.</p>}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="py-3 border-b flex-row items-center justify-between"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> {isSuper ? "All Users" : "Shop Users"} ({users.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[60vh] border-t">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30 sticky top-0"><tr><th className="text-left p-2">Name</th><th className="text-left p-2">Email</th><th className="text-left p-2">Role</th><th className="text-left p-2">Shop</th><th className="text-left p-2">Stock</th><th className="text-right p-2">Active</th><th className="text-right p-2">Action</th></tr></thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t hover:bg-muted/40 cursor-pointer transition-colors" onClick={() => setSelectedId(u.id)} title="View user details">
                        <td className="p-2 font-medium">{u.name}</td>
                        <td className="p-2 font-mono text-[11px]">{u.email}</td>
                        <td className="p-2"><Badge variant="outline" className="text-[10px]">{u.role}</Badge></td>
                        <td className="p-2 font-mono text-[11px]">{shopNameOf(u)}</td>
                        <td className="p-2" onClick={(e) => e.stopPropagation()}>
                          {u.role === "STAFF" ? (
                            isOwner ? (
                              <button
                                onClick={() => handleToggleInventory(u)}
                                title={u.canManageInventory ? "Revoke inventory access" : "Grant inventory access"}
                                className={`h-6 px-2.5 rounded-full text-[10px] font-bold border transition-colors ${u.canManageInventory ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary/40"}`}
                              >
                                {u.canManageInventory ? "Stock: ON" : "Stock: OFF"}
                              </button>
                            ) : (
                              <span
                                title="Only the shop owner can change inventory access"
                                className={`inline-block h-6 px-2.5 leading-6 rounded-full text-[10px] font-bold border ${u.canManageInventory ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border"}`}
                              >
                                {u.canManageInventory ? "Stock: ON" : "Stock: OFF"}
                              </span>
                            )
                          ) : u.role === "SHOP_OWNER" ? (
                            <span className="text-[10px] font-semibold text-primary">Full</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className={`inline-block h-6 px-2.5 leading-6 rounded-full text-[10px] font-bold border ${u.isActive ? "bg-primary/10 text-primary border-primary/30" : "bg-destructive/10 text-destructive border-destructive/30"}`}>
                            {u.isActive ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeleteUser(u)} disabled={u.id === user.id}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && !loading && <tr><td colSpan={7} className="p-6 text-center text-sm text-muted-foreground">No users found</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <UserDrawer
        target={selected}
        open={selected !== null}
        onOpenChange={(v) => !v && setSelectedId(null)}
        shopName={selected ? shopNameOf(selected) : "—"}
        isSelf={selected ? selected.id === user.id : false}
        canToggleStatus={selected ? canToggleStatus(selected) : false}
        statusHint={selected ? statusHint(selected) : ""}
        canToggleStock={!!selected && isOwner && selected.role === "STAFF"}
        busy={busy}
        onToggleStatus={() => selected && handleToggleStatus(selected)}
        onToggleStock={() => selected && handleToggleInventory(selected)}
        onDelete={() => selected && handleDeleteUser(selected)}
      />
    </>
  );
}
