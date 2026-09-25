import { Card, CardContent } from "@/components/ui/card";
import { cn } from "cn";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  iconBg?: string;
  className?: string;
  valueClassName?: string;
}

export function StatCard({ label, value, subtext, icon: Icon, iconBg = "bg-primary/10 border-primary/20 text-primary", className, valueClassName }: StatCardProps) {
  return (
    <Card className={cn("py-0 gap-0 rounded-xl shadow-sm border", className)}>
      <CardContent className="p-4 flex items-center gap-3">
        <span className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0", iconBg)}>
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className={cn("text-lg font-bold tabular-nums leading-tight", valueClassName)}>{value}</div>
          {subtext && <div className="text-[11px] text-muted-foreground">{subtext}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
