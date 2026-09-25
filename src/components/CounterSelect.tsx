"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export type CounterOpt = { id: string; name: string };

type Props = {
  /** Counter id, or null/"auto" for the emptiest-at-login fallback */
  value: string | null;
  counters: CounterOpt[];
  onChange: (counterId: string | null) => void;
  allowAuto?: boolean;
  autoLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
};

/**
 * Shared counter picker for forms — one component everywhere a counter is
 * chosen (create-user modal, future assignment UIs). Always renders names,
 * never raw ids; null renders as the Auto fallback.
 */
export default function CounterSelect({
  value,
  counters,
  onChange,
  allowAuto = true,
  autoLabel = "Auto (emptiest at login)",
  placeholder = "Select counter",
  disabled,
  className = "",
  triggerClassName = "",
}: Props) {
  const effective = value ?? "auto";
  return (
    <Select
      value={effective}
      onValueChange={(v) => onChange(v === "auto" ? null : (v ?? null))}
      disabled={disabled}
    >
      <SelectTrigger className={cn("h-9 text-sm w-full", triggerClassName, className)}>
        <Monitor className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <SelectValue placeholder={placeholder}>
          {effective === "auto" ? autoLabel : (counters.find((c) => c.id === effective)?.name ?? "Unknown counter")}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allowAuto && <SelectItem value="auto">{autoLabel}</SelectItem>}
        {counters.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
