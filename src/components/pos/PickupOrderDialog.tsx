"use client";

import { useCallback, useEffect, useState } from "react";
import { PackageSearch, Loader2, Lock, PhoneCall } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { fetchOrder, fetchOrders } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Order } from "@/types";

const SETTLABLE = ["pending", "confirmed", "packed"];

function maskPhone(phone: string | null | undefined): string {
  const p = (phone ?? "").replace(/\D/g, "");
  if (p.length < 4) return "—";
  return `••••••${p.slice(-4)}`;
}

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "pending") return <Badge variant="secondary">Pending</Badge>;
  if (s === "confirmed") return <Badge variant="default">Confirmed</Badge>;
  if (s === "packed") return <Badge variant="default" className="bg-blue-600">Packed</Badge>;
  if (s === "delivered") return <Badge variant="default" className="bg-emerald-600">Delivered</Badge>;
  if (s === "cancelled") return <Badge variant="destructive">Cancelled</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export function PickupOrderButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full h-11 rounded-2xl text-[13px] font-semibold gap-1.5 shrink-0" title="Find an online pickup order by ID or phone">
        <PackageSearch className="w-4 h-4" /> Pickup order
      </Button>
      {open && <PickupOrderDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}

function PickupOrderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const cartCount = useCartStore((s) => s.items.length);
  const loadPickupOrder = useCartStore((s) => s.loadPickupOrder);

  const [query, setQuery] = useState("");
  const [queue, setQueue] = useState<Order[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneCheck, setPhoneCheck] = useState("");
  const [loaded, setLoaded] = useState(false);

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    setError(null);
    try {
      const res = await fetchOrders({ channel: "online", limit: 50 });
      setQueue((res.orders ?? []).filter((o) => SETTLABLE.includes(String(o.status).toLowerCase())));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load pickup queue");
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(null);
      setPhoneCheck("");
      setLoaded(false);
      setError(null);
      void loadQueue();
    }
  }, [open, loadQueue]);

  async function lookup(q: string) {
    const term = q.trim();
    if (!term) return;
    setDetailLoading(true);
    setError(null);
    setSelected(null);
    setPhoneCheck("");
    setLoaded(false);
    try {
      // Order numbers first (exact ID lookup)…
      try {
        const order = await fetchOrder(term);
        pickOrder(order);
        return;
      } catch {
        // …then fall back to phone search.
      }
      const digits = term.replace(/\D/g, "");
      const res = await fetchOrders({ channel: "online", customer: digits.length >= 4 ? digits : term, limit: 20 });
      const match = (res.orders ?? []).find((o) => SETTLABLE.includes(String(o.status).toLowerCase()));
      if (!match) {
        setError("No payable pickup order found for that ID or phone.");
        return;
      }
      pickOrder(await fetchOrder(match.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setDetailLoading(false);
    }
  }

  function pickOrder(order: Order) {
    if (order.channel && order.channel !== "online") {
      setError("That's a counter sale, not an online pickup order.");
      return;
    }
    if (!SETTLABLE.includes(String(order.status).toLowerCase())) {
      setError(`Order ${order.orderNumber ?? ""} is ${order.status} — only pending/confirmed/packed can be collected.`);
      return;
    }
    setSelected(order);
  }

  async function selectFromQueue(id: string) {
    setDetailLoading(true);
    setError(null);
    setPhoneCheck("");
    setLoaded(false);
    try {
      pickOrder(await fetchOrder(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open order");
    } finally {
      setDetailLoading(false);
    }
  }

  const orderPhone = (selected?.customer as unknown as { phone?: string | null } | null)?.phone
    ?? (selected as unknown as { deliveryPhone?: string | null } | null)?.deliveryPhone
    ?? null;
  const needsVerify = !!orderPhone && orderPhone.replace(/\D/g, "").length >= 4;
  const verified = !needsVerify || phoneCheck.replace(/\D/g, "") === orderPhone!.replace(/\D/g, "").slice(-4);
  const cartBlocked = cartCount > 0;

  function handleLoad() {
    if (!selected || !verified || cartBlocked) return;
    if (loadPickupOrder(selected)) {
      setLoaded(true);
      setTimeout(() => onOpenChange(false), 600);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden max-h-[calc(100%-3rem)] flex flex-col">
        <DialogHeader className="p-5 pb-3 shrink-0">
          <DialogTitle className="text-[17px]">Collect pickup order</DialogTitle>
          <DialogDescription className="text-[13px]">
            Search by order ID or customer phone. Cart loads the order&apos;s frozen prices — collect payment to hand over.
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 pb-4 space-y-4 overflow-auto">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ORD-20250115-… or 98765…"
              className="h-11 text-sm font-mono"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && lookup(query)}
            />
            <Button onClick={() => lookup(query)} disabled={detailLoading || !query.trim()} className="h-11 px-5">
              {detailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Find"}
            </Button>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-2.5 py-1.5 text-[13px] font-medium text-destructive">{error}</div>
          )}

          {selected ? (
            <div className="rounded-2xl border overflow-hidden">
              <div className="p-4 space-y-2 bg-muted/30">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-sm">{selected.orderNumber}</span>
                  {statusBadge(selected.status)}
                  <span className="ml-auto font-black text-lg tabular-nums">{formatINR(selected.total)}</span>
                </div>
                <div className="text-[13px] text-muted-foreground">
                  {(selected.customer as unknown as { name?: string } | null)?.name ?? "Walk-in"} · {maskPhone(orderPhone)}
                </div>
                <Separator />
                <ul className="space-y-1 text-[13px]">
                  {selected.items.map((it, i) => (
                    <li key={it.id ?? i} className="flex justify-between gap-2">
                      <span className="min-w-0 truncate">
                        {it.name} <span className="text-muted-foreground">× {it.quantity ?? it.weight ?? 1}</span>
                      </span>
                      <span className="font-semibold tabular-nums shrink-0">{formatINR(it.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 space-y-3">
                {needsVerify ? (
                  <div className="space-y-1.5">
                    <Label className="text-[13px] flex items-center gap-1.5">
                      <PhoneCall className="w-3.5 h-3.5" /> Ask the customer: phone ending in…?
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={phoneCheck}
                        onChange={(e) => setPhoneCheck(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder={`Ends ${maskPhone(orderPhone)}`}
                        inputMode="numeric"
                        className="h-10 text-sm font-mono"
                      />
                      <span className={`flex items-center text-[13px] font-semibold ${verified ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {verified ? "Verified ✓" : "Last 4 digits"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No phone on this order — confirm identity at the counter.</p>
                )}
                {cartBlocked && (
                  <p className="text-[13px] font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Clear the cart first — a pickup order needs an empty cart.
                  </p>
                )}
                {loaded ? (
                  <p className="text-[13px] font-semibold text-emerald-600">Loaded — collect payment from the cart.</p>
                ) : (
                  <Button onClick={handleLoad} disabled={!verified || cartBlocked} className="w-full h-11">
                    Load {selected.items.length} items to cart
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setPhoneCheck(""); }} className="w-full">
                  ← Back to queue
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Awaiting pickup</div>
              {queueLoading ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
              ) : queue.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending pickup orders right now.</p>
              ) : (
                queue.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => selectFromQueue(o.id)}
                    className="w-full flex items-center gap-2 rounded-xl border px-3 py-2 text-left hover:border-primary/50 transition-colors"
                  >
                    <span className="font-mono text-[13px] font-bold truncate">{o.orderNumber}</span>
                    {statusBadge(o.status)}
                    <span className="ml-auto text-sm font-bold tabular-nums shrink-0">{formatINR(o.total)}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <DialogFooter className="p-4 gap-3 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-11 px-6 text-sm">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
