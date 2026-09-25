"use client";

import { useEffect, useState, useCallback } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchCustomer, softDeleteCustomer, restoreCustomer, fetchOrders, fetchLedger } from "@/lib/api";
import { useConfirm } from "@/components/confirm-dialog";
import { formatINR } from "@/lib/utils";
import { generateReceiptHTML } from "@/lib/print";
import type { Customer } from "@/db/database";
import CustomerFormDialog from "./CustomerFormDialog";
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  StickyNote,
  Wallet,
  ShoppingBag,
  BookOpen,
  Calendar,
  CreditCard,
  Trash2,
  Pencil,
  RotateCcw,
  Receipt,
  MessageCircle,
  FileText,
  AlertTriangle,
  Clock3,
  CheckCircle2,
  Printer,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type DrawerProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customerId: string | null;
  onDeleted?: () => void;
  onUpdated?: () => void;
};

// inner components for overlay/popup positioned as right drawer
function DrawerOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Backdrop>) {
  return (
    <DialogPrimitive.Backdrop
      className={cn("fixed inset-0 z-50 bg-black/40 backdrop-blur-sm duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0", className)}
      {...props}
    />
  );
}

function DrawerContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Popup>) {
  return (
    <DialogPrimitive.Portal>
      <DrawerOverlay />
      <DialogPrimitive.Popup
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-[560px] flex-col bg-background border-l shadow-2xl duration-300 data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

export default function CustomerDrawer({ open, onOpenChange, customerId, onDeleted, onUpdated }: DrawerProps) {
  const { confirm, notify } = useConfirm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customer, setCustomer] = useState<(Customer & { email?: string | null; address?: string | null; notes?: string | null; creditLimit?: number | null }) | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ledger, setLedger] = useState<{ pending: { count: number; amount: number }; overdue: { count: number; amount: number }; settled: { count: number; amount: number } } | null>(null);
  const [stats, setStats] = useState<{ avgOrderValue: number; daysSinceLastOrder: number | null; favoriteCategory: string | null; topProducts: Array<{ name: string; qty: number; spent: number }> } | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"orders" | "ledger">("orders");
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const load = useCallback(async (id: string, page = 1) => {
    setLoading(true);
    setError("");
    try {
      // fetch customer detail + paged orders via customer detail endpoint (orders embedded)
      const data = await fetchCustomer(id);
      const c = data.customer as any;
      setCustomer(c);
      // orders are included as c.orders (from include) but also we fetch via /api/orders for pagination more reliable
      // Use data's embedded orders for now + also fetchOrders for page control
      const ordRes = await fetchOrders({ customerId: id, page, limit: 10 });
      setOrders(ordRes.orders as any[]);
      setOrdersTotal(ordRes.total as number);
      setOrdersPage(page);
      setLedger(data.ledger as any);
      setStats(data.stats as any);
      // ledger entries embedded
      setLedgerEntries((c.ledgerEntries ?? []) as any[]);
      // also fetch ledger for tab if needed
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customer");
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && customerId) {
      setActiveTab("orders");
      setOrdersPage(1);
      load(customerId, 1);
    } else if (!open) {
      // reset after close animation
      const t = setTimeout(() => {
        setCustomer(null);
        setOrders([]);
        setLedger(null);
        setStats(null);
        setError("");
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open, customerId, load]);

  const handleOrdersPage = async (next: number) => {
    if (!customerId) return;
    setOrdersLoading(true);
    try {
      const r = await fetchOrders({ customerId, page: next, limit: 10 });
      setOrders(r.orders as any[]);
      setOrdersTotal(r.total as number);
      setOrdersPage(next);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleLedgerTab = async () => {
    if (!customerId) return;
    setActiveTab("ledger");
    setLedgerLoading(true);
    try {
      const res = await fetchLedger({ customerId, limit: 20 });
      // res.entries
      setLedgerEntries(res.entries as any[]);
    } catch {}
    setLedgerLoading(false);
  };

  const handleSoftDelete = async () => {
    if (!customer || !customerId) return;
    const hasDue = customer.balance > 0;
    const ok = await confirm({
      title: `Hide customer "${customer.name}"?`,
      description: hasDue
        ? `They have dues of ${formatINR(customer.balance)}. Orders & Khata will remain. You can restore later.`
        : "Orders & Khata will remain. You can restore later. This is soft-delete.",
      confirmText: "Hide customer",
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await softDeleteCustomer(customerId);
      onOpenChange(false);
      onDeleted?.();
    } catch (e) {
      await notify({ title: "Delete failed", description: e instanceof Error ? e.message : "Delete failed", danger: true });
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async () => {
    if (!customerId) return;
    try {
      await restoreCustomer(customerId);
      await load(customerId, ordersPage);
      onUpdated?.();
    } catch (e) {
      await notify({ title: "Restore failed", description: e instanceof Error ? e.message : "Restore failed", danger: true });
    }
  };

  const handleEditSaved = async (updated: Customer) => {
    setCustomer(updated as any);
    onUpdated?.();
    if (customerId) {
      // refresh stats (in case phone/name changed)
      load(customerId, ordersPage);
    }
  };

  if (!open) return null;

  const isDeleted = !!(customer as any)?.deletedAt;
  const avg = stats?.avgOrderValue ?? (customer && customer.totalOrders ? (customer.totalSpent ?? 0) / (customer.totalOrders ?? 1) : 0);
  const daysSince = stats?.daysSinceLastOrder;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="overflow-hidden">
        {/* Header */}
        <div className="shrink-0 h-[56px] flex items-center justify-between px-4 border-b bg-card">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border flex items-center justify-center text-primary shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold leading-none truncate max-w-[220px]">{loading ? "Loading..." : customer?.name ?? "Customer"}</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                {customer?.phone ? <><Phone className="w-3 h-3" /> {customer.phone}</> : "No phone"}
                {isDeleted && <Badge variant="destructive" className="text-[10px] ml-1">Hidden</Badge>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)} aria-label="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-destructive mb-2" />
            <div className="text-sm font-semibold text-destructive">{error}</div>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => customerId && load(customerId)}>Retry</Button>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : customer ? (
          <>
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 space-y-4">
                {/* Actions row */}
                <div className="flex flex-wrap gap-1.5">
                  {!isDeleted ? (
                    <>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setEditOpen(true)}>
                        <Pencil className="w-3 h-3" /> Edit
                      </Button>
                      {customer.phone && (
                        <>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => window.open(`tel:${customer.phone}`, "_self")}>
                            <Phone className="w-3 h-3" /> Call
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => window.open(`https://wa.me/91${customer.phone}`, "_blank")}>
                            <MessageCircle className="w-3 h-3" /> WhatsApp
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleSoftDelete} disabled={deleting}>
                        <Trash2 className="w-3 h-3" /> {deleting ? "Hiding..." : "Hide"}
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleRestore}>
                      <RotateCcw className="w-3 h-3" /> Restore
                    </Button>
                  )}
                </div>

                {/* Contact details card */}
                <Card className="py-0">
                  <CardContent className="p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold flex items-center gap-1"><User className="w-3.5 h-3.5 text-muted-foreground" /> Contact</span>
                      {customer.balance > 0 ? <Badge variant="destructive" className="text-[11px]">Due ₹{customer.balance.toFixed(0)}</Badge> : <Badge variant="outline" className="text-[11px]">No dues</Badge>}
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 gap-1.5 text-[13px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="font-mono">{customer.phone || "— No phone"}</span>
                        {customer.phone && <span className="text-[11px] text-muted-foreground">• searchable</span>}
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{(customer as any).email || "— No email"}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="flex-1 leading-snug">{(customer as any).address || "— No address"}</span>
                      </div>
                      {(customer as any).creditLimit != null && (
                        <div className="flex items-center gap-2">
                          <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Credit limit: <span className="font-semibold">{formatINR(Number((customer as any).creditLimit))}</span></span>
                        </div>
                      )}
                      {(customer as any).notes && (
                        <div className="flex items-start gap-2">
                          <StickyNote className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="flex-1 leading-snug bg-muted/40 rounded px-2 py-1 text-xs">{(customer as any).notes}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* KPI grid */}
                <div className="grid grid-cols-3 gap-2">
                  <Card className="py-0">
                    <CardContent className="p-2.5 text-center">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold flex items-center justify-center gap-1"><ShoppingBag className="w-3 h-3" /> Orders</div>
                      <div className="text-lg font-black leading-none mt-1">{customer.totalOrders ?? 0}</div>
                      <div className="text-[11px] text-muted-foreground">total</div>
                    </CardContent>
                  </Card>
                  <Card className="py-0">
                    <CardContent className="p-2.5 text-center">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold flex items-center justify-center gap-1"><Wallet className="w-3 h-3" /> Spent</div>
                      <div className="text-lg font-black leading-none mt-1">{formatINR(customer.totalSpent ?? 0).replace(".00","")}</div>
                      <div className="text-[11px] text-muted-foreground">lifetime</div>
                    </CardContent>
                  </Card>
                  <Card className="py-0">
                    <CardContent className="p-2.5 text-center">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">Avg order</div>
                      <div className="text-lg font-black leading-none mt-1">{formatINR(avg).replace(".00","")}</div>
                      <div className="text-[11px] text-muted-foreground">{customer.totalOrders ? `per ${customer.totalOrders} orders` : "no orders"}</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Card className="py-0 gap-0">
                    <CardContent className="p-2.5">
                      <div className="text-[11px] text-muted-foreground font-semibold">Last order</div>
                      <div className="text-xs font-bold">
                        {customer.lastOrderAt ? new Date(customer.lastOrderAt as unknown as string).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "— Never"}
                      </div>
                      {daysSince != null && <div className="text-[11px] text-muted-foreground">{daysSince === 0 ? "Today" : `${daysSince}d ago`}</div>}
                    </CardContent>
                  </Card>
                  <Card className="py-0 gap-0">
                    <CardContent className="p-2.5">
                      <div className="text-[11px] text-muted-foreground font-semibold">First order</div>
                      <div className="text-xs font-bold">
                        {(customer as any).firstOrderAt ? new Date((customer as any).firstOrderAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "—"}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">{stats?.favoriteCategory ? `Fav: ${stats.favoriteCategory}` : "No fav yet"}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Dues summary */}
                {ledger && (
                  <Card className="py-0 gap-0 border-dashed">
                    <CardContent className="p-2.5 flex flex-row items-center justify-between gap-2">
                      <div className="flex gap-2">
                        <Badge variant={ledger.pending.count >0 ? "secondary" : "outline"} className="text-[11px] gap-1"><Clock3 className="w-3 h-3" /> Pending {ledger.pending.count} • {formatINR(ledger.pending.amount).replace(".00","")}</Badge>
                        <Badge variant={ledger.overdue.count>0 ? "destructive" : "outline"} className="text-[11px]">{ledger.overdue.count} overdue</Badge>
                      </div>
                      <Badge variant="outline" className="text-[11px] gap-1"><CheckCircle2 className="w-3 h-3 text-primary" /> Settled {ledger.settled.count}</Badge>
                    </CardContent>
                  </Card>
                )}

                {/* Top products */}
                {stats?.topProducts && stats.topProducts.length > 0 && (
                  <Card className="py-0 gap-0">
                    <CardContent className="p-3">
                      <div className="text-xs font-semibold flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-primary" /> Frequent buys</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {stats.topProducts.map((p) => (
                          <Badge key={p.name} variant="outline" className="text-[11px] gap-1 font-normal">
                            {p.name} <span className="text-muted-foreground">×{p.qty}</span> <span className="font-bold">₹{p.spent.toFixed(0)}</span>
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Tabs */}
                <div className="flex gap-1 p-1 rounded-lg bg-muted border">
                  <Button variant={activeTab==="orders" ? "default" : "ghost"} size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => setActiveTab("orders")}>
                    <Receipt className="w-3.5 h-3.5" /> Orders ({ordersTotal})
                  </Button>
                  <Button variant={activeTab==="ledger" ? "default" : "ghost"} size="sm" className="flex-1 h-7 text-xs gap-1" onClick={handleLedgerTab}>
                    <BookOpen className="w-3.5 h-3.5" /> Khata ({ledger?.pending.count ?? ledgerEntries.length})
                  </Button>
                </div>

                {activeTab === "orders" ? (
                  <Card className="py-0 overflow-hidden">
                    <CardContent className="p-0">
                      {ordersLoading ? (
                        <div className="p-6 flex justify-center"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                      ) : orders.length === 0 ? (
                        <div className="p-6 text-center">
                          <div className="w-10 h-10 rounded-xl bg-muted border flex items-center justify-center mx-auto mb-2"><ShoppingBag className="w-5 h-5 text-muted-foreground" /></div>
                          <div className="text-sm font-semibold">No orders yet</div>
                          <div className="text-xs text-muted-foreground mt-1">Bills for this customer will appear here.</div>
                        </div>
                      ) : (
                        <div className="overflow-auto max-h-[32vh]">
                          <Table>
                            <TableHeader className="sticky top-0 bg-card shadow-sm z-10">
                              <TableRow className="hover:bg-transparent h-8">
                                <TableHead className="text-xs">Order #</TableHead>
                                <TableHead className="text-xs">Date</TableHead>
                                <TableHead className="text-xs text-center">Items</TableHead>
                                <TableHead className="text-xs text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {orders.map((o: any) => {
                                const handlePrint = () => {
                                  const items = (o.items as any[]).map((it: any) => ({
                                    name: it.name,
                                    qty: `${it.quantity ?? it.weight ?? 1}`,
                                    quantity: it.quantity ?? null,
                                    weight: it.weight ?? null,
                                    price: it.price,
                                    perUnit: it.isCustom ? it.unit : it.weight ? "kg" : it.unit || "pcs",
                                    unit: it.unit,
                                    isCustom: it.isCustom,
                                    lineTotal: it.lineTotal,
                                  }));
                                  const html = generateReceiptHTML(items as any, o.total, o.discount || 0, customer.name, o.orderNumber || o.id);
                                  const w = window.open("", "_blank");
                                  if (w) { w.document.write(html); w.document.close(); w.print(); }
                                };
                                return (
                                  <TableRow key={o.id} className="hover:bg-muted/40 h-[48px]">
                                    <TableCell className="font-mono text-xs font-semibold">{o.orderNumber || o.id.slice(0,8)}</TableCell>
                                    <TableCell className="text-[11px]">{new Date(o.createdAt).toLocaleDateString("en-IN")} <span className="text-muted-foreground">{new Date(o.createdAt).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span></TableCell>
                                    <TableCell className="text-center"><Badge variant="outline" className="text-[11px]">{o.items.length}</Badge></TableCell>
                                    <TableCell className="text-right">
                                      <div className="font-bold text-xs">{formatINR(o.total)}</div>
                                      <div className="flex justify-end gap-1 mt-1">
                                        <Badge className="capitalize text-[10px] h-4" variant={o.paymentMethod==="khata"?"destructive":o.paymentMethod==="upi"?"default":"secondary"}>{o.paymentMethod}</Badge>
                                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={handlePrint} title="Print"><Printer className="w-3 h-3" /></Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                      {ordersTotal > 10 && (
                        <div className="flex items-center justify-between p-2 border-t bg-muted/20 text-xs">
                          <span className="text-muted-foreground">Page {ordersPage} of {Math.ceil(ordersTotal/10)} • {ordersTotal} orders</span>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" className="h-6 w-6 p-0" disabled={ordersPage<=1 || ordersLoading} onClick={() => handleOrdersPage(ordersPage-1)}><ChevronLeft className="w-3 h-3" /></Button>
                            <Button variant="outline" size="sm" className="h-6 w-6 p-0" disabled={ordersPage>=Math.ceil(ordersTotal/10) || ordersLoading} onClick={() => handleOrdersPage(ordersPage+1)}><ChevronRight className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="py-0 overflow-hidden">
                    <CardContent className="p-0">
                      {ledgerLoading ? (
                        <div className="p-6 flex justify-center"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                      ) : ledgerEntries.length === 0 ? (
                        <div className="p-6 text-center">
                          <div className="w-10 h-10 rounded-xl bg-muted border flex items-center justify-center mx-auto mb-2"><BookOpen className="w-5 h-5 text-muted-foreground" /></div>
                          <div className="text-sm font-semibold">No khata entries</div>
                          <div className="text-xs text-muted-foreground mt-1">Credit dues for this customer appear here.</div>
                        </div>
                      ) : (
                        <div className="overflow-auto max-h-[32vh]">
                          <Table>
                            <TableHeader className="sticky top-0 bg-card shadow-sm z-10">
                              <TableRow className="hover:bg-transparent h-8">
                                <TableHead className="text-xs">Due</TableHead>
                                <TableHead className="text-xs text-right">Amount</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {ledgerEntries.map((e: any) => {
                                const isOverdue = e.status==="pending" && new Date(e.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
                                return (
                                  <TableRow key={e.id} className={`h-[48px] ${isOverdue ? "bg-destructive/5" : ""}`}>
                                    <TableCell>
                                      <div className="text-xs font-medium">{new Date(e.dueDate).toLocaleDateString("en-IN")}</div>
                                      <div className="text-[11px] text-muted-foreground">{e.creditDays}d term {e.order?.orderNumber ? `• ${e.order.orderNumber.slice(0,10)}` : ""}</div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-xs">{formatINR(e.amount)}</TableCell>
                                    <TableCell>
                                      {e.status==="pending" ? isOverdue ? <Badge variant="destructive" className="text-[10px]">Overdue</Badge> : <Badge variant="secondary" className="text-[10px]">Pending</Badge> : <Badge className="bg-primary text-white text-[10px]">Settled</Badge>}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="text-[11px] text-muted-foreground text-center pb-1">
                  Customer since {customer.createdAt ? new Date(customer.createdAt as unknown as string).toLocaleDateString("en-IN") : "—"} • ID {customer.id.slice(0,8)}
                </div>
              </div>
            </ScrollArea>

            <div className="shrink-0 p-3 border-t bg-muted/20 flex gap-2">
              <Button variant="outline" className="flex-1 h-9 gap-1" onClick={() => onOpenChange(false)}>
                <X className="w-4 h-4" /> Close
              </Button>
              {!isDeleted && (
                <Button className="flex-1 h-9 gap-1" onClick={() => setEditOpen(true)}>
                  <Pencil className="w-4 h-4" /> Edit Customer
                </Button>
              )}
            </div>
          </>
        ) : null}

        {/* Edit dialog */}
        <CustomerFormDialog open={editOpen} onOpenChange={setEditOpen} customer={customer} onSaved={handleEditSaved} />
      </DrawerContent>
    </DialogPrimitive.Root>
  );
}
