"use client";

import { useEffect, useRef, useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { formatINR, formatUPIPaymentUrl } from "@/lib/utils";
import { generateReceiptHTML, printReceiptHTML } from "@/lib/print";
import { createOrder } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useOnlineStore } from "@/store/onlineStore";
import { useReceiptShop } from "@/hooks/useReceiptShop";
import { OFFLINE_REASON } from "@/hooks/useOfflineBlock";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";

// One idempotency key per bill attempt-session: every tap of Pay for the same open
// bill reuses it, so network retries / double-taps return the original order.
function newBillKey(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // fall through to Math.random fallback
  }
  return `bill-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function PaymentModal() {
  const {
    paymentModalOpen,
    closePaymentModal,
    items,
    discount,
    currentCustomer,
    setCurrentCustomer,
    clearCart,
    calculateGrandTotal,
    recordRecentOnSale,
  } = useCartStore();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [creditTerm, setCreditTerm] = useState<"7" | "15" | "30" | "custom">("15");
  const [customDays, setCustomDays] = useState("");
  const [splitCash, setSplitCash] = useState("");
  const [splitUpi, setSplitUpi] = useState("");
  const selectedCounterId = useAuthStore((s) => s.selectedCounterId);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const billKeyRef = useRef<string>("");
  const online = useOnlineStore((s) => s.online);
  const checkNow = useOnlineStore((s) => s.checkNow);
  const receiptShop = useReceiptShop();
  const offline = !online;
  const grandTotal = calculateGrandTotal();

  // Fresh key per bill: regenerated every time the sheet opens for this cart.
  // Also re-check connectivity on open so the offline state is current, not last heartbeat.
  useEffect(() => {
    if (paymentModalOpen) {
      billKeyRef.current = newBillKey();
      setSaveError(null);
      void checkNow();
    }
  }, [paymentModalOpen, checkNow]);

  const buildOrderItems = () =>
    items.map((item) => ({
      productId: item.productId || null,
      name: item.name,
      price: item.price,
      unit: item.unit || "pcs",
      quantity: item.quantity ?? null,
      weight: item.weight ?? null,
      lineTotal: item.lineTotal,
      isCustom: item.isCustom,
      costPrice: item.costPrice ?? null,
      category: item.category ?? null,
    }));

  const buildReceiptItems = () =>
    items.map((item) => ({
      name: item.name,
      qty: item.isCustom ? String(item.unit) : item.is_loose || item.weight ? `${item.weight ?? 0}` : `${item.quantity ?? 1}`,
      quantity: item.quantity ?? null,
      weight: item.weight ?? null,
      price: item.price,
      perUnit: item.isCustom ? item.unit : item.is_loose || item.weight ? "kg" : item.unit || "pcs",
      unit: item.unit,
      isCustom: item.isCustom,
      lineTotal: item.lineTotal,
    }));

  const printReceipt = (
    orderItems: { name: string; lineTotal: number; qty?: string; rate?: string; price?: number; perUnit?: string; unit?: string; quantity?: number | null; weight?: number | null; isCustom?: boolean }[],
    total: number,
    disc: number,
    custName?: string,
    orderNumber?: string
  ) => {
    // Never print a fake server number: unconfirmed prints are watermarked, not numbered.
    const html = generateReceiptHTML(orderItems as any, total, disc, custName, orderNumber ?? `DRAFT — NOT SAVED`, receiptShop);
    const ok = printReceiptHTML(html);
    if (!ok) {
      // Popup blocked and iframe failed — surface via console + alert fallback (kiosk safe).
      console.warn("[print] popup blocked — allow popups or use browser print");
    }
  };

  const saveOrder = async (paymentMethod: "cash" | "upi" | "khata" | "split", extra?: { customerName?: string; customerPhone?: string; creditDays?: number; splitCash?: number; splitUpi?: number }) => {
    if (items.length === 0) return null;
    // Reuse the bill key across retries of this sheet so a retry can never double-bill.
    if (!billKeyRef.current) billKeyRef.current = newBillKey();
    try {
      const order = (await createOrder({
        items: buildOrderItems(),
        total: grandTotal,
        discount,
        paymentMethod,
        splitCash: extra?.splitCash,
        splitUpi: extra?.splitUpi,
        customerId: currentCustomer?.id,
        customerName: extra?.customerName ?? currentCustomer?.name,
        customerPhone: extra?.customerPhone ?? currentCustomer?.phone,
        creditDays: extra?.creditDays,
        counterId: selectedCounterId ?? undefined,
      } as any, { idempotencyKey: billKeyRef.current })) as unknown as { orderNumber: string; customer?: { id: string; name: string; phone: string | null; balance: number; createdAt: string; updatedAt: string } };
      setSaveError(null);
      return order as unknown as { orderNumber: string; customer?: unknown };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setSaveError(`${msg} — safe to retry, this bill won't be charged twice.`);
      return null;
    }
  };

  const fail = () => {
    setSaving(false);
  };

  const blocked = () => {
    if (offline) {
      setSaveError("You're offline — reconnect to complete this sale. The bill is intact.");
      return true;
    }
    return false;
  };

  const handleCash = async () => {
    if (saving || blocked()) return;
    setSaving(true);
    const saved = await saveOrder("cash");
    if (!saved) return fail();
    const orderNumber = (saved as unknown as { orderNumber?: string })?.orderNumber;
    const orderItems = buildReceiptItems();
    printReceipt(orderItems, grandTotal, discount, currentCustomer?.name, orderNumber);
    recordRecentOnSale();
    closePaymentModal();
    clearCart();
    setSaving(false);
  };

  const handleUPIPayment = async () => {
    if (saving || blocked()) return;
    const url = formatUPIPaymentUrl(grandTotal, receiptShop?.upiId, receiptShop?.receiptName || receiptShop?.name);
    window.open(url, "_blank");
    setSaving(true);
    const saved = await saveOrder("upi");
    if (!saved) return fail();
    const orderNumber = (saved as unknown as { orderNumber?: string })?.orderNumber;
    const orderItems = buildReceiptItems();
    setTimeout(() => {
      printReceipt(orderItems, grandTotal, discount, currentCustomer?.name, orderNumber);
      recordRecentOnSale();
      closePaymentModal();
      clearCart();
      setSaving(false);
    }, 1500);
  };

  const handleKhata = async () => {
    const name = customerName.trim() || currentCustomer?.name?.trim() || "";
    const phone = customerPhone.trim() || currentCustomer?.phone || "";
    if (!name) return;
    if (saving || blocked()) return;
    // resolve credit days: 7 / 15 / 30 / custom
    let cd = 15;
    if (creditTerm === "7") cd = 7;
    else if (creditTerm === "15") cd = 15;
    else if (creditTerm === "30") cd = 30;
    else if (creditTerm === "custom") {
      const n = parseInt(customDays, 10);
      cd = isNaN(n) || n < 1 ? 30 : Math.min(365, n);
    }
    if (creditTerm === "custom" && (!customDays || isNaN(parseInt(customDays, 10)) || parseInt(customDays, 10) < 1)) return;
    setSaving(true);
    const saved = await saveOrder("khata", { customerName: name, customerPhone: phone, creditDays: cd });
    if (!saved) return fail();
    const savedCustomer = (saved as unknown as { customer?: { id: string; name: string; phone: string | null; balance: number } })?.customer;
    if (savedCustomer && typeof savedCustomer === "object") {
      const normalized = {
        ...savedCustomer,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as unknown as typeof currentCustomer;
      setCurrentCustomer(normalized);
    }
    const orderNumber = (saved as unknown as { orderNumber?: string })?.orderNumber;
    const orderItems = buildReceiptItems();
    printReceipt(orderItems, grandTotal, discount, name, orderNumber);
    recordRecentOnSale();
    closePaymentModal();
    clearCart();
    setSaving(false);
  };

  const handleSplitBill = async () => {
    const cash = parseFloat(splitCash) || 0;
    const upi = parseFloat(splitUpi) || 0;
    if (Math.abs(cash + upi - grandTotal) > 0.01) return;
    if (saving || blocked()) return;
    setSaving(true);
    const saved = await saveOrder("split", { splitCash: cash, splitUpi: upi });
    if (!saved) return fail();
    const orderNumber = (saved as unknown as { orderNumber?: string })?.orderNumber;
    const orderItems = buildReceiptItems();
    const label = currentCustomer?.name ? `${currentCustomer.name} (Split: Cash ${formatINR(cash)} + UPI ${formatINR(upi)})` : `Split: Cash ${formatINR(cash)} + UPI ${formatINR(upi)}`;
    printReceipt(orderItems, grandTotal, discount, label, orderNumber);
    recordRecentOnSale();
    closePaymentModal();
    clearCart();
    setSaving(false);
  };

  return (
    <Dialog open={paymentModalOpen} onOpenChange={(o) => !o && closePaymentModal()}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="text-[14px]">Payment</DialogTitle>
          <DialogDescription className="text-[11px]">Choose payment method — order will be auto-saved</DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-6 space-y-3">
          <Card className="bg-primary/5 border-primary/10 py-0">
            <CardContent className="p-2.5 text-center">
              <div className="text-[10px] font-medium text-muted-foreground tracking-wide uppercase">Grand Total</div>
              <div className="text-[22px] font-black tracking-tight text-primary">{formatINR(grandTotal)}</div>
            </CardContent>
          </Card>

          {saveError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] leading-snug text-destructive" role="alert">
              <span className="font-semibold">Not saved yet. </span>
              {saveError}
            </div>
          )}

          {offline && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] leading-snug text-destructive" role="alert">
              <span className="font-semibold">You&apos;re offline. </span>
              Billing is paused — reconnect to complete this sale. The bill is intact.
            </div>
          )}

          <div className="grid gap-2">
            <Button onClick={handleCash} disabled={saving || offline || items.length === 0} title={offline ? OFFLINE_REASON : undefined} size="sm" className="h-auto py-2.5 flex-col gap-0">
              <span className="font-bold text-xs flex items-center gap-1.5">Cash Payment <span className="px-1 py-0.5 bg-white/20 rounded text-[9px]">K</span></span>
              <span className="text-[10px] opacity-80 font-normal">{saving ? "Saving..." : offline ? "Offline — billing paused" : "Complete sale with cash"}</span>
            </Button>

            <Button onClick={handleUPIPayment} disabled={saving || offline || items.length === 0} title={offline ? OFFLINE_REASON : undefined} variant="secondary" size="sm" className="h-auto py-2.5 flex-col gap-0 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white">
              <span className="font-bold text-xs flex items-center gap-1.5">UPI QR <span className="px-1 py-0.5 bg-white text-blue-700 rounded text-[9px]">Shift+U</span></span>
              <span className="text-[10px] opacity-80">Scan QR to pay {formatINR(grandTotal)}</span>
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-[11px] font-semibold">Khata (Credit) — Shift+L</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={currentCustomer?.name ?? "Customer name"} className="h-8 text-xs" />
            <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder={currentCustomer?.phone ?? "Phone number"} type="tel" className="h-8 text-xs" />
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">Credit term</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["7", "15", "30", "custom"] as const).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={creditTerm === t ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-[11px] px-1"
                    onClick={() => setCreditTerm(t)}
                  >
                    {t === "7" ? "7 days" : t === "15" ? "15 days" : t === "30" ? "1 month" : "Custom"}
                  </Button>
                ))}
              </div>
              {creditTerm === "custom" && (
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  placeholder="Custom days (1-365)"
                  className="h-8 text-xs"
                  autoFocus
                />
              )}
              <div className="text-[10px] text-muted-foreground">
                Due: {(() => {
                  let d = 15;
                  if (creditTerm === "7") d = 7;
                  else if (creditTerm === "15") d = 15;
                  else if (creditTerm === "30") d = 30;
                  else d = parseInt(customDays || "0", 10) || 0;
                  if (!d) return "— select term";
                  const due = new Date();
                  due.setHours(0, 0, 0, 0);
                  due.setDate(due.getDate() + d);
                  return `${d} days → ${due.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
                })()}
              </div>
            </div>
            <Button
              onClick={handleKhata}
              disabled={saving || offline || (!customerName.trim() && !currentCustomer) || (creditTerm === "custom" && (!customDays || parseInt(customDays, 10) < 1))}
              title={offline ? OFFLINE_REASON : undefined}
              variant="secondary"
              size="sm"
              className="w-full bg-violet-600 hover:bg-violet-700 text-white dark:bg-violet-600 h-8 text-xs"
            >
              {saving ? "Saving..." : offline ? "Offline — billing paused" : `Add to Ledger — ${formatINR(grandTotal)}`}
            </Button>
            <div className="text-[10px] text-muted-foreground text-center">Shown in Ledger → Due Today on due date</div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold">Split Bill (Cash + UPI)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Cash</Label>
                <Input
                  type="number"
                  value={splitCash}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSplitCash(v);
                    const cash = parseFloat(v) || 0;
                    setSplitUpi(cash ? (grandTotal - cash).toFixed(2) : "");
                  }}
                  placeholder="0.00"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">UPI</Label>
                <Input
                  type="number"
                  value={splitUpi}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSplitUpi(v);
                    const upi = parseFloat(v) || 0;
                    setSplitCash(upi ? (grandTotal - upi).toFixed(2) : "");
                  }}
                  placeholder="0.00"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="text-[10px] text-center text-muted-foreground">
              Cash {formatINR(parseFloat(splitCash) || 0)} + UPI {formatINR(parseFloat(splitUpi) || 0)} = {formatINR((parseFloat(splitCash) || 0) + (parseFloat(splitUpi) || 0))} / {formatINR(grandTotal)}
            </div>
            <Button onClick={handleSplitBill} disabled={saving || offline || Math.abs((parseFloat(splitCash) || 0) + (parseFloat(splitUpi) || 0) - grandTotal) > 0.01} title={offline ? OFFLINE_REASON : undefined} size="sm" className="w-full bg-gradient-to-r from-primary to-blue-600 hover:opacity-90 h-8 text-xs">
              {saving ? "Saving..." : offline ? "Offline — billing paused" : "Pay Split Bill"}
            </Button>
          </div>

        </div>
        <DialogFooter className="p-4 gap-3">
          <Button variant="ghost" onClick={() => {
            const orderItems = buildReceiptItems();
            printReceipt(orderItems, grandTotal, discount);
          }} className="h-9 w-full sm:w-auto px-6">
            Print Receipt Only
          </Button>
          <Button variant="outline" onClick={closePaymentModal} className="h-9 px-6 min-w-[96px]">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
