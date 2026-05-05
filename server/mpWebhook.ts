/**
 * Mercado Pago webhook handler.
 * Registered as a raw Express route in server/_core/index.ts.
 * Handles payment notifications and activates subscriptions.
 */
import type { Request, Response } from "express";
import { createHmac } from "crypto";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { MercadoPagoConfig, Payment } from "mercadopago";

/**
 * Verifies the Mercado Pago webhook signature.
 * https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks
 *
 * Header x-signature: ts=<timestamp>,v1=<hmac-sha256>
 * Signed message: id:<data.id>;request-id:<x-request-id>;ts:<ts>
 */
function verifyMPSignature(req: Request, secret: string): boolean {
  const signatureHeader = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"];
  const dataId = (req.body as { data?: { id?: string } })?.data?.id;

  if (!signatureHeader || typeof signatureHeader !== "string") return false;

  const parts: Record<string, string> = {};
  for (const part of signatureHeader.split(",")) {
    const [k, v] = part.split("=", 2);
    if (k && v) parts[k.trim()] = v.trim();
  }

  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const message = [
    dataId ? `id:${dataId}` : null,
    requestId ? `request-id:${requestId}` : null,
    `ts:${ts}`,
  ]
    .filter(Boolean)
    .join(";");

  const expected = createHmac("sha256", secret).update(message).digest("hex");

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  }
  return diff === 0;
}

export async function handleMPWebhook(req: Request, res: Response) {
  try {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) {
      console.error("[MP Webhook] MP_ACCESS_TOKEN not configured");
      return res.status(500).json({ error: "Not configured" });
    }

    // Verify webhook signature when secret is configured
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;
    if (webhookSecret) {
      if (!verifyMPSignature(req, webhookSecret)) {
        console.warn("[MP Webhook] Invalid signature — request rejected");
        return res.status(401).json({ error: "Invalid signature" });
      }
    } else {
      console.warn("[MP Webhook] MP_WEBHOOK_SECRET not set — signature verification skipped");
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
