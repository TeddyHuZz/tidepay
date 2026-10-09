import type { NextConfig } from "next";

const dashboardUrl = (process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:3000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Shareable slug from actions.json. Blink clients resolve it to the Action
  // API; a browser visiting it lands on the dashboard's checkout page.
  async redirects() {
    return [{ source: "/subscribe/:plan", destination: `${dashboardUrl}/checkout/:plan`, permanent: false }];
  },
};

export default nextConfig;
