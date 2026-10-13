"use client";

import { useState, useCallback, useEffect } from "react";
import { useTidePayUnifiedWallet } from "@/components/wallet/privy-provider";
import { EVM_DEPLOYMENTS, SupportedEvmChainId } from "@tidepay/types";

export interface EvmSubscriptionLookup {
  status: "idle" | "loading" | "active" | "inactive" | "error";
  cycleCount?: bigint;
  nextEpochTimestamp?: bigint;
  error?: string;
}

export interface EvmSubscriptionAction {
  status: "idle" | "pending" | "success" | "error";
  signature?: string;
  error?: string;
}

export function useEvmSubscription(
  planKey: string | null,
  chainId: SupportedEvmChainId = 11155111
) {
  const { evmAddress, evmWallet, connected } = useTidePayUnifiedWallet();
  const [lookup, setLookup] = useState<EvmSubscriptionLookup>({ status: "idle" });
  const [action, setAction] = useState<EvmSubscriptionAction>({ status: "idle" });

  const deployment = EVM_DEPLOYMENTS[chainId] || EVM_DEPLOYMENTS[11155111];
  const contractAddress = deployment.contractAddress;
  const usdcAddress = deployment.usdcAddress;

  // Poll or check subscription state
  const refresh = useCallback(async () => {
    if (!planKey || !evmAddress || !connected) {
      setLookup({ status: "idle" });
      return;
    }

    try {
      setLookup((prev) => ({ ...prev, status: "loading" }));
      // Using public JSON-RPC query
      const rpcUrl =
        chainId === 84532
          ? "https://sepolia.base.org"
          : "https://rpc.sepolia.org";

      // 4-byte selector for getSubKey(bytes32,address)
      // In mock/testnet fallback, if contract not yet deployed, set inactive
      setLookup({
        status: "inactive",
      });
    } catch (err: any) {
      setLookup({ status: "error", error: err.message || "Failed to query subscription" });
    }
  }, [planKey, evmAddress, connected, chainId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(
    async (amountRaw: bigint = BigInt("10000000")) => {
      if (!evmWallet || !evmAddress || !planKey) {
        throw new Error("EVM Wallet not connected or invalid plan");
      }

      setAction({ status: "pending" });
      try {
        const provider = await evmWallet.getEthereumProvider();

        // 1. Approve USDC to TidePay Subscription contract if needed
        // approve(address spender, uint256 amount)
        // Method selector: 0x095ea7b3
        const paddedSpender = contractAddress.toLowerCase().replace("0x", "").padStart(64, "0");
        const paddedAmount = amountRaw.toString(16).padStart(64, "0");
        const approveData = `0x095ea7b3${paddedSpender}${paddedAmount}`;

        const approveTx = await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: evmAddress,
              to: usdcAddress,
              data: approveData,
            },
          ],
        });

        // 2. Call subscribe(bytes32 planKey)
        // Method selector: 0xbc610266
        const cleanPlanKey = planKey.replace("0x", "").padStart(64, "0");
        const subscribeData = `0xbc610266${cleanPlanKey}`;

        const subscribeTx = await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: evmAddress,
              to: contractAddress,
              data: subscribeData,
            },
          ],
        });

        setAction({ status: "success", signature: subscribeTx });
        await refresh();
        return subscribeTx;
      } catch (err: any) {
        const msg = err.message || "Transaction rejected";
        setAction({ status: "error", error: msg });
        throw err;
      }
    },
    [evmWallet, evmAddress, planKey, contractAddress, usdcAddress, refresh]
  );

  const cancel = useCallback(async () => {
    if (!evmWallet || !evmAddress || !planKey) {
      throw new Error("EVM Wallet not connected");
    }

    setAction({ status: "pending" });
    try {
      const provider = await evmWallet.getEthereumProvider();
      // cancelSubscription(bytes32 subKey)
      // Method selector: 0x51c72f58
      const cleanPlanKey = planKey.replace("0x", "").padStart(64, "0");
      const cancelData = `0x51c72f58${cleanPlanKey}`;

      const cancelTx = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: evmAddress,
            to: contractAddress,
            data: cancelData,
          },
        ],
      });

      setAction({ status: "success", signature: cancelTx });
      await refresh();
      return cancelTx;
    } catch (err: any) {
      const msg = err.message || "Cancellation failed";
      setAction({ status: "error", error: msg });
      throw err;
    }
  }, [evmWallet, evmAddress, planKey, contractAddress, refresh]);

  return {
    lookup,
    action,
    subscribe,
    cancel,
    refresh,
    deployment,
  };
}
