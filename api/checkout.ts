import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 1. Validate Secrets
  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY" });
  if (!process.env.STRIPE_PRICE_ID) return res.status(500).json({ error: "Missing STRIPE_PRICE_ID" });

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' as any,
    });

    const user = req.body.user;
    if (!user) return res.status(400).json({ error: "Missing user data" });

    // 2. SAFE ORIGIN CHECK (The Fix)
    // Sometimes 'origin' is missing. We fallback to 'referer' or a hardcoded string if needed.
    const origin = req.headers.origin || req.headers.referer;
    if (!origin) {
      return res.status(400).json({ error: "Could not determine request origin for redirect." });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/?success=true`,
      cancel_url: `${origin}/?canceled=true`,
      customer_email: user.email,
      metadata: { supabase_user_id: user.id },
    });

    res.status(200).json({ url: session.url });

  } catch (err: any) {
    console.error("Stripe Error:", err);
    res.status(500).json({ error: err.message });
  }
}
