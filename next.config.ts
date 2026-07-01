import type { NextConfig } from "next";

const backendUrl =
  process.env.BACKEND_URL ?? "http://103.179.45.111:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
