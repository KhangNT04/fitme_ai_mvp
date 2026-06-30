import type { NextConfig } from "next";

const backendInternalUrl =
  process.env.BACKEND_INTERNAL_URL || "http://localhost:8080";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendInternalUrl}/api/v1/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendInternalUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
