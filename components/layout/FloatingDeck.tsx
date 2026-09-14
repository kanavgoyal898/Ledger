"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, List, Settings, Plus, UserCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
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
        "fixed z-50 pointer-events-none",
        "inset-x-4 bottom-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))]",
        "sm:inset-x-auto sm:left-1/2 sm:w-auto sm:-translate-x-1/2",
      )}
    >
      <div className="flex w-full flex-row items-center gap-3 will-change-transform animate-fade-up pointer-events-auto">
      {/* Light/Dark Mode Toggle */}
      <ThemeToggle className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-background/80 text-muted-foreground shadow-lg backdrop-blur-lg transition-all hover:bg-secondary/50 hover:text-foreground active:scale-95 sm:h-10 sm:w-10" />

      {/* Navigation pill */}
      <nav className="relative flex flex-1 items-center justify-between gap-1 rounded-full border bg-background/80 p-1 shadow-lg backdrop-blur-lg sm:flex-none sm:justify-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex h-11 flex-1 flex-col items-center justify-center gap-1.5 rounded-full transition-all duration-300 active:scale-95 sm:h-10 sm:w-auto sm:flex-none sm:flex-row sm:px-4",
                isActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
              )}
              title={item.label}
            >
              <item.icon className={cn("h-4 w-4 transition-transform duration-300", !isActive && "group-hover:scale-110")} />
              <span className="sr-only sm:not-sr-only sm:text-xs sm:font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Add Transaction FAB */}
      <Link
        href="/transactions?new=1"
        className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:bg-primary/90 hover:shadow-primary/25 hover:shadow-xl active:scale-95"
        title="Add Transaction"
      >
        <Plus className="h-6 w-6 transition-transform duration-300 group-hover:rotate-90" />
        <span className="sr-only">Add Transaction</span>
      </Link>
      </div>
    </div>
  );
}
