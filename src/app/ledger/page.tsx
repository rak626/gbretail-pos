"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import SearchBox from "@/components/SearchBox";
import { formatINR } from "@/lib/utils";
import { fetchCustomers, fetchLedger, fetchDueToday, createLedgerEntry, settleLedgerEntry } from "@/lib/api";
import type { Customer } from "@/db/database";
import { BookOpen, Plus, Search, Calendar, Phone, User, CheckCircle2, AlertTriangle, Clock3, Wallet, Undo2, Trash2 } from "lucide-react";

type LedgerEntryUI = {
  id: string;
  customerId: string;
  customer: { id: string; name: string; phone: string | null; balance: number };
  orderId: string | null;
  order?: { id: string; orderNumber: string } | null;
  amount: number;
  creditDays: number;
  dueDate: string;
  status: string;
  note?: string | null;
  createdAt: string;
  settledAt?: string | null;
};

type Filter = "dueToday" | "overdue" | "pending" | "settled" | "all";

const TERM_OPTIONS: Array<{ value: "7" | "15" | "30" | "custom"; label: string }> = [
  { value: "7", label: "7 days" },
  { value: "15", label: "15 days" },
  { value: "30", label: "1 month" },
  { value: "custom", label: "Custom" },
];

export default function LedgerPage() {
  const [filter, setFilter] = useState<Filter>("dueToday");
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState<LedgerEntryUI[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{ dueToday: { count: number; amount: number }; overdue: { count: number; amount: number }; pending: { count: number; amount: number } }>({
    dueToday: { count: 0, amount: 0 },
    overdue: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // add dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [custQuery, setCustQuery] = useState("");
  const [custResults, setCustResults] = useState<Customer[]>([]);
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [term, setTerm] = useState<"7" | "15" | "30" | "custom">("15");
  const [customDays, setCustomDays] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const searchRef = useRef<HTMLInputElement>(null);
  const custInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (f?: Filter, q?: string) => {
    const ff = f ?? filter;
    const qq = q !== undefined ? q : search;
    if (qq && (qq.startsWith(" ") || (qq.trim().length > 0 && qq.trim().length < 2))) return;
    setLoading(true);
    setError("");
    try {
      // dueToday filter handled via /api/ledger?filter=dueToday; we use fetchLedger for all except we could use dueToday endpoint
      const data = await fetchLedger({ filter: ff, q: qq.trim() || undefined, limit: 100 });
      setEntries(data.entries as unknown as LedgerEntryUI[]);
      setTotal(data.total);
      setStats(data.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ledger");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { load(); }, []); // initial

  // debounce search for ledger
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const handleSearchImmediate = (v: string) => {
    if (v.startsWith(" ")) return;
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = v.trim();
    if (!trimmed || trimmed.length < 2) {
      if (!trimmed) { debounceRef.current = setTimeout(() => load(filter, ""), 250); }
      return;
    }
    debounceRef.current = setTimeout(() => load(filter, v), 350);
  };
  const handleSearchDebounced = (trimmed: string) => {
    if (!trimmed || trimmed.length < 2 || trimmed.startsWith(" ")) {
      if (!trimmed) load(filter, "");
      return;
    }
    load(filter, trimmed);
  };
  const handleClearSearch = () => {
    setSearch("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    load(filter, "");
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const switchFilter = (f: Filter) => {
    setFilter(f);
    setLoading(true);
    fetchLedger({ filter: f, q: search.trim() || undefined, limit: 100 })
      .then((data) => {
        setEntries(data.entries as unknown as LedgerEntryUI[]);
        setTotal(data.total);
        setStats(data.stats);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  };

  // add khata: preload customers
  useEffect(() => {
    if (!addOpen) return;
    fetchCustomers(undefined, 50).then((c) => setCustomers(c as unknown as Customer[])).catch(() => setCustomers([]));
  }, [addOpen]);

  const handleCustImmediate = (v: string) => {
    setCustQuery(v);
    if (v.startsWith(" ")) { setCustResults([]); setShowCustDropdown(false); return; }
    const trimmed = v.trim();
    if (!trimmed || trimmed.length < 2) { setCustResults([]); setShowCustDropdown(false); return; }
    const local = customers.filter((c) => c.name.toLowerCase().includes(trimmed.toLowerCase()) || (c.phone ?? "").includes(trimmed)).slice(0, 8);
    setCustResults(local);
    setShowCustDropdown(true);
    // also fetch api
    fetchCustomers(trimmed, 8).then((res) => {
      if (res.length > 0) setCustResults(res as unknown as Customer[]);
      setShowCustDropdown(true);
    }).catch(() => {});
  };

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setManualName(c.name);
    setManualPhone(c.phone ?? "");
    setCustQuery("");
    setCustResults([]);
    setShowCustDropdown(false);
  };
  const clearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setManualName("");
    setManualPhone("");
    setCustQuery("");
    setCustResults([]);
    setShowCustDropdown(false);
    custInputRef.current?.focus();
  };

  const getCreditDays = (): number | null => {
    if (term === "7") return 7;
    if (term === "15") return 15;
    if (term === "30") return 30;
    const n = parseInt(customDays, 10);
    if (isNaN(n) || n < 1 || n > 365) return null;
    return n;
  };
  const handleCreate = async () => {
    setFormError("");
    const amt = parseFloat(amountStr);
    if (!amt || isNaN(amt) || amt <= 0) return setFormError("Enter valid amount (e.g., 200)");
    if (amt > 100000) return setFormError("Amount too large");
    const days = getCreditDays();
    if (!days) return setFormError("Select 7/15/1 month or valid custom days (1-365)");
    // customer resolution: either selectedCustomer or manual name/phone
    const nameToUse = manualName.trim() || selectedCustomer?.name || "";
    const phoneToUse = manualPhone.trim() || selectedCustomer?.phone || "";
    if (!nameToUse && !phoneToUse) return setFormError("Select existing customer or enter name/phone");
    if (phoneToUse && !/^\d{10}$/.test(phoneToUse.replace(/\D/g, "").slice(-10))) {
      // allow incomplete? but require 10 digits if provided
      const cleaned = phoneToUse.replace(/\D/g, "").slice(-10);
      if (cleaned.length !== 10) return setFormError("Phone must be 10 digits");
    }
    setSaving(true);
    try {
      await createLedgerEntry({
        customerId: selectedCustomer?.id,
        customerName: !selectedCustomer ? nameToUse : undefined,
        customerPhone: !selectedCustomer ? phoneToUse : undefined,
        amount: amt,
        creditDays: days,
        note: note.trim() || undefined,
      });
      setAddOpen(false);
      setAmountStr("");
      setTerm("15");
      setCustomDays("");
      setNote("");
      setSelectedCustomer(null);
      setManualName("");
      setManualPhone("");
      setCustQuery("");
      setFormError("");
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const handleSettle = async (e: LedgerEntryUI) => {
    if (!confirm(`Mark ₹${e.amount.toFixed(2)} from ${e.customer.name} as settled? This will reduce due balance.`)) return;
    try {
      await settleLedgerEntry(e.id, "settle");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Settle failed");
    }
  };
  const handleReopen = async (e: LedgerEntryUI) => {
    if (!confirm(`Reopen this settled entry (₹${e.amount.toFixed(2)} — ${e.customer.name})? Balance will increase again.`)) return;
    try {
      await settleLedgerEntry(e.id, "reopen");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Reopen failed");
    }
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return iso; }
  };
  const daysLeft = (dueIso: string) => {
    const due = new Date(dueIso);
    due.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Due today";
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    return `${diff}d left`;
  };

  return (
    <AppShell>
      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-6xl mx-auto space-y-3">
          {/* header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-semibold flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-primary" /> Ledger — Khata</h1>
              <Badge variant="secondary" className="hidden sm:inline-flex rounded-full">{total} entries</Badge>
            </div>
            <Button onClick={() => setAddOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 rounded-full gap-1.5"><Plus className="w-4 h-4" /> Add Khata</Button>
          </div>

          {/* stats — Due Today spotlight */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="py-0 gap-0 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900">
              <CardContent className="p-3.5 flex flex-row items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0"><Calendar className="w-5 h-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-wide font-semibold text-amber-800 dark:text-amber-200">Due Today</div>
                  <div className="text-xl font-black leading-none">{stats.dueToday.count} <span className="text-xs font-normal text-muted-foreground">people</span></div>
                  <div className="text-[13px] font-bold text-amber-700 dark:text-amber-300">{formatINR(stats.dueToday.amount)}</div>
                </div>
                {stats.dueToday.count > 0 && <Badge variant="default" className="bg-amber-600 animate-pulse text-[11px]">Due today</Badge>}
              </CardContent>
            </Card>
            <Card className="py-0 gap-0 border-destructive/20 bg-destructive/5">
              <CardContent className="p-3.5 flex flex-row items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive text-destructive-foreground flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-wide font-semibold text-destructive">Overdue</div>
                  <div className="text-xl font-black leading-none">{stats.overdue.count} <span className="text-xs font-normal text-muted-foreground">people</span></div>
                  <div className="text-[13px] font-bold text-destructive">{formatINR(stats.overdue.amount)}</div>
                </div>
              </CardContent>
            </Card>
            <Card className="py-0 gap-0">
              <CardContent className="p-3.5 flex flex-row items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border flex items-center justify-center text-primary shrink-0"><Wallet className="w-5 h-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">Total Pending</div>
                  <div className="text-xl font-black leading-none">{stats.pending.count} <span className="text-xs font-normal text-muted-foreground">open</span></div>
                  <div className="text-[13px] font-bold text-primary">{formatINR(stats.pending.amount)}</div>
                </div>
                <Badge variant="outline" className="text-[11px] hidden sm:flex">Pending</Badge>
              </CardContent>
            </Card>
          </div>

          {/* toolbar: filter tabs + search */}
          <Card className="py-0 border-primary/20 ring-1 ring-primary/5">
            <CardContent className="p-1.5 flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { k: "dueToday" as Filter, label: "Due Today", icon: Calendar },
                  { k: "overdue" as Filter, label: "Overdue", icon: AlertTriangle },
                  { k: "pending" as Filter, label: "Pending", icon: Clock3 },
                  { k: "settled" as Filter, label: "Settled", icon: CheckCircle2 },
                  { k: "all" as Filter, label: "All", icon: BookOpen },
                ].map(({ k, label, icon: Icon }) => (
                  <Button key={k} variant={filter === k ? "default" : "outline"} size="sm" onClick={() => switchFilter(k)} className="h-8 gap-1.5 text-xs">
                    <Icon className="w-3.5 h-3.5" /> {label}
                    {k === "dueToday" && stats.dueToday.count > 0 && <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${filter === k ? "bg-white text-primary" : "bg-amber-600 text-white"}`}>{stats.dueToday.count}</span>}
                    {k === "overdue" && stats.overdue.count > 0 && <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${filter === k ? "bg-white text-destructive" : "bg-destructive text-white"}`}>{stats.overdue.count}</span>}
                  </Button>
                ))}
                <div className="flex-1 min-w-[12px]" />
                <div className="text-[11px] text-muted-foreground hidden lg:block">Very simple khata — 7 / 15 / 1 month / custom</div>
              </div>
              <div className="flex gap-2">
                <SearchBox placeholder="Search customer by name or phone..." leftIcon={<Search className="w-4 h-4" />} value={search} onValueChange={handleSearchImmediate} onSearch={handleSearchDebounced} onClear={handleClearSearch} onFocusSearch={(q) => { const t = q.trim(); if (t && t.length >= 2) handleSearchDebounced(t); }} inputRef={searchRef} variant="plain" />
                {(search) && <Button variant="ghost" size="sm" onClick={handleClearSearch}>Clear</Button>}
              </div>
            </CardContent>
          </Card>

          {/* table */}
          <Card className="py-0 overflow-hidden">
            <CardHeader className="py-3 border-b flex-row items-center justify-between bg-muted/20">
              <CardTitle className="text-sm flex items-center gap-2">
                {filter === "dueToday" ? <><Calendar className="w-4 h-4 text-amber-600" /> Due Today — collect today</> : filter === "overdue" ? <><AlertTriangle className="w-4 h-4 text-destructive" /> Overdue — follow up</> : filter === "pending" ? <><Clock3 className="w-4 h-4 text-primary" /> Pending dues</> : filter === "settled" ? <><CheckCircle2 className="w-4 h-4 text-primary" /> Settled</> : <><BookOpen className="w-4 h-4 text-primary" /> All entries</>}
                <Badge variant="outline" className="font-normal text-xs">{entries.length} {entries.length === 1 ? "entry" : "entries"}</Badge>
              </CardTitle>
              <div className="text-xs text-muted-foreground hidden sm:block">{loading && "loading..."}</div>
            </CardHeader>
            <CardContent className="p-0">
              {error ? (
                <div className="p-6 text-center">
                  <div className="text-sm text-destructive font-medium">{error}</div>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => load()}>Retry</Button>
                </div>
              ) : entries.length === 0 && !loading ? (
                <div className="p-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted border flex items-center justify-center mx-auto mb-3">
                    {filter === "dueToday" ? <Calendar className="w-6 h-6 text-amber-600" /> : filter === "overdue" ? <AlertTriangle className="w-6 h-6 text-destructive" /> : <BookOpen className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  <div className="text-sm font-semibold">{filter === "dueToday" ? "No dues today — all clear!" : filter === "overdue" ? "No overdue — good" : filter === "pending" ? "No pending dues" : "No entries yet"}</div>
                  <div className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    {filter === "dueToday" ? "People whose khata is due today will appear here. Use Add Khata or sell on Khata from Billing." : "Add a khata manually (e.g., ₹200 for 7 days) or do a Khata sale from Billing — it auto-creates a ledger entry with due date."}
                  </div>
                  {filter === "dueToday" && stats.pending.count > 0 && (
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => switchFilter("pending")}>View all pending ({stats.pending.count})</Button>
                  )}
                  {filter !== "dueToday" && (
                    <Button onClick={() => setAddOpen(true)} size="sm" className="mt-3 bg-primary hover:bg-primary/90 text-white"><Plus className="w-4 h-4" /> Add ₹200 khata</Button>
                  )}
                </div>
              ) : (
                <div className="overflow-auto max-h-[56vh]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card shadow-sm z-10">
                      <TableRow className="hover:bg-transparent h-10">
                        <TableHead className="text-xs">Customer</TableHead>
                        <TableHead className="text-xs text-right">Amount</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell">Term</TableHead>
                        <TableHead className="text-xs">Due date</TableHead>
                        <TableHead className="text-xs hidden md:table-cell">Status</TableHead>
                        <TableHead className="text-xs text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((e) => {
                        const isOverdue = e.status === "pending" && new Date(e.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
                        const isDueToday = e.status === "pending" && (() => {
                          const d = new Date(e.dueDate); d.setHours(0,0,0,0);
                          const t = new Date(); t.setHours(0,0,0,0);
                          return d.getTime() === t.getTime();
                        })();
                        return (
                          <TableRow key={e.id} className={`h-[56px] ${isDueToday ? "bg-amber-50/70 dark:bg-amber-950/20 hover:bg-amber-50" : isOverdue ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-muted/40"}`}>
                            <TableCell className="py-2">
                              <div className="font-semibold text-sm leading-tight flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> <span className="truncate max-w-[150px]">{e.customer.name}</span>
                                {e.order?.orderNumber && <span className="hidden sm:inline text-[10px] px-1 py-0.5 rounded bg-muted border font-mono">{e.order.orderNumber.slice(0, 12)}</span>}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                {e.customer.phone ? <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {e.customer.phone}</span> : <span className="text-muted-foreground/70">No phone</span>}
                                <span className="hidden sm:inline text-[11px]">• Due ₹{e.customer.balance.toFixed(0)}</span>
                              </div>
                              <div className="text-[11px] text-muted-foreground sm:hidden">Term: {e.creditDays}d • {daysLeft(e.dueDate)}</div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-black text-sm">{formatINR(e.amount)}</div>
                              {e.note && <div className="text-[11px] text-muted-foreground truncate max-w-[120px] ml-auto">{e.note}</div>}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant="outline" className="text-xs font-mono">{e.creditDays}d</Badge>
                              <div className="text-[11px] text-muted-foreground">{e.creditDays === 30 ? "1 month" : `${e.creditDays} days`}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs font-medium">{formatDate(e.dueDate)}</div>
                              <div className={`text-[11px] font-semibold ${isOverdue ? "text-destructive" : isDueToday ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>{e.status === "settled" ? `Settled ${e.settledAt ? formatDate(e.settledAt) : ""}` : daysLeft(e.dueDate)}</div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {e.status === "pending" ? (
                                isOverdue ? <Badge variant="destructive" className="text-[11px]"><AlertTriangle className="w-3 h-3" /> Overdue</Badge> : isDueToday ? <Badge className="bg-amber-600 text-white text-[11px]">Due today</Badge> : <Badge variant="secondary" className="text-[11px]">Pending</Badge>
                              ) : <Badge className="bg-primary text-white text-[11px]"><CheckCircle2 className="w-3 h-3" /> Settled</Badge>}
                            </TableCell>
                            <TableCell className="text-right">
                              {e.status === "pending" ? (
                                <Button size="sm" className="h-7 text-xs bg-primary hover:bg-primary text-white gap-1" onClick={() => handleSettle(e)}>
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Settle
                                </Button>
                              ) : (
                                <div className="flex justify-end gap-1">
                                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleReopen(e)}><Undo2 className="w-3 h-3" /> Reopen</Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-[11px] text-muted-foreground text-center pb-2">
            Tip: Due Today = khata where <span className="font-mono px-1 py-0.5 bg-muted rounded">dueDate = today</span>. Pending includes everything not yet settled. Very simple — no interest, no partials, no support burden.
          </div>
        </div>
      </div>

      {/* Add Khata Dialog — very simple */}
      <Dialog open={addOpen} onOpenChange={(v) => !v && setAddOpen(false)}>
        <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3">
            <DialogTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Add Khata — manual credit</DialogTitle>
            <DialogDescription className="text-[11px]">E.g., ₹200 for 7 days. Pick customer, amount &amp; term. Due date auto-calculated.</DialogDescription>
          </DialogHeader>
          <div className="px-5 pb-5 space-y-3">
            {/* customer picker */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">Customer *</Label>
              {selectedCustomer ? (
                <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/20 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate text-xs">{selectedCustomer.name}</div>
                    {selectedCustomer.phone && <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedCustomer.phone}</div>}
                  </div>
                  <Badge variant="secondary" className="text-[11px]">Due ₹{selectedCustomer.balance.toFixed(0)}</Badge>
                  <Button variant="ghost" size="icon-xs" className="h-6 w-6 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={clearSelectedCustomer} aria-label="Clear selection"><Trash2 className="w-4 h-4" /></Button>
                </div>
              ) : (
                <Popover open={showCustDropdown} onOpenChange={(o) => { if (!o) setShowCustDropdown(false); }}>
                  <PopoverTrigger
                    render={<div className="w-full" />}
                    nativeButton={false}
                  >
                    <SearchBox
                      placeholder="Search customer by name or phone..."
                      value={custQuery}
                      onValueChange={handleCustImmediate}
                      onSearch={() => {}}
                      onClear={() => { setCustQuery(""); setCustResults([]); setShowCustDropdown(false); }}
                      onFocusSearch={(q) => { if (q.trim().length >= 2) handleCustImmediate(q); }}
                      inputRef={custInputRef}
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--anchor-width)] p-0" align="start" sideOffset={6}>
                    <Command shouldFilter={false} className="rounded-lg">
                      <CommandList>
                        {custResults.length > 0 ? (
                          <CommandGroup>
                            {custResults.map((c) => (
                              <CommandItem key={c.id} value={c.id} onSelect={() => handleSelectCustomer(c)} className="flex items-center justify-between gap-2 py-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium truncate">{c.name}</div>
                                  {c.phone ? <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</div> : <div className="text-xs text-muted-foreground">No phone</div>}
                                </div>
                                {c.balance > 0 && <Badge variant="destructive" className="text-[11px]">Due ₹{c.balance.toFixed(0)}</Badge>}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        ) : (
                          <CommandEmpty className="py-6 text-center">
                            <div className="text-sm text-muted-foreground">No customers for “{custQuery}”</div>
                            <div className="text-xs text-muted-foreground mt-1">Enter name below to create new</div>
                          </CommandEmpty>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
              {!selectedCustomer && (
                <div className="grid grid-cols-2 gap-2">
                  <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Name (e.g., Ramesh)" className="h-8 text-xs" />
                  <Input value={manualPhone} onChange={(e) => setManualPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Phone (10 digits)" className="h-8 text-xs font-mono" />
                </div>
              )}
              {!selectedCustomer && manualName.trim() && <div className="text-[11px] text-primary">New customer will be created: {manualName.trim()} {manualPhone ? `• ${manualPhone}` : ""}</div>}
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Amount (₹) *</Label>
              <Input type="number" min={1} value={amountStr} onChange={(e) => setAmountStr(e.target.value)} placeholder="e.g., 200" className="h-8 text-xs font-mono font-bold" autoFocus />
              <div className="flex gap-1.5 flex-wrap">
                {[200, 500, 1000, 2000].map((a) => (
                  <Button key={a} variant="outline" size="sm" className="h-6 text-[11px] px-2" onClick={() => setAmountStr(String(a))}>₹{a}</Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">Credit term *</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {TERM_OPTIONS.map((t) => (
                  <Button key={t.value} type="button" variant={term === t.value ? "default" : "outline"} size="sm" className={`h-8 text-xs ${term === t.value ? "bg-primary hover:bg-primary/90 text-white" : ""}`} onClick={() => setTerm(t.value)}>
                    {t.label}
                  </Button>
                ))}
              </div>
              {term === "custom" && (
                <Input type="number" min={1} max={365} value={customDays} onChange={(e) => setCustomDays(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="Custom days (1-365)" className="h-8 text-xs" />
              )}
              <div className="text-[11px] font-medium text-muted-foreground">
                {(() => {
                  const d = getCreditDays();
                  if (!d) return "Select a term";
                  const due = new Date(); due.setHours(0,0,0,0); due.setDate(due.getDate() + d);
                  return `Due: ${d} day${d > 1 ? "s" : ""} → ${due.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}`;
                })()}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">Note <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g., Kirana, milk etc." className="h-8 text-xs" />
            </div>

            {formError && <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-2.5 py-1.5 text-xs font-medium text-destructive">{formError}</div>}
          </div>
          <DialogFooter className="p-4 gap-3 sm:justify-end">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving} className="h-9 px-6">Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-primary hover:bg-primary/90 text-white h-9 px-6 min-w-[140px]">
              {saving ? "Adding..." : `Add ${amountStr ? formatINR(parseFloat(amountStr) || 0) : "Khata"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
