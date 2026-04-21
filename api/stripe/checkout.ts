import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createCheckoutSession } from "../../server/stripe.js";
import { getUserByOpenId } from "../../server/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { openId } = req.body as { openId: string };
  if (!openId) return res.status(400).json({ error: "openId required" });

  try {
    const user = await getUserByOpenId(openId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isPremium) return res.status(400).json({ error: "Already premium" });

    const session = await createCheckoutSession(openId, user.email || "");
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("[Stripe Checkout]", err);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
}
