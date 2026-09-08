import { NextRequest, NextResponse } from "next/server";
import { addDays, format } from "date-fns";
import { sanityWriteClient } from "@/lib/sanity";
import { dateKey } from "@/lib/recurrence";
import { recurringTransactionFormSchema } from "@/lib/types";
import { processRecurringTransaction } from "@/lib/recurring-server";

interface Params { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const resumeMode = body.resumeMode as "resume" | "backfill" | undefined;
    const parsed = recurringTransactionFormSchema.partial().safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const patch: Record<string, unknown> = Object.fromEntries(Object.entries(parsed.data).filter(([, value]) => value !== undefined));
    if (patch.startDate) patch.startDate = dateKey(patch.startDate as string);
    if (patch.endDate) patch.endDate = dateKey(patch.endDate as string);
    if (body.active === false) patch.active = false;
    if (body.active === true) {
      patch.active = true;
      if (resumeMode === "resume") patch.resumeFrom = format(addDays(new Date(), 1), "yyyy-MM-dd");
      if (resumeMode === "backfill") patch.resumeFrom = undefined;
    }
    const updated = await sanityWriteClient.patch(id).set(patch).unset(patch.resumeFrom === undefined ? ["resumeFrom"] : []).commit();
    if (updated.active) return NextResponse.json(await processRecurringTransaction(updated as never));
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/recurring/[id] error:", error);
    return NextResponse.json({ error: "Failed to update recurring transaction" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await sanityWriteClient.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/recurring/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete recurring transaction" }, { status: 500 });
  }
}