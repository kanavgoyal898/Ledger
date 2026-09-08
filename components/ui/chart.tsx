"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"
import { cn } from "cn"

const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode
    color?: string
    theme?: Record<keyof typeof THEMES, string>
  }
}

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) throw new Error("useChart must be used within a <ChartContainer />")
  return context
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, item]) => item.theme || item.color)
  if (!colorConfig.length) return null

  return (
    <style dangerouslySetInnerHTML={{
      __html: Object.entries(THEMES).map(([theme, prefix]) => {
        const rules = colorConfig.map(([key, item]) => {
          const color = item.theme?.[theme as keyof typeof THEMES] || item.color
          return color ? `  --color-${key}: ${color};` : null
        }).filter(Boolean).join("\n")
        return `${prefix} [data-chart=${id}] {\n${rules}\n}`
      }).join("\n"),
    }} />
  )
}

type ChartTooltipItem = {
  dataKey?: string | number
  name?: string | number
  color?: string
  value?: React.ReactNode
}

function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  indicator = "dot",
}: {
  active?: boolean
  payload?: ChartTooltipItem[]
  label?: React.ReactNode
  className?: string
  indicator?: "dot" | "line" | "dashed"
}) {
  const { config } = useChart()
  if (!active || !payload?.length) return null

  return (
    <div className={cn("z-[100] grid min-w-0 w-[min(14rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] gap-1.5 rounded-lg border bg-background px-3 py-2 text-xs shadow-xl", className)}>
      <div className="font-medium">{label}</div>
      <div className="grid gap-1.5">
        {payload.map((item) => {
          const key = String(item.dataKey || item.name || "value")
          const itemConfig = config[key]
          return (
            <div key={key} className="flex min-w-0 items-center gap-2">
              <span className={cn("shrink-0", indicator === "dot" && "size-2 rounded-full", indicator !== "dot" && "h-0.5 w-3")} style={{ backgroundColor: item.color }} />
              <span className="min-w-0 flex-1 wrap-break-word text-muted-foreground">{itemConfig?.label || item.name}</span>
              <span className="shrink-0 font-mono font-medium tabular-nums">{item.value}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type ChartLegendItem = {
  dataKey?: string | number
  value?: React.ReactNode
  color?: string
}

function ChartLegendContent({ payload, className, activeKey, onHover }: { payload?: ChartLegendItem[]; className?: string; activeKey?: string | null; onHover?: (key: string | null) => void }) {
  const { config } = useChart()
  if (!payload?.length) return null

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-2 pt-3 text-center", className)}>
      {payload.map((item, index) => {
        const configKey = String(item.dataKey || item.value || "value")
        const key = `${configKey}-${index}`
        return <div key={key} className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", onHover && "cursor-pointer", activeKey && activeKey !== configKey && "opacity-40")} onMouseEnter={() => onHover?.(configKey)} onMouseLeave={() => onHover?.(null)}><span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />{config[configKey]?.label || item.value}</div>
      })}
    </div>
  )
}

export { ChartContainer, ChartTooltipContent, ChartLegendContent }