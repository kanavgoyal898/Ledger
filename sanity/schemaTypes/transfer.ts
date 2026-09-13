import { defineField, defineType } from "sanity";

export const transferSchema = defineType({
  name: "transfer",
  title: "Transfer",
  type: "document",
  fields: [
    defineField({
      name: "date", title: "Date", type: "datetime",
      validation: (Rule) => Rule.required(),
      initialValue: () => new Date().toISOString(),
    }),
    defineField({ name: "amount", title: "Amount (INR)", type: "number", validation: (Rule) => Rule.required().min(0) }),
    defineField({ name: "fromAccount", title: "From Account", type: "string", validation: (Rule) => Rule.required() }),
    defineField({ name: "fromSubAccount", title: "From Sub-Account", type: "string" }),
    defineField({ name: "toAccount", title: "To Account", type: "string", validation: (Rule) => Rule.required() }),
    defineField({ name: "toSubAccount", title: "To Sub-Account", type: "string" }),
    defineField({ name: "heading", title: "Heading", type: "string" }),
    defineField({ name: "description", title: "Description", type: "text", rows: 3 }),
  ],
  preview: {
    select: { from: "fromAccount", to: "toAccount", amount: "amount", date: "date" },
    prepare({ from, to, amount, date }) {
      return {
        title: `${from} → ${to}`,
        subtitle: `₹${amount ?? 0} · ${date ? new Date(date).toLocaleDateString("en-IN") : ""}`,
      };
    },
  },
});