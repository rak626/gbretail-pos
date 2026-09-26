"use client";

import { useCallback } from "react";
import { useOnlineStore } from "@/store/onlineStore";

/** Reason string used on every disabled-while-offline control. */
export const OFFLINE_REASON = "Offline — reconnect to save changes";

type Notify = (msg: { title: string; description: string; danger?: boolean }) => Promise<void> | void;

/**
 * Shared offline gate. `offline` disables save buttons; `block()` shows the
 * confirm-dialog notification for handlers that can't be disabled (defensive).
 */
export function useOfflineBlock(notify?: Notify) {
  const online = useOnlineStore((s) => s.online);
  const checkNow = useOnlineStore((s) => s.checkNow);
  const offline = !online;

  const block = useCallback(async () => {
    if (!offline) return false;
    if (notify) await notify({ title: "You're offline", description: "Reconnect to save changes.", danger: true });
    return true;
  }, [offline, notify]);

  return { online, offline, checkNow, block, reason: OFFLINE_REASON };
}
