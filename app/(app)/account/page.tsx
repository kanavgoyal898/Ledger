import type { Metadata } from "next";
import { AccountPage } from "@/components/auth/AccountPage";

export const metadata: Metadata = {
  title: "Account",
};

export default function AccountRoute() {
  return <AccountPage />;
}
