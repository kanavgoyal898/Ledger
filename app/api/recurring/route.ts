import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { revalidateTag } from "next/cache";
import { sanityClient, sanityWriteClient } from "@/lib/sanity";
import { dateKey, nextOccurrence } from "@/lib/recurrence";
import { recurringTransactionFormSchema } from "@/lib/types";
import { processAllRecurringTransactions, processRecurringTransaction } from "@/lib/recurring-server";
import { getAuthenticatedUsername } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const username = getAuthenticatedUsername(request);
    if (!username) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    // Fire-and-forget: process recurring rules after response is sent, don't block the page
    after(async () => {
      await processAllRecurringTransactions();
      revalidateTag("recurring", "max");
      revalidateTag("transactions", "max");
    });

    const rules = await sanityClient.fetch(`*[_type == "recurringTransaction" && username == $username] | order(active desc, nextOccurrence asc)`, { username }, { next: { tags: ["recurring"] } });
    return NextResponse.json(rules);
  } catch (error) {
    console.error("GET /api/recurring error:", error);
    return NextResponse.json({ error: "Failed to fetch recurring transactions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const username = getAuthenticatedUsername(request);
    if (!username) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const parsed = recurringTransactionFormSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const { startDate, endDate, frequency, ...fields } = parsed.data;
    const start = dateKey(startDate);
    const rule = await sanityWriteClient.create({
      _type: "recurringTransaction",
      username, ...fields, frequency, startDate: start,
      ...(endDate ? { endDate: dateKey(endDate) } : {}), active: true,
      nextOccurrence: nextOccurrence(start, frequency, start, endDate),
    });
    const processed = await processRecurringTransaction(rule as never);
    revalidateTag("recurring", "max");
    revalidateTag("transactions", "max");
    return NextResponse.json(processed, { status: 201 });
  } catch (error) {
    console.error("POST /api/recurring error:", error);
    return NextResponse.json({ error: "Failed to create recurring transaction" }, { status: 500 });
  }
}
