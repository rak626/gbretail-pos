"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * shadcn-style Kbd — single source for shortcut hints in the kiosk POS.
 * Auto-adapts to light/dark via muted tokens (raw <kbd> tags drifted).
 */
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "bg-muted text-muted-foreground pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-md border px-1.5 font-sans text-[11px] font-medium whitespace-nowrap select-none",
        className
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1 whitespace-nowrap", className)}
      {...props}
    />
  );
}

export { Kbd, KbdGroup };
