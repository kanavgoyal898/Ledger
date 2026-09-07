import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Sanity Studio embedded at /studio
  // Prevents Next.js from trying to SSR the studio pages
  experimental: {
    // taint is not needed here but keep for forward compat
  },
};

export default nextConfig;
