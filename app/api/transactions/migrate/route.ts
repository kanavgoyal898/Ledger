import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sanityClient, sanityWriteClient } from "@/lib/sanity";
import { getAuthenticatedUsername } from "@/lib/auth";

const DOC_TYPES_FILTER = `_type in ["transaction", "recurringTransaction"]`;

// ---------------------------------------------------------------------------
// GET — count affected documents.
//
// ?category=X                → breakdown of counts grouped by sub-category
//                                (including a "no sub-category" bucket)
// ?category=X&subCategory=Y  → single count for that exact category/sub pair
// ---------------------------------------------------------------------------

const getQuerySchema = z.object({
  category: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const username = getAuthenticatedUsername(request);
    if (!username) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const parsed = getQuerySchema.safeParse({ category: searchParams.get("category") ?? undefined });

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { category } = parsed.data;
    const subCategory = searchParams.get("subCategory");

    if (subCategory) {
      const filter = `${DOC_TYPES_FILTER} && username == $username && category == $category && subCategory == $subCategory`;
      const count = await sanityClient.fetch<number>(`count(*[${filter}])`, { username, category, subCategory }, { cache: "no-store" });
      return NextResponse.json({ count });
    }

    // Whole-category deletion — break the count down by sub-category so the
    // caller can require a distinct migration target for each one.
    const docs = await sanityClient.fetch<{ subCategory?: string }[]>(
      `*[${DOC_TYPES_FILTER} && username == $username && category == $category]{ subCategory }`,
      { username, category },
      { cache: "no-store" }
    );

    const counts = new Map<string | null, number>();
    for (const doc of docs) {
      const key = doc.subCategory ?? null;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const breakdown = [...counts.entries()]
      .map(([subCategory, count]) => ({ subCategory, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ total: docs.length, breakdown });
  } catch (error) {
    console.error("GET /api/transactions/migrate error:", error);
    return NextResponse.json({ error: "Failed to count affected transactions" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — batch-migrate one or more (category, sub-category) buckets to new
// targets, in a single request. Used both for a single sub-category deletion
// (array of length 1) and for a whole-category deletion where each populated
// sub-category needs its own target.
// ---------------------------------------------------------------------------

const migrationEntrySchema = z
  .object({
    fromCategory: z.string().min(1),
    fromSubCategory: z.string().optional(), // omitted = "no sub-category" bucket
    toCategory: z.string().min(1),
    toSubCategory: z.string().optional(),
  })
  .refine(
    (value) => value.fromCategory !== value.toCategory || (value.fromSubCategory ?? "") !== (value.toSubCategory ?? ""),
    { message: "Source and target must be different" }
  );

const migrateBodySchema = z.object({
  migrations: z.array(migrationEntrySchema).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const username = getAuthenticatedUsername(request);
    if (!username) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const parsed = migrateBodySchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    let migrated = 0;

    for (const entry of parsed.data.migrations) {
      const filter = entry.fromSubCategory
        ? `${DOC_TYPES_FILTER} && username == $username && category == $category && subCategory == $subCategory`
        : `${DOC_TYPES_FILTER} && username == $username && category == $category && !defined(subCategory)`;
      const params = entry.fromSubCategory
        ? { username, category: entry.fromCategory, subCategory: entry.fromSubCategory }
        : { username, category: entry.fromCategory };

      const count = await sanityClient.fetch<number>(`count(*[${filter}])`, params, { cache: "no-store" });
      if (count === 0) continue;

      const patch = sanityWriteClient.patch({ query: `*[${filter}]`, params });
      if (entry.toSubCategory) {
        await patch.set({ category: entry.toCategory, subCategory: entry.toSubCategory }).commit();
      } else {
        // No target sub-category chosen — clear it rather than carry over a
        // sub-category label that may not exist under the new category.
        await patch.set({ category: entry.toCategory }).unset(["subCategory"]).commit();
      }
      migrated += count;
    }

    return NextResponse.json({ migrated });
  } catch (error) {
    console.error("POST /api/transactions/migrate error:", error);
    return NextResponse.json({ error: "Failed to migrate transactions" }, { status: 500 });
  }
}
