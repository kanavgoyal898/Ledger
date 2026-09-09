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
    <div
      className={cn(
        "fixed z-50 flex flex-row items-center gap-3 will-change-transform",
        "inset-x-4 bottom-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))]",
        "sm:inset-x-auto sm:left-1/2 sm:w-auto sm:-translate-x-1/2",
      )}
    >
      {/* Navigation pill */}
      <nav className="flex flex-1 items-center justify-between gap-1 rounded-full bg-background/80 backdrop-blur-lg border shadow-lg p-1 sm:flex-none sm:justify-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 flex-1 flex-col items-center justify-center gap-1.5 rounded-full transition-colors sm:h-10 sm:w-auto sm:flex-none sm:flex-row sm:px-4",
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
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95"
        title="Add Transaction"
      >
        <Plus className="h-6 w-6" />
        <span className="sr-only">Add Transaction</span>
      </Link>
    </div>
  );
}
