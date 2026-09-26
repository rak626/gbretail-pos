"use client";

import { useState } from "react";
import { Check, Copy, Store } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

/**
 * Shop identity pill — sits between brand and counter so the shop name
 * is never mixed with the GB RETAIL brand. Shows the human shop code
 * (GB-SHOP-1001…); falls back to a short internal id only when the
 * backend predates the shop-code migration.
 */
export default function ShopBadge({ className = "" }: { className?: string }) {
  const shop = useAuthStore((s) => s.shop);
  const [copied, setCopied] = useState(false);
  if (!shop) return null;
  const code = shop.code || (shop.id ? `#${shop.id.slice(-6).toUpperCase()}` : "");
  const copyText = shop.code ?? shop.id;
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!copyText) return;
    void navigator.clipboard?.writeText(copyText).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      },
      () => {},
    );
  };
  return (
    <span
      title={`${shop.name} • ${shop.code ?? `ID ${shop.id}`} — click the icon to copy`}
      className={cn(
        "h-9 hidden sm:inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-3 shrink-0",
        "text-[13px] font-semibold whitespace-nowrap leading-none",
        className,
      )}
    >
      <Store className="size-3.5 text-muted-foreground shrink-0" strokeWidth={2.2} />
      <span className="truncate max-w-35 leading-none">{shop.name}</span>
      {code && (
        <span className="text-[11px] font-mono font-medium text-muted-foreground shrink-0 leading-none">
          {code}
        </span>
      )}
      {copyText && (
        <button
          type="button"
          onClick={handleCopy}
          title="Copy shop ID"
          aria-label="Copy shop ID"
          className="shrink-0 inline-flex items-center justify-center size-6 rounded-full text-muted-foreground opacity-60 hover:opacity-100 hover:bg-muted transition-opacity"
        >
          {copied ? (
            <Check className="size-3 text-primary" />
          ) : (
            <Copy className="size-3" />
          )}
        </button>
      )}
    </span>
  );
}
