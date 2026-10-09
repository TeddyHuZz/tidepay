# TidePay

Non-custodial recurring payments for Solana, built for the Colosseum Hackathon.

Subscribers approve a one-time delegated allowance. An off-chain keeper then pulls each payment at its epoch boundary, so there are no custodial vaults and no escrow. Merchants create plans, share a one-click Solana Blink link, and watch renewals settle.

## How it works

1. A merchant creates a **plan** (price, interval, accepted mint).
2. A customer subscribes from a **Blink** (Twitter/X, dial.to), the embeddable checkout page, or the SDK. One transaction delegates a token allowance to the program authority PDA and settles the first epoch.
3. A **keeper crank** polls for subscriptions whose `next_epoch_timestamp` has passed and submits `process_subscription_epoch`. The program checks the on-chain clock, splits the payment (merchant, protocol fee, keeper reward) with `transfer_checked`, and advances the epoch.
4. The customer can **cancel** at any time; the subscription account is closed and rent returns to them.

All execution targets **Solana Devnet** with Devnet USDC. A 60-second billing interval ("demo mode") exists so renewals can be shown live.

## Repository layout

```
apps/
  dashboard/        Next.js merchant console, checkout, demo app, Solana Action endpoints
  api/              Scaffolded Next.js app (not used by the dashboard)
packages/
  protocol/         Anchor program and keeper crank
  types/            Shared types: IDL, PDA seeds, interfaces, enums
  sdk/              @tidepay/sdk TypeScript client
```

`apps/*` talk to the protocol only through `@tidepay/sdk` and `@tidepay/types`; they never import from `packages/protocol`.

## Getting started

Requirements: Node.js and [pnpm](https://pnpm.io) 12.10.1 (pinned by `packageManager`).

```bash
pnpm install
pnpm dev                       # runs every app via Turborepo
pnpm --filter dashboard dev    # or just the dashboard on http://localhost:3000
```

Other root scripts: `pnpm build`, `pnpm lint`, `pnpm test`.

The dashboard has its own setup guide, environment variables and endpoint reference in [`apps/dashboard/README.md`](apps/dashboard/README.md).

## Status

| Area | State |
| --- | --- |
| Merchant console (overview, plans, subscribers, developers) | Built on sample data |
| Checkout page and mock SaaS demo (`/demo`) | Built; subscribe is mocked |
| Solana Action / Blink endpoints and `actions.json` | Built; transaction building waits on the SDK |
| Gasless fee-payer relayer | Built; signs server-built transactions only |
| Anchor program, keeper crank, SDK | In progress |

Live on-chain data and real subscribe, create-plan and cancel flows are wired in once the SDK is available. The dashboard keeps that integration behind a single data layer (`apps/dashboard/src/lib/data`).
