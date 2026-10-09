"use client";

import { useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  type TransactionInstruction,
} from "@solana/web3.js";

/** Signs with the connected wallet, sends and waits for confirmation. */
export function useSendTransaction() {
  const { connection } = useConnection();
  const { signTransaction, sendTransaction } = useWallet();

  const buildTransaction = useCallback(
    async (payer: PublicKey, instructions: TransactionInstruction[]) => {
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      const message = new TransactionMessage({ payerKey: payer, recentBlockhash: blockhash, instructions }).compileToV0Message();
      return new VersionedTransaction(message);
    },
    [connection],
  );

  const send = useCallback(
    async (tx: VersionedTransaction): Promise<string> => {
      const { lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

      // Sign then send ourselves so transactions the API pre-signed as fee
      // payer keep that signature.
      const signature = signTransaction
        ? await connection.sendRawTransaction((await signTransaction(tx)).serialize())
        : await sendTransaction(tx, connection);

      const confirmation = await connection.confirmTransaction(
        { signature, blockhash: tx.message.recentBlockhash, lastValidBlockHeight },
        "confirmed",
      );
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      return signature;
    },
    [connection, signTransaction, sendTransaction],
  );

  return { buildTransaction, send };
}
