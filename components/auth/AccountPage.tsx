"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  LogOut,
  Mail,
  Phone,
  Tag,
  ExternalLink,
  KeyRound,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { PasscodeInput } from "@/components/auth/PasscodeInput";
import type { TokenReset } from "@/lib/types";

interface UserProfile {
  firstName: string;
  lastName?: string;
  username: string;
  profilePicture?: string;
  mobileNumber?: string;
  email?: string;
  tokenReset: string;
}

type ProfileDraft = Pick<
  UserProfile,
  "firstName" | "lastName" | "username" | "mobileNumber" | "email" | "tokenReset"
>;

const tokenResetLabels: Record<string, string> = {
  "1_day": "1 Day",
  "1_week": "1 Week",
  "1_month": "1 Month",
  "1_year": "1 Year",
  "never": "Never",
};

export function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetForm, setResetForm] = useState({
    currentPasscode: "",
    newPasscode: "",
    confirmPasscode: "",
  });
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setUser(data);
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  const startEditing = () => {
    if (!user) return;
    setDraft({
      firstName: user.firstName,
      lastName: user.lastName ?? "",
      username: user.username,
      mobileNumber: user.mobileNumber ?? "",
      email: user.email ?? "",
      tokenReset: user.tokenReset,
    });
    setFormError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraft(null);
    setFormError(null);
    setEditing(false);
  };

  const updateDraft = (field: keyof ProfileDraft, value: string) => {
    setDraft((current) => current ? { ...current, [field]: value } : current);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;

    setSaving(true);
    setFormError(null);
    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (!response.ok) {
        setFormError(data.error ?? "Could not update profile.");
        return;
      }
      setUser(data);
      setDraft(null);
      setEditing(false);
      router.refresh();
    } catch {
      setFormError("Could not update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPasscode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetSaving(true);
    setResetError(null);
    setResetSuccess(null);

    try {
      const response = await fetch("/api/auth/reset-passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resetForm),
      });
      const data = await response.json();

      if (!response.ok) {
        setResetError(data.error ?? "Could not reset passcode.");
        return;
      }

      setResetForm({ currentPasscode: "", newPasscode: "", confirmPasscode: "" });
      setResetSuccess("Passcode updated successfully.");
    } catch {
      setResetError("Could not reset passcode. Please try again.");
    } finally {
      setResetSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center h-48 text-destructive text-sm">
        {error ?? "Could not load profile."}
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account</h1>
      </div>

      {/* Avatar + name */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex items-center gap-4"
        >
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-secondary bg-cover bg-center text-secondary-foreground"
          style={user.profilePicture ? { backgroundImage: `url(${user.profilePicture})` } : undefined}
          aria-label={user.profilePicture ? `${user.firstName}'s profile picture` : undefined}
          >
            {!user.profilePicture && <User className="h-8 w-8" />}
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {user.firstName}
              {user.lastName ? ` ${user.lastName}` : ""}
            </h2>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
          {!editing && (
            <button
              onClick={startEditing}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted sm:w-auto"
            >
              <Pencil className="h-4 w-4" />
              Edit details
            </button>
          )}
          <Link
            href="/studio"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted sm:w-auto"
          >
            <ExternalLink className="h-4 w-4" />
            Open Sanity Studio
          </Link>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50 sm:w-auto"
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>

      {editing && draft ? (
        <form onSubmit={handleSave} className="w-full space-y-5 rounded-xl border bg-card p-4 md:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">
              First Name
              <Input value={draft.firstName} onChange={(event) => updateDraft("firstName", event.target.value)} required />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Last Name
              <Input value={draft.lastName} onChange={(event) => updateDraft("lastName", event.target.value)} />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Username
              <Input value={draft.username} onChange={(event) => updateDraft("username", event.target.value)} required />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Mobile
              <Input value={draft.mobileNumber} onChange={(event) => updateDraft("mobileNumber", event.target.value)} />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Email
              <Input type="email" value={draft.email} onChange={(event) => updateDraft("email", event.target.value)} />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Token Reset
              <select
                value={draft.tokenReset}
                onChange={(event) => updateDraft("tokenReset", event.target.value as TokenReset)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {Object.entries(tokenResetLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>

          {formError && <p className="text-sm text-destructive" role="alert">{formError}</p>}

          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={cancelEditing} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50">
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      ) : (
      /* Details card */
      <div className="w-full overflow-x-auto rounded-xl border bg-card text-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <User className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground w-28 shrink-0">First Name</span>
          <span className="font-medium">{user.firstName}</span>
        </div>

        <div className="flex items-center gap-3 px-4 py-3">
          <User className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground w-28 shrink-0">Last Name</span>
          <span className="font-medium">{user.lastName || "-"}</span>
        </div>

        <div className="flex items-center gap-3 px-4 py-3">
          <User className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground w-28 shrink-0">Username</span>
          <span className="font-medium">{user.username}</span>
        </div>

        <div className="flex items-center gap-3 px-4 py-3">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground w-28 shrink-0">Email</span>
          <span className="font-medium break-all">{user.email || "-"}</span>
        </div>

        <div className="flex items-center gap-3 px-4 py-3">
          <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground w-28 shrink-0">Mobile</span>
          <span className="font-medium">{user.mobileNumber || "-"}</span>
        </div>

        <div className="flex items-center gap-3 px-4 py-3">
          <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground w-28 shrink-0">Session expires</span>
          <span className="font-medium">
            {tokenResetLabels[user.tokenReset] ?? user.tokenReset}
          </span>
        </div>
      </div>
      )}

      <section className="w-full space-y-5 rounded-xl border bg-card p-4 md:p-6">
        <div className="flex items-start gap-3">
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <h2 className="font-semibold">Reset passcode</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a new six-digit passcode for your next sign in.
            </p>
          </div>
        </div>

        <form onSubmit={handleResetPasscode} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:items-center sm:gap-3">
            <span>Current passcode</span>
            <div className="w-full sm:w-64 sm:justify-self-end">
              <PasscodeInput
                value={resetForm.currentPasscode}
                onChange={(value) => setResetForm((current) => ({ ...current, currentPasscode: value }))}
                disabled={resetSaving}
              />
            </div>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:items-center sm:gap-3">
            <span>New passcode</span>
            <div className="w-full sm:w-64 sm:justify-self-end">
              <PasscodeInput
                value={resetForm.newPasscode}
                onChange={(value) => setResetForm((current) => ({ ...current, newPasscode: value }))}
                disabled={resetSaving}
              />
            </div>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:items-center sm:gap-3">
            <span>Confirm new passcode</span>
            <div className="w-full sm:w-64 sm:justify-self-end">
              <PasscodeInput
                value={resetForm.confirmPasscode}
                onChange={(value) => setResetForm((current) => ({ ...current, confirmPasscode: value }))}
                disabled={resetSaving}
              />
            </div>
          </label>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {resetError && <p className="mr-auto text-sm text-destructive" role="alert">{resetError}</p>}
            {resetSuccess && <p className="mr-auto text-sm text-emerald-600" role="status">{resetSuccess}</p>}
            <button
              type="submit"
              disabled={resetSaving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
            >
              <KeyRound className="h-4 w-4" />
              {resetSaving ? "Updating…" : "Update passcode"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
