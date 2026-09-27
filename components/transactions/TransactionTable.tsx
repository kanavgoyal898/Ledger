"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { type Transaction, formatINR } from "@/lib/types";
import { compareLedgerDateThenModified, ledgerDateKey, parseLedgerDate } from "@/lib/ledger-date";
import { NameColor } from "@/components/ui/name-color";
import { Tooltip } from "../ui/tooltip";

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => Promise<void>;
  sortKey: TransactionSortKey;
  sortDirection: "asc" | "desc";
  onSortChange: (key: TransactionSortKey) => void;
}

export type TransactionSortKey =
  | "_updatedAt"
  | "date"
  | "heading"
  | "type"
  | "category"
  | "account"
  | "amount";

export const transactionSortKeyLabels: Record<TransactionSortKey, string> = {
  _updatedAt: "Last modified",
  date: "Date",
  heading: "Heading",
  type: "Type",
  category: "Category",
  account: "Account",
  amount: "Amount",
};

export function nextTransactionSort(
  currentKey: TransactionSortKey,
  currentDirection: "asc" | "desc",
  nextKey: TransactionSortKey,
): { key: TransactionSortKey; direction: "asc" | "desc" } {
  if (currentKey === nextKey) {
    return { key: currentKey, direction: currentDirection === "asc" ? "desc" : "asc" };
  }
  return { key: nextKey, direction: nextKey === "_updatedAt" || nextKey === "date" || nextKey === "amount" ? "desc" : "asc" };
}

interface DateGroup {
  dateKey: string;
  label: string;
  net: number;
  transactions: Transaction[];
}

function transactionDateKey(date: string): string {
  return ledgerDateKey(date);
}

function transactionDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return format(new Date(year, month - 1, day), "EEEE, d MMM yyyy");
}

function transactionDateDisplay(date: string): string {
  return format(parseLedgerDate(date), "dd MMM yyyy");
}

function groupTransactionsByDate(transactions: Transaction[]): DateGroup[] {
  const byKey = new Map<string, DateGroup>();

  for (const transaction of transactions) {
    const dateKey = transactionDateKey(transaction.date);
    let group = byKey.get(dateKey);

    if (!group) {
      group = {
        dateKey,
        label: transactionDateLabel(dateKey),
        net: 0,
        transactions: [],
      };
      byKey.set(dateKey, group);
    }

    group.transactions.push(transaction);
    group.net += transaction.type === "income" ? transaction.amount : -transaction.amount;
  }

  return Array.from(byKey.values());
}

function DateGroupHeading({ group }: { group: DateGroup }) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <p className="text-xs font-semibold text-muted-foreground">{group.label}</p>
      <p className={`font-mono text-xs font-medium ${group.net >= 0 ? "text-emerald-500" : "text-muted-foreground"}`}>
        {group.net >= 0 ? "+" : "-"}
        {formatINR(Math.abs(group.net))}
      </p>
    </div>
  );
}

function TransactionMobileCard({
  transaction,
  onEdit,
  onDeleteRequest,
  index = 0,
}: {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDeleteRequest: (id: string) => void;
  index?: number;
}) {
  return (
    <div className="rounded-md border p-2 animate-fade-up delay-stagger transition-colors hover:bg-accent/10" style={{ "--stagger-delay": `${index * 30}ms` } as React.CSSProperties}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-wrap">{transaction.heading || "—"}</p>
          <p className="text-xs text-muted-foreground">{transactionDateDisplay(transaction.date)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`font-mono text-sm font-medium ${transaction.type === "income" ? "text-emerald-500" : ""}`}>
            {transaction.type === "income" ? "+" : "-"}{formatINR(transaction.amount)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open Menu</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(transaction)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDeleteRequest(transaction._id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge variant={transaction.type === "income" ? "default" : "destructive"} className={transaction.type === "income" ? "bg-emerald-500 text-white hover:bg-emerald-600" : ""}>
          {transaction.type === "income" ? "Income" : "Expense"}
        </Badge>
        <Badge variant="secondary">
          <NameColor name={transaction.category} />
          {transaction.category}
        </Badge>
        {transaction.subCategory && (
          <Badge variant="outline" className="text-xs">
            <NameColor name={transaction.subCategory} />
            {transaction.subCategory}
          </Badge>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">
          <NameColor name={transaction.account} />
          {transaction.account}
        </Badge>
        {transaction.subAccount && (
          <Badge variant="secondary" className="text-xs">
            <NameColor name={transaction.subAccount} />
            {transaction.subAccount}
          </Badge>
        )}
      </div>
      {transaction.description && (
        <p className="mt-2 whitespace-pre-wrap wrap-break-word text-xs text-muted-foreground text-wrap">
          {transaction.description}
        </p>
      )}
    </div>
  );
}

function TransactionTabletRow({
  transaction,
  onEdit,
  onDeleteRequest,
  index = 0,
}: {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDeleteRequest: (id: string) => void;
  index?: number;
}) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1.5fr)_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-md border p-2 animate-fade-up delay-stagger transition-colors hover:bg-accent/10" style={{ "--stagger-delay": `${index * 30}ms` } as React.CSSProperties}>
      <div className="text-xs text-muted-foreground">
        {transactionDateDisplay(transaction.date)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-wrap">{transaction.heading || "—"}</p>
        {transaction.description && (
          <p className="truncate text-xs text-muted-foreground text-wrap">{transaction.description}</p>
        )}
      </div>
      <div className="flex min-w-0 flex-wrap gap-1">
        <Badge variant={transaction.type === "income" ? "default" : "destructive"} className={transaction.type === "income" ? "bg-emerald-500 text-white hover:bg-emerald-600" : ""}>
          {transaction.type === "income" ? "Income" : "Expense"}
        </Badge>
        <Badge variant="secondary" className="max-w-full truncate">
          <NameColor name={transaction.category} />
          {transaction.category}
        </Badge>
        {transaction.subCategory && (
          <Badge variant="outline" className="max-w-full truncate text-xs">
            <NameColor name={transaction.subCategory} />
            {transaction.subCategory}
          </Badge>
        )}
        <Badge variant="outline" className="max-w-full truncate">
          <NameColor name={transaction.account} />
          {transaction.account}
        </Badge>
        {transaction.subAccount && (
          <Badge variant="secondary" className="max-w-full truncate text-xs">
            <NameColor name={transaction.subAccount} />
            {transaction.subAccount}
          </Badge>
        )}
      </div>
      <div className={`whitespace-nowrap text-right font-mono text-sm font-medium ${transaction.type === "income" ? "text-emerald-500" : ""}`}>
        {transaction.type === "income" ? "+" : "-"}{formatINR(transaction.amount)}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open Menu</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(transaction)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDeleteRequest(transaction._id)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function TransactionDesktopRow({
  transaction,
  onEdit,
  onDeleteRequest,
  index = 0,
}: {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDeleteRequest: (id: string) => void;
  index?: number;
}) {
  return (
    <TableRow className="animate-fade-up delay-stagger transition-colors hover:bg-accent/30" style={{ "--stagger-delay": `${index * 30}ms` } as React.CSSProperties}>
      <TableCell className="whitespace-nowrap text-sm">
        {transactionDateDisplay(transaction.date)}
      </TableCell>
      <TableCell className="max-w-40 whitespace-normal wrap-break-word">
        <div className="whitespace-normal wrap-break-word font-medium text-wrap">{transaction.heading || "—"}</div>
        {transaction.description && (
          <div className="whitespace-normal wrap-break-word text-xs text-muted-foreground text-wrap">
            {transaction.description}
          </div>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={transaction.type === "income" ? "default" : "destructive"} className={transaction.type === "income" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}>
          {transaction.type === "income" ? "Income" : "Expense"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Badge variant="secondary" className="w-fit">
            <NameColor name={transaction.category} />
            {transaction.category}
          </Badge>
          {transaction.subCategory && (
            <Badge variant="outline" className="w-fit text-xs">
              <NameColor name={transaction.subCategory} />
              {transaction.subCategory}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="w-fit">
            <NameColor name={transaction.account} />
            {transaction.account}
          </Badge>
          {transaction.subAccount && (
            <Badge variant="secondary" className="w-fit text-xs">
              <NameColor name={transaction.subAccount} />
              {transaction.subAccount}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className={`text-right font-mono font-medium ${transaction.type === "income" ? "text-emerald-500" : ""}`}>
        {transaction.type === "income" ? "+" : "-"}
        {formatINR(transaction.amount)}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="h-8 w-8" />
            }
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open Menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(transaction)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDeleteRequest(transaction._id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export function TransactionTable({
  transactions,
  onEdit,
  onDelete,
  sortKey,
  sortDirection,
  onSortChange,
}: TransactionTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");

  const sortedTransactions = useMemo(() => [...transactions].sort((a, b) => {
    if (sortKey === "date") return compareLedgerDateThenModified(a, b, sortDirection);
    const aValue = sortKey === "_updatedAt" ? new Date(a[sortKey]).getTime() : sortKey === "amount" ? a.amount : String(a[sortKey] || "").toLowerCase();
    const bValue = sortKey === "_updatedAt" ? new Date(b[sortKey]).getTime() : sortKey === "amount" ? b.amount : String(b[sortKey] || "").toLowerCase();
    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    return sortDirection === "asc" ? comparison : -comparison;
  }), [sortKey, sortDirection, transactions]);
  const isGroupedByDate = sortKey === "date";
  const dateGroups = useMemo(
    () => (isGroupedByDate ? groupTransactionsByDate(sortedTransactions) : []),
    [isGroupedByDate, sortedTransactions],
  );

  const groupedPages = useMemo(() => {
    if (!isGroupedByDate) return [];

    const pages: DateGroup[][] = [];
    let currentPage: DateGroup[] = [];
    let currentTransactionCount = 0;
    const requestedPageSize = Number(pageSize);

    for (const group of dateGroups) {
      const groupSize = group.transactions.length;

      if (
        currentPage.length > 0 &&
        currentTransactionCount + groupSize > requestedPageSize
      ) {
        pages.push(currentPage);
        currentPage = [];
        currentTransactionCount = 0;
      }

      currentPage.push(group);
      currentTransactionCount += groupSize;
    }

    if (currentPage.length > 0) pages.push(currentPage);

    return pages;
  }, [dateGroups, isGroupedByDate, pageSize]);

  const totalPages = isGroupedByDate
    ? Math.max(1, groupedPages.length)
    : Math.max(1, Math.ceil(sortedTransactions.length / Number(pageSize)));

  const pageTransactions = isGroupedByDate
    ? []
    : sortedTransactions.slice((page - 1) * Number(pageSize), page * Number(pageSize));

  const pageGroups = isGroupedByDate ? groupedPages[page - 1] ?? [] : [];

  const pageTransactionCount = isGroupedByDate
    ? pageGroups.reduce((count, group) => count + group.transactions.length, 0)
    : pageTransactions.length;

  const pageStartIndex = isGroupedByDate
    ? sortedTransactions.findIndex(
        (transaction) => transaction._id === pageGroups[0]?.transactions[0]?._id,
      )
    : (page - 1) * Number(pageSize);

  const pageEndIndex = isGroupedByDate
    ? sortedTransactions.findIndex(
        (transaction) =>
          transaction._id ===
          pageGroups[pageGroups.length - 1]?.transactions[
            pageGroups[pageGroups.length - 1].transactions.length - 1
          ]?._id,
      )
    : Math.min(page * Number(pageSize), sortedTransactions.length) - 1;

  useEffect(() => setPage(1), [transactions, pageSize, sortKey, sortDirection]);

  function SortButton({ label, column }: { label: string; column: TransactionSortKey }) {
    const active = sortKey === column;
    return (
      <Button variant="ghost" size="sm" className="-ml-2 h-7 px-2" onClick={() => onSortChange(column)}>
        {label}
        {active ? (sortDirection === "asc" ? <ArrowUp /> : <ArrowDown />) : <ArrowUpDown />}
      </Button>
    );
  }

  async function confirmDelete() {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await onDelete(deletingId);
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border border-dashed">
        <p className="text-sm text-muted-foreground">No Transactions Found.</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile */}
      <div className="space-y-4 md:hidden">
        {isGroupedByDate ? (
          pageGroups.map((group) => (
            <div key={group.dateKey} className="space-y-2">
              <DateGroupHeading group={group} />
              <div className="space-y-2">
                {group.transactions.map((transaction, index) => (
                  <TransactionMobileCard
                    key={transaction._id}
                    transaction={transaction}
                    onEdit={onEdit}
                    onDeleteRequest={setDeletingId}
                    index={index}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-2">
            {pageTransactions.map((transaction, index) => (
              <TransactionMobileCard
                key={transaction._id}
                transaction={transaction}
                onEdit={onEdit}
                onDeleteRequest={setDeletingId}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {/* Tablet */}
      <div className="hidden space-y-3 md:block lg:hidden">
        {isGroupedByDate ? (
          pageGroups.map((group) => (
            <div key={group.dateKey} className="space-y-1.5">
              <DateGroupHeading group={group} />
              <div className="space-y-1.5">
                {group.transactions.map((transaction, index) => (
                  <TransactionTabletRow
                    key={transaction._id}
                    transaction={transaction}
                    onEdit={onEdit}
                    onDeleteRequest={setDeletingId}
                    index={index}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-1.5">
            {pageTransactions.map((transaction, index) => (
              <TransactionTabletRow
                key={transaction._id}
                transaction={transaction}
                onEdit={onEdit}
                onDeleteRequest={setDeletingId}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden w-full overflow-x-auto rounded-md border lg:block">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead><SortButton label="Date" column="date" /></TableHead>
              <TableHead className="max-w-40"><SortButton label="Heading" column="heading" /></TableHead>
              <TableHead><SortButton label="Type" column="type" /></TableHead>
              <TableHead><SortButton label="Category" column="category" /></TableHead>
              <TableHead><SortButton label="Account" column="account" /></TableHead>
              <TableHead className="text-right"><SortButton label="Amount" column="amount" /></TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isGroupedByDate
              ? pageGroups.map((group, groupIndex) => (
                  <FragmentGroup key={group.dateKey} group={group} onEdit={onEdit} onDeleteRequest={setDeletingId} groupIndex={groupIndex} />
                ))
              : pageTransactions.map((transaction, index) => (
                  <TransactionDesktopRow
                    key={transaction._id}
                    transaction={transaction}
                    onEdit={onEdit}
                    onDeleteRequest={setDeletingId}
                    index={index}
                  />
                ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-end md:flex-row md:flex-wrap md:items-center md:justify-between gap-2 text-sm text-muted-foreground">
        <p>
          {pageTransactionCount === 0
            ? "0"
            : `${pageStartIndex + 1} - ${pageEndIndex + 1} of ${sortedTransactions.length} transactions`}
        </p>
        <div className="ml-auto flex items-center gap-2">
          <Select value={pageSize} onValueChange={(value) => value && setPageSize(value)}>
            <SelectTrigger className="w-28" aria-label="Rows per page"><SelectValue /></SelectTrigger>
            <SelectContent className="p-1 lg:p-2">
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" aria-label="Previous page" disabled={page === 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft /></Button>
          <span className="min-w-16 text-center">Page {page} / {totalPages}</span>
          <Button variant="outline" size="icon" aria-label="Next page" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}><ChevronRight /></Button>
        </div>
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The transaction will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function FragmentGroup({
  group,
  onEdit,
  onDeleteRequest,
  groupIndex = 0,
}: {
  group: DateGroup;
  onEdit: (transaction: Transaction) => void;
  onDeleteRequest: (id: string) => void;
  groupIndex?: number;
}) {
  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40 animate-fade-up delay-stagger" style={{ "--stagger-delay": `${groupIndex * 30}ms` } as React.CSSProperties}>
        <TableCell colSpan={5} className="py-1.5 text-xs font-semibold text-muted-foreground">
          {group.label}
        </TableCell>
        <TableCell colSpan={1} className={`py-1.5 text-right font-mono text-xs font-medium ${group.net >= 0 ? "text-emerald-500" : "text-muted-foreground"}`}>
          {group.net >= 0 ? "+" : "-"}
          {formatINR(Math.abs(group.net))}
        </TableCell>
        <TableCell colSpan={1} className={`py-1.5 text-right font-mono text-xs font-medium ${group.net >= 0 ? "text-emerald-500" : "text-muted-foreground"}`}>
          
        </TableCell>
      </TableRow>
      {group.transactions.map((transaction, index) => (
        <TransactionDesktopRow
          key={transaction._id}
          transaction={transaction}
          onEdit={onEdit}
          onDeleteRequest={onDeleteRequest}
          index={index + (groupIndex * 10)}
        />
      ))}
    </>
  );
}
