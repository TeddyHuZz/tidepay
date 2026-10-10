import { neon } from "@neondatabase/serverless";

// Reusable SQL client pointing to Neon Postgres instance
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("[TidePay DB] DATABASE_URL is not set. Database queries will throw an error.");
}

export const sql = neon(connectionString || "");
