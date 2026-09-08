"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { TransactionSheet } from "@/components/transactions/TransactionSheet";
import { RecurringTransactionsSection } from "@/components/transactions/RecurringTransactionsSection";
import type { Transaction, Settings } from "@/lib/types";
import { useSearchParams, useRouter } from "next/navigation";

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<Settings>({
    _id: "singleton-settings",
    _type: "settings",
    categories: [],
    accounts: [],
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterCategory && filterCategory !== "all") params.set("category", filterCategory);
      if (filterAccount && filterAccount !== "all") params.set("account", filterAccount);
      if (filterFrom) params.set("from", new Date(filterFrom).toISOString());
      if (filterTo) {
        const to = new Date(filterTo);
        to.setHours(23, 59, 59, 999);
        params.set("to", to.toISOString());
      }

      const [expRes, settRes] = await Promise.all([
        fetch(`/api/transactions?${params}`),
        fetch("/api/settings"),
        fetch("/api/recurring"),
      ]);

      const [expData, settData] = await Promise.all([
        expRes.json(),
        settRes.json(),
      ]);

      setTransactions(Array.isArray(expData) ? expData : []);
      setSettings(settData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, [search, filterCategory, filterAccount, filterFrom, filterTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-open the sheet when navigated with ?new=1
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditingTransaction(null);
      setSheetOpen(true);
      // Clean the param from the URL without a navigation
      router.replace("/transactions", { scroll: false });
    }
  }, [searchParams, router]);

  function openEdit(transaction: Transaction) {
    setEditingTransaction(transaction);
    setSheetOpen(true);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    await fetchData();
  }

  function clearFilters() {
    setSearch("");
    setFilterCategory("all");
    setFilterAccount("all");
    setFilterFrom("");
    setFilterTo("");
  }

  const hasFilters =
    search ||
    (filterCategory && filterCategory !== "all") ||
    (filterAccount && filterAccount !== "all") ||
    filterFrom ||
    filterTo;

  return (
    <div className="flex flex-col gap-6 mb-16 scrollbar-hide">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="search-input"
            placeholder="Search Transactions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger id="filter-category" className="w-44">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {settings.categories?.map((c) => (
              <SelectItem key={c._key} value={c.label}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterAccount} onValueChange={setFilterAccount}>
          <SelectTrigger id="filter-account" className="w-40">
            <SelectValue placeholder="All Accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {settings.accounts?.map((a) => (
              <SelectItem key={a._key} value={a.label}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          id="filter-from"
          type="date"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          className="w-40"
          aria-label="From Date"
        />
        <Input
          id="filter-to"
          type="date"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          className="w-40"
          aria-label="To Date"
        />

        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading Transactions…</p>
        </div>
      ) : (
        <TransactionTable
          transactions={transactions}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      <RecurringTransactionsSection />

      {/* Create / Edit Sheet */}
      <TransactionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        transaction={editingTransaction}
        settings={settings}
        onSuccess={fetchData}
      />
    </div>
  );
}
