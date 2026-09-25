import { create } from "zustand";
import { API_BASE } from "@/lib/apiClient";
import { useCartStore } from "@/store/cartStore";

const HEARTBEAT_MS = 10_000;
const TIMEOUT_MS = 5_000;
const FAILS_TO_OFFLINE = 2;

type OnlineState = {
  online: boolean;
  lastChecked: number;
  /** Idempotent, refcounted — safe to call from every header. Keeps running while mounted. */
  start: () => void;
  stop: () => void;
  checkNow: () => Promise<void>;
};

let refs = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let fails = 0;
let listenersAttached = false;

function mirrorToCart(online: boolean) {
  try {
    useCartStore.getState().setOffline(!online);
  } catch {
    // cart store not ready — indicator still works
  }
}

async function ping(): Promise<boolean> {
  // OS thinks we're online — verify real internet against our own backend.
  // Any HTTP response (even 5xx) means the network path works.
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      await fetch(`${API_BASE}/api/health`, { method: "GET", cache: "no-store", signal: ctrl.signal });
      return true;
    } finally {
      clearTimeout(t);
    }
  } catch {
    return false;
  }
}

async function runCheck() {
  const set = useOnlineStore.getState();
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    fails = 0;
    if (set.online !== false) {
      useOnlineStore.setState({ online: false, lastChecked: Date.now() });
      mirrorToCart(false);
    }
    return;
  }
  const ok = await ping();
  const cur = useOnlineStore.getState();
  if (ok) {
    fails = 0;
    if (!cur.online) {
      useOnlineStore.setState({ online: true, lastChecked: Date.now() });
      mirrorToCart(true);
    } else {
      useOnlineStore.setState({ lastChecked: Date.now() });
    }
  } else {
    fails += 1;
    if (fails >= FAILS_TO_OFFLINE && cur.online) {
      useOnlineStore.setState({ online: false, lastChecked: Date.now() });
      mirrorToCart(false);
    }
  }
}

function onBrowserOnline() {
  fails = 0;
  void runCheck();
}
function onBrowserOffline() {
  fails = 0;
  useOnlineStore.setState({ online: false, lastChecked: Date.now() });
  mirrorToCart(false);
}
function onFocus() {
  void runCheck();
}

export const useOnlineStore = create<OnlineState>()(() => ({
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  lastChecked: 0,

  start: () => {
    refs += 1;
    if (!listenersAttached && typeof window !== "undefined") {
      window.addEventListener("online", onBrowserOnline);
      window.addEventListener("offline", onBrowserOffline);
      window.addEventListener("focus", onFocus);
      listenersAttached = true;
    }
    if (!timer) {
      timer = setInterval(() => void runCheck(), HEARTBEAT_MS);
    }
    // Sync initial truth immediately
    void runCheck();
  },

  stop: () => {
    refs = Math.max(0, refs - 1);
    if (refs === 0) {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (typeof window !== "undefined" && listenersAttached) {
        window.removeEventListener("online", onBrowserOnline);
        window.removeEventListener("offline", onBrowserOffline);
        window.removeEventListener("focus", onFocus);
        listenersAttached = false;
      }
    }
  },

  checkNow: async () => {
    await runCheck();
  },
}));

/** Shared green/red status dot — identical in POS strip and admin TopBar. */
export function OnlineDot({ className = "" }: { className?: string }) {
  // Hook wrapper so headers re-render on change without importing the store shape
  const online = useOnlineStore((s) => s.online);
  return (
    <span
      title={online ? "Online" : "Offline"}
      className={`w-2.5 h-2.5 rounded-full shrink-0 ${online ? "bg-primary" : "bg-destructive"} ${className}`}
    />
  );
}
