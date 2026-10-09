"use client";

import type { ReactNode } from "react";
import { Buffer } from "buffer";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { RPC_URL } from "@/lib/chain/config";
import "@solana/wallet-adapter-react-ui/styles.css";

// @tidepay/sdk and Anchor use Node's global Buffer, which browsers lack.
if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer;
}

// Phantom, Solflare and Backpack register through the Wallet Standard,
// so no explicit adapters are needed.
const WALLETS: never[] = [];

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={WALLETS} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
