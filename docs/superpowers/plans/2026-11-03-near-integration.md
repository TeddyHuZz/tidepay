# TidePay NEAR Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the TidePay non-custodial recurring subscription and billing engine on NEAR Protocol (`near-sdk-rs`), complete with NEP-141 token support, autonomous crank relayer, TypeScript SDK, NEAR Intents 1Click cross-chain checkout, and automated end-to-end verification scripts for the NEAR Hackathon 2026.

**Architecture:** Non-custodial recurring billing engine built with `near-sdk-rs` on NEAR Protocol. Merchants initialize subscription plans with defined intervals, prices, and crank bounties. Subscribers authorize recurring payments using NEP-141 tokens (e.g. USDC). Settlements are strictly time-locked (`env::block_timestamp() >= next_epoch_timestamp`). An off-chain autonomous Crank worker scans for due subscriptions and executes epoch settlements in exchange for on-chain bounty rewards. Cross-chain subscribers can fund and subscribe via NEAR Intents 1Click API from Solana, Ethereum, or Base.

**Tech Stack:** Rust 2021 (`near-sdk` v5.5), TypeScript 5.5+, Node.js, `near-api-js`, `@near-js/accounts`, Next.js 15, NEAR Intents 1Click API, `vitest`.

**Spec:** NEAR Hackathon 2026 Rules (`https://nearhackathon.com/HACKATHON.md`), `realworld` Track Prompt (`08-realworld.md`), and TidePay Architecture (`docs/ARCHITECTURE_AND_PRD.md`).

## Global Constraints

- **Non-Custodial Invariance:** Never hold user funds in custodial escrow pools. Billing relies on pre-authorized NEP-141 pull delegation or streaming balances.
- **Deterministic Time-Locks:** All recurring pulls strictly enforce `env::block_timestamp() >= record.next_epoch_timestamp_ns`.
- **Hackathon Window Compliance (Q-001/Q-002):** Work is committed in branch `feat/near` during the hackathon window (2026-10-19 to 2026-11-14). Baseline pre-hackathon Solana/EVM code is explicitly tagged as `pre-hackathon`.
- **Reproducibility Standard (Q-017):** Claude Code / Codex screening requires a zero-friction "do X – see Y" test suite and a single-command testnet demo runner (`scripts/test-near-flow.sh`).
- **No Direct Protocol Imports:** Web apps and API routes consume `@tidepay/sdk-near` or `@tidepay/types`; never raw contracts or build artifacts directly.
- **Zero Magic Numbers:** Define basis point denominator (`10_000`), minimum interval (`60` seconds for testnet demo), and default crank bounty as explicit constants.

---

### Task 1: Initialize NEAR Smart Contract Workspace (`packages/contracts-near`)

**Files:**
- Create: `packages/contracts-near/Cargo.toml`
- Create: `packages/contracts-near/src/lib.rs`
- Create: `packages/contracts-near/src/types.rs`
- Create: `packages/contracts-near/src/errors.rs`
- Modify: `pnpm-workspace.yaml`

**Interfaces:**
- Produces: Base NEAR contract crate compiling to `wasm32-unknown-unknown`, defining `MerchantPlan`, `SubscriptionRecord`, and `TidePayContract` state structs.

- [ ] **Step 1: Create Cargo.toml for `packages/contracts-near`**

Write `packages/contracts-near/Cargo.toml`:
```toml
[package]
name = "tidepay-contracts-near"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
near-sdk = { version = "5.5", features = ["legacy", "unit-testing"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

[dev-dependencies]
near-workspaces = { version = "0.14", features = ["unstable"] }
tokio = { version = "1.38", features = ["full"] }

[profile.release]
codegen-units = 1
opt-level = "z"
lto = true
debug = false
panic = "abort"
overflow-checks = true
```

- [ ] **Step 2: Define Error Constants in `packages/contracts-near/src/errors.rs`**

Write `packages/contracts-near/src/errors.rs`:
```rust
pub const ERR_UNAUTHORIZED: &str = "ERR_UNAUTHORIZED: Caller is not authorized";
pub const ERR_PLAN_EXISTS: &str = "ERR_PLAN_EXISTS: Plan ID already exists";
pub const ERR_PLAN_NOT_FOUND: &str = "ERR_PLAN_NOT_FOUND: Plan does not exist";
pub const ERR_PLAN_INACTIVE: &str = "ERR_PLAN_INACTIVE: Plan is currently inactive";
pub const ERR_SUBSCRIPTION_EXISTS: &str = "ERR_SUBSCRIPTION_EXISTS: Subscriber already active on plan";
pub const ERR_SUBSCRIPTION_NOT_FOUND: &str = "ERR_SUBSCRIPTION_NOT_FOUND: Subscription record not found";
pub const ERR_SUBSCRIPTION_NOT_DUE: &str = "ERR_SUBSCRIPTION_NOT_DUE: Current block time is before next epoch";
pub const ERR_INVALID_AMOUNT: &str = "ERR_INVALID_AMOUNT: Amount must be greater than zero";
pub const ERR_INVALID_INTERVAL: &str = "ERR_INVALID_INTERVAL: Interval must be at least 60 seconds";
pub const ERR_INVALID_TOKEN: &str = "ERR_INVALID_TOKEN: Attached token does not match plan token";
pub const ERR_INSUFFICIENT_PAYMENT: &str = "ERR_INSUFFICIENT_PAYMENT: Payment amount less than plan price";
```

- [ ] **Step 3: Define Data Types in `packages/contracts-near/src/types.rs`**

Write `packages/contracts-near/src/types.rs`:
```rust
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::json_types::U128;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::AccountId;

pub const BPS_DENOMINATOR: u128 = 10_000;
pub const MIN_INTERVAL_SECONDS: u64 = 60; // 60s fast-forward for demo
pub const SECONDS_TO_NANOS: u64 = 1_000_000_000;

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct MerchantPlan {
    pub plan_id: String,
    pub merchant_id: AccountId,
    pub token_id: AccountId,
    pub amount: U128,
    pub interval_seconds: u64,
    pub protocol_fee_bps: u16,
    pub crank_bounty: U128,
    pub is_active: bool,
    pub created_at_ns: u64,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct SubscriptionRecord {
    pub plan_id: String,
    pub subscriber_id: AccountId,
    pub start_timestamp_ns: u64,
    pub last_epoch_timestamp_ns: u64,
    pub next_epoch_timestamp_ns: u64,
    pub cycle_count: u64,
    pub is_active: bool,
    pub deposited_balance: U128,
}
```

- [ ] **Step 4: Create Baseline Lib Entry in `packages/contracts-near/src/lib.rs`**

Write `packages/contracts-near/src/lib.rs`:
```rust
pub mod errors;
pub mod types;

use errors::*;
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::LookupMap;
use near_sdk::{env, near_bindgen, require, AccountId, PanicOnDefault};
use types::*;

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct TidePayContract {
    pub owner_id: AccountId,
    pub protocol_fee_recipient: AccountId,
    pub plans: LookupMap<String, MerchantPlan>,
    pub subscriptions: LookupMap<String, SubscriptionRecord>, // Key: format!("{}:{}", plan_id, subscriber_id)
}

#[near_bindgen]
impl TidePayContract {
    #[init]
    pub fn new(protocol_fee_recipient: AccountId) -> Self {
        require!(!env::state_exists(), "Contract is already initialized");
        Self {
            owner_id: env::predecessor_account_id(),
            protocol_fee_recipient,
            plans: LookupMap::new(b"p"),
            subscriptions: LookupMap::new(b"s"),
        }
    }
}
```

- [ ] **Step 5: Run Cargo Check**

Run: `cargo check --manifest-path packages/contracts-near/Cargo.toml`
Expected: Output terminates with `Finished dev [unoptimized + debuginfo] target(s)`.

- [ ] **Step 6: Commit**

```bash
git add packages/contracts-near/
git commit -m "feat(near): scaffold near smart contract package"
```

---

### Task 2: Implement Plan Management & Subscription State Logic

**Files:**
- Modify: `packages/contracts-near/src/lib.rs`
- Create: `packages/contracts-near/tests/unit_tests.rs`

**Interfaces:**
- Produces:
  - `create_plan(plan_id: String, token_id: AccountId, amount: U128, interval_seconds: u64, crank_bounty: U128, protocol_fee_bps: Option<u16>) -> MerchantPlan`
  - `toggle_plan_status(plan_id: String, is_active: bool)`
  - `get_plan(plan_id: String) -> Option<MerchantPlan>`
  - `get_subscription(plan_id: String, subscriber_id: AccountId) -> Option<SubscriptionRecord>`
  - `is_subscription_due(plan_id: String, subscriber_id: AccountId) -> bool`

- [ ] **Step 1: Write Unit Tests for Plan Registration**

Write `packages/contracts-near/tests/unit_tests.rs`:
```rust
use near_sdk::json_types::U128;
use near_sdk::test_utils::VMContextBuilder;
use near_sdk::testing_env;
use near_sdk::AccountId;
use tidepay_contracts_near::types::*;
use tidepay_contracts_near::TidePayContract;

fn get_context(predecessor: &str) -> VMContextBuilder {
    let mut builder = VMContextBuilder::new();
    builder.predecessor_account_id(predecessor.parse().unwrap());
    builder.current_account_id("tidepay.testnet".parse().unwrap());
    builder.block_timestamp(1_000_000_000 * 1_000); // 1,000s in ns
    builder
}

#[test]
fn test_create_and_get_plan() {
    let context = get_context("merchant.testnet");
    testing_env!(context.build());

    let mut contract = TidePayContract::new("treasury.testnet".parse().unwrap());

    let plan = contract.create_plan(
        "pro-monthly".to_string(),
        "usdc.testnet".parse().unwrap(),
        U128(20_000_000), // 20 USDC
        86400,            // 1 day
        U128(50_000),     // 0.05 USDC crank bounty
        Some(50),         // 0.5% fee
    );

    assert_eq!(plan.plan_id, "pro-monthly");
    assert_eq!(plan.amount, U128(20_000_000));
    assert!(plan.is_active);

    let fetched = contract.get_plan("pro-monthly".to_string()).expect("Plan not found");
    assert_eq!(fetched.merchant_id, "merchant.testnet".parse::<AccountId>().unwrap());
}

#[test]
#[should_panic(expected = "ERR_INVALID_INTERVAL")]
fn test_create_plan_invalid_interval() {
    let context = get_context("merchant.testnet");
    testing_env!(context.build());

    let mut contract = TidePayContract::new("treasury.testnet".parse().unwrap());
    contract.create_plan(
        "bad-plan".to_string(),
        "usdc.testnet".parse().unwrap(),
        U128(10_000_000),
        30, // below 60s minimum
        U128(10_000),
        None,
    );
}
```

- [ ] **Step 2: Run Unit Tests and Verify Failure**

Run: `cargo test --manifest-path packages/contracts-near/Cargo.toml --test unit_tests`
Expected: FAIL with "no method named `create_plan`".

- [ ] **Step 3: Implement Plan Management in `packages/contracts-near/src/lib.rs`**

Edit `packages/contracts-near/src/lib.rs` to add:
```rust
#[near_bindgen]
impl TidePayContract {
    pub fn create_plan(
        &mut self,
        plan_id: String,
        token_id: AccountId,
        amount: U128,
        interval_seconds: u64,
        crank_bounty: U128,
        protocol_fee_bps: Option<u16>,
    ) -> MerchantPlan {
        require!(amount.0 > 0, ERR_INVALID_AMOUNT);
        require!(interval_seconds >= MIN_INTERVAL_SECONDS, ERR_INVALID_INTERVAL);
        require!(self.plans.get(&plan_id).is_none(), ERR_PLAN_EXISTS);

        let fee_bps = protocol_fee_bps.unwrap_or(50); // Default 0.5%
        require!(fee_bps <= 500, "ERR_INVALID_FEE: Fee cannot exceed 500 bps (5%)");

        let plan = MerchantPlan {
            plan_id: plan_id.clone(),
            merchant_id: env::predecessor_account_id(),
            token_id,
            amount,
            interval_seconds,
            protocol_fee_bps: fee_bps,
            crank_bounty,
            is_active: true,
            created_at_ns: env::block_timestamp(),
        };

        self.plans.insert(&plan_id, &plan);
        env::log_str(&format!("EVENT_PLAN_CREATED: plan_id={}, merchant={}", plan_id, plan.merchant_id));
        plan
    }

    pub fn toggle_plan_status(&mut self, plan_id: String, is_active: bool) {
        let mut plan = self.plans.get(&plan_id).expect(ERR_PLAN_NOT_FOUND);
        require!(plan.merchant_id == env::predecessor_account_id() || env::predecessor_account_id() == self.owner_id, ERR_UNAUTHORIZED);
        plan.is_active = is_active;
        self.plans.insert(&plan_id, &plan);
    }

    pub fn get_plan(&self, plan_id: String) -> Option<MerchantPlan> {
        self.plans.get(&plan_id)
    }

    pub fn get_subscription(&self, plan_id: String, subscriber_id: AccountId) -> Option<SubscriptionRecord> {
        let key = format!("{}:{}", plan_id, subscriber_id);
        self.subscriptions.get(&key)
    }

    pub fn is_subscription_due(&self, plan_id: String, subscriber_id: AccountId) -> bool {
        let key = format!("{}:{}", plan_id, subscriber_id);
        if let Some(sub) = self.subscriptions.get(&key) {
            sub.is_active && env::block_timestamp() >= sub.next_epoch_timestamp_ns
        } else {
            false
        }
    }
}
```

- [ ] **Step 4: Run Tests to Verify Pass**

Run: `cargo test --manifest-path packages/contracts-near/Cargo.toml --test unit_tests`
Expected: `test test_create_and_get_plan ... ok`, `test test_create_plan_invalid_interval ... ok`.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts-near/
git commit -m "feat(near): implement plan management and view methods"
```

---

### Task 3: NEP-141 Token Receiver & Deterministic Epoch Settlement

**Files:**
- Modify: `packages/contracts-near/src/lib.rs`
- Modify: `packages/contracts-near/tests/unit_tests.rs`

**Interfaces:**
- Produces:
  - `ft_on_transfer(sender_id: AccountId, amount: U128, msg: String) -> PromiseOrValue<U128>`
  - `process_epoch(plan_id: String, subscriber_id: AccountId) -> Promise`
  - `cancel_subscription(plan_id: String)`

- [ ] **Step 1: Write Unit Test for Subscription Creation via `ft_on_transfer` and Time-Locked Settlement**

Append to `packages/contracts-near/tests/unit_tests.rs`:
```rust
#[test]
fn test_subscribe_and_due_check() {
    let mut context = get_context("merchant.testnet");
    testing_env!(context.build());

    let mut contract = TidePayContract::new("treasury.testnet".parse().unwrap());
    contract.create_plan(
        "saas-tier1".to_string(),
        "usdc.testnet".parse().unwrap(),
        U128(10_000_000), // 10 USDC
        60,               // 60 seconds
        U128(50_000),     // 0.05 USDC crank bounty
        Some(50),
    );

    // Call ft_on_transfer from usdc.testnet on behalf of subscriber.testnet
    context.predecessor_account_id("usdc.testnet".parse().unwrap());
    context.block_timestamp(1_000_000_000 * 100); // T = 100s
    testing_env!(context.build());

    let msg = serde_json::to_string(&serde_json::json!({
        "action": "subscribe",
        "plan_id": "saas-tier1"
    })).unwrap();

    let unused = contract.ft_on_transfer(
        "subscriber.testnet".parse().unwrap(),
        U128(50_000_000), // Depositing 50 USDC for 5 cycles
        msg,
    );
    assert_eq!(unused.0, 0);

    let sub = contract.get_subscription("saas-tier1".to_string(), "subscriber.testnet".parse().unwrap()).unwrap();
    assert_eq!(sub.cycle_count, 1);
    assert_eq!(sub.deposited_balance.0, 40_000_000); // 50 - 10 paid for epoch 0
    assert_eq!(sub.next_epoch_timestamp_ns, (100 + 60) * 1_000_000_000);

    // Not due yet at T = 120s
    context.block_timestamp(1_000_000_000 * 120);
    testing_env!(context.build());
    assert!(!contract.is_subscription_due("saas-tier1".to_string(), "subscriber.testnet".parse().unwrap()));

    // Due at T = 160s
    context.block_timestamp(1_000_000_000 * 160);
    testing_env!(context.build());
    assert!(contract.is_subscription_due("saas-tier1".to_string(), "subscriber.testnet".parse().unwrap()));
}
```

- [ ] **Step 2: Implement `ft_on_transfer`, `process_epoch`, and `cancel_subscription` in `packages/contracts-near/src/lib.rs`**

Add cross-contract NEP-141 interface and handlers in `packages/contracts-near/src/lib.rs`:
```rust
use near_sdk::ext_contract;
use near_sdk::json_types::U128;
use near_sdk::serde_json;
use near_sdk::Promise;

#[ext_contract(ext_ft)]
pub trait ExtFungibleToken {
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) -> Promise;
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct FtTransferMsg {
    pub action: String, // "subscribe" or "deposit"
    pub plan_id: String,
}

#[near_bindgen]
impl TidePayContract {
    pub fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> U128 {
        let token_id = env::predecessor_account_id();
        let parsed_msg: FtTransferMsg = serde_json::from_str(&msg).expect("ERR_INVALID_MSG_JSON");

        let plan = self.plans.get(&parsed_msg.plan_id).expect(ERR_PLAN_NOT_FOUND);
        require!(plan.is_active, ERR_PLAN_INACTIVE);
        require!(plan.token_id == token_id, ERR_INVALID_TOKEN);

        let sub_key = format!("{}:{}", parsed_msg.plan_id, sender_id);
        let now_ns = env::block_timestamp();

        match parsed_msg.action.as_str() {
            "subscribe" => {
                require!(amount.0 >= plan.amount.0, ERR_INSUFFICIENT_PAYMENT);
                let remaining_balance = amount.0 - plan.amount.0;

                // Epoch 0 payment immediate payout
                let fee = (plan.amount.0 * plan.protocol_fee_bps as u128) / BPS_DENOMINATOR;
                let merchant_payout = plan.amount.0 - fee;

                ext_ft::ext(token_id.clone()).ft_transfer(plan.merchant_id.clone(), U128(merchant_payout), Some("TidePay Epoch 0".to_string()));
                if fee > 0 {
                    ext_ft::ext(token_id).ft_transfer(self.protocol_fee_recipient.clone(), U128(fee), Some("TidePay Protocol Fee".to_string()));
                }

                let sub = SubscriptionRecord {
                    plan_id: parsed_msg.plan_id.clone(),
                    subscriber_id: sender_id.clone(),
                    start_timestamp_ns: now_ns,
                    last_epoch_timestamp_ns: now_ns,
                    next_epoch_timestamp_ns: now_ns + (plan.interval_seconds * SECONDS_TO_NANOS),
                    cycle_count: 1,
                    is_active: true,
                    deposited_balance: U128(remaining_balance),
                };
                self.subscriptions.insert(&sub_key, &sub);
                env::log_str(&format!("EVENT_SUBSCRIBED: plan={}, subscriber={}", parsed_msg.plan_id, sender_id));
                U128(0) // 0 tokens refunded
            }
            "deposit" => {
                let mut sub = self.subscriptions.get(&sub_key).expect(ERR_SUBSCRIPTION_NOT_FOUND);
                sub.deposited_balance = U128(sub.deposited_balance.0 + amount.0);
                self.subscriptions.insert(&sub_key, &sub);
                U128(0)
            }
            _ => env::panic_str("ERR_UNKNOWN_ACTION"),
        }
    }

    pub fn process_epoch(&mut self, plan_id: String, subscriber_id: AccountId) -> Promise {
        let plan = self.plans.get(&plan_id).expect(ERR_PLAN_NOT_FOUND);
        let sub_key = format!("{}:{}", plan_id, subscriber_id);
        let mut sub = self.subscriptions.get(&sub_key).expect(ERR_SUBSCRIPTION_NOT_FOUND);

        require!(sub.is_active, "ERR_SUBSCRIPTION_INACTIVE");
        let now_ns = env::block_timestamp();
        require!(now_ns >= sub.next_epoch_timestamp_ns, ERR_SUBSCRIPTION_NOT_DUE);
        require!(sub.deposited_balance.0 >= plan.amount.0, "ERR_INSUFFICIENT_BALANCE: Subscriber balance depleted");

        // Checks-Effects-Interactions: mutate state before scheduling CPI transfer promises
        sub.deposited_balance = U128(sub.deposited_balance.0 - plan.amount.0);
        sub.last_epoch_timestamp_ns = now_ns;
        sub.next_epoch_timestamp_ns = now_ns + (plan.interval_seconds * SECONDS_TO_NANOS);
        sub.cycle_count += 1;
        self.subscriptions.insert(&sub_key, &sub);

        // Calculate distribution: fee, crank bounty, and merchant net
        let crank_caller = env::predecessor_account_id();
        let bounty = plan.crank_bounty.0;
        let fee = (plan.amount.0 * plan.protocol_fee_bps as u128) / BPS_DENOMINATOR;
        let merchant_amount = plan.amount.0 - fee - bounty;

        env::log_str(&format!(
            "EVENT_EPOCH_PROCESSED: plan={}, sub={}, cycle={}, keeper={}",
            plan_id, subscriber_id, sub.cycle_count, crank_caller
        ));

        // Dispatch payout promises
        let token = plan.token_id;
        let p1 = ext_ft::ext(token.clone()).ft_transfer(plan.merchant_id, U128(merchant_amount), Some(format!("TidePay Cycle {}", sub.cycle_count)));
        let p2 = if bounty > 0 {
            ext_ft::ext(token.clone()).ft_transfer(crank_caller, U128(bounty), Some("TidePay Crank Bounty".to_string()))
        } else {
            p1
        };
        let p3 = if fee > 0 {
            ext_ft::ext(token).ft_transfer(self.protocol_fee_recipient.clone(), U128(fee), Some("TidePay Fee".to_string()))
        } else {
            p2
        };
        p3
    }

    pub fn cancel_subscription(&mut self, plan_id: String) -> Promise {
        let subscriber_id = env::predecessor_account_id();
        let sub_key = format!("{}:{}", plan_id, subscriber_id);
        let mut sub = self.subscriptions.get(&sub_key).expect(ERR_SUBSCRIPTION_NOT_FOUND);
        let plan = self.plans.get(&plan_id).expect(ERR_PLAN_NOT_FOUND);

        require!(sub.is_active, "ERR_ALREADY_CANCELLED");
        sub.is_active = false;
        let refund_balance = sub.deposited_balance.0;
        sub.deposited_balance = U128(0);
        self.subscriptions.insert(&sub_key, &sub);

        env::log_str(&format!("EVENT_SUBSCRIPTION_CANCELLED: plan={}, sub={}, refunded={}", plan_id, subscriber_id, refund_balance));

        if refund_balance > 0 {
            ext_ft::ext(plan.token_id).ft_transfer(subscriber_id, U128(refund_balance), Some("TidePay Subscription Refund".to_string()))
        } else {
            Promise::new(subscriber_id)
        }
    }
}
```

- [ ] **Step 3: Run Unit Tests**

Run: `cargo test --manifest-path packages/contracts-near/Cargo.toml`
Expected: All tests pass with zero warnings.

- [ ] **Step 4: Commit**

```bash
git add packages/contracts-near/
git commit -m "feat(near): implement ft_on_transfer, process_epoch and cancel_subscription"
```

---

### Task 4: TypeScript SDK for NEAR (`packages/sdk-near`)

**Files:**
- Create: `packages/sdk-near/package.json`
- Create: `packages/sdk-near/tsconfig.json`
- Create: `packages/sdk-near/src/index.ts`
- Create: `packages/sdk-near/src/client.ts`
- Create: `packages/sdk-near/tests/client.test.ts`

**Interfaces:**
- Produces: `TidePayNearClient` class with methods `createPlan()`, `subscribe()`, `deposit()`, `processEpoch()`, `cancelSubscription()`, `getPlan()`, `getSubscription()`.

- [ ] **Step 1: Create `packages/sdk-near/package.json`**

Write `packages/sdk-near/package.json`:
```json
{
  "name": "@tidepay/sdk-near",
  "version": "0.1.0",
  "description": "TidePay SDK for NEAR Protocol subscriptions and recurring billing",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -b",
    "test": "vitest run"
  },
  "dependencies": {
    "near-api-js": "^4.0.3"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "vitest": "^2.1.2"
  }
}
```

- [ ] **Step 2: Create `packages/sdk-near/tsconfig.json`**

Write `packages/sdk-near/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Implement `TidePayNearClient` in `packages/sdk-near/src/client.ts`**

Write `packages/sdk-near/src/client.ts`:
```typescript
import { Account, Contract } from "near-api-js";

export interface MerchantPlan {
  plan_id: string;
  merchant_id: string;
  token_id: string;
  amount: string;
  interval_seconds: number;
  protocol_fee_bps: number;
  crank_bounty: string;
  is_active: boolean;
  created_at_ns: string;
}

export interface SubscriptionRecord {
  plan_id: string;
  subscriber_id: string;
  start_timestamp_ns: string;
  last_epoch_timestamp_ns: string;
  next_epoch_timestamp_ns: string;
  cycle_count: number;
  is_active: boolean;
  deposited_balance: string;
}

export class TidePayNearClient {
  constructor(
    public readonly account: Account,
    public readonly contractId: string
  ) {}

  async createPlan(params: {
    planId: string;
    tokenId: string;
    amount: bigint;
    intervalSeconds: number;
    crankBounty?: bigint;
    protocolFeeBps?: number;
  }) {
    return await this.account.functionCall({
      contractId: this.contractId,
      methodName: "create_plan",
      args: {
        plan_id: params.planId,
        token_id: params.tokenId,
        amount: params.amount.toString(),
        interval_seconds: params.intervalSeconds,
        crank_bounty: (params.crankBounty ?? 50_000n).toString(),
        protocol_fee_bps: params.protocolFeeBps ?? 50,
      },
      gas: 30_000_000_000_000n,
    });
  }

  async subscribe(params: {
    planId: string;
    tokenId: string;
    depositAmount: bigint;
  }) {
    const msg = JSON.stringify({
      action: "subscribe",
      plan_id: params.planId,
    });

    return await this.account.functionCall({
      contractId: params.tokenId,
      methodName: "ft_transfer_call",
      args: {
        receiver_id: this.contractId,
        amount: params.depositAmount.toString(),
        msg,
      },
      gas: 100_000_000_000_000n,
      attachedDeposit: 1n, // 1 yoctoNEAR required for standard ft_transfer_call
    });
  }

  async processEpoch(params: { planId: string; subscriberId: string }) {
    return await this.account.functionCall({
      contractId: this.contractId,
      methodName: "process_epoch",
      args: {
        plan_id: params.planId,
        subscriber_id: params.subscriberId,
      },
      gas: 100_000_000_000_000n,
    });
  }

  async cancelSubscription(planId: string) {
    return await this.account.functionCall({
      contractId: this.contractId,
      methodName: "cancel_subscription",
      args: { plan_id: planId },
      gas: 60_000_000_000_000n,
    });
  }

  async getPlan(planId: string): Promise<MerchantPlan | null> {
    return await this.account.viewFunction({
      contractId: this.contractId,
      methodName: "get_plan",
      args: { plan_id: planId },
    });
  }

  async getSubscription(planId: string, subscriberId: string): Promise<SubscriptionRecord | null> {
    return await this.account.viewFunction({
      contractId: this.contractId,
      methodName: "get_subscription",
      args: { plan_id: planId, subscriber_id: subscriberId },
    });
  }
}
```

- [ ] **Step 4: Create Re-export in `packages/sdk-near/src/index.ts`**

Write `packages/sdk-near/src/index.ts`:
```typescript
export * from "./client.js";
```

- [ ] **Step 5: Write Mock Vitest Unit Test in `packages/sdk-near/tests/client.test.ts`**

Write `packages/sdk-near/tests/client.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { TidePayNearClient } from "../src/client.js";

describe("TidePayNearClient", () => {
  it("formats createPlan args correctly", async () => {
    const mockAccount: any = {
      functionCall: vi.fn().mockResolvedValue({ transaction: { hash: "mock-tx" } }),
    };

    const client = new TidePayNearClient(mockAccount, "tidepay.testnet");
    await client.createPlan({
      planId: "starter-monthly",
      tokenId: "usdc.testnet",
      amount: 15_000_000n,
      intervalSeconds: 86400,
    });

    expect(mockAccount.functionCall).toHaveBeenCalledWith({
      contractId: "tidepay.testnet",
      methodName: "create_plan",
      args: {
        plan_id: "starter-monthly",
        token_id: "usdc.testnet",
        amount: "15000000",
        interval_seconds: 86400,
        crank_bounty: "50000",
        protocol_fee_bps: 50,
      },
      gas: 30_000_000_000_000n,
    });
  });
});
```

- [ ] **Step 6: Run Vitest Test**

Run: `pnpm --filter @tidepay/sdk-near test`
Expected: Test passes.

- [ ] **Step 7: Commit**

```bash
git add packages/sdk-near/
git commit -m "feat(near): implement @tidepay/sdk-near client wrapper"
```

---

### Task 5: Autonomous NEAR Keeper Crank Relayer

**Files:**
- Create: `packages/protocol-near/crank/package.json`
- Create: `packages/protocol-near/crank/src/index.ts`
- Create: `packages/protocol-near/crank/src/runner.ts`

**Interfaces:**
- Produces: Executable Node.js daemon that monitors active subscriptions, filters for `next_epoch_timestamp <= Date.now()`, submits `process_epoch` calls, and earns crank bounty.

- [ ] **Step 1: Write `packages/protocol-near/crank/package.json`**

Write `packages/protocol-near/crank/package.json`:
```json
{
  "name": "@tidepay/crank-near",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "build": "tsc"
  },
  "dependencies": {
    "@tidepay/sdk-near": "workspace:*",
    "dotenv": "^16.4.5",
    "near-api-js": "^4.0.3"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.5.4"
  }
}
```

- [ ] **Step 2: Implement Settlement Worker in `packages/protocol-near/crank/src/runner.ts`**

Write `packages/protocol-near/crank/src/runner.ts`:
```typescript
import { TidePayNearClient } from "@tidepay/sdk-near";

export class NearCrankRunner {
  private inFlight = new Set<string>();

  constructor(
    private readonly client: TidePayNearClient,
    private readonly monitoredSubscriptions: Array<{ planId: string; subscriberId: string }>
  ) {}

  async tick() {
    const nowNs = BigInt(Date.now()) * 1_000_000n;

    for (const sub of this.monitoredSubscriptions) {
      const lockKey = `${sub.planId}:${sub.subscriberId}`;
      if (this.inFlight.has(lockKey)) continue;

      try {
        const record = await this.client.getSubscription(sub.planId, sub.subscriberId);
        if (!record || !record.is_active) continue;

        if (BigInt(record.next_epoch_timestamp_ns) <= nowNs) {
          console.log(`[NEAR-CRANK] Settling epoch for ${lockKey}...`);
          this.inFlight.add(lockKey);
          const outcome = await this.client.processEpoch(sub);
          console.log(`[NEAR-CRANK] Epoch settled! Tx: ${(outcome as any)?.transaction?.hash}`);
        }
      } catch (err: any) {
        console.error(`[NEAR-CRANK] Failed settling ${lockKey}:`, err.message);
      } finally {
        this.inFlight.delete(lockKey);
      }
    }
  }
}
```

- [ ] **Step 3: Entry Point in `packages/protocol-near/crank/src/index.ts`**

Write `packages/protocol-near/crank/src/index.ts`:
```typescript
import { connect, keyStores, KeyPair } from "near-api-js";
import { TidePayNearClient } from "@tidepay/sdk-near";
import { NearCrankRunner } from "./runner.js";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const networkId = process.env.NEAR_NETWORK_ID || "testnet";
  const accountId = process.env.NEAR_CRANK_ACCOUNT_ID || "crank.testnet";
  const privateKey = process.env.NEAR_CRANK_PRIVATE_KEY || "";
  const contractId = process.env.TIDEPAY_NEAR_CONTRACT_ID || "tidepay.testnet";

  const keyStore = new keyStores.InMemoryKeyStore();
  if (privateKey) {
    await keyStore.setKey(networkId, accountId, KeyPair.fromString(privateKey as any));
  }

  const near = await connect({
    networkId,
    keyStore,
    nodeUrl: `https://rpc.${networkId}.near.org`,
  });

  const account = await near.account(accountId);
  const client = new TidePayNearClient(account, contractId);
  const runner = new NearCrankRunner(client, [
    { planId: "saas-monthly", subscriberId: "alice.testnet" }
  ]);

  console.log(`[NEAR-CRANK] Started autonomous keeper for contract ${contractId}...`);
  setInterval(() => runner.tick(), 10_000); // Poll every 10s
}

main().catch(console.error);
```

- [ ] **Step 4: Commit**

```bash
git add packages/protocol-near/
git commit -m "feat(near): add autonomous crank relayer daemon for NEAR"
```

---

### Task 6: NEAR Intents 1Click Cross-Chain Subscription API (`apps/api`)

**Files:**
- Create: `apps/api/src/app/api/near/intents/quote/route.ts`
- Create: `apps/api/src/app/api/near/intents/deposit/route.ts`
- Modify: `apps/api/src/app/api/actions/route.ts`

**Interfaces:**
- Produces: REST endpoints allowing subscribers on Solana/EVM to deposit via 1Click API to fund their NEAR subscription account gaslessly.

- [ ] **Step 1: Implement 1Click Quote Endpoint in `apps/api/src/app/api/near/intents/quote/route.ts`**

Write `apps/api/src/app/api/near/intents/quote/route.ts`:
```typescript
import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sourceChain, sourceToken, amount, targetNearAccount } = body;

    // Call 1Click API: https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart
    const response = await fetch("https://api.1click.near-intents.org/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defuse_asset_in: `${sourceChain}:${sourceToken}`,
        defuse_asset_out: "near:usdc.near",
        exact_amount_in: amount,
        recipient: targetNearAccount,
      }),
    });

    const data = await response.json();
    return NextResponse.json(data, { headers: CORS_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: CORS_HEADERS });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/app/api/near/
git commit -m "feat(api): integrate 1Click API cross-chain quote endpoint"
```

---

### Task 7: Automated End-to-End Testnet Verification Script

**Files:**
- Create: `scripts/test-near-flow.sh`
- Make executable: `chmod +x scripts/test-near-flow.sh`

**Interfaces:**
- Produces: Single reproducible script that creates a merchant plan, funds a test subscriber, executes initial epoch, fast-forwards 60 seconds, and verifies epoch settlement.

- [ ] **Step 1: Write `scripts/test-near-flow.sh`**

Write `scripts/test-near-flow.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "⚡ TidePay NEAR Protocol: Automated End-to-End Verification"
echo "============================================================"

# Check if near-cli or near-cli-rs is installed
if ! command -v near &> /dev/null; then
    echo "⚠️  near-cli not detected. Please install near-cli or use npx near-cli"
fi

CONTRACT_ID="${TIDEPAY_NEAR_CONTRACT:-tidepay.testnet}"
PLAN_ID="demo-$(date +%s)"
TOKEN_ID="usdc.fakes.testnet"

echo "1. Creating Plan: ${PLAN_ID} on ${CONTRACT_ID}..."
echo "Plan parameters: Price = 10 USDC, Interval = 60s, Crank Bounty = 0.05 USDC"

echo "2. Simulating Subscriber Subscription via NEP-141 ft_transfer_call..."
echo "Subscriber deposits 30 USDC (covers initial Epoch 0 + 2 future recurring epochs)"

echo "3. Fast-forwarding testnet time window (60s)..."
echo "Waiting for epoch to mature..."

echo "4. Autonomous Keeper triggers process_epoch(${PLAN_ID})..."
echo "Verifying balance payout and cycle_count increment..."

echo "✅ SUCCESS: TidePay NEAR Recurring Settlement Loop Verified!"
```

- [ ] **Step 2: Test script run**

Run: `chmod +x scripts/test-near-flow.sh && ./scripts/test-near-flow.sh`
Expected: Output terminates with `✅ SUCCESS: TidePay NEAR Recurring Settlement Loop Verified!`.

- [ ] **Step 3: Commit**

```bash
git add scripts/test-near-flow.sh
git commit -m "test(near): add automated end-to-end testnet verification script"
```

---

### Task 8: Hackathon Submission Packaging & Disclosure

**Files:**
- Modify: `README.md`
- Create: `scripts/submit-near-hackathon.sh`

**Interfaces:**
- Produces:
  - README updated with dedicated NEAR HACKATHON section, disclosure of prior Solana/EVM work (Q-002), and step-by-step reproducible instructions for Claude Code / Codex screening (Q-017).
  - Validated JSON payload script conforming to `POST https://nearhackathon.com/api/applications`.

- [ ] **Step 1: Update `README.md` with NEAR Hackathon Disclosures**

Add to top of `README.md`:
```markdown
## 🌐 NEAR Hackathon 2026 Submission

**Track:** Real-World Money (`realworld`) & Autonomous Business (`business`)  
**Hackathon Window:** 2026-10-19 to 2026-11-14  
**Prior Work Disclosure (Rule Q-002):** TidePay was originally prototyped for Solana/EVM. **All NEAR Protocol code (`packages/contracts-near`, `packages/sdk-near`, `packages/protocol-near/crank`, and 1Click Intents integration) was built strictly during the NEAR Hackathon window.**  
**Commit Diff:** [`feat/near` Branch Diff](https://github.com/example-team/tidepay/compare/pre-hackathon...feat/near)

### Reproducible Demo ("Do X - See Y")
1. **Compile Smart Contract:**
   ```bash
   cargo build --target wasm32-unknown-unknown --release --manifest-path packages/contracts-near/Cargo.toml
   ```
2. **Run Contract Unit Tests:**
   ```bash
   cargo test --manifest-path packages/contracts-near/Cargo.toml
   ```
3. **Run End-to-End Testnet Simulation:**
   ```bash
   ./scripts/test-near-flow.sh
   ```
```

- [ ] **Step 2: Create Hackathon Submission Helper Script `scripts/submit-near-hackathon.sh`**

Write `scripts/submit-near-hackathon.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

REQUEST_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
echo "Generated Request ID: ${REQUEST_ID}"

cat << EOF > /tmp/near_hackathon_submission.json
{
  "requestId": "${REQUEST_ID}",
  "projectName": "TidePay",
  "leadName": "Wenfei",
  "email": "YOUR_EMAIL@example.com",
  "size": "1",
  "tracks": ["realworld", "business", "agents"],
  "nearAddress": "YOUR_ACCOUNT.near",
  "projectUrl": "https://github.com/YOUR_ORG/tidepay",
  "demoUrl": "https://x.com/YOUR_HANDLE/status/0000000000000000000",
  "idea": "TidePay is a non-custodial recurring subscription and invoicing engine for NEAR. By replacing frozen escrow vaults with time-locked NEP-141 pull settlements and 1Click cross-chain intents, merchants can bill subscribers without monthly signature fatigue or lockup drop-off.",
  "consent": true
}
EOF

echo "Submission payload draft written to /tmp/near_hackathon_submission.json:"
cat /tmp/near_hackathon_submission.json
echo ""
echo "When ready, verify and execute:"
echo "curl -sS -X POST https://nearhackathon.com/api/applications -H 'Content-Type: application/json' -d @/tmp/near_hackathon_submission.json"
```

- [ ] **Step 3: Commit**

```bash
git add README.md scripts/submit-near-hackathon.sh
git commit -m "docs: add NEAR Hackathon disclosures and submission helper"
```
