# TidePay Dashboard

The merchant console, checkout page and mock consumer app for TidePay. Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS 4 and shadcn-style components. On-chain reads and transactions go through `@tidepay/sdk`; Solana Actions (Blinks) live in [`apps/api`](../api/README.md).

## Run it

From the repository root:

```bash
pnpm install
pnpm --filter dashboard dev      # http://localhost:3000
pnpm --filter api dev            # http://localhost:3001, needed for subscribing
```

| Script | What it does |
| --- | --- |
| `pnpm --filter dashboard dev` | Dev server |
| `pnpm --filter dashboard build` | Production build |
| `pnpm --filter dashboard lint` | ESLint |
| `pnpm --filter dashboard test` | Vitest unit tests |

This Next.js version has breaking changes from earlier releases. When changing framework-level code, read the bundled docs in `node_modules/next/dist/docs/` first (see `AGENTS.md`). `PageProps`/`LayoutProps` are generated types: if the editor cannot find them, run `npx next typegen` once.

## Environment

Copy `.env.example` to `.env.local`. `NEXT_PUBLIC_*` values are inlined at build time.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public origin for checkout links and embed snippets |
| `NEXT_PUBLIC_API_URL` | Public origin of `apps/api`; used for Blink URLs and by checkout to build the subscribe transaction |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | RPC endpoint. Defaults to public Devnet |
| `NEXT_PUBLIC_USDC_MINT` | Accepted mint for new plans. Defaults to Devnet USDC |
| `NEXT_PUBLIC_DEMO_PLAN_ADDRESS` | Plan the `/demo` app gates on. Unset: `/demo` runs in mock mode |
| `NEXT_PUBLIC_USE_SAMPLE_DATA` | `1` shows sample data instead of reading the chain |

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Overview: MRR, subscribers, successful pulls, crank status, billing activity |
| `/plans` | The connected merchant's plans, with checkout links and copyable Blink URLs |
| `/plans/new` | Creates a plan on Devnet (`initialize_plan`) and shows its address, Blink URL, checkout link and embed snippet |
| `/subscribers` | Live subscriptions with status and next due epoch |
| `/developers` | `@tidepay/sdk` snippets and a webhook payload simulator |
| `/checkout/[planAddress]` | One-click subscribe, and cancel for existing subscribers |
| `/demo` | "PromptPilot AI", gated on an active subscription to `NEXT_PUBLIC_DEMO_PLAN_ADDRESS` |

Console routes share the sidebar, top bar and merchant data through the `(console)` route group. Checkout and the demo are standalone.

## How data flows

- **Merchant data** (`components/merchant-data-provider.tsx`) is loaded in the browser for the connected wallet: plans by merchant and subscriptions by plan, via `getProgramAccounts` filters decoded with the SDK's coder (`lib/chain/accounts.ts`). The SDK has no list queries yet; if it gains them, swap them in there.
- **Derived figures** (`lib/chain/derive.ts`, unit-tested) are computed from those accounts:
  - *Active MRR*: active subscriptions' price normalised to 30 days.
  - *Successful pulls*: sum of `cycle_count` across live subscriptions.
  - *Status*: `PastDue` once `next_epoch_timestamp` is more than 2 minutes overdue. Cancelled subscriptions are closed on-chain, so they no longer appear.
  - *Activity*: each subscription's latest settlement plus overdue renewals. The program emits no events, so there is no full history.
  - *Crank uptime*: shown as "—"; the crank does not report health yet.
- **Checkout plan** (`lib/data/index.ts`) is read on the server by plan address. `src/proxy.ts` first checks that the address is a TidePay plan account and answers with a real 404 if not; the page streams, so a `notFound()` inside it could only return 200.
- **Transactions** (`hooks/use-send-transaction.ts`) are signed by the wallet, sent and confirmed. Program errors are mapped to readable messages from the IDL (`lib/chain/errors.ts`).
  - *Create plan*: creates the merchant's USDC account if needed, then `initialize_plan`. Protocol fee is 0 bps; the keeper reward defaults to 0.01 USDC.
  - *Subscribe*: requests the transaction from `POST {API_URL}/api/actions/subscribe/<plan>`, the same builder the Blink uses, including relayer sponsorship.
  - *Cancel*: `cancel_subscription`, signed by the subscriber. Merchants cannot cancel a subscription with the current program.

## Design

Dark by default with a single teal accent, IBM Plex Sans and Mono, flat surfaces and no gradients. Design tokens are CSS variables in `src/app/globals.css`; `.theme-demo` scopes a light theme for the mock consumer app. UI primitives are in `src/components/ui` (`components.json` is set up for the shadcn CLI).

## Tests

`pnpm --filter dashboard test` covers the derived figures (MRR, status, activity, crank status), USDC parsing and formatting, the plan-account check used by the checkout 404, and the formatting helpers.
