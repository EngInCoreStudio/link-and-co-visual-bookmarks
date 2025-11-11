import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import cors from 'cors';
import Stripe from 'stripe';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
// Raw body parser ONLY for Stripe webhook (mounted later before express.json for that route)
// We'll attach express.json() after mounting webhook.
// Allow extension fetches (development). In production, restrict origin.
app.use(cors({ origin: '*', methods: ['GET','POST','OPTIONS'] }));

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: '2023-10-16' }) : null;

// Rate limit (basic): 60 req / minute per IP
const limiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
app.use(limiter);

// Webhook raw body BEFORE json middleware
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  if(!stripe){
    console.warn('Stripe not configured; ignoring webhook');
    return res.status(200).send('stripe disabled');
  }
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed', err.message);
    return res.status(400).send('invalid signature');
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const key = generateKey();
    const now = Date.now();
    licenses.set(key, { plan: 'lifetime', status: 'active', purchaseDate: now, expiresAt: null });
    // Map session.id -> key for later retrieval
    sessionToKey.set(session.id, key);
    console.log('Activated license key via Stripe checkout:', key, 'session:', session.id);
  }
  res.status(200).send('ok');
});

// JSON middleware AFTER webhook raw route
app.use(express.json());

// In-memory license store: key -> record
// record = { plan: 'lifetime', status: 'active'|'revoked', purchaseDate: number, expiresAt: null|number }
const licenses = new Map();
// Map of Stripe session.id -> license key
const sessionToKey = new Map();
// POST /api/checkout/create
// Body: { successUrl?, cancelUrl? }
app.post('/api/checkout/create', async (req, res) => {
  if(!stripe) return res.status(500).json({ error: 'Stripe not configured' });
  try {
    const APP_ORIGIN = process.env.APP_ORIGIN || 'https://lic.example.com';
    const { successUrl, cancelUrl } = req.body || {};
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [ { price: process.env.STRIPE_PRICE_ID, quantity: 1 } ],
      success_url: successUrl || `${APP_ORIGIN}/thank-you?sid={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${APP_ORIGIN}/cancelled`
    });
    res.json({ url: session.url });
  } catch(e){
    console.error('Error creating checkout session', e);
    res.status(500).json({ error: 'checkout_session_failed' });
  }
});

// GET /api/license/by-session?sid=...
app.get('/api/license/by-session', (req, res) => {
  const sid = req.query.sid;
  if(!sid) return res.status(400).json({ error: 'sid required' });
  const key = sessionToKey.get(String(sid));
  if(!key) return res.status(404).json({ error: 'not found' });
  res.json({ key });
});

// Utility: generate 32 hex char key (128 bits)
function generateKey() {
  return crypto.randomBytes(16).toString('hex');
}

// POST /internal/license/activate  (simulates a successful checkout webhook)
// Body (optional): { plan?: 'lifetime' }
app.post('/internal/license/activate', (req, res) => {
  const plan = req.body?.plan || 'lifetime';
  if (plan !== 'lifetime') {
    return res.status(400).json({ error: 'Only lifetime plan supported in scaffold' });
  }
  const key = generateKey();
  const now = Date.now();
  licenses.set(key, {
    plan: 'lifetime',
    status: 'active',
    purchaseDate: now,
    expiresAt: null
  });
  res.json({ key });
});

// POST /api/license/verify { key, device }
// Response: { valid: boolean, expiresAt: null|number }
// Contract: expiresAt is an absolute UTC epoch in *milliseconds* if present; null means lifetime.
app.post('/api/license/verify', (req, res) => {
  const { key } = req.body || {};
  if (!key) return res.json({ valid: false, expiresAt: null });
  const record = licenses.get(key);
  if (!record) return res.json({ valid: false, expiresAt: null });

  if (record.plan === 'lifetime' && record.status === 'active') {
    return res.json({ valid: true, expiresAt: null });
  }
  // Future: handle time-limited plans: if (record.expiresAt && Date.now() < record.expiresAt)
  return res.json({ valid: false, expiresAt: null });
});

// Health check (minimal contract)
app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`License backend scaffold listening on :${PORT}`);
});
