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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { type Transfer, formatINR } from "@/lib/types";
import { NameColor } from "@/components/ui/name-color";

interface TransferTableProps {
  transfers: Transfer[];
  onEdit: (transfer: Transfer) => void;
  onDelete: (id: string) => Promise<void>;
  sortKey: TransferSortKey;
  sortDirection: "asc" | "desc";
  onSortChange: (key: TransferSortKey) => void;
}

export type TransferSortKey = "_updatedAt" | "date" | "heading" | "fromAccount" | "toAccount" | "amount";

export const transferSortKeyLabels: Record<TransferSortKey, string> = {
  _updatedAt: "Last modified",
  date: "Date",
  heading: "Heading",
  fromAccount: "From",
  toAccount: "To",
  amount: "Amount",
};

export function nextTransferSort(
  currentKey: TransferSortKey,
  currentDirection: "asc" | "desc",
  nextKey: TransferSortKey,
): { key: TransferSortKey; direction: "asc" | "desc" } {
  if (currentKey === nextKey) {
    return { key: currentKey, direction: currentDirection === "asc" ? "desc" : "asc" };
  }
  return { key: nextKey, direction: nextKey === "_updatedAt" || nextKey === "date" || nextKey === "amount" ? "desc" : "asc" };
}

interface DateGroup {
  dateKey: string;
  label: string;
  total: number;
  transfers: Transfer[];
}

function transferDateKey(date: string): string {
  return format(new Date(date), "yyyy-MM-dd");
}

function transferDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return format(new Date(year, month - 1, day), "EEEE, d MMM yyyy");
}

function transferDateDisplay(date: string): string {
  return format(new Date(date), "dd MMM yyyy");
}

function groupTransfersByDate(transfers: Transfer[]): DateGroup[] {
  const byKey = new Map<string, DateGroup>();

  for (const transfer of transfers) {
    const dateKey = transferDateKey(transfer.date);
    let group = byKey.get(dateKey);

    if (!group) {
      group = { dateKey, label: transferDateLabel(dateKey), total: 0, transfers: [] };
      byKey.set(dateKey, group);
    }

    group.transfers.push(transfer);
    group.total += transfer.amount;
  }

  return Array.from(byKey.values());
}

function DateGroupHeading({ group }: { group: DateGroup }) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <p className="text-xs font-semibold text-muted-foreground">{group.label}</p>
      <p className="font-mono text-xs font-medium text-muted-foreground">{formatINR(group.total)}</p>
    </div>
  );
}

function AccountBadge({ label, subLabel }: { label: string; subLabel?: string }) {
  return (
    <span className="inline-flex min-w-0 flex-col">
        <span className="inline-flex min-w-0 items-center gap-1.5">
            <NameColor name={label} />
            <span className="truncate font-medium">{label}</span>
        </span>
        {subLabel && <span className="truncate pl-4 text-xs text-muted-foreground">{subLabel}</span>}
    </span>
  );
}

function TransferMobileCard({
  transfer,
  onEdit,
  onDeleteRequest,
}: {
  transfer: Transfer;
  onEdit: (transfer: Transfer) => void;
  onDeleteRequest: (id: string) => void;
}) {
  return (
    <div className="rounded-md border p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-wrap">{transfer.heading || "—"}</p>
          <p className="text-xs text-muted-foreground">{transferDateDisplay(transfer.date)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-sm font-medium">{formatINR(transfer.amount)}</span>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open Menu</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(transfer)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDeleteRequest(transfer._id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1.5 rounded-md bg-muted/30 p-2 text-sm">
        <AccountBadge label={transfer.fromAccount} subLabel={transfer.fromSubAccount} />
        <AccountBadge label={transfer.toAccount} subLabel={transfer.toSubAccount} />
      </div>
      {transfer.description && (
        <p className="mt-2 whitespace-pre-wrap wrap-break-word text-xs text-muted-foreground text-wrap">
          {transfer.description}
        </p>
      )}
    </div>
  );
}

function TransferTabletRow({
  transfer,
  onEdit,
  onDeleteRequest,
}: {
  transfer: Transfer;
  onEdit: (transfer: Transfer) => void;
  onDeleteRequest: (id: string) => void;
}) {
  return (
    <div className="rounded-md border p-2">
      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto_auto] items-center gap-2">
        <div className="text-xs text-muted-foreground">
          {transferDateDisplay(transfer.date)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-wrap">{transfer.heading || "—"}</p>
          {transfer.description && (
            <p className="truncate text-xs text-muted-foreground text-wrap">{transfer.description}</p>
          )}
        </div>
        <div className="whitespace-nowrap text-right font-mono text-sm font-medium">
          {formatINR(transfer.amount)}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open Menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(transfer)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDeleteRequest(transfer._id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 border-t pt-2 pl-0 sm:pl-[6.5rem]">
        <AccountBadge label={transfer.fromAccount} subLabel={transfer.fromSubAccount} />
        <AccountBadge label={transfer.toAccount} subLabel={transfer.toSubAccount} />
      </div>
    </div>
  );
}

function TransferDesktopRow({
  transfer,
  onEdit,
  onDeleteRequest,
}: {
  transfer: Transfer;
  onEdit: (transfer: Transfer) => void;
  onDeleteRequest: (id: string) => void;
}) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-sm">
        {transferDateDisplay(transfer.date)}
      </TableCell>
      <TableCell className="max-w-40 whitespace-normal wrap-break-word">
        <div className="whitespace-normal wrap-break-word font-medium text-wrap">{transfer.heading || "—"}</div>
        {transfer.description && (
          <div className="whitespace-normal wrap-break-word text-xs text-muted-foreground text-wrap">
            {transfer.description}
          </div>
        )}
      </TableCell>
      <TableCell>
        <AccountBadge label={transfer.fromAccount} subLabel={transfer.fromSubAccount} />
      </TableCell>
      <TableCell>
        <AccountBadge label={transfer.toAccount} subLabel={transfer.toSubAccount} />
      </TableCell>
      <TableCell className="text-right font-mono font-medium">
        {formatINR(transfer.amount)}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open Menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(transfer)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDeleteRequest(transfer._id)}
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

export function TransferTable({
  transfers,
  onEdit,
  onDelete,
  sortKey,
  sortDirection,
  onSortChange,
}: TransferTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");

  const sortedTransfers = useMemo(() => [...transfers].sort((a, b) => {
    const aValue = sortKey === "date" || sortKey === "_updatedAt" ? new Date(a[sortKey]).getTime() : sortKey === "amount" ? a.amount : String(a[sortKey] || "").toLowerCase();
    const bValue = sortKey === "date" || sortKey === "_updatedAt" ? new Date(b[sortKey]).getTime() : sortKey === "amount" ? b.amount : String(b[sortKey] || "").toLowerCase();
    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    return sortDirection === "asc" ? comparison : -comparison;
  }), [sortKey, sortDirection, transfers]);
  const isGroupedByDate = sortKey === "date";
  const dateGroups = useMemo(
    () => (isGroupedByDate ? groupTransfersByDate(sortedTransfers) : []),
    [isGroupedByDate, sortedTransfers],
  );

  const groupedPages = useMemo(() => {
    if (!isGroupedByDate) return [];

    const pages: DateGroup[][] = [];
    let currentPage: DateGroup[] = [];
    let currentTransferCount = 0;
    const requestedPageSize = Number(pageSize);

    for (const group of dateGroups) {
      const groupSize = group.transfers.length;

      if (
        currentPage.length > 0 &&
        currentTransferCount + groupSize > requestedPageSize
      ) {
        pages.push(currentPage);
        currentPage = [];
        currentTransferCount = 0;
      }

      currentPage.push(group);
      currentTransferCount += groupSize;
    }

    if (currentPage.length > 0) pages.push(currentPage);

    return pages;
  }, [dateGroups, isGroupedByDate, pageSize]);

  const totalPages = isGroupedByDate
    ? Math.max(1, groupedPages.length)
    : Math.max(1, Math.ceil(sortedTransfers.length / Number(pageSize)));

  const pageTransfers = isGroupedByDate
    ? []
    : sortedTransfers.slice((page - 1) * Number(pageSize), page * Number(pageSize));

  const pageGroups = isGroupedByDate ? groupedPages[page - 1] ?? [] : [];

  const pageTransferCount = isGroupedByDate
    ? pageGroups.reduce((count, group) => count + group.transfers.length, 0)
    : pageTransfers.length;

  const pageStartIndex = isGroupedByDate
    ? sortedTransfers.findIndex(
        (transfer) => transfer._id === pageGroups[0]?.transfers[0]?._id,
      )
    : (page - 1) * Number(pageSize);

  const pageEndIndex = isGroupedByDate
    ? sortedTransfers.findIndex(
        (transfer) =>
          transfer._id ===
          pageGroups[pageGroups.length - 1]?.transfers[
            pageGroups[pageGroups.length - 1].transfers.length - 1
          ]?._id,
      )
    : Math.min(page * Number(pageSize), sortedTransfers.length) - 1;

  useEffect(() => setPage(1), [transfers, pageSize, sortKey, sortDirection]);

  function SortButton({ label, column }: { label: string; column: TransferSortKey }) {
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

  if (transfers.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border border-dashed">
        <p className="text-sm text-muted-foreground">No Transfers Found.</p>
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
                {group.transfers.map((transfer) => (
                  <TransferMobileCard
                    key={transfer._id}
                    transfer={transfer}
                    onEdit={onEdit}
                    onDeleteRequest={setDeletingId}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-2">
            {pageTransfers.map((transfer) => (
              <TransferMobileCard
                key={transfer._id}
                transfer={transfer}
                onEdit={onEdit}
                onDeleteRequest={setDeletingId}
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
                {group.transfers.map((transfer) => (
                  <TransferTabletRow
                    key={transfer._id}
                    transfer={transfer}
                    onEdit={onEdit}
                    onDeleteRequest={setDeletingId}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-1.5">
            {pageTransfers.map((transfer) => (
              <TransferTabletRow
                key={transfer._id}
                transfer={transfer}
                onEdit={onEdit}
                onDeleteRequest={setDeletingId}
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
              <TableHead><SortButton label="From" column="fromAccount" /></TableHead>
              <TableHead><SortButton label="To" column="toAccount" /></TableHead>
              <TableHead className="text-right"><SortButton label="Amount" column="amount" /></TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isGroupedByDate
              ? pageGroups.map((group) => (
                  <FragmentGroup key={group.dateKey} group={group} onEdit={onEdit} onDeleteRequest={setDeletingId} />
                ))
              : pageTransfers.map((transfer) => (
                  <TransferDesktopRow
                    key={transfer._id}
                    transfer={transfer}
                    onEdit={onEdit}
                    onDeleteRequest={setDeletingId}
                  />
                ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-end md:flex-row md:flex-wrap md:items-center md:justify-between gap-2 text-sm text-muted-foreground">
        <p>
          {pageTransferCount === 0
            ? "0"
            : `${pageStartIndex + 1} - ${pageEndIndex + 1} of ${sortedTransfers.length} transfers`}
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
            <AlertDialogTitle>Delete transfer?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The transfer record will be permanently removed.
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
}: {
  group: DateGroup;
  onEdit: (transfer: Transfer) => void;
  onDeleteRequest: (id: string) => void;
}) {
  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40">
        <TableCell colSpan={4} className="py-1.5 text-xs font-semibold text-muted-foreground">
          {group.label}
        </TableCell>
        <TableCell colSpan={1} className="py-1.5 text-right font-mono text-xs font-medium text-muted-foreground">
          {formatINR(group.total)}
        </TableCell>
        <TableCell colSpan={1} className="py-1.5" />
      </TableRow>
      {group.transfers.map((transfer) => (
        <TransferDesktopRow
          key={transfer._id}
          transfer={transfer}
          onEdit={onEdit}
          onDeleteRequest={onDeleteRequest}
        />
      ))}
    </>
  );
}