import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schema } from "./sanity/schemaTypes";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

export default defineConfig({
  basePath: "/studio",
  projectId,
  dataset,
  schema,
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title("Content")
          .items([
            S.listItem()
              .title("Transactions")
              .child(S.documentTypeList("transaction")),
            S.listItem()
              .title("Users")
              .child(S.documentTypeList("user")),
            S.listItem()
              .title("Transfers")
              .child(S.documentTypeList("transfer")),
            S.listItem()
              .title("Settings")
              .child(S.documentTypeList("settings")),
          ]),
    }),
    visionTool(),
  ],
});
