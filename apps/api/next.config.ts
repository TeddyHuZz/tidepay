import type { NextConfig } from "next";

const IS_PROD = process.env.NODE_ENV === "production";
const dashboardUrl = (
  process.env.NEXT_PUBLIC_DASHBOARD_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (IS_PROD ? "https://app-tidepay.vercel.app" : "http://localhost:3000")
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  transpilePackages: ["@tidepay/sdk", "@tidepay/types"],
  cacheComponents: true,
  partialPrefetching: true,
  // Shareable slug from actions.json. Blink clients resolve it to the Action
  // API; a browser visiting it lands on the dashboard's checkout page.
  async redirects() {
    return [{ source: "/subscribe/:plan", destination: `${dashboardUrl}/checkout/:plan`, permanent: false }];
  },
};

export default nextConfig;
