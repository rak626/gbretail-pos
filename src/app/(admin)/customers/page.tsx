"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchBox from "@/components/SearchBox";
import { formatINR } from "@/lib/utils";
import { fetchCustomersPaged } from "@/lib/api";
import type { Customer } from "@/db/database";
import CustomerDrawer from "@/components/customers/CustomerDrawer";
import CustomerFormDialog from "@/components/customers/CustomerFormDialog";
import {
  Users,
  Search,
  Plus,
  Phone,
  Wallet,
  TrendingUp,
  Calendar,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Trash2,
  User,
  Edit2,
  Eye,
} from "lucide-react";

const SORT_OPTIONS = [
  { value: "createdAt", label: "Newest first" },
  { value: "name", label: "Name A–Z" },
  { value: "totalSpent", label: "Highest spent" },
  { value: "totalOrders", label: "Most orders" },
  { value: "balance", label: "Highest dues" },
  { value: "lastOrderAt", label: "Recently ordered" },
] as const;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [hasBalance, setHasBalance] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<{ totalCustomers: number; active30d: number; withDues: { count: number; amount: number }; withoutDues: number; topSpender: { name: string; totalSpent: number } | null } | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(async (p = page, q = search, sb = sortBy, so = sortOrder, hb = hasBalance) => {
    if (q && q.startsWith(" ")) return;
    if (q && q.trim().length > 0 && q.trim().length < 2) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");
    try {
      const data = await fetchCustomersPaged({
        q: q.trim() || undefined,
        page: p,
        limit,
        sortBy: sb,
        sortOrder: so,
        hasBalance: hb === "all" ? undefined : hb,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setCustomers(data.customers as unknown as Customer[]);
      setTotal(data.total);
      setPage(data.page);
      if (data.stats) setStats(data.stats as any);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Failed to load customers");
      setCustomers([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [page, search, sortBy, sortOrder, hasBalance]);

  useEffect(() => {
    load(1, "", sortBy, sortOrder, hasBalance);
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchImmediate = (v: string) => {
    if (v.startsWith(" ")) return;
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = v.trim();
    if (!trimmed) {
      debounceRef.current = setTimeout(() => load(1, "", sortBy, sortOrder, hasBalance), 250);
      return;
    }
    if (trimmed.length < 2) return;
    debounceRef.current = setTimeout(() => load(1, v, sortBy, sortOrder, hasBalance), 350);
  };

  const handleSearchDebounced = (trimmed: string) => {
    if (!trimmed || trimmed.length < 2) {
      if (!trimmed) load(1, "", sortBy, sortOrder, hasBalance);
      return;
    }
    load(1, trimmed, sortBy, sortOrder, hasBalance);
  };

  const handleClearSearch = () => {
    setSearch("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    load(1, "", sortBy, sortOrder, hasBalance);
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const handleSort = (v: string) => {
    setSortBy(v);
    // auto sortOrder: name asc, others desc
    const so = v === "name" ? "asc" : "desc";
    setSortOrder(so);
    load(1, search, v, so, hasBalance);
  };

  const handleHasBalance = (v: string) => {
    setHasBalance(v);
    load(1, search, sortBy, sortOrder, v);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const openDrawer = (id: string) => {
    setSelectedId(id);
    setDrawerOpen(true);
  };

  const handleAdded = () => {
    load(1, search, sortBy, sortOrder, hasBalance);
  };

  const handleDeleted = () => {
    load(page, search, sortBy, sortOrder, hasBalance);
  };

  return (
    <>
      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-6xl mx-auto space-y-3">
          {/* header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-semibold flex items-center gap-1.5"><Users className="w-4 h-4 text-primary" /> Customers</h1>
              <Badge variant="secondary" className="rounded-full text-xs font-normal px-2.5 hidden sm:inline-flex">{total} total</Badge>
            </div>
            <Button onClick={() => setAddOpen(true)} className="shrink-0 gap-1.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"><Plus className="w-4 h-4" /> Add Customer</Button>
          </div>

          {/* stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="py-0 gap-0">
              <CardContent className="p-3.5 flex flex-row items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border flex items-center justify-center text-primary shrink-0"><Users className="w-5 h-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">Total</div>
                  <div className="text-xl font-black leading-none">{stats ? stats.totalCustomers : total}</div>
                  <div className="text-[11px] text-muted-foreground">customers</div>
                </div>
              </CardContent>
            </Card>
            <Card className="py-0 gap-0">
              <CardContent className="p-3.5 flex flex-row items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0"><Calendar className="w-5 h-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-wide font-semibold text-primary dark:text-primary">Active 30d</div>
                  <div className="text-xl font-black leading-none">{stats?.active30d ?? "—"}</div>
                  <div className="text-[11px] text-muted-foreground">ordered recently</div>
                </div>
              </CardContent>
            </Card>
            <Card className="py-0 gap-0 border-amber-200 bg-amber-50/40 dark:bg-amber-950/20">
              <CardContent className="p-3.5 flex flex-row items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0"><Wallet className="w-5 h-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-wide font-semibold text-amber-800 dark:text-amber-200">With dues</div>
                  <div className="text-xl font-black leading-none">{stats?.withDues.count ?? 0}</div>
                  <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300">{stats ? formatINR(stats.withDues.amount).replace(".00","") : "—"}</div>
                </div>
              </CardContent>
            </Card>
            <Card className="py-0 gap-0">
              <CardContent className="p-3.5 flex flex-row items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/50 text-white flex items-center justify-center shrink-0"><TrendingUp className="w-5 h-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-wide font-semibold text-primary dark:text-primary">Top spender</div>
                  <div className="text-sm font-black leading-none truncate">{stats?.topSpender?.name ?? "—"}</div>
                  <div className="text-[11px] font-bold text-primary dark:text-primary">{stats?.topSpender ? formatINR(stats.topSpender.totalSpent).replace(".00","") : "No data"}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* toolbar */}
          <Card className="py-0 border-primary/20 ring-1 ring-primary/5">
            <CardContent className="p-1.5 flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 min-w-0">
                  <SearchBox
                    placeholder="Search by name, phone or email..."
                    leftIcon={<Search className="w-4 h-4" />}
                    value={search}
                    onValueChange={handleSearchImmediate}
                    onSearch={handleSearchDebounced}
                    onClear={handleClearSearch}
                    onFocusSearch={(q) => { const t = q.trim(); if (t && t.length >= 2) handleSearchDebounced(t); }}
                    inputRef={searchRef}
                    variant="plain"
                  />
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <Select value={hasBalance} onValueChange={(v) => handleHasBalance(v ?? "all")}>
                    <SelectTrigger size="sm" className="h-9 min-w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All dues</SelectItem>
                      <SelectItem value="with">With dues</SelectItem>
                      <SelectItem value="without">No dues</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(v) => handleSort(v ?? "createdAt")}>
                    <SelectTrigger size="sm" className="h-9 min-w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {(search || hasBalance !== "all") && <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setHasBalance("all"); load(1, "", sortBy, sortOrder, "all"); }}>Clear</Button>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* table */}
          <Card className="py-0 overflow-hidden">
            <CardHeader className="py-3 border-b flex-row items-center justify-between bg-muted/20">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Customers {loading && <span className="text-xs font-normal text-muted-foreground">loading...</span>}
                <Badge variant="outline" className="font-normal text-xs">{customers.length} {customers.length===1?"customer":"customers"} {total>customers.length ? `• ${total} total` : ""}</Badge>
              </CardTitle>
              <div className="text-xs text-muted-foreground hidden sm:block">Only name is required • click row to view</div>
            </CardHeader>
            <CardContent className="p-0">
              {error ? (
                <div className="p-6 text-center">
                  <div className="text-sm text-destructive font-medium">{error}</div>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => load(page, search, sortBy, sortOrder, hasBalance)}>Retry</Button>
                </div>
              ) : customers.length === 0 && !loading ? (
                <div className="p-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted border flex items-center justify-center mx-auto mb-3"><Users className="w-6 h-6 text-muted-foreground" /></div>
                  <div className="text-sm font-semibold">No customers found</div>
                  <div className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    {search || hasBalance !== "all" ? "Try a different search or clear filters." : "Add your first customer — only name is required. They'll appear here with total orders & previous bills."}
                  </div>
                  <Button onClick={() => setAddOpen(true)} size="sm" className="mt-3"><Plus className="w-4 h-4" /> Add Customer</Button>
                </div>
              ) : (
                <div className="overflow-auto max-h-[56vh]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card shadow-sm z-10">
                      <TableRow className="hover:bg-transparent h-10">
                        <TableHead className="text-xs">Customer</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell">Phone</TableHead>
                        <TableHead className="text-xs text-center">Orders</TableHead>
                        <TableHead className="text-xs text-right">Total spent</TableHead>
                        <TableHead className="text-xs text-right hidden md:table-cell">Avg order</TableHead>
                        <TableHead className="text-xs text-right">Dues</TableHead>
                        <TableHead className="text-xs hidden lg:table-cell">Last order</TableHead>
                        <TableHead className="text-xs text-right">View</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((c) => {
                        const avg = c.totalOrders ? (c.totalSpent ?? 0) / c.totalOrders : 0;
                        const isDue = (c.balance ?? 0) > 0;
                        return (
                          <TableRow key={c.id} className="hover:bg-muted/40 cursor-pointer h-[56px]" onClick={() => openDrawer(c.id)}>
                            <TableCell className="py-2">
                              <div className="font-semibold text-sm leading-tight truncate max-w-[160px] flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> {c.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground sm:hidden flex items-center gap-1">
                                {c.phone ? <><Phone className="w-3 h-3" /> {c.phone}</> : "No phone"}
                              </div>
                              {(c as any).email && <div className="text-[11px] text-muted-foreground hidden sm:block truncate max-w-[160px]">{(c as any).email}</div>}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {c.phone ? <span className="font-mono text-xs flex items-center gap-1"><Phone className="w-3 h-3 text-muted-foreground" /> {c.phone}</span> : <span className="text-xs text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-xs font-mono gap-1"><ShoppingBag className="w-3 h-3" /> {c.totalOrders ?? 0}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold text-xs">{formatINR(c.totalSpent ?? 0).replace(".00","")}</TableCell>
                            <TableCell className="text-right hidden md:table-cell text-xs text-muted-foreground">{c.totalOrders ? formatINR(avg).replace(".00","") : "—"}</TableCell>
                            <TableCell className="text-right">
                              {isDue ? <Badge variant="destructive" className="text-[11px]">{formatINR(c.balance).replace(".00","")}</Badge> : <Badge variant="outline" className="text-[11px]">No dues</Badge>}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                              {c.lastOrderAt ? new Date(c.lastOrderAt as unknown as string).toLocaleDateString("en-IN") : <span className="text-muted-foreground/70">Never</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); openDrawer(c.id); }}>
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              {/* pagination */}
              {total > limit && (
                <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/20 text-xs">
                  <span className="text-muted-foreground">Page {page} of {totalPages} • {total} customers</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 gap-1" disabled={page <= 1 || loading} onClick={() => load(page - 1, search, sortBy, sortOrder, hasBalance)}>
                      <ChevronLeft className="w-3 h-3" /> Prev
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 gap-1" disabled={page >= totalPages || loading} onClick={() => load(page + 1, search, sortBy, sortOrder, hasBalance)}>
                      Next <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-[11px] text-muted-foreground text-center pb-2">
            Tip: Search works by <span className="font-mono px-1 py-0.5 bg-muted rounded">name • phone • email</span>. Click any row to see total orders, previous orders, dues & edit — drawer slides in. Only name is required when adding.
          </div>
        </div>
      </div>

      <CustomerDrawer open={drawerOpen} onOpenChange={setDrawerOpen} customerId={selectedId} onDeleted={handleDeleted} onUpdated={handleDeleted} />
      <CustomerFormDialog open={addOpen} onOpenChange={setAddOpen} onSaved={handleAdded} />
    </>
  );
}
