"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ConfirmRequest = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

export type AlertRequest = {
  title: string;
  description?: string;
  okText?: string;
  danger?: boolean;
};

type Pending =
  | { mode: "confirm"; opts: ConfirmRequest; resolve: (v: boolean) => void }
  | { mode: "alert"; opts: AlertRequest; resolve: () => void };

type ConfirmContextValue = {
  /** shadcn confirm dialog — resolves true on confirm, false on cancel/dismiss */
  confirm: (opts: ConfirmRequest) => Promise<boolean>;
  /** shadcn single-button alert — replaces window.alert for errors/info */
  notify: (opts: AlertRequest) => Promise<void>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/** Mount once near the app root — renders the shared shadcn AlertDialog. */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const set = (p: Pending | null) => {
    pendingRef.current = p;
    setPending(p);
  };

  const confirm = useCallback((opts: ConfirmRequest) => {
    return new Promise<boolean>((resolve) => set({ mode: "confirm", opts, resolve }));
  }, []);

  const notify = useCallback((opts: AlertRequest) => {
    return new Promise<void>((resolve) => set({ mode: "alert", opts, resolve: () => resolve() }));
  }, []);

  const close = useCallback((value: boolean) => {
    const p = pendingRef.current;
    set(null);
    // resolve after close so callers don't re-render under the open dialog
    requestAnimationFrame(() => {
      if (!p) return;
      if (p.mode === "confirm") p.resolve(value);
      else p.resolve();
    });
  }, []);

  const isConfirm = pending?.mode === "confirm";
  const title = pending?.opts.title ?? "";
  const description = pending?.opts.description;
  const danger = pending?.opts.danger ?? isConfirm;

  return (
    <ConfirmContext.Provider value={{ confirm, notify }}>
      {children}
      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && close(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            {isConfirm && (
              <AlertDialogCancel onClick={() => close(false)}>
                {(pending?.opts as ConfirmRequest)?.cancelText ?? "Cancel"}
              </AlertDialogCancel>
            )}
            <AlertDialogAction
              variant={danger ? "destructive" : "default"}
              onClick={() => close(true)}
              autoFocus
            >
              {isConfirm
                ? ((pending?.opts as ConfirmRequest)?.confirmText ?? "Confirm")
                : ((pending?.opts as AlertRequest)?.okText ?? "OK")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx;
}
