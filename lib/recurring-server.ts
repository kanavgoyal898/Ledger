import { addDays, format } from "date-fns";
import { sanityClient, sanityWriteClient } from "@/lib/sanity";
import { dateKey, nextOccurrence, occurrenceDates } from "@/lib/recurrence";
import type { RecurringTransaction } from "@/lib/types";

export async function processRecurringTransaction(rule: RecurringTransaction, today = new Date()) {
  if (!rule.active) return rule;

  const todayKey = dateKey(today);
  const occurrenceKeys = occurrenceDates(rule.startDate, rule.frequency, todayKey, rule.endDate)
    .filter((occurrence) => !rule.resumeFrom || occurrence >= rule.resumeFrom);

  const existing = await sanityClient.fetch<{ recurringOccurrence?: string }[]>(
    `*[_type == "transaction" && recurringTransactionId == $id && username == $username]{ recurringOccurrence }`,
    { id: rule._id, username: rule.username },
    { cache: "no-store" },
  );
  const existingKeys = new Set(existing.map((tx) => tx.recurringOccurrence));

  // Collect all missing occurrences and batch them into a single transaction commit
  const missingOccurrences = occurrenceKeys.filter((o) => !existingKeys.has(o));
  if (missingOccurrences.length > 0) {
    const transaction = sanityWriteClient.transaction();
    for (const occurrence of missingOccurrences) {
      transaction.create({
        _type: "transaction",
        username: rule.username,
        type: rule.type,
        date: `${occurrence}T00:00:00.000Z`,
        amount: rule.amount,
        category: rule.category,
        ...(rule.subCategory ? { subCategory: rule.subCategory } : {}),
        account: rule.account,
        ...(rule.subAccount ? { subAccount: rule.subAccount } : {}),
        ...(rule.heading ? { heading: rule.heading } : {}),
        ...(rule.description ? { description: rule.description } : {}),
        recurringTransactionId: rule._id,
        recurringOccurrence: occurrence,
      });
    }
    await transaction.commit();
  }

  const updatedNextOccurrence = nextOccurrence(
    rule.startDate,
    rule.frequency,
    format(addDays(new Date(`${todayKey}T00:00:00.000Z`), 1), "yyyy-MM-dd"),
    rule.endDate,
  );
  return sanityWriteClient.patch(rule._id)
    .set({ nextOccurrence: updatedNextOccurrence })
    .unset(["resumeFrom"])
    .commit();
}

export async function processAllRecurringTransactions() {
  const rules = await sanityClient.fetch<RecurringTransaction[]>(
    `*[_type == "recurringTransaction"]`,
    {},
    { cache: "no-store" },
  );
  // Process all rules in parallel instead of sequentially
  await Promise.all(rules.map((rule) => processRecurringTransaction(rule)));
}
