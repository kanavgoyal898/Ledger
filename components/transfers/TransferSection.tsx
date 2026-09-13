"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { MoveRight, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { NameColor } from "@/components/ui/name-color";
import { TransferSheet } from "@/components/transfers/TransferSheet";
import { type Transfer, type Settings, formatINR } from "@/lib/types";

function AccountBadge({ label, subLabel }: { label: string; subLabel?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <NameColor name={label} />
      <span className="font-medium">{label}</span>
      {subLabel && <span className="text-muted-foreground">/ {subLabel}</span>}
    </span>
  );
}

export function TransferSection({ settings }: { settings: Settings }) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/transfers");
      setTransfers(await response.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function confirmDelete() {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/transfers/${deletingId}`, { method: "DELETE" });
      await load();
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          Transfers
        </h2>
        <Button size="sm" onClick={() => { setEditingTransfer(null); setSheetOpen(true); }}>
          <Plus className="h-4 w-4" />
          Add Transfer
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading Transfers…</p>
      ) : transfers.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">No Transfers Yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {transfers.map((transfer) => (
            <div key={transfer._id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-xs text-muted-foreground sm:w-24 sm:shrink-0">
                  {format(new Date(transfer.date), "dd MMM yyyy")}
                </span>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <AccountBadge label={transfer.fromAccount} subLabel={transfer.fromSubAccount} />
                  <MoveRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <AccountBadge label={transfer.toAccount} subLabel={transfer.toSubAccount} />
                </div>
                {transfer.heading && <span className="text-xs text-muted-foreground">{transfer.heading}</span>}
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span className="font-mono text-sm font-medium">{formatINR(transfer.amount)}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open Menu</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditingTransfer(transfer); setSheetOpen(true); }}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletingId(transfer._id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <TransferSheet open={sheetOpen} onOpenChange={setSheetOpen} transfer={editingTransfer} settings={settings} onSuccess={load} />

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transfer?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The transfer record will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}