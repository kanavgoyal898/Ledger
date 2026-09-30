"use client";

import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NameColor } from "@/components/ui/name-color";
import { formatRecurrenceFrequency } from "@/lib/recurrence";
import { RECURRENCE_FREQUENCIES, recurringTransactionFormSchema, type RecurrenceFrequency, type RecurringTransaction, type RecurringTransactionFormValues, type Settings } from "@/lib/types";

interface Props { open: boolean; onOpenChange: (open: boolean) => void; rule: RecurringTransaction; settings: Settings; onSuccess: () => void }

function initialValues(rule: RecurringTransaction): RecurringTransactionFormValues {
  return { type: rule.type, amount: rule.amount, category: rule.category, subCategory: rule.subCategory ?? "", account: rule.account, subAccount: rule.subAccount ?? "", heading: rule.heading ?? "", description: rule.description ?? "", frequency: rule.frequency, startDate: rule.startDate.slice(0, 10), endDate: rule.endDate?.slice(0, 10) ?? "" };
}

export function RecurringTransactionSheet({ open, onOpenChange, rule, settings, onSuccess }: Props) {
  const [values, setValues] = useState(() => initialValues(rule));
  const [confirmPast, setConfirmPast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedCategory = settings.categories?.find((item) => item.label === values.category);
  const selectedAccount = settings.accounts?.find((item) => item.label === values.account);
  function setField<K extends keyof RecurringTransactionFormValues>(field: K, value: RecurringTransactionFormValues[K]) { setValues((current) => ({ ...current, [field]: value })); }

  function requestSave() {
    const parsed = recurringTransactionFormSchema.safeParse(values);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the form fields and try again."); return; }
    setValues(parsed.data); setError(""); setConfirmPast(true);
  }

  async function save(updatePastTransactions: boolean) {
    setConfirmPast(false); setIsSubmitting(true); setError("");
    try {
      const parsed = recurringTransactionFormSchema.safeParse(values);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the form fields and try again.");
      const response = await fetch(`/api/recurring/${rule._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...parsed.data, updatePastTransactions }) });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.details?.formErrors?.[0] ?? result.error ?? "Could not update recurring transaction");
      }
      onSuccess(); onOpenChange(false);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update recurring transaction"); }
    finally { setIsSubmitting(false); }
  }

  return <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-lg flex-col overflow-hidden p-0 sm:w-full" showCloseButton={false}>
        <DialogHeader className="shrink-0 px-4 pt-6 pb-2 sm:px-6"><DialogTitle>Edit Recurring Transaction</DialogTitle></DialogHeader>
        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto px-4 pb-6 sm:px-6">
          <div><Label className="mb-2">Type</Label><Tabs value={values.type} onValueChange={(value) => setField("type", value as "income" | "expense" | "investment")}><TabsList className="grid w-full grid-cols-3"><TabsTrigger value="expense">Expense</TabsTrigger><TabsTrigger value="income">Income</TabsTrigger><TabsTrigger value="investment">Investment</TabsTrigger></TabsList></Tabs></div>
          <Field label="Amount (INR)"><Input type="number" inputMode="decimal" value={values.amount} onChange={(event) => setField("amount", event.target.value as never)} /></Field>
          <Field label="Frequency"><Select value={values.frequency} onValueChange={(value) => setField("frequency", value as RecurrenceFrequency)}><SelectTrigger className="w-full"><SelectValue>{formatRecurrenceFrequency(values.frequency)}</SelectValue></SelectTrigger><SelectContent>{RECURRENCE_FREQUENCIES.map((frequency) => <SelectItem key={frequency} value={frequency}>{formatRecurrenceFrequency(frequency)}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Start Date"><Input type="date" value={values.startDate} onChange={(event) => setField("startDate", event.target.value)} /></Field>
          <Field label="End Date"><Input type="date" value={values.endDate ?? ""} onChange={(event) => setField("endDate", event.target.value)} /></Field>
          <Field label="Category"><Select value={values.category} onValueChange={(value) => setValues((current) => ({ ...current, category: value ?? "", subCategory: "" }))}><SelectTrigger className="w-full"><SelectValue>{values.category && <span className="flex items-center gap-2"><NameColor name={values.category} />{values.category}</span>}</SelectValue></SelectTrigger><SelectContent>{settings.categories?.slice().sort((a, b) => a.label.localeCompare(b.label)).map((item) => <SelectItem key={item._key} value={item.label}><NameColor name={item.label} />{item.label}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Sub-Category"><Select value={values.subCategory || "__none__"} onValueChange={(value) => setField("subCategory", value === "__none__" ? "" : value ?? "")} disabled={!selectedCategory?.subCategories?.length}><SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="__none__">None</SelectItem>{selectedCategory?.subCategories?.slice().sort((a, b) => a.label.localeCompare(b.label)).map((item) => <SelectItem key={item.label} value={item.label}><NameColor name={item.label} />{item.label}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Account"><Select value={values.account} onValueChange={(value) => setValues((current) => ({ ...current, account: value ?? "", subAccount: "" }))}><SelectTrigger className="w-full"><SelectValue>{values.account && <span className="flex items-center gap-2"><NameColor name={values.account} />{values.account}</span>}</SelectValue></SelectTrigger><SelectContent>{settings.accounts?.slice().sort((a, b) => a.label.localeCompare(b.label)).map((item) => <SelectItem key={item._key} value={item.label}><NameColor name={item.label} />{item.label}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Sub-Account"><Select value={values.subAccount || "__none__"} onValueChange={(value) => setField("subAccount", value === "__none__" ? "" : value ?? "")} disabled={!selectedAccount?.subAccounts?.length}><SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="__none__">None</SelectItem>{selectedAccount?.subAccounts?.slice().sort((a, b) => a.label.localeCompare(b.label)).map((item) => <SelectItem key={item.label} value={item.label}><NameColor name={item.label} />{item.label}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Heading"><Input value={values.heading ?? ""} onChange={(event) => setField("heading", event.target.value)} /></Field>
          <Field label="Description"><Textarea rows={3} value={values.description ?? ""} onChange={(event) => setField("description", event.target.value)} /></Field>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button><Button type="button" onClick={requestSave} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}Save Changes</Button></DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
    <AlertDialog open={confirmPast} onOpenChange={setConfirmPast}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Update past transactions?</AlertDialogTitle><AlertDialogDescription>Choose whether transactions already created by this recurring rule should use the edited transaction values. Their dates will stay unchanged.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="sm:grid sm:grid-cols-2"><AlertDialogCancel onClick={() => save(false)}>Keep Originals</AlertDialogCancel><AlertDialogAction onClick={() => save(true)}>Update Past</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) { return <div className={className}><Label className="mb-2">{label}</Label>{children}</div>; }
