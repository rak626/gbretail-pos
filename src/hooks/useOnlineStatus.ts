"use client";
import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cartStore";

/**
 * Single hook for online/offline detection — replaces 3 duplicate listeners
 * in TopBar, OfflineIndicator, and cartStore.initializeOfflineDetection.
 */
export function useOnlineStatus(): boolean {
  const setOffline = useCartStore((s) => s.setOffline);
  const isOffline = useCartStore((s) => s.isOffline);
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      setOffline(false);
    };
    const onOffline = () => {
      setOnline(false);
      setOffline(true);
    };
    setOffline(!navigator.onLine);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [setOffline]);

  return online && !isOffline;
}
