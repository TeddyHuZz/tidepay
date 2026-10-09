import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  Transaction,
  Signer,
} from "@solana/web3.js";
import { Program, AnchorProvider, BN, Idl } from "@coral-xyz/anchor";
import {
  TIDEPAY_IDL,
  TIDEPAY_PROGRAM_ID,
  PLAN_SEED,
  SUBSCRIPTION_SEED,
  AUTH_SEED,
  MerchantPlan,
  SubscriptionRecord,
} from "@tidepay/types";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

export interface WalletAdapterLike {
  publicKey: PublicKey;
  signTransaction<T extends Transaction>(tx: T): Promise<T>;
  signAllTransactions?<T extends Transaction>(txs: T[]): Promise<T[]>;
}

export class TidePayClient {
  public readonly programId: PublicKey;
  public readonly program: Program;

  constructor(
    public readonly connection: Connection,
    wallet?: WalletAdapterLike,
    programIdString: string = TIDEPAY_PROGRAM_ID
  ) {
    this.programId = new PublicKey(programIdString);

    const dummyWallet = wallet ?? {
      publicKey: PublicKey.default,
      signTransaction: async <T extends Transaction>(tx: T) => tx,
      signAllTransactions: async <T extends Transaction>(txs: T[]) => txs,
    };

    const provider = new AnchorProvider(
      connection,
      dummyWallet as any,
      AnchorProvider.defaultOptions()
    );

    this.program = new Program(TIDEPAY_IDL as Idl, provider);
  }

  // --- PDA Derivations ---

  public findMerchantPlanPda(merchant: PublicKey, planId: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(PLAN_SEED), merchant.toBuffer(), Buffer.from(planId)],
      this.programId
    );
  }

  public findSubscriptionRecordPda(plan: PublicKey, subscriber: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SUBSCRIPTION_SEED), plan.toBuffer(), subscriber.toBuffer()],
      this.programId
    );
  }

  public findProgramAuthorityPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(AUTH_SEED)],
      this.programId
    );
  }

  // --- Instruction Builders ---

  public async buildInitializePlanInstruction(params: {
    merchant: PublicKey;
    planId: string;
    amount: bigint;
    intervalSeconds: bigint;
    protocolFeeBps: number;
    crankBountyAmount: bigint;
    tokenMint: PublicKey;
    merchantTokenAccount: PublicKey;
  }): Promise<{ instruction: TransactionInstruction; planPda: PublicKey }> {
    const [planPda] = this.findMerchantPlanPda(params.merchant, params.planId);

    const instruction = await this.program.methods
      .initializePlan(
        params.planId,
        new BN(params.amount.toString()),
        new BN(params.intervalSeconds.toString()),
        params.protocolFeeBps,
        new BN(params.crankBountyAmount.toString())
      )
      .accounts({
        merchant: params.merchant,
        plan: planPda,
        tokenMint: params.tokenMint,
        merchantTokenAccount: params.merchantTokenAccount,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    return { instruction, planPda };
  }

  public async buildSubscribeInstruction(params: {
    subscriber: PublicKey;
    plan: PublicKey;
    tokenMint: PublicKey;
    subscriberTokenAccount: PublicKey;
    merchantTokenAccount: PublicKey;
    tokenProgram?: PublicKey;
  }): Promise<{ instruction: TransactionInstruction; subscriptionPda: PublicKey }> {
    const [subscriptionPda] = this.findSubscriptionRecordPda(params.plan, params.subscriber);
    const [programAuthority] = this.findProgramAuthorityPda();

    const instruction = await this.program.methods
      .subscribe()
      .accounts({
        subscriber: params.subscriber,
        plan: params.plan,
        subscription: subscriptionPda,
        subscriberTokenAccount: params.subscriberTokenAccount,
        merchantTokenAccount: params.merchantTokenAccount,
        tokenMint: params.tokenMint,
        programAuthority,
        tokenProgram: params.tokenProgram ?? TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    return { instruction, subscriptionPda };
  }

  public async buildProcessEpochInstruction(params: {
    crank: PublicKey;
    plan: PublicKey;
    subscription: PublicKey;
    subscriber: PublicKey;
    subscriberTokenAccount: PublicKey;
    merchantTokenAccount: PublicKey;
    crankTokenAccount: PublicKey;
    tokenMint: PublicKey;
    tokenProgram?: PublicKey;
  }): Promise<{ instruction: TransactionInstruction }> {
    const [programAuthority] = this.findProgramAuthorityPda();

    const instruction = await this.program.methods
      .processEpoch()
      .accounts({
        crank: params.crank,
        plan: params.plan,
        subscription: params.subscription,
        subscriberTokenAccount: params.subscriberTokenAccount,
        merchantTokenAccount: params.merchantTokenAccount,
        crankTokenAccount: params.crankTokenAccount,
        tokenMint: params.tokenMint,
        programAuthority,
        tokenProgram: params.tokenProgram ?? TOKEN_PROGRAM_ID,
      })
      .instruction();

    return { instruction };
  }

  public async buildCancelSubscriptionInstruction(params: {
    subscriber: PublicKey;
    plan: PublicKey;
  }): Promise<{ instruction: TransactionInstruction; subscriptionPda: PublicKey }> {
    const [subscriptionPda] = this.findSubscriptionRecordPda(params.plan, params.subscriber);

    const instruction = await this.program.methods
      .cancelSubscription()
      .accounts({
        subscriber: params.subscriber,
        plan: params.plan,
        subscription: subscriptionPda,
      })
      .instruction();

    return { instruction, subscriptionPda };
  }

  // --- Account Fetchers ---

  public async getMerchantPlan(planPda: PublicKey): Promise<MerchantPlan | null> {
    try {
      const account: any = await (this.program.account as any).merchantPlan.fetch(planPda);
      return {
        merchant: account.merchant.toBase58(),
        tokenMint: account.tokenMint.toBase58(),
        merchantTokenAccount: account.merchantTokenAccount.toBase58(),
        amount: BigInt(account.amount.toString()),
        intervalSeconds: BigInt(account.intervalSeconds.toString()),
        planId: account.planId,
        protocolFeeBps: account.protocolFeeBps,
        crankBountyAmount: BigInt(account.crankBountyAmount.toString()),
        isActive: account.isActive,
        bump: account.bump,
      };
    } catch {
      return null;
    }
  }

  public async getSubscriptionRecord(subscriptionPda: PublicKey): Promise<SubscriptionRecord | null> {
    try {
      const account: any = await (this.program.account as any).subscriptionRecord.fetch(subscriptionPda);
      return {
        plan: account.plan.toBase58(),
        subscriber: account.subscriber.toBase58(),
        subscriberTokenAccount: account.subscriberTokenAccount.toBase58(),
        startTimestamp: BigInt(account.startTimestamp.toString()),
        lastEpochTimestamp: BigInt(account.lastEpochTimestamp.toString()),
        nextEpochTimestamp: BigInt(account.nextEpochTimestamp.toString()),
        cycleCount: BigInt(account.cycleCount.toString()),
        isActive: account.isActive,
        bump: account.bump,
      };
    } catch {
      return null;
    }
  }
}