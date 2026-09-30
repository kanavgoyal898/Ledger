import Link from "next/link";
import { ArrowRight, Code2, Wallet } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const repository = "https://github.com/kanavgoyal898/Ledger";

export function LandingPage() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-background px-6 py-20 text-foreground">
      <ThemeToggle className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted" />
      <main className="w-full max-w-lg text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Ledger</h1>
        <p className="mt-4 text-xl tracking-tight">A clearer picture of your money.</p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          Track income, expenses, and investments, manage recurring payments, and understand your cash flow in one simple place.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            Sign in <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <a
            href={repository}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-6 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <Code2 className="size-4" aria-hidden="true" />
            GitHub repository
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </main>
    </div>
  );
}
