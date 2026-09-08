import { z } from "zod";

// ---------------------------------------------------------------------------
// Sanity document types
// ---------------------------------------------------------------------------

export interface SubItem {
  label: string;
  description?: string;
  deleted: boolean;
}

export interface CategoryItem {
  _key: string;
  label: string;
  description?: string;
  deleted: boolean;
  subCategories?: SubItem[];
}

export interface AccountItem {
  _key: string;
  label: string;
  description?: string;
  deleted: boolean;
  subAccounts?: SubItem[];
}

export interface Settings {
  _id: string;
  _type: "settings";
  categories?: CategoryItem[];
  accounts?: AccountItem[];
}

export type TokenReset = "1_day" | "1_week" | "1_month" | "1_year" | "never";

export interface User {
  _id: string;
  _type: "user";
  firstName: string;
  lastName?: string;
  username: string;
  profilePicture?: string;
  mobileNumber?: string;
  email?: string;
  passcode: string;
  tokenReset: TokenReset;
}

/** Converts a tokenReset value to cookie maxAge in seconds. Returns undefined for "never". */
export function tokenResetToDays(tokenReset: TokenReset): number | undefined {
  switch (tokenReset) {
    case "1_day":   return 60 * 60 * 24;
    case "1_week":  return 60 * 60 * 24 * 7;
    case "1_month": return 60 * 60 * 24 * 30;
    case "1_year":  return 60 * 60 * 24 * 365;
    case "never":   return undefined;
  }
}

export const tokenResetToSeconds = tokenResetToDays;

export interface Transaction {
  _id: string;
  _type: "transaction";
  _createdAt: string;
  _updatedAt: string;
  type: "income" | "expense";
  date: string;
  amount: number;
  category: string;
  subCategory?: string;
  account: string;
  subAccount?: string;
  heading?: string;
  description?: string;
  recurringTransactionId?: string;
  recurringOccurrence?: string;
}

export const RECURRENCE_FREQUENCIES = [
  "daily",
  "every_week",
  "every_month",
  "every_year",
  "first_day_of_every_week",
  "last_day_of_every_week",
  "first_working_day_of_every_week",
  "last_working_day_of_every_week",
  "first_day_of_every_month",
  "last_day_of_every_month",
  "first_working_day_of_every_month",
  "last_working_day_of_every_month",
  "first_day_of_every_year",
  "last_day_of_every_year",
  "first_working_day_of_every_year",
  "last_working_day_of_every_year",
] as const;

export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

export interface RecurringTransaction {
  _id: string;
  _type: "recurringTransaction";
  _createdAt: string;
  _updatedAt: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  subCategory?: string;
  account: string;
  subAccount?: string;
  heading?: string;
  description?: string;
  frequency: RecurrenceFrequency;
  startDate: string;
  endDate?: string;
  active: boolean;
  nextOccurrence?: string;
  resumeFrom?: string;
}

// ---------------------------------------------------------------------------
// Zod validation schemas
// ---------------------------------------------------------------------------

export const transactionFormSchema = z.object({
  type: z.enum(["income", "expense"]).default("expense"),
  date: z.string().min(1, "Date is required"),
  amount: z.coerce.number({ error: "Amount must be a number" }).min(0, "Amount must be ≥ 0"),
  category: z.string().min(1, "Category is required"),
  subCategory: z.string().optional(),
  account: z.string().min(1, "Account is required"),
  subAccount: z.string().optional(),
  heading: z.string().optional(),
  description: z.string().optional(),
});

/** Shape after zodResolver parses/coerces the form — used for onSubmit and API payloads. */
export type TransactionFormValues = z.output<typeof transactionFormSchema>;
/** Shape RHF's form state actually holds before validation runs. */
export type TransactionFormInput = z.input<typeof transactionFormSchema>;

export const recurringTransactionFormSchema = transactionFormSchema
  .omit({ date: true })
  .extend({
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional(),
    frequency: z.enum(RECURRENCE_FREQUENCIES),
  })
  .refine((value) => !value.endDate || value.endDate >= value.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

export type RecurringTransactionFormValues = z.infer<typeof recurringTransactionFormSchema>;

export const subItemSchema = z.object({
  label: z.string().min(1),
  deleted: z.boolean().default(false),
});

export const categoryItemSchema = z.object({
  label: z.string().min(1, "Category name is required"),
  deleted: z.boolean().default(false),
  subCategories: z.array(subItemSchema).optional().default([]),
});

export const accountItemSchema = z.object({
  label: z.string().min(1, "Account name is required"),
  deleted: z.boolean().default(false),
  subAccounts: z.array(subItemSchema).optional().default([]),
});

// ---------------------------------------------------------------------------
// GROQ queries
// ---------------------------------------------------------------------------

export const TRANSACTIONS_QUERY = `
  *[_type == "transaction"] | order(date desc) {
    _id,
    _type,
    _createdAt,
    _updatedAt,
    type,
    date,
    amount,
    category,
    subCategory,
    account,
    subAccount,
    heading,
    description,
    recurringTransactionId,
    recurringOccurrence,
    resumeFrom
  }
`;

export const TRANSACTION_BY_ID_QUERY = `
  *[_type == "transaction" && _id == $id][0] {
    _id,
    _type,
    _createdAt,
    _updatedAt,
    type,
    date,
    amount,
    category,
    subCategory,
    account,
    subAccount,
    heading,
    description,
    recurringTransactionId,
    recurringOccurrence
  }
`;

export const SETTINGS_QUERY = `
  *[_type == "settings" && _id == "singleton-settings"][0] {
    _id,
    _type,
    categories[] {
      _key,
      label,
      description,
      deleted,
      subCategories[] {
        label,
        description,
        deleted
      }
    },
    accounts[] {
      _key,
      label,
      description,
      deleted,
      subAccounts[] {
        label,
        description,
        deleted
      }
    }
  }
`;

export const USER_QUERY = `
  *[_type == "user" && username == $username][0] {
    _id,
    _type,
    firstName,
    lastName,
    username,
    "profilePicture": profilePicture.asset->url,
    mobileNumber,
    email,
    passcode,
    tokenReset
  }
`;

export const USER_BY_USERNAME_QUERY = USER_QUERY;

// ---------------------------------------------------------------------------
// Utility: format currency
// ---------------------------------------------------------------------------
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}
