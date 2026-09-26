import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { sanityClient, sanityWriteClient } from "@/lib/sanity";
import { TRANSFER_BY_ID_QUERY, transferBaseSchema } from "@/lib/types";
import { getAuthenticatedUsername } from "@/lib/auth";

interface Params { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const username = getAuthenticatedUsername(request);
    if (!username) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { id } = await params;
    const transfer = await sanityClient.fetch(TRANSFER_BY_ID_QUERY, { id, username }, { next: { tags: ["transfers"] } });
    if (!transfer) return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    return NextResponse.json(transfer);
  } catch (error) {
    console.error("GET /api/transfers/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch transfer" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const username = getAuthenticatedUsername(request);
    if (!username) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { id } = await params;
    const owned = await sanityClient.fetch(`*[_type == "transfer" && _id == $id && username == $username][0]._id`, { id, username }, { cache: "no-store" });
    if (!owned) return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    const parsed = transferBaseSchema.partial().safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const patch = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));
    const updated = await sanityWriteClient.patch(id).set(patch).commit();
    revalidateTag("transfers", "max");
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/transfers/[id] error:", error);
    return NextResponse.json({ error: "Failed to update transfer" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const username = getAuthenticatedUsername(request);
    if (!username) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { id } = await params;
    const owned = await sanityClient.fetch(`*[_type == "transfer" && _id == $id && username == $username][0]._id`, { id, username }, { cache: "no-store" });
    if (!owned) return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    await sanityWriteClient.delete(id);
    revalidateTag("transfers", "max");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/transfers/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete transfer" }, { status: 500 });
  }
}
