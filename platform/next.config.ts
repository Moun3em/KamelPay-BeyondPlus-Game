import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // middleware.ts runs on the Node.js runtime (it does the DB self-tick).
  // The installed 15.5.22 type defs lag the runtime; the flag is validated
  // at build time ("Experiments: ✓ nodeMiddleware").
  experimental: {
    nodeMiddleware: true,
  } as NextConfig["experimental"],
};

export default nextConfig;
