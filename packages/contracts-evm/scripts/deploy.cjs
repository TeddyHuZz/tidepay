const fs = require("fs");
const path = require("path");

// Resolve viem
let viem;
try {
  viem = require("viem");
} catch {
  viem = require(path.join(__dirname, "../../../node_modules/.pnpm/node_modules/viem"));
}
const { createWalletClient, createPublicClient, http } = viem;

let viemAccounts;
try {
  viemAccounts = require("viem/accounts");
} catch {
  viemAccounts = require(path.join(__dirname, "../../../node_modules/.pnpm/node_modules/viem/accounts"));
}
const { privateKeyToAccount } = viemAccounts;

let viemChains;
try {
  viemChains = require("viem/chains");
} catch {
  viemChains = require(path.join(__dirname, "../../../node_modules/.pnpm/node_modules/viem/chains"));
}
const { sepolia, baseSepolia } = viemChains;

async function main() {
  const privateKey = process.env.EVM_PRIVATE_KEY;
  if (!privateKey || !privateKey.startsWith("0x")) {
    console.error("❌ Error: Missing EVM_PRIVATE_KEY environment variable (must start with 0x).");
    console.error("Example: EVM_PRIVATE_KEY=0x... NETWORK=sepolia node packages/contracts-evm/scripts/deploy.cjs");
    process.exit(1);
  }

  const network = (process.env.NETWORK || "sepolia").toLowerCase();
  const chain = network === "base-sepolia" || network === "base" ? baseSepolia : sepolia;
  const rpcUrl = chain.id === 84532 ? "https://sepolia.base.org" : "https://ethereum-sepolia-rpc.publicnode.com";

  console.log(`\n🚀 Deploying TidePaySubscription to ${chain.name} (Chain ID: ${chain.id})...`);

  const account = privateKeyToAccount(privateKey);
  console.log(`👤 Deployer Account: ${account.address}`);

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  const ethBalance = Number(balance) / 1e18;
  console.log(`💰 Balance: ${ethBalance.toFixed(4)} ${chain.nativeCurrency.symbol}`);

  if (balance === BigInt(0)) {
    console.error(`❌ Error: Deployer account has 0 ${chain.nativeCurrency.symbol}. Please fund with testnet faucet.`);
    process.exit(1);
  }

  const artifactPath = path.join(__dirname, "../artifacts/TidePaySubscription.json");
  if (!fs.existsSync(artifactPath)) {
    console.log("🔨 Artifact not found, compiling contract first...");
    require("./compile.cjs");
  }

  const { abi, bytecode } = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const formattedBytecode = bytecode.startsWith("0x") ? bytecode : `0x${bytecode}`;

  const feeRecipient = process.env.FEE_RECIPIENT || account.address;
  const feeBps = BigInt(process.env.FEE_BPS || "50"); // 50 bps = 0.5%

  console.log(`⚙️ Constructor Args: Fee Recipient = ${feeRecipient}, Fee Bps = ${feeBps} (0.5%)`);
  console.log("⏳ Broadcasting deployment transaction...");

  const hash = await walletClient.deployContract({
    abi,
    bytecode: formattedBytecode,
    args: [feeRecipient, feeBps],
  });

  console.log(`📝 Transaction Hash: ${hash}`);
  console.log("⏳ Waiting for transaction confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress;

  if (!contractAddress) {
    console.error("❌ Deployment failed: No contract address in receipt.");
    process.exit(1);
  }

  console.log("\n========================================================");
  console.log(`🎉 TidePaySubscription successfully deployed!`);
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`🔗 Explorer: ${chain.blockExplorers.default.url}/address/${contractAddress}`);
  console.log("========================================================\n");

  // Automatically update apps/dashboard/.env.local
  const envLocalPath = path.join(__dirname, "../../../apps/dashboard/.env.local");
  if (fs.existsSync(envLocalPath)) {
    let envContent = fs.readFileSync(envLocalPath, "utf8");
    if (envContent.includes("NEXT_PUBLIC_EVM_CONTRACT_ADDRESS=")) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_EVM_CONTRACT_ADDRESS=.*/,
        `NEXT_PUBLIC_EVM_CONTRACT_ADDRESS="${contractAddress}"`
      );
    } else {
      envContent += `\nNEXT_PUBLIC_EVM_CONTRACT_ADDRESS="${contractAddress}"\n`;
    }
    fs.writeFileSync(envLocalPath, envContent);
    console.log(`✅ Updated apps/dashboard/.env.local with NEXT_PUBLIC_EVM_CONTRACT_ADDRESS="${contractAddress}".`);
  }
}

main().catch((err) => {
  console.error("❌ Fatal deployment error:", err);
  process.exit(1);
});
