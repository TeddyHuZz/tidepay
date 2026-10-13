"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  PrivyProvider,
  usePrivy,
  useConnectWallet,
  useWallets as usePrivyEvmWallets,
} from "@privy-io/react-auth";
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

// Standard EVM Chain configurations for Privy
const sepoliaChain = {
  id: 11155111,
  name: "Sepolia",
  network: "sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.sepolia.org"] },
  },
  blockExplorers: {
    default: { name: "Etherscan", url: "https://sepolia.etherscan.io" },
  },
};

const baseSepoliaChain = {
  id: 84532,
  name: "Base Sepolia",
  network: "base-sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia.base.org"] },
  },
  blockExplorers: {
    default: { name: "Basescan", url: "https://sepolia.basescan.org" },
  },
};

export interface TidePayUnifiedWalletState {
  chainType: "solana" | "evm" | null;
  solanaPublicKey: PublicKey | null;
  evmAddress: `0x${string}` | null;
  activeAddress: string | null;
  connected: boolean;
  connecting: boolean;
  evmWallet: any | null;
  connect: (chainPreference?: "solana" | "evm") => void;
  disconnect: () => Promise<void>;
}

const TidePayUnifiedWalletContext = createContext<TidePayUnifiedWalletState>({
  chainType: null,
  solanaPublicKey: null,
  evmAddress: null,
  activeAddress: null,
  connected: false,
  connecting: false,
  evmWallet: null,
  connect: () => {},
  disconnect: async () => {},
});

export function useTidePayUnifiedWallet(): TidePayUnifiedWalletState {
  return useContext(TidePayUnifiedWalletContext);
}

function PrivyBridge({ children }: { children: ReactNode }) {
  const { logout, ready: privyReady, authenticated } = usePrivy();
  const { ready: solanaWalletsReady, wallets: solanaWallets } = usePrivySolanaWallets();
  const { ready: evmWalletsReady, wallets: evmWallets } = usePrivyEvmWallets();
  const { signTransaction: privySignTx } = useSignTransaction();

  const [manuallyDisconnected, setManuallyDisconnected] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("tidepay_wallet_disconnected") === "true";
  });

  const [activeWalletAddress, setActiveWalletAddress] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("tidepay_active_wallet");
  });

  const { connectWallet } = useConnectWallet({
    onSuccess: (wallet: any) => {
      const addr = wallet.address ? wallet.address.toLowerCase() : "";
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("tidepay_wallet_disconnected");
        if (addr) sessionStorage.setItem("tidepay_active_wallet", addr);
      }
      setManuallyDisconnected(false);
      setActiveWalletAddress(addr);
    },
  });

  const solanaWallet = useMemo(() => {
    if (manuallyDisconnected) return null;
    if (activeWalletAddress) {
      return solanaWallets.find((w) => w.address.toLowerCase() === activeWalletAddress) ?? null;
    }
    // Only auto-connect if user hasn't explicitly disconnected
    return solanaWallets[0] ?? null;
  }, [manuallyDisconnected, activeWalletAddress, solanaWallets]);

  const evmWallet = useMemo(() => {
    if (manuallyDisconnected) return null;
    if (activeWalletAddress) {
      return evmWallets.find((w) => w.address.toLowerCase() === activeWalletAddress) ?? null;
    }
    // If no explicit wallet was picked, only pick EVM if no Solana wallet is present AND user didn't disconnect
    return solanaWallet ? null : (evmWallets[0] ?? null);
  }, [manuallyDisconnected, activeWalletAddress, evmWallets, solanaWallet]);

  const publicKey = useMemo(() => {
    if (manuallyDisconnected || !solanaWallet?.address) return null;
    try {
      return new PublicKey(solanaWallet.address);
    } catch {
      return null;
    }
  }, [manuallyDisconnected, solanaWallet?.address]);

  const evmAddress = useMemo(() => {
    if (manuallyDisconnected || !evmWallet?.address) return null;
    return evmWallet.address.toLowerCase() as `0x${string}`;
  }, [manuallyDisconnected, evmWallet?.address]);

  const chainType: "solana" | "evm" | null = publicKey
    ? "solana"
    : evmAddress
    ? "evm"
    : null;

  const activeAddress = publicKey ? publicKey.toBase58() : evmAddress;
  const connected = Boolean(publicKey || evmAddress);
  const connecting = !privyReady || !solanaWalletsReady || !evmWalletsReady;

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
    if (typeof window !== "undefined") {
      sessionStorage.setItem("tidepay_wallet_disconnected", "true");
      sessionStorage.removeItem("tidepay_active_wallet");
    }
    setManuallyDisconnected(true);
    setActiveWalletAddress(null);
    try {
      if (solanaWallet) await solanaWallet.disconnect();
    } catch {}
    try {
      if (evmWallet) await evmWallet.disconnect();
    } catch {}
    try {
      if (authenticated) await logout();
    } catch {}
  };

  const handleConnect = (chainPreference?: "solana" | "evm") => {
    // Note: Do not clear manuallyDisconnected here.
    // The user has only opened the modal; the selection is confirmed inside onSuccess.
    if (chainPreference === "solana") {
      connectWallet({
        walletList: ["phantom", "solflare", "backpack"],
        walletChainType: "solana-only",
      });
    } else if (chainPreference === "evm") {
      connectWallet({
        walletList: ["metamask", "coinbase_wallet", "rainbow"],
        walletChainType: "ethereum-only",
      });
    } else {
      connectWallet({
        walletList: [
          "phantom",
          "metamask",
          "coinbase_wallet",
          "solflare",
          "backpack",
          "rainbow",
        ],
        walletChainType: "ethereum-and-solana",
      });
    }
  };

  // Solana Wallet Adapter bridge (backward-compatible)
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
    connected: Boolean(publicKey),
    disconnecting: false,
    select: () => {},
    connect: async () => handleConnect("solana"),
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
      if (visible) handleConnect();
    },
  };

  const unifiedContextValue: TidePayUnifiedWalletState = {
    chainType,
    solanaPublicKey: publicKey,
    evmAddress,
    activeAddress,
    connected,
    connecting,
    evmWallet,
    connect: handleConnect,
    disconnect,
  };

  return (
    <TidePayUnifiedWalletContext.Provider value={unifiedContextValue}>
      <WalletContext.Provider value={walletContextValue}>
        <WalletModalContext.Provider value={walletModalContextValue}>
          {children}
        </WalletModalContext.Provider>
      </WalletContext.Provider>
    </TidePayUnifiedWalletContext.Provider>
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
          walletChainType: "ethereum-and-solana",
          walletList: [
            "phantom",
            "metamask",
            "coinbase_wallet",
            "solflare",
            "backpack",
            "rainbow",
          ],
          showWalletLoginFirst: true,
        },
        defaultChain: baseSepoliaChain,
        supportedChains: [baseSepoliaChain, sepoliaChain],
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
      }}
    >
      <PrivyBridge>{children}</PrivyBridge>
    </PrivyProvider>
  );
}
