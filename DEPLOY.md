# Deploying TidePay

The dashboard and the Actions API deploy as **two Vercel projects from this one repository**. Blink clients such as dial.to only load Actions over public HTTPS, so the API must be deployed before the Blink can be validated.

## 1. Create the projects

In Vercel, import the GitHub repository twice:

| Project | Root Directory | Framework |
| --- | --- | --- |
| `tidepay-dashboard` | `apps/dashboard` | Next.js |
| `tidepay-api` | `apps/api` | Next.js |

Leave the build and install commands at their defaults. Vercel detects the pnpm workspace and installs from the repository root, so `@tidepay/sdk` and `@tidepay/types` resolve. If the install step fails on the pnpm version, add `ENABLE_EXPERIMENTAL_COREPACK=1` as an environment variable so Vercel uses the pinned `pnpm@12.10.1`.

Deploy each project once to get its URL, then set the variables below and redeploy. `NEXT_PUBLIC_*` values are inlined at build time, so changing one needs a redeploy.

## 2. Environment variables

**`tidepay-api`**

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://<api-project>.vercel.app` |
| `NEXT_PUBLIC_DASHBOARD_URL` | `https://<dashboard-project>.vercel.app` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | A Devnet RPC (a dedicated provider is more reliable than the public endpoint) |
| `RELAYER_SECRET_KEY` | Relayer keypair as a JSON byte array. Mark it **Sensitive** |
| `RELAYER_ALLOWED_MERCHANTS` | The demo merchant's wallet address |

**`tidepay-dashboard`**

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://<dashboard-project>.vercel.app` |
| `NEXT_PUBLIC_API_URL` | `https://<api-project>.vercel.app` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Same Devnet RPC |
| `NEXT_PUBLIC_DEMO_PLAN_ADDRESS` | The demo plan's address, once created (empty keeps `/demo` in mock mode) |
| `NEXT_PUBLIC_USE_SAMPLE_DATA` | `1` only for a UI-only deployment before the program is live |

## 3. Relayer wallet

The relayer pays network fees and rent so a wallet with no SOL can subscribe. Use a dedicated Devnet key and never one that holds real funds.

1. Generate a key (or reuse the one in `apps/api/.env.local`, which is gitignored):
   ```bash
   node -e 'const {Keypair}=require("@solana/web3.js");const k=Keypair.generate();console.log(k.publicKey.toBase58());console.log(JSON.stringify([...k.secretKey]))'
   ```
   Run it from `apps/api` so `@solana/web3.js` resolves.
2. Fund the printed address with 1–2 SOL from <https://faucet.solana.com> (Devnet).
3. Put the byte array in `RELAYER_SECRET_KEY` and the merchant wallet in `RELAYER_ALLOWED_MERCHANTS`.

Each sponsored subscribe costs the relayer up to about 0.005 SOL (token account rent, the subscriber's rent top-up and the fee), so 1 SOL covers roughly 200 sign-ups.

## 4. After the program is on Devnet

1. Open the dashboard, connect the merchant wallet and create a plan with the **60s demo** interval.
2. Set `NEXT_PUBLIC_DEMO_PLAN_ADDRESS` on the dashboard to that plan's address and redeploy.
3. Validate the Blink: paste `https://<api-project>.vercel.app/api/actions/subscribe/<plan>` into <https://dial.to> and the Dialect Blinks inspector.
4. Subscribe from checkout and from dial.to, including once from a wallet with USDC but no SOL, and check the dashboard picks up the renewal after the crank runs.
5. To have Blinks unfurl on X, register the API domain with Dialect's Actions registry.

## Checks

```bash
curl -i https://<api-project>.vercel.app/actions.json                     # 200, Actions CORS headers
curl -i https://<api-project>.vercel.app/api/actions/subscribe/<plan>     # 200, X-Blockchain-Ids: Devnet
curl -i https://<dashboard-project>.vercel.app/checkout/not-a-plan        # 404
```
