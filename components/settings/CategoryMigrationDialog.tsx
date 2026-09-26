"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NameColor } from "@/components/ui/name-color";
import type { CategoryItem } from "@/lib/types";

interface CategoryMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryItem[];
  from: { category: string; subCategory?: string } | null;
  onDelete: () => Promise<void>;
}

interface MigrationGroup {
  key: string;
  /** undefined = the "no sub-category" bucket */
  sourceSubCategory?: string;
  label: string;
  count: number;
  toCategory: string;
  toSubCategory: string;
}

const NO_SUB_CATEGORY_LABEL = "No Sub-Category";

export function CategoryMigrationDialog({
  open,
  onOpenChange,
  categories,
  from,
  onDelete,
}: CategoryMigrationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<MigrationGroup[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isWholeCategoryDeletion = Boolean(from) && !from!.subCategory;

  useEffect(() => {
    if (!open || !from) return;
    setGroups([]);
    setError(null);
    setLoading(true);

    async function load() {
      if (from!.subCategory) {
        // Deleting a single sub-category — one group.
        const params = new URLSearchParams({ category: from!.category, subCategory: from!.subCategory });
        const res = await fetch(`/api/transactions/migrate?${params}`);
        const data = await res.json();
        const count = typeof data.count === "number" ? data.count : 0;
        setGroups(
          count > 0
            ? [
                {
                  key: from!.subCategory!,
                  sourceSubCategory: from!.subCategory,
                  label: from!.subCategory!,
                  count,
                  toCategory: "",
                  toSubCategory: "",
                },
              ]
            : []
        );
        return;
      }

      // Deleting the whole category — one group per populated sub-category.
      const params = new URLSearchParams({ category: from!.category });
      const res = await fetch(`/api/transactions/migrate?${params}`);
      const data: { total: number; breakdown: { subCategory: string | null; count: number }[] } = await res.json();
      setGroups(
        (data.breakdown ?? []).map((entry) => ({
          key: entry.subCategory ?? "__none__",
          sourceSubCategory: entry.subCategory ?? undefined,
          label: entry.subCategory ?? NO_SUB_CATEGORY_LABEL,
          count: entry.count,
          toCategory: "",
          toSubCategory: "",
        }))
      );
    }

    load()
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [open, from]);

  if (!from) return null;

  const fromLabel = from.subCategory ? `${from.category} / ${from.subCategory}` : from.category;
  const needsMigration = groups.length > 0;
  const totalCount = groups.reduce((sum, g) => sum + g.count, 0);

  function updateGroupCategory(key: string, toCategory: string) {
    setGroups((prev) => prev.map((g) => (g.key === key ? { ...g, toCategory, toSubCategory: "" } : g)));
  }

  function updateGroupSubCategory(key: string, toSubCategory: string) {
    setGroups((prev) => prev.map((g) => (g.key === key ? { ...g, toSubCategory } : g)));
  }

  function groupIsNoop(group: MigrationGroup) {
    return group.toCategory === from!.category && (group.toSubCategory || undefined) === (group.sourceSubCategory || undefined);
  }

  const canConfirm = !needsMigration || groups.every((g) => g.toCategory && !groupIsNoop(g));

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      if (needsMigration) {
        const res = await fetch("/api/transactions/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            migrations: groups.map((g) => ({
              fromCategory: from!.category,
              fromSubCategory: g.sourceSubCategory,
              toCategory: g.toCategory,
              toSubCategory: g.toSubCategory || undefined,
            })),
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Migration failed");
        }
      }
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="w-[95vw] max-w-lg overflow-hidden p-0 sm:w-full">
        <div className="flex max-h-[85vh] flex-col">
          <DialogHeader className="px-4 pt-6 pb-2 sm:px-6">
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Delete {isWholeCategoryDeletion ? "Category" : "Sub-Category"}
            </DialogTitle>
            <DialogDescription>
              {loading
                ? "Checking for transactions that use this category…"
                : !needsMigration
                  ? `No transactions currently use "${fromLabel}". It can be safely deleted.`
                  : isWholeCategoryDeletion
                    ? `${totalCount} transaction${totalCount === 1 ? "" : "s"} across ${groups.length} sub-categor${groups.length === 1 ? "y" : "ies"} currently use "${fromLabel}". Choose where to move each before deleting.`
                    : `${totalCount} transaction${totalCount === 1 ? "" : "s"} currently use "${fromLabel}". Choose where to move them before deleting.`}
            </DialogDescription>
          </DialogHeader>

          {!loading && needsMigration && (
            <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-2 sm:px-6">
              {groups.map((group) => {
                const targetCategoryOptions = categories.filter((c) => {
                  // If the source category is being deleted outright, it can't be a target.
                  if (isWholeCategoryDeletion && c.label === from.category) return false;
                  return true;
                })
                .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));

                const selectedTargetCategory = categories.find((c) => c.label === group.toCategory);
                const targetSubCategoryOptions = (selectedTargetCategory?.subCategories ?? []).filter((s) => {
                  if (!isWholeCategoryDeletion && group.toCategory === from.category && s.label === group.sourceSubCategory) return false;
                  return true;
                })
                .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));

                const noop = groupIsNoop(group);

                return (
                  <div key={group.key} className="flex flex-col gap-2 rounded-md border p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <NameColor name={group.label === NO_SUB_CATEGORY_LABEL ? from.category : group.label} />
                      <span className="min-w-0 truncate font-medium">{group.label}</span>
                      <Badge variant="secondary" className="ml-auto shrink-0">
                        {group.count} transaction{group.count === 1 ? "" : "s"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Migrate to</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <Select
                        value={group.toCategory}
                        onValueChange={(value) => value && updateGroupCategory(group.key, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Category">
                            {group.toCategory && (
                              <span className="flex items-center gap-2">
                                <NameColor name={group.toCategory} />
                                {group.toCategory}
                              </span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent align="start" alignItemWithTrigger={false} className="p-1 lg:p-2">
                          {targetCategoryOptions.map((c) => (
                            <SelectItem key={c._key} value={c.label}>
                              <NameColor name={c.label} />
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={group.toSubCategory}
                        onValueChange={(value) => updateGroupSubCategory(group.key, value ?? "")}
                        disabled={!group.toCategory || targetSubCategoryOptions.length === 0}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="No Sub-Category">
                            {group.toSubCategory && (
                              <span className="flex items-center gap-2">
                                <NameColor name={group.toSubCategory} />
                                {group.toSubCategory}
                              </span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent align="start" alignItemWithTrigger={false} className="p-1 lg:p-2">
                          {targetSubCategoryOptions.map((s) => (
                            <SelectItem key={s.label} value={s.label}>
                              <NameColor name={s.label} />
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {noop && (
                      <p className="text-xs text-destructive">Choose a different category or sub-category to migrate to.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <p className="px-4 text-sm text-destructive sm:px-6" role="alert">
              {error}
            </p>
          )}

          <DialogFooter className="px-4 pb-6 sm:px-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirm}
              disabled={busy || loading || !canConfirm}
            >
              {busy ? "Deleting…" : needsMigration ? "Migrate & Delete" : "Delete"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}