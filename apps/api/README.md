# TidePay API

Solana Actions (Blinks) for TidePay. A Blink client such as dial.to, or the dashboard's checkout page, asks this API for a subscribe transaction, and the wallet signs it.

## Run it

```bash
pnpm install
pnpm --filter api dev      # http://localhost:3001
pnpm --filter api test     # Vitest
```

Copy `.env.example` to `.env.local`.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Public origin of this API, used for the Blink icon. Falls back to the request origin |
| `NEXT_PUBLIC_DASHBOARD_URL` | Where browsers are redirected from `/subscribe/<plan>` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | RPC endpoint. Defaults to public Devnet |
| `RELAYER_SECRET_KEY` | Optional fee-payer keypair (JSON byte array). Server-only |
| `RELAYER_ALLOWED_MERCHANTS` | Comma-separated merchant public keys whose plans the relayer sponsors |

## Endpoints

| Endpoint | Behaviour |
| --- | --- |
| `GET /actions.json` | Maps `/subscribe/**` and `/api/actions/**` to the Action API |
| `GET /api/actions/subscribe/[plan]` | Action metadata for the plan at address `[plan]`, read from chain |
| `POST /api/actions/subscribe/[plan]` | Body `{ "account": "<base58 pubkey>" }`; returns `{ type: "transaction", transaction, message }` |
| `OPTIONS` | CORS preflight |
| `GET /` | Short human-readable page listing these endpoints |
| `GET /subscribe/[plan]` | Redirects a browser to the dashboard checkout page |

Responses carry the Actions CORS headers plus `X-Action-Version` and `X-Blockchain-Ids` (Devnet). Errors are `{ "message": "..." }`:

| Status | Meaning |
| --- | --- |
| 400 | Invalid plan address, body is not JSON, or `account` missing or invalid |
| 404 | Plan not found or inactive |
| 429 | Rate limited (30 requests per IP and 5 per wallet, per minute); see `Retry-After` |
| 502 | Plan could not be loaded or the transaction could not be built (details are logged, not returned) |

## The subscribe transaction

Built in `src/lib/build-subscribe-tx.ts`, as a v0 transaction:

1. Create the subscriber's associated token account if missing.
2. `approve` the program authority PDA for 12 billing cycles.
3. `subscribe`: creates the subscription record and pulls the first payment.

After 12 cycles the allowance runs out and renewals fail with `InsufficientAllowance` until the subscriber approves again.

### Gasless relayer

When `RELAYER_SECRET_KEY` is set and the plan's merchant is in `RELAYER_ALLOWED_MERCHANTS`, the relayer:

- pays the network fee and the token-account rent;
- adds a SOL top-up so the subscriber can pay the subscription account's rent (the program makes the subscriber the payer) and stay rent-exempt;
- signs first, leaving the subscriber's signature for the wallet.

A wallet holding USDC but no SOL can then subscribe. The allowlist exists because without it anyone could create a cheap plan and drain the relayer through repeated subscribe and cancel cycles; the top-up is refunded to the subscriber, not the relayer, on cancel.

The relayer only signs transactions this server built. Rate limiting is in memory per instance; back it with a shared store before a multi-instance deployment. Use a dedicated Devnet key holding a small amount of SOL.

## Tests

`pnpm --filter api test` covers the route (spec shape, Devnet headers, validation, status codes, rate limiting, error redaction), the transaction builder (instruction order, payer, sponsorship, top-up amount, subscription account size against the IDL), the relayer and the rate limiter. The SDK and RPC are mocked, so tests run offline.
