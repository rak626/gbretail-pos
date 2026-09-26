"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/apiClient";
import { fetchCounters } from "@/lib/authApi";
import { cn } from "@/lib/utils";
import SearchBox from "@/components/SearchBox";
import { Users, Shield, Plus, RefreshCw, ChevronRight, Search, ArrowDownWideNarrow } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CounterSelect from "@/components/CounterSelect";
import UserDrawer from "@/components/users/UserDrawer";
import { useConfirm } from "@/components/confirm-dialog";
import { useOfflineBlock } from "@/hooks/useOfflineBlock";

type UserRow = { id: string; email: string; name: string; role: string; shopId: string | null; isActive: boolean; canManageInventory?: boolean; counterId?: string | null; shop?: { id: string; name: string } | null; createdAt?: string };
type ShopOpt = { id: string; code?: string | null; name: string };
type CounterOpt = { id: string; name: string };

const ROLE_META: Record<string, { label: string; dot: string }> = {
  STAFF: { label: "Staff", dot: "bg-sky-500" },
  SHOP_OWNER: { label: "Owner", dot: "bg-amber-500" },
  SUPER_ADMIN: { label: "Super Admin", dot: "bg-rose-500" },
};

const ROLE_OPTIONS = [
  { value: "STAFF", label: "Staff", hint: "Bills on a counter, no admin access" },
  { value: "SHOP_OWNER", label: "Shop Owner", hint: "Manages one shop: staff, stock, counters" },
  { value: "SUPER_ADMIN", label: "Super Admin", hint: "All shops, no shop assigned" },
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function UsersPage() {
  const user = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [shops, setShops] = useState<ShopOpt[]>([]);
  const [shopCounters, setShopCounters] = useState<CounterOpt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newUser, setNewUser] = useState({ email: "", password: "", name: "", role: "STAFF", shopId: "", invGrant: false, counterId: "" });
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Toolbar: reusable search + role/status/shop filters (client-side — full list is in memory)
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [shopFilter, setShopFilter] = useState<string>("all");
  const searchRef = useRef<HTMLInputElement>(null);
  const { confirm, notify } = useConfirm();
  const { offline, block, reason } = useOfflineBlock(notify);

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
      if (isOwner && user?.shopId) {
        try {
          const cData = await fetchCounters(user.shopId);
          setShopCounters(cData.counters);
        } catch {
          setShopCounters([]);
        }
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

  // "/" focuses user search (same as inventory)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
    if (await block()) return;
    if (!newUser.email || !newUser.password || !newUser.name) return setError("email / password / name required");
    if (newUser.password.length < 6) return setError("Password must be at least 6 characters");
    if (isSuper && newUser.role !== "SUPER_ADMIN" && !newUser.shopId) return setError("Select a shop for this user");
    if (creating) return;
    setCreating(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        email: newUser.email,
        password: newUser.password,
        name: newUser.name,
        role: isSuper ? newUser.role : "STAFF",
        shopId: isSuper ? (newUser.shopId || undefined) : undefined,
        // Owner/super can grant inventory access at creation (STAFF only)
        canManageInventory: newUser.invGrant,
        // Owner can assign a counter at creation (blank = Auto fallback at login)
        counterId: isOwner && newUser.counterId ? newUser.counterId : undefined,
      };
      await apiClient.post("/api/users", payload);
      setCreateOpen(false);
      setNewUser((s) => ({ ...s, email: "", password: "", name: "", invGrant: false, counterId: "" }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  // Display rule: ids never render on screen. Unknown references show "—",
  // never a sliced id (seed ids like "counter_1" look like broken data).
  const counterNameOf = (u: UserRow) => {
    if (!u.counterId) return null;
    return shopCounters.find((c) => c.id === u.counterId)?.name ?? null;
  };

  const handleAssignCounter = async (u: UserRow, counterId: string | null) => {
    if (await block()) return;
    setError("");
    try {
      await apiClient.patch(`/api/users/${u.id}`, { counterId });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, counterId } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign counter");
    }
  };

  const handleToggleInventory = async (u: UserRow) => {    if (await block()) return;
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
    if (await block()) return;
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
    if (await block()) return;
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
    if (isOwner && u.shopId === user.shopId) return user.shop?.name ?? "—";
    return "—";
  };

  const ROLE_FILTERS = useMemo(() => {
    const opts = [
      { value: "all", label: "All roles" },
      { value: "SHOP_OWNER", label: "Owners" },
      { value: "STAFF", label: "Staff" },
    ];
    if (isSuper) opts.push({ value: "SUPER_ADMIN", label: "Super Admins" });
    return opts;
  }, [isSuper]);

  const isFiltered = query.trim() !== "" || roleFilter !== "all" || statusFilter !== "all" || shopFilter !== "all";

  const clearFilters = () => {
    setQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
    setShopFilter("all");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter === "active" && !u.isActive) return false;
      if (statusFilter === "disabled" && u.isActive) return false;
      if (shopFilter !== "all" && u.shopId !== shopFilter) return false;
      if (q) {
        const hay = `${u.name} ${u.email} ${shopNameOf(u)} ${ROLE_META[u.role]?.label ?? u.role} ${counterNameOf(u) ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, query, roleFilter, statusFilter, shopFilter, shops, shopCounters]);

  return (
    <>
      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Users {isSuper ? "(All Shops)" : isOwner ? `— ${user.shop?.name ?? "Your Shop"}` : ""}</h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{loading ? "loading..." : `${users.length} users`}</Badge>
              <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className="w-4 h-4" /> Refresh</Button>
              <Button size="sm" onClick={() => { setError(""); setCreateOpen(true); }} disabled={offline} title={offline ? reason : undefined}><Plus className="w-4 h-4" /> Create User</Button>
            </div>
          </div>

          {error && !createOpen && <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">{error}</div>}

          <Card className="py-0 border-primary/20 ring-1 ring-primary/5">
            <CardContent className="p-2 space-y-2">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="flex items-center gap-2 h-10 px-2 rounded-md border border-input bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 flex-1 min-w-0">
                  <SearchBox
                    placeholder="Search name, email, shop or counter…"
                    leftIcon={<Search className="w-4 h-4" />}
                    value={query}
                    onValueChange={setQuery}
                    onSearch={setQuery}
                    onClear={() => setQuery("")}
                    inputRef={searchRef}
                    variant="plain"
                    minChars={2}
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "all")}>
                    <SelectTrigger className="h-10 min-w-[140px] text-sm" aria-label="Filter by role">
                      <ArrowDownWideNarrow className="w-4 h-4 text-muted-foreground" />
                      <SelectValue>{ROLE_FILTERS.find((o) => o.value === roleFilter)?.label ?? "All roles"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_FILTERS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isSuper && (
                    <Select value={shopFilter} onValueChange={(v) => setShopFilter(v ?? "all")}>
                      <SelectTrigger className="h-10 min-w-[170px] text-sm" aria-label="Filter by shop">
                        <SelectValue>
                          {shopFilter === "all" ? "All shops" : (() => {
                            const s = shops.find((x) => x.id === shopFilter);
                            return s ? `${s.name}${s.code ? ` • ${s.code}` : ""}` : "All shops";
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All shops</SelectItem>
                        {shops.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            <span className="flex items-center gap-2">
                              <span className="truncate">{s.name}</span>
                              <span className="font-mono text-[11px] text-muted-foreground shrink-0">{s.code ?? "—"}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex gap-1.5" role="group" aria-label="Status">
                  {([
                    { value: "all", label: "All" },
                    { value: "active", label: "Active" },
                    { value: "disabled", label: "Disabled" },
                  ] as const).map((f) => (
                    <Button
                      key={f.value}
                      variant={statusFilter === f.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter(f.value)}
                      className={cn("h-7 text-xs", statusFilter === f.value && f.value === "disabled" && "bg-destructive hover:bg-destructive/90")}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
                <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">
                  {isFiltered ? `${filtered.length} of ${users.length} shown` : `${users.length} shown`} • press <kbd className="px-1 rounded border bg-muted">/</kbd> to search
                </span>
                {isFiltered && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">Clear</Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="sm:max-w-[620px] p-0 gap-0 overflow-hidden">
              <DialogHeader className="p-5 pb-3 border-b bg-muted/20">
                <DialogTitle className="text-[15px]">Create user</DialogTitle>
                <DialogDescription className="text-xs">
                  {isSuper ? "Choose a role and shop." : `New staff for ${user.shop?.name ?? "your shop"}.`}
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleCreate();
                }}
              >
              <div className="px-5 py-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <Label className="text-[13px]">Name *</Label>
                    <Input value={newUser.name} onChange={(e) => setNewUser((s) => ({ ...s, name: e.target.value }))} placeholder="e.g., Ramesh Kumar" className="h-10 text-sm" autoFocus autoComplete="name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px]">Email *</Label>
                    <Input value={newUser.email} onChange={(e) => setNewUser((s) => ({ ...s, email: e.target.value }))} type="email" placeholder="name@shop.com" className="h-10 text-sm" autoComplete="email" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <Label className="text-[13px]">Password *</Label>
                    <Input value={newUser.password} onChange={(e) => setNewUser((s) => ({ ...s, password: e.target.value }))} type="password" placeholder="Min 6 characters" className="h-10 text-sm" autoComplete="new-password" />
                  </div>
                  {isSuper ? (
                    <div className="space-y-1.5">
                      <Label className="text-[13px]">Role</Label>
                      <Select value={newUser.role} onValueChange={(v) => setNewUser((s) => ({ ...s, role: v ?? "STAFF" }))}>
                        <SelectTrigger className="h-10 text-sm w-full" aria-label="User role">
                          <SelectValue>{ROLE_OPTIONS.find((o) => o.value === newUser.role)?.label ?? "Staff"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              <span className="flex flex-col items-start">
                                <span>{o.label}</span>
                                <span className="text-[11px] text-muted-foreground">{o.hint}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-[13px]">Role</Label>
                      <Input value="Staff" disabled className="h-10 text-sm" />
                    </div>
                  )}
                </div>
                {isSuper ? (
                  newUser.role !== "SUPER_ADMIN" && (
                    <div className="space-y-1.5">
                      <Label className="text-[13px]">Shop *</Label>
                      <Select value={newUser.shopId} onValueChange={(v) => setNewUser((s) => ({ ...s, shopId: v ?? "" }))}>
                        <SelectTrigger className="h-10 text-sm w-full" aria-label="Shop">
                          <SelectValue>
                            {(() => {
                              const s = shops.find((x) => x.id === newUser.shopId);
                              return s ? `${s.name}${s.code ? ` • ${s.code}` : ""}` : "Select shop";
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {shops.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              <span className="flex items-center gap-2">
                                <span className="truncate">{s.name}</span>
                                <span className="font-mono text-[11px] text-muted-foreground shrink-0">{s.code ?? "—"}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-[13px]">Shop</Label>
                    <Input value={user.shop?.name ?? user.shopId ?? "—"} disabled className="h-10 text-sm" />
                  </div>
                )}
                {isOwner && (
                  <>
                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newUser.invGrant}
                        onChange={(e) => setNewUser((s) => ({ ...s, invGrant: e.target.checked }))}
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="font-medium">Grant inventory access <span className="text-muted-foreground font-normal">(staff can open + edit stock)</span></span>
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <span className="font-medium shrink-0">Counter</span>
                      <CounterSelect
                        value={newUser.counterId || null}
                        counters={shopCounters}
                        onChange={(cid) => setNewUser((s) => ({ ...s, counterId: cid ?? "" }))}
                        className="flex-1 min-w-0"
                      />
                    </label>
                  </>
                )}
                {error && <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">{error}</div>}
              </div>
              <DialogFooter className="p-4 gap-2 sm:justify-end border-t bg-muted/20">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating} className="h-10 px-5">Cancel</Button>
                <Button type="submit" disabled={creating || offline} title={offline ? reason : undefined} className="h-10 px-6 min-w-[130px]">{creating ? "Creating…" : "Create user"}</Button>
              </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Card className="py-0 overflow-hidden">
            <CardHeader className="py-2.5 px-4 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-[13px] font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> {isSuper ? "All Users" : "Shop Users"} {loading && <span className="text-xs font-normal text-muted-foreground">loading…</span>}
                {isFiltered && !loading && <Badge className="font-normal">filtered</Badge>}
              </CardTitle>
              {!loading && users.length > 0 && (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {isFiltered ? `${filtered.length} of ${users.length}` : `${users.length} user${users.length === 1 ? "" : "s"}`}
                </span>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[60vh]">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10 shadow-[0_1px_0_var(--border)]">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">User</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold w-32">Role</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Shop</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Counter</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold w-28">Stock</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-semibold w-28">Status</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && users.length === 0 ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={`sk-${i}`} className="hover:bg-transparent">
                          <TableCell colSpan={7}><div className="h-11 rounded-md bg-muted/60 animate-pulse" /></TableCell>
                        </TableRow>
                      ))
                    ) : users.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7}>
                          <div className="p-12 text-center">
                            <Users className="w-8 h-8 mx-auto text-muted-foreground/50" />
                            <div className="text-sm text-muted-foreground mt-3">No users found. Create one with the button above.</div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7}>
                          <div className="p-12 text-center">
                            <Search className="w-8 h-8 mx-auto text-muted-foreground/50" />
                            <div className="text-sm font-medium mt-3">No users match these filters</div>
                            <div className="text-xs text-muted-foreground mt-1">Try a shorter search or clear the filters</div>
                            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">Clear filters</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((u) => {
                        const role = ROLE_META[u.role] ?? { label: u.role, dot: "bg-muted-foreground" };
                        const isSelf = u.id === user.id;
                        return (
                          <TableRow
                            key={u.id}
                            className="hover:bg-primary/[0.04] cursor-pointer group"
                            onClick={() => setSelectedId(u.id)}
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === "Enter") setSelectedId(u.id); }}
                            title="Open user details"
                          >
                            {/* User — avatar + name + email */}
                            <TableCell className="py-2.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                                  {initials(u.name || "?")}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[13px] font-semibold leading-tight truncate flex items-center gap-1.5">
                                    {u.name}
                                    {isSelf && <Badge variant="secondary" className="text-[10px] h-4 px-1.5 rounded-full">YOU</Badge>}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">{u.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            {/* Role */}
                            <TableCell className="py-2.5">
                              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${role.dot}`} />
                                {role.label}
                              </span>
                            </TableCell>
                            {/* Shop */}
                            <TableCell className="py-2.5 text-[13px] text-muted-foreground">{shopNameOf(u)}</TableCell>
                            {/* Counter */}
                            <TableCell className="py-2.5">
                              {u.role === "STAFF" ? (
                                u.counterId ? (
                                  <span className="text-[13px] font-medium">{counterNameOf(u) ?? "—"}</span>
                                ) : (
                                  <span className="inline-block h-5 px-2 leading-5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border" title="Falls back to emptiest counter at login">Auto</span>
                                )
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            {/* Stock access */}
                            <TableCell className="py-2.5">
                              {u.role === "STAFF" ? (
                                <span className="inline-flex items-center gap-1.5 text-[13px]">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${u.canManageInventory ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                                  <span className={u.canManageInventory ? "font-medium" : "text-muted-foreground"}>{u.canManageInventory ? "ON" : "OFF"}</span>
                                </span>
                              ) : u.role === "SHOP_OWNER" ? (
                                <span className="text-[13px] font-medium text-primary">Full</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            {/* Status */}
                            <TableCell className="py-2.5">
                              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${u.isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                                {u.isActive ? "Active" : "Disabled"}
                              </span>
                            </TableCell>
                            <TableCell className="py-2.5 pr-3">
                              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
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
        canAssignCounter={!!selected && isOwner && selected.role === "STAFF"}
        counters={shopCounters}
        busy={busy || loading}
        onToggleStatus={() => selected && handleToggleStatus(selected)}
        onToggleStock={() => selected && handleToggleInventory(selected)}
        onAssignCounter={(cid) => selected && handleAssignCounter(selected, cid)}
        onDelete={() => selected && handleDeleteUser(selected)}
      />
    </>
  );
}
