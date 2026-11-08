"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerBody, DrawerFooter } from "@/components/ui/drawer";
import { Receipt } from "lucide-react";

export type ReceiptDraft = {
  receiptName: string;
  city: string;
  companyName: string;
  gstin: string;
  gstDate: string;
  fssai: string;
  franchiseNote: string;
  upiId: string;
  phone: string;
  receiptFooter: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  draft: ReceiptDraft;
  setDraft: (d: ReceiptDraft) => void;
  error: string;
  saving: boolean;
  offline: boolean;
  offlineReason?: string;
  shopName?: string;
  onSave: () => void;
};

export default function ReceiptDrawer({ open, onOpenChange, draft, setDraft, error, saving, offline, offlineReason, shopName, onSave }: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right">
        <DrawerHeader className="border-b bg-muted/20">
          <div className="flex items-center gap-3 pr-6">
            <span className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Receipt className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <DrawerTitle className="text-[16px]">Receipt — bill header</DrawerTitle>
              <DrawerDescription>Printed on every bill. Leave a field blank to omit it.</DrawerDescription>
            </div>
          </div>
        </DrawerHeader>
        <DrawerBody>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              onSave();
            }}
          >
            <div className="space-y-1.5">
              <Label className="text-[13px]">Receipt name</Label>
              <Input
                value={draft.receiptName}
                onChange={(e) => setDraft({ ...draft, receiptName: e.target.value })}
                placeholder={shopName ?? "Shop name on bills"}
                className="h-10 text-sm"
                autoFocus
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">GSTIN</Label>
              <Input
                value={draft.gstin}
                onChange={(e) => setDraft({ ...draft, gstin: e.target.value.toUpperCase() })}
                placeholder="15-char GSTIN"
                className="h-10 text-sm font-mono"
                maxLength={15}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[13px]">GST date</Label>
                <Input
                  type="date"
                  value={draft.gstDate}
                  onChange={(e) => setDraft({ ...draft, gstDate: e.target.value })}
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">FSSAI licence</Label>
                <Input
                  value={draft.fssai}
                  onChange={(e) => setDraft({ ...draft, fssai: e.target.value })}
                  placeholder="Licence number"
                  className="h-10 text-sm font-mono"
                  maxLength={20}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">City</Label>
              <Input
                value={draft.city}
                onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                placeholder="City printed under the store name"
                className="h-10 text-sm"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Company / legal entity</Label>
              <Input
                value={draft.companyName}
                onChange={(e) => setDraft({ ...draft, companyName: e.target.value })}
                placeholder="Registered company name"
                className="h-10 text-sm"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Franchise note</Label>
              <Input
                value={draft.franchiseNote}
                onChange={(e) => setDraft({ ...draft, franchiseNote: e.target.value })}
                placeholder="e.g. A franchise store operated by …"
                className="h-10 text-sm"
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">UPI id (QR payments)</Label>
              <Input
                value={draft.upiId}
                onChange={(e) => setDraft({ ...draft, upiId: e.target.value })}
                placeholder="name@bank"
                className="h-10 text-sm font-mono"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Phone</Label>
              <Input
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                placeholder="10-digit phone"
                className="h-10 text-sm font-mono"
                maxLength={14}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Footer line</Label>
              <Input
                value={draft.receiptFooter}
                onChange={(e) => setDraft({ ...draft, receiptFooter: e.target.value })}
                placeholder="Thank you, visit again"
                className="h-10 text-sm"
                maxLength={200}
              />
            </div>
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-2.5 py-1.5 text-[13px] font-medium text-destructive">
                {error}
              </div>
            )}
          </form>
        </DrawerBody>
        <DrawerFooter className="flex-row justify-end border-t bg-muted/20">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="h-10 px-5">
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving || offline} title={offline ? offlineReason : undefined} className="h-10 px-5 min-w-[170px]">
            {saving ? "Saving…" : "Save receipt settings"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
