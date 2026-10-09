"use client";

import { useMemo, type ReactNode } from "react";
import { PrivyProvider, usePrivy, useConnectWallet } from "@privy-io/react-auth";
import {
  toSolanaWalletConnectors,
  useWallets as usePrivySolanaWallets,
  useSignTransaction,
} from "@privy-io/react-auth/solana";
import {
  WalletContext,
  type WalletContextState,
} from "@solana/wallet-adapter-react";
import { WalletModalContext } from "@solana/wallet-adapter-react-ui";
import {
  PublicKey,
  Transaction,
  VersionedTransaction,
  type Connection,
  type SendOptions,
} from "@solana/web3.js";

const PRIVY_APP_ID =
  process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmv19y55j00y60fkznnp0edbw";

const solanaConnectors = toSolanaWalletConnectors({
  shouldAutoConnect: true,
});

function PrivySolanaBridge({ children }: { children: ReactNode }) {
  const { logout, ready: privyReady } = usePrivy();
  const { connectWallet } = useConnectWallet();
  const { ready: walletsReady, wallets } = usePrivySolanaWallets();
  const { signTransaction: privySignTx } = useSignTransaction();

  const solanaWallet = wallets[0] ?? null;

  const publicKey = useMemo(() => {
    if (!solanaWallet?.address) return null;
    try {
      return new PublicKey(solanaWallet.address);
    } catch {
      return null;
    }
  }, [solanaWallet?.address]);

  const connected = Boolean(publicKey);
  const connecting = !privyReady || !walletsReady;

  const signTransaction = useMemo(() => {
    if (!solanaWallet) return undefined;
    return async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
      const serialized = tx.serialize();
      const res = await privySignTx({
        transaction: serialized,
        wallet: solanaWallet,
      });
      if (tx instanceof VersionedTransaction) {
        return VersionedTransaction.deserialize(res.signedTransaction) as T;
      }
      return Transaction.from(res.signedTransaction) as T;
    };
  }, [solanaWallet, privySignTx]);

  const sendTransaction = useMemo(() => {
    return async (
      tx: Transaction | VersionedTransaction,
      connection: Connection,
      options?: SendOptions,
    ): Promise<string> => {
      if (!signTransaction) throw new Error("Wallet not connected");
      const signed = await signTransaction(tx);
      const raw = signed.serialize();
      return await connection.sendRawTransaction(raw, options);
    };
  }, [signTransaction]);

  const disconnect = async () => {
    try {
      if (solanaWallet) {
        await solanaWallet.disconnect();
      }
    } catch {
      // Ignore disconnect error
    }
    try {
      await logout();
    } catch {
      // Ignore logout error
    }
  };

  const walletContextValue: WalletContextState = {
    autoConnect: true,
    wallets: [],
    wallet: solanaWallet
      ? ({
          adapter: {
            name:
              (solanaWallet as unknown as { walletClientType?: string })
                .walletClientType || "Solana Wallet",
            url: "https://privy.io",
            icon: "",
            publicKey,
            connecting: false,
            connected: true,
            ready: true,
            connect: async () => {},
            disconnect,
            sendTransaction,
          },
          readyState: "Installed",
        } as unknown as WalletContextState["wallet"])
      : null,
    publicKey,
    connecting,
    connected,
    disconnecting: false,
    select: () => {},
    connect: async () => {
      connectWallet();
    },
    disconnect,
    sendTransaction,
    signTransaction: signTransaction as WalletContextState["signTransaction"],
    signAllTransactions: undefined,
    signMessage: undefined,
    signIn: undefined,
  };

  const walletModalContextValue = {
    visible: false,
    setVisible: (visible: boolean) => {
      if (visible) {
        connectWallet();
      }
    },
  };

  return (
    <WalletContext.Provider value={walletContextValue}>
      <WalletModalContext.Provider value={walletModalContextValue}>
        {children}
      </WalletModalContext.Provider>
    </WalletContext.Provider>
  );
}

export function PrivyAppProvider({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#00BFB3",
          walletChainType: "solana-only",
          walletList: ["detected_solana_wallets"],
          showWalletLoginFirst: true,
        },
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
      }}
    >
      <PrivySolanaBridge>{children}</PrivySolanaBridge>
    </PrivyProvider>
  );
}
