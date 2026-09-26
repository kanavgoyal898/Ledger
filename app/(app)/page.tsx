import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getAuthenticatedUsername } from "@/lib/auth";
import { LandingPage } from "@/components/landing/LandingPage";
import { sanityClient } from "@/lib/sanity";
import { TRANSACTIONS_QUERY, type Transaction } from "@/lib/types";
import { DashboardView } from "@/components/dashboard/DashboardView";

export async function generateMetadata(): Promise<Metadata> {
  return getAuthenticatedUsername({ cookies: await cookies() })
    ? { title: "Dashboard" }
    : {
        title: { absolute: "Ledger" },
        description: "Track income and expenses, understand your cash flow, manage recurring payments, and export your records with Ledger, a self-hosted personal finance manager.",
      };
}

export default async function DashboardPage() {
  if (!getAuthenticatedUsername({ cookies: await cookies() })) return <LandingPage />;

  const transactions: Transaction[] = await sanityClient
    .fetch(TRANSACTIONS_QUERY, {}, { next: { tags: ["transactions"] } })
    .catch(() => []);

  return (
    <div className="flex flex-col gap-6 mb-16 scrollbar-hide">
      <DashboardView transactions={transactions} />
    </div>
  );
}
