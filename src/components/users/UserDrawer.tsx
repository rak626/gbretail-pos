"use client";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerBody } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User as UserIcon, Mail, Store, Monitor, ShieldCheck, CalendarDays, Power, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type DrawerUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  shopId: string | null;
  isActive: boolean;
  canManageInventory?: boolean;
  counterId?: string | null;
  createdAt?: string;
};

export type CounterOpt = { id: string; name: string };

type Props = {
  target: DrawerUser | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shopName: string;
  isSelf: boolean;
  canToggleStatus: boolean;
  statusHint?: string;
  canToggleStock: boolean;
  canAssignCounter: boolean;
  counters: CounterOpt[];
  busy: boolean;
  onToggleStatus: () => void;
  onToggleStock: () => void;
  onAssignCounter: (counterId: string | null) => void;
  onDelete: () => void;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Right-side user panel — click a row in Users to inspect + manage it.
 * ALL actions live here (status, counter, stock, delete); the table is
 * display-only. Controls are permission-gated by the parent page
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
  canAssignCounter,
  counters,
  busy,
  onToggleStatus,
  onToggleStock,
  onAssignCounter,
  onDelete,
}: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right">
        <DrawerHeader className="border-b bg-muted/20">
          <div className="flex items-center gap-3 pr-6">
            <span className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 text-primary text-[15px] font-bold flex items-center justify-center shrink-0">
              {target ? initials(target.name) : "?"}
            </span>
            <div className="min-w-0">
              <DrawerTitle className="text-[16px] truncate">
                {target?.name ?? "User"}
                {isSelf && <span className="ml-2 text-[10px] font-bold text-muted-foreground align-middle">(YOU)</span>}
              </DrawerTitle>
              <DrawerDescription className="truncate">{target?.email ?? ""}</DrawerDescription>
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
        </DrawerHeader>

        <DrawerBody className="space-y-5">
          {/* Identity */}
          <div className="space-y-2.5 text-[13px]">
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
          </div>

          {/* Status */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Status</div>
            {canToggleStatus && target ? (
              <Button
                size="sm"
                variant={target.isActive ? "destructive" : "default"}
                onClick={onToggleStatus}
                disabled={busy}
                className="w-full h-10 gap-1.5"
              >
                <Power className="w-4 h-4" /> {target.isActive ? "Deactivate account" : "Activate account"}
              </Button>
            ) : (
              <div className="rounded-xl border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
                {statusHint || (target?.isActive ? "Account is active." : "Account is disabled.")}
              </div>
            )}
            {canToggleStatus && statusHint && <div className="text-[11px] text-muted-foreground mt-1.5">{statusHint}</div>}
          </div>

          {/* Counter (staff only) */}
          {target?.role === "STAFF" && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Counter</div>
              {canAssignCounter ? (
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onAssignCounter(null)}
                    disabled={busy}
                    className={cn(
                      "h-9 rounded-xl border text-[12px] font-semibold transition-colors",
                      !target.counterId
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:border-primary/40"
                    )}
                  >
                    Auto
                  </button>
                  {counters.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onAssignCounter(c.id)}
                      disabled={busy}
                      title={c.name}
                      className={cn(
                        "h-9 rounded-xl border text-[12px] font-semibold truncate px-2 transition-colors",
                        target.counterId === c.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:border-primary/40"
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border bg-muted/30 px-3 py-2.5 text-xs">
                  {target.counterId
                    ? <span className="font-semibold">{counters.find((c) => c.id === target.counterId)?.name ?? "Assigned"}</span>
                    : <span className="text-muted-foreground">Auto — emptiest counter at login</span>}
                </div>
              )}
            </div>
          )}

          {/* Stock access (staff only) */}
          {target?.role === "STAFF" && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Inventory access</div>
              {canToggleStock ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {(["ON", "OFF"] as const).map((v) => {
                    const on = v === "ON";
                    const active = Boolean(target.canManageInventory) === on;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={onToggleStock}
                        disabled={busy || active}
                        className={cn(
                          "h-9 rounded-xl border text-[12px] font-semibold transition-colors",
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:border-primary/40 disabled:opacity-60"
                        )}
                      >
                        Stock: {v}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
                  {target.canManageInventory ? "Allowed — can open and edit stock." : "Not allowed."} Only the shop owner can change this.
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Danger zone */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-destructive mb-2">Danger zone</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={busy || isSelf}
              className="w-full h-10 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border border-destructive/20"
              title={isSelf ? "Cannot delete yourself" : "Delete user"}
            >
              <Trash2 className="w-4 h-4" /> Delete account
            </Button>
          </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
