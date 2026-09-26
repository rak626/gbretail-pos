"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCustomer, updateCustomer } from "@/lib/api";
import type { Customer } from "@/db/database";
import { useOnlineStore } from "@/store/onlineStore";
import { OFFLINE_REASON } from "@/hooks/useOfflineBlock";
import { Loader2, User, Phone, Mail, MapPin, StickyNote, Wallet } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customer?: Customer | null; // if present -> edit
  onSaved: (c: Customer) => void;
};

export default function CustomerFormDialog({ open, onOpenChange, customer, onSaved }: Props) {
  const isEdit = !!customer;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const offline = useOnlineStore((s) => !s.online);

  useEffect(() => {
    if (open) {
      if (customer) {
        setName(customer.name ?? "");
        setPhone(customer.phone ?? "");
        setEmail((customer as any).email ?? "");
        setAddress((customer as any).address ?? "");
        setNotes((customer as any).notes ?? "");
        setCreditLimit((customer as any).creditLimit != null ? String((customer as any).creditLimit) : "");
      } else {
        setName("");
        setPhone("");
        setEmail("");
        setAddress("");
        setNotes("");
        setCreditLimit("");
      }
      setError("");
      setSaving(false);
    }
  }, [open, customer]);

  const handleSave = async () => {
    if (offline) return setError("You're offline — reconnect to save changes.");
    setError("");
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim().replace(/\D/g, "").slice(0, 10);
    const trimmedEmail = email.trim();
    const trimmedAddress = address.trim();
    const trimmedNotes = notes.trim();
    const trimmedLimit = creditLimit.trim();

    if (!trimmedName) return setError("Customer name is required");
    if (trimmedName.length > 80) return setError("Name too long (max 80)");
    if (trimmedPhone && !/^\d{10}$/.test(trimmedPhone)) return setError("Phone must be 10 digits or leave empty");
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return setError("Invalid email");
    if (trimmedLimit && (isNaN(Number(trimmedLimit)) || Number(trimmedLimit) < 0 || Number(trimmedLimit) > 1000000)) return setError("Credit limit must be 0–10,00,000");

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: trimmedName,
        phone: trimmedPhone || null,
        email: trimmedEmail || null,
        address: trimmedAddress || null,
        notes: trimmedNotes || null,
        creditLimit: trimmedLimit === "" ? null : Number(trimmedLimit),
      };
      let saved: Customer;
      if (isEdit && customer) {
        saved = await updateCustomer(customer.id, payload) as Customer;
      } else {
        saved = await createCustomer(payload as any) as Customer;
      }
      onSaved(saved);
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      if (msg.includes("already exists") || msg.includes("Phone already")) setError("Customer with this phone already exists");
      else setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
        <DialogHeader className="p-5 pb-3 shrink-0">
          <DialogTitle className="text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> {isEdit ? "Edit Customer" : "Add Customer"}
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            {isEdit ? "Update details — only name is required. Leave phone/email empty if not needed." : "Only name is required. Add phone/email/address if available."}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold">Name <span className="text-destructive">*</span></Label>
            <div className="relative">
              <User className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Ramesh Kumar" className="h-9 pl-8 text-sm" autoFocus />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold flex items-center gap-1"><Phone className="w-3 h-3" /> Phone <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile" inputMode="numeric" className="h-9 text-sm font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold flex items-center gap-1"><Mail className="w-3 h-3" /> Email <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="h-9 text-sm" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-semibold flex items-center gap-1"><MapPin className="w-3 h-3" /> Address <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House, street, area, city — for delivery" rows={2} className="text-sm min-h-[56px] resize-none" />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-semibold flex items-center gap-1"><Wallet className="w-3 h-3" /> Credit limit (₹) <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input value={creditLimit} onChange={(e) => setCreditLimit(e.target.value.replace(/[^0-9.]/g, "").slice(0, 10))} placeholder="e.g., 5000 (leave empty = no limit)" inputMode="numeric" className="h-9 text-sm font-mono" />
            <p className="text-[10px] text-muted-foreground">Max khata allowed before warning. Leave empty to skip.</p>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-semibold flex items-center gap-1"><StickyNote className="w-3 h-3" /> Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., Wholesaler, pays on 15th, prefers UPI" rows={2} className="text-sm min-h-[48px] resize-none" />
          </div>

          {error && <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-2.5 py-2 text-xs font-medium text-destructive">{error}</div>}
        </div>

        <DialogFooter className="p-4 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="h-9">Cancel</Button>
          <Button onClick={handleSave} disabled={saving || offline || !name.trim()} title={offline ? OFFLINE_REASON : undefined} className="h-9 min-w-[130px]">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : isEdit ? "Save Changes" : "Add Customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
