"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useSidebarStore } from "@/store/sidebarStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "@/components/mode-toggle";
import { ShoppingCart, Clock3, Wifi, WifiOff, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

export default function TopBar() {
  const [time, setTime] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [showBarcode, setShowBarcode] = useState(false);
  const { videoRef, lastResult, stopScanner, scanFromInput, clearResult } = useBarcodeScanner();
  const inputRef = useRef<HTMLInputElement>(null);
  const [online, setOnline] = useState(true);
  const { collapsed, toggleCollapsed, toggleMobile } = useSidebarStore();

  useEffect(() => {
    setTime(new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
    const t = setInterval(() => setTime(new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })), 1000);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setOnline(navigator.onLine);
    return () => { clearInterval(t); window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

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
    <header className="h-[64px] shrink-0 bg-primary text-primary-foreground flex items-center justify-between px-4 gap-4 shadow-md z-30">
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleMobile}
          className="md:hidden text-white hover:bg-white/10 hover:text-white shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
        {/* Desktop collapse toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleCollapsed}
          className="hidden md:flex text-white hover:bg-white/10 hover:text-white shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/15">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight hidden sm:block">
            <div className="font-bold tracking-tight text-[15px] leading-none">GB RETAIL</div>
            <div className="text-[10px] opacity-80 font-medium whitespace-nowrap tracking-wide">Fast Billing • Happy Customers</div>
          </div>
          <div className="leading-tight sm:hidden">
            <div className="font-bold tracking-tight text-[14px] leading-none">GB RETAIL</div>
          </div>
        </div>
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
        <Badge variant="secondary" className="hidden lg:flex items-center gap-1.5 bg-black/15 text-white border-white/15 hover:bg-black/20 backdrop-blur">
          <Clock3 className="w-3.5 h-3.5" />
          <span className="text-xs font-medium opacity-95">{time || "—"}</span>
        </Badge>
        <Badge variant={online ? "secondary" : "destructive"} className={`hidden md:flex items-center gap-1.5 ${online ? "bg-white text-primary hover:bg-white" : "bg-amber-100 text-amber-800 hover:bg-amber-100"}`}>
          {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {online ? "Online" : "Offline"}
        </Badge>
        <ModeToggle />
      </div>
    </header>
  );
}
