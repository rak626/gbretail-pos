"use client";

import { useAuthStore } from "@/store/authStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared counter picker for both headers (POS strip + admin TopBar).
 * Pill with icon + name + tooltip — no more naked id-in-a-box.
 * STAFF are bound to their assigned counter: read-only badge, no switching.
 * Owner/super keep the dropdown.
 */
export default function CounterPicker({ className = "" }: { className?: string }) {
  const user = useAuthStore((s) => s.user);
  const shop = useAuthStore((s) => s.shop);
  const counters = useAuthStore((s) => s.counters);
  const selectedCounterId = useAuthStore((s) => s.selectedCounterId);
  const setSelectedCounter = useAuthStore((s) => s.setSelectedCounter);

  if (!shop || counters.length === 0) return null;

  const assignedName =
    user?.counter?.name ?? counters.find((c) => c.id === (user?.counterId ?? selectedCounterId))?.name ?? null;

  if (user?.role === "STAFF") {
    return (
      <span
        title={assignedName ? `Billing on ${assignedName} (assigned by owner)` : "No counter assigned — contact owner"}
        className={cn(
          "h-9 inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-3",
          "text-[13px] font-semibold whitespace-nowrap",
          className
        )}
      >
        <Monitor className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="truncate max-w-[130px]">{assignedName ?? "No counter"}</span>
      </span>
    );
  }
  // Resolve the label from our own list: Base-UI only learns item labels
  // after the popup mounts, so the default lookup flashes the raw id
  // ("counter_1") instead of the name ("Counter 1").
  const selectedName = counters.find((c) => c.id === selectedCounterId)?.name ?? null;

  return (
    <Select value={selectedCounterId ?? undefined} onValueChange={(v) => setSelectedCounter(v)}>
      <SelectTrigger
        title="Switch counter"
        className={cn(
          "h-9 min-w-[128px] max-w-[190px] rounded-full gap-1.5 border bg-muted/60 px-3",
          "text-[13px] font-semibold hover:bg-muted transition-colors",
          className
        )}
      >
        <Monitor className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <SelectValue placeholder="Counter" className="truncate">
          {selectedName ?? "Counter"}
        </SelectValue>
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
  );
}
