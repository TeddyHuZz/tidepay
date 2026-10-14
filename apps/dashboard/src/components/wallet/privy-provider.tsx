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
  solanaWallet: any | null;
  hasSolanaWallet: boolean;
  hasEvmWallet: boolean;
  evmChainId: number;
  switchEvmChain: (chainId: number) => Promise<void>;
  switchChainType: (type: "solana" | "evm") => void;
  connect: (chainPreference?: "solana" | "evm") => void | Promise<void>;
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
  solanaWallet: null,
  hasSolanaWallet: false,
  hasEvmWallet: false,
  evmChainId: 84532,
  switchEvmChain: async () => {},
  switchChainType: () => {},
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

  const [activeChainType, setActiveChainType] = useState<"solana" | "evm" | null>(() => {
    if (typeof window === "undefined") return null;
    return (sessionStorage.getItem("tidepay_active_chain") as "solana" | "evm" | null) ?? null;
  });

  const [selectedEvmChainId, setSelectedEvmChainId] = useState<number>(() => {
    if (typeof window === "undefined") return 84532;
    const saved = sessionStorage.getItem("tidepay_evm_chain_id");
    return saved ? parseInt(saved, 10) : 84532;
  });

  const [manuallyDisconnected, setManuallyDisconnected] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("tidepay_wallet_disconnected") === "true";
  });

  const [activeWalletAddress, setActiveWalletAddress] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("tidepay_active_wallet");
  });

  const { connectWallet } = useConnectWallet({
    onSuccess: (params: any) => {
      // In Privy SDK, params is { wallet: BaseConnectedWallet }
      const w = params?.wallet ?? params;
      const addr = w?.address ? String(w.address) : "";
      const isEvm =
        w?.type === "ethereum" ||
        w?.chainType === "ethereum" ||
        addr.startsWith("0x");
      const normalizedAddr = isEvm ? addr.toLowerCase() : addr;
      const detectedChainType: "solana" | "evm" = isEvm ? "evm" : "solana";

      setActiveWalletAddress(normalizedAddr);
      setActiveChainType(detectedChainType);
      setManuallyDisconnected(false);

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("tidepay_wallet_disconnected");
        if (normalizedAddr) {
          sessionStorage.setItem("tidepay_active_wallet", normalizedAddr);
          sessionStorage.setItem("tidepay_active_chain", detectedChainType);
        }
      }
    },
  });

  const hasSolanaWallet = solanaWallets.length > 0;
  const hasEvmWallet = evmWallets.length > 0;

  const solanaWallet = useMemo(() => {
    if (manuallyDisconnected || solanaWallets.length === 0) return null;
    if (activeChainType === "evm") return null;
    if (activeWalletAddress) {
      if (activeWalletAddress.startsWith("0x")) return null;
      return solanaWallets.find((w) => w.address === activeWalletAddress) ?? solanaWallets[0];
    }
    if (activeChainType === "solana") return solanaWallets[0] ?? null;
    if (evmWallets.length === 0) return solanaWallets[0] ?? null;
    return null;
  }, [manuallyDisconnected, activeWalletAddress, activeChainType, solanaWallets, evmWallets.length]);

  const evmWallet = useMemo(() => {
    if (manuallyDisconnected || evmWallets.length === 0) return null;
    if (activeChainType === "solana") return null;
    if (activeWalletAddress) {
      if (!activeWalletAddress.startsWith("0x")) return null;
      return (
        evmWallets.find((w) => w.address.toLowerCase() === activeWalletAddress.toLowerCase()) ??
        evmWallets[0]
      );
    }
    if (activeChainType === "evm") return evmWallets[0] ?? null;
    if (solanaWallets.length === 0) return evmWallets[0] ?? null;
    return null;
  }, [manuallyDisconnected, activeWalletAddress, activeChainType, evmWallets, solanaWallets.length]);

  const solanaPublicKey = useMemo(() => {
    if (manuallyDisconnected || !solanaWallet?.address) return null;
    try {
      return new PublicKey(solanaWallet.address);
    } catch {
      return null;
    }
  }, [manuallyDisconnected, solanaWallet?.address]);

  const rawEvmAddress = useMemo(() => {
    if (manuallyDisconnected || !evmWallet?.address) return null;
    return evmWallet.address.toLowerCase() as `0x${string}`;
  }, [manuallyDisconnected, evmWallet?.address]);

  const chainType: "solana" | "evm" | null = useMemo(() => {
    if (manuallyDisconnected) return null;
    if (activeChainType === "solana" && solanaPublicKey) return "solana";
    if (activeChainType === "evm" && rawEvmAddress) return "evm";
    if (activeWalletAddress && !activeWalletAddress.startsWith("0x") && solanaPublicKey) return "solana";
    if (activeWalletAddress?.startsWith("0x") && rawEvmAddress) return "evm";
    if (solanaPublicKey && !rawEvmAddress) return "solana";
    if (rawEvmAddress && !solanaPublicKey) return "evm";
    if (solanaPublicKey) return "solana";
    if (rawEvmAddress) return "evm";
    return null;
  }, [manuallyDisconnected, activeChainType, activeWalletAddress, rawEvmAddress, solanaPublicKey]);

  const publicKey = chainType === "solana" ? solanaPublicKey : null;
  const evmAddress = chainType === "evm" ? rawEvmAddress : null;

  const activeAddress =
    chainType === "evm"
      ? rawEvmAddress
      : chainType === "solana"
      ? solanaPublicKey?.toBase58() ?? null
      : null;

  const connected = Boolean(activeAddress);
  const connecting = !privyReady || !solanaWalletsReady || !evmWalletsReady;

  const evmChainId = useMemo(() => {
    if (evmWallet?.chainId) {
      const raw = String(evmWallet.chainId);
      const parsed = raw.includes(":") ? parseInt(raw.split(":")[1], 10) : Number(raw);
      if (!isNaN(parsed) && (parsed === 84532 || parsed === 11155111)) {
        return parsed;
      }
    }
    return selectedEvmChainId;
  }, [evmWallet?.chainId, selectedEvmChainId]);

  const switchEvmChain = async (targetChainId: number) => {
    setSelectedEvmChainId(targetChainId);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("tidepay_evm_chain_id", String(targetChainId));
    }
    if (evmWallet && typeof evmWallet.switchChain === "function") {
      try {
        await evmWallet.switchChain(targetChainId);
      } catch (err) {
        console.warn("[TidePay] EVM switchChain notice:", err);
      }
    }
  };

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
      sessionStorage.removeItem("tidepay_active_chain");
    }
    setManuallyDisconnected(true);
    setActiveWalletAddress(null);
    setActiveChainType(null);
    try {
      if (solanaWallet) await solanaWallet.disconnect();
    } catch {}
    try {
      if (evmWallet && typeof evmWallet.disconnect === "function" && evmWallet.walletClientType !== "metamask") {
        await evmWallet.disconnect();
      }
    } catch {}
    try {
      if (authenticated) await logout();
    } catch {}
  };

  const switchChainType = (type: "solana" | "evm") => {
    setActiveChainType(type);
    setManuallyDisconnected(false);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("tidepay_wallet_disconnected");
      sessionStorage.setItem("tidepay_active_chain", type);
    }
    if (type === "solana") {
      const addr = solanaWallets[0]?.address ?? null;
      setActiveWalletAddress(addr);
      if (typeof window !== "undefined" && addr) {
        sessionStorage.setItem("tidepay_active_wallet", addr);
      }
    } else {
      const addr = evmWallets[0]?.address ? evmWallets[0].address.toLowerCase() : null;
      setActiveWalletAddress(addr);
      if (typeof window !== "undefined" && addr) {
        sessionStorage.setItem("tidepay_active_wallet", addr);
      }
    }
  };

  const handleConnect = async (chainPreference?: "solana" | "evm") => {
    connectWallet({
      walletList: [
        "phantom",
        "metamask",
        "coinbase_wallet",
        "solflare",
        "backpack",
        "rainbow",
      ],
      walletChainType:
        chainPreference === "solana"
          ? "solana-only"
          : chainPreference === "evm"
          ? "ethereum-only"
          : "ethereum-and-solana",
    });
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
      if (visible) void handleConnect();
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
    solanaWallet,
    hasSolanaWallet,
    hasEvmWallet,
    evmChainId,
    switchEvmChain,
    switchChainType,
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
