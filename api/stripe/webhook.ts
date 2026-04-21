import type { VercelRequest, VercelResponse } from "@vercel/node";
import { stripe } from "../../server/stripe.js";
import { setUserPremium, setUserByStripeCustomerId, getUserByOpenId } from "../../server/db.js";
import type Stripe from "stripe";

export const config = { api: { bodyParser: false } };

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

  let event: Stripe.Event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[Stripe Webhook] Invalid signature", err);
    return res.status(400).json({ error: "Invalid signature" });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const openId = session.metadata?.openId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        if (openId) {
          await setUserPremium(openId, customerId, subscriptionId);
        }
        break;
      }
      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const isActive = sub.status === "active";
        await setUserByStripeCustomerId(customerId, {
          isPremium: isActive,
          subscriptionStatus: sub.status as "active" | "canceled" | "past_due",
        });
        break;
      }
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook] Handler error", err);
    return res.status(500).json({ error: "Webhook handler failed" });
  }
}
