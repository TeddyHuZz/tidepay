# Deploying TidePay

TidePay deploys as **three Vercel Next.js projects** (`apps/web`, `apps/dashboard`, `apps/api`) plus **one Render backend service** running the unified Solana + NEAR keeper crank (`packages/protocol/crank`). Blink clients such as dial.to only load Actions over public HTTPS, so the API must be deployed before Blinks can be validated.

## 1. Vercel projects (web, dashboard, API)

In Vercel, import the GitHub repository for each app:

| Project | Root Directory | Framework | Domain |
| --- | --- | --- | --- |
| `tidepay-landing` | `apps/web` | Next.js | `https://tidepay.vercel.app` |
| `tidepay-dashboard` | `apps/dashboard` | Next.js | `https://app-tidepay.vercel.app` |
| `tidepay-api` | `apps/api` | Next.js | `https://api-tidepay.vercel.app` |

Leave the build and install commands at their defaults. Vercel detects the pnpm workspace and installs from the repository root, so `@tidepay/sdk`, `@tidepay/sdk-near`, and `@tidepay/types` resolve. If the install step fails on the pnpm version, set `ENABLE_EXPERIMENTAL_COREPACK=1` so Vercel uses the pinned `pnpm@12.10.1`.

Deploy each project once to get its URL, then set the variables below and redeploy. `NEXT_PUBLIC_*` values are inlined at build time, so changing one requires a redeploy.

## 2. Vercel environment variables

**`tidepay-landing`** (`apps/web`)

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://<landing-project>.vercel.app` |
| `NEXT_PUBLIC_DASHBOARD_URL` | `https://<dashboard-project>.vercel.app` |
| `NEXT_PUBLIC_API_URL` | `https://<api-project>.vercel.app` |

**`tidepay-api`** (`apps/api`)

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://<api-project>.vercel.app` |
| `NEXT_PUBLIC_DASHBOARD_URL` | `https://<dashboard-project>.vercel.app` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Solana Devnet RPC (dedicated provider recommended, e.g. Helius) |
| `SOLANA_RPC_URL` | Same Solana Devnet RPC (server-side Actions & relayer) |
| `RELAYER_SECRET_KEY` | Solana relayer keypair as a JSON byte array (**Sensitive**) |
| `RELAYER_ALLOWED_MERCHANTS` | Allowed Solana merchant wallet addresses (comma-separated) |
| `NEAR_NETWORK_ID` | `testnet` |
| `NEAR_SPONSOR_ACCOUNT_ID` | Funded NEAR testnet account paying gas sponsorship (`*.testnet`) |
| `NEAR_SPONSOR_PRIVATE_KEY` | Matching `ed25519:...` private key for `NEAR_SPONSOR_ACCOUNT_ID` (**Sensitive**) |

**`tidepay-dashboard`** (`apps/dashboard`)

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://<dashboard-project>.vercel.app` |
| `NEXT_PUBLIC_API_URL` | `https://<api-project>.vercel.app` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Solana Devnet RPC (dedicated provider recommended) |
| `NEXT_PUBLIC_TIDEPAY_NEAR_CONTRACT` | Deployed NEAR contract ID (e.g. `tidepay-mw1rpoyp.tidepay-e2e-mw1rpm6j.testnet`) |
| `NEXT_PUBLIC_NEAR_RPC_URL` | Optional NEAR RPC URL (defaults to `https://test.rpc.fastnear.com`) |
| `DATABASE_URL` | Neon Postgres connection string for projects & `/api/settlements` cache (**Sensitive**) |
| `NEXT_PUBLIC_DEMO_PLAN_ADDRESS` | Optional Solana demo plan address |
| `NEXT_PUBLIC_USE_SAMPLE_DATA` | `1` only for UI-only preview deployments |

## 3. Unified Keeper Crank on Render (`@tidepay/crank`)

`packages/protocol/crank` runs both `TidePayCrankWorker` (Solana) and `startNearCrankFromEnv()` (`@tidepay/crank-near`) in a single process with an HTTP health endpoint on `PORT`.

- **Root Directory:** leave blank (monorepo root)
- **Build Command:** `pnpm install --frozen-lockfile`
- **Start Command:** `pnpm --filter @tidepay/crank start`

Set these environment variables in Render:

| Variable | Value |
| --- | --- |
| `SOLANA_RPC_URL` | Dedicated Solana Devnet RPC URL |
| `CRANK_SECRET_KEY` | Solana crank keeper keypair JSON byte array (**Sensitive**) |
| `POLL_INTERVAL_MS` | `15000` (Solana poll interval in ms) |
| `TIDEPAY_NEAR_CONTRACT_ID` | Deployed NEAR contract account ID |
| `NEAR_NETWORK_ID` | `testnet` |
| `NEAR_CRANK_ACCOUNT_ID` | Funded NEAR testnet keeper account (can share `NEAR_SPONSOR_ACCOUNT_ID`) |
| `NEAR_CRANK_PRIVATE_KEY` | Matching `ed25519:...` private key (**Sensitive**) |
| `NEAR_RPC_URL` | `https://rpc.testnet.near.org` (or dedicated testnet RPC) |
| `NEAR_CRANK_POLL_MS` | `10000` (NEAR `view_state` poll interval in ms) |

> On NEAR, the crank discovers new subscribers automatically via RPC `view_state` (`b"s"` prefix), skips depleted prepaid balances, and registers keeper token storage once when claiming bounties (`NEAR_CRANK_WATCH` is optional).

## 4. Solana Relayer wallet

The Solana relayer pays network fees and rent so a wallet with no SOL can subscribe. Use a dedicated Devnet key and never one that holds real funds.

1. Generate a key (or reuse the one in `apps/api/.env.local`, which is gitignored):
   ```bash
   node -e 'const {Keypair}=require("@solana/web3.js");const k=Keypair.generate();console.log(k.publicKey.toBase58());console.log(JSON.stringify([...k.secretKey]))'
   ```
   Run it from `apps/api` so `@solana/web3.js` resolves.
2. Fund the printed address with 1–2 SOL from <https://faucet.solana.com> (Devnet).
3. Put the byte array in `RELAYER_SECRET_KEY` and the merchant wallet in `RELAYER_ALLOWED_MERCHANTS`.

## 5. Post-deploy verification

1. Open the dashboard, sign in, and create a plan on **Solana Devnet** or **NEAR Testnet** with a **60s demo** interval.
2. Validate Solana Blinks: paste `https://<api-project>.vercel.app/api/actions/subscribe/<plan>` into <https://dial.to>.
3. Subscribe on checkout (and top up/cancel on NEAR) and verify automatic epoch renewals settle after ~60s.

## Checks

```bash
curl -i https://<api-project>.vercel.app/actions.json                     # 200, Actions CORS headers
curl -i https://<api-project>.vercel.app/api/actions/subscribe/<plan>     # 200, X-Blockchain-Ids: Devnet
curl -i https://<dashboard-project>.vercel.app/checkout/not-a-plan        # 404
curl -s https://<render-crank>.onrender.com/                              # {"status":"ok","nearCrankEnabled":true,...}
curl -X POST https://<api-project>.vercel.app/api/near/intents/quote -H 'content-type: application/json' \
  -d '{"originAsset":"nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near","amount":"10000000","refundTo":"<solana-address>","recipient":"alice.near","dry":true}'
```
