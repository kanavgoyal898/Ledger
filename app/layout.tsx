import type { Metadata } from "next";
import "./globals.css";
import { FloatingDeck } from "@/components/layout/FloatingDeck";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "Ledger — Transaction Manager",
    template: "%s | Ledger",
  },
  description: "A simple personal transaction tracking application.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Load Google Sans from unofficial CDN or fallback to sans-serif */}
        <link href="https://fonts.cdnfonts.com/css/product-sans" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <TooltipProvider>
          <div className="flex flex-col h-screen overflow-hidden w-full max-w-4xl mx-auto bg-background relative sm:border-x">
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
        <Toaster />
      </body>
    </html>
  );
}
