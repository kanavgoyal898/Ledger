import { describe, it, expect } from "vitest";
import {
  transactionFormSchema,
  categoryItemSchema,
  accountItemSchema,
  formatINR,
  TRANSACTIONS_QUERY,
  TRANSACTION_BY_ID_QUERY,
  SETTINGS_QUERY,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// transactionFormSchema
// ---------------------------------------------------------------------------
describe("transactionFormSchema", () => {
  const validTransaction = {
    type: "expense",
    date: "2024-06-15T00:00:00.000Z",
    amount: 1500,
    category: "Food",
    account: "HDFC",
  };

  it("accepts a valid minimal expense transaction", () => {
    const result = transactionFormSchema.safeParse(validTransaction);
    expect(result.success).toBe(true);
  });

  it("accepts a valid income transaction", () => {
    const result = transactionFormSchema.safeParse({
      ...validTransaction,
      type: "income",
      category: "Salary",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a fully populated transaction", () => {
    const result = transactionFormSchema.safeParse({
      ...validTransaction,
      subCategory: "Groceries",
      subAccount: "Savings",
      heading: "Weekly groceries",
      description: "Big Bazaar shopping",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing date", () => {
    const { date: _, ...rest } = validTransaction;
    const result = transactionFormSchema.safeParse({ ...rest, date: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.date).toBeDefined();
    }
  });

  it("rejects missing category", () => {
    const result = transactionFormSchema.safeParse({ ...validTransaction, category: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.category).toBeDefined();
    }
  });

  it("rejects missing account", () => {
    const result = transactionFormSchema.safeParse({ ...validTransaction, account: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.account).toBeDefined();
    }
  });

  it("rejects negative amount", () => {
    const result = transactionFormSchema.safeParse({ ...validTransaction, amount: -100 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.amount).toBeDefined();
    }
  });

  it("accepts zero amount", () => {
    const result = transactionFormSchema.safeParse({ ...validTransaction, amount: 0 });
    expect(result.success).toBe(true);
  });

  it("coerces string amount to number", () => {
    const result = transactionFormSchema.safeParse({ ...validTransaction, amount: "250.5" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(250.5);
    }
  });

  it("rejects non-numeric amount string", () => {
    const result = transactionFormSchema.safeParse({ ...validTransaction, amount: "abc" });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// categoryItemSchema
// ---------------------------------------------------------------------------
describe("categoryItemSchema", () => {
  it("accepts a category with sub-categories", () => {
    const result = categoryItemSchema.safeParse({
      label: "Food",
      subCategories: [{ label: "Groceries", deleted: false }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a category without sub-categories (defaults to [])", () => {
    const result = categoryItemSchema.safeParse({ label: "Transport" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subCategories).toEqual([]);
    }
  });

  it("rejects an empty label", () => {
    const result = categoryItemSchema.safeParse({ label: "" });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// accountItemSchema
// ---------------------------------------------------------------------------
describe("accountItemSchema", () => {
  it("accepts a valid account", () => {
    const result = accountItemSchema.safeParse({
      label: "HDFC",
      subAccounts: [{ label: "Savings", deleted: false }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts an account without sub-accounts", () => {
    const result = accountItemSchema.safeParse({ label: "Cash" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subAccounts).toEqual([]);
    }
  });

  it("rejects an empty label", () => {
    const result = accountItemSchema.safeParse({ label: "" });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatINR
// ---------------------------------------------------------------------------
describe("formatINR", () => {
  it("formats integer amounts correctly", () => {
    const result = formatINR(1500);
    expect(result).toContain("1,500");
    expect(result).toContain("₹");
  });

  it("formats zero correctly", () => {
    const result = formatINR(0);
    expect(result).toContain("0.00");
  });

  it("formats large amounts with Indian number system grouping", () => {
    const result = formatINR(1234567);
    // Indian format: 12,34,567
    expect(result).toMatch(/12,34,567/);
  });

  it("formats decimal amounts correctly", () => {
    const result = formatINR(99.99);
    expect(result).toContain("99.99");
  });
});

// ---------------------------------------------------------------------------
// GROQ query strings (smoke tests — ensure they're non-empty strings)
// ---------------------------------------------------------------------------
describe("GROQ queries", () => {
  it("TRANSACTIONS_QUERY is a non-empty string targeting transactions", () => {
    expect(typeof TRANSACTIONS_QUERY).toBe("string");
    expect(TRANSACTIONS_QUERY.trim().length).toBeGreaterThan(0);
    expect(TRANSACTIONS_QUERY).toContain("transaction");
  });

  it("TRANSACTION_BY_ID_QUERY contains $id parameter", () => {
    expect(TRANSACTION_BY_ID_QUERY).toContain("$id");
  });

  it("SETTINGS_QUERY targets the singleton settings document", () => {
    expect(SETTINGS_QUERY).toContain("singleton-settings");
    expect(SETTINGS_QUERY).toContain("categories");
    expect(SETTINGS_QUERY).toContain("accounts");
  });
});
