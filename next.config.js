// This is validation for the environment variables early in the build process.
await import("./src/lib/env.js");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.vercel.app",
      },
      {
        protocol: "https",
        hostname: "*.bitnbyte.in",
      },
      {
        protocol: "https",
        hostname: "yjalvnfxtsplkfsrrwhz.supabase.co",
      },
    ],
  },
};

export default nextConfig;
