"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useSidebarStore } from "@/store/sidebarStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "@/components/mode-toggle";
import { ShoppingCart, Clock3, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useOnlineStore, OnlineDot } from "@/store/onlineStore";
import UserMenu from "@/components/UserMenu";
import CounterPicker from "@/components/CounterPicker";
import ShopBadge from "@/components/ShopBadge";

export default function TopBar() {
  const [time, setTime] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [showBarcode, setShowBarcode] = useState(false);
  const { videoRef, lastResult, stopScanner, scanFromInput, clearResult } = useBarcodeScanner();
  const inputRef = useRef<HTMLInputElement>(null);
  const startOnline = useOnlineStore((s) => s.start);
  const stopOnline = useOnlineStore((s) => s.stop);
  const { collapsed, toggleCollapsed, toggleMobile } = useSidebarStore();


  useEffect(() => {
    setTime(new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
    const t = setInterval(() => setTime(new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })), 1000);
    startOnline();
    return () => { clearInterval(t); stopOnline(); };
  }, [startOnline, stopOnline]);

  useEffect(() => {
    const h = () => {
      setShowBarcode(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    };
    window.addEventListener("focus-barcode", h);
    return () => window.removeEventListener("focus-barcode", h);
  }, []);

  useEffect(() => {
    if (lastResult) {
      if (inputRef.current) inputRef.current.value = lastResult.rawValue;
      setShowBarcode(false);
      stopScanner();
      clearResult();
    }
  }, [lastResult, stopScanner, clearResult]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showBarcode) { setShowBarcode(false); stopScanner(); }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [showBarcode, stopScanner]);

  const submit = useCallback(() => {
    if (barcodeInput.trim()) { scanFromInput(barcodeInput.trim()); setBarcodeInput(""); setShowBarcode(false); }
  }, [barcodeInput, scanFromInput]);

  return (
    <header className="h-14 shrink-0 bg-card border-b flex items-center justify-between px-3 gap-3 z-30">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleMobile}
          className="md:hidden text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
        {/* Desktop collapse toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleCollapsed}
          className="hidden md:flex text-muted-foreground hover:text-foreground shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </Button>
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="leading-tight shrink-0">
            <div className="font-bold tracking-tight text-[15px] leading-none">GB RETAIL</div>
          </div>
        </div>
        <span className="h-6 w-px bg-border hidden sm:block shrink-0" aria-hidden />
        <ShopBadge className="ml-0.5" />
        <CounterPicker className="hidden lg:flex shrink-0" />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {showBarcode && (
          <div className="flex items-center gap-2 bg-card rounded-xl p-1 border shadow-sm">
            <Input ref={inputRef} value={barcodeInput} onChange={e=>setBarcodeInput(e.target.value)} onKeyDown={e=> e.key==="Enter" && submit()} placeholder="Scan barcode..." className="h-8 w-40 bg-transparent border-0 focus-visible:ring-0 text-foreground" autoFocus />
            <Button size="sm" onClick={submit}>Go</Button>
            <Button variant="ghost" size="sm" onClick={()=>{setShowBarcode(false); stopScanner();}}>✕</Button>
            <video ref={videoRef} autoPlay playsInline className="fixed inset-0 w-full h-full object-cover z-[60] opacity-0 pointer-events-none" />
          </div>
        )}
        <Badge variant="outline" className="hidden lg:flex items-center gap-1.5 rounded-full">
          <Clock3 className="w-3.5 h-3.5" />
          <span className="text-xs font-medium tabular-nums opacity-95">{time || "—"}</span>
        </Badge>
        <OnlineDot />
        <ModeToggle className="text-muted-foreground hover:text-foreground hover:bg-muted" />
        <UserMenu />
      </div>
    </header>
  );
}
