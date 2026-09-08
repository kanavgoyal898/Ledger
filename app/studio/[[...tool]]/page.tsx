/**
 * Embedded Sanity Studio at /studio
 * Server Component — metadata/viewport must be exported from a Server Component.
 */
export { metadata, viewport } from "next-sanity/studio";

import StudioClient from "./_StudioClient";

export default function StudioPage() {
  return <StudioClient />;
}
