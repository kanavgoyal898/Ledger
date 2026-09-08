import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign In | Ledger",
  description: "Sign in to Ledger.",
};

export default function LoginPage() {
  return <LoginForm />;
}
