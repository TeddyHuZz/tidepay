import "dotenv/config";
import { startNearCrankFromEnv } from "./worker.js";

const handle = startNearCrankFromEnv();
if (!handle) {
  throw new Error(
    "Missing required NEAR crank env vars: NEAR_CRANK_ACCOUNT_ID, NEAR_CRANK_PRIVATE_KEY, TIDEPAY_NEAR_CONTRACT_ID",
  );
}

process.on("SIGINT", () => {
  handle.stop();
  process.exit(0);
});
process.on("SIGTERM", () => {
  handle.stop();
  process.exit(0);
});
