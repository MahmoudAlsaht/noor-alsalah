import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // Capacitor Requirement: Static Export
  output: "export",
  // Capacitor Requirement: Avoid optimization issues
  images: { unoptimized: true },
  // Capacitor Requirement: Better routing support
  trailingSlash: true,
};

export default nextConfig;
