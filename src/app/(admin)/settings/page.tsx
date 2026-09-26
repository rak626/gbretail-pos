"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore, refreshShopCounters } from "@/store/authStore";
import { apiClient } from "@/lib/apiClient";
import { useConfirm } from "@/components/confirm-dialog";
import { useOfflineBlock } from "@/hooks/useOfflineBlock";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import ReceiptDrawer, { type ReceiptDraft } from "@/components/settings/ReceiptDrawer";
import { Settings, Monitor, Plus, Trash2, Store, Users, ChevronRight, Receipt, Pencil } from "lucide-react";

type ShopUser = { id: string; name: string; email: string; role: string; isActive: boolean; counterId?: string | null };

/** First missing generic number: {Counter 1, Counter 3} → "Counter 2". */
export function nextCounterName(existing: { name: string }[]): string {
  const taken = new Set<number>();
  for (const c of existing) {
    const m = /^\s*counter\s+(\d+)\s*$/i.exec(c.name ?? "");
    if (m) taken.add(parseInt(m[1], 10));
  }
  let n = 1;
  while (taken.has(n)) n += 1;
  return `Counter ${n}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const shop = useAuthStore((s) => s.shop);
  const { confirm, notify } = useConfirm();
  const { offline, block, reason } = useOfflineBlock(notify);
  const [counters, setCounters] = useState<{ id: string; name: string; isActive: boolean; shopId: string }[]>([]);
  const [shopUsers, setShopUsers] = useState<ShopUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Receipt identity form (per-shop bill header). Hydrated from the shop record
  // (login/me only carry id+name-era snapshots for old sessions).
  // Edited in a modal; the card below shows a compact summary row.
  const [receipt, setReceipt] = useState<ReceiptDraft>({ receiptName: "", gstin: "", upiId: "", phone: "", receiptFooter: "" });
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptSaving, setReceiptSaving] = useState(false);
  const [receiptError, setReceiptError] = useState("");

  const load = async () => {
    if (!user?.shopId) return;
    setLoading(true);
    try {
      const cData = await apiClient.get<{ counters: typeof counters }>("/api/counters", { shopId: user.shopId } as any);
      setCounters(cData.counters);
      try {
        const uData = await apiClient.get<{ users: ShopUser[] }>("/api/users");
        setShopUsers(uData.users.filter((u) => u.role === "STAFF"));
      } catch {
        setShopUsers([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.shopId]);

  // Hydrate full shop incl. receipt config (authStore.shop may predate the fields)
  useEffect(() => {
    if (!user?.shopId) return;
    apiClient.get<{ shop: Record<string, unknown> }>(`/api/shops/${user.shopId}`)
      .then((d) => {
        const s = d.shop ?? {};
        const str = (v: unknown) => (v == null ? "" : String(v));
        setReceipt({
          receiptName: str(s.receiptName),
          gstin: str(s.gstin),
          upiId: str(s.upiId),
          phone: str(s.phone),
          receiptFooter: str(s.receiptFooter),
        });
        useAuthStore.setState({ shop: d.shop as never });
      })
      .catch(() => {
        // fall back to whatever the auth snapshot carries
        const s = (useAuthStore.getState().shop ?? {}) as Record<string, unknown>;
        const str = (v: unknown) => (v == null ? "" : String(v));
        setReceipt({
          receiptName: str(s.receiptName),
          gstin: str(s.gstin),
          upiId: str(s.upiId),
          phone: str(s.phone),
          receiptFooter: str(s.receiptFooter),
        });
      });
  }, [user?.shopId]);

  const handleSaveReceipt = async () => {
    if (!user?.shopId) return;
    if (await block()) return;
    setReceiptSaving(true);
    setReceiptError("");
    try {
      const trim = (v: string) => (v.trim() === "" ? null : v.trim());
      const data = await apiClient.patch<{ shop: Record<string, unknown> }>(`/api/shops/${user.shopId}`, {
        receiptName: trim(receipt.receiptName),
        gstin: trim(receipt.gstin),
        upiId: trim(receipt.upiId),
        phone: trim(receipt.phone),
        receiptFooter: trim(receipt.receiptFooter),
      });
      useAuthStore.setState({ shop: data.shop as never });
      setReceiptOpen(false);
      await notify({ title: "Receipt settings saved", description: "New bills print with this header." });
    } catch (e) {
      setReceiptError(e instanceof Error ? e.message : "Failed to save receipt settings");
    } finally {
      setReceiptSaving(false);
    }
  };

  const staffOf = (counterId: string) => shopUsers.filter((u) => u.counterId === counterId);
  const detail = counters.find((c) => c.id === detailId) ?? null;
  const detailStaff = detail ? staffOf(detail.id) : [];
  const previewName = nextCounterName(counters);

  const handleDeleteCounter = async () => {
    if (!detail) return;
    if (await block()) return;
    const attached = staffOf(detail.id);
    const ok = await confirm({
      title: `Delete counter "${detail.name}"?`,
      description:
        attached.length > 0
          ? `${attached.map((s) => s.name).join(", ")} ${attached.length === 1 ? "bills" : "bill"} here — they will fall back to auto-assign at next login. Past bills remain.`
          : "Bills already recorded on this counter will remain.",
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/counters/${detail.id}`);
      setDetailId(null);
      await load();
      // Header picker reads the login-time list — sync it too.
      await refreshShopCounters();
    } catch (e) {
      await notify({ title: "Delete failed", description: e instanceof Error ? e.message : "Delete failed", danger: true });
    } finally {
      setDeleting(false);
    }
  };

  const handleAddCounter = async () => {
    if (adding) return;
    if (await block()) return;
    setAdding(true);
    setError("");
    try {
      // No name sent — backend creates the first missing number (Counter 2 fills gaps).
      await apiClient.post("/api/counters", {});
      setAddOpen(false);
      await load();
      // Header picker reads the login-time list — sync it too.
      await refreshShopCounters();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setAddOpen(false);
    } finally {
      setAdding(false);
    }
  };

  if (!user) return <><div className="p-8 text-center text-sm">Loading...</div></>;

  // SUPER_ADMIN has no shop context — shop settings live in Admin–Shops.
  if (user.role === "SUPER_ADMIN") redirect("/admin");

  if (!user.shopId) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-md w-full">
            <CardContent className="p-6 text-center">
              <Store className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <div className="font-semibold">No Shop Assigned</div>
              <div className="text-xs text-muted-foreground mt-1">Your account has no shop. Super Admins manage shops from Admin. Contact admin.</div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const canManage = user.role === "SHOP_OWNER" || user.role === "SUPER_ADMIN";

  return (
    <>
      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold flex items-center gap-2"><Settings className="w-4 h-4 text-primary" /> Settings — {shop?.name ?? "Shop"}</h1>
            <Badge variant="outline">{user.role}</Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">Shared inventory • staff bill on assigned counters • tracked who billed</span>
          </div>

          {error && <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">{error}</div>}

          <Card>
            <CardHeader className="py-3 border-b"><CardTitle className="text-sm flex items-center gap-2"><Store className="w-4 h-4" /> Shop Info</CardTitle></CardHeader>
            <CardContent className="p-3 space-y-1 text-sm">
              <div><span className="text-muted-foreground">Shop:</span> <span className="font-semibold">{shop?.name ?? "—"}</span> <span className="font-mono text-xs text-muted-foreground">{shop?.code ?? shop?.id ?? user.shopId ?? "—"}</span></div>
              <div><span className="text-muted-foreground">You:</span> {user.name} ({user.email}) — {user.role}</div>
              <div className="text-xs text-muted-foreground">Counters in this shop share inventory. Staff bill on their assigned counter; orders record which counter & who billed.</div>
              {(user.role === "SHOP_OWNER" || user.role === "SUPER_ADMIN") && (
                <div className="pt-2">
                  <Link href="/users" className="text-xs text-primary hover:underline inline-flex items-center gap-1"><Users className="w-3 h-3" /> Manage users of this shop → Users</Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 border-b">
              <CardTitle className="text-sm flex items-center gap-2"><Receipt className="w-4 h-4" /> Receipt — bill header</CardTitle>
              {canManage && (
                <CardAction>
                  <Button variant="outline" size="sm" onClick={() => { setReceiptError(""); setReceiptOpen(true); }} disabled={offline} title={offline ? reason : "Edit receipt header"} className="h-8 gap-1.5">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                </CardAction>
              )}
            </CardHeader>
            <CardContent className="p-3">
              <dl className="grid grid-cols-[64px_1fr] gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-xs text-muted-foreground self-center">Name</dt>
                <dd className="font-medium truncate" title={receipt.receiptName || shop?.name || "—"}>{receipt.receiptName || shop?.name || "—"}</dd>
                <dt className="text-xs text-muted-foreground self-center">GSTIN</dt>
                <dd className="font-mono text-[13px] truncate" title={receipt.gstin || "—"}>{receipt.gstin || <span className="text-muted-foreground">—</span>}</dd>
                <dt className="text-xs text-muted-foreground self-center">UPI id</dt>
                <dd className="font-mono text-[13px] truncate" title={receipt.upiId || "—"}>{receipt.upiId || <span className="text-muted-foreground">—</span>}</dd>
                <dt className="text-xs text-muted-foreground self-center">Phone</dt>
                <dd className="font-mono text-[13px] truncate" title={receipt.phone || "—"}>{receipt.phone || <span className="text-muted-foreground">—</span>}</dd>
                <dt className="text-xs text-muted-foreground self-center">Footer</dt>
                <dd className="text-[13px] truncate" title={receipt.receiptFooter || "—"}>{receipt.receiptFooter || <span className="text-muted-foreground">—</span>}</dd>
              </dl>
              {!canManage && <div className="text-[11px] text-muted-foreground mt-2">STAFF view — read-only. Only SHOP_OWNER can change receipt settings.</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 border-b">
              <CardTitle className="text-sm flex items-center gap-2"><Monitor className="w-4 h-4" /> Counters ({counters.length})</CardTitle>
              <CardAction>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Shared inventory</Badge>
                  {canManage && (
                    <Button size="sm" className="h-7 gap-1" onClick={() => setAddOpen(true)} disabled={offline} title={offline ? reason : undefined}><Plus className="w-3.5 h-3.5" /> Add</Button>
                  )}
                </div>
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              {!canManage && counters.length > 0 && <div className="px-3 pt-3 text-xs text-muted-foreground">STAFF view — read-only. Only SHOP_OWNER can manage counters.</div>}
              <div className="divide-y">
                {counters.map((c) => {
                  const n = staffOf(c.id).length;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setDetailId(c.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                      title="View counter details"
                    >
                      <span className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                        <Monitor className="w-4 h-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold truncate">{c.name}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {n === 0 ? "No staff assigned" : `${n} staff assigned`}
                        </span>
                      </span>
                      {!c.isActive && <Badge variant="secondary" className="text-[10px] shrink-0">Inactive</Badge>}
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
                {counters.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">{canManage ? "No counters yet — add one." : "No counters yet."}</div>}
              </div>
            </CardContent>
          </Card>

          {!canManage && <div className="text-[11px] text-muted-foreground px-1">You are logged in as STAFF. You bill on your assigned counter — orders track who billed. User management is not available for this role.</div>}

          {/* Add counter modal — names are automatic (first missing number) */}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogContent className="sm:max-w-[380px] p-0 gap-0 overflow-hidden">
              <DialogHeader className="p-5 pb-3">
                <DialogTitle className="text-[15px] flex items-center gap-2"><Monitor className="w-4 h-4 text-primary" /> Add counter</DialogTitle>
                <DialogDescription className="text-xs">
                  Counter names are automatic. The new counter will be created as:
                </DialogDescription>
              </DialogHeader>
              <div className="px-5 pb-2">
                <div className="flex items-center gap-2.5 rounded-xl border bg-muted/30 px-4 py-3">
                  <span className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    <Monitor className="w-4 h-4" />
                  </span>
                  <span className="text-[15px] font-bold">{previewName}</span>
                </div>
              </div>
              <DialogFooter className="p-4 gap-2 sm:justify-end">
                <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding} className="h-9">Cancel</Button>
                <Button onClick={handleAddCounter} disabled={adding || offline} title={offline ? reason : undefined} className="h-9 px-5">
                  {adding ? "Creating..." : `Create ${previewName}`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Counter detail modal — assigned staff + delete */}
          <Dialog open={detail !== null} onOpenChange={(v) => !v && setDetailId(null)}>
            <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden">
              <DialogHeader className="p-5 pb-3 border-b bg-muted/20">
                <div className="flex items-center gap-3 pr-6">
                  <span className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Monitor className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <DialogTitle className="text-[16px] truncate">{detail?.name ?? ""}</DialogTitle>
                    <DialogDescription>
                      {detailStaff.length === 0 ? "No staff assigned" : `${detailStaff.length} staff assigned`}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="px-3 py-2 max-h-[300px] overflow-auto">
                {detailStaff.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">Nobody bills here yet. Assign staff from Users.</div>
                ) : (
                  detailStaff.map((s) => (
                    <div key={s.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
                      <span className="w-8 h-8 rounded-full bg-muted border text-[11px] font-bold flex items-center justify-center shrink-0 text-muted-foreground">
                        {initials(s.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold truncate">{s.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{s.email}</div>
                      </div>
                      {s.isActive
                        ? <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20 shrink-0">Active</Badge>
                        : <Badge variant="destructive" className="text-[10px] shrink-0">Disabled</Badge>}
                    </div>
                  ))
                )}
              </div>
              {canManage && (
                <DialogFooter className="p-4 gap-2 sm:justify-between border-t bg-muted/20">
                    <Button variant="ghost" size="sm" onClick={handleDeleteCounter} disabled={deleting || offline} title={offline ? reason : undefined} className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" /> {deleting ? "Deleting..." : "Delete counter"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDetailId(null)}>Close</Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>

          {/* Receipt editor drawer — bill header fields */}
          <ReceiptDrawer
            open={receiptOpen}
            onOpenChange={setReceiptOpen}
            draft={receipt}
            setDraft={setReceipt}
            error={receiptError}
            saving={receiptSaving}
            offline={offline}
            offlineReason={reason}
            shopName={shop?.name ?? undefined}
            onSave={() => void handleSaveReceipt()}
          />
        </div>
      </div>
    </>
  );
}
