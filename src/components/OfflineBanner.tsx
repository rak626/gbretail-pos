"use client";

import { useEffect, useState } from "react";
import { useOnlineStore } from "@/store/onlineStore";
import { getQueuedOrdersCount } from "@/lib/api";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Full-width offline banner — mounted in PosShell + AdminShell.
 * Null while online. Shows queued bill count and a manual sync button.
 */
export default function OfflineBanner() {
  const online = useOnlineStore((s) => s.online);
  const checkNow = useOnlineStore((s) => s.checkNow);
  const [queued, setQueued] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    void getQueuedOrdersCount().then(setQueued);
  }, [online]);

  if (online && queued === 0) return null;

  const handleSync = async () => {
    setSyncing(true);
    try {
      await checkNow();
    } finally {
      setSyncing(false);
      void getQueuedOrdersCount().then(setQueued);
    }
  };

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-2 bg-destructive px-3 py-1.5 text-[12px] font-semibold text-destructive-foreground shrink-0"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-3.5 h-3.5 shrink-0" />
        <span>
          You&apos;re offline{queued > 0 ? ` — ${queued} bill${queued === 1 ? "" : "s"} queued` : ""}
        </span>
      </div>
      {queued > 0 && (
        <Button
          onClick={handleSync}
          disabled={syncing}
          size="sm"
          className="h-6 px-2 text-[10px] bg-destructive/20 hover:bg-destructive/40 border border-destructive/40 shrink-0"
        >
          {syncing ? <RefreshCw className="w-3 h-3 shrink-0 animate-spin" /> : <RefreshCw className="w-3 h-3 shrink-0" />} Sync
        </Button>
      )}
    </div>
  );
}
