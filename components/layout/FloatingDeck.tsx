"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, List, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: List },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function FloatingDeck() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm sm:max-w-md sm:w-auto">
      <nav className="flex items-center justify-between sm:justify-center sm:gap-4 rounded-full bg-background/80 backdrop-blur-lg border p-1.5 sm:p-2">
        {navItems.map((item, index) => {
          const isActive = pathname === item.href;

          return (
            <div key={item.href} className="flex items-center sm:gap-1">
              {/* Insert Add Button before Settings (index 2) */}
              {index === 2 && (
                <div className="flex items-center justify-center px-1">
                  <Link
                    href="/transactions?new=1"
                    className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95"
                    title="Add Transaction"
                  >
                    <Plus className="h-6 w-6" />
                    <span className="sr-only">Add Transaction</span>
                  </Link>
                </div>
              )}

              <Link
                href={item.href}
                className={cn(
                  "flex h-10 w-10 sm:h-10 sm:w-auto sm:px-4 shrink-0 flex-col sm:flex-row items-center justify-center gap-1.5 rounded-full transition-colors",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
                title={item.label}
              >
                <item.icon className="h-4 w-4 sm:h-4 sm:w-4" />
                <span className="sr-only sm:not-sr-only sm:text-xs sm:font-medium">
                  {item.label}
                </span>
              </Link>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
