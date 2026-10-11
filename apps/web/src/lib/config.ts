export const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Merchant Dashboard URL
 * Local dev: http://localhost:3000
 * Vercel Prod: https://app-tidepay.vercel.app
 */
export const DASHBOARD_URL = (
  process.env.NEXT_PUBLIC_DASHBOARD_URL ||
  (IS_PROD ? "https://app-tidepay.vercel.app" : "http://localhost:3000")
).replace(/\/$/, "");

/**
 * Developer Actions / Blinks API URL
 * Local dev: http://localhost:3001
 * Vercel Prod: https://api-tidepay.vercel.app
 */
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  (IS_PROD ? "https://api-tidepay.vercel.app" : "http://localhost:3001")
).replace(/\/$/, "");

/**
 * Landing Page URL
 * Local dev: http://localhost:3002
 * Vercel Prod: https://tidepay.vercel.app
 */
export const LANDING_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  (IS_PROD ? "https://tidepay.vercel.app" : "http://localhost:3002")
).replace(/\/$/, "");
