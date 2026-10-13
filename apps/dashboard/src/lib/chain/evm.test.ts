import { describe, it, expect } from "vitest";
import {
  TIDEPAY_EVM_ABI,
  ERC20_ABI,
  EVM_DEPLOYMENTS,
  TidePayEvmClient,
} from "@tidepay/sdk";

describe("TidePay EVM Integration Suite", () => {
  it("exports valid ABI functions for the smart contract", () => {
    const functionNames = TIDEPAY_EVM_ABI.filter(
      (item) => item.type === "function"
    ).map((item: any) => item.name);

    expect(functionNames).toContain("createPlan");
    expect(functionNames).toContain("subscribe");
    expect(functionNames).toContain("subscribeWithPermit");
    expect(functionNames).toContain("processEpoch");
    expect(functionNames).toContain("cancelSubscription");
    expect(functionNames).toContain("getPlanKey");
    expect(functionNames).toContain("getSubKey");
    expect(functionNames).toContain("getMerchantPlanKeys");
    expect(functionNames).toContain("getPlanSubscribers");
  });

  it("exports valid ERC20 ABI functions", () => {
    const erc20FunctionNames = ERC20_ABI.filter(
      (item) => item.type === "function"
    ).map((item: any) => item.name);

    expect(erc20FunctionNames).toContain("approve");
    expect(erc20FunctionNames).toContain("allowance");
    expect(erc20FunctionNames).toContain("balanceOf");
  });

  it("includes official Circle testnet USDC deployments", () => {
    // Sepolia L1
    expect(EVM_DEPLOYMENTS[11155111].usdcAddress.toLowerCase()).toBe(
      "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238"
    );
    // Base Sepolia L2
    expect(EVM_DEPLOYMENTS[84532].usdcAddress.toLowerCase()).toBe(
      "0x036cbd53842c5426634e7929541ec2318f3dcf7e"
    );
  });

  it("TidePayEvmClient parses and formats USDC correctly with 6 decimals", () => {
    const client = new TidePayEvmClient(11155111);

    expect(client.parseUsdc("10.50")).toBe(BigInt("10500000"));
    expect(client.parseUsdc(25)).toBe(BigInt("25000000"));
    expect(client.formatUsdc(BigInt("10500000"))).toBe("10.50");
    expect(client.formatUsdc(BigInt("500000"))).toBe("0.50");
  });

  it("TidePayEvmClient resolves correct USDC address based on chainId", () => {
    const sepoliaClient = new TidePayEvmClient(11155111);
    const baseClient = new TidePayEvmClient(84532);

    expect(sepoliaClient.usdcAddress).toBe(
      "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
    );
    expect(baseClient.usdcAddress).toBe(
      "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    );
  });

  it("fetchEvmMerchantPlans returns empty arrays when contract is not configured", async () => {
    const { fetchEvmMerchantPlans } = await import("./accounts");
    const res = await fetchEvmMerchantPlans(
      "0x2c0000000000000000000000000000000000798e",
      11155111,
      "0x0000000000000000000000000000000000000000"
    );
    expect(res.plans).toEqual([]);
    expect(res.subscriptions).toEqual([]);
  });
});
