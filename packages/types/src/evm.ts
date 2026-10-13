/**
 * TidePay EVM Subscription Contract ABI and Constants
 */

export const TIDEPAY_EVM_ABI = [
  {
    type: "constructor",
    inputs: [
      { name: "_feeRecipient", type: "address", internalType: "address" },
      { name: "_feeBps", type: "uint256", internalType: "uint256" }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "createPlan",
    inputs: [
      { name: "planId", type: "string", internalType: "string" },
      { name: "token", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "intervalSeconds", type: "uint64", internalType: "uint64" },
      { name: "crankBountyAmount", type: "uint256", internalType: "uint256" }
    ],
    outputs: [{ name: "planKey", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "subscribe",
    inputs: [{ name: "planKey", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "subKey", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "subscribeWithPermit",
    inputs: [
      { name: "planKey", type: "bytes32", internalType: "bytes32" },
      { name: "permitAmount", type: "uint256", internalType: "uint256" },
      { name: "deadline", type: "uint256", internalType: "uint256" },
      { name: "v", type: "uint8", internalType: "uint8" },
      { name: "r", type: "bytes32", internalType: "bytes32" },
      { name: "s", type: "bytes32", internalType: "bytes32" }
    ],
    outputs: [{ name: "subKey", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "processEpoch",
    inputs: [
      { name: "subKey", type: "bytes32", internalType: "bytes32" },
      { name: "keeperRecipient", type: "address", internalType: "address" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "cancelSubscription",
    inputs: [{ name: "subKey", type: "bytes32", internalType: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "getPlanKey",
    inputs: [
      { name: "merchant", type: "address", internalType: "address" },
      { name: "planId", type: "string", internalType: "string" }
    ],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "pure"
  },
  {
    type: "function",
    name: "getSubKey",
    inputs: [
      { name: "planKey", type: "bytes32", internalType: "bytes32" },
      { name: "subscriber", type: "address", internalType: "address" }
    ],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "pure"
  },
  {
    type: "function",
    name: "plans",
    inputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      { name: "merchant", type: "address", internalType: "address" },
      { name: "token", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "intervalSeconds", type: "uint64", internalType: "uint64" },
      { name: "crankBountyAmount", type: "uint256", internalType: "uint256" },
      { name: "planId", type: "string", internalType: "string" },
      { name: "isActive", type: "bool", internalType: "bool" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "subscriptions",
    inputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      { name: "planKey", type: "bytes32", internalType: "bytes32" },
      { name: "subscriber", type: "address", internalType: "address" },
      { name: "merchant", type: "address", internalType: "address" },
      { name: "startTimestamp", type: "uint64", internalType: "uint64" },
      { name: "lastEpochTimestamp", type: "uint64", internalType: "uint64" },
      { name: "nextEpochTimestamp", type: "uint64", internalType: "uint64" },
      { name: "cycleCount", type: "uint64", internalType: "uint64" },
      { name: "isActive", type: "bool", internalType: "bool" }
    ],
    stateMutability: "view"
  },
  {
    type: "event",
    name: "PlanCreated",
    inputs: [
      { name: "planKey", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "merchant", type: "address", indexed: true, internalType: "address" },
      { name: "planId", type: "string", indexed: false, internalType: "string" },
      { name: "token", type: "address", indexed: false, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "intervalSeconds", type: "uint64", indexed: false, internalType: "uint64" },
      { name: "crankBountyAmount", type: "uint256", indexed: false, internalType: "uint256" }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Subscribed",
    inputs: [
      { name: "subKey", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "planKey", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "subscriber", type: "address", indexed: true, internalType: "address" },
      { name: "merchant", type: "address", indexed: false, internalType: "address" },
      { name: "startTimestamp", type: "uint64", indexed: false, internalType: "uint64" },
      { name: "nextEpochTimestamp", type: "uint64", indexed: false, internalType: "uint64" }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "EpochProcessed",
    inputs: [
      { name: "subKey", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "planKey", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "subscriber", type: "address", indexed: true, internalType: "address" },
      { name: "merchant", type: "address", indexed: false, internalType: "address" },
      { name: "cycleCount", type: "uint64", indexed: false, internalType: "uint64" },
      { name: "keeperRecipient", type: "address", indexed: false, internalType: "address" },
      { name: "keeperBounty", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "netMerchantAmount", type: "uint256", indexed: false, internalType: "uint256" }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "SubscriptionCancelled",
    inputs: [
      { name: "subKey", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "planKey", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "cancelledBy", type: "address", indexed: true, internalType: "address" },
      { name: "timestamp", type: "uint64", indexed: false, internalType: "uint64" }
    ],
    anonymous: false
  }
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable"
  }
] as const;

/**
 * Verified Official Testnet Deployments & Addresses
 */
export const EVM_DEPLOYMENTS = {
  // Ethereum Sepolia (L1 Testnet)
  11155111: {
    name: "Sepolia",
    chainType: "ethereum",
    usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Official Circle Sepolia USDC
    contractAddress: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Configurable deployed contract
    blockExplorer: "https://sepolia.etherscan.io"
  },
  // Base Sepolia (L2 Testnet)
  84532: {
    name: "Base Sepolia",
    chainType: "base",
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Official Circle Base Sepolia USDC
    contractAddress: "0x254dffcd3277C0b1660F6d42EFbB754edaBAbC2B", // Configurable deployed contract
    blockExplorer: "https://sepolia.basescan.org"
  }
} as const;

export type SupportedEvmChainId = keyof typeof EVM_DEPLOYMENTS;

export interface EvmPlan {
  planKey: `0x${string}`;
  merchant: `0x${string}`;
  token: `0x${string}`;
  amount: bigint;
  intervalSeconds: bigint;
  crankBountyAmount: bigint;
  planId: string;
  isActive: boolean;
}

export interface EvmSubscription {
  subKey: `0x${string}`;
  planKey: `0x${string}`;
  subscriber: `0x${string}`;
  merchant: `0x${string}`;
  startTimestamp: bigint;
  lastEpochTimestamp: bigint;
  nextEpochTimestamp: bigint;
  cycleCount: bigint;
  isActive: boolean;
}
