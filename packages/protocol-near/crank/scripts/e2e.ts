// End-to-end testnet check: deploy TidePay, subscribe, wait one interval, let the keeper settle, assert balances.
// Needs one funded testnet account (>= ~5 NEAR) in NEAR_ACCOUNT_ID / NEAR_PRIVATE_KEY. Exits non-zero on any mismatch.
import { readFileSync } from "node:fs";
import { Account, JsonRpcProvider, KeyPair, KeyPairSigner, type KeyPairString } from "near-api-js";
import { TidePayNearClient } from "@tidepay/sdk-near";
import { NearCrankRunner } from "../src/runner.js";

const NEAR = 10n ** 24n;
const TGAS = 10n ** 12n;
const PRICE = 10_000_000n; // 10 USDC (6 decimals)
const BOUNTY = 50_000n;
const FEE_BPS = 50n;
const FEE = (PRICE * FEE_BPS) / 10_000n;
const INTERVAL_S = 60;
const DEPOSIT = 30n * 1_000_000n; // epoch 0 + two prepaid cycles

const env = (n: string, d?: string) => {
  const v = process.env[n] ?? d;
  if (!v) throw new Error(`Missing env var ${n}`);
  return v;
};

const master = env("NEAR_ACCOUNT_ID");
const tokenId = env("TOKEN_ID", "usdc.fakes.testnet");
const wasmPath = env("WASM_PATH", "packages/contracts-near/target/wasm32-unknown-unknown/release/tidepay_contracts_near.wasm");
const provider = new JsonRpcProvider({ url: env("NEAR_RPC_URL", "https://test.rpc.fastnear.com") });
const masterAccount = new Account(master, provider, KeyPairSigner.fromSecretKey(env("NEAR_PRIVATE_KEY") as KeyPairString));

const step = (m: string) => console.log(`\n== ${m}`);
function check(label: string, actual: bigint | number | string, expected: bigint | number | string) {
  if (String(actual) !== String(expected)) throw new Error(`FAIL ${label}: expected ${expected}, got ${actual}`);
  console.log(`ok   ${label} = ${actual}`);
}
async function eventually<T>(what: string, fn: () => Promise<T>, done: (v: T) => boolean, timeoutMs = 120_000): Promise<T> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const v = await fn();
    if (done(v)) return v;
    if (Date.now() > end) throw new Error(`Timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 3_000));
  }
}

async function newAccount(prefix: string, run: string, nearAmount: bigint) {
  const id = `${prefix}-${run}.${master}`;
  const key = KeyPair.fromRandom("ed25519");
  await masterAccount.createAccount({ newAccountId: id, publicKey: key.getPublicKey().toString(), nearToTransfer: nearAmount });
  return new Account(id, provider, new KeyPairSigner(key));
}

const balanceOf = async (id: string) =>
  BigInt((await provider.callFunction<string>({ contractId: tokenId, method: "ft_balance_of", args: { account_id: id } })) ?? "0");

async function main() {
  const run = Date.now().toString(36);

  step("Create accounts");
  const contract = await newAccount("tidepay", run, (32n * NEAR) / 10n); // ~2.75 NEAR of wasm storage, plus headroom
  const merchant = await newAccount("merchant", run, NEAR / 5n);
  const subscriber = await newAccount("sub", run, NEAR / 5n);
  const keeper = await newAccount("keeper", run, NEAR / 5n);
  const treasury = await newAccount("treasury", run, NEAR / 10n);
  console.log(`contract: ${contract.accountId}`);

  step("Deploy and initialise contract");
  await contract.deployContract(readFileSync(wasmPath));
  await contract.callFunction({ contractId: contract.accountId, methodName: "new", args: { protocol_fee_recipient: treasury.accountId }, gas: 30n * TGAS });

  step(`Register accounts on ${tokenId} and mint subscriber funds`);
  for (const a of [contract, merchant, keeper, treasury, subscriber]) {
    await masterAccount.callFunction({
      contractId: tokenId,
      methodName: "storage_deposit",
      args: { account_id: a.accountId, registration_only: true },
      deposit: NEAR / 50n,
      gas: 30n * TGAS,
    });
  }
  await masterAccount.callFunction({ contractId: tokenId, methodName: "mint", args: { account_id: subscriber.accountId, amount: DEPOSIT.toString() }, gas: 30n * TGAS });
  check("subscriber token balance", await balanceOf(subscriber.accountId), DEPOSIT);

  const planId = `demo-${run}`;
  const merchantClient = new TidePayNearClient(merchant, contract.accountId);
  const subscriberClient = new TidePayNearClient(subscriber, contract.accountId);
  const keeperClient = new TidePayNearClient(keeper, contract.accountId);

  step("Merchant creates plan");
  await merchantClient.createPlan({ planId, tokenId, amount: PRICE, intervalSeconds: INTERVAL_S, crankBounty: BOUNTY, protocolFeeBps: Number(FEE_BPS) });
  // RPC reads can lag a write that just finalized, so wait for the data instead of reading once.
  const plan = await eventually("plan visible", () => merchantClient.getPlan(planId), (p) => p !== null);
  check("plan is active", String(plan?.is_active), "true");

  step("Subscriber subscribes (epoch 0 paid immediately)");
  await subscriberClient.subscribe({ planId, tokenId, depositAmount: DEPOSIT });
  const merchantAfterEpoch0 = PRICE - FEE;
  await eventually("epoch 0 payout", () => balanceOf(merchant.accountId), (b) => b === merchantAfterEpoch0);
  check("merchant after epoch 0", await balanceOf(merchant.accountId), merchantAfterEpoch0);
  check("treasury after epoch 0", await balanceOf(treasury.accountId), FEE);
  let sub = await eventually("subscription visible", () => subscriberClient.getSubscription(planId, subscriber.accountId), (r) => r !== null);
  check("cycle_count", sub!.cycle_count, 1);
  check("prepaid balance", sub!.deposited_balance, DEPOSIT - PRICE);

  step("Keeper must not settle before the interval");
  const runner = new NearCrankRunner(keeperClient, [{ planId, subscriberId: subscriber.accountId }]);
  // Slow RPC reads above can use up the 60 s interval, so judge the contract against the chain's own clock, not ours:
  // "not due" requires the block time before the call to be under next_epoch; "due" requires the block time after to be over it.
  const blockNs = async () => BigInt((await provider.viewBlock({ finality: "final" })).header.timestamp_nanosec);
  const nextEpochNs = BigInt(sub!.next_epoch_timestamp_ns);
  const before = await blockNs();
  const dueNow = await keeperClient.isSubscriptionDue(planId, subscriber.accountId);
  const after = await blockNs();
  const consistent = dueNow ? after >= nextEpochNs : before < nextEpochNs;
  check("contract due-state matches chain time", String(consistent), "true");
  console.log(`     (due=${dueNow}, block time ${before < nextEpochNs ? "before" : "after"} next epoch when asked)`);

  step(`Wait ${INTERVAL_S}s, then keeper settles epoch 1`);
  await eventually("subscription due", () => keeperClient.isSubscriptionDue(planId, subscriber.accountId), Boolean, (INTERVAL_S + 90) * 1000);
  await runner.tick();
  sub = await eventually("cycle 2 visible", () => subscriberClient.getSubscription(planId, subscriber.accountId), (r) => r?.cycle_count === 2);
  check("cycle_count after keeper", sub!.cycle_count, 2);
  check("prepaid balance after keeper", sub!.deposited_balance, DEPOSIT - 2n * PRICE);

  const merchantTotal = merchantAfterEpoch0 + (PRICE - FEE - BOUNTY);
  await eventually("epoch 1 payouts", () => balanceOf(merchant.accountId), (b) => b === merchantTotal);
  check("merchant total", await balanceOf(merchant.accountId), merchantTotal);
  check("keeper bounty", await balanceOf(keeper.accountId), BOUNTY);
  check("treasury total", await balanceOf(treasury.accountId), 2n * FEE);

  console.log(`\nSUCCESS: TidePay NEAR recurring settlement verified on testnet.`);
  console.log(`Explorer: https://testnet.nearblocks.io/address/${contract.accountId}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
