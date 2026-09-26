import { DEFAULT_USERNAME } from "../../lib/username";
import { defineField, defineType } from "sanity";

export const settingsSchema = defineType({
  name: "settings",
  title: "Settings",
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
      name: "categories",
      title: "Categories",
      type: "array",
      of: [
        {
          type: "object",
          name: "categoryItem",
          fields: [
            defineField({
              name: "label",
              title: "Category Name",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "description",
              title: "Description",
              type: "text",
              rows: 2,
            }),
            defineField({
              name: "subCategories",
              title: "Sub-Categories",
              type: "array",
              of: [
                {
                  type: "object",
                  fields: [
                    defineField({ name: "label", type: "string" }),
                    defineField({ name: "description", type: "text", title: "Description" }),
                  ],
                },
              ],
            }),
          ],
          preview: {
            select: { title: "label", subCategories: "subCategories" },
            prepare({ title, subCategories }) {
              const subs = subCategories as unknown[] | undefined;
              const activeSubs = subs ?? [];
              return {
                title,
                subtitle: activeSubs.length
                  ? `${activeSubs.length} sub-categor${activeSubs.length === 1 ? "y" : "ies"}`
                  : "No sub-categories",
              };
            },
          },
        },
      ],
    }),
    defineField({
      name: "accounts",
      title: "Accounts",
      type: "array",
      of: [
        {
          type: "object",
          name: "accountItem",
          fields: [
            defineField({
              name: "label",
              title: "Account Name",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "description",
              title: "Description",
              type: "text",
              rows: 2,
            }),
            defineField({
              name: "subAccounts",
              title: "Sub-Accounts",
              type: "array",
              of: [
                {
                  type: "object",
                  fields: [
                    defineField({ name: "label", type: "string" }),
                    defineField({ name: "description", type: "text", title: "Description" }),
                  ],
                },
              ],
            }),
          ],
          preview: {
            select: { title: "label", subAccounts: "subAccounts" },
            prepare({ title, subAccounts }) {
              const subs = subAccounts as unknown[] | undefined;
              const activeSubs = subs ?? [];
              return {
                title,
                subtitle: activeSubs.length
                  ? `${activeSubs.length} sub-account${activeSubs.length === 1 ? "" : "s"}`
                  : "No sub-accounts",
              };
            },
          },
        },
      ],
    }),
  ],
});
