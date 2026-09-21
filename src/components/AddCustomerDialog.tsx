"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import { createCustomer } from "@/lib/api";
import type { Customer } from "@/db/database";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AddCustomerDialog() {
  const { addCustomerModalOpen, closeAddCustomerModal, setCurrentCustomer } = useCartStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!addCustomerModalOpen) {
      setName("");
      setPhone("");
      setError("");
      setSaving(false);
    }
  }, [addCustomerModalOpen]);

  const handleSave = async () => {
    setError("");
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setError("Customer name is required");
      return;
    }
    if (trimmedPhone && !/^\d{10}$/.test(trimmedPhone)) {
      setError("Enter a valid 10-digit phone number or leave empty");
      return;
    }

    setSaving(true);
    try {
      const customer = (await createCustomer({ name: trimmedName, phone: trimmedPhone || undefined })) as Customer;
      // Normalize to store shape (API returns Date strings, convert to timestamps for store)
      const normalized = {
        ...customer,
        createdAt: typeof customer.createdAt === "string" ? new Date(customer.createdAt as unknown as string).getTime() : (customer.createdAt as number),
        updatedAt: typeof customer.updatedAt === "string" ? new Date(customer.updatedAt as unknown as string).getTime() : (customer.updatedAt as number),
      } as Customer & { createdAt: number; updatedAt: number };
      setCurrentCustomer(normalized as unknown as Customer & { createdAt: number; updatedAt: number } & { id: string; name: string; phone: string; balance: number });
      closeAddCustomerModal();
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Failed to save customer";
      if (msg.includes("already exists")) setError("Customer with this phone already exists");
      else if (msg.includes("Database not configured") || msg.includes("503")) setError("Database not configured — customer saved locally");
      else setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={addCustomerModalOpen} onOpenChange={(o) => !o && closeAddCustomerModal()}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="text-[14px]">New Customer</DialogTitle>
          <DialogDescription className="text-[11px]">Add a customer to link with this bill</DialogDescription>
        </DialogHeader>
        <div className="px-5 pb-5 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="customer-name" className="text-[11px]">Name *</Label>
            <Input
              id="customer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Ramesh Kumar"
              className="h-8 text-xs"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="customer-phone" className="text-[11px]">Phone <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              id="customer-phone"
              value={phone}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                setPhone(v);
              }}
              placeholder="10-digit mobile number"
              inputMode="numeric"
              className="h-8 text-xs"
            />
            <p className="text-[10px] text-muted-foreground">Searchable by name or phone</p>
          </div>
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-2.5 py-1.5 text-xs font-medium text-destructive">
              {error}
            </div>
          )}
        </div>
        <DialogFooter className="p-4 sm:justify-end gap-3">
          <Button variant="outline" onClick={closeAddCustomerModal} disabled={saving} className="h-9 px-6 min-w-[96px]">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="h-9 px-6 min-w-[110px]">
            {saving ? "Saving..." : "Save Customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
