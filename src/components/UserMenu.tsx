"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { logoutApi } from "@/lib/authApi";
import { useConfirm } from "@/components/confirm-dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LogOut } from "lucide-react";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Unified account cluster for both headers (POS strip + admin TopBar).
 * Avatar → popover (identity, role, sign out). No profile section —
 * only the owner configures things, via the admin pages.
 */
export default function UserMenu() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [menuOpen, setMenuOpen] = useState(false);
  const { confirm } = useConfirm();

  if (!user) return null;

  const doLogout = async () => {
    const ok = await confirm({
      title: `Sign out, ${user.name}?`,
      description: "Saved carts and held bills stay on this device.",
      confirmText: "Sign out",
    });
    if (!ok) return;
    setMenuOpen(false);
    try {
      await logoutApi();
    } catch {}
    clearAuth();
    router.replace("/login");
  };

  return (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Account menu"
            title={`${user.name} • ${user.role}`}
            className="w-9 h-9 rounded-full bg-primary text-primary-foreground text-[13px] font-bold flex items-center justify-center shrink-0 hover:bg-primary/90 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        }
      >
        {initials(user.name)}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-64 p-2 gap-0">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <span className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 text-primary text-[13px] font-bold flex items-center justify-center shrink-0">
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold truncate">{user.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">{user.email}</div>
          </div>
        </div>
        <div className="px-2 pb-2">
          <Badge variant="secondary" className="h-5 text-[10px] rounded-full">{user.role}</Badge>
        </div>
        <Separator />
        <div className="py-1">
          <button
            type="button"
            onClick={doLogout}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13px] font-medium hover:bg-destructive/10 text-destructive transition-colors text-left"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
