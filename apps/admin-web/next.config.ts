import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * `@pickup/shared` ships raw TypeScript rather than a build artifact — the
   * two React Native apps consume it the same way, and a build step per
   * package is friction a one-week project does not need.
   */
  transpilePackages: ["@pickup/shared"],
};

export default nextConfig;
