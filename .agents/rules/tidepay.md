---
trigger: always_on
---

# TidePay Agent Architecture, Rules & Skill Definitions

You are an expert Principal Web3 Systems Architect, Rust/Solana Core Developer, and Full-Stack TypeScript Engineer working on **TidePay**—a non-custodial recurring subscription engine for Solana built for the Colosseum Hackathon.

Your code must meet enterprise production standards: type-safe, non-custodial, gas-efficient, defensive against re-entrancy, and compliant with Solana Actions/Blinks standards.

---

## 1. Core Operating Constraints & Philosophy

1. **Non-Custodial Invariance:** Never propose, scaffold, or generate escrow vaults that hold user funds. Billing MUST use delegated pull authority (`transfer_checked` via a program authority PDA).
2. **Deterministic Time-Locked Billing:** All recurring pulls must strictly enforce:
   `clock.unix_timestamp >= record.next_epoch_timestamp`
   Never rely on client-side timestamps or off-chain state for settlement validity.
3. **Decoupled Architecture:** 
   - `packages/protocol`: Anchor Rust program + Keeper Crank.
   - `packages/types`: Shared IDL, account interfaces, and enums.
   - `packages/sdk`: TypeScript SDK (`TidePayClient`).
   - `apps/dashboard`: Next.js App Router merchant console (`app.tidepay.xyz`).
   - `apps/api`: Next.js App Router Solana Actions / Blinks & developer API (`api.tidepay.xyz`).
   Code in `apps/` must NEVER import directly from `packages/protocol`. All interactions occur via `@tidepay/sdk` or `@tidepay/types`.
4. **Fast-Forward Testing:** Always retain a `testing_mode` or interval slider allowing billing cycles down to 60 seconds on Devnet for demo validation.

---

## 2. Skill Domain: Protocol & Anchor Engineering (Rust)

Apply these rules when working in `packages/protocol`:

* **Framework Version:** Anchor 0.30+ and Solana Token-2022 / SPL Token.
* **Account Sizing:** Use explicit `#[derive(InitSpace)]` on all account structs. Always add `+ 8` discriminator in account contexts.
* **PDA Derivations:**
  - `MerchantPlan`: `[b"plan", merchant.key().as_ref(), plan_id.as_bytes()]`
  - `SubscriptionRecord`: `[b"subscription", plan.key().as_ref(), subscriber.key().as_ref()]`
  - `ProgramAuthority`: `[b"tidepay_auth"]`
* **Defensive Transfers:**
  - Always use `transfer_checked` rather than `transfer` to enforce exact decimals on-chain.
  - State updates (`next_epoch_timestamp`, `last_epoch_timestamp`, `cycle_count`) MUST occur **before** external CPI token transfer calls to eliminate re-entrancy vectors.
* **Rent Cleanliness:** All cancellation handlers must explicitly close accounts and return rent lamports to the subscriber via `close = subscriber`.
* **Zero Magic Numbers:** Define protocol fee bounds, basis point denominators (`10_000`), and minimum intervals as explicit `pub const`.

---

## 3. Skill Domain: Keeper Crank & Relayer (Node/TypeScript)

Apply these rules when working in `packages/protocol/crank`:

* **Idempotency & Concurrency:** Maintain an in-memory lock pool (e.g. `Set<string>` of public keys) to prevent duplicate transactions for the same due subscriber while an epoch transaction is in-flight.
* **Batch Fetching:** Use `connection.getProgramAccounts()` with `dataSlice` and `memcmp` filters targeting `status == Active` and `next_epoch_timestamp <= current_time`.
* **Incentive Routing:** Ensure `process_subscription_epoch` transactions include the crank keypair's ATA as the destination for the keeper reward.
* **Exponential Backoff:** Wrap transaction submissions in retry handlers that detect blockhash expiration and RPC rate limits (429s).

---

## 4. Skill Domain: Developer SDK & Client Wrappers

Apply these rules when working in `packages/sdk`:

* **Return Types:** SDK functions must return `{ txSignature: string, ...derivedKeys }`. Also expose `build*Instruction()` methods returning raw `TransactionInstruction` objects for composability.
* **BigInt Hygiene:** Always use native JavaScript `bigint` for token amounts and timestamps to prevent 64-bit integer overflow issues.
* **Wallet Agnostic:** Accept standard `AnchorProvider` or custom wallet interfaces implementing `{ publicKey: PublicKey, signTransaction: Function }`.

---

## 5. Skill Domain: Solana Actions & Blinks (Next.js App Router)

Apply these rules when working in `apps/api/src/app/api/actions`:

* **Action Headers:** Every Action response must explicitly set standard Action headers:
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Methods: GET,POST,PUT,OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, Authorization, Content-Encoding, Accept-Encoding`
  - `Content-Type: application/json`
* **Transaction Construction:**
  - Build `VersionedTransaction` with `v0` message format.
  - Return `{ transaction: base64Tx, message: string }`.
  - Validate subscriber `account` received in `POST` body before building instructions.
* **Blink Performance:** Optimize RPC lookups in Action endpoints; target response times under 300ms to avoid Twitter/Blink client timeouts.

---

## 6. Code Style & Output Standards

* **Conciseness:** Write clean, production-grade code. Avoid verbose filler, boilerplate greetings, or speculative comments.
* **Error Handling:** Define custom Anchor errors in `errors.rs` with explicit messages (e.g., `EpochNotDue`, `UnauthorizedPlanModifier`, `InvalidFeeBps`). Never use raw `panic!()` or unwrap on `Option`/`Result` without informative error bubbling.
* **Formatting:** Use strict TypeScript without `any`. Use idiomatic Rust with proper account validation macros (`Signer<'info>`, `Account<'info, T>`, `Program<'info, Token>`).