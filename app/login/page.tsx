import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to Ledger.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LoginForm />
      <p className="pb-6 text-center text-sm text-muted-foreground">
        Need a new account? Contact the administrator.
      </p>
    </div>
  );
}
