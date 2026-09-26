"use client";

import { useOnlineStore } from "@/store/onlineStore";
import { WifiOff } from "lucide-react";

/**
 * Full-width offline banner — mounted in PosShell + AdminShell.
 * Null while online. Browsing keeps working; all mutations are gated separately.
 */
export default function OfflineBanner() {
  const online = useOnlineStore((s) => s.online);
  if (online) return null;
  return (
    <div
      role="alert"
      className="flex items-center justify-center gap-2 bg-destructive px-3 py-1.5 text-[12px] font-semibold text-destructive-foreground shrink-0"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>You&apos;re offline — browsing only. Billing and changes are paused until reconnect.</span>
    </div>
  );
}
