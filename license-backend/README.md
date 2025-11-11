# License Backend Scaffold

Simple in-memory Express server to support the extension's license flow during development.

## Endpoints

### POST /internal/license/activate
Simulates a checkout or webhook that provisions a lifetime license.
Response: `{ "key": "<32-hex>" }`

### POST /api/license/verify
Request body: `{ "key": "<32-hex>", "device": "<extension id or arbitrary>" }`
Response: `{ valid: boolean, expiresAt: null | number }` where `expiresAt: null` indicates lifetime.

### POST /api/checkout/create
Creates a Stripe Checkout Session (one-time payment) for the lifetime license.
Body (JSON): `{ "successUrl"?: string, "cancelUrl"?: string }`
Response: `{ url: "https://checkout.stripe.com/..." }`

### GET /api/license/by-session?sid=SESSION_ID
Looks up a provisioned license key for a completed Checkout Session id.
Response: `{ key: "<32-hex>" }` or 404.

### POST /webhooks/stripe
Stripe webhook listener (expects raw body). On `checkout.session.completed` a lifetime key is generated and stored.

Important: When not null, `expiresAt` is an absolute UTC epoch timestamp in **milliseconds**.

## Data Model (In-Memory Only)
`Map<string, { plan: 'lifetime', status: 'active'|'revoked', purchaseDate: number, expiresAt: null|number }>`

All data is lost on restart; this is intentional for a lightweight dev scaffold.

## Running

```bash
npm install
npm run dev
```
Server listens on `PORT` (default 3000).

## Integration with the Extension
The extension currently targets `https://lic.example.com/api/license/verify` in `license.js`.
To test locally, you can temporarily change `LICENSE_ENDPOINT` to `http://localhost:3000/api/license/verify` (do **not** commit this change for production) or add a small conditional.

## Simulated Flow
1. Activate a license:
   ```bash
   curl -s -X POST http://localhost:3000/internal/license/activate | jq
   ```
2. Copy the returned `key`.
3. Verify it:
   ```bash
   curl -s -X POST http://localhost:3000/api/license/verify -H "Content-Type: application/json" \
        -d '{"key":"<PASTE_KEY>","device":"dev-extension"}' | jq
   ```
   Expected: `{ "valid": true, "expiresAt": null }`

## Production Considerations
- Replace in-memory Map with a persistent store (Postgres, DynamoDB, etc.).
- Real checkout provider (Stripe / Paddle / Lemon Squeezy) -> webhook -> calls an internal provisioning endpoint (like `/internal/license/activate`) that stores the license.
- Introduce signature verification / shared secret for internal endpoints.
- Add rate limiting, logging, and monitoring.
- Support additional plans (e.g., time-limited) by setting `expiresAt`.
- Add revocation capabilities and audit trail.

## Security Notes
- `/internal/license/activate` is unauthenticated here (dev only). In production restrict via IP allowlist + secret or remove entirely.
- Always validate incoming webhook signatures.

## Environment
Copy `license-backend/.env.example` to `license-backend/.env` and modify.

```
PORT=3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_ORIGIN=https://lic.example.com
```

## Stripe Setup (One-Time Checkout)

1. Create a Product in Stripe (one-time price) → copy its `Price ID`.
2. Fill `.env` with STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET, APP_ORIGIN.
3. Install & auth Stripe CLI:
   ```bash
   stripe login
   ```
4. Start webhook forwarder:
   ```bash
   stripe listen --forward-to localhost:3000/webhooks/stripe
   ```
5. Create a Checkout Session:
   ```bash
   curl -s -X POST http://localhost:3000/api/checkout/create -H 'Content-Type: application/json' -d '{}' | jq
   ```
6. Open the returned URL and complete test payment.
7. (Optional) Trigger completion event directly:
   ```bash
   stripe trigger checkout.session.completed
   ```
8. Resolve the session id (success redirect contains `?sid=`):
   ```bash
   curl -s "http://localhost:3000/api/license/by-session?sid=cs_test_123" | jq
   ```

## Example Curl (Checkout Create)

```bash
curl -s -X POST http://localhost:3000/api/checkout/create -H 'Content-Type: application/json' -d '{}' | jq
```

---
This scaffold accelerates extension development without blocking on full commerce integration.
