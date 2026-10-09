# TidePay Dashboard

The merchant console, checkout page, mock consumer app and Solana Action (Blink) endpoints for TidePay. Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS 4 and shadcn-style components.

## Run it

From the repository root:

```bash
pnpm install
pnpm --filter dashboard dev      # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `pnpm --filter dashboard dev` | Dev server |
| `pnpm --filter dashboard build` | Production build |
| `pnpm --filter dashboard lint` | ESLint |
| `pnpm --filter dashboard test` | Vitest unit tests |

This Next.js version has breaking changes from earlier releases. When changing framework-level code, read the bundled docs in `node_modules/next/dist/docs/` first (see `AGENTS.md`).

## Environment

Copy `.env.example` to `.env.local`.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public origin for Blink URLs, icons and embed snippets. Set this to the deployed domain before sharing links. Falls back to the request origin for the Action endpoints. |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | RPC endpoint. Defaults to public Devnet. |
| `RELAYER_SECRET_KEY` | Optional. Fee-payer keypair as a JSON byte array. Enables gasless subscribing. Server-only. |
| `TIDEPAY_ACTIONS_MOCK_TX` | Set to `1` to return a Memo-only test transaction from the Blink `POST` before the SDK is integrated. |

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Overview: MRR, subscribers, pulls, crank health, billing activity |
| `/plans`, `/plans/new` | Plan list and creation form (price, interval including 60s demo mode) with generated Blink URL, embed snippet and plan PDA |
| `/subscribers` | Subscriber table with status and next due epoch |
| `/developers` | `@tidepay/sdk` snippets and a webhook payload simulator |
| `/checkout/[planId]` | Standalone one-click checkout card |
| `/demo` | "PromptPilot AI", a mock SaaS gated behind a subscription |
| `/subscribe/[planId]` | Shareable slug; redirects to checkout |

The console routes share the sidebar and top bar through the `(console)` route group. Checkout and the demo are standalone.

## Solana Actions (Blinks)

| Endpoint | Behaviour |
| --- | --- |
| `GET /actions.json` | Maps `/subscribe/*` and `/api/actions/**` to the Action API |
| `GET /api/actions/subscribe/[planId]` | Action metadata: icon, title, description, subscribe link |
| `POST /api/actions/subscribe/[planId]` | Body `{ "account": "<base58 pubkey>" }`; returns `{ type: "transaction", transaction, message }` |
| `OPTIONS` (all of the above) | CORS preflight |

Every response carries the standard Actions CORS headers plus `X-Action-Version` and `X-Blockchain-Ids` (Devnet). Errors use `{ "message": "..." }`:

| Status | Meaning |
| --- | --- |
| 400 | Body is not JSON, or `account` is missing or not a valid public key |
| 404 | Unknown plan |
| 429 | Rate limited (30 requests per IP and 5 per wallet, per minute); see `Retry-After` |
| 501 | Real subscribe transaction not available yet (default until the SDK is integrated) |
| 502 | Transaction could not be built |

### Testing a Blink locally

```bash
TIDEPAY_ACTIONS_MOCK_TX=1 pnpm --filter dashboard dev
curl http://localhost:3000/api/actions/subscribe/promptpilot-pro
curl -X POST -H 'Content-Type: application/json' \
  -d '{"account":"<your devnet wallet>"}' \
  http://localhost:3000/api/actions/subscribe/promptpilot-pro
```

To render it in [dial.to](https://dial.to), the endpoint must be reachable over HTTPS, so deploy a preview or use a tunnel. Then open `https://dial.to/?action=solana-action:<url-encoded action URL>`. The same link is generated on `/plans/new`. The mock transaction only writes a Memo; it moves no funds and creates no subscription.

## Gasless relayer

With `RELAYER_SECRET_KEY` set, the Action `POST` makes the relayer the fee payer and signs first; the subscriber's wallet adds the second signature. The relayer signs only transactions this server built, and there is no endpoint that signs client-supplied transactions. Use a dedicated Devnet key holding a small amount of SOL.

Rate limiting is in memory per server instance. Back it with a shared store (for example Redis) before a multi-instance or public deployment.

## Data layer

Pages, checkout and the Blink route read through `src/lib/data/index.ts`:

| Function | Used by |
| --- | --- |
| `getOverviewMetrics`, `getRecentActivity`, `getCrankStatus` | Overview |
| `listPlans`, `getPlan` | Plans, checkout, Blink endpoint |
| `listSubscribers` | Subscribers |

Today these return sample data from `src/lib/data/mock.ts`. UI view models live in `src/lib/types.ts` and are independent of the on-chain account types.

### Integrating `@tidepay/sdk`

1. Replace each function body in `src/lib/data/index.ts` with SDK calls mapped into the view models. Because the app uses Cache Components, wrap callers in `<Suspense>` or cache results with `use cache` once they touch the network.
2. In `src/lib/actions/build-subscribe-tx.ts`, replace the Memo mock with the SDK's `buildSubscribeIx` and keep the relayer step. Then leave `TIDEPAY_ACTIONS_MOCK_TX` unset.
3. Wire the buttons that currently show a "not connected yet" notice or are disabled: create plan (`components/plans/plan-form.tsx`), subscribe (`components/checkout/checkout-card.tsx`), cancel subscription (`app/(console)/subscribers/page.tsx`).
4. Replace the mock gate in `components/demo/demo-app.tsx` with an on-chain subscription check.
5. Delete `src/lib/data/mock.ts` once nothing imports it.

## Design

Dark by default with a single teal accent, IBM Plex Sans and Mono, flat surfaces and no gradients. Design tokens are CSS variables in `src/app/globals.css`; `.theme-demo` scopes a light theme for the mock consumer app. UI primitives are in `src/components/ui` (`components.json` is set up for the shadcn CLI).

## Tests

`pnpm --filter dashboard test` covers the Action endpoints (spec shape, CORS, validation, status codes, rate limiting), the relayer's signing behaviour and the formatting helpers.
