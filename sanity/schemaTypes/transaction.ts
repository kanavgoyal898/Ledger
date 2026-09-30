import { DEFAULT_USERNAME } from "../../lib/username";
import { defineField, defineType } from "sanity";

export const transactionSchema = defineType({
  name: "transaction",
  title: "Transaction",
  type: "document",
  fields: [
    defineField({
      name: "username",
      title: "Username",
      type: "string",
      validation: (Rule) => Rule.required(),
      initialValue: DEFAULT_USERNAME,
    }),
    defineField({
      name: "type",
      title: "Type",
      type: "string",
      options: {
        list: [
          { title: "Expense", value: "expense" },
          { title: "Income", value: "income" },
          { title: "Investment", value: "investment" },
        ],
        layout: "radio",
      },
      validation: (Rule) => Rule.required(),
      initialValue: "expense",
    }),
    defineField({
      name: "date",
      title: "Date",
      type: "datetime",
      validation: (Rule) => Rule.required(),
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: "amount",
      title: "Amount (INR)",
      type: "number",
      validation: (Rule) => Rule.required().min(0),
      initialValue: 0,
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "subCategory",
      title: "Sub-Category",
      type: "string",
    }),
    defineField({
      name: "account",
      title: "Account",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "subAccount",
      title: "Sub-Account",
      type: "string",
    }),
    defineField({
      name: "heading",
      title: "Heading",
      type: "string",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
    }),
    defineField({ name: "recurringTransactionId", title: "Recurring Transaction", type: "string" }),
    defineField({ name: "recurringOccurrence", title: "Recurring Occurrence", type: "date" }),
  ],
  preview: {
    select: {
      title: "heading",
      subtitle: "category",
      amount: "amount",
      date: "date",
      type: "type",
    },
    prepare({ title, subtitle, amount, date, type }) {
      const isIncome = type === "income";
      const label = type === "investment" ? "Investment" : isIncome ? "Income" : "Expense";
      const sign = isIncome ? "+" : "-";
      return {
        title: title || `${sign}₹${amount ?? 0}`,
        subtitle: `${label} · ${subtitle ?? ""} · ${date ? new Date(date).toLocaleDateString("en-IN") : ""}`,
      };
    },
  },
});
