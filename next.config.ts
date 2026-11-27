import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  devIndicators: false, // the floating "N" badge in local development covered the sidebar links
  // profile pictures: the browser shrinks them first; Vercel rejects request bodies over 4.5 MB anyway
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  // one address for everyone, so sign-in cookies and links all live on hive-workspace.com
  async redirects() {
    return [
      { source: "/:path*", has: [{ type: "host", value: "www.hive-workspace.com" }], destination: "https://hive-workspace.com/:path*", permanent: true },
      { source: "/login", destination: "/signin", permanent: true }, // sign-in moved; query strings (e.g. ?error=) carry over
    ];
  },
  // Baseline browser protections for every page. (No CSP yet: the theme boot script is inline; add one with nonces if needed.)
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      ],
    }];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
