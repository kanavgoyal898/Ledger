import { type SchemaTypeDefinition } from "sanity";
import { transactionSchema } from "./transaction";
import { settingsSchema } from "./settings";
import { userSchema } from "./user";
import { recurringTransactionSchema } from "./recurringTransaction";
import { transferSchema } from "./transfer";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [transactionSchema, recurringTransactionSchema, transferSchema, settingsSchema, userSchema],
};
