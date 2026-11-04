// Gets a merchant's embedded NEAR account ready to create plans: derive the key, fund it, register it on the token.
// Pure orchestration with injected dependencies so the failure cases are unit-testable.
import type { KeyPair } from "near-api-js";
import { MIN_MERCHANT_NEAR_YOCTO } from "./config";
import { NEAR_DERIVE_MESSAGE, assertStableDerivation, implicitAccountId, keyPairFromSignature } from "./derive-key";

export type PrepareStatus = "deriving" | "funding" | "registering";

const FUNDING_POLL_ATTEMPTS = 10;
const FUNDING_POLL_INTERVAL_MS = 1_500;

export interface ChainOps {
  getBalance(): Promise<bigint>;
  isRegistered(): Promise<boolean>;
  register(): Promise<void>;
}

export interface PrepareDeps {
  solanaAddress: string;
  signDerivationMessage(message: Uint8Array): Promise<Uint8Array>;
  /** Holds only the derived PUBLIC key, to detect non-deterministic wallets. Never the secret. */
  storage: { get(key: string): string | null; set(key: string, value: string): void };
  /** Asks the sponsor route to top the account up. */
  sponsor(accountId: string): Promise<void>;
  connect(keyPair: KeyPair, accountId: string): ChainOps;
  onStatus?(status: PrepareStatus): void;
  sleep?(ms: number): Promise<void>;
}

export async function prepareNearAccount(deps: PrepareDeps): Promise<{ accountId: string; keyPair: KeyPair; ops: ChainOps }> {
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  deps.onStatus?.("deriving");
  const signature = await deps.signDerivationMessage(new TextEncoder().encode(NEAR_DERIVE_MESSAGE(deps.solanaAddress)));
  const keyPair = await keyPairFromSignature(signature);
  const publicKey = keyPair.getPublicKey().toString();
  const storageKey = `tidepay:near:pk:${deps.solanaAddress}`;
  assertStableDerivation(deps.storage.get(storageKey), publicKey); // before anything is spent
  deps.storage.set(storageKey, publicKey);

  const accountId = implicitAccountId(keyPair);
  const ops = deps.connect(keyPair, accountId);

  if ((await ops.getBalance()) < MIN_MERCHANT_NEAR_YOCTO) {
    deps.onStatus?.("funding");
    await deps.sponsor(accountId);
    let funded = false;
    for (let i = 0; i < FUNDING_POLL_ATTEMPTS && !funded; i++) {
      funded = (await ops.getBalance()) >= MIN_MERCHANT_NEAR_YOCTO;
      if (!funded) await sleep(FUNDING_POLL_INTERVAL_MS);
    }
    if (!funded) throw new Error("NEAR account funding did not arrive in time. Please try again.");
  }

  if (!(await ops.isRegistered())) {
    deps.onStatus?.("registering");
    await ops.register();
  }

  return { accountId, keyPair, ops };
}
