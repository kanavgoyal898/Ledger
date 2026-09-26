import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { sanityClient, sanityWriteClient } from "@/lib/sanity";
import { TRANSFERS_QUERY, transferFormSchema } from "@/lib/types";
import { getAuthenticatedUsername } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const username = getAuthenticatedUsername(request);
    if (!username) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const transfers = await sanityClient.fetch(TRANSFERS_QUERY, { username }, { next: { tags: ["transfers"] } });
    return NextResponse.json(transfers);
  } catch (error) {
    console.error("GET /api/transfers error:", error);
    return NextResponse.json({ error: "Failed to fetch transfers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const username = getAuthenticatedUsername(request);
    if (!username) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const parsed = transferFormSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const { date, amount, fromAccount, fromSubAccount, toAccount, toSubAccount, heading, description } = parsed.data;
    const doc = await sanityWriteClient.create({
      _type: "transfer",
      username,
      date,
      amount,
      fromAccount,
      ...(fromSubAccount ? { fromSubAccount } : {}),
      toAccount,
      ...(toSubAccount ? { toSubAccount } : {}),
      ...(heading ? { heading } : {}),
      ...(description ? { description } : {}),
    });
    revalidateTag("transfers", "max");
    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error("POST /api/transfers error:", error);
    return NextResponse.json({ error: "Failed to create transfer" }, { status: 500 });
  }
}
