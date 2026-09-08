"use client";

import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RECURRENCE_FREQUENCIES, type RecurringTransaction } from "@/lib/types";
import { formatINR } from "@/lib/types";
import { formatRecurrenceFrequency } from "@/lib/recurrence";

function displayDate(value?: string) {
  return value ? format(parseISO(value.slice(0, 10)), "d MMM yyyy") : "No End Date";
}

function RuleCard({ rule, onChanged }: { rule: RecurringTransaction; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(rule.amount));
  const [frequency, setFrequency] = useState(rule.frequency);
  const [endDate, setEndDate] = useState(rule.endDate?.slice(0, 10) ?? "");

  async function patch(body: Record<string, unknown>) {
    await fetch(`/api/recurring/${rule._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    onChanged();
  }

  async function saveEdit() {
    await patch({ amount, frequency, endDate: endDate || undefined });
    setEditing(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base">{rule.type === "income" ? "Income" : "Expense"} · {rule.heading || rule.category}</CardTitle>
          <p className="text-sm text-muted-foreground">{rule.category}{rule.subCategory ? ` / ${rule.subCategory}` : ""} · {rule.account}</p>
        </div>
        <span className={rule.active ? "text-emerald-600 text-sm" : "text-muted-foreground text-sm"}>{rule.active ? "Active" : "Inactive"}</span>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {editing ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Amount</label>
              <Input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="Amount" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Frequency</label>
              <Select value={frequency} onValueChange={(value) => setFrequency(value as typeof frequency)}><SelectTrigger className="w-full"><SelectValue placeholder="Select Frequency">{formatRecurrenceFrequency(frequency)}</SelectValue></SelectTrigger><SelectContent className="w-80 max-w-[calc(100vw-2rem)]">{RECURRENCE_FREQUENCIES.map((value) => <SelectItem key={value} value={value}>{formatRecurrenceFrequency(value)}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">End Date</label>
              <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} aria-label="End Date" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-muted-foreground sm:grid-cols-4">
            <span><b className="text-foreground">{formatINR(rule.amount)}</b></span>
            <span>{formatRecurrenceFrequency(rule.frequency)}</span>
            <span>Starts {displayDate(rule.startDate)}</span>
            <span>Ends {displayDate(rule.endDate)}</span>
          </div>
        )}
        <p className="text-sm">Next Occurrence: <b>{rule.active ? displayDate(rule.nextOccurrence) : "Paused"}</b></p>
        <div className="flex flex-wrap gap-2">
          {editing ? <><Button size="sm" onClick={saveEdit}>Save</Button><Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button></> : <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>}
          {!editing && rule.active && <Button size="sm" variant="outline" onClick={() => patch({ active: false })}>Deactivate</Button>}
          {!editing && !rule.active && <><Button size="sm" variant="outline" onClick={() => patch({ active: true, resumeMode: "backfill" })}>Reactivate & Backfill</Button><Button size="sm" variant="outline" onClick={() => patch({ active: true, resumeMode: "resume" })}>Resume Next</Button></>}
          {!editing && <Button size="sm" variant="destructive" onClick={async () => { await fetch(`/api/recurring/${rule._id}`, { method: "DELETE" }); onChanged(); }}>Delete</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

export function RecurringTransactionsSection() {
  const [rules, setRules] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); const response = await fetch("/api/recurring"); setRules(await response.json()); setLoading(false); }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  const active = rules.filter((rule) => rule.active);
  const inactive = rules.filter((rule) => !rule.active);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Recurring Transactions</h2>
      {loading ? <p className="text-sm text-muted-foreground">Loading Recurring Transactions…</p> : <>{["Active Recurring Transactions", "Inactive Recurring Transactions"].map((heading, index) => { const items = index === 0 ? active : inactive; return <section key={heading} className="space-y-3"><h3 className="font-semibold">{heading}</h3>{items.length === 0 ? <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">No {index === 0 ? "Active" : "Inactive"} Recurring Transactions.</p> : items.map((rule) => <RuleCard key={rule._id} rule={rule} onChanged={load} />)}</section>; })}</>}
    </section>
  );
}
