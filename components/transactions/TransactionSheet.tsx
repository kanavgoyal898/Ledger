"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { NameColor } from "@/components/ui/name-color";

import {
  type Transaction,
  type TransactionFormValues,
  type TransactionFormInput,
  type Settings,
  transactionFormSchema,
  RECURRENCE_FREQUENCIES,
  type RecurrenceFrequency,
} from "@/lib/types";
import { formatRecurrenceFrequency } from "@/lib/recurrence";
import { parseLedgerDate } from "@/lib/ledger-date";

interface TransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  settings: Settings;
  onSuccess: () => void;
}

export function TransactionSheet({
  open,
  onOpenChange,
  transaction,
  settings,
  onSuccess,
}: TransactionSheetProps) {
  const isEditing = Boolean(transaction);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [repeat, setRepeat] = useState<"none" | "recurring">("none");
  const [frequency, setFrequency] = useState<RecurrenceFrequency | "">("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");

  const form = useForm<TransactionFormInput, any, TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: "expense",
      date: new Date().toISOString(),
      amount: 0,
      category: "",
      subCategory: "",
      account: "",
      subAccount: "",
      heading: "",
      description: "",
    },
  });

  const selectedCategory = settings.categories?.find(
    (c) => c.label === form.watch("category")
  );
  const selectedAccount = settings.accounts?.find(
    (a) => a.label === form.watch("account")
  );

  // Populate form when editing
  useEffect(() => {
    if (transaction) {
      form.reset({
        type: transaction.type,
        date: transaction.date,
        amount: transaction.amount,
        category: transaction.category,
        subCategory: transaction.subCategory ?? "",
        account: transaction.account,
        subAccount: transaction.subAccount ?? "",
        heading: transaction.heading ?? "",
        description: transaction.description ?? "",
      });
    } else {
      form.reset({
        type: "expense",
        date: new Date().toISOString(),
        amount: 0,
        category: "",
        subCategory: "",
        account: "",
        subAccount: "",
        heading: "",
        description: "",
      });
      setRepeat("none");
      setFrequency("");
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate("");
    }
  }, [transaction, form, open]);

  async function onSubmit(values: TransactionFormValues) {
    setIsSubmitting(true);
    try {
      const url = repeat === "recurring" && !isEditing
        ? "/api/recurring"
        : isEditing
        ? `/api/transactions/${transaction!._id}`
        : "/api/transactions";
      const method = repeat === "recurring" && !isEditing ? "POST" : isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(repeat === "recurring" && !isEditing
          ? { ...values, frequency, startDate, ...(endDate ? { endDate } : {}) }
          : values),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Request failed");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error("TransactionSheet submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  const watchedType = form.watch("type");
  const isIncome = watchedType === "income";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col sm:w-full" showCloseButton={false}>
        <DialogHeader className="px-4 sm:px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>
            {isEditing ? "Edit Transaction" : "Add Transaction"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-2 px-4 sm:px-6 pb-6 overflow-y-auto flex-1"
          >
            {/* Type Toggle */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <Tabs
                      value={field.value}
                      onValueChange={field.onChange}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="expense">Expense</TabsTrigger>
                        <TabsTrigger value="income">Income</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
            {!isEditing && (
              <FormItem>
                <FormLabel>Repeat</FormLabel>
                <Button
                  type="button"
                  variant={repeat === "recurring" ? "secondary" : "outline"}
                  aria-pressed={repeat === "recurring"}
                  onClick={() => setRepeat(repeat === "recurring" ? "none" : "recurring")}
                  className="w-full justify-between rounded-full px-4"
                >
                  <span>Recurring</span>
                  <span>{repeat === "recurring" ? "On" : "Off (Does Not Repeat)"}</span>
                </Button>
              </FormItem>
            )}

            {repeat === "recurring" && !isEditing && (
              <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select value={frequency} onValueChange={(value) => setFrequency(value as RecurrenceFrequency)}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select Frequency">{frequency ? formatRecurrenceFrequency(frequency) : undefined}</SelectValue></SelectTrigger></FormControl>
                    <SelectContent className="w-80 max-w-[calc(100vw-2rem)] p-1 lg:p-2">
                      {RECURRENCE_FREQUENCIES.map((value) => <SelectItem key={value} value={value}>{formatRecurrenceFrequency(value)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
                <FormItem className="min-w-0">
                  <FormLabel>Start Date</FormLabel>
                  <Input className="w-full min-w-0 max-w-full" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </FormItem>
                <FormItem className="min-w-0">
                  <FormLabel>End Date</FormLabel>
                  <Input className="w-full min-w-0 max-w-full" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                </FormItem>
              </div>
            )}

            {(isEditing || repeat === "none") && (
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <FormControl>
                      <PopoverTrigger
                        render={
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          />
                        }
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value
                          ? format(parseLedgerDate(field.value), "PPP")
                          : "Pick a date"}
                      </PopoverTrigger>
                    </FormControl>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value ? parseLedgerDate(field.value) : undefined}
                        onSelect={(d) =>
                          field.onChange(d ? format(d, "yyyy-MM-dd") : "")
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            )}

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (INR)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="0.00"
                      name={field.name}
                      ref={field.ref}
                      value={(field.value ?? "") as number | string}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      onFocus={(e) => {
                        if (e.target.value === "0") {
                          e.target.select();
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue("subCategory", "");
                    }}
                    value={field.value ?? "expense"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Category">
                          {field.value && (
                            <span className="flex items-center gap-2">
                              <NameColor name={field.value} />
                              {field.value}
                            </span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent align="start" className="p-1 lg:p-2" alignItemWithTrigger={false}>
                      {settings.categories?.slice().sort((a, b) => a.label.localeCompare(b.label)).map((c) => (
                        <SelectItem key={c._key} value={c.label}>
                          <NameColor name={c.label} />
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sub-Category */}
            <FormField
              control={form.control}
              name="subCategory"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Sub-Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                    disabled={!selectedCategory?.subCategories || selectedCategory.subCategories.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Sub-Category">
                          {field.value && (
                            <span className="flex items-center gap-2">
                              <NameColor name={field.value} />
                              {field.value}
                            </span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent align="start" className="p-1 lg:p-2" alignItemWithTrigger={false}>
                      {selectedCategory?.subCategories?.slice().sort((a, b) => a.label.localeCompare(b.label)).map((s) => (
                        <SelectItem key={s.label} value={s.label}>
                          <NameColor name={s.label} />
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Account */}
            <FormField
              control={form.control}
              name="account"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Account</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue("subAccount", "");
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Account">
                          {field.value && (
                            <span className="flex items-center gap-2">
                              <NameColor name={field.value} />
                              {field.value}
                            </span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent align="start" className="p-1 lg:p-2" alignItemWithTrigger={false}>
                      {settings.accounts?.slice().sort((a, b) => a.label.localeCompare(b.label)).map((a) => (
                        <SelectItem key={a._key} value={a.label}>
                          <NameColor name={a.label} />
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sub-Account */}
            <FormField
              control={form.control}
              name="subAccount"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Sub-Account</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                    disabled={!selectedAccount?.subAccounts || selectedAccount.subAccounts.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Sub-Account">
                          {field.value && (
                            <span className="flex items-center gap-2">
                              <NameColor name={field.value} />
                              {field.value}
                            </span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent align="start" className="p-1 lg:p-2" alignItemWithTrigger={false}>
                      {selectedAccount?.subAccounts?.slice().sort((a, b) => a.label.localeCompare(b.label)).map((s) => (
                        <SelectItem key={s.label} value={s.label}>
                          <NameColor name={s.label} />
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Heading */}
            <FormField
              control={form.control}
              name="heading"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Heading</FormLabel>
                  <FormControl>
                    <Input placeholder="Short Title (Optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional Notes (Optional)"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-2 flex gap-2 p-0 sm:justify-end shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="min-w-24">
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isSubmitting
                  ? "Saving…"
                  : isEditing
                    ? "Save Changes"
                    : `Add ${isIncome ? "Income" : "Expense"}`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
