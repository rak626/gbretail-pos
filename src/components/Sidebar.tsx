"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebarStore } from "@/store/sidebarStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Receipt,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  BookOpen,
  BarChart3,
  Users,
  Settings,
  Shield,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const BASE_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Billing", icon: ShoppingCart },
  { href: "/orders", label: "Orders", icon: Receipt },
  { href: "/inventory", label: "Inventory", icon: LayoutDashboard },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed, mobileOpen, closeMobile, toggleCollapsed } = useSidebarStore();
  const user = useAuthStore((s) => s.user);

  const navItems = (() => {
    // STAFF = shop floor: billing + orders reprint + ledger always; inventory
    // only when the owner granted it (user.canManageInventory).
    if (user?.role === "STAFF") {
      const items = BASE_NAV_ITEMS.filter((i) => i.href === "/" || i.href === "/orders");
      if ((user as any)?.canManageInventory) {
        const inv = BASE_NAV_ITEMS.find((i) => i.href === "/inventory");
        if (inv) items.push(inv);
      }
      const ledger = BASE_NAV_ITEMS.find((i) => i.href === "/ledger");
      if (ledger) items.push(ledger);
      return items;
    }
    // SUPER_ADMIN is platform-level with no shop context: no billing, orders
    // or inventory. Has Customers, Analytics, Ledger, Settings + Admin/Users.
    if (user?.role === "SUPER_ADMIN") {
      return [
        { href: "/customers", label: "Customers", icon: Users },
        { href: "/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/ledger", label: "Ledger", icon: BookOpen },
        { href: "/settings", label: "Settings", icon: Settings },
        { href: "/admin", label: "Admin", icon: Shield },
        { href: "/users", label: "Users", icon: Users },
      ];
    }
    const items = [...BASE_NAV_ITEMS];
    if (user?.role === "SHOP_OWNER") {
      items.push({ href: "/settings", label: "Settings", icon: Settings });
      items.push({ href: "/users", label: "Users", icon: Users });
    }
    return items;
  })();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // Desktop sidebar
  const desktop = (
    <aside
      className={cn(
        "hidden md:flex shrink-0 flex-col bg-card border-r transition-all duration-300 ease-in-out overflow-hidden",
        collapsed ? "w-[64px]" : "w-[220px]"
      )}
    >
      <nav className="flex-1 flex flex-col gap-1 p-2 pt-3">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapsed}
          className={cn(
            "w-full flex items-center gap-2 text-muted-foreground hover:text-foreground",
            collapsed ? "justify-center px-0" : "justify-start"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-5 h-5" />
          ) : (
            <>
              <PanelLeftClose className="w-5 h-5" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );

  // Mobile drawer
  const mobile = mobileOpen ? (
    <div className="fixed inset-0 z-50 flex md:hidden">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={closeMobile}
        aria-hidden="true"
      />
      <aside className="relative flex w-[260px] shrink-0 flex-col bg-card border-r shadow-xl animate-in slide-in-from-left">
        <div className="h-[64px] flex items-center justify-between px-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">GB RETAIL</span>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={closeMobile} aria-label="Close">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <nav className="flex-1 flex flex-col gap-1 p-3">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t text-[11px] text-muted-foreground">
          Fast Billing • Happy Customers
        </div>
      </aside>
    </div>
  ) : null;

  return (
    <>
      {desktop}
      {mobile}
    </>
  );
}
