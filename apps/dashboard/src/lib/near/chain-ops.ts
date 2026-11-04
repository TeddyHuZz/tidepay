// Real NEAR wiring for an embedded merchant account. Kept out of the React hook so it can be exercised against testnet from a script.
import { Account, JsonRpcProvider, KeyPairSigner, type KeyPair } from "near-api-js";
import { TidePayNearClient } from "@tidepay/sdk-near";
import { NEAR_CONTRACT_ID, NEAR_RPC_URL, NEAR_USDC_TOKEN_ID } from "./config";
import type { ChainOps } from "./prepare";

export function createNearChainOps(
  keyPair: KeyPair,
  accountId: string,
  contractId: string = NEAR_CONTRACT_ID,
  rpcUrl: string = NEAR_RPC_URL,
): { client: TidePayNearClient; ops: ChainOps } {
  if (!contractId) throw new Error("NEXT_PUBLIC_TIDEPAY_NEAR_CONTRACT is not set");
  const provider = new JsonRpcProvider({ url: rpcUrl });
  const client = new TidePayNearClient(new Account(accountId, provider, new KeyPairSigner(keyPair)), contractId);

  const ops: ChainOps = {
    getBalance: async () => {
      try {
        return BigInt((await provider.viewAccount({ accountId })).amount);
      } catch (error) {
        if (String(error).includes("does not exist")) return BigInt(0); // not created until first funded
        throw error;
      }
    },
    isRegistered: () => client.isStorageRegistered(NEAR_USDC_TOKEN_ID, accountId),
    register: async () => void (await client.registerStorage(NEAR_USDC_TOKEN_ID, accountId)),
  };
  return { client, ops };
}
