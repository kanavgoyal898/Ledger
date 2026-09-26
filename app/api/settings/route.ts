import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { sanityClient, sanityWriteClient } from "@/lib/sanity";
import { SETTINGS_QUERY } from "@/lib/types";
import type { CategoryItem, AccountItem, Settings } from "@/lib/types";
import { getAuthenticatedUsername } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const username = getAuthenticatedUsername(request);
    if (!username) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const settings = await sanityClient.fetch(
      SETTINGS_QUERY,
      { username },
      { next: { tags: ["settings"] } }
    );

    // Return empty settings if singleton doesn't exist yet
    if (!settings) {
      return NextResponse.json({
        _id: "new-settings",
        _type: "settings",
        username,
        categories: [],
        accounts: [],
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers: build label-rename maps from old → new settings
// ---------------------------------------------------------------------------

function buildCategoryRenameMap(
  oldSettings: Settings | null,
  newCategories: CategoryItem[]
): Map<string, string> {
  const renames = new Map<string, string>();
  const oldCategories = oldSettings?.categories ?? [];

  for (const newCat of newCategories) {
    const oldCat = oldCategories.find((c) => c._key === newCat._key);
    if (oldCat && oldCat.label !== newCat.label) {
      renames.set(oldCat.label, newCat.label);
    }
  }
  return renames;
}

function buildSubCategoryRenameMap(
  oldSettings: Settings | null,
  newCategories: CategoryItem[]
): Map<string, Map<string, string>> {
  // Map: categoryLabel → (oldSubLabel → newSubLabel)
  const renames = new Map<string, Map<string, string>>();
  const oldCategories = oldSettings?.categories ?? [];

  for (const newCat of newCategories) {
    const oldCat = oldCategories.find((c) => c._key === newCat._key);
    if (!oldCat) continue;

    // Use the new category label as the key (post-rename)
    const catLabel = newCat.label;
    const subRenames = new Map<string, string>();

    // Deletion shifts positions; only compare positions for edits of equal-length lists.
    const oldSubs = oldCat.subCategories ?? [];
    const newSubs = newCat.subCategories ?? [];
    if (oldSubs.length !== newSubs.length) continue;
    for (let i = 0; i < oldSubs.length; i++) {
      if (oldSubs[i].label !== newSubs[i].label) {
        subRenames.set(oldSubs[i].label, newSubs[i].label);
      }
    }

    if (subRenames.size > 0) {
      renames.set(catLabel, subRenames);
    }
  }
  return renames;
}

function buildAccountRenameMap(
  oldSettings: Settings | null,
  newAccounts: AccountItem[]
): Map<string, string> {
  const renames = new Map<string, string>();
  const oldAccounts = oldSettings?.accounts ?? [];

  for (const newAcc of newAccounts) {
    const oldAcc = oldAccounts.find((a) => a._key === newAcc._key);
    if (oldAcc && oldAcc.label !== newAcc.label) {
      renames.set(oldAcc.label, newAcc.label);
    }
  }
  return renames;
}

function buildSubAccountRenameMap(
  oldSettings: Settings | null,
  newAccounts: AccountItem[]
): Map<string, Map<string, string>> {
  const renames = new Map<string, Map<string, string>>();
  const oldAccounts = oldSettings?.accounts ?? [];

  for (const newAcc of newAccounts) {
    const oldAcc = oldAccounts.find((a) => a._key === newAcc._key);
    if (!oldAcc) continue;

    const accLabel = newAcc.label;
    const subRenames = new Map<string, string>();

    const oldSubs = oldAcc.subAccounts ?? [];
    const newSubs = newAcc.subAccounts ?? [];
    if (oldSubs.length !== newSubs.length) continue;
    for (let i = 0; i < oldSubs.length; i++) {
      if (oldSubs[i].label !== newSubs[i].label) {
        subRenames.set(oldSubs[i].label, newSubs[i].label);
      }
    }

    if (subRenames.size > 0) {
      renames.set(accLabel, subRenames);
    }
  }
  return renames;
}

// ---------------------------------------------------------------------------
// Apply renames to all affected transactions
// ---------------------------------------------------------------------------

async function applyTransactionRenames({
  username,
  categoryRenames,
  subCategoryRenames,
  accountRenames,
  subAccountRenames,
}: {
  username: string;
  categoryRenames: Map<string, string>;
  subCategoryRenames: Map<string, Map<string, string>>;
  accountRenames: Map<string, string>;
  subAccountRenames: Map<string, Map<string, string>>;
}) {
  // For each category rename, batch all patches into a single transaction commit
  for (const [oldLabel, newLabel] of categoryRenames) {
    const txs: { _id: string }[] = await sanityClient.fetch(
      `*[_type in ["transaction", "recurringTransaction"] && username == $username && category == $cat]{_id}`,
      { username, cat: oldLabel },
      { cache: "no-store" }
    );
    if (txs.length > 0) {
      const transaction = sanityWriteClient.transaction();
      for (const tx of txs) {
        transaction.patch(tx._id, (p) => p.set({ category: newLabel }));
      }
      await transaction.commit();
    }
  }

  // For each sub-category rename, batch all patches into a single transaction commit
  for (const [catLabel, subMap] of subCategoryRenames) {
    const effectiveCatLabel = catLabel;
    for (const [oldSubLabel, newSubLabel] of subMap) {
      const txs: { _id: string }[] = await sanityClient.fetch(
        `*[_type in ["transaction", "recurringTransaction"] && username == $username && category == $cat && subCategory == $sub]{_id}`,
        { username, cat: effectiveCatLabel, sub: oldSubLabel },
        { cache: "no-store" }
      );
      if (txs.length > 0) {
        const transaction = sanityWriteClient.transaction();
        for (const tx of txs) {
          transaction.patch(tx._id, (p) => p.set({ subCategory: newSubLabel }));
        }
        await transaction.commit();
      }
    }
  }

  // For each account rename, batch all patches into a single transaction commit
  for (const [oldLabel, newLabel] of accountRenames) {
    const txs: { _id: string }[] = await sanityClient.fetch(
      `*[_type in ["transaction", "recurringTransaction"] && username == $username && account == $acc]{_id}`,
      { username, acc: oldLabel },
      { cache: "no-store" }
    );
    if (txs.length > 0) {
      const transaction = sanityWriteClient.transaction();
      for (const tx of txs) {
        transaction.patch(tx._id, (p) => p.set({ account: newLabel }));
      }
      await transaction.commit();
    }

    const transfers: { _id: string; fromAccount: string; toAccount: string }[] = await sanityClient.fetch(
      `*[_type == "transfer" && username == $username && (fromAccount == $acc || toAccount == $acc)]{_id, fromAccount, toAccount}`,
      { username, acc: oldLabel },
      { cache: "no-store" }
    );
    if (transfers.length > 0) {
      const transaction = sanityWriteClient.transaction();
      for (const transfer of transfers) {
        transaction.patch(transfer._id, (patch) => patch.set({
          ...(transfer.fromAccount === oldLabel ? { fromAccount: newLabel } : {}),
          ...(transfer.toAccount === oldLabel ? { toAccount: newLabel } : {}),
        }));
      }
      await transaction.commit();
    }
  }

  // For each sub-account rename, batch all patches into a single transaction commit
  for (const [accLabel, subMap] of subAccountRenames) {
    const effectiveAccLabel = accLabel;
    for (const [oldSubLabel, newSubLabel] of subMap) {
      const txs: { _id: string }[] = await sanityClient.fetch(
        `*[_type in ["transaction", "recurringTransaction"] && username == $username && account == $acc && subAccount == $sub]{_id}`,
        { username, acc: effectiveAccLabel, sub: oldSubLabel },
        { cache: "no-store" }
      );
      if (txs.length > 0) {
        const transaction = sanityWriteClient.transaction();
        for (const tx of txs) {
          transaction.patch(tx._id, (p) => p.set({ subAccount: newSubLabel }));
        }
        await transaction.commit();
      }

      const transfers: { _id: string; fromAccount: string; fromSubAccount?: string; toAccount: string; toSubAccount?: string }[] = await sanityClient.fetch(
        `*[_type == "transfer" && username == $username && ((fromAccount == $acc && fromSubAccount == $sub) || (toAccount == $acc && toSubAccount == $sub))]{_id, fromAccount, fromSubAccount, toAccount, toSubAccount}`,
        { username, acc: effectiveAccLabel, sub: oldSubLabel },
        { cache: "no-store" }
      );
      if (transfers.length > 0) {
        const transaction = sanityWriteClient.transaction();
        for (const transfer of transfers) {
          transaction.patch(transfer._id, (patch) => patch.set({
            ...(transfer.fromAccount === effectiveAccLabel && transfer.fromSubAccount === oldSubLabel ? { fromSubAccount: newSubLabel } : {}),
            ...(transfer.toAccount === effectiveAccLabel && transfer.toSubAccount === oldSubLabel ? { toSubAccount: newSubLabel } : {}),
          }));
        }
        await transaction.commit();
      }
    }
  }
}

// ---------------------------------------------------------------------------
// PATCH handler
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  try {
    const username = getAuthenticatedUsername(request);
    if (!username) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const body = await request.json();

    // Fetch current settings to diff for renames
    const currentSettings: Settings | null = await sanityClient.fetch(
      SETTINGS_QUERY,
      { username },
      { cache: "no-store" }
    );

    // Build rename maps before saving
    const newCategories: CategoryItem[] = body.categories ?? currentSettings?.categories ?? [];
    const newAccounts: AccountItem[] = body.accounts ?? currentSettings?.accounts ?? [];

    const categoryRenames = buildCategoryRenameMap(currentSettings, newCategories);
    const subCategoryRenames = buildSubCategoryRenameMap(currentSettings, newCategories);
    const accountRenames = buildAccountRenameMap(currentSettings, newAccounts);
    const subAccountRenames = buildSubAccountRenameMap(currentSettings, newAccounts);

    const hasRenames =
      categoryRenames.size > 0 ||
      subCategoryRenames.size > 0 ||
      accountRenames.size > 0 ||
      subAccountRenames.size > 0;

    // Save settings document
    let savedSettings;
    const settingsPatch = { categories: newCategories, accounts: newAccounts };
    if (currentSettings) {
      savedSettings = await sanityWriteClient
        .patch(currentSettings._id)
        .set(settingsPatch)
        .commit();
    } else {
      savedSettings = await sanityWriteClient.create({
        _type: "settings",
        username,
        ...settingsPatch,
      });
    }

    // Cascade-rename transactions after settings are saved
    if (hasRenames) {
      await applyTransactionRenames({
        username,
        categoryRenames,
        subCategoryRenames,
        accountRenames,
        subAccountRenames,
      });
    }

    revalidateTag("settings", "max");
    revalidateTag("transactions", "max");
    return NextResponse.json(savedSettings);
  } catch (error) {
    console.error("PATCH /api/settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
