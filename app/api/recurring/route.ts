import { NextRequest, NextResponse } from "next/server";
import { sanityClient, sanityWriteClient } from "@/lib/sanity";
import { dateKey, nextOccurrence } from "@/lib/recurrence";
import { recurringTransactionFormSchema } from "@/lib/types";
import { processAllRecurringTransactions, processRecurringTransaction } from "@/lib/recurring-server";

export async function GET() {
  try {
    await processAllRecurringTransactions();
    const rules = await sanityClient.fetch(`*[_type == "recurringTransaction"] | order(active desc, nextOccurrence asc)` , {}, { cache: "no-store" });
    return NextResponse.json(rules);
  } catch (error) {
    console.error("GET /api/recurring error:", error);
    return NextResponse.json({ error: "Failed to fetch recurring transactions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = recurringTransactionFormSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const { startDate, endDate, frequency, ...fields } = parsed.data;
    const start = dateKey(startDate);
    const rule = await sanityWriteClient.create({
      _type: "recurringTransaction", ...fields, frequency, startDate: start,
      ...(endDate ? { endDate: dateKey(endDate) } : {}), active: true,
      nextOccurrence: nextOccurrence(start, frequency, start, endDate),
    });
    const processed = await processRecurringTransaction(rule as never);
    return NextResponse.json(processed, { status: 201 });
  } catch (error) {
    console.error("POST /api/recurring error:", error);
    return NextResponse.json({ error: "Failed to create recurring transaction" }, { status: 500 });
  }
}