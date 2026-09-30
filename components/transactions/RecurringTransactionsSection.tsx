"use client";

import { useCallback, useEffect, useState } from "react";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type RecurringTransaction, type Settings } from "@/lib/types";
import { formatINR } from "@/lib/types";
import { formatRecurrenceFrequency } from "@/lib/recurrence";
import { NameColor } from "@/components/ui/name-color";
import { Calendar } from "@/components/ui/calendar";
import { occurrenceDates } from "@/lib/recurrence";
import { RecurringTransactionSheet } from "@/components/transactions/RecurringTransactionSheet";

function displayDate(value?: string) {
  return value ? format(parseISO(value.slice(0, 10)), "d MMM yyyy") : "No End Date";
}

function transactionDatesForCalendar(rule: RecurringTransaction): Date[] {
  const throughDate = format(addMonths(new Date(), 12), "yyyy-MM-dd");
  return occurrenceDates(rule.startDate, rule.frequency, throughDate, rule.endDate).map((date) => parseISO(date));
}

function calendarTransactionsForRules(rules: RecurringTransaction[]) {
  return rules.flatMap((rule) => transactionDatesForCalendar(rule).map((date) => ({ date, rule })));
}

function RuleCard({ rule, settings, onChanged, index = 0 }: { rule: RecurringTransaction; settings: Settings; onChanged: () => void; index?: number }) {
  const [editing, setEditing] = useState(false);

  async function patch(body: Record<string, unknown>) {
    await fetch(`/api/recurring/${rule._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    onChanged();
  }

  return (
    <><Card size="sm" className="h-full justify-between animate-fade-up delay-stagger transition-colors hover:bg-accent/10" style={{ "--stagger-delay": `${index * 50}ms` } as React.CSSProperties}>
      <CardHeader className="flex flex-row items-start gap-3 pb-2">
        <div className="min-w-0">
          <CardTitle className="truncate text-sm">{rule.heading || rule.category}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{rule.type === "income" ? "Income" : rule.type === "investment" ? "Investment" : "Expense"} · {formatRecurrenceFrequency(rule.frequency)}</p>
        </div>
        <Badge variant={rule.active ? "secondary" : "outline"} className={rule.active ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}>{rule.active ? "Active" : "Inactive"}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary"><NameColor name={rule.category} />{rule.category}</Badge>
          {rule.subCategory && <Badge variant="outline" className="text-xs"><NameColor name={rule.subCategory} />{rule.subCategory}</Badge>}
          <Badge variant="outline"><NameColor name={rule.account} />{rule.account}</Badge>
          {rule.subAccount && <Badge variant="secondary" className="text-xs"><NameColor name={rule.subAccount} />{rule.subAccount}</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-y py-3">
            <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-semibold">{formatINR(rule.amount)}</p></div>
            <div><p className="text-xs text-muted-foreground">Next</p><p className="font-medium">{rule.active ? displayDate(rule.nextOccurrence) : "Paused"}</p></div>
            <div><p className="text-xs text-muted-foreground">Starts</p><p>{displayDate(rule.startDate)}</p></div>
            <div><p className="text-xs text-muted-foreground">Ends</p><p>{displayDate(rule.endDate)}</p></div>
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
          {rule.active && <Button size="sm" variant="outline" onClick={() => patch({ active: false })}>Deactivate</Button>}
          {!rule.active && <><Button size="sm" variant="outline" onClick={() => patch({ active: true, resumeMode: "backfill" })}>Reactivate & Backfill</Button><Button size="sm" variant="outline" onClick={() => patch({ active: true, resumeMode: "resume" })}>Resume Next</Button></>}
          <Button size="sm" variant="destructive" onClick={async () => { await fetch(`/api/recurring/${rule._id}`, { method: "DELETE" }); onChanged(); }}>Delete</Button>
        </div>
      </CardContent>
    </Card>{editing && <RecurringTransactionSheet open onOpenChange={setEditing} rule={rule} settings={settings} onSuccess={onChanged} />}</>
  );
}

export function RecurringTransactionsSection({ settings }: { settings: Settings }) {
  const [rules, setRules] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); const response = await fetch("/api/recurring"); setRules(await response.json()); setLoading(false); }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  const active = rules.filter((rule) => rule.active);
  const inactive = rules.filter((rule) => !rule.active);
  const calendarTransactions = calendarTransactionsForRules(rules);
  const activeDates = calendarTransactions.filter(({ rule }) => rule.active).map(({ date }) => date);
  const inactiveDates = calendarTransactions.filter(({ rule }) => !rule.active).map(({ date }) => date);
  const dayTooltipContent = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const transactions = calendarTransactions.filter(({ date: occurrenceDate }) => format(occurrenceDate, "yyyy-MM-dd") === dateKey);
    const total = transactions.reduce((sum, { rule }) => sum + rule.amount, 0);

    return (
      <div className="space-y-1">
        <p className="font-medium">{format(date, "d MMM yyyy")}</p>
        {transactions.length === 0 ? (
          <p>No recurring transactions</p>
        ) : (
          <>
            {transactions.map(({ rule }, index) => (
              <p key={`${rule._id}-${index}`}>
                {rule.heading || rule.category}: {formatINR(rule.amount)} ({rule.active ? "Active" : "Inactive"})
              </p>
            ))}
            <p className="border-t pt-1 font-medium">Total: {formatINR(total)}</p>
          </>
        )}
      </div>
    );
  };
  const dayTooltipLabel = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const transactions = calendarTransactions.filter(({ date: occurrenceDate }) => format(occurrenceDate, "yyyy-MM-dd") === dateKey);
    const total = transactions.reduce((sum, { rule }) => sum + rule.amount, 0);
    return [
      format(date, "d MMM yyyy"),
      ...(transactions.length === 0
        ? ["No recurring transactions"]
        : transactions.map(({ rule }) => `${rule.heading || rule.category}: ${formatINR(rule.amount)} (${rule.active ? "Active" : "Inactive"})`).concat(`Total: ${formatINR(total)}`)),
    ].join("\n");
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Recurring Transactions</h2>
      {loading ? <p className="text-sm text-muted-foreground">Loading Recurring Transactions…</p> : <>
        <div className="p-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-3 pr-20 text-xs text-muted-foreground">
              <span><i className="mr-1 inline-block size-2 rounded-sm bg-emerald-100 dark:bg-emerald-900/50" />Active</span>
              <span><i className="mr-1 inline-block size-2 rounded-sm bg-slate-200 dark:bg-slate-700" />Inactive</span>
            </div>
          </div>
                <Calendar
                  defaultMonth={startOfMonth(new Date())}
                  numberOfMonths={1}
                  showOutsideDays={false}
                  showDayTooltip
                  dayTooltipContent={dayTooltipContent}
                  dayTooltipLabel={dayTooltipLabel}
                  formatters={{
                    formatWeekdayName: (date) => date.toLocaleDateString(undefined, { weekday: "narrow" }),
                  }}
                  modifiers={{ active: activeDates, inactive: inactiveDates }}
                  modifiersClassNames={{
                    active: "bg-emerald-100 text-emerald-900 font-semibold dark:bg-emerald-900/50 dark:text-emerald-100",
                    inactive: "bg-slate-200 text-slate-700 font-semibold dark:bg-slate-700 dark:text-slate-100",
                  }}
                  classNames={{
                    nav: "absolute -top-8 right-0 flex w-auto items-center justify-end gap-1",
                  }}
                  className="relative w-full max-w-none p-3 [--cell-size:--spacing(7)] md:hidden"
                />
                <Calendar
                  defaultMonth={startOfMonth(addMonths(new Date(), -1))}
                  numberOfMonths={3}
                  showOutsideDays={false}
                  showDayTooltip
                  dayTooltipContent={dayTooltipContent}
                  dayTooltipLabel={dayTooltipLabel}
                  formatters={{
                    formatWeekdayName: (date) => date.toLocaleDateString(undefined, { weekday: "narrow" }),
                  }}
                  modifiers={{ active: activeDates, inactive: inactiveDates }}
                  modifiersClassNames={{
                    active: "bg-emerald-100 text-emerald-900 font-semibold dark:bg-emerald-900/50 dark:text-emerald-100",
                    inactive: "bg-slate-200 text-slate-700 font-semibold dark:bg-slate-700 dark:text-slate-100",
                  }}
                  classNames={{
                    nav: "absolute -top-8 right-0 flex w-auto items-center justify-end gap-1",
                  }}
                  className="relative hidden w-full! max-w-none p-4 [--cell-size:--spacing(7)] md:block"
                />
        </div>
        {["Active Recurring Transactions", "Inactive Recurring Transactions"].map((heading, sectionIndex) => { const items = sectionIndex === 0 ? active : inactive; return <section key={heading} className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-semibold">{heading}</h3><span className="text-xs text-muted-foreground">{items.length}</span></div>{items.length === 0 ? <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">No {sectionIndex === 0 ? "Active" : "Inactive"} Recurring Transactions.</p> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{items.map((rule, index) => <RuleCard key={rule._id} rule={rule} settings={settings} onChanged={load} index={index} />)}</div>}</section>; })}
      </>}
    </section>
  );
}
