"use client";
/**
 * Embedded Sanity Studio at /studio
 */
import config from "@/sanity.config";
import { NextStudio } from "next-sanity/studio";

export { metadata, viewport } from "next-sanity/studio";

export default function StudioPage() {
  return <NextStudio config={config} />;
}
