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
import { NameColor } from "@/components/ui/name-color";

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => Promise<void>;
}

const sortKeyLabels: Record<
  "date" | "heading" | "type" | "category" | "account" | "amount",
  string
> = {
  date: "Date",
  heading: "Heading",
  type: "Type",
  category: "Category",
  account: "Account",
  amount: "Amount",
};

export function TransactionTable({ transactions, onEdit, onDelete }: TransactionTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortKey, setSortKey] = useState<"date" | "heading" | "type" | "category" | "account" | "amount">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");

  const sortedTransactions = useMemo(() => [...transactions].sort((a, b) => {
    const aValue = sortKey === "date" ? new Date(a.date).getTime() : sortKey === "amount" ? a.amount : String(a[sortKey] || "").toLowerCase();
    const bValue = sortKey === "date" ? new Date(b.date).getTime() : sortKey === "amount" ? b.amount : String(b[sortKey] || "").toLowerCase();
    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    return sortDirection === "asc" ? comparison : -comparison;
  }), [sortKey, sortDirection, transactions]);
  const totalPages = Math.max(1, Math.ceil(sortedTransactions.length / Number(pageSize)));
  const pageTransactions = sortedTransactions.slice((page - 1) * Number(pageSize), page * Number(pageSize));

  useEffect(() => setPage(1), [transactions, pageSize, sortKey, sortDirection]);

  function changeSort(nextKey: typeof sortKey) {
    if (sortKey === nextKey) setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
    else {
      setSortKey(nextKey);
      setSortDirection(nextKey === "date" || nextKey === "amount" ? "desc" : "asc");
    }
  }

  function SortButton({ label, column }: { label: string; column: typeof sortKey }) {
    const active = sortKey === column;
    return (
      <Button variant="ghost" size="sm" className="-ml-2 h-7 px-2" onClick={() => changeSort(column)}>
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
      <div className="flex flex-col items-end gap-2 lg:hidden">
        <span className="text-right text-sm text-muted-foreground">Sort by</span>
        <div className="flex items-center gap-2">
          <Select value={sortKey} onValueChange={(value) => value && changeSort(value as typeof sortKey)}>
            <SelectTrigger className="w-32" aria-label="Sort transactions by">
              <SelectValue>
                {(selectedValue: typeof sortKey) => sortKeyLabels[selectedValue] ?? selectedValue}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="end" alignItemWithTrigger={false}>
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
            onClick={() => setSortDirection((direction) => direction === "asc" ? "desc" : "asc")}
          >
            {sortDirection === "asc" ? <ArrowUp /> : <ArrowDown />}
          </Button>
        </div>
      </div>

      <div className="space-y-2 md:hidden">
        {pageTransactions.map((transaction) => (
          <div key={transaction._id} className="rounded-md border p-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{transaction.heading || "Untitled transaction"}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(transaction.date), "dd MMM yyyy")}</p>
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
                      onClick={() => setDeletingId(transaction._id)}
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
              <p className="mt-2 whitespace-pre-wrap wrap-break-word text-xs text-muted-foreground">
                {transaction.description}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="hidden space-y-1.5 md:block lg:hidden">
        {pageTransactions.map((transaction) => (
          <div key={transaction._id} className="grid grid-cols-[5.5rem_minmax(0,1.5fr)_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-md border p-2">
            <div className="text-xs text-muted-foreground">
              {format(new Date(transaction.date), "dd MMM yyyy")}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{transaction.heading || "Untitled transaction"}</p>
              {transaction.description && (
                <p className="truncate text-xs text-muted-foreground">{transaction.description}</p>
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
                  onClick={() => setDeletingId(transaction._id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

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
            {pageTransactions.map((transaction) => (
              <TableRow key={transaction._id}>
                <TableCell className="whitespace-nowrap text-sm">
                  {format(new Date(transaction.date), "dd MMM yyyy")}
                </TableCell>
                <TableCell className="max-w-40 whitespace-normal wrap-break-word">
                  <div className="whitespace-normal wrap-break-word font-medium">{transaction.heading || "—"}</div>
                  {transaction.description && (
                    <div className="whitespace-normal wrap-break-word text-xs text-muted-foreground">
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
                        onClick={() => setDeletingId(transaction._id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>{sortedTransactions.length === 0 ? "0" : `${(page - 1) * Number(pageSize) + 1}-${Math.min(page * Number(pageSize), sortedTransactions.length)}`} of {sortedTransactions.length} transactions</p>
        <div className="ml-auto flex items-center gap-2">
          <Select value={pageSize} onValueChange={(value) => value && setPageSize(value)}>
            <SelectTrigger className="w-28" aria-label="Rows per page"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="25">25 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
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
