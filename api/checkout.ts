import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Log request for debugging
  console.log("Checkout init initiated...");

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Safety Check: Are keys loaded?
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("ERROR: STRIPE_SECRET_KEY is missing in Vercel Environment Variables.");
    return res.status(500).json({ error: "Server Misconfiguration: Missing Stripe Key" });
  }

  if (!process.env.STRIPE_PRICE_ID) {
    console.error("ERROR: STRIPE_PRICE_ID is missing in Vercel Environment Variables.");
    return res.status(500).json({ error: "Server Misconfiguration: Missing Price ID" });
  }

  try {
    // 3. Initialize Stripe INSIDE the handler to catch errors
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' as any, // Use 'as any' to avoid version TypeScript errors
    });

    const user = req.body.user;

    if (!user || !user.email || !user.id) {
      console.error("Missing user data in request body", req.body);
      return res.status(400).json({ error: "Missing user data" });
    }

    console.log(`Creating session for user: ${user.email}`);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/?success=true`,
      cancel_url: `${req.headers.origin}/?canceled=true`,
      customer_email: user.email,
      metadata: {
        supabase_user_id: user.id,
      },
    });

    console.log("Session created:", session.id);
    res.status(200).json({ url: session.url });

  } catch (err: any) {
    console.error("Stripe API Error:", err);
    res.status(500).json({ error: err.message || "Unknown Stripe Error" });
  }
}
