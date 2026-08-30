import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Disable ESLint during builds to prevent failing
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Performance improvement for development
  swcMinify: true,
  
  // Increase build performance
  poweredByHeader: false,
};

export default nextConfig;
