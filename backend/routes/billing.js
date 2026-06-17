const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { getFirestore } = require('../services/firebase.service');
const { readDb, updateDb } = require('../services/database.service');

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  try {
    // eslint-disable-next-line global-require
    return require('stripe')(key);
  } catch (_error) {
    return null;
  }
}

function isStripeConfigured() {
  return Boolean(getStripe() && process.env.STRIPE_PRICE_ID);
}

async function updateUserPlan(userId, plan) {
  const firestore = getFirestore();
  if (firestore) {
    await firestore.collection('users').doc(userId).set({ plan, tier: plan, updatedAt: new Date().toISOString() }, { merge: true });
    await firestore.collection('users').doc(userId).collection('studyData').doc('userProfile').set({
      tier: plan,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return;
  }
  updateDb((db) => {
    db.users = db.users || {};
    db.users[userId] = { ...(db.users[userId] || {}), plan, tier: plan, updatedAt: new Date().toISOString() };
    return db.users[userId];
  });
}

function resolveOrigin(req) {
  const configured = (process.env.STRIPE_SUCCESS_URL || '').replace(/\/?\?.*$/, '').replace(/\/$/, '');
  if (configured) return configured;
  const origin = req.get('origin') || req.get('referer') || '';
  if (origin) return origin.replace(/\/$/, '');
  return 'http://localhost:3000';
}

router.get('/status', requireAuth, async (_req, res) => {
  res.json({
    configured: isStripeConfigured(),
    priceLabel: process.env.STRIPE_PRICE_LABEL || '$10/month',
  });
});

router.post('/create-checkout-session', requireAuth, async (req, res) => {
  const stripe = getStripe();
  if (!stripe || !process.env.STRIPE_PRICE_ID) {
    return res.status(503).json({
      error: 'Stripe is not configured on this server.',
      fallback: true,
    });
  }

  try {
    const origin = resolveOrigin(req);
    const session = await stripe.checkout.sessions.create({
      mode: process.env.STRIPE_MODE || 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?billing=cancelled`,
      client_reference_id: req.user.id,
      metadata: { userId: req.user.id },
      customer_email: req.user.email || undefined,
    });
    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.warn('Stripe checkout failed:', error.message);
    res.status(500).json({ error: 'Could not start checkout.', fallback: true });
  }
});

router.get('/session/:sessionId', requireAuth, async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.json({ configured: false, paid: false, tier: 'free' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    const ownerId = session.metadata?.userId || session.client_reference_id;
    if (ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Session does not belong to this user.' });
    }
    const paid = session.payment_status === 'paid' || session.status === 'complete';
    if (paid) await updateUserPlan(req.user.id, 'premium');
    res.json({ configured: true, paid, tier: paid ? 'premium' : 'free' });
  } catch (error) {
    res.status(500).json({ error: 'Could not verify checkout session.' });
  }
});

async function handleStripeWebhook(req, res) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return res.status(503).send('Stripe webhook is not configured.');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.get('stripe-signature'), secret);
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.userId || session.client_reference_id;
      if (userId) await updateUserPlan(userId, 'premium');
    }
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const userId = subscription.metadata?.userId;
      if (userId) await updateUserPlan(userId, 'free');
    }
    res.json({ received: true });
  } catch (error) {
    console.warn('Stripe webhook handler failed:', error.message);
    res.status(500).json({ error: 'Webhook handler failed.' });
  }
}

module.exports = router;
module.exports.handleStripeWebhook = handleStripeWebhook;
module.exports.updateUserPlan = updateUserPlan;
module.exports.isStripeConfigured = isStripeConfigured;
