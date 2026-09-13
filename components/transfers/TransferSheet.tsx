"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ArrowRightLeft, CalendarIcon } from "lucide-react";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NameColor } from "@/components/ui/name-color";

import {
  type Transfer, type TransferFormValues, type TransferFormInput,
  type Settings, transferFormSchema,
} from "@/lib/types";

interface TransferSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfer?: Transfer | null;
  settings: Settings;
  onSuccess: () => void;
}

export function TransferSheet({ open, onOpenChange, transfer, settings, onSuccess }: TransferSheetProps) {
  const isEditing = Boolean(transfer);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TransferFormInput, any, TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      date: new Date().toISOString(),
      amount: 0,
      fromAccount: "",
      fromSubAccount: "",
      toAccount: "",
      toSubAccount: "",
      heading: "",
      description: "",
    },
  });

  const selectedFromAccount = settings.accounts?.find((a) => a.label === form.watch("fromAccount"));
  const selectedToAccount = settings.accounts?.find((a) => a.label === form.watch("toAccount"));

  useEffect(() => {
    if (transfer) {
      form.reset({
        date: transfer.date,
        amount: transfer.amount,
        fromAccount: transfer.fromAccount,
        fromSubAccount: transfer.fromSubAccount ?? "",
        toAccount: transfer.toAccount,
        toSubAccount: transfer.toSubAccount ?? "",
        heading: transfer.heading ?? "",
        description: transfer.description ?? "",
      });
    } else {
      form.reset({
        date: new Date().toISOString(), amount: 0,
        fromAccount: "", fromSubAccount: "", toAccount: "", toSubAccount: "",
        heading: "", description: "",
      });
    }
  }, [transfer, form, open]);

  async function onSubmit(values: TransferFormValues) {
    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/transfers/${transfer!._id}` : "/api/transfers";
      const method = isEditing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Request failed");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error("TransferSheet submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  function AccountFields({ prefix, selected }: { prefix: "from" | "to"; selected?: typeof selectedFromAccount }) {
    const accountName = `${prefix}Account` as const;
    const subAccountName = `${prefix}SubAccount` as const;
    return (
      <div className="grid gap-2 rounded-md border p-3">
        <p className="text-xs font-medium text-muted-foreground">{prefix === "from" ? "From" : "To"}</p>
        <FormField
          control={form.control}
          name={accountName}
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Account</FormLabel>
              <Select
                onValueChange={(value) => { field.onChange(value); form.setValue(subAccountName, ""); }}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Account">
                      {field.value && <span className="flex items-center gap-2"><NameColor name={field.value} />{field.value}</span>}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent align="start" className="p-1 lg:p-2" alignItemWithTrigger={false}>
                  {settings.accounts?.filter(a => !a.deleted || a.label === field.value).sort((a, b) => a.label.localeCompare(b.label)).map((a) => (
                    <SelectItem key={a._key} value={a.label}>
                      <NameColor name={a.label} />
                      {a.label} {a.deleted ? "(Deleted)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={subAccountName}
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Sub-Account</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? ""}
                disabled={!selected?.subAccounts || selected.subAccounts.length === 0}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Sub-Account">
                      {field.value && <span className="flex items-center gap-2"><NameColor name={field.value} />{field.value}</span>}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent align="start" className="p-1 lg:p-2" alignItemWithTrigger={false}>
                  {selected?.subAccounts?.filter(s => !s.deleted || s.label === field.value).sort((a, b) => a.label.localeCompare(b.label)).map((s) => (
                    <SelectItem key={s.label} value={s.label}>
                      <NameColor name={s.label} />
                      {s.label} {s.deleted ? "(Deleted)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col sm:w-full" showCloseButton={false}>
        <DialogHeader className="px-4 sm:px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            {isEditing ? "Edit Transfer" : "Add Transfer"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-2 px-4 sm:px-6 pb-6 overflow-y-auto flex-1">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <FormControl>
                      <PopoverTrigger render={<Button variant="outline" className="w-full justify-start text-left font-normal" />}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(new Date(field.value), "PPP") : "Pick a date"}
                      </PopoverTrigger>
                    </FormControl>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(d) => field.onChange(d ? d.toISOString() : "")} />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (INR)</FormLabel>
                  <FormControl>
                    <Input
                      type="number" inputMode="decimal" placeholder="0.00"
                      name={field.name} ref={field.ref}
                      value={(field.value ?? "") as number | string}
                      onChange={field.onChange} onBlur={field.onBlur}
                      onFocus={(e) => { if (e.target.value === "0") e.target.select(); }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <AccountFields prefix="from" selected={selectedFromAccount} />
            <AccountFields prefix="to" selected={selectedToAccount} />

            <FormField
              control={form.control}
              name="heading"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Heading</FormLabel>
                  <FormControl><Input placeholder="Short Title (Optional)" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea placeholder="Additional Notes (Optional)" rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-2 flex gap-2 p-0 sm:justify-end shrink-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : isEditing ? "Save Changes" : "Add Transfer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}