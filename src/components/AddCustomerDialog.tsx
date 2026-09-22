"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCartStore } from "@/store/cartStore";
import { createCustomer, fetchCustomers } from "@/lib/api";
import type { Customer } from "@/db/database";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Phone, User, Clock3, Loader2, Check } from "lucide-react";

function normalizeCustomer(c: Customer) {
  return {
    ...c,
    createdAt: typeof c.createdAt === "string" ? new Date(c.createdAt as unknown as string).getTime() : (c.createdAt as number),
    updatedAt: typeof c.updatedAt === "string" ? new Date(c.updatedAt as unknown as string).getTime() : (c.updatedAt as number),
  } as unknown as Customer & { createdAt: number; updatedAt: number };
}

export default function AddCustomerDialog() {
  const { addCustomerModalOpen, closeAddCustomerModal, setCurrentCustomer } = useCartStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [recent, setRecent] = useState<Customer[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load recent customers when modal opens
  useEffect(() => {
    if (addCustomerModalOpen) {
      fetchCustomers(undefined, 10)
        .then((list) => setRecent(list as unknown as Customer[]))
        .catch(() => setRecent([]));
      // focus after open
      setTimeout(() => nameRef.current?.focus(), 100);
    } else {
      setName("");
      setPhone("");
      setSelected(null);
      setSuggestions([]);
      setShowSuggest(false);
      setError("");
      setSaving(false);
      if (abortRef.current) abortRef.current.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    }
  }, [addCustomerModalOpen]);

  const doSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.startsWith(" ")) {
      setSuggestions([]);
      setShowSuggest(false);
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const results = await fetchCustomers(trimmed, 8, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const list = results as unknown as Customer[];
      setSuggestions(list);
      setShowSuggest(true);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setShowSuggest(false);
    }
  }, []);

  const scheduleSearch = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // phone also searches; if both empty show recent
      if (!q.trim() || q.trim().length < 2) {
        setSuggestions([]);
        // show recent when empty and modal open
        if (!q.trim() && recent.length > 0) {
          setShowSuggest(true);
        } else {
          setShowSuggest(false);
        }
        return;
      }
      debounceRef.current = setTimeout(() => doSearch(q), 280);
    },
    [doSearch, recent]
  );

  const handleNameChange = (v: string) => {
    setName(v);
    setSelected(null);
    setError("");
    scheduleSearch(v);
    // if user clears name, also clear selection
    if (!v.trim()) {
      if (recent.length > 0) setShowSuggest(true);
    }
  };

  const handlePhoneChange = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);
    setSelected(null);
    setError("");
    scheduleSearch(digits);
  };

  const handleSelect = (c: Customer) => {
    setSelected(c);
    setName(c.name);
    setPhone(c.phone ? c.phone.replace(/\D/g, "").slice(0, 10) : "");
    setSuggestions([]);
    setShowSuggest(false);
    setError("");
    // focus phone for quick edit if needed
    setTimeout(() => phoneRef.current?.focus(), 50);
  };

  const handleSave = async () => {
    setError("");
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim().replace(/\D/g, "").slice(0, 10);

    if (!trimmedName) {
      setError("Customer name is required");
      return;
    }
    if (trimmedPhone && !/^\d{10}$/.test(trimmedPhone)) {
      setError("Enter a valid 10-digit phone number or leave empty");
      return;
    }

    // If a suggestion was selected, just use it (no create)
    if (selected) {
      const sameName = selected.name.trim().toLowerCase() === trimmedName.toLowerCase();
      const samePhone = (selected.phone ?? "").replace(/\D/g, "") === trimmedPhone;
      // if user didn't edit after selection, reuse directly
      if (sameName && samePhone) {
        setSaving(true);
        // small delay to show loader per spec
        await new Promise((r) => setTimeout(r, 300));
        setCurrentCustomer(normalizeCustomer(selected) as any);
        setSaving(false);
        closeAddCustomerModal();
        return;
      }
      // if edited after selection, treat as new (fall through)
    }

    setSaving(true);
    try {
      // Check if exact phone exists among suggestions/recent to avoid duplicate create
      // If phone provided and matches an existing customer's phone, select that
      if (trimmedPhone) {
        const pool = [...suggestions, ...recent];
        const phoneMatch = pool.find((c) => (c.phone ?? "").replace(/\D/g, "") === trimmedPhone);
        if (phoneMatch && phoneMatch.name.trim().toLowerCase() === trimmedName.toLowerCase()) {
          setCurrentCustomer(normalizeCustomer(phoneMatch) as any);
          closeAddCustomerModal();
          return;
        }
      }
      const customer = (await createCustomer({ name: trimmedName, phone: trimmedPhone || undefined })) as Customer;
      setCurrentCustomer(normalizeCustomer(customer) as any);
      closeAddCustomerModal();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save customer";
      if (msg.includes("already exists")) setError("Customer with this phone already exists — select from suggestions above");
      else if (msg.includes("Database not configured") || msg.includes("503")) setError("Database not configured — customer saved locally");
      else setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleFocusName = () => {
    if (!name.trim() && recent.length > 0) {
      setSuggestions(recent.slice(0, 5));
      setShowSuggest(true);
      return;
    }
    if (name.trim().length >= 2) {
      doSearch(name);
    } else if (recent.length > 0) {
      setSuggestions(recent.slice(0, 5));
      setShowSuggest(true);
    }
  };

  const handleFocusPhone = () => {
    if (phone.trim().length >= 2) {
      doSearch(phone);
    } else if (!name.trim() && recent.length > 0) {
      setSuggestions(recent.slice(0, 5));
      setShowSuggest(true);
    }
  };

  const displayList = suggestions.length > 0 ? suggestions : (!name.trim() && !phone.trim() && recent.length > 0 ? recent.slice(0, 5) : []);
  const isRecentMode = suggestions.length === 0 && !name.trim() && !phone.trim() && recent.length > 0;

  return (
    <Dialog open={addCustomerModalOpen} onOpenChange={(o) => !o && !saving && closeAddCustomerModal()}>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="text-[14px] flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> {selected ? "Customer Selected" : "Select Customer"}
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Type name to search — suggestions appear instantly. Select existing or create new.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-3">
          {/* Name with autocomplete */}
          <div className="space-y-1.5">
            <Label htmlFor="customer-name" className="text-[11px] font-semibold">
              Name <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                ref={nameRef}
                id="customer-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={handleFocusName}
                placeholder="e.g., Ramesh Kumar"
                className="h-9 text-sm pr-8"
                autoComplete="off"
                disabled={saving}
              />
              {selected && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-1">
                    <Check className="w-3 h-3" /> Selected
                  </Badge>
                </span>
              )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggest && (
              <div className="rounded-lg border bg-card shadow-md overflow-hidden">
                <Command shouldFilter={false} className="rounded-lg">
                  <CommandList>
                    {displayList.length > 0 ? (
                      <>
                        {isRecentMode && (
                          <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Clock3 className="w-3 h-3" /> Recent customers
                          </div>
                        )}
                        <CommandGroup>
                          {displayList.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.id}
                              onSelect={() => handleSelect(c)}
                              className="flex items-center justify-between gap-2 py-2.5 aria-selected:bg-accent cursor-pointer"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate flex items-center gap-1.5">
                                  {c.name}
                                  {selected?.id === c.id && <Check className="w-3 h-3 text-primary" />}
                                </div>
                                {c.phone ? (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> {c.phone}
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground">No phone</div>
                                )}
                              </div>
                              {c.balance > 0 ? (
                                <Badge variant="destructive" className="text-[11px] shrink-0">
                                  Due ₹{c.balance.toFixed(0)}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[11px] shrink-0">
                                  No due
                                </Badge>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    ) : (
                      <CommandEmpty className="py-4 text-center">
                        <div className="text-sm text-muted-foreground">
                          No matching customers for &ldquo;{name || phone}&rdquo;
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">A new customer will be created with this name</div>
                      </CommandEmpty>
                    )}
                  </CommandList>
                </Command>
              </div>
            )}
            {!showSuggest && name.trim().length > 0 && name.trim().length < 2 && (
              <p className="text-[11px] text-muted-foreground">Type at least 2 characters to search</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <Label htmlFor="customer-phone" className="text-[11px] font-semibold">
              Phone <span className="text-muted-foreground font-normal">(optional, searchable)</span>
            </Label>
            <Input
              ref={phoneRef}
              id="customer-phone"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onFocus={handleFocusPhone}
              placeholder="10-digit mobile number"
              inputMode="numeric"
              className="h-9 text-sm font-mono"
              disabled={saving}
              autoComplete="off"
            />
            <p className="text-[10px] text-muted-foreground">Search works by name or phone • Due amount shown in suggestions</p>
          </div>

          {/* Selected preview */}
          {selected && (
            <div className="rounded-lg bg-primary/5 border border-primary/15 p-2.5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 border flex items-center justify-center text-primary shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{selected.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  {selected.phone ? (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {selected.phone}
                    </span>
                  ) : (
                    <span>No phone</span>
                  )}
                  {selected.balance > 0 && <span className="text-destructive font-medium">• Due ₹{selected.balance.toFixed(0)}</span>}
                </div>
              </div>
              <Badge variant="secondary" className="text-[11px]">
                Existing
              </Badge>
            </div>
          )}

          {!selected && name.trim() && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-200">
              {suggestions.length === 0 ? (
                <>
                  New customer will be created: <span className="font-semibold">{name.trim()}</span> {phone ? `• ${phone}` : "(no phone)"}
                </>
              ) : (
                <>Tip: Select a suggestion above to use existing, or keep typing to create new &ldquo;{name.trim()}&rdquo;</>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-2.5 py-2 text-xs font-medium text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 sm:justify-end gap-3 border-t bg-muted/20">
          <Button variant="outline" onClick={closeAddCustomerModal} disabled={saving} className="h-9 px-6 min-w-[96px]">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="h-9 px-6 min-w-[140px]">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : selected ? (
              "Select Customer"
            ) : (
              "Save & Select"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
