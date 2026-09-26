"use client";

import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";
import OfflineBanner from "@/components/OfflineBanner";

/**
 * Owner / back-office shell — dense tables, normal scroll, sidebar nav.
 * Used by src/app/(admin)/layout.tsx. URLs unchanged (/inventory, /ledger...).
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar />
      <OfflineBanner />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-muted/40">{children}</div>
      </div>
    </div>
  );
}
