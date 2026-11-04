// Deploys a TidePay contract to NEAR testnet and registers it and its fee recipient on the demo token.
// The contract and treasury sub-accounts reuse the deployer's key, so the deployer can upgrade them.
// Needs one funded account (>= ~5 NEAR) in NEAR_ACCOUNT_ID / NEAR_PRIVATE_KEY.
import { readFileSync } from "node:fs";
import { Account, JsonRpcProvider, KeyPair, KeyPairSigner, type KeyPairString } from "near-api-js";

const NEAR = 10n ** 24n;
const TGAS = 10n ** 12n;

const env = (n: string, d?: string) => {
  const v = process.env[n] ?? d;
  if (!v) throw new Error(`Missing env var ${n}`);
  return v;
};

const deployerId = env("NEAR_ACCOUNT_ID");
const secret = env("NEAR_PRIVATE_KEY") as KeyPairString;
const tokenId = env("TOKEN_ID", "usdc.fakes.testnet");
const wasmPath = env("WASM_PATH", "packages/contracts-near/target/wasm32-unknown-unknown/release/tidepay_contracts_near.wasm");
const provider = new JsonRpcProvider({ url: env("NEAR_RPC_URL", "https://test.rpc.fastnear.com") });
const publicKey = KeyPair.fromString(secret).getPublicKey().toString();
const signer = KeyPairSigner.fromSecretKey(secret);
const deployer = new Account(deployerId, provider, signer);

async function subAccount(prefix: string, run: string, nearAmount: bigint) {
  const id = `${prefix}-${run}.${deployerId}`;
  await deployer.createAccount({ newAccountId: id, publicKey, nearToTransfer: nearAmount });
  return new Account(id, provider, signer);
}

async function main() {
  const run = Date.now().toString(36);
  const contract = await subAccount("tidepay", run, 4n * NEAR); // ~2.75 NEAR of wasm storage
  const treasury = await subAccount("treasury", run, NEAR / 10n);

  await contract.deployContract(readFileSync(wasmPath));
  await contract.callFunction({ contractId: contract.accountId, methodName: "new", args: { protocol_fee_recipient: treasury.accountId }, gas: 30n * TGAS });

  for (const id of [contract.accountId, treasury.accountId]) {
    await deployer.callFunction({
      contractId: tokenId,
      methodName: "storage_deposit",
      args: { account_id: id, registration_only: true },
      deposit: NEAR / 50n,
      gas: 30n * TGAS,
    });
  }

  // Prove the deployment: a fresh contract has no plans for anyone.
  const plans = await provider.callFunction<unknown[]>({ contractId: contract.accountId, method: "get_merchant_plans", args: { merchant_id: deployerId, from_index: 0, limit: 10 } });
  if (!Array.isArray(plans) || plans.length !== 0) throw new Error("Deployed contract did not answer get_merchant_plans with []");

  console.log(`NEXT_PUBLIC_TIDEPAY_NEAR_CONTRACT=${contract.accountId}`);
  console.log(`treasury (fee recipient): ${treasury.accountId}`);
  console.log(`Explorer: https://testnet.nearblocks.io/address/${contract.accountId}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
