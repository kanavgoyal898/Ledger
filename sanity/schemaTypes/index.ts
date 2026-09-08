import { type SchemaTypeDefinition } from "sanity";
import { transactionSchema } from "./transaction";
import { settingsSchema } from "./settings";
import { userSchema } from "./user";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [transactionSchema, settingsSchema, userSchema],
};
