import { type SchemaTypeDefinition } from "sanity";
import { transactionSchema } from "./transaction";
import { settingsSchema } from "./settings";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [transactionSchema, settingsSchema],
};
