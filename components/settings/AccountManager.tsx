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
import type { AccountItem } from "@/lib/types";

interface AccountManagerProps {
  accounts: AccountItem[];
  onUpdate: (accounts: AccountItem[]) => Promise<void>;
}

interface EditState {
  label: string;
  description: string;
}

export function AccountManager({ accounts, onUpdate }: AccountManagerProps) {
  const [items, setItems] = useState<AccountItem[]>(accounts);
  const [newLabel, setNewLabel] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [newSubMap, setNewSubMap] = useState<Record<string, { label: string; description: string }>>({});
  const [saving, setSaving] = useState(false);

  // Inline edit state: "acc:<key>" | "sub:<parentKey>:<subLabel>"
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ label: "", description: "" });

  async function save(updated: AccountItem[]) {
    setSaving(true);
    try {
      await onUpdate(updated);
      setItems(updated);
    } finally {
      setSaving(false);
    }
  }

  // ── Account CRUD ───────────────────────────────────────────────────────────

  function addAccount() {
    const label = newLabel.trim();
    if (!label) return;

    const existingIndex = items.findIndex(a => a.label.toLowerCase() === label.toLowerCase());

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
        { _key: crypto.randomUUID(), label, description: newDesc.trim() || undefined, deleted: false, subAccounts: [] },
      ];
    }

    save(updated);
    setNewLabel("");
    setNewDesc("");
  }

  function removeAccount(key: string) {
    save(items.map((a) => a._key === key ? { ...a, deleted: true } : a));
  }

  function startEditAccount(acc: AccountItem) {
    setEditingId(`acc:${acc._key}`);
    setEditState({ label: acc.label, description: acc.description ?? "" });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState({ label: "", description: "" });
  }

  function saveEditAccount(key: string) {
    const label = editState.label.trim();
    if (!label) return;
    const updated = items.map((a) =>
      a._key === key ? { ...a, label, description: editState.description.trim() || undefined } : a
    );
    save(updated);
    cancelEdit();
  }

  // ── SubAccount CRUD ────────────────────────────────────────────────────────

  function addSubAccount(parentKey: string) {
    const sub = newSubMap[parentKey];
    const subLabel = sub?.label?.trim();
    if (!subLabel) return;

    const updated = items.map((a) => {
      if (a._key === parentKey) {
        const existingSubs = a.subAccounts ?? [];
        const existingIndex = existingSubs.findIndex(s => s.label.toLowerCase() === subLabel.toLowerCase());

        let newSubs;
        if (existingIndex >= 0) {
          if (!existingSubs[existingIndex].deleted) return a;
          // Silently reverse soft-delete
          newSubs = [...existingSubs];
          newSubs[existingIndex] = { ...newSubs[existingIndex], deleted: false, description: sub.description?.trim() || undefined };
        } else {
          newSubs = [...existingSubs, { label: subLabel, description: sub.description?.trim() || undefined, deleted: false }];
        }
        return { ...a, subAccounts: newSubs };
      }
      return a;
    });

    save(updated);
    setNewSubMap((prev) => ({ ...prev, [parentKey]: { label: "", description: "" } }));
  }

  function removeSubAccount(parentKey: string, subLabel: string) {
    const updated = items.map((a) => {
      if (a._key === parentKey) {
        return {
          ...a,
          subAccounts: (a.subAccounts ?? []).map(s => s.label === subLabel ? { ...s, deleted: true } : s)
        };
      }
      return a;
    });
    save(updated);
  }

  function startEditSubAccount(parentKey: string, subLabel: string, subDesc: string | undefined) {
    setEditingId(`sub:${parentKey}:${subLabel}`);
    setEditState({ label: subLabel, description: subDesc ?? "" });
  }

  function saveEditSubAccount(parentKey: string, oldSubLabel: string) {
    const label = editState.label.trim();
    if (!label) return;
    const updated = items.map((a) => {
      if (a._key === parentKey) {
        return {
          ...a,
          subAccounts: (a.subAccounts ?? []).map(s =>
            s.label === oldSubLabel
              ? { ...s, label, description: editState.description.trim() || undefined }
              : s
          ),
        };
      }
      return a;
    });
    save(updated);
    cancelEdit();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const activeItems = items.filter(a => !a.deleted);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts</CardTitle>
        <CardDescription>
          Manage payment accounts and their sub-accounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Add new account */}
        <div className="flex flex-col gap-2">
          <Input
            placeholder="New Account Name"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addAccount()}
          />
          <Textarea
            placeholder="Description (Optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <Button onClick={addAccount} disabled={saving || !newLabel.trim()} className="self-end">
            <Plus className="mr-1 h-4 w-4" />
            Add Account
          </Button>
        </div>

        <Separator />

        {activeItems.length === 0 && (
          <p className="text-sm text-muted-foreground">No Accounts Yet.</p>
        )}

        <div className="flex flex-col gap-2">
          {activeItems.map((acc) => {
            const activeSubs = (acc.subAccounts ?? []).filter(s => !s.deleted);
            const accEditId = `acc:${acc._key}`;
            const isEditingAcc = editingId === accEditId;

            return (
              <div key={acc._key} className="rounded-md border">
                {/* Account row */}
                {isEditingAcc ? (
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
                      <Button size="sm" onClick={() => saveEditAccount(acc._key)} disabled={saving || !editState.label.trim()}>
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
                        onClick={() => setExpandedKey(expandedKey === acc._key ? null : acc._key)}
                      >
                        {expandedKey === acc._key ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span>{acc.label}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {activeSubs.length}
                        </span>
                      </button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => startEditAccount(acc)}
                        disabled={saving}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeAccount(acc._key)}
                        disabled={saving}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {acc.description && (
                      <p className="px-3 pb-2 text-xs text-muted-foreground">{acc.description}</p>
                    )}
                  </>
                )}

                {/* Sub-accounts panel */}
                {!isEditingAcc && expandedKey === acc._key && (
                  <div className="border-t bg-muted/30 px-4 py-3">
                    <div className="flex flex-col gap-2">
                      {activeSubs.map((sub) => {
                        const subEditId = `sub:${acc._key}:${sub.label}`;
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
                                    onClick={() => saveEditSubAccount(acc._key, sub.label)}
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
                                    onClick={() => startEditSubAccount(acc._key, sub.label, sub.description)}
                                    disabled={saving}
                                    title="Edit"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                    onClick={() => removeSubAccount(acc._key, sub.label)}
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

                      {/* Add sub-account form */}
                      <div className="mt-1 flex flex-col gap-2 border-t pt-2">
                        <Input
                          placeholder="New Sub-Account Name"
                          value={newSubMap[acc._key]?.label ?? ""}
                          onChange={(e) =>
                            setNewSubMap((prev) => ({
                              ...prev,
                              [acc._key]: { ...prev[acc._key], label: e.target.value },
                            }))
                          }
                          onKeyDown={(e) => e.key === "Enter" && addSubAccount(acc._key)}
                          className="h-8 text-sm"
                        />
                        <Textarea
                          placeholder="Description (Optional)"
                          value={newSubMap[acc._key]?.description ?? ""}
                          onChange={(e) =>
                            setNewSubMap((prev) => ({
                              ...prev,
                              [acc._key]: { ...prev[acc._key], description: e.target.value },
                            }))
                          }
                          rows={2}
                          className="text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => addSubAccount(acc._key)}
                          disabled={saving || !newSubMap[acc._key]?.label?.trim()}
                          className="self-end"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Sub-Account
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
