import {
  TIDEPAY_EVM_ABI,
  ERC20_ABI,
  EVM_DEPLOYMENTS,
  SupportedEvmChainId,
  EvmPlan,
  EvmSubscription,
} from "@tidepay/types";

export {
  TIDEPAY_EVM_ABI,
  ERC20_ABI,
  EVM_DEPLOYMENTS,
  type SupportedEvmChainId,
  type EvmPlan,
  type EvmSubscription,
};

export interface EvmWalletProvider {
  request(args: { method: string; params?: any[] }): Promise<any>;
}

export class TidePayEvmClient {
  constructor(
    public readonly chainId: SupportedEvmChainId = 11155111,
    public readonly customContractAddress?: `0x${string}`
  ) {}

  public get contractAddress(): `0x${string}` {
    if (this.customContractAddress) return this.customContractAddress;
    return (
      (EVM_DEPLOYMENTS[this.chainId]?.contractAddress as `0x${string}`) ||
      "0x0000000000000000000000000000000000000000"
    );
  }

  public get usdcAddress(): `0x${string}` {
    return (
      (EVM_DEPLOYMENTS[this.chainId]?.usdcAddress as `0x${string}`) ||
      "0x0000000000000000000000000000000000000000"
    );
  }

  public get abi() {
    return TIDEPAY_EVM_ABI;
  }

  public get erc20Abi() {
    return ERC20_ABI;
  }

  /**
   * Helper to format human amounts (e.g. 10 USDC) to 6 decimal raw BigInt.
   */
  public parseUsdc(amount: string | number): bigint {
    const parsed = typeof amount === "string" ? parseFloat(amount) : amount;
    return BigInt(Math.round(parsed * 1_000_000));
  }

  /**
   * Helper to format 6 decimal raw BigInt to string.
   */
  public formatUsdc(rawAmount: bigint): string {
    return (Number(rawAmount) / 1_000_000).toFixed(2);
  }
}
