"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Clock3 } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { useOnlineStore, OnlineDot } from "@/store/onlineStore";
import UserMenu from "@/components/UserMenu";
import CounterPicker from "@/components/CounterPicker";

/**
 * Kiosk top strip — same status pills as the admin TopBar (clock, online,
 * theme) so staff get identical orientation on billing and admin screens.
 */
export default function PosTopStrip() {
  const [time, setTime] = useState("");
  const startOnline = useOnlineStore((s) => s.start);
  const stopOnline = useOnlineStore((s) => s.stop);
  const shop = useAuthStore((s) => s.shop);

  useEffect(() => {
    startOnline();
    return () => stopOnline();
  }, [startOnline, stopOnline]);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
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
        <CounterPicker />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className="hidden lg:flex items-center gap-1.5 rounded-full">
          <Clock3 className="w-3.5 h-3.5" />
          <span className="text-xs font-medium tabular-nums opacity-95">{time || "—"}</span>
        </Badge>
        <OnlineDot />
        <ModeToggle className="text-muted-foreground hover:text-foreground hover:bg-muted" />
        <UserMenu />
      </div>
    </header>
  );
}
