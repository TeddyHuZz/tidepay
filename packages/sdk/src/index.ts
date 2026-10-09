import { PublicKey } from "@solana/web3.js";
import { MerchantPlan } from "@tidepay/types";

export class TidePayClient {
  constructor(private rpcUrl: string) {}

  async createSubscriptionTx(planPubkey: PublicKey, subscriber: PublicKey) {
    // Generates client-side delegation instructions
    throw new Error("Not implemented");
  }
}