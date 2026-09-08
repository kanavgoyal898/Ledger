import { defineField, defineType } from "sanity";

export const userSchema = defineType({
  name: "user",
  title: "User",
  type: "document",
  fields: [
    defineField({
      name: "firstName",
      title: "First Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "lastName",
      title: "Last Name",
      type: "string",
    }),
    defineField({
      name: "username",
      title: "Username",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "profilePicture",
      title: "Profile Picture",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "mobileNumber",
      title: "Mobile Number",
      type: "string",
      description: "Country Code + Phone Number",
    }),
    defineField({
      name: "email",
      title: "Email",
      type: "string",
    }),
    defineField({
      name: "passcode",
      title: "Passcode",
      type: "string",
      description: "6 Digit Number",
      validation: (Rule) => Rule.required().length(6).regex(/^[0-9]+$/, { name: "numeric characters", invert: false }),
    }),
    defineField({
      name: "tokenReset",
      title: "Token Reset",
      type: "string",
      options: {
        list: [
          { title: "1 Day", value: "1_day" },
          { title: "1 Week", value: "1_week" },
          { title: "1 Month", value: "1_month" },
          { title: "1 Year", value: "1_year" },
          { title: "Never", value: "never" },
        ],
      },
      initialValue: "1_week",
    }),
  ],
  preview: {
    select: {
      title: "username",
      subtitle: "firstName",
    },
  },
});
