import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";
import { TidePayClient } from "@tidepay/sdk";
import { TIDEPAY_PROGRAM_ID } from "@tidepay/types";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || "10000", 10);
const DEFAULT_KEYPAIR_PATH = path.join(
  process.env.HOME || "",
  ".config/solana/id.json"
);

function loadKeypair(): Keypair {
  const keypairPath = process.env.CRANK_KEYPAIR_PATH || DEFAULT_KEYPAIR_PATH;
  if (fs.existsSync(keypairPath)) {
    const secret = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
    return Keypair.fromSecretKey(new Uint8Array(secret));
  }
  console.warn(
    `[TidePay Crank] Warning: Keypair not found at ${keypairPath}. Generating ephemeral test keypair.`
  );
  return Keypair.generate();
}

export class TidePayCrankWorker {
  private connection: Connection;
  private crankKeypair: Keypair;
  private client: TidePayClient;
  private inFlightLocks: Set<string> = new Set();
  private isRunning: boolean = false;

  constructor() {
    this.connection = new Connection(RPC_URL, "confirmed");
    this.crankKeypair = loadKeypair();
    this.client = new TidePayClient(
      this.connection,
      {
        publicKey: this.crankKeypair.publicKey,
        signTransaction: async <T extends Transaction>(tx: T) => {
          tx.partialSign(this.crankKeypair);
          return tx;
        },
      },
      TIDEPAY_PROGRAM_ID
    );
  }

  public async start(): Promise<void> {
    this.isRunning = true;
    console.log("==========================================");
    console.log("🌊 [TidePay Keeper Crank] Worker Started");
    console.log(`📡 RPC Endpoint: ${RPC_URL}`);
    console.log(`🔑 Keeper Public Key: ${this.crankKeypair.publicKey.toBase58()}`);
    console.log(`⏱️ Polling Interval: ${POLL_INTERVAL_MS / 1000}s`);
    console.log("==========================================");

    while (this.isRunning) {
      try {
        await this.pollAndExecute();
      } catch (err) {
        console.error("[TidePay Crank] Polling error:", err);
      }
      await new Promise((res) => setTimeout(res, POLL_INTERVAL_MS));
    }
  }

  public stop(): void {
    console.log("[TidePay Crank] Stopping worker...");
    this.isRunning = false;
  }

  private async pollAndExecute(): Promise<void> {
    const currentTime = BigInt(Math.floor(Date.now() / 1000));

    // Fetch all subscription records from the program
    const accounts = await (this.client.program.account as any).subscriptionRecord.all();

    const dueSubscriptions = accounts.filter((item: any) => {
      const record = item.account;
      const nextEpoch = BigInt(record.nextEpochTimestamp.toString());
      return record.isActive && nextEpoch <= currentTime;
    });

    if (dueSubscriptions.length === 0) {
      return;
    }

    console.log(
      `[TidePay Crank] Found ${dueSubscriptions.length} due subscription(s) at epoch timestamp ${currentTime}`
    );

    for (const sub of dueSubscriptions) {
      const subPubkeyStr = sub.publicKey.toBase58();

      // In-flight concurrency lock check
      if (this.inFlightLocks.has(subPubkeyStr)) {
        continue;
      }

      this.processDueSubscription(sub).catch((err) => {
        console.error(`[TidePay Crank] Failed to process ${subPubkeyStr}:`, err);
      });
    }
  }

  private async processDueSubscription(sub: any): Promise<void> {
    const subPubkey: PublicKey = sub.publicKey;
    const subPubkeyStr = subPubkey.toBase58();
    this.inFlightLocks.add(subPubkeyStr);

    try {
      const planPubkey: PublicKey = sub.account.plan;
      const plan = await this.client.getMerchantPlan(planPubkey);
      if (!plan || !plan.isActive) {
        return;
      }

      const tokenMint = new PublicKey(plan.tokenMint);
      const merchantTokenAccount = new PublicKey(plan.merchantTokenAccount);
      const subscriberTokenAccount = new PublicKey(sub.account.subscriberTokenAccount);

      // Crank keeper's token account for bounty rewards
      const crankTokenAccount = getAssociatedTokenAddressSync(
        tokenMint,
        this.crankKeypair.publicKey
      );

      const tx = new Transaction();

      // Ensure crank ATA exists
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          this.crankKeypair.publicKey,
          crankTokenAccount,
          this.crankKeypair.publicKey,
          tokenMint
        )
      );

      // Add processEpoch instruction
      const { instruction } = await this.client.buildProcessEpochInstruction({
        crank: this.crankKeypair.publicKey,
        plan: planPubkey,
        subscription: subPubkey,
        subscriber: new PublicKey(sub.account.subscriber),
        subscriberTokenAccount,
        merchantTokenAccount,
        crankTokenAccount,
        tokenMint,
      });
      tx.add(instruction);

      // Submit with retry & exponential backoff
      await this.executeWithRetry(tx);
      console.log(`✅ [TidePay Crank] Successfully settled epoch for subscription: ${subPubkeyStr}`);
    } finally {
      this.inFlightLocks.delete(subPubkeyStr);
    }
  }

  private async executeWithRetry(
    tx: Transaction,
    maxRetries: number = 3
  ): Promise<string> {
    let delay = 1000;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const signature = await sendAndConfirmTransaction(
          this.connection,
          tx,
          [this.crankKeypair],
          { commitment: "confirmed" }
        );
        return signature;
      } catch (err: any) {
        if (attempt === maxRetries) {
          throw err;
        }
        console.warn(
          `[TidePay Crank] Attempt ${attempt} failed: ${err.message}. Retrying in ${delay}ms...`
        );
        await new Promise((res) => setTimeout(res, delay));
        delay *= 2;
      }
    }
    throw new Error("Exhausted retries");
  }
}

// Run as standalone worker when executed directly
if (process.argv[1] && process.argv[1].includes("crank")) {
  const worker = new TidePayCrankWorker();
  process.on("SIGINT", () => {
    worker.stop();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    worker.stop();
    process.exit(0);
  });
  worker.start().catch((err) => {
    console.error("[TidePay Crank] Fatal worker crash:", err);
    process.exit(1);
  });
}