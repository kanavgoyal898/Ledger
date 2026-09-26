import { DEFAULT_USERNAME } from "../../lib/username";
import { defineField, defineType } from "sanity";

export const recurringTransactionSchema = defineType({
  name: "recurringTransaction",
  title: "Recurring Transaction",
  type: "document",
  fields: [
    defineField({
      name: "username",
      title: "Username",
      type: "string",
      validation: (Rule) => Rule.required(),
      initialValue: DEFAULT_USERNAME,
    }),
    defineField({ name: "type", title: "Type", type: "string", options: { list: [
      { title: "Expense", value: "expense" }, { title: "Income", value: "income" },
    ] }, validation: (Rule) => Rule.required() }),
    defineField({ name: "amount", title: "Amount (INR)", type: "number", validation: (Rule) => Rule.required().min(0) }),
    defineField({ name: "category", title: "Category", type: "string", validation: (Rule) => Rule.required() }),
    defineField({ name: "subCategory", title: "Sub-Category", type: "string" }),
    defineField({ name: "account", title: "Account", type: "string", validation: (Rule) => Rule.required() }),
    defineField({ name: "subAccount", title: "Sub-Account", type: "string" }),
    defineField({ name: "heading", title: "Heading", type: "string" }),
    defineField({ name: "description", title: "Description", type: "text", rows: 3 }),
    defineField({ name: "frequency", title: "Frequency", type: "string", validation: (Rule) => Rule.required() }),
    defineField({ name: "startDate", title: "Start Date", type: "date", validation: (Rule) => Rule.required() }),
    defineField({ name: "endDate", title: "End Date", type: "date" }),
    defineField({ name: "active", title: "Active", type: "boolean", initialValue: true }),
    defineField({ name: "nextOccurrence", title: "Next Occurrence", type: "date" }),
    defineField({ name: "resumeFrom", title: "Resume From", type: "date" }),
  ],
});