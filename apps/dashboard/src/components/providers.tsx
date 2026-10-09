"use client";

import type { ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

const ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl("devnet");

// Phantom, Solflare and Backpack register through the Wallet Standard,
// so no explicit adapters are needed.
const WALLETS: never[] = [];

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={WALLETS} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
