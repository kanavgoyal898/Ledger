import type { Metadata } from "next";
import TransactionsPageClient from "./TransactionsPageClient";

export const metadata: Metadata = {
  title: "Transactions",
};


export default function TransactionsPage() {
  return <TransactionsPageClient />;
}
