# TidePay

Non-custodial recurring payments for Solana, built for the Colosseum Hackathon.

Subscribers approve a one-time delegated allowance. An off-chain keeper then pulls each payment at its epoch boundary, so there are no custodial vaults and no escrow. Merchants create plans, share a one-click Solana Blink link, and watch renewals settle.

## How it works

1. A merchant creates a **plan** (`initialize_plan`): price, interval, accepted mint and keeper reward.
2. A customer subscribes from a **Blink** (Twitter/X, dial.to), the embeddable checkout page, or the SDK. One transaction delegates a token allowance to the program authority PDA, creates the subscription record and pulls the first payment (`subscribe`).
3. A **keeper crank** polls for subscriptions whose `next_epoch_timestamp` has passed and submits `process_epoch`. The program checks the on-chain clock, pays the keeper reward and the merchant with `transfer_checked`, and advances the epoch.
4. The customer can **cancel** at any time (`cancel_subscription`); the subscription account is closed and its rent returns to them.

All execution targets **Solana Devnet** with Devnet USDC. A 60-second billing interval ("demo mode") exists so renewals can be shown live.

## Repository layout

```
apps/
  dashboard/        Next.js merchant console, checkout page and mock SaaS demo   (port 3000)
  api/              Next.js Solana Actions / Blinks API and gasless relayer       (port 3001)
packages/
  protocol/         Anchor program and keeper crank
  types/            Shared IDL, program ID, PDA seeds and account interfaces
  sdk/              @tidepay/sdk TypeScript client
```

`apps/*` talk to the protocol only through `@tidepay/sdk` and `@tidepay/types`; they never import from `packages/protocol`.

## Getting started

Requirements: Node.js and [pnpm](https://pnpm.io) 12.10.1 (pinned by `packageManager`).

```bash
pnpm install
pnpm dev                       # runs every app via Turborepo
```

Other root scripts: `pnpm build`, `pnpm lint`, `pnpm test`.

Each app has its own setup guide and environment reference: [`apps/dashboard`](apps/dashboard/README.md), [`apps/api`](apps/api/README.md). Deployment (two Vercel projects, relayer wallet, Blink validation) is in [`DEPLOY.md`](DEPLOY.md).

## Status

| Area | State |
| --- | --- |
| Anchor program, protocol tests, keeper crank, SDK | Implemented; program not yet deployed to Devnet |
| Merchant console | Reads plans and subscriptions from chain for the connected wallet; creates plans on-chain |
| Checkout page | Subscribes through the Blink endpoint; subscribers can cancel |
| `/demo` (PromptPilot AI) | Gates on a real subscription when a demo plan is configured; mock mode otherwise |
| Blink endpoints and `actions.json` | Built on the SDK, rate limited, tested |
| Gasless relayer | Sponsors fees and rent for allowlisted merchants |

Known protocol gaps: `protocol_fee_bps` is stored but not yet charged in `process_epoch`; the program emits no events (activity history is derived from account state); only the subscriber can cancel; the crank does not report health.
