"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { addDays, addMonths, addYears, differenceInCalendarDays, differenceInCalendarMonths, format, startOfDay, startOfMonth, startOfYear } from "date-fns"
import { Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartLegendContent, type ChartConfig } from "@/components/ui/chart"
import { formatINR, type Transaction } from "@/lib/types"
import { stringToColor } from "@/lib/utils"
import { parseLedgerDate } from "@/lib/ledger-date"

const chartConfig = {
  income: { label: "Income", color: "#10b981" },
  expenses: { label: "Expenses", color: "#f43f5e" },
  investments: { label: "Investments", color: "#0ea5e9" },
} satisfies ChartConfig

type SubAccountTotal = { label: string; value: number }
type AccountTotal = { label: string; value: number; subAccounts: SubAccountTotal[] }
type SplitItem = { label: string; value: number; fill: string; accounts: AccountTotal[]; children?: SplitItem[] }

type HierarchyDatum = {
  key: string
  name: string
  group: "Income" | "Expenses" | "Investments"
  value: number
  total: number
  fill: string
  children?: SplitItem[]
}

function formatCompactINR(value: number) {
  const absoluteValue = Math.abs(value)
  const units = [
    { threshold: 10_000_000, divisor: 10_000_000, suffix: "Cr" },
    { threshold: 100_000, divisor: 100_000, suffix: "L" },
    { threshold: 1_000, divisor: 1_000, suffix: "K" },
  ]
  const unit = units.find(({ threshold }) => absoluteValue >= threshold)
  if (!unit) return `₹${Math.round(value).toLocaleString("en-IN")}`

  const scaled = value / unit.divisor
  const digits = Math.abs(scaled) < 10 && !Number.isInteger(scaled) ? 1 : 0
  return `₹${scaled.toFixed(digits)}${unit.suffix}`
}

function HierarchyTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload.length) return null
  const entry = payload[0]?.payload as HierarchyDatum | undefined
  if (!entry) return null
  const percentage = entry.total > 0 ? (entry.value / entry.total) * 100 : 0

  return (
    <div className="grid w-max max-w-[calc(100vw-2rem)] gap-1 rounded-lg border bg-background px-3 py-2 text-xs shadow-xl">
      <div className="flex items-center gap-2 font-medium">
        <span className="size-2 rounded-full" style={{ backgroundColor: entry.fill }} />
        <span>{entry.name}</span>
      </div>
      <div className="text-muted-foreground">{entry.group}</div>
      <div className="flex items-center justify-between gap-5">
        <span className="font-mono font-semibold tabular-nums">{formatINR(entry.value, 0)}</span>
        <span className="text-muted-foreground tabular-nums">{percentage.toFixed(1)}%</span>
      </div>
    </div>
  )
}

function TimelineTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload.length) return null
  const entry = payload[0]?.payload as { income?: number; expenses?: number; investments?: number } | undefined
  if (!entry) return null
  const income = entry.income || 0
  const expenses = entry.expenses || 0
  const investments = entry.investments || 0
  const net = income - expenses - investments

  return (
    <div className="grid w-[min(13rem,calc(100vw-2rem))] gap-2 rounded-lg border bg-background px-3 py-2.5 text-xs shadow-xl">
      <div className="font-medium">{label}</div>
      <div className="grid gap-1.5">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500" />
          <span className="flex-1 text-muted-foreground">Income</span>
          <span className="font-mono font-medium tabular-nums">{formatINR(income, 0)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-rose-500" />
          <span className="flex-1 text-muted-foreground">Expenses</span>
          <span className="font-mono font-medium tabular-nums">{formatINR(expenses, 0)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-sky-500" />
          <span className="flex-1 text-muted-foreground">Investments</span>
          <span className="font-mono font-medium tabular-nums">{formatINR(investments, 0)}</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t pt-2">
        <span className="text-muted-foreground">Net cash flow</span>
        <span className={`font-mono font-semibold tabular-nums ${net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
          {formatINR(net, 0)}
        </span>
      </div>
    </div>
  )
}

export function DashboardCharts({ transactions, range }: { transactions: Transaction[]; range: { start: Date; end: Date } }) {
  const [selectedCategory, setSelectedCategory] = useState<{ type: "income" | "expenses" | "investments"; label: string } | null>(null)
  const [xTickCount, setXTickCount] = useState(12)
  const [cashFlowWidth, setCashFlowWidth] = useState(0)
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null)
  const cashFlowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const chart = cashFlowRef.current
    if (!chart) return

    const updateTickCount = (width: number) => {
      setCashFlowWidth(width)
      setXTickCount(width < 420 ? 3 : width < 640 ? 4 : width < 900 ? 6 : 12)
    }

    updateTickCount(chart.getBoundingClientRect().width)
    const observer = new ResizeObserver(([entry]) => updateTickCount(entry.contentRect.width))
    observer.observe(chart)
    return () => observer.disconnect()
  }, [])

  const visibleTransactions = useMemo(() => transactions.filter((transaction) => {
    const date = parseLedgerDate(transaction.date)
    return date >= range.start && date <= range.end
  }), [range, transactions])

  const chartData = useMemo(() => {
    const daySpan = differenceInCalendarDays(range.end, range.start)
    const granularity = daySpan <= 31 ? "day" : differenceInCalendarMonths(range.end, range.start) <= 12 ? "month" : "year"
    const bucketStart = granularity === "day" ? startOfDay(range.start) : granularity === "month" ? startOfMonth(range.start) : startOfYear(range.start)
    const bucketEnd = granularity === "day" ? startOfDay(range.end) : granularity === "month" ? startOfMonth(range.end) : startOfYear(range.end)
    const step = granularity === "day" ? addDays : granularity === "month" ? addMonths : addYears
    const formatBucket = granularity === "day" ? "d MMM" : granularity === "month" ? "MMM yy" : "yyyy"
    const buckets: Date[] = []
    for (let bucket = bucketStart; bucket <= bucketEnd; bucket = step(bucket, 1)) buckets.push(bucket)

    return buckets.map((bucket) => {
      const nextBucket = step(bucket, 1)
      const bucketTransactions = visibleTransactions.filter((transaction) => {
        const date = parseLedgerDate(transaction.date)
        return date >= bucket && date < nextBucket
      })
      return {
        period: format(bucket, formatBucket),
        income: bucketTransactions.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + transaction.amount, 0),
        expenses: bucketTransactions.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + transaction.amount, 0),
        investments: bucketTransactions.filter((transaction) => transaction.type === "investment").reduce((sum, transaction) => sum + transaction.amount, 0),
      }
    })
  }, [range, visibleTransactions])

  const xTicks = useMemo(() => {
    const tickData = chartData.slice(0, -1)
    if (tickData.length <= xTickCount) return tickData.map((entry) => entry.period)
    return Array.from({ length: xTickCount }, (_, index) => tickData[Math.round(index * (tickData.length - 1) / (xTickCount - 1))].period)
  }, [chartData, xTickCount])

  const splitData = useMemo(() => {
    const getSplit = (type: Transaction["type"]) => {
      type Aggregate = { value: number; accounts: Map<string, { value: number; subAccounts: Map<string, number> }> }
      const totals = new Map<string, Aggregate & { subCategories: Map<string, Aggregate> }>()
      visibleTransactions.forEach((transaction) => {
        if (transaction.type !== type) return
        const subCategory = transaction.subCategory || "Uncategorized"
        const category = totals.get(transaction.category) || { value: 0, accounts: new Map(), subCategories: new Map() }
        const subCategoryTotal = category.subCategories.get(subCategory) || { value: 0, accounts: new Map() }
        const addToAggregate = (aggregate: Aggregate) => {
          const account = aggregate.accounts.get(transaction.account) || { value: 0, subAccounts: new Map<string, number>() }
          aggregate.value += transaction.amount
          account.value += transaction.amount
          if (transaction.subAccount) account.subAccounts.set(transaction.subAccount, (account.subAccounts.get(transaction.subAccount) || 0) + transaction.amount)
          aggregate.accounts.set(transaction.account, account)
        }
        addToAggregate(category)
        addToAggregate(subCategoryTotal)
        category.subCategories.set(subCategory, subCategoryTotal)
        totals.set(transaction.category, category)
      })
      const toAccounts = (accounts: Map<string, { value: number; subAccounts: Map<string, number> }>) => [...accounts.entries()].sort((a, b) => b[1].value - a[1].value).map(([label, account]) => ({
        label,
        value: account.value,
        subAccounts: [...account.subAccounts.entries()].sort((a, b) => b[1] - a[1]).map(([subLabel, value]) => ({ label: subLabel, value })),
      }))
      return [...totals.entries()].sort((a, b) => b[1].value - a[1].value).slice(0, 6).map(([category, total]): SplitItem => {
        const children = [...total.subCategories.entries()].sort((a, b) => b[1].value - a[1].value).map(([subCategory, subTotal]) => ({
          label: subCategory,
          value: subTotal.value,
          fill: stringToColor(`${category} / ${subCategory}`),
          accounts: toAccounts(subTotal.accounts),
        }))
        return {
          label: category,
          value: total.value,
          fill: stringToColor(category),
          accounts: toAccounts(total.accounts),
          children,
        }
      })
    }

    return { expenses: getSplit("expense"), income: getSplit("income"), investments: getSplit("investment") }
  }, [visibleTransactions])

  const incomeExpenseSplit = useMemo(() => {
    const income = visibleTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + transaction.amount, 0)
    const expenses = visibleTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + transaction.amount, 0)
    const investments = visibleTransactions
      .filter((transaction) => transaction.type === "investment")
      .reduce((sum, transaction) => sum + transaction.amount, 0)
    const total = income + expenses + investments
    const balance = income - expenses - investments

    return {
      data: [
        { name: "Income", group: "Income", key: "income", value: income, total, fill: chartConfig.income.color },
        { name: "Expenses", group: "Expenses", key: "expenses", value: expenses, total, fill: chartConfig.expenses.color },
        { name: "Investments", group: "Investments", key: "investments", value: investments, total, fill: chartConfig.investments.color },
      ].filter((entry) => entry.value > 0),
      income,
      expenses,
      investments,
      total,
      balance,
      balancePercentage: income > 0 ? (balance / income) * 100 : null,
    }
  }, [visibleTransactions])

  const hierarchyData = useMemo(() => {
    if (selectedCategory) {
      const category = splitData[selectedCategory.type].find((entry) => entry.label === selectedCategory.label)
      const group = selectedCategory.type === "income" ? "Income" : selectedCategory.type === "investments" ? "Investments" : "Expenses"
      return (category?.children || []).map((entry): HierarchyDatum => ({
        key: `${selectedCategory.type}-${selectedCategory.label}-${entry.label}`,
        name: entry.label,
        group,
        value: entry.value,
        total: category?.value || 0,
        fill: entry.fill,
      }))
    }

    return (["income", "expenses", "investments"] as const).flatMap((type) => {
      const group = type === "income" ? "Income" : type === "investments" ? "Investments" : "Expenses"
      const total = type === "income" ? incomeExpenseSplit.income : type === "investments" ? incomeExpenseSplit.investments : incomeExpenseSplit.expenses
      return splitData[type].map((entry): HierarchyDatum => ({
        key: `${type}-${entry.label}`,
        name: entry.label,
        group,
        value: entry.value,
        total,
        fill: entry.fill,
        children: entry.children,
      }))
    })
  }, [incomeExpenseSplit.expenses, incomeExpenseSplit.income, incomeExpenseSplit.investments, selectedCategory, splitData])

  return (
    <div className="flex flex-col gap-4">
      <Card className="min-w-0 overflow-visible animate-fade-up delay-stagger" style={{ "--stagger-delay": "300ms" } as React.CSSProperties}>
        <CardHeader className="flex flex-row items-start justify-between gap-3 border-b px-4 md:px-6">
          <div>
            <CardTitle className="text-lg sm:text-base">Income, Expense &amp; Investment Split</CardTitle>
          </div>
          {selectedCategory && <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>All categories</Button>}
        </CardHeader>
        <CardContent className="grid min-w-0 gap-5 px-3 pt-5 sm:px-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(16rem,0.75fr)] lg:items-center lg:px-6">
          {incomeExpenseSplit.data.length === 0 ? (
            <p className="flex h-56 items-center justify-center text-sm text-muted-foreground md:col-span-2">No income, expense, or investment data yet.</p>
          ) : (
            <>
              <ChartContainer config={chartConfig} className="mx-auto h-[clamp(14rem,65vw,20rem)] w-full max-w-xl">
                <PieChart accessibilityLayer>
                  <Pie
                    data={incomeExpenseSplit.data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="32%"
                    outerRadius="52%"
                    paddingAngle={2}
                    stroke="var(--card)"
                    strokeWidth={3}
                    isAnimationActive
                    animationDuration={450}
                  >
                    {incomeExpenseSplit.data.map((entry) => <Cell key={entry.key} fill={entry.fill} />)}
                  </Pie>
                  <Pie
                    data={hierarchyData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="58%"
                    outerRadius="84%"
                    paddingAngle={2}
                    stroke="var(--card)"
                    strokeWidth={2}
                    isAnimationActive
                    animationDuration={450}
                    onClick={(_, index) => {
                      const entry = hierarchyData[index]
                      if (!selectedCategory && entry?.children?.length) {
                        setSelectedCategory({ type: entry.group === "Income" ? "income" : entry.group === "Investments" ? "investments" : "expenses", label: entry.name })
                      }
                    }}
                    className={!selectedCategory ? "cursor-pointer" : undefined}
                  >
                    {hierarchyData.map((entry) => <Cell key={entry.key} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip content={HierarchyTooltip} allowEscapeViewBox={{ x: true, y: true }} />
                </PieChart>
              </ChartContainer>
              <div className="grid min-w-0 gap-3">
                {incomeExpenseSplit.data.map((entry) => {
                  const percentage = incomeExpenseSplit.total === 0 ? 0 : (entry.value / incomeExpenseSplit.total) * 100
                  return (
                    <div key={entry.key} className="rounded-lg border bg-muted/25 p-3">
                      <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                        <span>{entry.name}</span>
                        <span className="ml-auto font-medium tabular-nums">{percentage.toFixed(1)}%</span>
                      </div>
                      <p className="truncate text-lg font-semibold tabular-nums">{formatINR(entry.value, 0)}</p>
                    </div>
                  )
                })}
                <div className="rounded-lg border bg-muted/25 p-3">
                  <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <span className={`size-2.5 rounded-full ${incomeExpenseSplit.balance >= 0 ? "bg-violet-500" : "bg-amber-500"}`} />
                    <span>Balance</span>
                    <span className="ml-auto text-xs tabular-nums">
                      {incomeExpenseSplit.balancePercentage === null ? "—" : `${incomeExpenseSplit.balancePercentage.toFixed(1)}%`}
                    </span>
                  </div>
                  <p className={`truncate text-lg font-semibold tabular-nums ${incomeExpenseSplit.balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {formatINR(incomeExpenseSplit.balance, 0)}
                  </p>
                </div>
                <div className="max-h-44 overflow-y-auto rounded-lg border p-2 sm:max-h-52">
                  {hierarchyData.map((entry) => (
                    <button
                      key={entry.key}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted disabled:cursor-default"
                      disabled={Boolean(selectedCategory) || !entry.children?.length}
                      onClick={() => setSelectedCategory({ type: entry.group === "Income" ? "income" : entry.group === "Investments" ? "investments" : "expenses", label: entry.name })}
                    >
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: entry.fill }} />
                      <span className="min-w-0 flex-1 truncate"><span className="text-muted-foreground">{entry.group} · </span>{entry.name}</span>
                      <span className="shrink-0 font-mono font-medium tabular-nums">{formatINR(entry.value, 0)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="col-span-2 min-w-0 overflow-visible animate-fade-up delay-stagger" style={{ "--stagger-delay": "300ms" } as React.CSSProperties}>
        <CardHeader className="border-b px-4 md:px-6">
          <div>
            <CardTitle className="text-lg sm:text-base">Cash Flow</CardTitle>
          </div>
        </CardHeader>
        <CardContent ref={cashFlowRef} className="min-w-0 px-2 pt-4 sm:px-3 sm:pt-6 md:px-4 lg:px-6">
          <ChartContainer config={chartConfig} className="h-[clamp(13rem,55vw,17.5rem)] w-full">
            <AreaChart accessibilityLayer data={chartData} margin={{ top: 4, right: cashFlowWidth < 420 ? 6 : 12, bottom: 6, left: cashFlowWidth < 420 ? 2 : 8 }}>
              <defs>
                <linearGradient id="cash-flow-income-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-income)" stopOpacity={0.42} />
                  <stop offset="95%" stopColor="var(--color-income)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="cash-flow-expenses-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-expenses)" stopOpacity={0.36} />
                  <stop offset="95%" stopColor="var(--color-expenses)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="cash-flow-investments-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-investments)" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="var(--color-investments)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="period"
                ticks={xTicks}
                interval={0}
                tickLine={false}
                axisLine={false}
                tickMargin={cashFlowWidth < 420 ? 10 : 8}
                minTickGap={cashFlowWidth < 420 ? 12 : 20}
                padding={{ left: cashFlowWidth < 420 ? 8 : 4, right: cashFlowWidth < 420 ? 8 : 4 }}
              />
              <YAxis
                width={cashFlowWidth < 420 ? 48 : 58}
                tickCount={cashFlowWidth < 420 ? 4 : 6}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tickMargin={cashFlowWidth < 420 ? 6 : 8}
                tickFormatter={formatCompactINR}
              />
              <Tooltip content={TimelineTooltip} cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }} />
              <Legend content={<ChartLegendContent activeKey={hoveredSeries} onHover={setHoveredSeries} />} />
              <Area dataKey="income" type="monotone" fill="url(#cash-flow-income-gradient)" fillOpacity={hoveredSeries && hoveredSeries !== "income" ? 0.2 : 1} stroke="var(--color-income)" strokeOpacity={hoveredSeries && hoveredSeries !== "income" ? 0.35 : 1} strokeWidth={2} />
              <Area dataKey="expenses" type="monotone" fill="url(#cash-flow-expenses-gradient)" fillOpacity={hoveredSeries && hoveredSeries !== "expenses" ? 0.2 : 1} stroke="var(--color-expenses)" strokeOpacity={hoveredSeries && hoveredSeries !== "expenses" ? 0.35 : 1} strokeWidth={2} />
              <Area dataKey="investments" type="monotone" fill="url(#cash-flow-investments-gradient)" fillOpacity={hoveredSeries && hoveredSeries !== "investments" ? 0.2 : 1} stroke="var(--color-investments)" strokeOpacity={hoveredSeries && hoveredSeries !== "investments" ? 0.35 : 1} strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

    </div>
  )
}
