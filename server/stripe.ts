import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-06-30.basil",
});

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || "";
export const APP_URL = process.env.APP_URL || "https://ditado-inteligente.vercel.app";

export async function createCheckoutSession(userOpenId: string, userEmail: string) {
  return stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    customer_email: userEmail,
    metadata: { openId: userOpenId },
    success_url: `${APP_URL}?payment=success`,
    cancel_url: `${APP_URL}?payment=canceled`,
  });
}
