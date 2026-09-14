import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { sanityClient, sanityWriteClient } from "@/lib/sanity";
import { SETTINGS_QUERY } from "@/lib/types";
import type { CategoryItem, AccountItem, Settings } from "@/lib/types";

const SETTINGS_DOC_ID = "singleton-settings";

export async function GET() {
  try {
    const settings = await sanityClient.fetch(
      SETTINGS_QUERY,
      {},
      { next: { tags: ["settings"] } }
    );

    // Return empty settings if singleton doesn't exist yet
    if (!settings) {
      return NextResponse.json({
        _id: SETTINGS_DOC_ID,
        _type: "settings",
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

    // Sub-items have no _key — detect renames by positional diff
    const oldSubs = oldCat.subCategories ?? [];
    const newSubs = newCat.subCategories ?? [];
    for (let i = 0; i < Math.min(oldSubs.length, newSubs.length); i++) {
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
    for (let i = 0; i < Math.min(oldSubs.length, newSubs.length); i++) {
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
  categoryRenames,
  subCategoryRenames,
  accountRenames,
  subAccountRenames,
}: {
  categoryRenames: Map<string, string>;
  subCategoryRenames: Map<string, Map<string, string>>;
  accountRenames: Map<string, string>;
  subAccountRenames: Map<string, Map<string, string>>;
}) {
  // For each category rename, batch all patches into a single transaction commit
  for (const [oldLabel, newLabel] of categoryRenames) {
    const txs: { _id: string }[] = await sanityClient.fetch(
      `*[_type == "transaction" && category == $cat]{_id}`,
      { cat: oldLabel },
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
        `*[_type == "transaction" && category == $cat && subCategory == $sub]{_id}`,
        { cat: effectiveCatLabel, sub: oldSubLabel },
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
      `*[_type == "transaction" && account == $acc]{_id}`,
      { acc: oldLabel },
      { cache: "no-store" }
    );
    if (txs.length > 0) {
      const transaction = sanityWriteClient.transaction();
      for (const tx of txs) {
        transaction.patch(tx._id, (p) => p.set({ account: newLabel }));
      }
      await transaction.commit();
    }
  }

  // For each sub-account rename, batch all patches into a single transaction commit
  for (const [accLabel, subMap] of subAccountRenames) {
    const effectiveAccLabel = accLabel;
    for (const [oldSubLabel, newSubLabel] of subMap) {
      const txs: { _id: string }[] = await sanityClient.fetch(
        `*[_type == "transaction" && account == $acc && subAccount == $sub]{_id}`,
        { acc: effectiveAccLabel, sub: oldSubLabel },
        { cache: "no-store" }
      );
      if (txs.length > 0) {
        const transaction = sanityWriteClient.transaction();
        for (const tx of txs) {
          transaction.patch(tx._id, (p) => p.set({ subAccount: newSubLabel }));
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
    const body = await request.json();

    // Fetch current settings to diff for renames
    const currentSettings: Settings | null = await sanityClient.fetch(
      SETTINGS_QUERY,
      {},
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
    const existing = await sanityClient.fetch(
      `*[_type == "settings" && _id == "${SETTINGS_DOC_ID}"][0]._id`,
      {}
    );

    let savedSettings;
    if (existing) {
      savedSettings = await sanityWriteClient
        .patch(SETTINGS_DOC_ID)
        .set(body)
        .commit();
    } else {
      savedSettings = await sanityWriteClient.createOrReplace({
        _id: SETTINGS_DOC_ID,
        _type: "settings",
        ...body,
      });
    }

    // Cascade-rename transactions after settings are saved
    if (hasRenames) {
      await applyTransactionRenames({
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
