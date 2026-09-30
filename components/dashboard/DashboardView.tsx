"use client"

import { useMemo, useState } from "react"
import { format, startOfDay, startOfMonth, startOfWeek, startOfYear } from "date-fns"

import { DashboardCharts } from "@/components/dashboard/DashboardCharts"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatINR, type Transaction } from "@/lib/types"
import { parseLedgerDate } from "@/lib/ledger-date"

type Timeline = "current-week" | "current-month" | "current-year" | "max" | "custom"

const timelineLabels: Record<Timeline, string> = {
  "current-week": "This Week",
  "current-month": "This Month",
  "current-year": "This Year",
  max: "All Time",
  custom: "Custom",
}

export function DashboardView({ transactions }: { transactions: Transaction[] }) {
  const [timeline, setTimeline] = useState<Timeline>("current-week")
  const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"))
  const [customEnd, setCustomEnd] = useState(format(new Date(), "yyyy-MM-dd"))

  const range = useMemo(() => {
    const today = new Date()
    switch (timeline) {
      case "current-month":
        return { start: startOfDay(startOfMonth(today)), end: today }
      case "current-year":
        return { start: startOfDay(startOfYear(today)), end: today }
      case "max":
        return { start: transactions.reduce((earliest, transaction) => {
          const date = parseLedgerDate(transaction.date)
          return date < earliest ? date : earliest
        }, today), end: today }
      case "custom":
        return { start: new Date(`${customStart}T00:00:00`), end: new Date(`${customEnd}T23:59:59`) }
      default:
        return { start: startOfDay(startOfWeek(today, { weekStartsOn: 1 })), end: today }
    }
  }, [customEnd, customStart, timeline, transactions])

  const visibleTransactions = useMemo(() => transactions.filter((transaction) => {
    const date = parseLedgerDate(transaction.date)
    return date >= range.start && date <= range.end
  }), [range, transactions])

  const totalIncome = visibleTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0)
  const totalExpenditure = visibleTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0)
  const totalInvestment = visibleTransactions
    .filter((transaction) => transaction.type === "investment")
    .reduce((sum, transaction) => sum + transaction.amount, 0)

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between animate-fade-up" style={{ "--stagger-delay": "0ms" } as React.CSSProperties}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end sm:justify-end">
          <div className="min-w-0 sm:w-40">
            <label
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
              htmlFor="dashboard-timeline"
            >
              Timeline
            </label>

            <Select
              value={timeline}
              onValueChange={(value) => value && setTimeline(value as Timeline)}
            >
              <SelectTrigger
                id="dashboard-timeline"
                className="h-10 w-full transition-shadow focus:ring-2"
                aria-label="Dashboard timeline"
              >
                <SelectValue>{timelineLabels[timeline]}</SelectValue>
              </SelectTrigger>

              <SelectContent
                align="start"
                alignItemWithTrigger={false}
                className="p-1 lg:p-2 animate-in fade-in zoom-in-95 duration-200"
              >
                {(Object.entries(timelineLabels) as [Timeline, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value} className="cursor-pointer transition-colors">
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {timeline === "custom" && (
            <div className="grid grid-cols-2 gap-2 animate-fade-up">
              <div className="min-w-0">
                <label
                  className="mb-1.5 block text-xs text-muted-foreground"
                  htmlFor="dashboard-start"
                >
                  Start Date
                </label>
                <Input
                  id="dashboard-start"
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="w-full min-w-0 transition-shadow focus:ring-2"
                />
              </div>

              <div className="min-w-0">
                <label
                  className="mb-1.5 block text-xs text-muted-foreground"
                  htmlFor="dashboard-end"
                >
                  End Date
                </label>
                <Input
                  id="dashboard-end"
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="text-xs w-full min-w-0 transition-shadow focus:ring-2"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card className="min-w-0 animate-fade-up delay-stagger hover:shadow-md transition-shadow" style={{ "--stagger-delay": "100ms" } as React.CSSProperties}>
          <CardHeader className="gap-1">
            <CardTitle key={`income-${totalIncome}-${timeline}`} className="truncate text-xl text-center text-emerald-600 dark:text-emerald-400 sm:text-2xl animate-number-flash tabular-nums">
              {formatINR(totalIncome, 0)}
            </CardTitle>
            <CardDescription className="text-center text-xs">Total Income</CardDescription>
          </CardHeader>
        </Card>
        <Card className="min-w-0 animate-fade-up delay-stagger hover:shadow-md transition-shadow" style={{ "--stagger-delay": "200ms" } as React.CSSProperties}>
          <CardHeader className="gap-1">
            <CardTitle key={`expense-${totalExpenditure}-${timeline}`} className="truncate text-xl text-center text-rose-600 dark:text-rose-400 sm:text-2xl animate-number-flash tabular-nums">
              {formatINR(totalExpenditure, 0)}
            </CardTitle>
            <CardDescription className="text-center text-xs">Total Expenditure</CardDescription>
          </CardHeader>
        </Card>
        <Card className="min-w-0 animate-fade-up delay-stagger hover:shadow-md transition-shadow" style={{ "--stagger-delay": "300ms" } as React.CSSProperties}>
          <CardHeader className="gap-1">
            <CardTitle key={`investment-${totalInvestment}-${timeline}`} className="truncate text-xl text-center text-sky-600 dark:text-sky-400 sm:text-2xl animate-number-flash tabular-nums">
              {formatINR(totalInvestment, 0)}
            </CardTitle>
            <CardDescription className="text-center text-xs">Total Investments</CardDescription>
          </CardHeader>
        </Card>
      </div>
      <DashboardCharts transactions={transactions} range={range} />
    </div>
  )
}
