import "dotenv/config";
import { Account, JsonRpcProvider, KeyPairSigner, type KeyPairString } from "near-api-js";
import { TidePayNearClient } from "@tidepay/sdk-near";
import { NearCrankRunner, parseWatchList } from "./runner.js";

const POLL_INTERVAL_MS = 10_000;

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

const networkId = process.env.NEAR_NETWORK_ID ?? "testnet";
const accountId = required("NEAR_CRANK_ACCOUNT_ID");
const contractId = required("TIDEPAY_NEAR_CONTRACT_ID");
const watched = parseWatchList(required("NEAR_CRANK_WATCH")); // e.g. "pro-monthly:alice.testnet"

const provider = new JsonRpcProvider({ url: process.env.NEAR_RPC_URL ?? (networkId === "mainnet" ? "https://free.rpc.fastnear.com" : "https://test.rpc.fastnear.com") });
const signer = KeyPairSigner.fromSecretKey(required("NEAR_CRANK_PRIVATE_KEY") as KeyPairString);
const client = new TidePayNearClient(new Account(accountId, provider, signer), contractId);
const runner = new NearCrankRunner(client, watched);

console.log(`[NEAR-CRANK] Keeper ${accountId} watching ${watched.length} subscription(s) on ${contractId} (${networkId})`);
void runner.tick();
setInterval(() => void runner.tick(), POLL_INTERVAL_MS);
