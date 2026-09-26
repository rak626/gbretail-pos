"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingId: string | null;
  name: string;
  setName: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  error: string;
  saving: boolean;
  offline: boolean;
  offlineReason?: string;
  onSave: () => void;
};

export default function ShopDialog({ open, onOpenChange, editingId, name, setName, address, setAddress, error, saving, offline, offlineReason, onSave }: Props) {
  const isEdit = !!editingId;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="text-[15px]">{isEdit ? "Rename shop" : "Add shop"}</DialogTitle>
          <DialogDescription className="text-[12px]">
            {isEdit ? "Update shop name and address. Billing header uses the new name immediately." : "Create a new shop. Counters and staff are added afterwards."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="px-5 pb-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <div className="space-y-1.5">
            <Label className="text-[13px]">Shop name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Main Shop" className="h-10 text-sm" autoFocus maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px]">Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Main Bazaar" className="h-10 text-sm" maxLength={500} />
          </div>
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-2.5 py-1.5 text-[13px] font-medium text-destructive">{error}</div>
          )}
          <DialogFooter className="p-0 pt-1 gap-3 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="h-10 px-5">
              Cancel
            </Button>
            <Button type="submit" disabled={saving || offline} title={offline ? offlineReason : undefined} className="h-10 px-5 min-w-[130px]">
              {saving ? (isEdit ? "Saving…" : "Adding…") : isEdit ? "Save changes" : "Add shop"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
