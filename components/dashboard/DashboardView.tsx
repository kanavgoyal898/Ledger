"use client"

import { useMemo, useState } from "react"
import { endOfMonth, endOfWeek, endOfYear, format, startOfMonth, startOfWeek, startOfYear, subMonths, subWeeks, subYears } from "date-fns"

import { DashboardCharts } from "@/components/dashboard/DashboardCharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatINR, type Transaction } from "@/lib/types"

type Timeline = "current-week" | "last-week" | "current-month" | "last-month" | "current-year" | "last-year" | "max" | "custom"

const timelineLabels: Record<Timeline, string> = {
  "current-week": "This Week",
  "last-week": "Last Week",
  "current-month": "Current Month",
  "last-month": "Last Month",
  "current-year": "Current Year",
  "last-year": "Last Year",
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
      case "last-week": {
        const lastWeek = subWeeks(today, 1)
        return { start: startOfWeek(lastWeek, { weekStartsOn: 1 }), end: endOfWeek(lastWeek, { weekStartsOn: 1 }) }
      }
      case "current-month":
        return { start: startOfMonth(today), end: today }
      case "last-month":
        return { start: startOfMonth(subMonths(today, 1)), end: endOfMonth(subMonths(today, 1)) }
      case "current-year":
        return { start: startOfYear(today), end: today }
      case "last-year":
        return { start: startOfYear(subYears(today, 1)), end: endOfYear(subYears(today, 1)) }
      case "max":
        return { start: transactions.reduce((earliest, transaction) => {
          const date = new Date(transaction.date)
          return date < earliest ? date : earliest
        }, today), end: today }
      case "custom":
        return { start: new Date(`${customStart}T00:00:00`), end: new Date(`${customEnd}T23:59:59`) }
      default:
        return { start: startOfWeek(today, { weekStartsOn: 1 }), end: today }
    }
  }, [customEnd, customStart, timeline, transactions])

  const visibleTransactions = useMemo(() => transactions.filter((transaction) => {
    const date = new Date(transaction.date)
    return date >= range.start && date <= range.end
  }), [range, transactions])

  const totalIncome = visibleTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0)
  const totalExpenditure = visibleTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0)

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end sm:justify-end">
        <div className="min-w-0 sm:w-40 text-left md:text-right">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="dashboard-timeline">Timeline</label>
          <Select value={timeline} onValueChange={(value) => value && setTimeline(value as Timeline)}>
            <SelectTrigger
              id="dashboard-timeline"
              className="w-full"
              aria-label="Dashboard timeline"
            >
              <SelectValue>{timelineLabels[timeline]}</SelectValue>
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false} className="p-1 lg:p-2">
              {(Object.entries(timelineLabels) as [Timeline, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {timeline === "custom" && (
          <div className="grid grid-cols-2 gap-2">
            <div><label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="dashboard-start">From</label><Input id="dashboard-start" className="w-full" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} /></div>
            <div><label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="dashboard-end">To</label><Input id="dashboard-end" className="w-full" type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></div>
          </div>
        )}
      </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card className="min-w-0">
          <CardHeader className="gap-1">
            <CardTitle className="truncate text-xl text-center text-emerald-600 dark:text-emerald-400 sm:text-2xl">{formatINR(totalIncome)}</CardTitle>
            <CardDescription className="text-center text-xs">Total Income</CardDescription>
          </CardHeader>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="gap-1">
            <CardTitle className="truncate text-xl text-center text-rose-600 dark:text-rose-400 sm:text-2xl">{formatINR(totalExpenditure)}</CardTitle>
            <CardDescription className="text-center text-xs">Total Expenditure</CardDescription>
          </CardHeader>
        </Card>
      </div>
      <DashboardCharts transactions={transactions} range={range} />
    </div>
  )
}