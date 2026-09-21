"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";

export default function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const { setOffline } = useCartStore();

  useEffect(() => {
    setOnline(navigator.onLine);
    setOffline(!navigator.onLine);
    const handleOnline = () => {
      setOnline(true);
      setOffline(false);
    };
    const handleOffline = () => {
      setOnline(false);
      setOffline(true);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOffline]);

  return (
    <Badge variant={online ? "secondary" : "destructive"} className={online ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300" : "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100"}>
      {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {online ? "Online" : "Offline"}
    </Badge>
  );
}
