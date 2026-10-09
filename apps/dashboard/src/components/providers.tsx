"use client";

import type { ReactNode } from "react";
import { Buffer } from "buffer";
import { ConnectionProvider } from "@solana/wallet-adapter-react";
import { PrivyAppProvider } from "@/components/wallet/privy-provider";
import { ToastProvider } from "@/components/ui/toast";
import { RPC_URL } from "@/lib/chain/config";

// @tidepay/sdk and Anchor use Node's global Buffer, which browsers lack.
if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConnectionProvider endpoint={RPC_URL}>
      <PrivyAppProvider>
        <ToastProvider>{children}</ToastProvider>
      </PrivyAppProvider>
    </ConnectionProvider>
  );
}
