import { NextRequest, NextResponse } from "next/server";
import { addDays, format } from "date-fns";
import { revalidateTag } from "next/cache";
import { sanityClient, sanityWriteClient } from "@/lib/sanity";
import { dateKey } from "@/lib/recurrence";
import { recurringTransactionFormSchema } from "@/lib/types";
import { processRecurringTransaction } from "@/lib/recurring-server";
import { getAuthenticatedUsername } from "@/lib/auth";

interface Params { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const username = getAuthenticatedUsername(request);
    if (!username) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { id } = await params;
    const owned = await sanityClient.fetch(`*[_type == "recurringTransaction" && _id == $id && username == $username][0]`, { id, username }, { cache: "no-store" });
    if (!owned) return NextResponse.json({ error: "Recurring transaction not found" }, { status: 404 });
    const body = await request.json();
    const resumeMode = body.resumeMode as "resume" | "backfill" | undefined;
    const updatePastTransactions = body.updatePastTransactions === true;
    const parsed = recurringTransactionFormSchema.partial().safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const optionalFields = ["subCategory", "subAccount", "heading", "description", "endDate"] as const;
    const unsetFields = optionalFields.filter((field) => parsed.data[field] === "");
    const patch: Record<string, unknown> = Object.fromEntries(
      Object.entries(parsed.data).filter(([, value]) => value !== undefined && value !== ""),
    );
    if (patch.startDate) patch.startDate = dateKey(patch.startDate as string);
    if (patch.endDate) patch.endDate = dateKey(patch.endDate as string);
    if (body.active === false) patch.active = false;
    if (body.active === true) {
      patch.active = true;
      if (resumeMode === "resume") patch.resumeFrom = format(addDays(new Date(), 1), "yyyy-MM-dd");
      if (resumeMode === "backfill") patch.resumeFrom = undefined;
    }
    const ruleUnsetFields: string[] = [...unsetFields];
    if (patch.resumeFrom === undefined) ruleUnsetFields.push("resumeFrom");
    const updated = await sanityWriteClient.patch(id).set(patch).unset(ruleUnsetFields).commit();

    if (updatePastTransactions) {
      const today = dateKey(new Date());
      const pastTransactions = await sanityClient.fetch<{ _id: string }[]>(
        `*[_type == "transaction" && recurringTransactionId == $id && username == $username && recurringOccurrence < $today]{ _id }`,
        { id, username, today },
        { cache: "no-store" },
      );
      const transactionFields = ["type", "amount", "category", "subCategory", "account", "subAccount", "heading", "description"] as const;
      const transactionSet = Object.fromEntries(
        transactionFields
          .filter((field) => parsed.data[field] !== undefined && parsed.data[field] !== "")
          .map((field) => [field, parsed.data[field]]),
      );
      const transactionUnset = transactionFields.filter((field) => parsed.data[field] === "");
      if (pastTransactions.length > 0) {
        const transaction = sanityWriteClient.transaction();
        for (const pastTransaction of pastTransactions) {
          transaction.patch(pastTransaction._id, (pastPatch) => pastPatch.set(transactionSet).unset(transactionUnset));
        }
        await transaction.commit();
      }
    }
    if (updated.active) {
      const result = await processRecurringTransaction(updated as never);
      revalidateTag("recurring", "max");
      revalidateTag("transactions", "max");
      return NextResponse.json(result);
    }
    revalidateTag("recurring", "max");
    if (updatePastTransactions) revalidateTag("transactions", "max");
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/recurring/[id] error:", error);
    return NextResponse.json({ error: "Failed to update recurring transaction" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const username = getAuthenticatedUsername(request);
    if (!username) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { id } = await params;
    const owned = await sanityClient.fetch(`*[_type == "recurringTransaction" && _id == $id && username == $username][0]._id`, { id, username }, { cache: "no-store" });
    if (!owned) return NextResponse.json({ error: "Recurring transaction not found" }, { status: 404 });
    await sanityWriteClient.delete(id);
    revalidateTag("recurring", "max");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/recurring/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete recurring transaction" }, { status: 500 });
  }
}
