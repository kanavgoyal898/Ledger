import type { Metadata } from "next";
import Link from "next/link";
import { sanityClient } from "@/lib/sanity";
import { TRANSACTIONS_QUERY, formatINR, type Transaction } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard",
};

export const revalidate = 0;

export default async function DashboardPage() {
  const transactions: Transaction[] = await sanityClient
    .fetch(TRANSACTIONS_QUERY, {}, { cache: "no-store" })
    .catch(() => []);

  const now = new Date();
  const thisMonth = transactions.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const expensesOnly = thisMonth.filter((e) => e.type === "expense");
  const incomeOnly = thisMonth.filter((e) => e.type === "income");

  const totalExpense = expensesOnly.reduce((s, e) => s + e.amount, 0);
  const totalIncome = incomeOnly.reduce((s, e) => s + e.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const recent = transactions.slice(0, 10);

  return (
    <div className="flex flex-col gap-6 mb-16 scrollbar-hide">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? "text-emerald-500" : "text-destructive"}`}>
              {formatINR(netBalance)}
            </div>
            <p className="text-xs text-muted-foreground">This Month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(totalIncome)}</div>
            <p className="text-xs text-muted-foreground">This Month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(totalExpense)}</div>
            <p className="text-xs text-muted-foreground">This Month</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent expenses */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Recent Transactions</h2>
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/transactions">View all →</Link>} />
        </div>

        {recent.length === 0 ? (
          <div className="flex h-36 items-center justify-center rounded-md border border-dashed">
            <p className="text-sm text-muted-foreground">
              No transactions yet.{" "}
              <Link href="/transactions" className="underline underline-offset-2">
                Add one now.
              </Link>
            </p>
          </div>
        ) : (
          <div className="rounded-md border divide-y">
            {recent.map((e) => (
              <div key={e._id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {e.heading || e.category}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(e.date), "d MMM yyyy")} ·{" "}
                    <Badge variant="secondary" className="text-xs">
                      {e.category}
                    </Badge>
                  </p>
                </div>
                <span
                  className={`font-mono text-sm font-semibold shrink-0 ${
                    e.type === "income" ? "text-emerald-500" : ""
                  }`}
                >
                  {e.type === "income" ? "+" : "-"}
                  {formatINR(e.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
