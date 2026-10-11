import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  experimental: {
    proxyClientMaxBodySize: "20mb",
  },
};

export default nextConfig;
