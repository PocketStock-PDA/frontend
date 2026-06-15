import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {},
};

export default withPWA({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    skipWaiting: true,
    runtimeCaching: [
      {
        urlPattern: /\/api\/(cma|portfolio|asset|budget)/,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-cache",
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
        },
      },
      {
        urlPattern: /\/api\/(trading|exchange)/,
        handler: "NetworkOnly",
      },
    ],
  },
})(nextConfig);