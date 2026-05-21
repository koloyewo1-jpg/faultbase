import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/diagnose": ["./data/**/*"],
  },
};

export default nextConfig;