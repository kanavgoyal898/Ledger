"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, List, Settings, Plus, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: List },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/account", label: "Account", icon: UserCircle },
];

export function FloatingDeck() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-row items-center gap-3">
      {/* Navigation pill */}
      <nav className="flex items-center justify-between sm:justify-center sm:gap-1 rounded-full bg-background/80 backdrop-blur-lg border shadow-lg p-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
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
          );
        })}
      </nav>

      {/* Add Transaction FAB — sits to the right of the nav pill */}
      <Link
        href="/transactions?new=1"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95"
        title="Add Transaction"
      >
        <Plus className="h-6 w-6" />
        <span className="sr-only">Add Transaction</span>
      </Link>
    </div>
  );
}
