/**
 * Mercado Pago webhook handler.
 * Registered as a raw Express route in server/_core/index.ts.
 * Handles payment notifications and activates subscriptions.
 */
import type { Request, Response } from "express";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { MercadoPagoConfig, Payment } from "mercadopago";

export async function handleMPWebhook(req: Request, res: Response) {
  try {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) {
      console.error("[MP Webhook] MP_ACCESS_TOKEN not configured");
      return res.status(500).json({ error: "Not configured" });
    }

    const { type, data } = req.body as { type: string; data?: { id?: string } };

    // Only process payment events
    if (type !== "payment" || !data?.id) {
      return res.status(200).json({ received: true });
    }

    const paymentId = data.id;
    console.log(`[MP Webhook] Payment event received: ${paymentId}`);

    // Fetch payment details from MP API
    const client = new MercadoPagoConfig({ accessToken: token });
    const paymentClient = new Payment(client);
    const payment = await paymentClient.get({ id: paymentId });

    const status = payment.status;
    const externalRef = payment.external_reference;

    console.log(`[MP Webhook] Payment ${paymentId} status: ${status}`);

    if (status !== "approved" || !externalRef) {
      return res.status(200).json({ received: true, status });
    }

    // Parse external reference
    let ref: { userId: number; plan: string; durationDays: number };
    try {
      ref = JSON.parse(externalRef);
    } catch {
      console.error("[MP Webhook] Invalid external_reference:", externalRef);
      return res.status(200).json({ received: true });
    }

    const db = await getDb();
    if (!db) {
      console.error("[MP Webhook] Database not available");
      return res.status(500).json({ error: "DB unavailable" });
    }

    // Activate premium subscription
    const premiumStartedAt = new Date();
    const premiumEndsAt = new Date();
    premiumEndsAt.setDate(premiumEndsAt.getDate() + ref.durationDays);

    await db.update(users).set({
      plan: "premium",
      premiumStartedAt,
      premiumEndsAt,
    }).where(eq(users.id, ref.userId));

    console.log(`[MP Webhook] ✅ User ${ref.userId} activated ${ref.plan} until ${premiumEndsAt.toISOString()}`);

    return res.status(200).json({ received: true, activated: true });
  } catch (error) {
    console.error("[MP Webhook] Error:", error);
    return res.status(500).json({ error: "Internal error" });
  }
}
