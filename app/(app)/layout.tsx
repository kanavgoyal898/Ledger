import { FloatingDeck } from "@/components/layout/FloatingDeck";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen overflow-hidden w-full max-w-4xl mx-auto bg-background relative">
        <header className="flex h-14 shrink-0 items-center px-4 border-b md:h-16 md:px-6">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-lg">Ledger</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-28">
          {children}
        </main>
        <FloatingDeck />
      </div>
    </TooltipProvider>
  );
}
