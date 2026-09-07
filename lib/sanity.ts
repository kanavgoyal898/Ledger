import { createClient } from "next-sanity";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2024-01-01";

/** Read-only public client (no token needed for public datasets) */
export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false, // always fresh data for a CRUD app
});

/** Write client — uses token from env (server-side only) */
export const sanityWriteClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});
