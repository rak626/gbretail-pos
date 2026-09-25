"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, LogOut, Monitor } from "lucide-react";
import { logoutApi } from "@/lib/authApi";

/**
 * Kiosk top strip — minimal to reduce cashier fatigue.
 * Only: brand, shop+counter, staff, online dot, logout.
 * No clock text, no theme toggle (kiosk is light-only for contrast).
 */
export default function PosTopStrip() {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const user = useAuthStore((s) => s.user);
  const shop = useAuthStore((s) => s.shop);
  const counters = useAuthStore((s) => s.counters);
  const selectedCounterId = useAuthStore((s) => s.selectedCounterId);
  const setSelectedCounter = useAuthStore((s) => s.setSelectedCounter);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <header className="h-14 shrink-0 bg-card border-b flex items-center justify-between px-3 gap-3 z-30">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <ShoppingCart className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="leading-tight">
          <div className="font-bold tracking-tight text-[15px] leading-none">GB RETAIL</div>
          {shop && <div className="text-[11px] text-muted-foreground font-medium truncate max-w-[160px]">{shop.name}</div>}
        </div>
        {shop && counters.length > 0 && (
          <Select value={selectedCounterId ?? undefined} onValueChange={(v) => setSelectedCounter(v)}>
            <SelectTrigger className="h-9 w-[140px] text-[13px] font-medium ml-1">
              <SelectValue placeholder="Counter" />
            </SelectTrigger>
            <SelectContent>
              {counters.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-1.5">
                    <Monitor className="w-3 h-3" /> {c.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {user && (
          <div className="flex items-center gap-2 pl-1 pr-1 py-1">
            <span className="hidden sm:block text-[13px] font-semibold truncate max-w-[110px]">{user.name}</span>
            <Badge variant="secondary" className="h-6 text-[11px] px-2 rounded-full hidden md:inline-flex">
              {user.role}
            </Badge>
          </div>
        )}
        <span
          title={online ? "Online" : "Offline"}
          className={`w-2.5 h-2.5 rounded-full shrink-0 ${online ? "bg-primary" : "bg-amber-500"}`}
        />
        {user && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            title="Logout"
            onClick={async () => {
              try {
                await logoutApi();
              } catch {}
              clearAuth();
              router.replace("/login");
            }}
          >
            <LogOut className="w-5 h-5" />
          </Button>
        )}
      </div>
    </header>
  );
}
