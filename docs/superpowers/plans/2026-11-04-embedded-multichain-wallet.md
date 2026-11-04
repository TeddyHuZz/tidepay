# Embedded Multi-Chain Merchant Wallet & NEAR Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A merchant signs in once (email, Google, or Solana wallet) and can create, view, pause and share recurring plans on Solana Devnet or NEAR Testnet from `apps/dashboard`, without installing or switching to a NEAR wallet. NEAR plans get a checkout link that looks like the Solana one.

**Architecture:** The merchant's NEAR key is derived in the browser from a signature by their Solana wallet (Privy embedded wallet or Phantom), kept in memory only, and used as an implicit NEAR account (64-hex id) that a testnet gas-sponsor route funds. The contract gains two index views so the dashboard can list a merchant's plans and a plan's subscribers. NEAR plans are merged into the existing `MerchantData` with a `near:` id prefix, so the plan list, overview and subscribers views keep working. Subscribers on NEAR pay with a NEAR wallet (NEAR Connect) on `/checkout/near/[planId]`; the card reuses a shared shell so it matches the Solana checkout.

**Tech Stack:** Rust `near-sdk` 5, TypeScript, Next.js 16 (`apps/dashboard`, `apps/api`), `@privy-io/react-auth` ^3.48, `near-api-js` ^7.4, `@tidepay/sdk-near`, NEAR Connect (`@hot-labs/near-connect`), `vitest` ^5.

**Spec:** The 2026-11-04 design discussion (merchant-only wallet unification; subscribers keep their own chain wallet; NEAR checkout styled like Solana's), `docs/superpowers/plans/2026-11-03-near-integration.md` (contract, SDK, keeper this builds on), and `docs/ARCHITECTURE_AND_PRD.md`.

## Global Constraints

- **Merchant never switches wallets:** NEAR plan creation, listing, pausing and link sharing work with only the Privy/Solana session. Subscribers may use their own chain wallet.
- **Non-custodial:** the derived NEAR secret key is held in memory only. Never write it to `localStorage`, cookies, logs or any request. The sponsor route holds only a gas-money key, never merchant keys.
- **Derivation is fixed forever:** message `TidePay NEAR account v1\n<solana-address>`, seed = SHA-256 of the 64-byte ed25519 signature. Changing it orphans every merchant's NEAR account.
- **Testnet defaults:** NEAR Testnet, RPC `https://test.rpc.fastnear.com` (override with `NEXT_PUBLIC_NEAR_RPC_URL`; `rpc.testnet.near.org` now rejects requests), token `usdc.fakes.testnet` (6 decimals, open `mint`), contract id from `NEXT_PUBLIC_TIDEPAY_NEAR_CONTRACT`.
- **Constants, not literals:** NEAR protocol fee `NEAR_PROTOCOL_FEE_BPS = 50`, crank bounty `0.05` USDC (same as `DEFAULT_CRANK_BOUNTY_USDC`), minimum interval 60 s, `MIN_MERCHANT_NEAR_YOCTO = 0.1 NEAR`, `SPONSOR_AMOUNT_YOCTO = 0.5 NEAR`, `TOKEN_STORAGE_DEPOSIT_YOCTO = 0.02 NEAR`, contract page size cap `MAX_PAGE_SIZE = 100`.
- **SDK only:** the dashboard talks to the NEAR contract through `@tidepay/sdk-near`, never raw `functionCall` with hand-built args.
- **ID rule:** `PlanSummary.id` for NEAR plans is `near:<planId>`; Solana ids stay base58 addresses. Anything that branches on chain uses `isNearPlanId(id)` from `src/lib/near/ids.ts`, not string checks inline.
- **Known limit (document in README, do not fix here):** NEAR plan ids are global across merchants, so a taken id returns `ERR_PLAN_EXISTS`.
- **Baseline to keep green:** `pnpm --filter dashboard exec tsc --noEmit` clean and 39 dashboard tests passing at the start. Every task ends with typecheck and tests passing.

## Review Focus

- Wallet signs the derivation message non-deterministically → silently a different NEAR account on next login. Expected: refuse and tell the user, never use the new key. (Task 4)
- Merchant account not registered on the token → payouts fail and strand funds. Expected: plan creation blocked until registration succeeds. (Task 4, Task 6)
- NEAR RPC down or slow → Solana plans must still load; NEAR section shows an error, not a blank dashboard. (Task 5)
- Sponsor route abused: repeated calls, invalid ids, mainnet. Expected: only tops up accounts below the minimum, per-IP limit, testnet only. (Task 3)
- NEAR checkout for a missing, paused or already-subscribed plan, or a subscriber without enough test USDC. Expected: the same notices the Solana card shows, never a crash. (Task 8)

## File Structure

| File | Responsibility |
| --- | --- |
| `packages/contracts-near/src/lib.rs`, `tests/unit_tests.rs` | Index storage and the two new views |
| `packages/sdk-near/src/client.ts` | `getMerchantPlans`, `getPlanSubscribers`, `togglePlanStatus`, `cancelSubscription` already present |
| `packages/protocol-near/crank/scripts/deploy.ts`, `scripts/deploy-near-contract.sh` | Deploy the canonical testnet contract and register it, the fee recipient on the token |
| `apps/api/src/lib/near-sponsor.ts`, `src/app/api/near/sponsor/route.ts` | Gas sponsorship for implicit accounts |
| `apps/dashboard/src/lib/near/ids.ts` | `isNearPlanId`, `toNearPlanId`, `fromNearPlanId` |
| `apps/dashboard/src/lib/near/derive-key.ts` | Pure: signature → NEAR key pair → implicit account id |
| `apps/dashboard/src/lib/near/config.ts` | NEAR constants, `nearExplorerUrl`, token config |
| `apps/dashboard/src/lib/near/merchant-data.ts` | Pure: contract records → `MerchantData`; `mergeMerchantData` |
| `apps/dashboard/src/lib/near/errors.ts` | `describeNearError` |
| `apps/dashboard/src/hooks/use-near-merchant.ts` | Derive, fund, register, expose a `TidePayNearClient` |
| `apps/dashboard/src/hooks/use-near-subscriber.ts` | NEAR Connect wallet for checkout |
| `apps/dashboard/src/components/checkout/checkout-shell.tsx` | Shared checkout layout used by both chains |
| `apps/dashboard/src/app/checkout/near/[planId]/page.tsx`, `components/checkout/near-checkout-card.tsx` | NEAR checkout |

---

### Task 1: Contract index views (merchant plans, plan subscribers)

**Files:**
- Modify: `packages/contracts-near/src/lib.rs`
- Modify: `packages/contracts-near/src/types.rs` (add `MAX_PAGE_SIZE`)
- Modify: `packages/contracts-near/tests/unit_tests.rs`

**Interfaces:**
- Produces on `TidePayContract`:
  - `get_merchant_plans(&self, merchant_id: AccountId, from_index: u64, limit: u64) -> Vec<MerchantPlan>`
  - `get_plan_subscribers(&self, plan_id: String, from_index: u64, limit: u64) -> Vec<SubscriptionRecord>`
- Both clamp `limit` to `MAX_PAGE_SIZE` (100) and return an empty vec past the end.
- State gains `merchant_plans: LookupMap<AccountId, Vec<String>>` (prefix `b"m"`) and `plan_subscribers: LookupMap<String, Vec<AccountId>>` (prefix `b"u"`). The layout changes, so this requires a fresh deploy; no migration.

- [ ] **Step 1: Write failing tests** in `tests/unit_tests.rs`: `test_get_merchant_plans_lists_only_that_merchants_plans` (two merchants, three plans; each merchant sees their own), `test_get_plan_subscribers_paginates` (3 subscribers, `limit=2` then `from_index=2`), `test_resubscribe_after_cancel_does_not_duplicate_subscriber` (subscribe, cancel, subscribe again → one entry), `test_limit_is_clamped` (limit 10_000 returns at most 100).
- [ ] **Step 2: Run** `cargo test --manifest-path packages/contracts-near/Cargo.toml` → the new tests fail to compile (methods missing).
- [ ] **Step 3: Implement.** `create_plan` pushes the id onto the caller's list. The `subscribe` branch of `ft_on_transfer` pushes the subscriber only when no record existed before. Add `// shortcut: Vec per key is unbounded, move to store::IterableSet if a plan exceeds a few thousand subscribers`.
- [ ] **Step 4: Run** the same command → all tests (existing 9 plus the 4 new) pass, no warnings; then `cargo check --target wasm32-unknown-unknown` clean.
- [ ] **Step 5: Regression gate.** Run the testnet flow with a fresh funded account (create one via `https://helper.testnet.near.org/account`, as in Task 7 of the NEAR plan): `NEAR_ACCOUNT_ID=... NEAR_PRIVATE_KEY=... ./scripts/test-near-flow.sh` → ends with `SUCCESS`.
- [ ] **Step 6: Commit** `feat(near): add merchant-plans and plan-subscribers index views`.

---

### Task 2: SDK methods and canonical testnet deployment

**Files:**
- Modify: `packages/sdk-near/src/client.ts`, `packages/sdk-near/tests/client.test.ts`
- Create: `packages/protocol-near/crank/scripts/deploy.ts`, `scripts/deploy-near-contract.sh`
- Modify: `apps/dashboard/.env.example` (create if missing)

**Interfaces:**
- Consumes: Task 1 views.
- Produces on `TidePayNearClient`:
  - `getMerchantPlans(merchantId: string, fromIndex = 0, limit = 100): Promise<MerchantPlan[]>`
  - `getPlanSubscribers(planId: string, fromIndex = 0, limit = 100): Promise<SubscriptionRecord[]>`
  - `togglePlanStatus(planId: string, isActive: boolean)` calling `toggle_plan_status`
  - `getFtBalance(tokenId: string, accountId: string): Promise<bigint>`
  - `isStorageRegistered(tokenId: string, accountId: string): Promise<boolean>` (via `storage_balance_of`)
  - `registerStorage(tokenId: string, accountId: string)` calling `storage_deposit` with `registration_only: true` and deposit `TOKEN_STORAGE_DEPOSIT_YOCTO`.

- [ ] **Step 1: Write failing tests** in `tests/client.test.ts` using the existing mock account: `getMerchantPlans` sends `{merchant_id, from_index, limit}` to view `get_merchant_plans` and returns `[]` for an undefined result; `togglePlanStatus` sends `{plan_id, is_active}`; `isStorageRegistered` is `false` for a `null` result and `true` for an object; `registerStorage` attaches the deposit constant.
- [ ] **Step 2: Run** `pnpm --filter @tidepay/sdk-near test` → fails.
- [ ] **Step 3: Implement** the methods; keep `pnpm --filter @tidepay/sdk-near build` (tsc) clean.
- [ ] **Step 4: Run** tests → pass.
- [ ] **Step 5: Write `scripts/deploy.ts`.** Using one funded account from env, it creates `tidepay-<base36 time>.<account>`, deploys the release wasm, calls `new` with a treasury sub-account, then registers the contract and the treasury on `usdc.fakes.testnet`. It prints `NEXT_PUBLIC_TIDEPAY_NEAR_CONTRACT=<id>`. `deploy-near-contract.sh` builds the wasm and calls it, same shape as `test-near-flow.sh`.
- [ ] **Step 6: Deploy once** with a throwaway funded account; verify with `get_merchant_plans` for any account → `[]`. Put the printed id in `apps/dashboard/.env.example` and `apps/dashboard/.env.local` (the latter stays uncommitted).
- [ ] **Step 7: Commit** `feat(near): sdk index and storage helpers; deploy script for canonical testnet contract`.

---

### Task 3: Gas sponsor route

**Files:**
- Create: `apps/api/src/lib/near-sponsor.ts`, `apps/api/src/lib/near-sponsor.test.ts`
- Create: `apps/api/src/app/api/near/sponsor/route.ts`
- Modify: `apps/api/package.json` (add `near-api-js` ^7.4.0), `apps/api/.env.example`

**Interfaces:**
- Produces `POST /api/near/sponsor` with body `{ accountId: string }` → `200 { funded: boolean, balanceYocto: string, txHash?: string }`. Errors: `400` invalid id, `429` rate limited, `503` not configured or mainnet.
- Pure helpers in `near-sponsor.ts`: `isImplicitAccountId(id: string): boolean` (64 lowercase hex) and `sponsorAmount(balanceYocto: bigint): bigint` (returns `SPONSOR_AMOUNT_YOCTO` when `balanceYocto < MIN_MERCHANT_NEAR_YOCTO`, else `0n`).
- `near-sponsor.ts` defines `MIN_MERCHANT_NEAR_YOCTO` and `SPONSOR_AMOUNT_YOCTO` itself (`apps/api` cannot import dashboard code); the values match the Global Constraints.
- Env (server only): `NEAR_NETWORK_ID` (default `testnet`), `NEAR_SPONSOR_ACCOUNT_ID`, `NEAR_SPONSOR_PRIVATE_KEY`, optional `NEAR_RPC_URL`.

- [ ] **Step 1: Write failing tests**: `isImplicitAccountId` accepts 64 hex, rejects uppercase, 63 chars, named accounts, empty; `sponsorAmount` returns 0 at exactly `MIN_MERCHANT_NEAR_YOCTO` and the sponsor amount just below; a route-level test with the provider and `Account` mocked: invalid id → 400, mainnet env → 503, funded account → `funded: false` with no transfer, empty account → one transfer of the sponsor amount.
- [ ] **Step 2: Run** `pnpm --filter api exec vitest run src/lib/near-sponsor.test.ts` → fails.
- [ ] **Step 3: Implement.** Follow the Next route conventions already used in `src/app/api/near/intents/quote/route.ts` (CORS headers, `checkRateLimit` with key `near-sponsor:<ip>` at 5 per minute). A missing account is treated as balance 0.
- [ ] **Step 4: Run** `pnpm --filter api exec vitest run` and `pnpm --filter api exec tsc --noEmit` → pass.
- [ ] **Step 5: Live check.** Start the API, `curl -X POST localhost:3001/api/near/sponsor -d '{"accountId":"<fresh 64-hex>"}'` → `funded: true` with a tx hash on `testnet.nearblocks.io`; repeat → `funded: false`.
- [ ] **Step 6: Commit** `feat(api): testnet gas sponsor route for embedded NEAR accounts`.

---

### Task 4: Derived NEAR key, Privy login, and the merchant hook

**Files:**
- Create: `apps/dashboard/src/lib/near/{config,ids,derive-key,errors}.ts` and a `.test.ts` beside `ids`, `derive-key`, `errors`
- Create: `apps/dashboard/src/hooks/use-near-merchant.ts`
- Modify: `apps/dashboard/src/components/wallet/privy-provider.tsx` (config only), `apps/dashboard/package.json` (add `near-api-js` ^7.4.0, `@tidepay/sdk-near` workspace)

**Interfaces:**
- Produces `ids.ts`: `isNearPlanId(id: string): boolean`, `toNearPlanId(planId: string): string` → `near:<planId>`, `fromNearPlanId(id: string): string`.
- Produces `derive-key.ts`:
  - `NEAR_DERIVE_MESSAGE(solanaAddress: string): string` → the fixed message above.
  - `keyPairFromSignature(signature: Uint8Array): KeyPair` (SHA-256 → 32-byte seed → `Keypair.fromSeed` from `@solana/web3.js` → `KeyPair.fromString("ed25519:" + baseEncode(secretKey64))`).
  - `implicitAccountId(keyPair: KeyPair): string` (64 lowercase hex of the public key bytes).
  - `assertStableDerivation(stored: string | null, derivedPublicKey: string): void`, which throws `NearDerivationMismatchError` when `stored` is non-null and differs. The public key (never the secret) is remembered in `localStorage` under `tidepay:near:pk:<solanaAddress>`.
- Produces `errors.ts`: `describeNearError(error: unknown): string` mapping contract panics (`ERR_PLAN_EXISTS` → "A plan with this ID already exists on NEAR. Choose another ID.", `ERR_INVALID_INTERVAL`, `ERR_INVALID_BOUNTY`, `ERR_INVALID_FEE`, `ERR_PLAN_NOT_FOUND`, `ERR_UNAUTHORIZED`) and falling back to the error message.
- Produces `useNearMerchant(): { status: "idle"|"deriving"|"funding"|"registering"|"ready"|"error"; accountId: string | null; client: TidePayNearClient | null; error: string | null; prepare: () => Promise<void> }`. Derivation happens only when `prepare()` is called (never at login). `prepare` runs: sign message → derive key → check stability → ensure funded via `POST {API_URL}/api/near/sponsor` → ensure token registration via `client.isStorageRegistered`/`registerStorage` → `ready`. Calling it again when `ready` is a no-op.

- [ ] **Step 1: Write failing tests**: `ids` round-trip and non-NEAR ids; `keyPairFromSignature` is deterministic for the same 64-byte input, differs for a different input, and `implicitAccountId` matches `/^[0-9a-f]{64}$/` and equals the hex of the key's public bytes; a signature produced by `tweetnacl`/`@solana/web3.js` signing the same message twice yields the same key (documents the determinism assumption); `assertStableDerivation` passes on null and equal, throws on different; `describeNearError` maps each listed code.
- [ ] **Step 2: Run** `pnpm --filter dashboard exec vitest run src/lib/near` → fails.
- [ ] **Step 3: Implement** the pure modules, then the hook. Sign with Privy's `useSignMessage` from `@privy-io/react-auth/solana` using the wallet from `useWallets()`. First read `apps/dashboard/node_modules/@privy-io/react-auth/dist/dts/solana.d.mts` to confirm the input/output shape, and whether it works for an external wallet (Phantom). If it does not, show "Sign in with email to use NEAR plans" instead of failing silently.
- [ ] **Step 4: Privy config.** In `PrivyAppProvider`: set `loginMethods: ["email","google","wallet"]`, add `embeddedWallets: { solana: { createOnLogin: "users-without-wallets" } }`, keep the Solana connectors. Remove `walletChainType: "solana-only"` only if sign-in with email fails without it. Record in the PR notes that email and Google must also be enabled in the Privy dashboard for app `cmv19y55j00y60fkznnp0edbw`.
- [ ] **Step 5: Run** `pnpm --filter dashboard exec vitest run` and `tsc --noEmit` → 39 existing plus the new tests pass, typecheck clean.
- [ ] **Step 6: Manual check** (record outcome in the PR): log in by email → `prepare()` from a temporary button or the Task 6 form → account funded on nearblocks, token registration visible, second login on a different browser profile yields the same account id.
- [ ] **Step 7: Commit** `feat(dashboard): derive embedded NEAR account from Solana wallet signature`.

---

### Task 5: NEAR data in the console

**Files:**
- Create: `apps/dashboard/src/lib/near/merchant-data.ts`, `merchant-data.test.ts`
- Modify: `apps/dashboard/src/lib/types.ts`, `apps/dashboard/src/lib/chain/config.ts`, `apps/dashboard/src/components/merchant-data-provider.tsx`

**Interfaces:**
- Consumes: Task 2 client methods, Task 4 `useNearMerchant`, `isNearPlanId`.
- Produces in `types.ts`: optional `network?: "solana" | "near"` on `PlanSummary` and `SubscriberRow` (absent means Solana).
- Produces `merchant-data.ts`:
  - `deriveNearMerchantData(plans: MerchantPlan[], subscriptionsByPlan: Record<string, SubscriptionRecord[]>, nowSeconds: number): MerchantData` (plan ids `near:<id>`, `network: "near"`, statuses via the same past-due grace as Solana, activity from each subscription's last epoch).
  - `mergeMerchantData(solana: MerchantData, near: MerchantData | null): MerchantData` concatenates plans, subscribers and activity (sorted newest first, top 8) and sums the three numeric metrics ("Active MRR", "Total subscribers", "Successful pulls") by label. A `null` near returns `solana` unchanged.
- Produces in `config.ts`: `planLinks(planId: string, env?: "sandbox"|"live"): { checkout: string; blink: string | null; explorerAddress: (value: string) => string; explorerTx: (value: string) => string }`. `checkoutUrl` for a `near:` id returns `${APP_URL}/checkout/near/<planId>`; `blink` is `null` for NEAR.
- The provider adds a `nearError: string | null` to its context value.

- [ ] **Step 1: Write failing tests**: `deriveNearMerchantData` for one active plan with one subscriber (price formatted with `formatUsdc`, MRR normalised to 30 days, subscriber count), a cancelled subscriber (status `Cancelled`, excluded from MRR), an overdue one (`PastDue`); `mergeMerchantData` with `null` is identity, sums metrics, and keeps Solana plans when NEAR has none; `planLinks("near:pro")` has no blink and a `/checkout/near/pro` checkout link, `planLinks(<base58>)` is unchanged from today's `checkoutUrl`/`blinkUrl`.
- [ ] **Step 2: Run** `pnpm --filter dashboard exec vitest run src/lib/near/merchant-data.test.ts` → fails.
- [ ] **Step 3: Implement** the pure functions and `planLinks`.
- [ ] **Step 4: Wire the provider.** When `useNearMerchant().client` exists, load `getMerchantPlans` then `getPlanSubscribers` per plan, derive, and merge before the existing project scoping. A NEAR failure sets `nearError` and leaves Solana data untouched. The existing project filter still applies; `addPlanToActiveProject` is called with both `near:<id>` and `<id>` (Task 6), so the current `allowed.includes(p.id) || allowed.includes(p.name)` rule works unchanged.
- [ ] **Step 5: Run** the dashboard tests and `tsc --noEmit` → pass.
- [ ] **Step 6: Commit** `feat(dashboard): load and merge NEAR plans into merchant data`.

---

### Task 6: Create NEAR plans from the plan form

**Files:**
- Modify: `apps/dashboard/src/components/plans/plan-form.tsx`
- Create: `apps/dashboard/src/lib/near/plan-args.ts`, `plan-args.test.ts`

**Interfaces:**
- Consumes: `useNearMerchant`, `TidePayNearClient.createPlan`, `describeNearError`, `toNearPlanId`.
- Produces `plan-args.ts`: `buildNearCreatePlanParams(input: { planId: string; amount: bigint; intervalSeconds: number }): Parameters<TidePayNearClient["createPlan"]>[0]` filling `tokenId = NEAR_USDC_TOKEN_ID`, `crankBounty = parseUsdc(DEFAULT_CRANK_BOUNTY_USDC)`, `protocolFeeBps = NEAR_PROTOCOL_FEE_BPS`.

- [ ] **Step 1: Write failing tests** for `buildNearCreatePlanParams` (exact values: bounty `50000n`, fee `50`, token `usdc.fakes.testnet`) and a guard `nearPriceTooLow(amount, bounty, feeBps)` that is true when `fee + bounty >= amount` (mirrors the contract's `ERR_INVALID_BOUNTY` check so the form blocks it before sending).
- [ ] **Step 2: Run** → fails. **Step 3: Implement.**
- [ ] **Step 4: Form changes.** Add a "Network" segmented control at the top (Solana Devnet / NEAR Testnet), styled with the same classes as the existing token selector. For NEAR: hide the SOL token option; fee and renewal copy use the NEAR constants; the helper text under the form says subscribers prepay cycles instead of approving a delegated allowance; the 60-second minimum already applies via `intervalSeconds >= 60`. On submit, `await prepare()` first (show status text for funding/registering), then `client.createPlan(...)`, then `addPlanToActiveProject(toNearPlanId(planId))` and `addPlanToActiveProject(planId)`, `refresh()`, toast, and redirect to `/plans/${encodeURIComponent(toNearPlanId(planId))}`. Errors go through `describeNearError`. The Solana path stays byte-for-byte unchanged.
- [ ] **Step 5: Run** tests and `tsc --noEmit` → pass.
- [ ] **Step 6: Manual check:** create `near-pro-1` at 1 USDC / 60 s on NEAR; it appears in the plan list after refresh; creating it again shows the friendly `ERR_PLAN_EXISTS` message.
- [ ] **Step 7: Commit** `feat(dashboard): create NEAR plans from the unified plan form`.

---

### Task 7: Network-aware console views

**Files:**
- Modify: `apps/dashboard/src/components/console/{plans-view,plan-detail-view,overview-view,subscribers-view,share-blink-button}.tsx`, `apps/dashboard/src/components/wallet-button.tsx`

**Interfaces:**
- Consumes: `planLinks`, `isNearPlanId`, `fromNearPlanId`, `useNearMerchant`, `client.togglePlanStatus`.

- [ ] **Step 1:** Replace every direct `checkoutUrl(...)`, `blinkUrl(...)`, `explorerUrl(...)` call in the four console views with `planLinks(...)`. Hide the Blink share control when `blink` is `null`. Show a small "NEAR" badge next to the plan name for `network === "near"`.
- [ ] **Step 2: Plan detail for NEAR plans.** Skip the Solana-only data fetches (`fetchPlanActivity`, `fetchDatabaseSettlements`, `parseAddress`) when `isNearPlanId(plan.id)`; show stats, subscribers and links from `MerchantData`, and replace the activity feed with the existing empty-state component and the text "On-chain activity for NEAR plans is not shown yet." Pause/resume calls `client.togglePlanStatus(fromNearPlanId(plan.id), !plan.active)` after `prepare()`.
- [ ] **Step 3: Wallet button.** In the account dropdown, add a "NEAR Testnet" row showing the shortened implicit account id with copy and a nearblocks link once `useNearMerchant().accountId` is set, and a "Set up NEAR account" action that runs `prepare()` while it is null. Keep the existing Solana row and button layout.
- [ ] **Step 4: Run** `tsc --noEmit` and the dashboard tests → pass; `pnpm --filter dashboard build` → succeeds.
- [ ] **Step 5: Manual check:** the NEAR plan shows the NEAR badge, a working checkout link, no Blink control; pause then resume updates the status; Solana plans look and behave as before.
- [ ] **Step 6: Commit** `feat(dashboard): make plan list, detail, overview and wallet menu chain-aware`.

---

### Task 8: NEAR checkout that matches the Solana checkout

**Files:**
- Create: `apps/dashboard/src/components/checkout/checkout-shell.tsx`
- Modify: `apps/dashboard/src/components/checkout/checkout-card.tsx`
- Create: `apps/dashboard/src/components/checkout/near-checkout-card.tsx`
- Create: `apps/dashboard/src/app/checkout/near/[planId]/page.tsx`
- Create: `apps/dashboard/src/hooks/use-near-subscriber.ts`
- Create: `apps/dashboard/src/lib/near/checkout-state.ts`, `checkout-state.test.ts`
- Modify: `apps/dashboard/src/lib/data/index.ts` (add `getNearCheckoutPlan`), `apps/dashboard/package.json` (add `@hot-labs/near-connect`)

**Interfaces:**
- Produces `CheckoutShell` props: `{ name: string; priceUsdc: string; intervalSeconds: number; tokenLabel: string; firstChargeNote: string; explainer: string; extraRows?: { label: string; value: ReactNode }[]; notices?: ReactNode; children: ReactNode }` where `children` is the action area. It holds exactly the markup now inline in `CheckoutCard` (title, price line, rows list, footnote), so both cards share layout.
- Produces `getNearCheckoutPlan(planId: string): Promise<CheckoutPlan | null>` reading `get_plan` through a read-only `JsonRpcProvider`; `merchant` is the plan's `merchant_id`.
- Produces `useNearSubscriber(): { accountId: string | null; connecting: boolean; connect: () => Promise<void>; disconnect: () => Promise<void>; callFunction: (p: { contractId: string; methodName: string; args: Record<string, unknown>; deposit?: bigint; gas?: bigint }) => Promise<{ transactionHash: string }> }`. Dynamic-import NEAR Connect inside an effect (client only). First read https://docs.near.org/tools/near-connect and adapt the call names; keep this hook's interface fixed.
- Produces `checkout-state.ts`: `nearCheckoutState(input: { plan: { active: boolean } | null; subscription: { is_active: boolean; next_epoch_timestamp_ns: string } | null; balance: bigint; required: bigint; nowNs: bigint }): "no-plan" | "paused" | "needs-funds" | "ready" | "subscribed" | "past-due"`.

- [ ] **Step 1: Write failing tests** for `nearCheckoutState` covering each result, including an inactive-plan + existing-subscriber case (`subscribed`, so they can still cancel) and `required` computed as `price * prepaidCycles`.
- [ ] **Step 2: Run** → fails. **Step 3: Implement** the pure function.
- [ ] **Step 4: Extract `CheckoutShell`** from `CheckoutCard` with no visual change; the Solana card now renders its buttons as `children`. Verify the Solana checkout is unchanged by loading `/checkout/<known devnet plan address>` before and after and comparing.
- [ ] **Step 5: Build `NearCheckoutCard`** on the shell. It shows a "Prepaid cycles" row (select 1–12, default 3) as an `extraRows` entry; the action area has Connect NEAR wallet / Subscribe / Cancel, the same success and error blocks as Solana, and a nearblocks transaction link. Subscribe calls `ft_transfer_call` on the token with 1 yocto and `msg = {"action":"subscribe","plan_id":...}` for `price * cycles`. Cancel calls `cancel_subscription`. When balance is below `required`, show a testnet-only "Get test USDC" button that calls `mint` on `usdc.fakes.testnet`. Explainer copy: "You prepay the number of cycles above into the TidePay contract. Each renewal is pulled from that balance; cancel any time to get the unused balance back." Merchant-viewing-own-plan notice mirrors the Solana one.
- [ ] **Step 6: Page** `app/checkout/near/[planId]/page.tsx` copies the structure of `app/checkout/[planId]/page.tsx` (same header, Suspense fallback, `notFound()` when the plan is missing).
- [ ] **Step 7: Run** tests, `tsc --noEmit`, `pnpm --filter dashboard build` → pass.
- [ ] **Step 8: End-to-end manual check on testnet,** with the plan from Task 6 (60 s interval): connect a NEAR testnet wallet, get test USDC, subscribe → card shows "You're subscribed" with next renewal; start the keeper (`NEAR_CRANK_WATCH=<planId>:<subscriber>`) → after 60 s the subscription's cycle count rises on the card; cancel → refund. Visit the checkout for a nonexistent id → not-found page; pause the plan → "paused" notice for non-subscribers.
- [ ] **Step 9: Commit** `feat(dashboard): NEAR checkout page sharing the Solana checkout layout`.

---

### Task 9: Docs and final verification

**Files:**
- Modify: `README.md`, `apps/dashboard/README.md` (if it documents env vars), `apps/dashboard/.env.example`, `apps/api/.env.example`

- [ ] **Step 1: Document** the new env vars (`NEXT_PUBLIC_TIDEPAY_NEAR_CONTRACT`, `NEXT_PUBLIC_NEAR_RPC_URL`, `NEAR_SPONSOR_*`), the Privy dashboard prerequisites (email and Google enabled), the derivation scheme and what happens if the Solana wallet is lost, the global plan-id limit, and that the keeper's watch list can now be built from `get_merchant_plans` and `get_plan_subscribers` (not implemented).
- [ ] **Step 2: Full verification.** `cargo test` (contract), `pnpm --filter @tidepay/sdk-near test`, `pnpm --filter @tidepay/crank-near test`, `pnpm --filter api exec vitest run`, `pnpm --filter dashboard exec vitest run`, `tsc --noEmit` in `api` and `dashboard`, `pnpm --filter dashboard build`, and `./scripts/test-near-flow.sh` → all green.
- [ ] **Step 3: Update the README demo steps** with the merchant flow: sign in with email → Create plan → pick NEAR Testnet → copy the checkout link → subscribe from a NEAR wallet.
- [ ] **Step 4: Commit** `docs: document embedded NEAR merchant flow`.

---

## Self-Review Notes

- **Spec coverage:** merchant never switches wallets → Tasks 4, 6, 7; derive key from signature → Task 4; subscribers keep their own wallet → Task 8; NEAR checkout styled like Solana → Task 8 (`CheckoutShell`).
- **Dropped from the earlier draft:** EVM address, `planNetworks` on projects (the `near:` id prefix carries the network), the full Privy provider rewrite, and tests that only asserted object literals.
- **Order dependency:** Task 2 step 6 (deploy) must finish before Tasks 5 to 8 can be checked manually; Tasks 3 and 4 need only the API and dashboard code.
