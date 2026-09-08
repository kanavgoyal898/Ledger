import type { Metadata } from "next";
import { sanityClient } from "@/lib/sanity";
import { TRANSACTIONS_QUERY, type Transaction } from "@/lib/types";
import { DashboardView } from "@/components/dashboard/DashboardView";

export const metadata: Metadata = {
  title: "Dashboard",
};

export const revalidate = 0;

export default async function DashboardPage() {
  const transactions: Transaction[] = await sanityClient
    .fetch(TRANSACTIONS_QUERY, {}, { cache: "no-store" })
    .catch(() => []);

  return (
    <div className="flex flex-col gap-6 mb-16 scrollbar-hide">
      <DashboardView transactions={transactions} />
    </div>
  );
}
