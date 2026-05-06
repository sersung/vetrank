import { Resend } from "resend";
import { ENV } from "./env";

export type NotificationPayload = {
  title: string;
  content: string;
};

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends an owner notification via email (Resend).
 * Returns true if delivered, false on failure.
 */
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  if (!ENV.ownerEmail) {
    console.warn("[Notification] OWNER_EMAIL not configured — skipping notification.");
    return false;
  }

  const { error } = await resend.emails.send({
    from: "VetRank <noreply@vetrank.com.br>",
    to: ENV.ownerEmail,
    subject: `[VetRank] ${payload.title}`,
    text: payload.content,
  });

  if (error) {
    console.error("[Notification] Failed to send email:", error);
    return false;
  }

  return true;
}
