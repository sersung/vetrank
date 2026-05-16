/**
 * Mercado Pago webhook handler.
 * Registered as a raw Express route in server/_core/index.ts.
 * Handles payment notifications and activates subscriptions.
 */
import crypto from "crypto";
import type { Request, Response } from "express";
import { getDb } from "./db";
import { users, payments } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { MercadoPagoConfig, Payment } from "mercadopago";

function verifyMPSignature(req: Request): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    // Not configured: allow in development, reject in production
    if (process.env.NODE_ENV === "production") {
      console.error("[MP Webhook] MP_WEBHOOK_SECRET not set in production — rejecting");
      return false;
    }
    console.warn("[MP Webhook] MP_WEBHOOK_SECRET not set — skipping signature check (dev only)");
    return true;
  }

  const xSignature = req.headers["x-signature"] as string | undefined;
  const xRequestId = req.headers["x-request-id"] as string | undefined;
  const dataId = (req.query as Record<string, string>)["data.id"];

  if (!xSignature || !xRequestId) return false;

  const parts: Record<string, string> = {};
  for (const part of xSignature.split(",")) {
    const idx = part.indexOf("=");
    if (idx > 0) parts[part.slice(0, idx)] = part.slice(idx + 1);
  }
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const template = `id:${dataId ?? ""};request-id:${xRequestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(template).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
  } catch {
    return false;
  }
}

export async function handleMPWebhook(req: Request, res: Response) {
  try {
    // Verify signature first
    if (!verifyMPSignature(req)) {
      console.warn("[MP Webhook] Signature verification failed");
      return res.status(401).json({ error: "Invalid signature" });
    }

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

    const paymentId = String(data.id);
    console.log(`[MP Webhook] Payment event received: ${paymentId}`);

    const db = await getDb();
    if (!db) {
      console.error("[MP Webhook] Database not available");
      return res.status(500).json({ error: "DB unavailable" });
    }

    // Idempotency: skip if this payment was already processed
    const existing = await db
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.externalId, paymentId))
      .limit(1);
    if (existing.length > 0) {
      console.log(`[MP Webhook] Payment ${paymentId} already processed — skipping`);
      return res.status(200).json({ received: true, skipped: true });
    }

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

    // Activate premium subscription
    const premiumStartedAt = new Date();
    const premiumEndsAt = new Date();
    premiumEndsAt.setDate(premiumEndsAt.getDate() + ref.durationDays);

    await db.update(users).set({
      plan: "premium",
      premiumStartedAt,
      premiumEndsAt,
    }).where(eq(users.id, ref.userId));

    // Record payment to prevent replay
    await db.insert(payments).values({
      userId: ref.userId,
      amount: (payment.transaction_amount as number) ?? 0,
      status: "approved",
      paymentMethod: payment.payment_type_id ?? "unknown",
      planType: ref.plan === "annual" ? "annual" : "monthly",
      externalId: paymentId,
      metadata: payment as any,
    });

    console.log(`[MP Webhook] ✅ User ${ref.userId} activated ${ref.plan} until ${premiumEndsAt.toISOString()}`);

    return res.status(200).json({ received: true, activated: true });
  } catch (error) {
    console.error("[MP Webhook] Error:", error);
    return res.status(500).json({ error: "Internal error" });
  }
}

