"use client";

import type { Metadata } from "next";
import { useState, useEffect, useCallback, useMemo, Suspense, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Download, FileText, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransactionSheet } from "@/components/transactions/TransactionSheet";
import { RecurringTransactionsSection } from "@/components/transactions/RecurringTransactionsSection";
import { TransactionTable, type TransactionSortKey, transactionSortKeyLabels, nextTransactionSort } from "@/components/transactions/TransactionTable";
import { TransferSection } from "@/components/transfers/TransferSection";
import { NameColor } from "@/components/ui/name-color";
import type { Transaction, Settings } from "@/lib/types";
import { useSearchParams, useRouter } from "next/navigation";

type ExportFormat = "csv" | "tsv" | "xls" | "xlsx" | "pdf";

const exportColumns = [
  { key: "date", label: "Date" },
  { key: "heading", label: "Heading" },
  { key: "type", label: "Type" },
  { key: "category", label: "Category" },
  { key: "subCategory", label: "Sub-Category" },
  { key: "account", label: "Account" },
  { key: "subAccount", label: "Sub-Account" },
  { key: "amount", label: "Amount" },
  { key: "description", label: "Description" },
] as const;

function exportValue(transaction: Transaction, key: (typeof exportColumns)[number]["key"]) {
  if (key === "date") return transaction.date;
  if (key === "amount") return String(transaction.amount);
  return transaction[key] ?? "";
}

function downloadText(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeDelimitedValue(value: string, delimiter: string) {
  return value.includes(delimiter) || value.includes('"') || value.includes("\n")
    ? `"${value.replaceAll('"', '""')}"`
    : value;
}

export const metadata: Metadata = {
  title: "Transactions",
};

export default function TransactionsPageClient() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6 mb-16 scrollbar-hide">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          </div>
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading Transactions…</p>
          </div>
        </div>
      }
    >
      <TransactionsPageContent />
    </Suspense>
  );
}

function TransactionsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<Settings>({
    _id: "singleton-settings",
    _type: "settings",
    username: "kanavgoyal898",
    categories: [],
    accounts: [],
  });

  // Filters
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterSubCategory, setFilterSubCategory] = useState("all");
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterSubAccount, setFilterSubAccount] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [username, setUsername] = useState("username");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Sorting — surfaced on mobile next to the Export button
  const [sortKey, setSortKey] = useState<TransactionSortKey>("_updatedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  function handleSortChange(nextKey: TransactionSortKey) {
    const next = nextTransactionSort(sortKey, sortDirection, nextKey);
    setSortKey(next.key);
    setSortDirection(next.direction);
  }

  function handleToggleSortDirection() {
    setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
  }

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    if (options?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterCategory && filterCategory !== "all") params.set("category", filterCategory);
      if (filterSubCategory && filterSubCategory !== "all") params.set("subCategory", filterSubCategory);
      if (filterAccount && filterAccount !== "all") params.set("account", filterAccount);
      if (filterSubAccount && filterSubAccount !== "all") params.set("subAccount", filterSubAccount);
      if (filterType && filterType !== "all") params.set("type", filterType);
      if (startDate) params.set("from", startDate);
      if (endDate) params.set("to", endDate);

      const [expRes, settRes] = await Promise.all([
        fetch(`/api/transactions?${params}`),
        fetch("/api/settings"),
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
      if (options?.silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [search, filterCategory, filterSubCategory, filterAccount, filterSubAccount, filterType, startDate, endDate]);

  function handleRefresh() {
    fetchData({ silent: true });
  }

  const refreshButton = (
    <Button
      variant="outline"
      aria-label="Refresh transactions"
      disabled={loading || refreshing}
      onClick={handleRefresh}
    >
      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">Refresh</span>
    </Button>
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((user) => {
        if (typeof user.username === "string" && user.username) setUsername(user.username);
      })
      .catch(() => undefined);
  }, []);

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
    setFilterSubCategory("all");
    setFilterAccount("all");
    setFilterSubAccount("all");
    setFilterType("all");
    setStartDate("");
    setEndDate("");
  }

  function exportTransactions(exportFormat: ExportFormat) {
    const rows = transactions.map((transaction) =>
      Object.fromEntries(exportColumns.map(({ key, label }) => [label, exportValue(transaction, key)])),
    );
    const filename = `${username}-transactions.${exportFormat}`;

    if (exportFormat === "csv" || exportFormat === "tsv") {
      const delimiter = exportFormat === "csv" ? "," : "\t";
      const content = [
        exportColumns.map(({ label }) => escapeDelimitedValue(label, delimiter)).join(delimiter),
        ...rows.map((row) => exportColumns.map(({ label }) => escapeDelimitedValue(String(row[label]), delimiter)).join(delimiter)),
      ].join("\n");
      downloadText(`\ufeff${content}`, filename, exportFormat === "csv" ? "text/csv;charset=utf-8" : "text/tab-separated-values;charset=utf-8");
      return;
    }

    if (exportFormat === "xls" || exportFormat === "xlsx") {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
      XLSX.writeFile(workbook, filename, { bookType: exportFormat });
      return;
    }

    const pdf = new jsPDF({ orientation: "landscape" });
    pdf.setFontSize(10);
    pdf.text("Ledger Transactions", 14, 14);
    pdf.setFontSize(7);
    let y = 22;
    const lines = [
      exportColumns.map(({ label }) => label).join(" | "),
      ...rows.map((row) => exportColumns.map(({ label }) => String(row[label])).join(" | ")),
    ];
    for (const line of lines) {
      const wrappedLines = pdf.splitTextToSize(line, 268);
      if (y + wrappedLines.length * 4 > 195) {
        pdf.addPage();
        y = 14;
      }
      pdf.text(wrappedLines, 14, y);
      y += wrappedLines.length * 4;
    }
    pdf.save(filename);
  }

  const hasFilters =
    search ||
    (filterCategory && filterCategory !== "all") ||
    (filterSubCategory && filterSubCategory !== "all") ||
    (filterAccount && filterAccount !== "all") ||
    (filterSubAccount && filterSubAccount !== "all") ||
    (filterType && filterType !== "all") ||
    startDate ||
    endDate;

  const subCategories = useMemo(
    () => settings.categories
      ?.filter((category) => filterCategory === "all" || category.label === filterCategory)
      .flatMap((category) => category.subCategories?.slice() ?? [])
      .sort((a, b) => a.label.localeCompare(b.label)) ?? [],
    [settings.categories, filterCategory],
  );
  const subAccounts = useMemo(
    () => settings.accounts
      ?.filter((account) => filterAccount === "all" || account.label === filterAccount)
      .flatMap((account) => account.subAccounts?.slice() ?? [])
      .sort((a, b) => a.label.localeCompare(b.label)) ?? [],
    [settings.accounts, filterAccount],
  );

  const exportMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" disabled={loading} />}>
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Export</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportTransactions("csv")}><FileText /> CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportTransactions("tsv")}><FileText /> TSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportTransactions("xls")}><FileText /> Excel 97-2003 (.xls)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportTransactions("xlsx")}><FileText /> Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportTransactions("pdf")}><FileText /> PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex flex-col gap-6 mb-16 scrollbar-hide">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-md border p-4">
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          className="flex items-center justify-between gap-2"
          aria-expanded={filtersOpen}
          aria-controls="transaction-filters-panel"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasFilters && (
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                Active
              </span>
            )}
          </span>
          {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {filtersOpen && (
          <div id="transaction-filters-panel" className="flex flex-col gap-3">
            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters} className="self-end">
                <X className="h-4 w-4" />
                Clear all filters
              </Button>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="relative sm:col-span-3">
                <label htmlFor="search-input" className="mb-1.5 block text-sm font-medium">Search</label>
                <Search className="absolute left-2.5 top-8.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-input"
                  placeholder="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 text-xs sm:text-base"
                />
              </div>

              <div>
                <FilterSelect
                  id="filter-type"
                  label="Transaction Type"
                  value={filterType}
                  onValueChange={setFilterType}
                  valueLabels={{ income: "Income", expense: "Expense" }}
                >
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </FilterSelect>
              </div>

              <div className="sm:col-span-2 sm:col-start-1">
                <DateFilter id="filter-start-date" label="Start date" value={startDate} onChange={setStartDate} />
              </div>
              <div className="sm:col-span-2">
                <DateFilter id="filter-end-date" label="End date" value={endDate} onChange={setEndDate} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FilterSelect id="filter-category" label="Category" value={filterCategory} onValueChange={(value) => { setFilterCategory(value); setFilterSubCategory("all"); }}>
              <SelectItem value="all">All</SelectItem>
              {settings.categories?.slice().sort((a, b) => a.label.localeCompare(b.label)).map((category) => (
                <SelectItem key={category._key} value={category.label}><NameColor name={category.label} />{category.label}</SelectItem>
              ))}
              </FilterSelect>

              <FilterSelect id="filter-subcategory" label="Sub-Category" value={filterSubCategory} onValueChange={setFilterSubCategory} disabled={filterCategory === "all"}>
              <SelectItem value="all">All</SelectItem>
              {subCategories.map((subCategory) => <SelectItem key={subCategory.label} value={subCategory.label}>{subCategory.label}</SelectItem>)}
              </FilterSelect>

              <FilterSelect id="filter-account" label="Account" value={filterAccount} onValueChange={(value) => { setFilterAccount(value); setFilterSubAccount("all"); }}>
              <SelectItem value="all">All</SelectItem>
              {settings.accounts?.slice().sort((a, b) => a.label.localeCompare(b.label)).map((account) => (
                <SelectItem key={account._key} value={account.label}><NameColor name={account.label} />{account.label}</SelectItem>
              ))}
              </FilterSelect>

              <FilterSelect id="filter-subaccount" label="Sub-Account" value={filterSubAccount} onValueChange={setFilterSubAccount} disabled={filterAccount === "all"}>
              <SelectItem value="all">All</SelectItem>
              {subAccounts.map((subAccount) => <SelectItem key={subAccount.label} value={subAccount.label}>{subAccount.label}</SelectItem>)}
              </FilterSelect>
            </div>
          </div>
        )}
      </div>

      {/* Mobile & Tablet: sort control + refresh + export */}
      <div className="flex flex-row flex-wrap items-center justify-between gap-2 lg:hidden">
        <div className="flex items-center gap-2">
          <Select value={sortKey} onValueChange={(value) => value && handleSortChange(value as TransactionSortKey)}>
            <SelectTrigger className="w-32 sm:w-40" aria-label="Sort transactions by">
              <SelectValue>
                {(selectedValue: TransactionSortKey) => transactionSortKeyLabels[selectedValue] ?? selectedValue}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false} className="p-1 lg:p-2">
              <SelectItem value="_updatedAt">Last modified</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="heading">Heading</SelectItem>
              <SelectItem value="type">Type</SelectItem>
              <SelectItem value="category">Category</SelectItem>
              <SelectItem value="account">Account</SelectItem>
              <SelectItem value="amount">Amount</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            aria-label={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
            onClick={handleToggleSortDirection}
          >
            {sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {refreshButton}
          {exportMenu}
        </div>
      </div>

      {/* Desktop: export only, right-aligned — sorting happens via table column headers */}
      <div className="hidden justify-end gap-2 lg:flex">
        {refreshButton}
        {exportMenu}
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
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
        />
      )}

      <RecurringTransactionsSection settings={settings} />
      <TransferSection settings={settings} />

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

function FilterSelect({
  id,
  label,
  value,
  onValueChange,
  children,
  disabled = false,
  valueLabels,
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
  valueLabels?: Record<string, string>;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      <Select value={value} onValueChange={(nextValue) => nextValue && onValueChange(nextValue)}>
        <SelectTrigger id={id} disabled={disabled} className="w-full">
          <SelectValue>
            {(selectedValue: string) =>
              selectedValue === "all" ? "All" : valueLabels?.[selectedValue] ?? selectedValue
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false} className="p-1 lg:p-2">{children}</SelectContent>
      </Select>
    </div>
  );
}

function DateFilter({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="min-w-0 w-full">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-0 max-w-full"
      />
    </div>
  );
}
