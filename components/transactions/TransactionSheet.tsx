"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

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

import {
  type Transaction,
  type TransactionFormValues,
  type Settings,
  transactionFormSchema,
} from "@/lib/types";

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

  const form = useForm<TransactionFormValues>({
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

  const watchedCategory = form.watch("category");
  const watchedAccount = form.watch("account");

  const selectedCategory = settings.categories?.find(
    (c) => c.label === watchedCategory
  );
  const selectedAccount = settings.accounts?.find(
    (a) => a.label === watchedAccount
  );

  // Reset sub-fields when parent changes
  useEffect(() => {
    form.setValue("subCategory", "");
  }, [watchedCategory, form]);

  useEffect(() => {
    form.setValue("subAccount", "");
  }, [watchedAccount, form]);

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
    }
  }, [transaction, form, open]);

  async function onSubmit(values: TransactionFormValues) {
    setIsSubmitting(true);
    try {
      const url = isEditing
        ? `/api/transactions/${transaction!._id}`
        : "/api/transactions";
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
      console.error("TransactionSheet submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  const watchedType = form.watch("type");
  const isIncome = watchedType === "income";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col sm:w-full">
        <DialogHeader className="px-4 sm:px-6 pt-2 pb-2 shrink-0">
          <DialogTitle>
            {isEditing ? "Edit Transaction" : "Add Transaction"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-4 flex flex-col gap-2 px-4 sm:px-6 pb-6 overflow-y-auto flex-1"
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
                          ? format(new Date(field.value), "PPP")
                          : "Pick a date"}
                      </PopoverTrigger>
                    </FormControl>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(d) =>
                          field.onChange(d ? d.toISOString() : "")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {settings.categories?.filter(c => !c.deleted || c.label === field.value).map((c) => (
                        <SelectItem key={c._key} value={c.label}>
                          {c.label} {c.deleted ? "(Deleted)" : ""}
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
                        <SelectValue placeholder="Select sub-category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {selectedCategory?.subCategories?.filter(s => !s.deleted || s.label === field.value).map((s) => (
                        <SelectItem key={s.label} value={s.label}>
                          {s.label} {s.deleted ? "(Deleted)" : ""}
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {settings.accounts?.filter(a => !a.deleted || a.label === field.value).map((a) => (
                        <SelectItem key={a._key} value={a.label}>
                          {a.label} {a.deleted ? "(Deleted)" : ""}
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
                        <SelectValue placeholder="Select sub-account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {selectedAccount?.subAccounts?.filter(s => !s.deleted || s.label === field.value).map((s) => (
                        <SelectItem key={s.label} value={s.label}>
                          {s.label} {s.deleted ? "(Deleted)" : ""}
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
                    <Input placeholder="Short title (optional)" {...field} />
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
                      placeholder="Additional notes (optional)"
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
              <Button type="submit" disabled={isSubmitting}>
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
