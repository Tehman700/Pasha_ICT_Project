import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Android emulator reaches this dev server as 10.0.2.2, and Next blocks
  // cross-origin requests for its dev chunks by default - which silently
  // starves any dynamically imported library (the map, for one) while the page
  // itself still returns 200. Dev only; has no effect on a production build.
  allowedDevOrigins: ["10.0.2.2"],

  /**
   * Proxy the API through this server so the browser never makes a
   * cross-origin request to it.
   *
   * The deployed backend allows exactly one origin, https://admin.tideover.site.
   * A dashboard running on localhost:3000 is therefore blocked by CORS - the
   * preflight comes back 400 with no Access-Control-Allow-Origin, and every
   * write fails with a generic "please try again" that looks like a bug in the
   * form. The alternative was widening CORS on the live server, which is
   * production config drift for a local convenience.
   *
   * Set NEXT_PUBLIC_API_URL=/api-proxy to use this. Pointing it straight at
   * https://api.tideover.site/v1 also works - from a deployed origin that the
   * backend already allows.
   *
   * Websockets are NOT proxied here. Browsers do not apply CORS to them, so
   * NEXT_PUBLIC_WS_URL still points at the backend directly.
   */
  async rewrites() {
    const upstream = process.env.API_PROXY_TARGET ?? "https://api.tideover.site/v1";
    return [{ source: "/api-proxy/:path*", destination: `${upstream}/:path*` }];
  },
  /**
   * `@pickup/shared` ships raw TypeScript rather than a build artifact — the
   * two React Native apps consume it the same way, and a build step per
   * package is friction a one-week project does not need.
   */
  transpilePackages: ["@pickup/shared"],
};

export default nextConfig;
