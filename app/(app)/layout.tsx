import { FloatingDeck } from "@/components/layout/FloatingDeck";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cookies } from "next/headers";
import { getAuthenticatedUsername } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!getAuthenticatedUsername({ cookies: await cookies() })) return <>{children}</>;

  return (
    <TooltipProvider>
      <div className="flex min-h-dvh w-full flex-col bg-background">
        <div className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center bg-background/95 px-4 backdrop-blur-sm md:h-16 md:px-6">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-lg">Ledger</span>
            </div>
          </header>
          <main className="flex-1 p-4 pb-36 md:p-6 md:pb-36">
            {children}
          </main>
        </div>
        <FloatingDeck />
      </div>
    </TooltipProvider>
  );
}
