import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/diagnose": ["./data/**/*"],
  },
  // Prevent Turbopack/webpack from bundling Node.js-only packages used in API routes
  serverExternalPackages: ['mammoth'],
};

export default nextConfig;