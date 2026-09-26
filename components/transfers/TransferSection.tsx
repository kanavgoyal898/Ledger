"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Download, FileText, Plus, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
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
import { NameColor } from "@/components/ui/name-color";
import { TransferSheet } from "@/components/transfers/TransferSheet";
import { TransferTable, type TransferSortKey, transferSortKeyLabels, nextTransferSort } from "@/components/transfers/TransferTable";
import { type Transfer, type Settings } from "@/lib/types";

type ExportFormat = "csv" | "tsv" | "xls" | "xlsx" | "pdf";

const exportColumns = [
  { key: "date", label: "Date" },
  { key: "heading", label: "Heading" },
  { key: "fromAccount", label: "From Account" },
  { key: "fromSubAccount", label: "From Sub-Account" },
  { key: "toAccount", label: "To Account" },
  { key: "toSubAccount", label: "To Sub-Account" },
  { key: "amount", label: "Amount" },
  { key: "description", label: "Description" },
] as const;

function exportValue(transfer: Transfer, key: (typeof exportColumns)[number]["key"]) {
  if (key === "date") return transfer.date;
  if (key === "amount") return String(transfer.amount);
  return transfer[key] ?? "";
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

export function TransferSection({ settings }: { settings: Settings }) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [username, setUsername] = useState("username");

  // Filters
  const [search, setSearch] = useState("");
  const [filterFromAccount, setFilterFromAccount] = useState("all");
  const [filterFromSubAccount, setFilterFromSubAccount] = useState("all");
  const [filterToAccount, setFilterToAccount] = useState("all");
  const [filterToSubAccount, setFilterToSubAccount] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Sorting — surfaced on mobile/tablet next to the Export button
  const [sortKey, setSortKey] = useState<TransferSortKey>("_updatedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  function handleSortChange(nextKey: TransferSortKey) {
    const next = nextTransferSort(sortKey, sortDirection, nextKey);
    setSortKey(next.key);
    setSortDirection(next.direction);
  }

  function handleToggleSortDirection() {
    setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
  }

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (options?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await fetch("/api/transfers");
      setTransfers(await response.json());
    } finally {
      if (options?.silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((user) => {
        if (typeof user.username === "string" && user.username) setUsername(user.username);
      })
      .catch(() => undefined);
  }, []);

  function handleRefresh() {
    load({ silent: true });
  }

  async function handleDelete(id: string) {
    await fetch(`/api/transfers/${id}`, { method: "DELETE" });
    await load();
  }

  function clearFilters() {
    setSearch("");
    setFilterFromAccount("all");
    setFilterFromSubAccount("all");
    setFilterToAccount("all");
    setFilterToSubAccount("all");
    setStartDate("");
    setEndDate("");
  }

  const filteredTransfers = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    return transfers.filter((transfer) => {
      if (filterFromAccount !== "all" && transfer.fromAccount !== filterFromAccount) return false;
      if (filterFromSubAccount !== "all" && transfer.fromSubAccount !== filterFromSubAccount) return false;
      if (filterToAccount !== "all" && transfer.toAccount !== filterToAccount) return false;
      if (filterToSubAccount !== "all" && transfer.toSubAccount !== filterToSubAccount) return false;
      if (startDate && transfer.date.slice(0, 10) < startDate) return false;
      if (endDate && transfer.date.slice(0, 10) > endDate) return false;
      if (searchTerm) {
        const haystack = [
          transfer.heading, transfer.description, transfer.fromAccount,
          transfer.fromSubAccount, transfer.toAccount, transfer.toSubAccount,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(searchTerm)) return false;
      }
      return true;
    });
  }, [transfers, search, filterFromAccount, filterFromSubAccount, filterToAccount, filterToSubAccount, startDate, endDate]);

  function exportTransfers(exportFormat: ExportFormat) {
    const rows = filteredTransfers.map((transfer) =>
      Object.fromEntries(exportColumns.map(({ key, label }) => [label, exportValue(transfer, key)])),
    );
    const filename = `${username}-transfers.${exportFormat}`;

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
      XLSX.utils.book_append_sheet(workbook, worksheet, "Transfers");
      XLSX.writeFile(workbook, filename, { bookType: exportFormat });
      return;
    }

    const pdf = new jsPDF({ orientation: "landscape" });
    pdf.setFontSize(10);
    pdf.text("Ledger Transfers", 14, 14);
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
    (filterFromAccount && filterFromAccount !== "all") ||
    (filterFromSubAccount && filterFromSubAccount !== "all") ||
    (filterToAccount && filterToAccount !== "all") ||
    (filterToSubAccount && filterToSubAccount !== "all") ||
    startDate ||
    endDate;

  const fromSubAccounts = useMemo(
    () => settings.accounts
      ?.filter((account) => filterFromAccount === "all" || account.label === filterFromAccount)
      .flatMap((account) => account.subAccounts?.slice() ?? [])
      .sort((a, b) => a.label.localeCompare(b.label)) ?? [],
    [settings.accounts, filterFromAccount],
  );
  const toSubAccounts = useMemo(
    () => settings.accounts
      ?.filter((account) => filterToAccount === "all" || account.label === filterToAccount)
      .flatMap((account) => account.subAccounts?.slice() ?? [])
      .sort((a, b) => a.label.localeCompare(b.label)) ?? [],
    [settings.accounts, filterToAccount],
  );

  const refreshButton = (
    <Button
      variant="outline"
      aria-label="Refresh transfers"
      disabled={loading || refreshing}
      onClick={handleRefresh}
    >
      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">Refresh</span>
    </Button>
  );

  const exportMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" disabled={loading} />}>
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Export</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportTransfers("csv")}><FileText /> CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportTransfers("tsv")}><FileText /> TSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportTransfers("xls")}><FileText /> Excel 97-2003 (.xls)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportTransfers("xlsx")}><FileText /> Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportTransfers("pdf")}><FileText /> PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Transfers</h2>
        <Button size="sm" onClick={() => { setEditingTransfer(null); setSheetOpen(true); }}>
          <Plus className="h-4 w-4" />
          Add Transfer
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-md border p-4">
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          className="flex items-center justify-between gap-2"
          aria-expanded={filtersOpen}
          aria-controls="transfer-filters-panel"
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
          <div id="transfer-filters-panel" className="flex flex-col gap-3">
            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters} className="self-end">
                <X className="h-4 w-4" />
                Clear all filters
              </Button>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="relative col-span-2 sm:col-span-4">
                <label htmlFor="transfer-search-input" className="mb-1.5 block text-sm font-medium">Search</label>
                <Search className="absolute left-2.5 top-8.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="transfer-search-input"
                  placeholder="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 text-xs sm:text-base"
                />
              </div>

              <div className="col-span-2">
                <label htmlFor="transfer-filter-start-date" className="mb-1.5 block text-sm font-medium">Start date</label>
                <Input id="transfer-filter-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="w-full min-w-0 max-w-full" />
              </div>
              <div className="col-span-2">
                <label htmlFor="transfer-filter-end-date" className="mb-1.5 block text-sm font-medium">End date</label>
                <Input id="transfer-filter-end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="w-full min-w-0 max-w-full" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FilterSelect id="transfer-filter-from-account" label="From Account" value={filterFromAccount} onValueChange={(value) => { setFilterFromAccount(value); setFilterFromSubAccount("all"); }}>
                <SelectItem value="all">All</SelectItem>
                {settings.accounts?.slice().sort((a, b) => a.label.localeCompare(b.label)).map((account) => (
                  <SelectItem key={account._key} value={account.label}><NameColor name={account.label} />{account.label}</SelectItem>
                ))}
              </FilterSelect>

              <FilterSelect id="transfer-filter-from-subaccount" label="From Sub-Account" value={filterFromSubAccount} onValueChange={setFilterFromSubAccount} disabled={filterFromAccount === "all"}>
                <SelectItem value="all">All</SelectItem>
                {fromSubAccounts.map((subAccount) => <SelectItem key={subAccount.label} value={subAccount.label}>{subAccount.label}</SelectItem>)}
              </FilterSelect>

              <FilterSelect id="transfer-filter-to-account" label="To Account" value={filterToAccount} onValueChange={(value) => { setFilterToAccount(value); setFilterToSubAccount("all"); }}>
                <SelectItem value="all">All</SelectItem>
                {settings.accounts?.slice().sort((a, b) => a.label.localeCompare(b.label)).map((account) => (
                  <SelectItem key={account._key} value={account.label}><NameColor name={account.label} />{account.label}</SelectItem>
                ))}
              </FilterSelect>

              <FilterSelect id="transfer-filter-to-subaccount" label="To Sub-Account" value={filterToSubAccount} onValueChange={setFilterToSubAccount} disabled={filterToAccount === "all"}>
                <SelectItem value="all">All</SelectItem>
                {toSubAccounts.map((subAccount) => <SelectItem key={subAccount.label} value={subAccount.label}>{subAccount.label}</SelectItem>)}
              </FilterSelect>
            </div>
          </div>
        )}
      </div>

      {/* Mobile & Tablet: sort control + refresh + export */}
      <div className="flex flex-row flex-wrap items-center justify-between gap-2 lg:hidden">
        <div className="flex items-center gap-2">
          <Select value={sortKey} onValueChange={(value) => value && handleSortChange(value as TransferSortKey)}>
            <SelectTrigger className="w-32 sm:w-40" aria-label="Sort transfers by">
              <SelectValue>
                {(selectedValue: TransferSortKey) => transferSortKeyLabels[selectedValue] ?? selectedValue}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false} className="p-1 lg:p-2">
              <SelectItem value="_updatedAt">Last modified</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="heading">Heading</SelectItem>
              <SelectItem value="fromAccount">From</SelectItem>
              <SelectItem value="toAccount">To</SelectItem>
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

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading Transfers…</p>
        </div>
      ) : (
        <TransferTable
          transfers={filteredTransfers}
          onEdit={(transfer) => { setEditingTransfer(transfer); setSheetOpen(true); }}
          onDelete={handleDelete}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
        />
      )}

      <TransferSheet open={sheetOpen} onOpenChange={setSheetOpen} transfer={editingTransfer} settings={settings} onSuccess={load} />
    </section>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onValueChange,
  children,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      <Select value={value} onValueChange={(nextValue) => nextValue && onValueChange(nextValue)}>
        <SelectTrigger id={id} disabled={disabled} className="w-full">
          <SelectValue>
            {(selectedValue: string) => (selectedValue === "all" ? "All" : selectedValue)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false} className="p-1 lg:p-2">{children}</SelectContent>
      </Select>
    </div>
  );
}
