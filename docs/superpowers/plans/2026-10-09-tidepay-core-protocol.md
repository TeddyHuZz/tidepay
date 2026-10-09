# TidePay Core Protocol, Crank & SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the non-custodial recurring subscription engine for Solana (Anchor smart contract, test suite, TypeScript SDK, and Keeper Crank worker) compliant with Colosseum Hackathon specifications.

**Architecture:** Non-custodial delegated pull engine using Anchor 0.30+ / 1.2+ with SPL Token-2022/Token programs. Subscribers delegate an allowance to a Program Authority PDA (`tidepay_auth`). The on-chain engine executes deterministic time-locked billing via `transfer_checked` with state mutation prior to CPI transfers to prevent re-entrancy. The off-chain crank worker queries active past-due records via `getProgramAccounts` and triggers epoch executions, incentivized by a crank bounty reward.

**Tech Stack:** Anchor 1.2.1, Solana SDK / Token Program, Rust, TypeScript 5.5+, Node.js, `@solana/web3.js`, `@solana/spl-token`, `@coral-xyz/anchor`.

**Spec:** Colosseum Hackathon TidePay Layer 1 Engine Deliverables (Tasks E1-01 through E1-08) & `.agents/rules/tidepay.md`.

## Global Constraints

- **Non-Custodial Invariance:** Never hold user funds in escrow vaults. Billing uses delegated pull authority via `transfer_checked`.
- **Deterministic Time-Locked Billing:** Recurring billing strictly enforces `clock.unix_timestamp >= record.next_epoch_timestamp`.
- **PDA Derivations:**
  - `MerchantPlan`: `[b"plan", merchant.key().as_ref(), plan_id.as_bytes()]`
  - `SubscriptionRecord`: `[b"subscription", plan.key().as_ref(), subscriber.key().as_ref()]`
  - `ProgramAuthority`: `[b"tidepay_auth"]`
- **Re-entrancy Protection:** All state changes (`last_epoch_timestamp`, `next_epoch_timestamp`, `cycle_count`) occur **before** token transfer CPI calls.
- **Rent Reclamation:** Cancellation handlers explicitly close accounts and return rent lamports to the subscriber (`close = subscriber`).
- **Zero Magic Numbers:** Define basis point denominator (`10_000`), minimum interval (`60`), and fee bounds as explicit `pub const`.
- **No Direct Protocol Imports:** TypeScript packages consume `@tidepay/sdk` and `@tidepay/types`; never raw Anchor files directly from apps.

---

### Task 1: State Accounts & Error Definitions (E1-01)

**Files:**
- Create: `packages/protocol/programs/tidepay/src/constants.rs`
- Create: `packages/protocol/programs/tidepay/src/error.rs`
- Create: `packages/protocol/programs/tidepay/src/state.rs`
- Modify: `packages/protocol/programs/tidepay/src/lib.rs`

**Interfaces:**
- Produces: `MerchantPlan` struct, `SubscriptionRecord` struct, `TidePayError` enum, seed constants (`PLAN_SEED`, `SUBSCRIPTION_SEED`, `AUTH_SEED`).

- [ ] **Step 1: Define Constants and Custom Anchor Errors**

Write `packages/protocol/programs/tidepay/src/constants.rs`:
```rust
pub const PLAN_SEED: &[u8] = b"plan";
pub const SUBSCRIPTION_SEED: &[u8] = b"subscription";
pub const AUTH_SEED: &[u8] = b"tidepay_auth";

pub const BPS_DENOMINATOR: u64 = 10_000;
pub const MIN_INTERVAL_SECONDS: i64 = 60; // 60s for testing & devnet demo
pub const MAX_PROTOCOL_FEE_BPS: u16 = 500; // 5% max
```

Write `packages/protocol/programs/tidepay/src/error.rs`:
```rust
use anchor_lang::prelude::*;

#[error_code]
pub enum TidePayError {
    #[msg("Plan ID cannot be empty or exceed 32 characters")]
    InvalidPlanId,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Billing interval must be at least 60 seconds")]
    IntervalTooShort,
    #[msg("Epoch billing is not yet due")]
    EpochNotDue,
    #[msg("Subscription is not active")]
    SubscriptionInactive,
    #[msg("Protocol fee basis points exceed maximum allowed")]
    InvalidFeeBps,
    #[msg("Insufficient delegated allowance for subscription pull")]
    InsufficientAllowance,
    #[msg("Unauthorized signer for this action")]
    Unauthorized,
    #[msg("Token transfer calculation overflow")]
    MathOverflow,
}
```

- [ ] **Step 2: Define Packed State Structs with InitSpace**

Write `packages/protocol/programs/tidepay/src/state.rs`:
```rust
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct MerchantPlan {
    pub merchant: Pubkey,
    pub token_mint: Pubkey,
    pub merchant_token_account: Pubkey,
    pub amount: u64,
    pub interval_seconds: i64,
    #[max_len(32)]
    pub plan_id: String,
    pub protocol_fee_bps: u16,
    pub crank_bounty_amount: u64,
    pub is_active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct SubscriptionRecord {
    pub plan: Pubkey,
    pub subscriber: Pubkey,
    pub subscriber_token_account: Pubkey,
    pub start_timestamp: i64,
    pub last_epoch_timestamp: i64,
    pub next_epoch_timestamp: i64,
    pub cycle_count: u64,
    pub is_active: bool,
    pub bump: u8,
}
```

- [ ] **Step 3: Verify Compilation**

Run in `packages/protocol`: `cargo check`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add packages/protocol/programs/tidepay/src/constants.rs packages/protocol/programs/tidepay/src/error.rs packages/protocol/programs/tidepay/src/state.rs
git commit -m "feat(protocol): define MerchantPlan, SubscriptionRecord state and custom errors (E1-01)"
```

---

### Task 2: Implement `initialize_plan` Instruction (E1-02)

**Files:**
- Create: `packages/protocol/programs/tidepay/src/instructions/initialize_plan.rs`
- Modify: `packages/protocol/programs/tidepay/src/instructions.rs`
- Modify: `packages/protocol/programs/tidepay/src/lib.rs`

**Interfaces:**
- Consumes: `MerchantPlan`, `PLAN_SEED`, `TidePayError`
- Produces: `initialize_plan(ctx, plan_id, amount, interval_seconds, protocol_fee_bps, crank_bounty_amount)`

- [ ] **Step 1: Write `initialize_plan` Context and Handler**

Write `packages/protocol/programs/tidepay/src/instructions/initialize_plan.rs`:
```rust
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount};
use crate::constants::{PLAN_SEED, MIN_INTERVAL_SECONDS, MAX_PROTOCOL_FEE_BPS};
use crate::error::TidePayError;
use crate::state::MerchantPlan;

#[derive(Accounts)]
#[instruction(plan_id: String)]
pub struct InitializePlan<'info> {
    #[account(mut)]
    pub merchant: Signer<'info>,

    #[account(
        init,
        payer = merchant,
        space = 8 + MerchantPlan::INIT_SPACE,
        seeds = [PLAN_SEED, merchant.key().as_ref(), plan_id.as_bytes()],
        bump
    )]
    pub plan: Account<'info, MerchantPlan>,

    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        constraint = merchant_token_account.owner == merchant.key() @ TidePayError::Unauthorized,
        constraint = merchant_token_account.mint == token_mint.key() @ TidePayError::Unauthorized
    )]
    pub merchant_token_account: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handle_initialize_plan(
    ctx: Context<InitializePlan>,
    plan_id: String,
    amount: u64,
    interval_seconds: i64,
    protocol_fee_bps: u16,
    crank_bounty_amount: u64,
) -> Result<()> {
    require!(!plan_id.is_empty() && plan_id.len() <= 32, TidePayError::InvalidPlanId);
    require!(amount > 0, TidePayError::ZeroAmount);
    require!(interval_seconds >= MIN_INTERVAL_SECONDS, TidePayError::IntervalTooShort);
    require!(protocol_fee_bps <= MAX_PROTOCOL_FEE_BPS, TidePayError::InvalidFeeBps);

    let plan = &mut ctx.accounts.plan;
    plan.merchant = ctx.accounts.merchant.key();
    plan.token_mint = ctx.accounts.token_mint.key();
    plan.merchant_token_account = ctx.accounts.merchant_token_account.key();
    plan.amount = amount;
    plan.interval_seconds = interval_seconds;
    plan.plan_id = plan_id;
    plan.protocol_fee_bps = protocol_fee_bps;
    plan.crank_bounty_amount = crank_bounty_amount;
    plan.is_active = true;
    plan.bump = ctx.bumps.plan;

    Ok(())
}
```

- [ ] **Step 2: Export in `instructions.rs` & Expose in `lib.rs`**

Update `instructions.rs` and `lib.rs` to expose `initialize_plan`.

- [ ] **Step 3: Verify Compilation**

Run in `packages/protocol`: `cargo check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/protocol/programs/tidepay/src/instructions/initialize_plan.rs packages/protocol/programs/tidepay/src/instructions.rs packages/protocol/programs/tidepay/src/lib.rs
git commit -m "feat(protocol): implement initialize_plan instruction handler (E1-02)"
```

---

### Task 3: Implement `subscribe` Instruction with Epoch 0 Pull (E1-03)

**Files:**
- Create: `packages/protocol/programs/tidepay/src/instructions/subscribe.rs`
- Modify: `packages/protocol/programs/tidepay/src/instructions.rs`
- Modify: `packages/protocol/programs/tidepay/src/lib.rs`

**Interfaces:**
- Consumes: `MerchantPlan`, `SubscriptionRecord`, `transfer_checked` CPI via `AUTH_SEED`
- Produces: `subscribe(ctx)`

- [ ] **Step 1: Write `subscribe` Context and Execution**

Write `packages/protocol/programs/tidepay/src/instructions/subscribe.rs`:
```rust
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::constants::{AUTH_SEED, SUBSCRIPTION_SEED};
use crate::error::TidePayError;
use crate::state::{MerchantPlan, SubscriptionRecord};

#[derive(Accounts)]
pub struct Subscribe<'info> {
    #[account(mut)]
    pub subscriber: Signer<'info>,

    #[account(
        mut,
        constraint = plan.is_active @ TidePayError::SubscriptionInactive
    )]
    pub plan: Account<'info, MerchantPlan>,

    #[account(
        init,
        payer = subscriber,
        space = 8 + SubscriptionRecord::INIT_SPACE,
        seeds = [SUBSCRIPTION_SEED, plan.key().as_ref(), subscriber.key().as_ref()],
        bump
    )]
    pub subscription: Account<'info, SubscriptionRecord>,

    #[account(
        mut,
        constraint = subscriber_token_account.owner == subscriber.key() @ TidePayError::Unauthorized,
        constraint = subscriber_token_account.mint == plan.token_mint @ TidePayError::Unauthorized
    )]
    pub subscriber_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = merchant_token_account.key() == plan.merchant_token_account @ TidePayError::Unauthorized
    )]
    pub merchant_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_mint: InterfaceAccount<'info, Mint>,

    /// CHECK: TidePay delegated authority PDA
    #[account(seeds = [AUTH_SEED], bump)]
    pub program_authority: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handle_subscribe(ctx: Context<Subscribe>) -> Result<()> {
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;
    let plan = &ctx.accounts.plan;

    // Check delegated allowance
    let delegated_amount = ctx.accounts.subscriber_token_account.delegated_amount;
    require!(delegated_amount >= plan.amount, TidePayError::InsufficientAllowance);

    // 1. Mutate state BEFORE CPI (Anti-reentrancy)
    let subscription = &mut ctx.accounts.subscription;
    subscription.plan = plan.key();
    subscription.subscriber = ctx.accounts.subscriber.key();
    subscription.subscriber_token_account = ctx.accounts.subscriber_token_account.key();
    subscription.start_timestamp = now;
    subscription.last_epoch_timestamp = now;
    subscription.next_epoch_timestamp = now
        .checked_add(plan.interval_seconds)
        .ok_or(TidePayError::MathOverflow)?;
    subscription.cycle_count = 1;
    subscription.is_active = true;
    subscription.bump = ctx.bumps.subscription;

    // 2. Execute Epoch 0 transfer_checked via delegated pull authority
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.subscriber_token_account.to_account_info(),
        mint: ctx.accounts.token_mint.to_account_info(),
        to: ctx.accounts.merchant_token_account.to_account_info(),
        authority: ctx.accounts.program_authority.to_account_info(),
    };

    let auth_bump = ctx.bumps.program_authority;
    let seeds = &[AUTH_SEED, &[auth_bump]];
    let signer_seeds = &[&seeds[..]];

    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
    token_interface::transfer_checked(cpi_ctx, plan.amount, ctx.accounts.token_mint.decimals)?;

    Ok(())
}
```

- [ ] **Step 2: Wire in `lib.rs` and verify compilation**

Run in `packages/protocol`: `cargo check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/protocol/programs/tidepay/src/instructions/subscribe.rs packages/protocol/programs/tidepay/src/instructions.rs packages/protocol/programs/tidepay/src/lib.rs
git commit -m "feat(protocol): implement subscribe instruction with delegated Epoch 0 pull (E1-03)"
```

---

### Task 4: Implement `process_epoch` Instruction (E1-04)

**Files:**
- Create: `packages/protocol/programs/tidepay/src/instructions/process_epoch.rs`
- Modify: `packages/protocol/programs/tidepay/src/instructions.rs`
- Modify: `packages/protocol/programs/tidepay/src/lib.rs`

**Interfaces:**
- Consumes: Temporal verification (`now >= next_epoch_timestamp`), transfer split (Merchant, Crank Bounty)
- Produces: `process_epoch(ctx)`

- [ ] **Step 1: Write `process_epoch` Context and Split Transfers**

Write `packages/protocol/programs/tidepay/src/instructions/process_epoch.rs`:
- Verify `subscription.is_active` and `clock.unix_timestamp >= subscription.next_epoch_timestamp`.
- Update `last_epoch_timestamp = now`, `next_epoch_timestamp = now + interval`, and increment `cycle_count` **before** CPI calls.
- Split payout:
  - If `crank_bounty_amount > 0`: transfer bounty to `crank_token_account`.
  - Transfer remaining net (`plan.amount - crank_bounty_amount`) to `merchant_token_account`.
- Use `transfer_checked` signed by `[AUTH_SEED, &[auth_bump]]`.

- [ ] **Step 2: Wire in `lib.rs` and verify compilation**

Run in `packages/protocol`: `cargo check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/protocol/programs/tidepay/src/instructions/process_epoch.rs packages/protocol/programs/tidepay/src/instructions.rs packages/protocol/programs/tidepay/src/lib.rs
git commit -m "feat(protocol): implement process_epoch with time-lock and crank bounty split (E1-04)"
```

---

### Task 5: Implement `cancel_subscription` Instruction (E1-05)

**Files:**
- Create: `packages/protocol/programs/tidepay/src/instructions/cancel_subscription.rs`
- Modify: `packages/protocol/programs/tidepay/src/instructions.rs`
- Modify: `packages/protocol/programs/tidepay/src/lib.rs`

**Interfaces:**
- Consumes: `close = subscriber` rent reclamation
- Produces: `cancel_subscription(ctx)`

- [ ] **Step 1: Write `cancel_subscription` with Rent Return**

Write `packages/protocol/programs/tidepay/src/instructions/cancel_subscription.rs`:
```rust
use anchor_lang::prelude::*;
use crate::constants::SUBSCRIPTION_SEED;
use crate::error::TidePayError;
use crate::state::{MerchantPlan, SubscriptionRecord};

#[derive(Accounts)]
pub struct CancelSubscription<'info> {
    #[account(mut)]
    pub subscriber: Signer<'info>,

    pub plan: Account<'info, MerchantPlan>,

    #[account(
        mut,
        close = subscriber,
        seeds = [SUBSCRIPTION_SEED, plan.key().as_ref(), subscriber.key().as_ref()],
        bump = subscription.bump,
        constraint = subscription.subscriber == subscriber.key() @ TidePayError::Unauthorized
    )]
    pub subscription: Account<'info, SubscriptionRecord>,
}

pub fn handle_cancel_subscription(_ctx: Context<CancelSubscription>) -> Result<()> {
    // Account is automatically zeroed and rent returned to subscriber via `close = subscriber`
    Ok(())
}
```

- [ ] **Step 2: Wire in `lib.rs` and verify compilation**

Run in `packages/protocol`: `anchor build`
Expected: IDL generated in `packages/protocol/target/idl/tidepay.json`.

- [ ] **Step 3: Commit**

```bash
git add packages/protocol/programs/tidepay/src/instructions/cancel_subscription.rs packages/protocol/programs/tidepay/src/instructions.rs packages/protocol/programs/tidepay/src/lib.rs
git commit -m "feat(protocol): implement cancel_subscription with rent refund (E1-05)"
```

---

### Task 6: Comprehensive Test Suite (E1-06)

**Files:**
- Create: `packages/protocol/tests/tidepay.ts`
- Modify: `packages/protocol/Anchor.toml`

**Interfaces:**
- Tests: Happy path flow (initialize plan -> subscribe -> process epoch -> cancel), premature crank pull revert (`EpochNotDue`), insufficient allowance revert.

- [ ] **Step 1: Write Full Integration Test in TypeScript**

Create `packages/protocol/tests/tidepay.ts`:
- Setup SPL mint (USDC simulation), merchant ATA, subscriber ATA.
- Test 1: Initialize Merchant Plan with 60-second interval.
- Test 2: Approve delegation & execute `subscribe` (verify Epoch 0 balance transferred).
- Test 3: Attempt premature `process_epoch` before 60s (verify `EpochNotDue` failure).
- Test 4: Fast-forward time (or wait interval) and execute `process_epoch` (verify crank receives bounty, merchant receives net).
- Test 5: Cancel subscription (verify `SubscriptionRecord` closed and subscriber receives rent).

- [ ] **Step 2: Run Tests**

Run: `anchor test` or `pnpm run anchor:test`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/protocol/tests/tidepay.ts packages/protocol/Anchor.toml
git commit -m "test(protocol): add comprehensive test suite covering normal flow, time locks and reverts (E1-06)"
```

---

### Task 7: Build `@tidepay/sdk` and Sync IDL Types (E1-07)

**Files:**
- Sync: Copy IDL to `packages/types/src/idl.json` and generate type definitions in `packages/types/src/index.ts`
- Modify: `packages/sdk/src/index.ts`
- Modify: `packages/sdk/package.json`

**Interfaces:**
- Produces: `TidePayClient` class with:
  - `createPlanInstruction(...)`
  - `createSubscriptionTx(...)`
  - `createProcessEpochInstruction(...)`
  - `createCancelSubscriptionInstruction(...)`
  - PDA derivation utilities (`findMerchantPlanPda`, `findSubscriptionRecordPda`, `findProgramAuthorityPda`)

- [ ] **Step 1: Populate Types & IDL in `@tidepay/types`**

Export exact Anchor-generated IDL and TypeScript interfaces in `packages/types/src/index.ts`.

- [ ] **Step 2: Implement `TidePayClient` in `@tidepay/sdk`**

Implement helper methods constructing `TransactionInstruction` and signed `Transaction` instances with BigInt hygiene.

- [ ] **Step 3: Build & Typecheck SDK**

Run from root: `pnpm --filter @tidepay/sdk exec tsc --noEmit`
Expected: PASS with 0 type errors.

- [ ] **Step 4: Commit**

```bash
git add packages/types/ packages/sdk/
git commit -m "feat(sdk): implement TidePayClient and PDA utility methods (E1-07)"
```

---

### Task 8: Build the Keeper Crank Worker (E1-08)

**Files:**
- Modify: `packages/protocol/crank/src/index.ts`
- Modify: `packages/protocol/crank/package.json`

**Interfaces:**
- Consumes: `@tidepay/sdk`, `@coral-xyz/anchor`, `@solana/web3.js`
- Produces: Persistent keeper loop polling `getProgramAccounts` for active subscriptions where `next_epoch_timestamp <= Date.now() / 1000`, with lock pool for in-flight transactions.

- [ ] **Step 1: Implement Batch Polling & In-Flight Lock Pool**

Write `packages/protocol/crank/src/index.ts`:
- Load keeper keypair from environment or fallback dev keypair.
- Instantiate `Set<string>` in-flight lock pool to prevent duplicate pulls.
- Poll every 10 seconds:
  1. Fetch `SubscriptionRecord` accounts using `memcmp` for `is_active: true`.
  2. Filter for `next_epoch_timestamp <= current_unix_timestamp`.
  3. Batch execute `process_epoch` instructions with exponential backoff on RPC rate limits.

- [ ] **Step 2: Verify Crank Startup**

Run: `pnpm --filter @tidepay/crank exec tsx src/index.ts`
Expected: Prints initialization log and starts polling without exceptions.

- [ ] **Step 3: Commit**

```bash
git add packages/protocol/crank/
git commit -m "feat(crank): implement automated keeper daemon with concurrency locks (E1-08)"
```

---

## Self-Review Checklist
1. **Spec coverage:** Covers E1-01 (State), E1-02 (Initialize Plan), E1-03 (Subscribe), E1-04 (Process Epoch), E1-05 (Cancel), E1-06 (Testing), E1-07 (SDK), E1-08 (Crank).
2. **Security compliance:** Enforces anti-reentrancy state mutation order, PDA checks, explicit integer bounds, and rent reclamation.
3. **Type consistency:** Identical PDA seeds and data types shared between Rust program, `@tidepay/types`, `@tidepay/sdk`, and `@tidepay/crank`.
