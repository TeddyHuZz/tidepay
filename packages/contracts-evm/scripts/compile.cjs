const fs = require("fs");
const path = require("path");

// Resolve solc from packages/sdk where it is installed
let solc;
try {
  solc = require("solc");
} catch {
  solc = require(path.join(__dirname, "../../sdk/node_modules/solc"));
}

console.log(`🔨 Compiling TidePaySubscription.sol using solc ${solc.version()}...`);

const contractPath = path.join(__dirname, "../contracts/TidePaySubscription.sol");
const source = fs.readFileSync(contractPath, "utf8");

const input = {
  language: "Solidity",
  sources: {
    "TidePaySubscription.sol": {
      content: source,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  let hasError = false;
  for (const err of output.errors) {
    if (err.severity === "error") {
      console.error("❌ Compile error:", err.formattedMessage);
      hasError = true;
    } else {
      console.warn("⚠️ Warning:", err.formattedMessage);
    }
  }
  if (hasError) process.exit(1);
}

const contract = output.contracts["TidePaySubscription.sol"]["TidePaySubscription"];
const bytecode = contract.evm.bytecode.object;
const abi = contract.abi;

const artifactsDir = path.join(__dirname, "../artifacts");
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

fs.writeFileSync(path.join(artifactsDir, "TidePaySubscription.bin"), bytecode);
fs.writeFileSync(
  path.join(artifactsDir, "TidePaySubscription.json"),
  JSON.stringify({ abi, bytecode }, null, 2)
);

console.log(`✅ Compilation successful!`);
console.log(`📦 Bytecode size: ${(bytecode.length / 2).toLocaleString()} bytes`);
console.log(`📁 Artifact written to: ${path.join(artifactsDir, "TidePaySubscription.json")}`);
