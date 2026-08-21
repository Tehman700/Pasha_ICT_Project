import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Android emulator reaches this dev server as 10.0.2.2, and Next blocks
  // cross-origin requests for its dev chunks by default - which silently
  // starves any dynamically imported library (the map, for one) while the page
  // itself still returns 200. Dev only; has no effect on a production build.
  allowedDevOrigins: ["10.0.2.2"],
  /**
   * `@pickup/shared` ships raw TypeScript rather than a build artifact — the
   * two React Native apps consume it the same way, and a build step per
   * package is friction a one-week project does not need.
   */
  transpilePackages: ["@pickup/shared"],
};

export default nextConfig;
