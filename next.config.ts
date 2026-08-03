import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Partial Prerendering everywhere, and caching that is opt-in per function
  // rather than per route segment. `export const dynamic` is dead config under
  // this flag — pages are dynamic by default — so it is gone from all 18 files
  // that carried it, and must not come back. Uncached data or a runtime API
  // read outside <Suspense> is now a build error, not a silent opt-out.
  cacheComponents: true,
  env: {
    // Stamped here rather than read during a render: under cacheComponents the
    // clock is request data, and the footer's copyright year was enough on its
    // own to keep the otherwise-static homepage off the prerender. This runs at
    // config load, outside React, so it is just a literal by the time anything
    // renders. See components/maison/CopyrightYear.tsx.
    NEXT_PUBLIC_BUILD_YEAR: String(new Date().getFullYear()),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  }
};

export default nextConfig;
