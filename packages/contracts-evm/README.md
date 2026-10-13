# TidePay EVM Contracts

Non-custodial, time-locked recurring subscription & billing engine for EVM networks (Ethereum Sepolia, Base Sepolia, Arbitrum).

## Contract Overview

- **`TidePaySubscription.sol`**: Solidity 0.8.20 contract enforcing deterministic pull billing (`transferFrom`) with re-entrancy defense, keeper crank incentives, and EIP-2612 gasless `permit` onboarding.

---

## 🚀 Fast Deployment Guide (Remix / MetaMask in 60 Seconds)

Because `TidePaySubscription.sol` is self-contained with no external npm import paths, you can deploy it instantly from your browser:

1. Open [Remix Ethereum IDE](https://remix.ethereum.org).
2. Create a file named `TidePaySubscription.sol` and paste the contents of `packages/contracts-evm/contracts/TidePaySubscription.sol`.
3. In the **Solidity Compiler** tab:
   - Select compiler version **`0.8.20`** (or later).
   - Click **Compile TidePaySubscription.sol**.
4. In the **Deploy & Run Transactions** tab:
   - **ENVIRONMENT**: Select **Injected Provider - MetaMask**.
   - Make sure your MetaMask network is set to **Sepolia Testnet** or **Base Sepolia**.
   - **CONTRACT**: Select `TidePaySubscription`.
   - **Constructor Arguments**:
     - `_feeRecipient`: Your deployer wallet address (e.g. `0x2c...798e`).
     - `_feeBps`: `50` (representing 0.5% protocol fee).
   - Click **Deploy** and confirm the transaction in MetaMask.
5. Copy the deployed contract address.
6. Add the deployed contract address to your environment in `apps/dashboard/.env.local`:
   ```bash
   NEXT_PUBLIC_EVM_CONTRACT_ADDRESS="0xYourDeployedContractAddress"
   ```

---

## 🪙 Official Testnet USDC Addresses

| Network | Official Circle USDC Address | Decimals | EIP-2612 Permit |
| :--- | :--- | :--- | :--- |
| **Ethereum Sepolia** | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | 6 | Supported |
| **Base Sepolia** | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | 6 | Supported |

---

## ⚙️ Constructor Parameters

- `_feeRecipient` (`address`): Address receiving the protocol fee (e.g., protocol treasury or deployer address).
- `_feeBps` (`uint256`): Protocol fee in basis points (e.g., `50` for 0.5%, `100` for 1.0%). Maximum allowed is `1000` (10%).
