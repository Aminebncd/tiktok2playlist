import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: "https", hostname: "i.scdn.co" }] },
};

export default nextConfig;
