"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useCartStore } from "@/store/cartStore";
import type { Customer } from "@/db/database";
import { fetchCustomers } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import SearchBox from "@/components/SearchBox";
import { Plus, ScanBarcode, X, Phone } from "lucide-react";

export default function CustomerSection() {
  const { currentCustomer, setCurrentCustomer, openAddCustomerModal, addCustomerModalOpen } = useCartStore();
  const [q, setQ] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadCustomers = useCallback(async () => {
    try {
      const all = await fetchCustomers(undefined, 100);
      setCustomers(all as unknown as Customer[]);
    } catch {
      setCustomers([]);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (!addCustomerModalOpen) {
      loadCustomers();
    }
  }, [addCustomerModalOpen, loadCustomers]);

  useEffect(() => {
    const onOpen = () => openAddCustomerModal();
    window.addEventListener("open-customer-modal", onOpen as EventListener);
    return () => window.removeEventListener("open-customer-modal", onOpen as EventListener);
  }, [openAddCustomerModal]);

  const doSearchApi = useCallback(async (trimmed: string, local: Customer[]) => {
    if (trimmed.startsWith(" ") || !trimmed || trimmed.length < 3) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const results = await fetchCustomers(trimmed, 10, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (results.length > 0) {
        setFiltered(results as unknown as Customer[]);
      } else if (local.length === 0) {
        setFiltered([]);
      }
      setShowDropdown(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setShowDropdown(true);
    }
  }, []);

  const handleImmediate = (v: string) => {
    setQ(v);
    if (v.startsWith(" ")) {
      if (abortRef.current) abortRef.current.abort();
      setFiltered([]);
      setShowDropdown(false);
      return;
    }
    const trimmed = v.trim();
    if (!trimmed || trimmed.length < 3) {
      if (abortRef.current) abortRef.current.abort();
      setFiltered([]);
      setShowDropdown(false);
      return;
    }
    const local = customers
      .filter((c) => c.name.toLowerCase().includes(trimmed.toLowerCase()) || (c.phone ?? "").includes(trimmed))
      .slice(0, 10);
    setFiltered(local);
    setShowDropdown(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleDebouncedSearch = (trimmed: string) => {
    if (!trimmed || trimmed.length < 3 || trimmed.startsWith(" ")) {
      setFiltered([]);
      setShowDropdown(false);
      return;
    }
    const local = customers
      .filter((c) => c.name.toLowerCase().includes(trimmed.toLowerCase()) || (c.phone ?? "").includes(trimmed))
      .slice(0, 10);
    doSearchApi(trimmed, local);
  };

  const handleClearSearch = () => {
    if (abortRef.current) abortRef.current.abort();
    setFiltered([]);
    setShowDropdown(false);
  };

  const handleFocusSearch = (query: string) => {
    if (query.startsWith(" ")) return;
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 3) return;
    if (filtered.length > 0) {
      setShowDropdown(true);
      return;
    }
    const local = customers
      .filter((c) => c.name.toLowerCase().includes(trimmed.toLowerCase()) || (c.phone ?? "").includes(trimmed))
      .slice(0, 10);
    setFiltered(local);
    setShowDropdown(true);
    doSearchApi(trimmed, local);
  };

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const handleSelect = (customer: Customer) => {
    const normalized = {
      ...customer,
      createdAt: typeof customer.createdAt === "string" ? new Date(customer.createdAt as unknown as string).getTime() : (customer.createdAt as unknown as number),
      updatedAt: typeof customer.updatedAt === "string" ? new Date(customer.updatedAt as unknown as string).getTime() : (customer.updatedAt as unknown as number),
    } as unknown as Customer & { createdAt: number; updatedAt: number };
    setCurrentCustomer(normalized as unknown as Customer & { createdAt: number; updatedAt: number } & { id: string; name: string; phone: string; balance: number });
    setQ("");
    setFiltered([]);
    setShowDropdown(false);
  };

  const handleClear = () => {
    setCurrentCustomer(null);
    setQ("");
    setFiltered([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  return (
    <Card className="py-0 gap-0">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="flex items-center shrink-0">
          <span className="font-semibold text-sm">Customer</span>
        </div>

        <div className="flex-1 min-w-0">
          {currentCustomer ? (
            <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-primary/5 border-primary/20 text-sm">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="font-semibold truncate">{currentCustomer.name}</span>
                {currentCustomer.phone ? (
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" /> {currentCustomer.phone}
                  </span>
                ) : null}
                {currentCustomer.balance > 0 && (
                  <Badge variant="secondary" className="text-[11px]">Due: ₹{currentCustomer.balance.toFixed(2)}</Badge>
                )}
              </div>
              <Button variant="ghost" size="icon-xs" className="h-6 w-6 rounded-full shrink-0" onClick={handleClear}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <Popover
              open={showDropdown && !currentCustomer}
              onOpenChange={(open) => {
                if (open && (!q.trim() || q.trim().length < 3 || q.startsWith(" "))) return;
                setShowDropdown(open);
              }}
              modal={false}
            >
              <PopoverTrigger render={<div className="w-full" />} nativeButton={false}>
                  <SearchBox
                    placeholder="Search customer by name or phone..."
                    value={q}
                    onValueChange={handleImmediate}
                    onSearch={handleDebouncedSearch}
                    onClear={handleClearSearch}
                    onFocusSearch={handleFocusSearch}
                    inputRef={inputRef}
                  />
              </PopoverTrigger>
              <PopoverContent className="w-[var(--anchor-width)] p-0" align="start" sideOffset={6}>
                <Command shouldFilter={false} className="rounded-lg">
                  <CommandList>
                    {filtered.length > 0 ? (
                      <CommandGroup>
                        {filtered.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.id}
                            onSelect={() => handleSelect(c)}
                            className="flex items-center justify-between gap-2 py-2.5 aria-selected:bg-accent"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{c.name}</div>
                              {c.phone ? (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {c.phone}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">No phone</div>
                              )}
                            </div>
                            {c.balance > 0 && (
                              <Badge variant="destructive" className="text-[11px]">Due ₹{c.balance.toFixed(0)}</Badge>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ) : (
                      <CommandEmpty className="py-6 text-center">
                        <div className="text-sm text-muted-foreground">No customers found for &ldquo;{q}&rdquo;</div>
                        <div className="text-xs text-muted-foreground mt-1">Try a different name/phone or add new</div>
                        <Button size="sm" className="mt-3" onClick={() => { setShowDropdown(false); openAddCustomerModal(); }}>
                          <Plus className="w-3.5 h-3.5" /> New Customer
                        </Button>
                      </CommandEmpty>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {currentCustomer ? (
          <Button variant="outline" className="hidden sm:flex gap-2" onClick={openAddCustomerModal}>
            <Plus className="w-4 h-4" /> New Customer
          </Button>
        ) : (
          <Button variant="outline" className="hidden sm:flex gap-2" onClick={openAddCustomerModal}>
            <Plus className="w-4 h-4" /> New Customer
          </Button>
        )}
        <Button variant="outline" className="hidden sm:flex gap-2" onClick={() => window.dispatchEvent(new CustomEvent("focus-barcode"))}>
          <ScanBarcode className="w-4 h-4" /> Scan Barcode
        </Button>
      </CardContent>
    </Card>
  );
}
