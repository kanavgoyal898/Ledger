import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { sanityClient, sanityWriteClient } from "@/lib/sanity";
import { TRANSACTION_BY_ID_QUERY, transactionFormSchema } from "@/lib/types";
import { getAuthenticatedUsername } from "@/lib/auth";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const username = getAuthenticatedUsername(request);
    if (!username) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { id } = await params;
    const transaction = await sanityClient.fetch(
      TRANSACTION_BY_ID_QUERY,
      { id, username },
      { next: { tags: ["transactions"] } }
    );

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("GET /api/transactions/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const username = getAuthenticatedUsername(request);
    if (!username) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { id } = await params;
    const owned = await sanityClient.fetch(`*[_type == "transaction" && _id == $id && username == $username][0]._id`, { id, username }, { cache: "no-store" });
    if (!owned) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    const body = await request.json();
    const parsed = transactionFormSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Filter out undefined values before patching
    const patch = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined)
    );

    const updated = await sanityWriteClient
      .patch(id)
      .set(patch)
      .commit();

    revalidateTag("transactions", "max");
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/transactions/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const username = getAuthenticatedUsername(request);
    if (!username) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { id } = await params;
    const owned = await sanityClient.fetch(`*[_type == "transaction" && _id == $id && username == $username][0]._id`, { id, username }, { cache: "no-store" });
    if (!owned) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    await sanityWriteClient.delete(id);
    revalidateTag("transactions", "max");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/transactions/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}
