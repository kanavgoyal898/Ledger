"use client";

import { useEffect, useState } from "react";
import type { Metadata } from "next";
import { CategoryManager } from "@/components/settings/CategoryManager";
import { AccountManager } from "@/components/settings/AccountManager";
import type { Settings, CategoryItem, AccountItem } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    _id: "singleton-settings",
    _type: "settings",
    categories: [],
    accounts: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setSettings(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function updateCategories(categories: CategoryItem[]) {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories }),
    });
    const updated = await res.json();
    setSettings(updated);
  }

  async function updateAccounts(accounts: AccountItem[]) {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accounts }),
    });
    const updated = await res.json();
    setSettings(updated);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure expense categories and payment accounts.
        </p>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading settings…</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <CategoryManager
            categories={settings.categories ?? []}
            onUpdate={updateCategories}
          />
          <AccountManager
            accounts={settings.accounts ?? []}
            onUpdate={updateAccounts}
          />
        </div>
      )}
    </div>
  );
}
