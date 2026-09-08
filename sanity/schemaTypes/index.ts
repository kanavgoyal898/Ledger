import { type SchemaTypeDefinition } from "sanity";
import { transactionSchema } from "./transaction";
import { settingsSchema } from "./settings";
import { userSchema } from "./user";
import { recurringTransactionSchema } from "./recurringTransaction";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [transactionSchema, recurringTransactionSchema, settingsSchema, userSchema],
};
