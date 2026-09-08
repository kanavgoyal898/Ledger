"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { CategoryItem } from "@/lib/types";

interface CategoryManagerProps {
  categories: CategoryItem[];
  onUpdate: (categories: CategoryItem[]) => Promise<void>;
}

interface EditState {
  label: string;
  description: string;
}

export function CategoryManager({ categories, onUpdate }: CategoryManagerProps) {
  const [items, setItems] = useState<CategoryItem[]>(categories);
  const [newLabel, setNewLabel] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [newSubMap, setNewSubMap] = useState<Record<string, { label: string; description: string }>>({});
  const [saving, setSaving] = useState(false);

  // Inline edit state: "cat:<key>" | "sub:<parentKey>:<subLabel>"
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ label: "", description: "" });

  async function save(updated: CategoryItem[]) {
    setSaving(true);
    try {
      await onUpdate(updated);
      setItems(updated);
    } finally {
      setSaving(false);
    }
  }

  // ── Category CRUD ──────────────────────────────────────────────────────────

  function addCategory() {
    const label = newLabel.trim();
    if (!label) return;

    const existingIndex = items.findIndex(c => c.label.toLowerCase() === label.toLowerCase());

    let updated;
    if (existingIndex >= 0) {
      if (!items[existingIndex].deleted) {
        setNewLabel("");
        setNewDesc("");
        return; // Already active
      }
      // Silently reverse soft-delete
      updated = [...items];
      updated[existingIndex] = { ...updated[existingIndex], deleted: false, description: newDesc.trim() || undefined };
    } else {
      updated = [
        ...items,
        { _key: crypto.randomUUID(), label, description: newDesc.trim() || undefined, deleted: false, subCategories: [] },
      ];
    }

    save(updated);
    setNewLabel("");
    setNewDesc("");
  }

  function removeCategory(key: string) {
    save(items.map((c) => c._key === key ? { ...c, deleted: true } : c));
  }

  function startEditCategory(cat: CategoryItem) {
    setEditingId(`cat:${cat._key}`);
    setEditState({ label: cat.label, description: cat.description ?? "" });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState({ label: "", description: "" });
  }

  function saveEditCategory(key: string) {
    const label = editState.label.trim();
    if (!label) return;
    const updated = items.map((c) =>
      c._key === key ? { ...c, label, description: editState.description.trim() || undefined } : c
    );
    save(updated);
    cancelEdit();
  }

  // ── SubCategory CRUD ───────────────────────────────────────────────────────

  function addSubCategory(parentKey: string) {
    const sub = newSubMap[parentKey];
    const subLabel = sub?.label?.trim();
    if (!subLabel) return;

    const updated = items.map((c) => {
      if (c._key === parentKey) {
        const existingSubs = c.subCategories ?? [];
        const existingIndex = existingSubs.findIndex(s => s.label.toLowerCase() === subLabel.toLowerCase());

        let newSubs;
        if (existingIndex >= 0) {
          if (!existingSubs[existingIndex].deleted) return c;
          // Silently reverse soft-delete
          newSubs = [...existingSubs];
          newSubs[existingIndex] = { ...newSubs[existingIndex], deleted: false, description: sub.description?.trim() || undefined };
        } else {
          newSubs = [...existingSubs, { label: subLabel, description: sub.description?.trim() || undefined, deleted: false }];
        }
        return { ...c, subCategories: newSubs };
      }
      return c;
    });

    save(updated);
    setNewSubMap((prev) => ({ ...prev, [parentKey]: { label: "", description: "" } }));
  }

  function removeSubCategory(parentKey: string, subLabel: string) {
    const updated = items.map((c) => {
      if (c._key === parentKey) {
        return {
          ...c,
          subCategories: (c.subCategories ?? []).map(s => s.label === subLabel ? { ...s, deleted: true } : s)
        };
      }
      return c;
    });
    save(updated);
  }

  function startEditSubCategory(parentKey: string, subLabel: string, subDesc: string | undefined) {
    setEditingId(`sub:${parentKey}:${subLabel}`);
    setEditState({ label: subLabel, description: subDesc ?? "" });
  }

  function saveEditSubCategory(parentKey: string, oldSubLabel: string) {
    const label = editState.label.trim();
    if (!label) return;
    const updated = items.map((c) => {
      if (c._key === parentKey) {
        return {
          ...c,
          subCategories: (c.subCategories ?? []).map(s =>
            s.label === oldSubLabel
              ? { ...s, label, description: editState.description.trim() || undefined }
              : s
          ),
        };
      }
      return c;
    });
    save(updated);
    cancelEdit();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const activeItems = items.filter(c => !c.deleted);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
        <CardDescription>
          Manage transaction categories and their sub-categories.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Add new category */}
        <div className="flex flex-col gap-2">
          <Input
            placeholder="New Category Name"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
          />
          <Textarea
            placeholder="Description (Optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <Button onClick={addCategory} disabled={saving || !newLabel.trim()} className="self-end">
            <Plus className="mr-1 h-4 w-4" />
            Add Category
          </Button>
        </div>

        <Separator />

        {activeItems.length === 0 && (
          <p className="text-sm text-muted-foreground">No Categories Yet.</p>
        )}

        <div className="flex flex-col gap-2">
          {activeItems.map((cat) => {
            const activeSubs = (cat.subCategories ?? []).filter(s => !s.deleted);
            const catEditId = `cat:${cat._key}`;
            const isEditingCat = editingId === catEditId;

            return (
              <div key={cat._key} className="rounded-md border">
                {/* Category row */}
                {isEditingCat ? (
                  <div className="flex flex-col gap-2 p-3">
                    <Input
                      value={editState.label}
                      onChange={(e) => setEditState(prev => ({ ...prev, label: e.target.value }))}
                      className="h-8 text-sm font-medium"
                      autoFocus
                    />
                    <Textarea
                      placeholder="Description (Optional)"
                      value={editState.description}
                      onChange={(e) => setEditState(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex gap-2 self-end">
                      <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => saveEditCategory(cat._key)} disabled={saving || !editState.label.trim()}>
                        <Check className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 p-3">
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-2 text-left text-sm font-medium"
                        onClick={() => setExpandedKey(expandedKey === cat._key ? null : cat._key)}
                      >
                        {expandedKey === cat._key ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span>{cat.label}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {activeSubs.length}
                        </span>
                      </button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => startEditCategory(cat)}
                        disabled={saving}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeCategory(cat._key)}
                        disabled={saving}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {cat.description && (
                      <p className="px-3 pb-2 text-xs text-muted-foreground">{cat.description}</p>
                    )}
                  </>
                )}

                {/* Sub-categories panel */}
                {!isEditingCat && expandedKey === cat._key && (
                  <div className="border-t bg-muted/30 px-4 py-3">
                    <div className="flex flex-col gap-2">
                      {activeSubs.map((sub) => {
                        const subEditId = `sub:${cat._key}:${sub.label}`;
                        const isEditingSub = editingId === subEditId;

                        return (
                          <div key={sub.label} className="rounded border bg-background">
                            {isEditingSub ? (
                              <div className="flex flex-col gap-2 p-2">
                                <Input
                                  value={editState.label}
                                  onChange={(e) => setEditState(prev => ({ ...prev, label: e.target.value }))}
                                  className="h-7 text-sm"
                                  autoFocus
                                />
                                <Textarea
                                  placeholder="Description (Optional)"
                                  value={editState.description}
                                  onChange={(e) => setEditState(prev => ({ ...prev, description: e.target.value }))}
                                  rows={2}
                                  className="text-sm"
                                />
                                <div className="flex gap-2 self-end">
                                  <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving} className="h-7 text-xs">
                                    <X className="h-3 w-3 mr-1" />
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => saveEditSubCategory(cat._key, sub.label)}
                                    disabled={saving || !editState.label.trim()}
                                    className="h-7 text-xs"
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Save
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2 p-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">{sub.label}</p>
                                  {sub.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{sub.description}</p>
                                  )}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    onClick={() => startEditSubCategory(cat._key, sub.label, sub.description)}
                                    disabled={saving}
                                    title="Edit"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                    onClick={() => removeSubCategory(cat._key, sub.label)}
                                    disabled={saving}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Add sub-category form */}
                      <div className="mt-1 flex flex-col gap-2 border-t pt-2">
                        <Input
                          placeholder="New Sub-Category Name"
                          value={newSubMap[cat._key]?.label ?? ""}
                          onChange={(e) =>
                            setNewSubMap((prev) => ({
                              ...prev,
                              [cat._key]: { ...prev[cat._key], label: e.target.value },
                            }))
                          }
                          onKeyDown={(e) => e.key === "Enter" && addSubCategory(cat._key)}
                          className="h-8 text-sm"
                        />
                        <Textarea
                          placeholder="Description (Optional)"
                          value={newSubMap[cat._key]?.description ?? ""}
                          onChange={(e) =>
                            setNewSubMap((prev) => ({
                              ...prev,
                              [cat._key]: { ...prev[cat._key], description: e.target.value },
                            }))
                          }
                          rows={2}
                          className="text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => addSubCategory(cat._key)}
                          disabled={saving || !newSubMap[cat._key]?.label?.trim()}
                          className="self-end"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Sub-Category
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
