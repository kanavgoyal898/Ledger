"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import { addDays, addMonths, addYears, differenceInCalendarDays, differenceInCalendarMonths, format, startOfDay, startOfMonth, startOfYear } from "date-fns"
import { Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartLegendContent, type ChartConfig } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatINR, type Transaction } from "@/lib/types"
import { stringToColor } from "@/lib/utils"

const chartConfig = {
  income: { label: "Income", color: "#10b981" },
  expenses: { label: "Expenses", color: "#f43f5e" },
} satisfies ChartConfig

type SubAccountTotal = { label: string; value: number }
type AccountTotal = { label: string; value: number; subAccounts: SubAccountTotal[] }
type SplitItem = { label: string; value: number; fill: string; accounts: AccountTotal[]; children?: SplitItem[] }

function SplitLegend({ data, onSelect }: { data: SplitItem[]; onSelect?: () => void }) {
  const rowProps = {
    className: onSelect ? "cursor-pointer" : undefined,
    onClick: onSelect,
    onKeyDown: (event: React.KeyboardEvent<HTMLTableRowElement>) => {
      if (onSelect && (event.key === "Enter" || event.key === " ")) onSelect()
    },
    tabIndex: onSelect ? 0 : undefined,
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Split</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((entry, entryIndex) => (
          <Fragment key={`${entryIndex}-${entry.label}`}>
            <TableRow {...rowProps} key={`${entryIndex}-${entry.label}-row`}>
              <TableCell key={`${entryIndex}-${entry.label}-cell`}>
                <div className="flex min-w-0 items-center gap-2 font-medium">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: entry.fill }} />
                  <span className="min-w-0 wrap-break-word">{entry.label}</span>
                </div>
              </TableCell>
              <TableCell key={`${entryIndex}-${entry.label}-amount`} className="text-right font-mono font-medium tabular-nums">{formatINR(entry.value)}</TableCell>
            </TableRow>
            {entry.accounts.map((account, accountIndex) => (
              <Fragment key={`${entryIndex}-${accountIndex}-${account.label}`}>
                <TableRow {...rowProps} key={`${entryIndex}-${accountIndex}-${account.label}-row`}>
                  <TableCell key={`${entryIndex}-${accountIndex}-${account.label}-cell`} className="pl-8 text-muted-foreground">{account.label}</TableCell>
                  <TableCell key={`${entryIndex}-${accountIndex}-${account.label}-amount`} className="text-right font-mono tabular-nums">{formatINR(account.value)}</TableCell>
                </TableRow>
                {account.subAccounts.map((subAccount, subAccountIndex) => (
                  <TableRow {...rowProps} key={`${entryIndex}-${accountIndex}-${subAccountIndex}-${subAccount.label}`}>
                    <TableCell key={`${entryIndex}-${accountIndex}-${subAccountIndex}-${subAccount.label}-cell`} className="pl-12 text-muted-foreground">{subAccount.label}</TableCell>
                    <TableCell key={`${entryIndex}-${accountIndex}-${subAccountIndex}-${subAccount.label}-amount`} className="text-right font-mono text-muted-foreground tabular-nums">{formatINR(subAccount.value)}</TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  )
}

export function DashboardCharts({ transactions, range }: { transactions: Transaction[]; range: { start: Date; end: Date } }) {
  const [expandedCategories, setExpandedCategories] = useState<{ expenses?: string; income?: string }>({})
  const [xTickCount, setXTickCount] = useState(12)
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null)

  useEffect(() => {
    const updateTickCount = () => {
      const width = window.innerWidth
      setXTickCount(width < 768 ? 4 : width < 1024 ? 6 : 12)
    }

    updateTickCount()
    window.addEventListener("resize", updateTickCount)
    return () => window.removeEventListener("resize", updateTickCount)
  }, [])

  const visibleTransactions = useMemo(() => transactions.filter((transaction) => {
    const date = new Date(transaction.date)
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
        const date = new Date(transaction.date)
        return date >= bucket && date < nextBucket
      })
      return {
        period: format(bucket, formatBucket),
        income: bucketTransactions.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + transaction.amount, 0),
        expenses: bucketTransactions.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + transaction.amount, 0),
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

    return { expenses: getSplit("expense"), income: getSplit("income") }
  }, [visibleTransactions])

  const formatAmount = (value: number) => `₹${Math.round(value / 1000)}k`

  return (
    <div className="flex flex-col gap-4">
      <Card className="col-span-2 min-w-0 overflow-visible">
        <CardHeader className="border-b px-4 md:px-6">
          <div>
            <CardTitle className="text-lg sm:text-base">Cash Flow</CardTitle>
            <CardDescription>Income and expenses over time</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0 pt-4 sm:px-3 md:px-4 lg:px-6 sm:pt-6">
          <ChartContainer config={chartConfig} className="h-64 w-full sm:h-70">
            <AreaChart accessibilityLayer data={chartData} margin={{ left: 0, right: 4 }}>
              <defs>
                <linearGradient id="cash-flow-income-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-income)" stopOpacity={0.42} />
                  <stop offset="95%" stopColor="var(--color-income)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="cash-flow-expenses-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-expenses)" stopOpacity={0.36} />
                  <stop offset="95%" stopColor="var(--color-expenses)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" ticks={xTicks} interval={0} tickLine={false} axisLine={false} tickMargin={6} />
              <YAxis width={42} tickLine={false} axisLine={false} tickMargin={4} tickFormatter={(value) => value === 0 ? "" : formatAmount(value)} />
              <Legend content={<ChartLegendContent activeKey={hoveredSeries} onHover={setHoveredSeries} />} />
              <Area dataKey="income" type="monotone" fill="url(#cash-flow-income-gradient)" fillOpacity={hoveredSeries && hoveredSeries !== "income" ? 0.2 : 1} stroke="var(--color-income)" strokeOpacity={hoveredSeries && hoveredSeries !== "income" ? 0.35 : 1} strokeWidth={2} />
              <Area dataKey="expenses" type="monotone" fill="url(#cash-flow-expenses-gradient)" fillOpacity={hoveredSeries && hoveredSeries !== "expenses" ? 0.2 : 1} stroke="var(--color-expenses)" strokeOpacity={hoveredSeries && hoveredSeries !== "expenses" ? 0.35 : 1} strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 md:flex-row">
        {(["expenses", "income"] as const).map((type) => {
          const expandedCategory = expandedCategories[type]
          const category = splitData[type].find((entry) => entry.label === expandedCategory)
          const data = category?.children || splitData[type]
          const label = type === "expenses" ? "Expense split" : "Income split"
          return (
            <Card key={type} className="min-w-0 flex-1 overflow-visible">
              <CardHeader className="flex flex-col items-start justify-between gap-3 px-4 md:flex-row md:px-6"><div><CardTitle>{label}</CardTitle><CardDescription>{category ? `${category.label} by sub-category` : "Click a category to expand sub-categories"}</CardDescription></div>{category && <Button className="-ml-2 md:ml-0" variant="ghost" size="sm" onClick={() => setExpandedCategories((current) => ({ ...current, [type]: undefined }))}>All categories</Button>}</CardHeader>
              <CardContent className="px-0 sm:px-3 md:px-4 lg:px-6">
                {data.length === 0 ? <p className="flex h-52 items-center justify-center text-sm text-muted-foreground sm:h-60">No {type} data yet.</p> : (
                  <ChartContainer config={chartConfig} className="h-56 w-full sm:h-60">
                    <PieChart accessibilityLayer>
                      <Pie data={data} dataKey="value" nameKey="label" innerRadius="48%" outerRadius="76%" paddingAngle={3} isAnimationActive animationBegin={0} animationDuration={450} animationEasing="ease-in-out" onClick={(_, index) => {
                        const selected = data[index]
                          if (category) {
                            setExpandedCategories((current) => ({ ...current, [type]: undefined }))
                          } else if (selected?.children?.length) {
                            setExpandedCategories((current) => ({ ...current, [type]: selected.label }))
                          }
                      }}>
                        {data.map((entry, index) => <Cell key={`${index}-${entry.label}`} fill={entry.fill} />)}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                )}
                {data.length > 0 && <SplitLegend data={data} onSelect={category ? () => setExpandedCategories((current) => ({ ...current, [type]: undefined })) : undefined} />}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}