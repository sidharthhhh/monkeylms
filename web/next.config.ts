import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the Docker multi-stage build: produces a self-contained
  // server bundle in .next/standalone without shipping node_modules.
  output: "standalone",
};

export default nextConfig;
