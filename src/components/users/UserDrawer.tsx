"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User as UserIcon, Mail, Store, ShieldCheck, CalendarDays, Power, Trash2 } from "lucide-react";

export type DrawerUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  shopId: string | null;
  isActive: boolean;
  canManageInventory?: boolean;
  createdAt?: string;
};

type Props = {
  target: DrawerUser | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shopName: string;
  isSelf: boolean;
  canToggleStatus: boolean;
  statusHint?: string;
  canToggleStock: boolean;
  busy: boolean;
  onToggleStatus: () => void;
  onToggleStock: () => void;
  onDelete: () => void;
};

/**
 * User detail dialog — click a row in Users to inspect + manage it.
 * Status/stock/delete controls are permission-gated by the parent page
 * (owner ↔ staff, super ↔ owner).
 */
export default function UserDrawer({
  target,
  open,
  onOpenChange,
  shopName,
  isSelf,
  canToggleStatus,
  statusHint,
  canToggleStock,
  busy,
  onToggleStatus,
  onToggleStock,
  onDelete,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 pb-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-[16px] truncate">
                {target?.name ?? "User"}
                {isSelf && <span className="ml-2 text-[10px] font-bold text-muted-foreground align-middle">(YOU)</span>}
              </DialogTitle>
              <DialogDescription className="text-xs truncate">{target?.email ?? ""}</DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            <Badge variant="outline" className="text-[10px]">{target?.role ?? "—"}</Badge>
            {target && (
              <Badge
                variant={target.isActive ? "secondary" : "destructive"}
                className={`text-[10px] ${target.isActive ? "bg-primary/10 text-primary border-primary/20" : ""}`}
              >
                {target.isActive ? "Active" : "Disabled"}
              </Badge>
            )}
            {target?.role === "STAFF" && (
              <Badge variant="outline" className="text-[10px]">
                Stock: {target.canManageInventory ? "ON" : "OFF"}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="px-5 py-4 space-y-2.5 text-[13px]">
          <div className="flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground w-16 shrink-0">Email</span>
            <span className="font-mono text-xs truncate">{target?.email ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Store className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground w-16 shrink-0">Shop</span>
            <span className="font-medium truncate">{shopName}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground w-16 shrink-0">Role</span>
            <span className="font-medium">{target?.role ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground w-16 shrink-0">Since</span>
            <span className="font-medium">
              {target?.createdAt ? new Date(target.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
            </span>
          </div>
          {statusHint && <div className="text-[11px] text-muted-foreground pt-1">{statusHint}</div>}
        </div>

        <DialogFooter className="p-4 gap-2 sm:justify-between border-t bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={busy || isSelf}
            className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            title={isSelf ? "Cannot delete yourself" : "Delete user"}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
          <div className="flex items-center gap-2">
            {target?.role === "STAFF" && canToggleStock && (
              <Button variant="outline" size="sm" onClick={onToggleStock} disabled={busy} className="h-9">
                Stock: {target.canManageInventory ? "ON" : "OFF"}
              </Button>
            )}
            {canToggleStatus && target && (
              <Button
                size="sm"
                variant={target.isActive ? "destructive" : "default"}
                onClick={onToggleStatus}
                disabled={busy}
                className="h-9 gap-1.5"
              >
                <Power className="w-3.5 h-3.5" /> {target.isActive ? "Deactivate" : "Activate"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
