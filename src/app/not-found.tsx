import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="relative h-full w-full flex items-center justify-center bg-background overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative w-full max-w-lg mx-4">
        <Card className="pt-10 pb-8 px-8 text-center shadow-xl border relative overflow-hidden">
          <div className="absolute -bottom-2 left-0 right-0 h-4 bg-card [mask-image:radial-gradient(circle_at_8px_0,transparent_8px,black_9px)] [mask-size:16px_16px] [mask-repeat:repeat-x]" />

          <Badge variant="destructive" className="mb-6 gap-2">
            <span className="w-2 h-2 rounded-full bg-white" />
            VOID / NOT FOUND
          </Badge>

          <div className="text-[6rem] leading-none font-black text-primary tracking-tighter">
            404
          </div>

          <Separator className="my-6 border-dashed" />

          <h1 className="text-xl font-bold">
            This item isn&apos;t in the catalog
          </h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            The page you&apos;re looking for was moved, removed, or never
            existed. Head back to the counter to keep billing.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <Link href="/" className={cn(buttonVariants({ variant: "default" }), "flex items-center justify-center")}>
              Back to POS
            </Link>
            <Link href="/inventory" className={cn(buttonVariants({ variant: "secondary" }), "flex items-center justify-center")}>
              Inventory
            </Link>
          </div>

          <div className="mt-6 pt-5 border-t flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Shortcut</span>
            <kbd>Shift</kbd>
            <span>+</span>
            <kbd>R</kbd>
            <span>to reload</span>
          </div>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          GB Retail POS &middot; Error code: <span className="font-mono">404</span>
        </div>
      </div>
    </div>
  );
}
