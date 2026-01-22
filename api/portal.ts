import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 1. Safety Checks
  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: "Missing Stripe Key" });

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' as any,
    });

    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: "Missing Stripe Customer ID" });
    }

    // 2. Determine Return URL (Where they go after clicking 'Back' in Stripe)
    const origin = req.headers.origin || req.headers.referer;

    // 3. Create Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: origin || 'https://fstop64.app', 
    });

    res.status(200).json({ url: session.url });

  } catch (err: any) {
    console.error("Portal Error:", err);
    res.status(500).json({ error: err.message });
  }
}
